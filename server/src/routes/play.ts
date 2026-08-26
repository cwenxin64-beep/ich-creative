import express, { type Request, type Response } from 'express';
import { taskStore } from '../task-queue';
import { getWorkflowId, runCozeWorkflow } from '../services/coze-workflows';
import { createObjectStorage } from '../services/object-storage';

const router = express.Router();

// 初始化对象存储
const storage = createObjectStorage();

// 火山引擎 API 配置
const VOLCENGINE_API_KEY = process.env.COZE_API_KEY || process.env.VOLCENGINE_API_KEY || '';
const VOLCENGINE_BASE_URL = process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

// 模型 ID 配置（使用推理接入点 ID）
const TEXT_MODEL = process.env.VOLCENGINE_TEXT_MODEL || 'ep-20260326185613-8d6lx';
const IMAGE_MODEL = process.env.VOLCENGINE_IMAGE_MODEL || 'ep-20260326185459-8rt74';
const VIDEO_MODEL = process.env.VOLCENGINE_VIDEO_MODEL || 'ep-20260326185806-4fgdw';

const PLAY_WORKFLOW_IDS: Record<string, string[]> = {
  poster: [
    getWorkflowId('COZE_WORKFLOW_PLAY_POSTER', '7678261053490200639'),
    getWorkflowId('COZE_WORKFLOW_PLAY_POSTER_ALT', '7678261713996726314'),
  ],
  festival: [
    getWorkflowId('COZE_WORKFLOW_PLAY_FESTIVAL', '7678261114291159075'),
    getWorkflowId('COZE_WORKFLOW_PLAY_FESTIVAL_ALT', '7678261667716677683'),
  ],
  birthday: [
    getWorkflowId('COZE_WORKFLOW_PLAY_BIRTHDAY', '7678261226972102692'),
    getWorkflowId('COZE_WORKFLOW_PLAY_BIRTHDAY_ALT', '7678261512381988905'),
    getWorkflowId('COZE_WORKFLOW_PLAY_BIRTHDAY_EXTRA', '7678261565473292340'),
  ],
  newyear: [
    getWorkflowId('COZE_WORKFLOW_PLAY_NEWYEAR', '7678261114291159075'),
  ],
  dynamic: [
    getWorkflowId('COZE_WORKFLOW_PLAY_DYNAMIC', '7678261053490200639'),
  ],
  avatar: [
    getWorkflowId('COZE_WORKFLOW_PLAY_AVATAR', '7678261285805703194'),
  ],
  interactive: [
    getWorkflowId('COZE_WORKFLOW_PLAY_INTERACTIVE', '7678260824640798755'),
    getWorkflowId('COZE_WORKFLOW_PLAY_INTERACTIVE_ALT', '7678261767479214143'),
  ],
};

const PLAY_PRODUCT_NAMES: Record<string, string> = {
  poster: '海报',
  festival: '节日卡',
  birthday: '生日卡',
  newyear: '新年卡',
  dynamic: '动态海报',
  avatar: '数字人',
  interactive: '可交互文创产品',
};

const PLAY_INTERACTION_NAMES: Record<string, string> = {
  craft: '工艺',
  visual: '视觉',
  auditory: '听觉',
  behavior: '行为',
};

const TARGET_MARKET_NAMES: Record<string, string> = {
  america: '美洲',
  europe: '欧洲',
  asia: '亚洲',
  oceania: '大洋洲',
};

const PLAY_ICH_TYPE_NAMES: Record<string, string> = {
  jingdezhen: '景德镇陶瓷',
  guqin: '古琴艺术',
  xiangyunsha: '香云纱',
  ru: '汝瓷',
  luban: '鲁班锁',
  silkworm: '桑蚕丝织技艺',
  'paper-cut': '中国剪纸',
  taiji: '太极拳',
  jingju: '京剧',
  other: '其他',
};

function resolveName(map: Record<string, string>, id = '') {
  return map[id] || id;
}

