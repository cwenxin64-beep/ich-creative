import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { taskStore } from '../task-queue';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/**
 * 带重试的函数调用
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 3000, context = ''): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`${context} Attempt ${i + 1}/${retries}`);
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.error(`${context} Failed:`, error.message);
      
      if (i < retries - 1) {
        console.log(`${context} Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  }
  
  throw lastError;
}

/**
 * 执行生成任务
 */
async function executeGenerationTask(
  taskId: string,
  fileBuffer: Buffer,
  mimetype: string,
  description: string,
  customHeaders: Record<string, string>
) {
  try {
    taskStore.update(taskId, { status: 'processing', progress: 10 });
    console.log(`[${taskId}] Task started`);

    // 初始化 SDK 客户端
    const config = new Config({ timeout: 120000 });
    const llmClient = new LLMClient(config, customHeaders);

    // Step 1: 分析图片
    console.log(`[${taskId}] Analyzing image...`);
    taskStore.update(taskId, { progress: 20 });

    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:${mimetype};base64,${base64Data}`;

    const analysisPrompt = `你是非遗创意设计专家。根据图片生成设计方案。

用户需求：${description || '根据图片内容自动创作'}

输出JSON格式：
{
  "creativeDescription": "20字创意描述",
  "mainPrompt": "产品正面全景，高清产品摄影"
}`;

    // 使用 Vision 模型分析图片
    const messages = [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: analysisPrompt },
          { type: 'image_url' as const, image_url: { url: dataUri, detail: 'high' as const } },
        ],
      },
    ];

    const llmResponse = await withRetry(
      async () => {
        const response = await llmClient.invoke(messages, {
          model: 'doubao-seed-1-6-vision-250815',
          temperature: 0.5,
        });
        return response.content;
      },
      3, 3000, `[${taskId}] LLM`
    );

    console.log(`[${taskId}] LLM response:`, llmResponse.substring(0, 200));

    // 解析 JSON
    let analysisData;
    try {
      let content = llmResponse.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }
      analysisData = JSON.parse(content);
    } catch {
      analysisData = { 
        creativeDescription: description || '非遗创意',
        mainPrompt: `非遗风格${description || '创意产品'}，传统工艺，高清产品摄影` 
      };
    }

    console.log(`[${taskId}] Analysis:`, analysisData);
    taskStore.update(taskId, { progress: 50 });

    // Step 2: 生成图片 - 使用 LLM 生成图片描述，然后返回 prompt
    console.log(`[${taskId}] Generating image prompt...`);
    
    // 由于 SDK 暂不支持图片生成，我们返回生成的 prompt
    // 前端可以使用其他方式生成图片
    const imagePrompt = analysisData.mainPrompt;
    
    console.log(`[${taskId}] Image Prompt:`, imagePrompt);
    taskStore.update(taskId, { progress: 90 });

    // Step 3: 完成 - 返回生成的 prompt，前端可以调用图片生成 API
    const result = {
      success: true,
      analysis: analysisData,
      imagePrompt: imagePrompt,
      // 使用占位图或让前端调用图片生成
      staticMainImageUrl: `https://placehold.co/1024x1024?text=${encodeURIComponent('非遗创意产品')}`,
    };

    taskStore.update(taskId, {
      status: 'completed',
      progress: 100,
      result,
    });

    console.log(`[${taskId}] Task completed`);
  } catch (error: any) {
    console.error(`[${taskId}] Task failed:`, error);
    taskStore.update(taskId, {
      status: 'failed',
      error: error.message || 'Unknown error',
    });
  }
}

/**
 * POST /api/v1/photo/generate - 创建生成任务
 */
router.post('/generate', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const description = req.body.description || '';

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // 创建任务
    const task = taskStore.create();
    console.log(`Created task ${task.id}`);

    // 提取请求头
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    // 后台执行
    executeGenerationTask(task.id, file.buffer, file.mimetype, description, customHeaders).catch(err => {
      console.error(`Task ${task.id} error:`, err);
    });

    // 立即返回任务 ID
    res.json({
      taskId: task.id,
      status: 'pending',
      message: '任务已创建',
    });
  } catch (error: any) {
    console.error('Generate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/photo/status/:taskId - 查询任务状态
 */
router.get('/status/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = taskStore.get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({
    taskId: task.id,
    status: task.status,
    progress: task.progress,
    result: task.result,
    error: task.error,
  });
});

/**
 * GET /api/v1/photo/test - 测试 SDK 连接
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    const config = new Config({ timeout: 30000 });
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const client = new LLMClient(config, customHeaders);

    const messages = [
      { role: 'user' as const, content: '你好，请回复"测试成功"' }
    ];
    
    const response = await client.invoke(messages, { temperature: 0.5 });
    
    res.json({
      success: true,
      message: 'SDK 连接成功',
      response: response.content,
    });
  } catch (error: any) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
