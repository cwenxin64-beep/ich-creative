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
    const config = new Config();

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

    const analysisPrompt = `
You are an expert in intangible cultural heritage (ICH) and creative design.

Analyze this creative text and generate design prompts for ICH creative products.

User's description: "${text}"${materialContext}${ichContext}

Your task is to generate creative prompts for the following product types${productType ? ` (focus on ${productType})` : ''}:

1. Poster - A visually striking poster incorporating ICH elements
2. Festival Card - A greeting card for traditional festivals with ICH motifs
3. Birthday Card - A creative birthday card blending ICH aesthetics with celebration
4. New Year Card - A festive New Year card with ICH symbolism
5. Dynamic Poster - An animated poster with dynamic ICH elements
6. Digital Avatar - A stylized digital avatar incorporating ICH features
7. Interactive Product - An interactive creative product with user engagement features

For each product type, generate:
- A creative description in exactly 20 Chinese characters that includes:
  - Key creative keywords from the user's input
  - The artistic implication (寓意) of the work
  - The visual effect (效果) of the work
  Example: "青花瓷韵，古今交融，清新雅致" (Blue porcelain charm, fusion of ancient and modern, fresh and elegant)
- A detailed visual description
- Key ICH elements to incorporate
- Color scheme and composition
- Emotional tone
- **CRITICAL**: Generate **three prompts for the SAME product from different angles**:
  - The product must be IDENTICAL in content, style, color scheme, and visual elements
  - Only the camera angle/viewpoint should differ:
    - mainPrompt: Front/full view (product showcase, complete scene)
    - subPrompt1: Close-up view (focused on specific details, same product)
    - subPrompt2: Side/alternative view (same product, different perspective)
  - Use EXACTLY the same ICH elements, colors, style, materials for all three images
  - The three images must look like photographs of the same physical object

Format your response as JSON:
{
  "poster": {
    "creativeDescription": "exactly 20 Chinese characters including keywords, implication, and effect",
    "mainPrompt": "detailed prompt for main poster image",
    "subPrompt1": "detailed prompt for sub poster image 1 (focus on details)",
    "subPrompt2": "detailed prompt for sub poster image 2 (alternative perspective)",
    "ichElements": ["element1", "element2"],
    "emotion": "emotional tone"
  },
  "festivalCard": {
    "creativeDescription": "exactly 20 Chinese characters including keywords, implication, and effect",
    "mainPrompt": "detailed prompt for main festival card image",
    "subPrompt1": "detailed prompt for sub festival card image 1 (close-up details)",
    "subPrompt2": "detailed prompt for sub festival card image 2 (artistic variation)",
    "ichElements": ["element1"],
    "emotion": "joyful"
  },
  "birthdayCard": {
    "creativeDescription": "exactly 20 Chinese characters including keywords, implication, and effect",
    "mainPrompt": "detailed prompt for main birthday card image",
    "subPrompt1": "detailed prompt for sub birthday card image 1 (focused on key elements)",
    "subPrompt2": "detailed prompt for sub birthday card image 2 (creative alternative)",
    "ichElements": ["element1"],
    "emotion": "celebratory"
  },
  "newYearCard": {
    "creativeDescription": "exactly 20 Chinese characters including keywords, implication, and effect",
    "mainPrompt": "detailed prompt for main new year card image",
    "subPrompt1": "detailed prompt for sub new year card image 1 (highlighted features)",
    "subPrompt2": "detailed prompt for sub new year card image 2 (different composition)",
    "ichElements": ["element1"],
    "emotion": "festive"
  },
  "dynamicPoster": {
    "creativeDescription": "exactly 20 Chinese characters including keywords, implication, and effect",
    "mainPrompt": "detailed prompt for main dynamic poster image",
    "subPrompt1": "detailed prompt for sub dynamic poster image 1 (focused on key animations)",
    "subPrompt2": "detailed prompt for sub dynamic poster image 2 (alternative visual style)",
    "ichElements": ["element1"],
    "emotion": "energetic"
  },
  "digitalAvatar": {
    "creativeDescription": "exactly 20 Chinese characters including keywords, implication, and effect",
    "mainPrompt": "detailed prompt for main digital avatar image",
    "subPrompt1": "detailed prompt for sub digital avatar image 1 (close-up face details)",
    "subPrompt2": "detailed prompt for sub digital avatar image 2 (different pose or angle)",
    "ichElements": ["element1"],
    "emotion": "friendly"
  },
  "interactiveProduct": {
    "creativeDescription": "exactly 20 Chinese characters including keywords, implication, and effect",
    "mainPrompt": "detailed prompt for main interactive product image",
    "subPrompt1": "detailed prompt for sub interactive product image 1 (showcasing interaction features)",
    "subPrompt2": "detailed prompt for sub interactive product image 2 (user experience perspective)",
    "ichElements": ["element1"],
    "emotion": "engaging"
  }
}
`;

    const analysisResponse = await llmClient.invoke([
      { role: 'user' as const, content: analysisPrompt }
    ], {
      model: 'doubao-seed-1-6-251015',
      temperature: 0.85,
    });

    const prompts = JSON.parse(analysisResponse.content);
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
