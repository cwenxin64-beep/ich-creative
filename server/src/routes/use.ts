import express, { type Request, type Response } from 'express';
import { LLMClient, Config, ImageGenerationClient, HeaderUtils } from 'coze-coding-dev-sdk';

const router = express.Router();

/**
 * POST /api/v1/use/customize
 * Generate customized ICH creative products
 * Body parameters:
 *   - keywords: Creative keywords (string)
 *   - ichType: ICH type (string) - jingdezhen, guqin, xiangyunsha, ru, luban, silkworm, paper-cut, taiji, jingju, other
 *   - interactionType: Interaction type (string) - craft, visual, auditory, behavior
 *   - applicationScene: Application scene (string) - fashion, home, art, gifts
 *   - material: Optional reference material
 * Response:
 *   - results: Array of customized product designs with URLs
 */
router.post('/customize', async (req: Request, res: Response) => {
  try {
    const { keywords, ichType = '', interactionType = '', applicationScene = '', material } = req.body;

    if (!keywords) {
      return res.status(400).json({ error: 'No keywords provided' });
    }

    console.log(`Customize request: ichType=${ichType}, interactionType=${interactionType}, applicationScene=${applicationScene}, keywords="${keywords}", material=${material ? 'yes' : 'no'}`);

    // Extract headers for SDK
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();

    // Step 1: Analyze keywords and generate product design prompts using LLM
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

    // 如果有素材，在prompt中包含素材信息
    let materialContext = '';
    if (material) {
      materialContext = `\n\nUser has selected a reference material:\n- Title: ${material.title}\n- Type: ${material.title}\n`;
      if (material.metadata?.ichElements) {
        materialContext += `- ICH Elements: ${material.metadata.ichElements.join(', ')}\n`;
      }
      if (material.metadata?.colorPalette) {
        materialContext += `- Color Palette: ${material.metadata.colorPalette.join(', ')}\n`;
      }
    }

    // 构建ICH类型上下文
    let ichContext = '';
    if (ichType && ichTypeMap[ichType]) {
      ichContext = `\n\nTarget ICH Type: ${ichTypeMap[ichType]}`;
    }
    if (interactionType && interactionTypeMap[interactionType]) {
      ichContext += `\nTarget Interaction Type: ${interactionTypeMap[interactionType]}`;
    }

    const designPrompt = `
You are an expert in intangible cultural heritage (ICH) and modern product design.

Analyze these creative keywords and generate detailed design prompts for customized ICH products.

Keywords: "${keywords}"${materialContext}${ichContext}

Your task is to create innovative product designs that blend ICH elements with modern functionality and aesthetics.

For each application scene, generate:
1. A creative description in exactly 20 Chinese characters that includes:
   - Key creative keywords from the user's input
   - The artistic implication (寓意) of the work
   - The visual effect (效果) of the work
   Example: "青花瓷韵，古今交融，清新雅致" (Blue porcelain charm, fusion of ancient and modern, fresh and elegant)
2. A detailed visual description
3. Key ICH elements to incorporate (patterns, motifs, techniques)
4. Modern design features and functionality
5. Target audience and use case
6. Color palette and materials
7. **CRITICAL**: Generate **three prompts for the SAME product from different angles**:
   - The product must be IDENTICAL in content, style, color scheme, and visual elements
   - Only the camera angle/viewpoint should differ:
     - mainPrompt: Front/full view (product showcase, complete scene)
     - subPrompt1: Close-up view (focused on specific details, same product)
     - subPrompt2: Side/alternative view (same product, different perspective)
   - Use EXACTLY the same ICH elements, colors, style, materials for all three images
   - The three images must look like photographs of the same physical object

Generate prompts for:
1. Fashion - Scarves, bags, accessories with ICH patterns
2. Home Decor - Cushions, wall art, tableware
3. Art Pieces - Sculptures, paintings, mixed media
4. Gift Items - Special occasion gifts with ICH symbolism

Format your response as JSON:
{
  "fashion": {
    "creativeDescription": "exactly 20 Chinese characters including keywords, implication, and effect",
    "mainPrompt": "detailed prompt for fashion product main image",
    "subPrompt1": "detailed prompt for fashion product sub image 1 (focus on details)",
    "subPrompt2": "detailed prompt for fashion product sub image 2 (alternative perspective)",
    "ichElements": ["element1", "element2"],
    "features": ["feature1", "feature2"],
    "colorPalette": ["color1", "color2"]
  },
  "home": {
    "creativeDescription": "exactly 20 Chinese characters including keywords, implication, and effect",
    "mainPrompt": "detailed prompt for home decor main image",
    "subPrompt1": "detailed prompt for home decor sub image 1 (focus on details)",
    "subPrompt2": "detailed prompt for home decor sub image 2 (alternative perspective)",
    "ichElements": ["element1"],
    "features": ["feature1"],
    "colorPalette": ["color1"]
  },
  "art": {
    "creativeDescription": "exactly 20 Chinese characters including keywords, implication, and effect",
    "mainPrompt": "detailed prompt for art piece main image",
    "subPrompt1": "detailed prompt for art piece sub image 1 (focus on details)",
    "subPrompt2": "detailed prompt for art piece sub image 2 (alternative perspective)",
    "ichElements": ["element1"],
    "features": ["feature1"],
    "colorPalette": ["color1"]
  },
  "gifts": {
    "creativeDescription": "exactly 20 Chinese characters including keywords, implication, and effect",
    "mainPrompt": "detailed prompt for gift item main image",
    "subPrompt1": "detailed prompt for gift item sub image 1 (focus on details)",
    "subPrompt2": "detailed prompt for gift item sub image 2 (alternative perspective)",
    "ichElements": ["element1"],
    "features": ["feature1"],
    "colorPalette": ["color1"]
  }
}
`;

    const analysisResponse = await llmClient.invoke([
      { role: 'user' as const, content: designPrompt }
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
    console.log('Generated design prompts:', Object.keys(prompts));

    // Step 2: Generate product images
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
          results.push({
            category,
            mainImageUrl: mainHelper.imageUrls[0],
            subImageUrl1: sub1Helper.success && sub1Helper.imageUrls.length > 0 ? sub1Helper.imageUrls[0] : mainHelper.imageUrls[0],
            subImageUrl2: sub2Helper.success && sub2Helper.imageUrls.length > 0 ? sub2Helper.imageUrls[0] : mainHelper.imageUrls[0],
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

/**
 * POST /api/v1/use/customization-order
 * Submit a product customization order
 * Body parameters:
 *   - productId: Product ID (string)
 *   - imageUrl: Product image URL (string)
 *   - size: Product size (string)
 *   - time: Expected delivery time (string)
 *   - price: Accepted price range (string)
 *   - requirement: Special requirements (string)
 * Response:
 *   - success: Boolean
 *   - message: Status message
 *   - orderId: Order ID (if successful)
 */
router.post('/customization-order', async (req: Request, res: Response) => {
  try {
    const { productId, imageUrl, size, time, price, requirement } = req.body;

    if (!size || !time || !price) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide size, time, and price'
      });
    }

    console.log(`Customization order received: productId=${productId}, size=${size}, time=${time}, price=${price}`);

    // TODO: In production, you would:
    // 1. Save the order to a database
    // 2. Send notification to the manager
    // 3. Return a unique order ID

    // Generate a simple order ID (in production, use a proper ID generator)
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Simulate saving to database
    const orderData = {
      id: orderId,
      productId,
      imageUrl,
      size,
      time,
      price,
      requirement: requirement || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    console.log('Order saved:', orderData);

    res.json({
      success: true,
      message: '定制订单已提交成功',
      orderId,
      order: orderData,
    });
  } catch (error) {
    console.error('Customization order error:', error);
    res.status(500).json({
      error: 'Order submission failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
