import express, { type Request, type Response } from 'express';
import { S3Storage } from 'coze-coding-dev-sdk';

const router = express.Router();

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

// 火山引擎 API 配置
const VOLCENGINE_API_KEY = process.env.COZE_API_KEY || process.env.VOLCENGINE_API_KEY || '';
const VOLCENGINE_BASE_URL = process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

// 模型 ID 配置（使用推理接入点 ID）
const TEXT_MODEL = process.env.VOLCENGINE_TEXT_MODEL || 'ep-20260326185613-8d6lx';
const IMAGE_MODEL = process.env.VOLCENGINE_IMAGE_MODEL || 'ep-20260326185459-8rt74';

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
 * POST /api/v1/use/customize
 * Generate customized ICH creative products
 */
router.post('/customize', async (req: Request, res: Response) => {
  try {
    const { keywords, ichType = '', interactionType = '', applicationScene = '', material } = req.body;

    if (!keywords) {
      return res.status(400).json({ error: 'No keywords provided' });
    }

    console.log(`Customize request: ichType=${ichType}, applicationScene=${applicationScene}, keywords="${keywords}"`);

    // 构建设计 Prompt
    const designPrompt = `你是一位非物质文化遗产创意设计专家。请根据用户关键词，生成精准的定制产品设计方案。

## 用户关键词
"${keywords}"

## 任务要求
为每个应用场景生成：
1. **创意描述**：20个汉字，包含关键词+寓意+效果
2. **生图Prompt**：用于AI生图，必须具体、详细、可执行

## 输出格式（JSON）
{
  "fashion": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "时尚配饰正面展示，[产品类型]，[非遗图案]，现代时尚摄影",
    "ichElements": ["非遗元素"],
    "colorPalette": ["配色方案"]
  },
  "home": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "家居装饰品正面展示，[产品类型]，[非遗元素]，温馨场景摄影",
    "ichElements": ["非遗元素"],
    "colorPalette": ["配色方案"]
  },
  "art": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "艺术品正面展示，[产品类型]，[非遗技艺]，画廊级摄影",
    "ichElements": ["非遗元素"],
    "colorPalette": ["配色方案"]
  },
  "gifts": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "礼品正面展示，[产品类型]，[非遗元素]，精致礼品摄影",
    "ichElements": ["非遗元素"],
    "colorPalette": ["配色方案"]
  }
}

请严格按照以上要求输出JSON：`;

    // Step 1: 分析并生成 prompts
    const analysisResponse = await callVolcengineLLM([
      { role: 'user', content: designPrompt }
    ]);

    // 解析 JSON
    let prompts;
    try {
      let content = analysisResponse.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();
      }
      prompts = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(500).json({
        error: 'AI 响应格式错误，请重试',
      });
    }
    console.log('Generated design prompts:', Object.keys(prompts));

    // Step 2: 生成产品图片
    const results: any[] = [];
    const categories = ['fashion', 'home', 'art', 'gifts'];

    for (const category of categories) {
      if (applicationScene && applicationScene !== 'all' && applicationScene !== category) {
        continue;
      }

      const promptData = prompts[category];
      if (!promptData) continue;

      try {
        const imageUrl = await callVolcengineImage(promptData.mainPrompt);
        
        results.push({
          category,
          mainImageUrl: imageUrl,
          subImageUrl1: imageUrl,
          subImageUrl2: imageUrl,
          creativeDescription: promptData.creativeDescription || '',
          metadata: {
            ichElements: promptData.ichElements,
            colorPalette: promptData.colorPalette
          }
        });
      } catch (error) {
        console.error(`Failed to generate ${category} product:`, error);
      }
    }

    console.log(`Customization completed: ${results.length} products generated`);

    res.json({
      success: true,
      results,
      keywords,
      prompts
    });
  } catch (error) {
    console.error('Customization error:', error);
    res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
