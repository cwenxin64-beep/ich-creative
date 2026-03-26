import express, { type Request, type Response } from 'express';
import multer from 'multer';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// 火山引擎 API 配置
const VOLCENGINE_API_KEY = process.env.COZE_API_KEY || process.env.VOLCENGINE_API_KEY || '';
const VOLCENGINE_BASE_URL = process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

// 模型 ID 配置（使用推理接入点 ID）
const TEXT_MODEL = process.env.VOLCENGINE_TEXT_MODEL || 'ep-20260326185613-8d6lx';
const IMAGE_MODEL = process.env.VOLCENGINE_IMAGE_MODEL || 'ep-20260326185459-8rt74';

/**
 * 直接调用火山引擎 LLM API
 */
async function callVolcengineLLM(messages: any[], model: string = TEXT_MODEL): Promise<string> {
  const url = `${VOLCENGINE_BASE_URL}/chat/completions`;
  
  const body = {
    model,
    messages,
    temperature: 0.5,
    max_tokens: 2000,
  };

  console.log('[LLM] Calling:', url, 'Model:', model);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOLCENGINE_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 直接调用火山引擎图片生成 API
 */
async function callVolcengineImage(prompt: string): Promise<string> {
  const url = `${VOLCENGINE_BASE_URL}/images/generations`;
  
  const body = {
    model: IMAGE_MODEL,
    prompt,
  };

  console.log('[Image] Calling:', url, 'Model:', IMAGE_MODEL);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOLCENGINE_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Image] Error Response:', errorText);
    throw new Error(`Image API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data?.[0]?.url || data.data?.[0]?.b64_json || data.images?.[0]?.url || data.images?.[0]?.image_url;
}

/**
 * 直接调用火山引擎 ASR API（语音识别）
 */
async function callVolcengineASR(base64Audio: string): Promise<string> {
  const url = `${VOLCENGINE_BASE_URL}/audio/transcriptions`;
  
  const body = {
    model: 'doubao-asr',
    audio: base64Audio,
  };

  console.log('[ASR] Calling:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOLCENGINE_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ASR API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.text || '';
}

/**
 * POST /api/v1/audio/generate
 * Generate creative ICH products from audio input
 */
router.post('/generate', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const keywords = req.body.keywords || '';

    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    console.log(`Audio generation request: ${file.originalname}, keywords: ${keywords}`);

    // Step 1: Transcribe audio using ASR
    const base64Audio = file.buffer.toString('base64');
    
    let transcription = '';
    try {
      transcription = await callVolcengineASR(base64Audio);
      console.log('Transcription:', transcription);
    } catch (error: any) {
      console.error('ASR failed, using fallback:', error.message);
      transcription = '语音识别失败，请重试';
    }

    // Step 2: Analyze emotion and generate creative design using LLM
    const designPrompt = `你是一位非物质文化遗产创意设计专家。请根据语音内容和用户关键词，生成精准的设计方案。

## 语音转写内容
"${transcription}"

## 用户关键词
"${keywords || '（未提供）'}"

## 任务要求
1. **情感分析**：识别语音中的情感基调
2. **提取非遗元素**：根据内容提取相关的非遗元素
3. **生成创意描述**：用20个汉字概括
4. **生成图像生成Prompt**：用于AI生图

## 输出格式（JSON）
{
  "emotion": "主要情感",
  "ichElements": ["非遗元素"],
  "mainPrompt": "产品正面全景描述",
  "subPrompt1": "细节特写描述",
  "subPrompt2": "侧面视角描述"
}

请严格按照以上要求输出JSON：`;

    const llmResponse = await callVolcengineLLM([
      { role: 'user', content: designPrompt }
    ]);

    // 解析 JSON
    let analysisData;
    try {
      let content = llmResponse.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();
      }
      analysisData = JSON.parse(content);
    } catch {
      analysisData = {
        emotion: '温暖',
        ichElements: ['传统工艺'],
        mainPrompt: '非遗创意产品，传统工艺，高清产品摄影',
        subPrompt1: '同一产品细节特写',
        subPrompt2: '同一产品侧面视角',
      };
    }

    // Step 3: Generate images
    const [mainImageUrl, subImageUrl1, subImageUrl2] = await Promise.all([
      callVolcengineImage(analysisData.mainPrompt),
      callVolcengineImage(analysisData.subPrompt1),
      callVolcengineImage(analysisData.subPrompt2),
    ]);

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
