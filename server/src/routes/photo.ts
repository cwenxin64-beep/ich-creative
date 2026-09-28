import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { taskStore } from '../task-queue';
import { createObjectStorage } from '../services/object-storage';
import { buildReferenceViewPrompt, type ReferenceView } from '../services/image-view-prompts';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// 初始化对象存储
const storage = createObjectStorage();

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
async function callVolcengineImage(prompt: string, referenceImageUrl?: string, referenceView?: ReferenceView): Promise<string> {
  const url = `${VOLCENGINE_BASE_URL}/images/generations`;
  const finalPrompt = referenceImageUrl && referenceView
    ? buildReferenceViewPrompt(prompt, referenceView)
    : prompt;
  
  const body = {
    model: IMAGE_MODEL,
    prompt: finalPrompt,
    ...(referenceImageUrl ? { image: referenceImageUrl } : {}),
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
  
  // 检查是否是内部代理 URL，如果是则下载并上传到对象存储
  if (imageUrl && imageUrl.includes('code.coze.cn')) {
    console.log('[Image] Detected internal proxy URL');
    
    // 检查是否在沙箱环境（通过环境变量）
    const isSandbox = process.env.COZE_PROJECT_DOMAIN_DEFAULT?.includes('coze.site') || 
                       process.env.COZE_WORKSPACE_PATH?.includes('/workspace/');
    
    if (isSandbox) {
      // 沙箱环境：直接返回 URL（浏览器也在沙箱内，可以访问）
      console.log('[Image] Sandbox environment detected, using internal URL directly');
      return imageUrl;
    }
    
    // 云服务器：尝试下载并上传到对象存储
    console.log('[Image] Cloud server detected, downloading and re-uploading to object storage...');
    try {
      // 下载图片
      const downloadResponse = await fetch(imageUrl, {
        signal: AbortSignal.timeout(60000),
      });
      
      if (!downloadResponse.ok) {
        throw new Error(`Failed to download image: ${downloadResponse.status}`);
      }
      
      const imageBuffer = Buffer.from(await downloadResponse.arrayBuffer());
      const fileName = `generated_images/image_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
      
      // 上传到对象存储
      const fileKey = await storage.uploadFile({
        fileContent: imageBuffer,
        fileName,
        contentType: 'image/png',
      });
      
      // 生成可访问的签名 URL
      const publicUrl = await storage.generatePresignedUrl({
        key: fileKey,
        expireTime: 86400 * 30, // 30 天有效期
      });
      
      console.log('[Image] Successfully re-uploaded to storage, new URL:', publicUrl.substring(0, 100));
      return publicUrl;
    } catch (uploadError: any) {
      // 下载或上传失败时，返回原始 URL（至少沙箱内可以访问）
      console.error('[Image] Failed to re-upload image, returning original URL:', uploadError.message);
      return imageUrl;
    }
  }
  
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

function toPromptText(value: any): string {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(item => String(item).trim()).filter(Boolean).join('、');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value).trim();
}

const PHOTO_TARGET_PRODUCTS = [
  '手机壳',
  '头饰',
  '发饰',
  '耳环',
  '项链',
  '手链',
  '戒指',
  '胸针',
  '手提包',
  '包包',
  '包',
  '杯子',
  '水杯',
  '茶杯',
  '瓷杯',
  '花瓶',
  '抱枕',
  '靠枕',
  '服装',
  '衣服',
  '裙子',
  '鞋',
  '海报',
  '卡片',
  '明信片',
  '礼品',
  '摆件',
  '挂件',
  '灯具',
  '灯饰',
];

function extractTargetProduct(description: string): string {
  const text = description.trim();
  if (!text) return '';
  return PHOTO_TARGET_PRODUCTS.find(product => text.includes(product)) || '';
}

function buildObjectPreservingPrompt(prompt: string, description: string, shotType: string, analysisData: any): string {
  const userRequirement = description.trim() || '根据原图主体叠加非遗文化纹样';
  const sourceObject = toPromptText(analysisData?.sourceObject);
  const lockedVisualFeatures = toPromptText(analysisData?.lockedVisualFeatures);
  const ichElements = toPromptText(analysisData?.ichElements);
  const targetProduct = toPromptText(analysisData?.targetProduct) || extractTargetProduct(description);
  const hasTargetProduct = Boolean(targetProduct);

  const commonLines = [
    `用户文字需求：${userRequirement}`,
    `画面类型：${shotType}`,
    `生成模式：${hasTargetProduct ? '指定产品创作' : '原图主体改造'}`,
    hasTargetProduct ? `最终画面主体：${targetProduct}` : '最终画面主体：原图中的主要物体',
    sourceObject ? `原图参考内容：${sourceObject}` : '',
    lockedVisualFeatures ? `可借鉴的原图视觉元素：${lockedVisualFeatures}` : '',
    ichElements ? `非遗元素：${ichElements}` : '',
  ].filter(Boolean);

  const targetProductLines = [
    `画面必须是一个${targetProduct}，主体清楚、完整、居中。`,
    `原图只提供纹样、颜色、材质、结构或装饰灵感，不要把原图物体原样画出来。`,
    `禁止生成非${targetProduct}主体，尤其不要生成盆栽、玻璃杯、礼盒、包装盒、展示道具或无关产品。`,
    `让${targetProduct}带有清晰的非遗风格，但保持实用产品质感。`,
  ];

  const sourceObjectLines = [
    '保持原图主要物体的品类、轮廓、比例、材质和主体颜色。',
    '只在原图主体上加入非遗纹样、色彩或局部装饰，不要换成另一件产品。',
    '如果原图是普通杯子，就仍然是普通杯子；不要变成保温杯、礼盒、包装盒或展示道具。',
  ];

  return [
    ...commonLines,
    ...(hasTargetProduct ? targetProductLines : sourceObjectLines),
    '画面干净，真实产品摄影质感，不要复杂场景。',
    `具体生成提示：${prompt}`,
  ].join('\n');
}

function normalizePhotoAnalysisPrompts(analysisData: any, description: string, isDynamic: boolean) {
  return {
    ...analysisData,
    mainPrompt: buildObjectPreservingPrompt(
      String(analysisData?.mainPrompt || description || '非遗纹样产品设计'),
      description,
      isDynamic ? '原物动态展示主镜头' : '原物正面全景',
      analysisData
    ),
    subPrompt1: buildObjectPreservingPrompt(
      String(analysisData?.subPrompt1 || description || '非遗纹样细节'),
      description,
      isDynamic ? '原物纹样细节动态镜头' : '原物纹样细节特写',
      analysisData
    ),
    subPrompt2: buildObjectPreservingPrompt(
      String(analysisData?.subPrompt2 || description || '非遗纹样侧面展示'),
      description,
      isDynamic ? '原物环绕展示镜头' : '原物侧面或俯视角度',
      analysisData
    ),
  };
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
1. 判断用户文字里有没有明确最终产品，例如手机壳、头饰、耳环、杯子、海报、卡片、礼品、服装等；有就写入 targetProduct，没有就留空。
2. 识别原图主体，只记录对创作有用的信息：品类、外形、材质、颜色、纹样、结构或装饰气质。
3. 提取可以迁移到作品里的原图视觉元素，不要把无关物体强行保留。
4. 根据用户需求选择合适的非遗元素。
5. 生成视频Prompt，必须短、清楚、可执行，不要写互相冲突的规则。

## 视频Prompt要求（非常重要！）
- 如果 targetProduct 不为空：Prompt 的主体必须是 targetProduct，原图只作为纹样、材质、颜色、结构灵感。
- 如果 targetProduct 为空：Prompt 的主体必须是原图主要物体，只做非遗风格改造。
- 不要生成盆栽、玻璃杯、礼盒、包装盒等与用户目标无关的物体。
- 三个Prompt只区别镜头运动：
  - mainPrompt：开场全景，镜头缓慢推进
  - subPrompt1：细节特写，聚焦核心元素，镜头微移
  - subPrompt2：环绕运镜，展示立体感

## 输出格式（JSON）
{
  "creativeDescription": "20字创意描述",
  "targetProduct": "用户明确指定的最终产品；没有就填空字符串",
  "sourceObject": "原图主体和视觉特征的简短描述",
  "lockedVisualFeatures": ["可借鉴的原图视觉元素1", "可借鉴的原图视觉元素2"],
  "ichElements": ["非遗元素1", "非遗元素2"],
  "mainPrompt": "主体明确的主镜头视频提示词",
  "subPrompt1": "主体明确的细节视频提示词",
  "subPrompt2": "主体明确的环绕视频提示词"
}

请严格按照以上要求输出JSON：`
      : `你是一位非物质文化遗产创意设计专家。请根据图片内容，生成精准的设计方案。

## 用户需求
"${description || '根据图片内容自动创作'}"

## 任务要求
1. 判断用户文字里有没有明确最终产品，例如手机壳、头饰、耳环、杯子、海报、卡片、礼品、服装等；有就写入 targetProduct，没有就留空。
2. 识别原图主体，只记录对创作有用的信息：品类、外形、材质、颜色、纹样、结构或装饰气质。
3. 提取可以迁移到作品里的原图视觉元素，不要把无关物体强行保留。
4. 根据用户需求选择合适的非遗元素。
5. 生成图像Prompt，必须短、清楚、可执行，不要写互相冲突的规则。

## 生图Prompt要求（非常重要！）
- 如果 targetProduct 不为空：Prompt 的主体必须是 targetProduct，原图只作为纹样、材质、颜色、结构灵感。
- 如果 targetProduct 为空：Prompt 的主体必须是原图主要物体，只做非遗风格改造。
- 不要生成盆栽、玻璃杯、礼盒、包装盒等与用户目标无关的物体。
- 三个Prompt只区别拍摄角度：
  - mainPrompt：正面全景图，展示完整产品
  - subPrompt1：细节特写图，聚焦核心工艺细节
  - subPrompt2：侧面/俯视图，展示立体结构

## 输出格式（JSON）
{
  "creativeDescription": "20字创意描述",
  "targetProduct": "用户明确指定的最终产品；没有就填空字符串",
  "sourceObject": "原图主体和视觉特征的简短描述",
  "lockedVisualFeatures": ["可借鉴的原图视觉元素1", "可借鉴的原图视觉元素2"],
  "ichElements": ["非遗元素1", "非遗元素2"],
  "mainPrompt": "主体明确的正面全景生图提示词",
  "subPrompt1": "主体明确的细节特写生图提示词",
  "subPrompt2": "主体明确的侧面或俯视生图提示词"
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
      throw new Error('图片分析结果格式错误，无法可靠保留原图特征');
    }

    analysisData = normalizePhotoAnalysisPrompts(analysisData, description, isDynamic);

    console.log(`[${taskId}] Analysis:`, analysisData);
    taskStore.update(taskId, { progress: 50 });

    // Step 2: 根据 outputType 生成内容
    let result: any;
    
    if (isDynamic) {
      // 生成视频
      console.log(`[${taskId}] Generating video...`);
      
      const [videoUrl, videoMainImageUrl] = await Promise.all([
        withRetry(
          () => callVolcengineVideo(analysisData.mainPrompt),
          3, 10000, `[${taskId}] Video`
        ),
        withRetry(
          () => callVolcengineImage(analysisData.mainPrompt),
          3, 3000, `[${taskId}] Video Main Image`
        ),
      ]);
      const [videoSubImageUrl1, videoSubImageUrl2] = await Promise.all([
        withRetry(
          () => callVolcengineImage(analysisData.subPrompt1, videoMainImageUrl, 'detail'),
          3, 3000, `[${taskId}] Video Sub Image 1`
        ),
        withRetry(
          () => callVolcengineImage(analysisData.subPrompt2, videoMainImageUrl, 'side'),
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
        videoSubImageUrl1: videoSubImageUrl2,
        videoSubImageUrl2: videoSubImageUrl1,
        staticMainImageUrl: videoMainImageUrl,
        staticSubImageUrl1: videoSubImageUrl2,
        staticSubImageUrl2: videoSubImageUrl1,
      };
    } else {
      // 生成静态图片
      console.log(`[${taskId}] Generating images...`);
      
      const mainImageUrl = await withRetry(
        () => callVolcengineImage(analysisData.mainPrompt),
        3, 3000, `[${taskId}] Main Image`
      );
      const [subImageUrl1, subImageUrl2] = await Promise.all([
        withRetry(
          () => callVolcengineImage(analysisData.subPrompt1, mainImageUrl, 'detail'),
          3, 3000, `[${taskId}] Sub Image 1`
        ),
        withRetry(
          () => callVolcengineImage(analysisData.subPrompt2, mainImageUrl, 'side'),
          3, 3000, `[${taskId}] Sub Image 2`
        ),
      ]);

      console.log(`[${taskId}] Images generated`);
      taskStore.update(taskId, { progress: 90 });

      result = {
        success: true,
        analysis: analysisData,
        mainImageUrl,
        subImageUrl1: subImageUrl2,
        subImageUrl2: subImageUrl1,
        staticMainImageUrl: mainImageUrl,
        staticSubImageUrl1: subImageUrl2,
        staticSubImageUrl2: subImageUrl1,
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
    const fileBase64 = typeof req.body.fileBase64 === 'string' ? req.body.fileBase64 : '';
    const mimeType = typeof req.body.mimeType === 'string' ? req.body.mimeType : 'image/jpeg';

    let fileBuffer: Buffer | null = file?.buffer || null;
    let fileMimeType = file?.mimetype || mimeType;

    if (!fileBuffer && fileBase64) {
      const cleanBase64 = fileBase64.includes(',')
        ? fileBase64.split(',').pop() || ''
        : fileBase64;
      fileBuffer = Buffer.from(cleanBase64, 'base64');
    }

    if (!fileBuffer) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // 创建任务
    const task = taskStore.create();
    console.log(`Created task ${task.id}, outputType: ${outputType}`);

    // 后台执行
    executeGenerationTask(task.id, fileBuffer, fileMimeType, description, outputType).catch(err => {
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
