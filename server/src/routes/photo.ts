import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { LLMClient, Config, ImageGenerationClient, VideoGenerationClient, HeaderUtils } from 'coze-coding-dev-sdk';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/**
 * POST /api/v1/photo/generate
 * Generate creative ICH (Intangible Cultural Heritage) products from image/video
 * Body parameters:
 *   - file: Image or video file (multipart/form-data)
 *   - description: Creative description (string)
 *   - outputType: Output type - 'static' | 'dynamic' | 'all' (default: 'all')
 * Response:
 *   - staticImageUrl: URL of generated static image (only if outputType is 'static' or 'all')
 *   - videoUrl: URL of generated video (10-15 seconds, only if outputType is 'dynamic' or 'all')
 */
router.post('/generate', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const description = req.body.description || '';
    const outputType = req.body.outputType || 'all';

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    console.log(`Photo generation request: ${file.originalname}, description: ${description}`);

    // Extract headers for SDK
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();

    // Step 1: Analyze the uploaded image/video and extract ICH features using LLM
    const llmClient = new LLMClient(config, customHeaders);

    const base64Data = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64Data}`;

    const analysisPrompt = `你是一位非物质文化遗产创意设计专家。请根据用户上传的图片和需求，生成精准的设计方案。

## 用户需求
${description || '（用户未提供额外描述，请根据图片内容自动创作）'}

## 任务要求
1. **识别图片中的非遗元素**：工艺类型、纹样图案、色彩搭配、材质特征
2. **生成创意描述**：用20个汉字概括，包含：关键词+寓意+效果
3. **生成图像生成Prompt**：用于AI生图，必须具体、详细、可执行

## 生图Prompt要求（非常重要！）
- 三个Prompt必须是**同一个产品**的**三个不同角度**
- 必须保持：相同的产品外观、相同的风格、相同的配色、相同的材质
- 区别仅在于拍摄角度：
  - mainPrompt：正面全景图，展示完整产品
  - subPrompt1：细节特写图，聚焦核心工艺细节
  - subPrompt2：侧面/俯视图，展示立体结构

## 输出格式（JSON）
{
  "creativeDescription": "20字创意描述",
  "ichElements": ["非遗元素1", "非遗元素2"],
  "emotionalTone": "情感基调",
  "culturalNarrative": "文化内涵说明",
  "mainPrompt": "产品正面全景，[产品类型]，[非遗元素描述]，[色彩]，[材质]，[场景]，[光线]，高清产品摄影",
  "subPrompt1": "同一产品细节特写，[聚焦部位]，[工艺细节]，[纹理质感]，微距摄影",
  "subPrompt2": "同一产品侧面视角，[立体结构]，[整体轮廓]，[空间关系]，产品展示图"
}

