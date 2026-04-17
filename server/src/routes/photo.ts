import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { taskStore } from '../task-queue';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// 火山引擎 API 配置
const VOLCENGINE_API_KEY = process.env.COZE_API_KEY || process.env.VOLCENGINE_API_KEY || '';
const VOLCENGINE_BASE_URL = process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

// 模型 ID 配置（使用推理接入点 ID）
const VISION_MODEL = process.env.VOLCENGINE_VISION_MODEL || 'ep-20260326172427-vtr25';
const IMAGE_MODEL = process.env.VOLCENGINE_IMAGE_MODEL || 'ep-20260326185459-8rt74';
const VIDEO_MODEL = process.env.VOLCENGINE_VIDEO_MODEL || 'ep-20260326185806-4fgdw';

/**
 * 直接调用火山引擎 LLM API
 */
async function callVolcengineLLM(messages: any[], model: string = VISION_MODEL): Promise<string> {
  const url = `${VOLCENGINE_BASE_URL}/chat/completions`;
  
  const body = {
    model,
    messages,
    temperature: 0.5,
    max_tokens: 2000,
  };

  console.log('[LLM] Calling:', url, 'Model:', model);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOLCENGINE_API_KEY}`,
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
 * 直接调用火山引擎图片生成 API
 */
async function callVolcengineImage(prompt: string): Promise<string> {
  const url = `${VOLCENGINE_BASE_URL}/images/generations`;
  
  const body = {
    model: IMAGE_MODEL,
    prompt,
  };

  console.log('[Image] Calling:', url, 'Model:', IMAGE_MODEL);
  console.log('[Image] Request:', JSON.stringify(body).substring(0, 500));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOLCENGINE_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180000), // 3 分钟超时
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Image] Error Response:', errorText);
    throw new Error(`Image API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[Image] Response keys:', Object.keys(data));
  console.log('[Image] Response:', JSON.stringify(data).substring(0, 1000));
  
  // 尝试多种可能的返回格式
  const imageUrl = data.data?.[0]?.url 
    || data.data?.[0]?.b64_json
    || data.images?.[0]?.url 
    || data.images?.[0]?.image_url
    || data.url
    || data.result?.url;
    
  console.log('[Image] Extracted URL:', imageUrl ? imageUrl.substring(0, 100) : 'undefined');
  
  if (!imageUrl) {
    throw new Error(`Image API returned no URL. Response: ${JSON.stringify(data).substring(0, 500)}`);
  }
  
  return imageUrl;
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
 * 创建视频生成任务
 */
async function createVideoTask(prompt: string): Promise<string> {
  const url = `${VOLCENGINE_BASE_URL}/contents/generations/tasks`;
  
  const body = {
    model: 'doubao-seedance-1-5-pro-251215',
    content: [
      {
        type: 'text',
        text: `${prompt} --duration 5 --camerafixed false --watermark true`,
      },
    ],
  };

  console.log('[Video] Creating task...');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOLCENGINE_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Video API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[Video] Task created:', JSON.stringify(data).substring(0, 300));
  
  return data.task_id || data.id || data.data?.task_id;
}

/**
 * 查询视频任务状态
 */
