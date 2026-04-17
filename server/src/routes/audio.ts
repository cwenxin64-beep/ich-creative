import express, { type Request, type Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';

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
  console.log('[Image] Response keys:', Object.keys(data));
  console.log('[Image] Response:', JSON.stringify(data));
  
  // 递归查找所有可能的 URL
  const findAllUrls = (obj: any, path = ''): string[] => {
    const urls: string[] = [];
    if (typeof obj === 'string' && (obj.startsWith('http') || obj.startsWith('data:'))) {
      urls.push(`${path}: ${obj.substring(0, 200)}`);
    } else if (Array.isArray(obj)) {
      obj.forEach((item, i) => urls.push(...findAllUrls(item, `${path}[${i}]`)));
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, val]) => urls.push(...findAllUrls(val, `${path}.${key}`)));
    }
    return urls;
  };
  
  const allUrls = findAllUrls(data);
  console.log('[Image] All URLs found:', allUrls);
  
  // 尝试多种可能的返回格式
  let imageUrl = data.data?.[0]?.url 
    || data.data?.[0]?.b64_json
    || data.images?.[0]?.url 
    || data.images?.[0]?.image_url
    || data.url
    || data.result?.url;
    
  console.log('[Image] Extracted URL:', imageUrl ? imageUrl.substring(0, 100) : 'undefined');
  
  // 如果提取到的 URL 是内部代理 URL，尝试查找公开 URL
  if (imageUrl && imageUrl.includes('code.coze.cn')) {
    console.log('[Image] Found internal proxy URL, checking for public URL...');
    // 查找第一个非 coze.cn 的公开 URL
    const publicUrlEntry = allUrls.find(u => !u.includes('code.coze.cn') && u.includes('http'));
    if (publicUrlEntry) {
      const actualUrl = publicUrlEntry.split(': ')[1];
      if (actualUrl) {
        console.log('[Image] Using public URL:', actualUrl.substring(0, 100));
        imageUrl = actualUrl;
      }
    } else {
      // 如果找不到公开 URL，说明图片存储在沙箱内部，不可访问
      console.error('[Image] No public URL found, only internal proxy URL');
      throw new Error(`Image API only returned internal URL (code.coze.cn). All URLs: ${JSON.stringify(allUrls)}`);
    }
  }
  
  if (!imageUrl) {
    throw new Error(`Image API returned no URL. Response: ${JSON.stringify(data).substring(0, 500)}`);
  }
  
  return imageUrl;
}

// 火山引擎 ASR 极速版配置
const VOLC_ASR_API_KEY = process.env.VOLC_ASR_API_KEY || '';
const VOLC_ASR_APP_KEY = process.env.VOLC_ASR_APP_KEY || '';
const VOLC_ASR_RESOURCE_ID = 'volc.bigasr.auc_turbo';

/**
 * 火山引擎 ASR 极速版 API（一次请求返回结果）
 */
async function callASRFlash(buffer: Buffer): Promise<string> {
  const url = 'https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash';
  const taskId = crypto.randomUUID();
  
  const base64Audio = buffer.toString('base64');
  
  const body = {
    user: { uid: VOLC_ASR_APP_KEY },
    audio: { data: base64Audio },
    request: { model_name: 'bigmodel', enable_itn: true },
  };

  console.log('[ASR] Submitting request, taskId:', taskId);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': VOLC_ASR_API_KEY,
      'X-Api-Resource-Id': VOLC_ASR_RESOURCE_ID,
      'X-Api-Request-Id': taskId,
      'X-Api-Sequence': '-1',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  const statusCode = response.headers.get('X-Api-Status-Code');
  const message = response.headers.get('X-Api-Message');
  const logid = response.headers.get('X-Tt-Logid');
  
  console.log('[ASR] Response - statusCode:', statusCode, 'message:', message, 'logid:', logid);

  if (statusCode !== '20000000') {
    throw new Error(`ASR failed: ${statusCode} - ${message}`);
  }

  const data = await response.json();
  console.log('[ASR] Result:', JSON.stringify(data).substring(0, 500));
  
  return data.result?.text || '';
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

    // Step 1: Transcribe audio using ASR (极速版)
    let transcription = '';
    try {
      transcription = await callASRFlash(file.buffer);
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