function buildPlayWorkflowParameters(params: {
  text: string;
  ichType: string;
  productType: string;
  interactionTypes: string[];
  targetMarket: string;
  material: string;
}) {
  const ichName = resolveName(PLAY_ICH_TYPE_NAMES, params.ichType);
  const interactionText = params.interactionTypes
    .map((id) => resolveName(PLAY_INTERACTION_NAMES, id))
    .filter(Boolean)
    .join('、');
  const productName = resolveName(PLAY_PRODUCT_NAMES, params.productType);
  const marketName = resolveName(TARGET_MARKET_NAMES, params.targetMarket) || '中国';
  const designRequirement = [
    params.text,
    ichName ? `非遗类型：${ichName}` : '',
    productName ? `创作类型：${productName}` : '',
    interactionText ? `体验方式：${interactionText}` : '',
    marketName ? `目标市场：${marketName}` : '',
    params.material ? `参考素材：${params.material}` : '',
  ].filter(Boolean).join('；');

  return {
    design_requirement: designRequirement,
    experience_type: interactionText || '视觉体验',
    product_type: productName,
    target_market: marketName,
  };
}

/**
 * 直接调用火山引擎 LLM API
 */
async function callVolcengineLLM(messages: any[], model: string = TEXT_MODEL): Promise<string> {
  const url = `${VOLCENGINE_BASE_URL}/chat/completions`;
  
  const body = {
    model,
    messages,
    temperature: 0.5,
    max_tokens: 4000,
  };

  console.log('[LLM] Calling:', url, 'Model:', model);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOLCENGINE_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOLCENGINE_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Image] Error Response:', errorText);
    throw new Error(`Image API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[Image] Response keys:', Object.keys(data));
  console.log('[Image] Response:', JSON.stringify(data));
  
  // 递归查找所有可能的 URL
  const findAllUrls = (obj: any, path = ''): string[] => {
    const urls: string[] = [];
    if (typeof obj === 'string' && (obj.startsWith('http') || obj.startsWith('data:'))) {
      urls.push(`${path}: ${obj.substring(0, 200)}`);
    } else if (Array.isArray(obj)) {
      obj.forEach((item, i) => urls.push(...findAllUrls(item, `${path}[${i}]`)));
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, val]) => urls.push(...findAllUrls(val, `${path}.${key}`)));
    }
    return urls;
  };
  
  const allUrls = findAllUrls(data);
  console.log('[Image] All URLs found:', allUrls);
  
  // 尝试多种可能的返回格式
  const imageUrl = data.data?.[0]?.url 
    || data.data?.[0]?.b64_json
    || data.images?.[0]?.url 
    || data.images?.[0]?.image_url
    || data.url
    || data.result?.url;
    
  console.log('[Image] Extracted URL:', imageUrl);
  
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
 * 创建视频生成任务
 */
async function createVideoTask(prompt: string): Promise<string> {
  const url = `${VOLCENGINE_BASE_URL}/contents/generations/tasks`;
  
  const body = {
    model: 'doubao-seedance-1-5-pro-251215', // 使用正确的模型 ID
    content: [
      {
        type: 'text',
        text: `${prompt} --duration 5 --camerafixed false --watermark true`,
      },
    ],
  };

  console.log('[Video] Creating task...');
  console.log('[Video] URL:', url);
  console.log('[Video] Request:', JSON.stringify(body).substring(0, 300));

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
    console.error('[Video] Create task error:', errorText);
    throw new Error(`Video API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[Video] Task created:', JSON.stringify(data).substring(0, 500));
  
  // 返回任务 ID
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
  console.log('[Video] Full response:', JSON.stringify(data));
  
  // 尝试多种可能的返回格式（data.video_url 最优先，因为它是实际返回值）
  const videoUrl = data.video_url 
    || data.output?.video_url 
    || data.data?.video_url
    || data.data?.url
    || data.output?.url
    || data.url
    || data.content?.video_url;  // 放在最后作为备选
  
  console.log('[Video] Extracted videoUrl:', videoUrl);
  
  return {
    status: data.status || data.task_status || 'unknown',
    videoUrl,
  };
}

/**
 * 直接调用火山引擎视频生成 API（异步任务模式）
 */
