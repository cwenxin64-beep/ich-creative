import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { taskStore } from '../task-queue';
import { LLMClient, Config, ImageGenerationClient, HeaderUtils } from 'coze-coding-dev-sdk';

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

    const analysisPrompt = `你是一位非物质文化遗产创意设计专家。请根据图片内容，生成精准的设计方案。

## 用户需求
"${description || '根据图片内容自动创作'}"

## 任务要求
1. **识别图片中的元素**：分析图片中的颜色、形状、风格、文化元素
2. **提取非遗元素**：识别与非物质文化遗产相关的元素
3. **生成创意描述**：用20个汉字概括，包含：关键词+寓意+效果
4. **生成图像生成Prompt**：用于AI生图，必须具体、详细、可执行

## 生图Prompt要求（非常重要！）
- 三个Prompt必须是**同一个产品**的**三个不同角度**
- 必须保持：相同的产品外观、相同的风格、相同的配色、相同的材质
- 区别仅在于拍摄角度：
  - mainPrompt：正面全景图，展示完整产品
  - subPrompt1：细节特写图，聚焦核心工艺细节
  - subPrompt2：侧面/俯视图，展示立体结构

## 输出格式（JSON）
{
  "creativeDescription": "20字创意描述",
  "ichElements": ["非遗元素1", "非遗元素2"],
  "mainPrompt": "产品正面全景，[产品类型]，[非遗元素描述]，[色彩]，[材质]，[场景]，[光线]，高清产品摄影",
  "subPrompt1": "同一产品细节特写，[聚焦部位]，[工艺细节]，[纹理质感]，微距摄影",
  "subPrompt2": "同一产品侧面视角，[立体结构]，[整体轮廓]，[空间关系]，产品展示图"
}

请严格按照以上要求输出JSON：`;

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
        ichElements: ['传统工艺'],
        mainPrompt: `非遗风格${description || '创意产品'}，传统工艺，高清产品摄影`,
        subPrompt1: `同一产品细节特写，工艺细节，纹理质感`,
        subPrompt2: `同一产品侧面视角，立体结构`,
      };
    }

    console.log(`[${taskId}] Analysis:`, analysisData);
    taskStore.update(taskId, { progress: 50 });

    // Step 2: 生成图片
    console.log(`[${taskId}] Generating images...`);
    
    const imageClient = new ImageGenerationClient(config, customHeaders);
    
    const [mainResponse, sub1Response, sub2Response] = await Promise.all([
      withRetry(
        () => imageClient.generate({
          prompt: analysisData.mainPrompt,
          size: '2K',
          watermark: false,
        }),
        3, 3000, `[${taskId}] Main Image`
      ),
      withRetry(
        () => imageClient.generate({
          prompt: analysisData.subPrompt1,
          size: '2K',
          watermark: false,
        }),
        3, 3000, `[${taskId}] Sub Image 1`
      ),
      withRetry(
        () => imageClient.generate({
          prompt: analysisData.subPrompt2,
          size: '2K',
          watermark: false,
        }),
        3, 3000, `[${taskId}] Sub Image 2`
      ),
    ]);

    const mainHelper = imageClient.getResponseHelper(mainResponse);
    const sub1Helper = imageClient.getResponseHelper(sub1Response);
    const sub2Helper = imageClient.getResponseHelper(sub2Response);

    const mainImageUrl = mainHelper.success && mainHelper.imageUrls.length > 0
      ? mainHelper.imageUrls[0]
      : '';
    const subImageUrl1 = sub1Helper.success && sub1Helper.imageUrls.length > 0
      ? sub1Helper.imageUrls[0]
      : mainImageUrl;
    const subImageUrl2 = sub2Helper.success && sub2Helper.imageUrls.length > 0
      ? sub2Helper.imageUrls[0]
      : mainImageUrl;

    console.log(`[${taskId}] Images generated:`, { mainImageUrl, subImageUrl1, subImageUrl2 });
    taskStore.update(taskId, { progress: 90 });

    // Step 3: 完成
    const result = {
      success: true,
      analysis: analysisData,
      mainImageUrl,
      subImageUrl1,
      subImageUrl2,
      staticMainImageUrl: mainImageUrl,
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
