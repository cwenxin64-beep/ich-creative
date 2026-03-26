import express, { type Request, type Response } from 'express';

const router = express.Router();

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
  return data.data?.[0]?.url || data.data?.[0]?.b64_json || data.images?.[0]?.url || data.images?.[0]?.image_url;
}

/**
 * POST /api/v1/play/generate
 * Generate creative ICH products from text input
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { text, ichType = '', interactionType = '', productType = '', targetMarket = '', material } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text description provided' });
    }

    console.log(`Play generation request: ichType=${ichType}, productType=${productType}, text="${text}"`);

    // 构建分析 Prompt
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

    // Step 1: 分析并生成 prompts
    const analysisResponse = await callVolcengineLLM([
      { role: 'user', content: analysisPrompt }
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
    console.log('Generated prompts:', Object.keys(prompts));

    // Step 2: 生成图片
    const results: any[] = [];

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

    const generateProduct = async (promptKey: string, label: string) => {
      if (!shouldGenerate(promptKey)) return null;

      const promptData = prompts[promptKey];
      if (!promptData) return null;

      try {
        const imageUrl = await callVolcengineImage(promptData.mainPrompt);
        return {
          type: label,
          mainImageUrl: imageUrl,
          subImageUrl1: imageUrl,
          subImageUrl2: imageUrl,
          creativeDescription: promptData.creativeDescription || '',
          metadata: {
            ichElements: promptData.ichElements,
          }
        };
      } catch (error) {
        console.error(`Failed to generate ${label}:`, error);
        return null;
      }
    };

    // 并行生成所有产品
    const imageGenerations = [
      generateProduct('poster', '海报'),
      generateProduct('festivalCard', '节日卡'),
      generateProduct('birthdayCard', '生日卡'),
      generateProduct('newYearCard', '新年卡'),
      generateProduct('digitalAvatar', '数字人'),
      generateProduct('dynamicPoster', '动态海报'),
      generateProduct('interactiveProduct', '互动产品'),
    ];

    const imageResults = (await Promise.all(imageGenerations)).filter(r => r !== null);
    results.push(...imageResults);

    console.log(`Play generation completed: ${results.length} products generated`);

    res.json({
      success: true,
      results,
      prompts
    });
  } catch (error) {
    console.error('Play generation error:', error);
    res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
