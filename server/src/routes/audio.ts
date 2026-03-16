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
    const config = new Config({ timeout: 120000 });

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

    const designPrompt = `你是一位非物质文化遗产创意设计专家。请根据语音内容和用户关键词，生成精准的设计方案。

## 语音转写内容
"${transcription}"

## 用户关键词
"${keywords || '（未提供）'}"

## 任务要求
1. **情感分析**：识别语音中的情感基调（喜悦、怀旧、庄重、活力等）
2. **提取非遗元素**：根据语音内容提取相关的非遗元素
3. **生成创意描述**：用20个汉字概括，包含：关键词+寓意+效果
4. **生成图像生成Prompt**：用于AI生图，必须具体、详细、可执行

## 生图Prompt要求（非常重要！）
- 三个Prompt必须是**同一个产品**的**三个不同角度**
- 必须保持：相同的产品外观、相同的风格、相同的配色、相同的材质
- 区别仅在于拍摄角度：
  - mainPrompt：正面全景图，展示完整产品
  - subPrompt1：细节特写图，聚焦核心工艺细节
  - subPrompt2：侧面/俯视图，展示立体结构

## 输出格式（JSON）
{
  "emotion": "主要情感",
  "emotionIntensity": "high/medium/low",
  "ichElements": ["非遗元素1", "非遗元素2"],
  "narrative": "情感故事，连接非遗与现代生活",
  "mainPrompt": "产品正面全景，[产品类型]，[非遗元素描述]，[色彩]，[材质]，[场景]，[光线]，高清产品摄影",
  "subPrompt1": "同一产品细节特写，[聚焦部位]，[工艺细节]，[纹理质感]，微距摄影",
  "subPrompt2": "同一产品侧面视角，[立体结构]，[整体轮廓]，[空间关系]，产品展示图"
}

请严格按照以上要求输出JSON：`;

    const analysisResponse = await llmClient.invoke([
      { role: 'user' as const, content: designPrompt }
    ], {
      model: 'doubao-seed-1-6-251015',
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
