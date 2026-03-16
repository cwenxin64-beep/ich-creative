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
    const config = new Config({ timeout: 120000 });

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

    const designPrompt = `你是一位非物质文化遗产创意设计专家。请根据用户关键词，生成精准的定制产品设计方案。

## 用户关键词
"${keywords}"
${materialContext}
${ichContext}

## 任务要求
为每个应用场景生成：
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
  "fashion": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "时尚配饰正面展示，[产品类型：围巾/包/饰品]，[非遗图案]，[色彩搭配]，[材质]，现代时尚摄影",
    "subPrompt1": "同一产品细节特写，[图案细节]，[材质纹理]，[工艺特征]",
    "subPrompt2": "同一产品佩戴效果，[搭配场景]，[整体造型]",
    "ichElements": ["非遗元素"],
    "features": ["功能特点"],
    "colorPalette": ["配色方案"]
  },
  "home": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "家居装饰品正面展示，[产品类型：靠垫/挂画/餐具]，[非遗元素]，[家居风格]，温馨场景摄影",
    "subPrompt1": "同一产品细节特写",
    "subPrompt2": "同一产品居家场景展示",
    "ichElements": ["非遗元素"],
    "features": ["功能特点"],
    "colorPalette": ["配色方案"]
  },
  "art": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "艺术品正面展示，[产品类型：雕塑/绘画/综合材料]，[非遗技艺]，[艺术风格]，画廊级摄影",
    "subPrompt1": "同一艺术品细节特写",
    "subPrompt2": "同一艺术品侧面展示",
    "ichElements": ["非遗元素"],
    "features": ["艺术特点"],
    "colorPalette": ["配色方案"]
  },
  "gifts": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "礼品正面展示，[产品类型]，[非遗元素]，[礼盒包装]，[节日氛围]，精致礼品摄影",
    "subPrompt1": "同一礼品细节特写",
    "subPrompt2": "同一礼品包装展示",
    "ichElements": ["非遗元素"],
    "features": ["礼品特点"],
    "colorPalette": ["配色方案"]
  }
}

请严格按照以上要求输出JSON：`;

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