请严格按照以上要求输出JSON：`;

    const analysisMessages = [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: analysisPrompt },
          { type: file.mimetype.startsWith('video') ? 'video_url' as const : 'image_url' as const,
            [file.mimetype.startsWith('video') ? 'video_url' : 'image_url']: {
              url: dataUri,
              fps: file.mimetype.startsWith('video') ? 1 : undefined,
              detail: 'high',
            }
          },
        ],
      },
    ];

    const analysisResponse = await llmClient.invoke(analysisMessages, {
      model: 'doubao-seed-1-6-vision-250815',
      temperature: 0.5,
    });

    // 安全解析 JSON，处理 LLM 可能返回的 markdown 代码块
    let analysisData;
    try {
      let content = analysisResponse.content.trim();
      // 移除 markdown 代码块标记
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();
      }
      analysisData = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('LLM response:', analysisResponse.content);
      return res.status(500).json({
        error: 'AI 响应格式错误，请重试',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      });
    }
    console.log('ICH Analysis:', JSON.stringify(analysisData, null, 2));

    let staticMainImageUrl: string | undefined;
    let staticSubImageUrl1: string | undefined;
    let staticSubImageUrl2: string | undefined;
    let videoUrl: string | undefined;

    // Step 2: Generate static images if requested
    const needsStaticImage = outputType === 'all' || outputType === 'static' || outputType === 'dynamic';
    if (needsStaticImage) {
      const imageClient = new ImageGenerationClient(config, customHeaders);

      if (outputType === 'static') {
        // 快速模式：只生成 1 张主图，避免超时
        console.log('Quick mode: generating single main image...');
        const mainResponse = await imageClient.generate({
          prompt: analysisData.mainPrompt,
          size: '1K',  // 使用更小尺寸加速生成
          watermark: false,
        });
        const mainHelper = imageClient.getResponseHelper(mainResponse);
        if (mainHelper.success && mainHelper.imageUrls.length > 0) {
          staticMainImageUrl = mainHelper.imageUrls[0];
        }
      } else {
        // 完整模式：生成 3 张图片（可能超时，但用户选择了 all/dynamic）
        console.log('Full mode: generating 3 images...');
        const [mainResponse, sub1Response, sub2Response] = await Promise.all([
          imageClient.generate({
            prompt: analysisData.mainPrompt,
            size: '1K',  // 使用更小尺寸加速生成
            watermark: false,
          }),
          imageClient.generate({
            prompt: analysisData.subPrompt1,
            size: '1K',
            watermark: false,
          }),
          imageClient.generate({
            prompt: analysisData.subPrompt2,
            size: '1K',
            watermark: false,
          }),
        ]);

        const mainHelper = imageClient.getResponseHelper(mainResponse);
        const sub1Helper = imageClient.getResponseHelper(sub1Response);
        const sub2Helper = imageClient.getResponseHelper(sub2Response);

        if (!mainHelper.success || mainHelper.imageUrls.length === 0) {
          throw new Error('Main image generation failed');
        }

        staticMainImageUrl = mainHelper.imageUrls[0];
        staticSubImageUrl1 = sub1Helper.success && sub1Helper.imageUrls.length > 0
          ? sub1Helper.imageUrls[0]
          : staticMainImageUrl;
        staticSubImageUrl2 = sub2Helper.success && sub2Helper.imageUrls.length > 0
          ? sub2Helper.imageUrls[0]
          : staticMainImageUrl;
      }
    }

    // Step 3: Generate dynamic video (10-15 seconds) if requested
    if (outputType === 'all' || outputType === 'dynamic') {
      if (!staticMainImageUrl) {
        throw new Error('Static image is required for video generation');
      }

      const videoClient = new VideoGenerationClient(config, customHeaders);

      const videoContent: any[] = [
        {
          type: 'text' as const,
          text: `Create a 10-15 second promotional video showcasing this ICH creative product.
          Focus on: ${analysisData.ichElements.join(', ')}.
          Emotional tone: ${analysisData.emotionalTone}.
          Cinematic camera movements, smooth transitions, modern yet traditional aesthetic.`,
        },
      ];

      // Optionally include the generated image as first frame
      if (staticMainImageUrl) {
        videoContent.unshift({
          type: 'image_url' as const,
          image_url: {
            url: staticMainImageUrl,
          },
          role: 'first_frame' as const,
        });
      }

      const videoResponse = await videoClient.videoGeneration(videoContent, {
        model: 'doubao-seedance-1-5-pro-251215',
        duration: -1, // Smart selection (4-12 seconds)
        resolution: '720p',
        ratio: '9:16', // Mobile-first vertical video
        generateAudio: true,
      });

      if (!videoResponse.videoUrl) {
        throw new Error('Video generation failed');
      }

      videoUrl = videoResponse.videoUrl;
    }

    console.log('Photo generation completed successfully');

    const responseData: any = {
      success: true,
      analysis: analysisData,
    };

    if (staticMainImageUrl && (outputType === 'all' || outputType === 'static')) {
      responseData.staticMainImageUrl = staticMainImageUrl;
      responseData.staticSubImageUrl1 = staticSubImageUrl1;
      responseData.staticSubImageUrl2 = staticSubImageUrl2;
    }

    if (videoUrl && (outputType === 'all' || outputType === 'dynamic')) {
      responseData.videoUrl = videoUrl;
      responseData.videoMainImageUrl = staticMainImageUrl;
      responseData.videoSubImageUrl1 = staticSubImageUrl1;
      responseData.videoSubImageUrl2 = staticSubImageUrl2;
    }

    res.json(responseData);
  } catch (error) {
    console.error('Photo generation error:', error);
    res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
