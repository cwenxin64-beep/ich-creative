import express, { type Request, type Response } from 'express';
import { LLMClient, Config, ImageGenerationClient, HeaderUtils } from 'coze-coding-dev-sdk';

const router = express.Router();

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

    console.log(`Play generation request: ichType=${ichType}, interactionType=${interactionType}, productType=${productType}, targetMarket=${targetMarket}, text="${text}"`);

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

    const marketMap: Record<string, string> = {
      'america': '美洲市场',
      'europe': '欧洲市场',
      'asia': '亚洲市场',
      'oceania': '大洋洲市场',
    };

    const interactionTypeMap: Record<string, string> = {
      'craft': '工艺交互',
      'visual': '视觉交互',
      'auditory': '听觉交互',
      'behavior': '行为交互',
    };

    // 构建上下文
    let contextInfo = '';
    if (ichType && ichTypeMap[ichType]) {
      contextInfo += `\n目标非遗类型：${ichTypeMap[ichType]}`;
    }
    if (interactionType && interactionTypeMap[interactionType]) {
      contextInfo += `\n交互类型：${interactionTypeMap[interactionType]}`;
    }
    if (targetMarket && marketMap[targetMarket]) {
      contextInfo += `\n目标市场：${marketMap[targetMarket]}`;
    }
    if (material) {
      contextInfo += `\n参考素材：${material.title}`;
    }

    const analysisPrompt = `你是一位非物质文化遗产创意设计专家。请根据用户需求，生成精准的设计方案。

## 用户描述
"${text}"
${contextInfo}

## 目标产品类型
${productType ? `重点生成：${productType}` : '生成所有类型'}

## 任务要求
为每个产品类型生成：
1. **创意描述**：20个汉字，包含关键词+寓意+效果
2. **生图Prompt**：必须具体、详细、可执行

## 生图Prompt要求（非常重要！）
- 三个Prompt必须是同一个产品的三个不同角度
- 必须保持：相同的产品外观、风格、配色、材质
- mainPrompt：正面全景图
- subPrompt1：细节特写图
- subPrompt2：侧面/俯视图

## 输出格式（JSON）
{
  "poster": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "海报正面全景，[主题]，[非遗元素]，[色彩]，高清设计",
    "subPrompt1": "同一海报细节特写",
    "subPrompt2": "同一海报侧面展示",
    "ichElements": ["非遗元素"],
    "emotion": "情感基调"
  },
  "festivalCard": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "节日贺卡正面，[节日主题]，[非遗元素]，精美设计",
    "subPrompt1": "同一贺卡细节特写",
    "subPrompt2": "同一贺卡展开效果",
    "ichElements": ["非遗元素"],
    "emotion": "喜悦"
  },
  "birthdayCard": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "生日贺卡正面，[生日主题]，[非遗元素]，精美设计",
    "subPrompt1": "同一贺卡细节特写",
    "subPrompt2": "同一贺卡立体效果",
    "ichElements": ["非遗元素"],
    "emotion": "庆祝"
  },
  "newYearCard": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "新年贺卡正面，[新年主题]，[非遗元素]，传统与现代结合",
    "subPrompt1": "同一贺卡细节特写",
    "subPrompt2": "同一贺卡展开效果",
    "ichElements": ["非遗元素"],
    "emotion": "喜庆"
  },
  "dynamicPoster": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "动态海报主视觉，[主题]，[非遗元素动效]，现代设计",
    "subPrompt1": "同一海报细节特写",
    "subPrompt2": "同一海报动效展示",
    "ichElements": ["非遗元素"],
    "emotion": "活力"
  },
  "digitalAvatar": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "数字人形象正面，[非遗服饰/配饰]，[传统文化特征]，精致人物设计",
    "subPrompt1": "同一数字人面部特写",
    "subPrompt2": "同一数字人全身展示",
    "ichElements": ["非遗元素"],
    "emotion": "亲和"
  },
  "interactiveProduct": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "互动产品整体展示，[产品类型]，[非遗元素]，创新设计",
    "subPrompt1": "同一产品交互细节特写",
    "subPrompt2": "同一产品使用场景展示",
    "ichElements": ["非遗元素"],
    "emotion": "互动"
  }
}

请严格按照以上要求输出JSON：`;

    const analysisResponse = await llmClient.invoke([
      { role: 'user' as const, content: analysisPrompt }
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

    console.log('Generated prompts:', Object.keys(prompts));

    // 生成图片
    const imageClient = new ImageGenerationClient(config, customHeaders);
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

    const generateImage = async (promptKey: string, label: string) => {
      if (!shouldGenerate(promptKey)) return null;

      const promptData = prompts[promptKey];
      if (!promptData) return null;

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
          return {
            type: label,
            mainImageUrl: mainHelper.imageUrls[0],
            subImageUrl1: sub1Helper.success ? sub1Helper.imageUrls[0] : mainHelper.imageUrls[0],
            subImageUrl2: sub2Helper.success ? sub2Helper.imageUrls[0] : mainHelper.imageUrls[0],
            metadata: {
              creativeDescription: promptData.creativeDescription,
              ichElements: promptData.ichElements,
              emotion: promptData.emotion,
            }
          };
        }
      } catch (error) {
        console.error(`Failed to generate ${label}:`, error);
      }
      return null;
    };

    const posterResult = await generateImage('poster', '海报');
    if (posterResult) results.push(posterResult);

    const festivalResult = await generateImage('festivalCard', '节日卡');
    if (festivalResult) results.push(festivalResult);

    const birthdayResult = await generateImage('birthdayCard', '生日卡');
    if (birthdayResult) results.push(birthdayResult);

    const newYearResult = await generateImage('newYearCard', '新年卡');
    if (newYearResult) results.push(newYearResult);

    const dynamicResult = await generateImage('dynamicPoster', '动态海报');
    if (dynamicResult) results.push(dynamicResult);

    const avatarResult = await generateImage('digitalAvatar', '数字人');
    if (avatarResult) results.push(avatarResult);

    const interactiveResult = await generateImage('interactiveProduct', '互动产品');
    if (interactiveResult) results.push(interactiveResult);

    console.log(`Play generation completed: ${results.length} products generated`);

    res.json({
      success: true,
      results,
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
