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

    const analysisPrompt = `
You are an expert in intangible cultural heritage (ICH) and creative design.

Analyze the uploaded ${file.mimetype.startsWith('video') ? 'video' : 'image'} and extract ICH features.

User's creative description: "${description}"

Your task:
1. Identify the ICH elements in the uploaded media (crafts, patterns, colors, etc.)
2. Extract the emotional and cultural narrative
3. Generate a creative description in exactly 20 Chinese characters that includes:
   - Key creative keywords from the user's input
   - The artistic implication (寓意) of the work
   - The visual effect (效果) of the work
   Example: "青花瓷韵，古今交融，清新雅致" (Blue porcelain charm, fusion of ancient and modern, fresh and elegant)
4. **IMPORTANT**: Generate **three prompts for the SAME product from different angles**:
   - The product must be IDENTICAL in content, style, color scheme, and visual elements
   - Only the camera angle/viewpoint should differ:
     - mainPrompt: Front/full view (product showcase, complete scene)
     - subPrompt1: Close-up view (focused on specific details, same product)
     - subPrompt2: Side/alternative view (same product, different perspective)
   - Use EXACTLY the same ICH elements, colors, style, materials for all three images
   - The three images must look like photographs of the same physical object

Format your response as JSON:
{
  "creativeDescription": "exactly 20 Chinese characters including keywords, implication, and effect",
  "ichElements": ["element1", "element2"],
  "emotionalTone": "emotional description",
  "culturalNarrative": "cultural story",
  "mainPrompt": "detailed prompt for main image generation",
  "subPrompt1": "detailed prompt for sub image 1 generation (focus on details)",
  "subPrompt2": "detailed prompt for sub image 2 generation (alternative perspective)"
}
`;

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

    // Step 2: Generate 3 static images if requested (or as reference for video)
    const needsStaticImage = outputType === 'all' || outputType === 'static' || outputType === 'dynamic';
    if (needsStaticImage) {
      const imageClient = new ImageGenerationClient(config, customHeaders);

      // Generate 3 images with different prompts
      // The prompts are designed to generate the same product from different angles
      const [mainResponse, sub1Response, sub2Response] = await Promise.all([
        imageClient.generate({
          prompt: analysisData.mainPrompt,
          size: '2K',
          watermark: false,
        }),
        imageClient.generate({
          prompt: analysisData.subPrompt1,
          size: '2K',
          watermark: false,
        }),
        imageClient.generate({
          prompt: analysisData.subPrompt2,
          size: '2K',
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
