import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { taskStore } from '../task-queue';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// API 配置
const DOUBAO_API_KEY = process.env.COZE_API_KEY || process.env.DOUBAO_API_KEY || '';
const DOUBAO_BASE_URL = process.env.COZE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const DOUBAO_MODEL = process.env.DOUBAO_MODEL || 'doubao-seed-1-6-vision-250815';
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'doubao-seed-1-6-251015';

/**
 * 直接调用豆包 LLM API
 */
async function callDoubaoLLM(messages: any[], options: any = {}): Promise<any> {
  const url = `${DOUBAO_BASE_URL}/chat/completions`;
  
  const body = {
    model: options.model || DOUBAO_MODEL,
    messages,
    temperature: options.temperature || 0.5,
    max_tokens: options.max_tokens || 2000,
  };

  console.log('[LLM] Calling:', url);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DOUBAO_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000), // 2 分钟超时
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 直接调用豆包图片生成 API
 */
async function callDoubaoImage(prompt: string): Promise<string> {
  const url = `${DOUBAO_BASE_URL}/images/generations`;
  
  const body = {
    model: IMAGE_MODEL,
    prompt,
    size: '1024x1024',
    n: 1,
  };

  console.log('[Image] Calling:', url);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DOUBAO_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180000), // 3 分钟超时
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].url;
}

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
  description: string
) {
  try {
    taskStore.update(taskId, { status: 'processing', progress: 10 });
    console.log(`[${taskId}] Task started`);

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

    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: analysisPrompt },
          { type: 'image_url', image_url: { url: dataUri } },
        ],
      },
    ];

    const llmResponse = await withRetry(
      () => callDoubaoLLM(messages),
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

    // Step 2: 生成图片
    console.log(`[${taskId}] Generating image...`);
    
    const imageUrl = await withRetry(
      () => callDoubaoImage(analysisData.mainPrompt),
      3, 3000, `[${taskId}] Image`
    );

    console.log(`[${taskId}] Image URL:`, imageUrl);
    taskStore.update(taskId, { progress: 90 });

    // Step 3: 完成
    const result = {
      success: true,
      analysis: analysisData,
      staticMainImageUrl: imageUrl,
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

    // 后台执行
    executeGenerationTask(task.id, file.buffer, file.mimetype, description).catch(err => {
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

export default router;