async function callVolcengineVideo(prompt: string): Promise<string> {
  // 1. 创建任务
  const taskId = await createVideoTask(prompt);
  console.log('[Video] Task ID:', taskId);

  if (!taskId) {
    throw new Error('Failed to get video task ID');
  }

  // 2. 轮询任务状态（最长等待 5 分钟）
  const maxWaitTime = 5 * 60 * 1000; // 5 分钟
  const pollInterval = 5000; // 5 秒
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

    // 等待后继续轮询
    console.log('[Video] Task still processing, waiting...');
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Video generation timeout after 5 minutes');
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
  text: string,
  ichType: string,
  productType: string,
  interactionType: string,
  targetMarket: string,
  material: string
) {
  try {
    taskStore.update(taskId, { status: 'processing', progress: 10 });
    console.log(`[${taskId}] Task started`);

    // Step 1: 分析并生成 prompts
    console.log(`[${taskId}] Analyzing text...`);
    taskStore.update(taskId, { progress: 20 });

    const analysisPrompt = `你是一位非物质文化遗产创意设计专家。请根据用户需求，生成精准的设计方案。

## 用户描述
"${text}"

## 目标产品类型
${productType || '生成所有类型：海报、节日卡、生日卡、新年卡、动态海报、数字人、互动产品'}

## 任务要求
为每个产品类型生成：
1. **创意描述**：20个汉字，包含关键词+寓意+效果
2. **生图Prompt**：必须具体、详细、可执行

## 输出格式（JSON）
{
  "poster": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "海报正面全景，[主题]，[非遗元素]，高清海报设计",
    "ichElements": ["非遗元素"]
  },
  "festivalCard": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "节日贺卡正面，[节日主题]，[非遗元素]，精致卡片设计",
    "ichElements": ["非遗元素"]
  },
  "birthdayCard": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "生日贺卡正面，[生日主题]，[非遗元素]，精美卡片设计",
    "ichElements": ["非遗元素"]
  },
  "newYearCard": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "新年贺卡正面，[新年主题]，[非遗元素]，传统与现代结合",
    "ichElements": ["非遗元素"]
  },
  "dynamicPoster": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "动态海报主视觉，[主题]，[非遗元素动效]，现代设计",
    "ichElements": ["非遗元素"]
  },
  "digitalAvatar": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "数字人形象正面，[非遗服饰/配饰]，精致人物设计",
    "ichElements": ["非遗元素"]
  },
  "interactiveProduct": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "互动产品整体展示，[产品类型]，[非遗元素]，创新设计",
    "ichElements": ["非遗元素"]
  }
}

请严格按照以上要求输出JSON：`;

    const analysisResponse = await withRetry(
      () => callVolcengineLLM([{ role: 'user', content: analysisPrompt }]),
      3, 3000, `[${taskId}] LLM`
    );

    // 解析 JSON
    let prompts;
    try {
      let content = analysisResponse.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();
      }
      prompts = JSON.parse(content);
    } catch (parseError) {
      console.error(`[${taskId}] JSON parse error:`, parseError);
      throw new Error('AI 响应格式错误，请重试');
    }

    console.log(`[${taskId}] Generated prompts:`, Object.keys(prompts));
    taskStore.update(taskId, { progress: 40 });

    // Step 2: 生成图片
    console.log(`[${taskId}] Generating images...`);

    const typeMap: Record<string, string[]> = {
      'all': ['poster', 'festivalCard', 'birthdayCard', 'newYearCard', 'dynamicPoster', 'digitalAvatar', 'interactiveProduct'],
      'poster': ['poster'],
      'festival': ['festivalCard'],
      'birthday': ['birthdayCard'],
      'newyear': ['newYearCard'],
      'dynamic': ['dynamicPoster'],
      'avatar': ['digitalAvatar'],
      'interactive': ['interactiveProduct'],
    };

    const shouldGenerate = (promptKey: string) => {
      return productType === '' || productType === 'all' || (typeMap[productType] || []).includes(promptKey);
    };

    const results: any[] = [];
    const typesToGenerate = ['poster', 'festivalCard', 'birthdayCard', 'newYearCard', 'dynamicPoster', 'digitalAvatar', 'interactiveProduct'];
    
    // 视频类型（使用视频生成模型）
    const videoTypes = ['dynamicPoster', 'digitalAvatar'];
    
    // 串行生成，避免并发过多
    for (let i = 0; i < typesToGenerate.length; i++) {
      const promptKey = typesToGenerate[i];
      
      if (!shouldGenerate(promptKey)) continue;
      
      const promptData = prompts[promptKey];
      if (!promptData) continue;

      const progress = 40 + Math.floor((i / typesToGenerate.length) * 50);
      taskStore.update(taskId, { progress });

      try {
        console.log(`[${taskId}] Generating ${promptKey}...`);
        
        // 根据类型选择生成方式
        const isVideo = videoTypes.includes(promptKey);
        let mediaUrl: string;
        let mediaType: 'image' | 'video' = 'image';
        
        if (isVideo) {
          console.log(`[${taskId}] ${promptKey} using VIDEO model`);
          mediaUrl = await withRetry(
            () => callVolcengineVideo(promptData.mainPrompt),
            3, 5000, `[${taskId}] ${promptKey} Video`
          );
          mediaType = 'video';
        } else {
          console.log(`[${taskId}] ${promptKey} using IMAGE model`);
          mediaUrl = await withRetry(
            () => callVolcengineImage(promptData.mainPrompt),
            3, 3000, `[${taskId}] ${promptKey} Image`
          );
          mediaType = 'image';
        }
        
        const result: any = {
          type: promptKey,
          mediaType,
          creativeDescription: promptData.creativeDescription || '',
          metadata: {
            ichElements: promptData.ichElements,
          }
        };
        
        // 根据类型设置不同的 URL 字段
        if (isVideo) {
          result.videoUrl = mediaUrl;
          result.mainImageUrl = mediaUrl; // 兼容前端显示
        } else {
          result.mainImageUrl = mediaUrl;
          result.subImageUrl1 = mediaUrl;
          result.subImageUrl2 = mediaUrl;
        }
        
        results.push(result);
      } catch (error: any) {
        console.error(`[${taskId}] Failed to generate ${promptKey}:`, error.message);
      }
    }

    console.log(`[${taskId}] Task completed: ${results.length} products generated`);
    taskStore.update(taskId, {
      status: 'completed',
      progress: 100,
      result: {
        success: true,
        results,
        prompts
      }
    });
  } catch (error: any) {
    console.error(`[${taskId}] Task failed:`, error);
    taskStore.update(taskId, {
      status: 'failed',
      error: error.message || 'Unknown error',
    });
  }
}

