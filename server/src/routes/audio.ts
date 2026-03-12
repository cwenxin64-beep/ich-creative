import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { LLMClient, Config, ImageGenerationClient, ASRClient, HeaderUtils } from 'coze-coding-dev-sdk';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/**
 * POST /api/v1/audio/generate
 * Generate creative ICH products from audio input
 * Body parameters:
 *   - file: Audio file (multipart/form-data)
 *   - keywords: Creative keywords (string)
 * Response:
 *   - imageUrl: URL of generated product image
 *   - transcription: Recognized text from audio
 *   - emotion: Detected emotion from audio
 */
router.post('/generate', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const keywords = req.body.keywords || '';

    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log(`Audio generation request: ${file.originalname}, keywords: ${keywords}`);

    // Extract headers for SDK
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();

    // Step 1: Transcribe audio using ASR
    const asrClient = new ASRClient(config, customHeaders);

    const base64Audio = file.buffer.toString('base64');

    const transcriptionResult = await asrClient.recognize({
      uid: 'user-audio-gen',
      base64Data: base64Audio,
    });

    const transcription = transcriptionResult.text;
    console.log('Transcription:', transcription);

    // Step 2: Analyze emotion and generate creative design using LLM
    const llmClient = new LLMClient(config, customHeaders);

    const designPrompt = `
You are an expert in intangible cultural heritage (ICH) and emotional design.

Analyze this audio content and extract the emotional tone and creative direction.

Transcription: "${transcription}"
User's creative keywords: "${keywords}"

Your task:
1. Identify the emotional tone from the audio (e.g., joyful, nostalgic, solemn, energetic)
2. Extract key ICH elements mentioned or implied
3. Create a compelling narrative that connects the emotion with ICH culture
4. Generate **three different prompts** for creating ICH creative products:
   - mainPrompt: Main product image (complete view, full scene)
   - subPrompt1: Sub image 1 (focused on specific details or close-up)
   - subPrompt2: Sub image 2 (alternative angle or artistic variation)

Format your response as JSON:
{
  "emotion": "primary emotion",
  "emotionIntensity": "high/medium/low",
  "ichElements": ["element1", "element2"],
  "narrative": "emotional story connecting ICH and modern life",
  "mainPrompt": "detailed prompt for main image generation",
  "subPrompt1": "detailed prompt for sub image 1 generation (focus on details)",
  "subPrompt2": "detailed prompt for sub image 2 generation (alternative perspective)"
}
`;

    const analysisResponse = await llmClient.invoke([
      { role: 'user' as const, content: designPrompt }
    ], {
      model: 'doubao-seed-1-6-251015',
      temperature: 0.8,
    });

    const analysisData = JSON.parse(analysisResponse.content);
    console.log('Emotion Analysis:', JSON.stringify(analysisData, null, 2));

    // Step 3: Generate 3 creative product images
    const imageClient = new ImageGenerationClient(config, customHeaders);

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

    const mainImageUrl = mainHelper.imageUrls[0];
    const subImageUrl1 = sub1Helper.success && sub1Helper.imageUrls.length > 0
      ? sub1Helper.imageUrls[0]
      : mainImageUrl;
    const subImageUrl2 = sub2Helper.success && sub2Helper.imageUrls.length > 0
      ? sub2Helper.imageUrls[0]
      : mainImageUrl;

    console.log('Audio generation completed successfully');

    res.json({
      success: true,
      mainImageUrl,
      subImageUrl1,
      subImageUrl2,
      transcription,
      analysis: analysisData,
    });
  } catch (error) {
    console.error('Audio generation error:', error);
    res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