async function getVideoTaskStatus(taskId: string): Promise<{ status: string; videoUrl?: string }> {
  const url = `${VOLCENGINE_BASE_URL}/contents/generations/tasks/${taskId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${VOLCENGINE_API_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Video status API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[Video] Task status:', data.status);
  
  // 尝试多种可能的返回格式（data.video_url 最优先）
  const videoUrl = data.video_url 
    || data.output?.video_url 
    || data.data?.video_url
    || data.data?.url
    || data.output?.url
    || data.url
    || data.content?.video_url;
  
  console.log('[Video] Extracted videoUrl:', videoUrl);
  
  return {
    status: data.status || data.task_status || 'unknown',
    videoUrl,
  };
}

/**
 * 调用火山引擎视频生成 API（异步任务模式）
 */
async function callVolcengineVideo(prompt: string): Promise<string> {
  // 1. 创建任务
  const taskId = await createVideoTask(prompt);
  console.log('[Video] Task ID:', taskId);

  if (!taskId) {
    throw new Error('Failed to get video task ID');
  }

  // 2. 轮询任务状态（最长等待 5 分钟）
  const maxWaitTime = 5 * 60 * 1000;
  const pollInterval = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const result = await getVideoTaskStatus(taskId);
    
    if (result.status === 'completed' || result.status === 'success' || result.status === 'succeeded') {
      console.log('[Video] Task completed, video URL:', result.videoUrl);
      return result.videoUrl!;
    }
    
    if (result.status === 'failed' || result.status === 'error') {
      throw new Error('Video generation task failed');
    }

    console.log('[Video] Task still processing, waiting...');
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Video generation timeout after 5 minutes');
}

/**
 * 执行生成任务
 */
async function executeGenerationTask(
  taskId: string,
  fileBuffer: Buffer,
  mimetype: string,
  description: string,
  outputType: 'static' | 'dynamic' = 'static'
) {
  try {
    taskStore.update(taskId, { status: 'processing', progress: 10 });
    console.log(`[${taskId}] Task started, outputType: ${outputType}`);

    // Step 1: 分析图片
    console.log(`[${taskId}] Analyzing image...`);
    taskStore.update(taskId, { progress: 20 });

    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:${mimetype};base64,${base64Data}`;

    // 根据 outputType 生成不同的 prompt
    const isDynamic = outputType === 'dynamic';
    
    const analysisPrompt = isDynamic
      ? `你是一位非物质文化遗产创意设计专家。请根据图片内容，生成精准的视频创意方案。

## 用户需求
"${description || '根据图片内容自动创作'}"

## 任务要求
1. **识别图片中的元素**：分析图片中的颜色、形状、风格、文化元素
2. **提取非遗元素**：识别与非物质文化遗产相关的元素
3. **生成创意描述**：用20个汉字概括，包含：关键词+寓意+效果
4. **生成视频Prompt**：用于AI生成视频，必须具体、详细、可执行，描述镜头运动和视觉效果

## 视频Prompt要求（非常重要！）
- 三个Prompt必须是**同一个场景/产品**的**三个不同运镜方式**
- 必须保持：相同的主体、相同的风格、相同的场景
- 区别仅在于镜头运动：
  - mainPrompt：开场全景，镜头缓慢推进
  - subPrompt1：细节特写，聚焦核心元素，镜头微移
  - subPrompt2：环绕运镜，展示立体感

## 输出格式（JSON）
{
  "creativeDescription": "20字创意描述",
  "ichElements": ["非遗元素1", "非遗元素2"],
  "mainPrompt": "视频开场，[场景描述]，[主体描述]，[镜头运动：缓慢推进]，高品质电影感",
  "subPrompt1": "细节特写，[聚焦部位]，[细节展示]，[镜头运动：微移]，微距摄影感",
  "subPrompt2": "环绕展示，[主体]，[立体感]，[镜头运动：环绕旋转]，流畅运镜"
}

请严格按照以上要求输出JSON：`
      : `你是一位非物质文化遗产创意设计专家。请根据图片内容，生成精准的设计方案。

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
        role: 'user',
        content: [
          { type: 'text', text: analysisPrompt },
          { type: 'image_url', image_url: { url: dataUri } },
        ],
      },
    ];

    const llmResponse = await withRetry(
      () => callVolcengineLLM(messages, VISION_MODEL),
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
      analysisData = isDynamic
        ? {
            creativeDescription: description || '非遗视频创意',
            ichElements: ['传统工艺'],
            mainPrompt: `非遗风格${description || '创意场景'}，开场全景，镜头缓慢推进，高品质电影感`,
            subPrompt1: `细节特写，传统工艺，纹理质感，镜头微移`,
            subPrompt2: `环绕展示，立体感，镜头环绕旋转`,
          }
        : {
            creativeDescription: description || '非遗创意',
            ichElements: ['传统工艺'],
            mainPrompt: `非遗风格${description || '创意产品'}，传统工艺，高清产品摄影`,
            subPrompt1: `同一产品细节特写，工艺细节，纹理质感`,
            subPrompt2: `同一产品侧面视角，立体结构`,
          };
    }

    console.log(`[${taskId}] Analysis:`, analysisData);
    taskStore.update(taskId, { progress: 50 });

    // Step 2: 根据 outputType 生成内容
    let result: any;
    
    if (isDynamic) {
      // 生成视频
      console.log(`[${taskId}] Generating video...`);
      
      const [videoUrl, videoMainImageUrl, videoSubImageUrl1, videoSubImageUrl2] = await Promise.all([
        withRetry(
          () => callVolcengineVideo(analysisData.mainPrompt),
          3, 10000, `[${taskId}] Video`
        ),
        withRetry(
          () => callVolcengineImage(analysisData.mainPrompt),
          3, 3000, `[${taskId}] Video Main Image`
        ),
        withRetry(
          () => callVolcengineImage(analysisData.subPrompt1),
          3, 3000, `[${taskId}] Video Sub Image 1`
        ),
        withRetry(
          () => callVolcengineImage(analysisData.subPrompt2),
          3, 3000, `[${taskId}] Video Sub Image 2`
        ),
      ]);

      console.log(`[${taskId}] Video generated:`, videoUrl);
      taskStore.update(taskId, { progress: 90 });

      result = {
        success: true,
        analysis: analysisData,
        videoUrl,
        videoMainImageUrl,
        videoSubImageUrl1,
        videoSubImageUrl2,
        staticMainImageUrl: videoMainImageUrl,
      };
    } else {
      // 生成静态图片
      console.log(`[${taskId}] Generating images...`);
      
      const [mainImageUrl, subImageUrl1, subImageUrl2] = await Promise.all([
        withRetry(
          () => callVolcengineImage(analysisData.mainPrompt),
          3, 3000, `[${taskId}] Main Image`
        ),
        withRetry(
          () => callVolcengineImage(analysisData.subPrompt1),
          3, 3000, `[${taskId}] Sub Image 1`
        ),
        withRetry(
          () => callVolcengineImage(analysisData.subPrompt2),
          3, 3000, `[${taskId}] Sub Image 2`
        ),
      ]);

      console.log(`[${taskId}] Images generated`);
      taskStore.update(taskId, { progress: 90 });

      result = {
        success: true,
        analysis: analysisData,
        mainImageUrl,
        subImageUrl1,
        subImageUrl2,
        staticMainImageUrl: mainImageUrl,
      };
    }

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
    const outputType = req.body.outputType === 'dynamic' ? 'dynamic' : 'static';

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // 创建任务
    const task = taskStore.create();
    console.log(`Created task ${task.id}, outputType: ${outputType}`);

    // 后台执行
    executeGenerationTask(task.id, file.buffer, file.mimetype, description, outputType).catch(err => {
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
 * GET /api/v1/photo/test - 测试 API 连接
 */
router.get('/test', async (req: Request, res: Response) => {
  try {
    if (!VOLCENGINE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'API Key 未配置，请设置环境变量 COZE_API_KEY 或 VOLCENGINE_API_KEY',
      });
    }

    // 测试简单对话
    const testResponse = await callVolcengineLLM([
      { role: 'user', content: '你好，请回复"测试成功"' }
    ]);
    
    res.json({
      success: true,
      message: '火山引擎 API 连接成功',
      response: testResponse,
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