/**
 * 执行 Coze 工作流生成任务
 */
async function executeCozeGenerationTask(
  taskId: string,
  text: string,
  ichType: string,
  productType: string,
  interactionTypes: string[],
  targetMarket: string,
  material: string
) {
  try {
    taskStore.update(taskId, { status: 'processing', progress: 10 });
    console.log(`[${taskId}] Coze workflow task started`);

    const allProductTypes = ['poster', 'festival', 'birthday', 'newyear', 'dynamic', 'avatar', 'interactive'];
    const targetProductTypes = productType && productType !== 'all' ? [productType] : allProductTypes;
    const workflowEntries = targetProductTypes.flatMap((currentType) => {
      const workflowIds = PLAY_WORKFLOW_IDS[currentType] || [];
      return workflowIds.map((workflowId, variantIndex) => ({ currentType, workflowId, variantIndex }));
    });
    const results: any[] = [];

    for (let i = 0; i < workflowEntries.length; i++) {
      const { currentType, workflowId, variantIndex } = workflowEntries[i];
      if (!workflowId) {
        throw new Error(`未配置 ${currentType} 对应的 Coze 工作流`);
      }

      const workflowParameters = buildPlayWorkflowParameters({
        text,
        ichType,
        productType: currentType,
        interactionTypes,
        targetMarket,
        material,
      });

      const workflowResult = await runCozeWorkflow(workflowId, workflowParameters);
      const imageUrl = workflowResult.output;

      results.push({
        type: currentType,
        mediaType: 'image',
        mainImageUrl: imageUrl,
        subImageUrl1: imageUrl,
        subImageUrl2: imageUrl,
        creativeDescription: text,
        metadata: {
          workflowId,
          variantIndex,
          workflowParameters,
        },
      });

      const progress = 10 + Math.round(((i + 1) / workflowEntries.length) * 80);
      taskStore.update(taskId, { progress });
    }

    taskStore.update(taskId, {
      status: 'completed',
      progress: 100,
      result: {
        success: true,
        provider: 'coze-workflow',
        results,
      },
    });
  } catch (error: any) {
    console.error(`[${taskId}] Coze workflow task failed:`, error);
    taskStore.update(taskId, {
      status: 'failed',
      error: error.message || 'Unknown error',
    });
  }
}

/**
 * POST /api/v1/play/generate - 创建生成任务
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { text, ichType = '', interactionTypes = [], interactionType = '', productType = '', targetMarket = '', material } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text description provided' });
    }

    console.log(`Play generation request: ichType=${ichType}, productType=${productType}, text="${text}"`);

    // 创建任务
    const task = taskStore.create();
    console.log(`Created task ${task.id}`);

    // 后台执行
    const cleanInteractionTypes = Array.isArray(interactionTypes)
      ? interactionTypes
      : String(interactionType || '').split(',').filter(Boolean);

    executeCozeGenerationTask(task.id, text, ichType, productType, cleanInteractionTypes, targetMarket, material || '').catch(err => {
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
 * GET /api/v1/play/status/:taskId - 查询任务状态
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
