import express, { type Request, type Response } from 'express';
import { LLMClient, Config, ImageGenerationClient, HeaderUtils } from 'coze-coding-dev-sdk';

const router = express.Router();

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

    console.log(`Customize request: ichType=${ichType}, interactionType=${interactionType}, applicationScene=${applicationScene}, keywords="${keywords}"`);

    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    // 构建ICH类型映射
    const ichTypeMap: Record<string, string> = {
      'jingdezhen': '景德镇陶瓷',
      'guqin': '古琴艺术',
      'xiangyunsha': '香云纱',
      'ru': '汝瓷',
      'luban': '鲁班锁',
      'silkworm': '桑蚕丝织技艺',
      'paper-cut': '中国剪纸',
      'taiji': '太极拳',
      'jingju': '京剧',
      'other': '其他',
    };

    // 构建体验类型映射
    const interactionTypeMap: Record<string, string> = {
      'inheritor': '传承人',
      'creator': '创作者',
      'explorer': '探索者',
      'artist': '艺术家',
    };

    // 构建上下文
    let contextInfo = '';
    if (material) {
      contextInfo += `\n参考素材：${material.title}`;
    }
    if (ichType && ichTypeMap[ichType]) {
      contextInfo += `\n目标非遗类型：${ichTypeMap[ichType]}`;
    }
    if (interactionType && interactionTypeMap[interactionType]) {
      contextInfo += `\n体验类型：${interactionTypeMap[interactionType]}`;
    }

    const designPrompt = `你是一位非物质文化遗产创意设计专家。请根据用户关键词，生成精准的定制产品设计方案。

## 用户关键词
"${keywords}"
${contextInfo}

## 任务要求
为每个应用场景生成：
1. **创意描述**：20个汉字，包含关键词+寓意+效果
2. **生图Prompt**：必须具体、详细、可执行

## 生图Prompt要求（非常重要！）
- 三个Prompt必须是**同一个产品**的**三个不同角度**
- 必须保持：相同的产品外观、相同的风格、相同的配色、相同的材质
- mainPrompt：正面全景图
- subPrompt1：细节特写图
- subPrompt2：侧面/俯视图

## 输出格式（JSON）
{
  "fashion": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "时尚配饰正面展示，[产品类型]，[非遗图案]，[色彩]，现代摄影",
    "subPrompt1": "同一产品细节特写",
    "subPrompt2": "同一产品佩戴效果",
    "ichElements": ["非遗元素"],
    "features": ["功能特点"],
    "colorPalette": ["配色"]
  },
  "home": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "家居装饰品正面展示，[产品类型]，[非遗元素]，温馨场景",
    "subPrompt1": "同一产品细节特写",
    "subPrompt2": "同一产品居家场景展示",
    "ichElements": ["非遗元素"],
    "features": ["功能特点"],
    "colorPalette": ["配色"]
  },
  "art": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "艺术品正面展示，[产品类型]，[非遗技艺]，画廊级摄影",
    "subPrompt1": "同一艺术品细节特写",
    "subPrompt2": "同一艺术品侧面展示",
    "ichElements": ["非遗元素"],
    "features": ["艺术特点"],
    "colorPalette": ["配色"]
  },
  "gifts": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "礼品正面展示，[产品类型]，[非遗元素]，精致礼品摄影",
    "subPrompt1": "同一礼品细节特写",
    "subPrompt2": "同一礼品包装展示",
    "ichElements": ["非遗元素"],
    "features": ["礼品特点"],
    "colorPalette": ["配色"]
  }
}

请严格按照以上要求输出JSON：`;

    const analysisResponse = await llmClient.invoke([
      { role: 'user' as const, content: designPrompt }
    ], {
      model: 'doubao-seed-1-6-251015',
      temperature: 0.5,
    });

    // 安全解析 JSON
    let prompts;
    try {
      let content = analysisResponse.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();
      }
      prompts = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('LLM response:', analysisResponse.content);
      return res.status(500).json({
        error: 'AI 响应格式错误，请重试',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      });
    }

    console.log('Generated design prompts:', Object.keys(prompts));

    // 生成图片
    const imageClient = new ImageGenerationClient(config, customHeaders);
    const results: any[] = [];

    const categories = ['fashion', 'home', 'art', 'gifts'];

    for (const category of categories) {
      if (applicationScene && applicationScene !== 'all' && applicationScene !== category) {
        continue;
      }

      const promptData = prompts[category];
      if (!promptData) continue;

      try {
        const [mainResponse, sub1Response, sub2Response] = await Promise.all([
          imageClient.generate({ prompt: promptData.mainPrompt, size: '2K', watermark: false }),
          imageClient.generate({ prompt: promptData.subPrompt1, size: '2K', watermark: false }),
          imageClient.generate({ prompt: promptData.subPrompt2, size: '2K', watermark: false }),
        ]);

        const mainHelper = imageClient.getResponseHelper(mainResponse);
        const sub1Helper = imageClient.getResponseHelper(sub1Response);
        const sub2Helper = imageClient.getResponseHelper(sub2Response);

        if (mainHelper.success && mainHelper.imageUrls.length > 0) {
          results.push({
            category,
            mainImageUrl: mainHelper.imageUrls[0],
            subImageUrl1: sub1Helper.success ? sub1Helper.imageUrls[0] : mainHelper.imageUrls[0],
            subImageUrl2: sub2Helper.success ? sub2Helper.imageUrls[0] : mainHelper.imageUrls[0],
            creativeDescription: promptData.creativeDescription || '',
            metadata: {
              ichElements: promptData.ichElements,
              features: promptData.features,
              colorPalette: promptData.colorPalette
            }
          });
        }
      } catch (error) {
        console.error(`Failed to generate ${category} product:`, error);
      }
    }

    console.log(`Customization completed: ${results.length} products generated`);

    res.json({
      success: true,
      results,
      keywords,
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
