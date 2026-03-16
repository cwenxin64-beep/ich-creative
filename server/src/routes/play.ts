import express, { type Request, type Response } from 'express';
import { LLMClient, Config, ImageGenerationClient, VideoGenerationClient, HeaderUtils } from 'coze-coding-dev-sdk';

const router = express.Router();

/**
 * POST /api/v1/play/generate
 * Generate creative ICH products from text input
 * Body parameters:
 *   - text: Creative text description (string)
 *   - ichType: ICH type (string) - jingdezhen, guqin, xiangyunsha, ru, luban, silkworm, paper-cut, taiji, jingju, other
 *   - interactionType: Interaction type (string) - craft, visual, auditory, behavior
 *   - productType: Product type (string) - poster, festival, birthday, newyear, dynamic, avatar, interactive
 *   - targetMarket: Target market (string) - america, europe, asia, oceania
 *   - material: Optional reference material
 * Response:
 *   - results: Array of generated products with URLs and metadata
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { text, ichType = '', interactionType = '', productType = '', targetMarket = '', material } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text description provided' });
    }

    console.log(`Play generation request: ichType=${ichType}, interactionType=${interactionType}, productType=${productType}, targetMarket=${targetMarket}, text="${text}", material=${material ? 'yes' : 'no'}`);

    // Extract headers for SDK
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config({ timeout: 120000 });

    // Step 1: Analyze text and generate creative prompts using LLM
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

    // 构建目标市场映射
    const marketMap: Record<string, string> = {
      'america': '美洲市场',
      'europe': '欧洲市场',
      'asia': '亚洲市场',
      'oceania': '大洋洲市场',
    };

    // 构建交互类型映射
    const interactionTypeMap: Record<string, string> = {
      'craft': '工艺交互',
      'visual': '视觉交互',
      'auditory': '听觉交互',
      'behavior': '行为交互',
    };

    // 如果有素材，在prompt中包含素材信息
    let materialContext = '';
    if (material) {
      materialContext = `\n\nUser has selected a reference material:\n- Title: ${material.title}\n- Type: ${material.title}\n`;
      if (material.metadata?.ichElements) {
        materialContext += `- ICH Elements: ${material.metadata.ichElements.join(', ')}\n`;
      }
      if (material.metadata?.emotion) {
        materialContext += `- Emotion: ${material.metadata.emotion}\n`;
      }
    }

    // 构建ICH类型和目标市场上下文
    let ichContext = '';
    if (ichType && ichTypeMap[ichType]) {
      ichContext = `\n\nTarget ICH Type: ${ichTypeMap[ichType]}`;
    }
    if (interactionType && interactionTypeMap[interactionType]) {
      ichContext += `\nTarget Interaction Type: ${interactionTypeMap[interactionType]}`;
    }
    if (targetMarket && marketMap[targetMarket]) {
      ichContext += `\nTarget Market: ${marketMap[targetMarket]}`;
    }

    const analysisPrompt = `你是一位非物质文化遗产创意设计专家。请根据用户需求，生成精准的设计方案。

## 用户描述
"${text}"
${materialContext}
${ichContext}

## 目标产品类型
${productType ? `重点生成：${productType}` : '生成所有类型：海报、节日卡、生日卡、新年卡、动态海报、数字人、互动产品'}

## 任务要求
为每个产品类型生成：
1. **创意描述**：20个汉字，包含关键词+寓意+效果
2. **生图Prompt**：必须具体、详细、可执行

## 生图Prompt要求（非常重要！）
- 三个Prompt必须是**同一个产品**的**三个不同角度**
- 必须保持：相同的产品外观、相同的风格、相同的配色、相同的材质
- 区别仅在于拍摄角度：
  - mainPrompt：正面全景图，展示完整产品
  - subPrompt1：细节特写图，聚焦核心工艺细节
  - subPrompt2：侧面/俯视图，展示立体结构

## 输出格式（JSON）
{
  "poster": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "海报正面全景，[主题]，[非遗元素]，[色彩搭配]，[构图]，高清海报设计",
    "subPrompt1": "同一海报细节特写，[核心元素]，[纹理质感]，[工艺细节]",
    "subPrompt2": "同一海报侧面视角，[立体效果]，[材质表现]",
    "ichElements": ["非遗元素"],
    "emotion": "情感基调"
  },
  "festivalCard": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "节日贺卡正面，[节日主题]，[非遗元素]，[喜庆色彩]，精致卡片设计",
    "subPrompt1": "同一贺卡细节特写",
    "subPrompt2": "同一贺卡展开效果",
    "ichElements": ["非遗元素"],
    "emotion": "喜悦"
  },
  "birthdayCard": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "生日贺卡正面，[生日主题]，[非遗元素]，[庆祝氛围]，精美卡片设计",
    "subPrompt1": "同一贺卡细节特写",
    "subPrompt2": "同一贺卡立体效果",
    "ichElements": ["非遗元素"],
    "emotion": "庆祝"
  },
  "newYearCard": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "新年贺卡正面，[新年主题]，[非遗元素]，[吉祥图案]，传统与现代结合",
    "subPrompt1": "同一贺卡细节特写",
    "subPrompt2": "同一贺卡展开效果",
    "ichElements": ["非遗元素"],
    "emotion": "喜庆"
  },
  "dynamicPoster": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "动态海报主视觉，[主题]，[非遗元素动效]，[流畅线条]，现代设计",
    "subPrompt1": "同一海报细节特写",
    "subPrompt2": "同一海报动效展示",
    "ichElements": ["非遗元素"],
    "emotion": "活力"
  },
  "digitalAvatar": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "数字人形象正面，[非遗服饰/配饰]，[传统文化特征]，[现代风格]，精致人物设计",
    "subPrompt1": "同一数字人面部特写",
    "subPrompt2": "同一数字人全身展示",
    "ichElements": ["非遗元素"],
    "emotion": "亲和"
  },
  "interactiveProduct": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "互动产品整体展示，[产品类型]，[非遗元素]，[交互功能示意]，创新设计",
    "subPrompt1": "同一产品交互细节特写",
    "subPrompt2": "同一产品使用场景展示",
    "ichElements": ["非遗元素"],
    "emotion": "互动"
  }
}

请严格按照以上要求输出JSON，只输出用户需要的产品类型：`;

    const analysisResponse = await llmClient.invoke([
      { role: 'user' as const, content: analysisPrompt }
    ], {
      model: 'doubao-seed-1-6-251015',
      temperature: 0.5,
    });

    // 安全解析 JSON，处理 LLM 可能返回的 markdown 代码块
    let prompts;
    try {
      let content = analysisResponse.content.trim();
      // 移除 markdown 代码块标记
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

    // Step 2: Generate images based on productType
    const imageClient = new ImageGenerationClient(config, customHeaders);
    const results: any[] = [];

    // Type mapping: frontend type -> prompts key
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
      if (!shouldGenerate(promptKey)) {
        return null;
      }

      const promptData = prompts[promptKey];
      if (!promptData) return null;

      try {
        // Generate 3 images with different prompts
        // The prompts are designed to generate the same product from different angles
        const [mainResponse, sub1Response, sub2Response] = await Promise.all([
          imageClient.generate({
            prompt: promptData.mainPrompt,
            size: '2K',
            watermark: false,
          }),
          imageClient.generate({
            prompt: promptData.subPrompt1,
            size: '2K',
            watermark: false,
          }),
          imageClient.generate({
            prompt: promptData.subPrompt2,
            size: '2K',
            watermark: false,
          }),
        ]);

        const mainHelper = imageClient.getResponseHelper(mainResponse);
        const sub1Helper = imageClient.getResponseHelper(sub1Response);
        const sub2Helper = imageClient.getResponseHelper(sub2Response);

        if (mainHelper.success && mainHelper.imageUrls.length > 0) {
          return {
            type: label,
            mainImageUrl: mainHelper.imageUrls[0],
            subImageUrl1: sub1Helper.success && sub1Helper.imageUrls.length > 0 ? sub1Helper.imageUrls[0] : mainHelper.imageUrls[0],
            subImageUrl2: sub2Helper.success && sub2Helper.imageUrls.length > 0 ? sub2Helper.imageUrls[0] : mainHelper.imageUrls[0],
            creativeDescription: promptData.creativeDescription || '',
            metadata: {
              ichElements: promptData.ichElements,
              emotion: promptData.emotion
            }
          };
        }
      } catch (error) {
        console.error(`Failed to generate ${label}:`, error);
      }
      return null;
    };

    // Generate static images
    const imageGenerations = [
      generateImage('poster', '海报'),
      generateImage('festivalCard', '节日卡'),
      generateImage('birthdayCard', '生日卡'),
      generateImage('newYearCard', '新年卡'),
      generateImage('digitalAvatar', '数字人'),
    ];

    const imageResults = (await Promise.all(imageGenerations)).filter(r => r !== null);
    results.push(...imageResults);

    // Step 3: Generate dynamic poster (video) if requested
    if (productType === 'all' || productType === 'dynamic' || productType === 'dynamic-poster') {
      try {
        const dynamicPrompt = prompts.dynamicPoster;
        if (dynamicPrompt) {
          const videoClient = new VideoGenerationClient(config, customHeaders);

          // Generate 3 static images for the video
          // The prompts are designed to generate the same product from different angles
          const [mainImageResponse, sub1ImageResponse, sub2ImageResponse] = await Promise.all([
            imageClient.generate({
              prompt: dynamicPrompt.mainPrompt,
              size: '2K',
              watermark: false,
            }),
            imageClient.generate({
              prompt: dynamicPrompt.subPrompt1,
              size: '2K',
              watermark: false,
            }),
            imageClient.generate({
              prompt: dynamicPrompt.subPrompt2,
              size: '2K',
              watermark: false,
            }),
          ]);

          const mainImageHelper = imageClient.getResponseHelper(mainImageResponse);
          const sub1ImageHelper = imageClient.getResponseHelper(sub1ImageResponse);
          const sub2ImageHelper = imageClient.getResponseHelper(sub2ImageResponse);

          const mainImageUrl = mainImageHelper.success && mainImageHelper.imageUrls.length > 0
            ? mainImageHelper.imageUrls[0]
            : '';
          const subImageUrl1 = sub1ImageHelper.success && sub1ImageHelper.imageUrls.length > 0
            ? sub1ImageHelper.imageUrls[0]
            : mainImageUrl;
          const subImageUrl2 = sub2ImageHelper.success && sub2ImageHelper.imageUrls.length > 0
            ? sub2ImageHelper.imageUrls[0]
            : mainImageUrl;

          // Generate video
          const videoContent = [
            {
              type: 'text' as const,
              text: `Create a dynamic animated poster (5-8 seconds) featuring: ${dynamicPrompt.mainPrompt}
              Focus on: ${dynamicPrompt.ichElements.join(', ')}.
              Emotional tone: ${dynamicPrompt.emotion}.
              Smooth animations, eye-catching transitions, modern design with traditional ICH elements.`,
            },
          ];

          const videoResponse = await videoClient.videoGeneration(videoContent, {
            model: 'doubao-seedance-1-5-pro-251215',
            duration: 5,
            resolution: '720p',
            ratio: '9:16',
            generateAudio: true,
          });

          if (videoResponse.videoUrl) {
            results.push({
              type: '动态海报',
              videoUrl: videoResponse.videoUrl,
              mainImageUrl,
              subImageUrl1,
              subImageUrl2,
              creativeDescription: dynamicPrompt.creativeDescription || '',
              metadata: {
                ichElements: dynamicPrompt.ichElements,
                emotion: dynamicPrompt.emotion
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to generate dynamic poster:', error);
      }
    }

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
