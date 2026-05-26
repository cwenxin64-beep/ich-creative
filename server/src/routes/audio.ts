import express, { type Request, type Response } from 'express';
import crypto from 'crypto';
import { S3Storage } from 'coze-coding-dev-sdk';
import { query } from '../storage/database/pg-client';

const router = express.Router();

// 火山引擎音乐 API 配置
const VOLC_MUSIC_AK = process.env.VOLC_MUSIC_AK || '';
const VOLC_MUSIC_SK = process.env.VOLC_MUSIC_SK || '';
const VOLC_MUSIC_HOST = 'open.volcengineapi.com';
const VOLC_MUSIC_REGION = 'cn-beijing';
const VOLC_MUSIC_SERVICE = 'imagination';
const VOLC_MUSIC_VERSION = '2024-08-12';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

/**
 * HMAC-SHA256 签名工具函数
 */
function hmacSHA256(key: Buffer | string, content: string): Buffer {
  return crypto.createHmac('sha256', key).update(content).digest();
}

function hashSHA256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * 生成火山引擎 API 签名
 */
function signRequest(
  method: string,
  query: Record<string, string>,
  body: string,
  date: Date
): { authorization: string; xDate: string } {
  const xDate = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const shortDate = xDate.substring(0, 8);

  // Step 1: CanonicalQueryString
  const sortedQuery = Object.keys(query).sort().map(key => {
    const encodedKey = encodeURIComponent(key);
    const encodedVal = encodeURIComponent(query[key]);
    return `${encodedKey}=${encodedVal}`;
  }).join('&');

  // Step 2: CanonicalHeaders
  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${VOLC_MUSIC_HOST}\n` +
    `x-content-sha256:${hashSHA256(body)}\n` +
    `x-date:${xDate}\n`;

  const signedHeaders = 'content-type;host;x-content-sha256;x-date';

  // Step 3: CanonicalRequest
  const hashedBody = hashSHA256(body);
  const canonicalRequest = [
    method,
    '/',
    sortedQuery,
    canonicalHeaders,
    signedHeaders,
    hashedBody,
  ].join('\n');

  // Step 4: StringToSign
  const credentialScope = `${shortDate}/${VOLC_MUSIC_REGION}/${VOLC_MUSIC_SERVICE}/request`;
  const stringToSign = [
    'HMAC-SHA256',
    xDate,
    credentialScope,
    hashSHA256(canonicalRequest),
  ].join('\n');

  // Step 5: Signing Key
  const kDate = hmacSHA256(VOLC_MUSIC_SK, shortDate);
  const kRegion = hmacSHA256(kDate, VOLC_MUSIC_REGION);
  const kService = hmacSHA256(kRegion, VOLC_MUSIC_SERVICE);
  const kSigning = hmacSHA256(kService, 'request');

  // Step 6: Signature
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  // Step 7: Authorization
  const authorization = `HMAC-SHA256 Credential=${VOLC_MUSIC_AK}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { authorization, xDate };
}

/**
 * 调用火山引擎音乐 API
 */
async function callMusicAPI(action: string, body: Record<string, any>) {
  const queryParams: Record<string, string> = {
    Action: action,
    Version: VOLC_MUSIC_VERSION,
  };

  const bodyStr = JSON.stringify(body);
  const { authorization, xDate } = signRequest('POST', queryParams, bodyStr, new Date());

  const queryString = Object.keys(queryParams).sort().map(key => {
    return `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`;
  }).join('&');

  const url = `https://${VOLC_MUSIC_HOST}/?${queryString}`;

  console.log(`[Music] Calling ${action}, URL: ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': VOLC_MUSIC_HOST,
      'X-Date': xDate,
      'X-Content-Sha256': hashSHA256(bodyStr),
      'Authorization': authorization,
    },
    body: bodyStr,
    signal: AbortSignal.timeout(60000),
  });

  const responseText = await response.text();
  console.log(`[Music] ${action} HTTP status: ${response.status}`);
  console.log(`[Music] ${action} response body: ${responseText.substring(0, 1000)}`);

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Music API returned non-JSON: ${responseText.substring(0, 200)}`);
  }

  if (data.Code !== undefined && data.Code !== 0) {
    const errDetail = `Code=${data.Code}, Message=${data.Message}, RequestId=${data.ResponseMetadata?.RequestId || 'N/A'}`;
    console.error(`[Music] ${action} error detail: ${errDetail}`);
    console.error(`[Music] Using AK: ${VOLC_MUSIC_AK ? VOLC_MUSIC_AK.substring(0, 8) + '...' : 'EMPTY'}`);
    throw new Error(`Music API error: ${data.Code} - ${data.Message}`);
  }

  return data;
}

/**
 * 将火山引擎 CDN 音频转存到对象存储
 * 返回对象存储 key 和签名 URL
 */
async function storeAudioToObjectStorage(cdnUrl: string, taskId: string): Promise<{ key: string; url: string }> {
  console.log(`[Music] Uploading audio to object storage from CDN URL...`);

  // 使用 uploadFromUrl 从 CDN 下载并上传到对象存储
  const fileKey = await storage.uploadFromUrl({
    url: cdnUrl,
    timeout: 120000, // 2 分钟超时，音频文件可能较大
  });

  console.log(`[Music] Audio uploaded to object storage, key: ${fileKey}`);

  // 生成签名 URL（有效期 7 天）
  const signedUrl = await storage.generatePresignedUrl({
    key: fileKey,
    expireTime: 7 * 24 * 3600,
  });

  console.log(`[Music] Generated signed URL (7 days): ${signedUrl.substring(0, 80)}...`);

  return { key: fileKey, url: signedUrl };
}

/**
 * POST /api/v1/audio/generate
 * 使用火山引擎音乐 API (GenBGMForTime 后付费) 生成非遗风格纯音乐/BGM
 * 生成成功后将音频转存到对象存储，并记录到数据库
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    // 检查环境变量
    if (!VOLC_MUSIC_AK || !VOLC_MUSIC_SK) {
      console.error('[Music] Missing VOLC_MUSIC_AK or VOLC_MUSIC_SK env vars');
      return res.status(500).json({
        error: '音乐服务未配置',
        message: '请在环境变量中设置 VOLC_MUSIC_AK 和 VOLC_MUSIC_SK',
      });
    }

    const { prompt, duration } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: '请输入音乐描述' });
    }

    console.log(`[Music] Generate request - prompt: ${prompt}, duration: ${duration}`);

    // GenBGMForTime v5.0: 只需 Text 描述，无需单独传 Genre/Mood/Instrument
    const requestBody: Record<string, any> = {
      Text: prompt,
      Duration: duration || 60,
      Version: 'v5.0',
      EnableInputRewrite: true,
    };

    // 后付费接口 Action=GenBGMForTime
    const submitResult = await callMusicAPI('GenBGMForTime', requestBody);

    const taskId = submitResult.Result?.TaskID;
    if (!taskId) {
      throw new Error('Failed to create music task: ' + JSON.stringify(submitResult));
    }

    console.log(`[Music] Task created: ${taskId}, predicted wait: ${submitResult.Result?.PredictedWaitTime}s`);

    // 轮询查询任务状态
    const maxPolls = 60;
    const pollInterval = 5000;

    for (let i = 0; i < maxPolls; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const queryResult = await callMusicAPI('QuerySong', { TaskID: taskId });
      const status = queryResult.Result?.Status;

      console.log(`[Music] Task ${taskId} status: ${status}, progress: ${queryResult.Result?.Progress}%`);

      // Status: 0=等待中, 1=处理中, 2=成功, 3=失败
      if (status === 2) {
        const songDetail = queryResult.Result?.SongDetail || {};
        const cdnAudioUrl = songDetail.AudioUrl;

        // 将音频转存到对象存储
        let audioUrl = cdnAudioUrl;
        let storageKey = '';
        try {
          if (cdnAudioUrl) {
            const storeResult = await storeAudioToObjectStorage(cdnAudioUrl, taskId);
            audioUrl = storeResult.url;
            storageKey = storeResult.key;
          }
        } catch (storeError) {
          console.error('[Music] Failed to store audio to object storage, falling back to CDN URL:', storeError);
          // 转存失败时回退到 CDN URL（仍可通过 proxy 接口播放）
        }

        // 存储生成记录到数据库
        let dbId: number | null = null;
        try {
          const insertResult = await query(
            `INSERT INTO music_generations (task_id, prompt, duration, genre, mood, captions, audio_url, storage_key, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [taskId, prompt, songDetail.Duration || duration, songDetail.Genre, songDetail.Mood, songDetail.Captions, audioUrl, storageKey, 'completed']
          );
          dbId = insertResult.rows[0]?.id || null;
          console.log(`[Music] Saved to database, id: ${dbId}`);
        } catch (dbError) {
          console.error('[Music] Failed to save to database (non-fatal):', dbError);
        }

        return res.json({
          success: true,
          id: dbId,
          audioUrl,
          captions: songDetail.Captions,
          duration: songDetail.Duration,
          genre: songDetail.Genre,
          mood: songDetail.Mood,
          taskId,
          storageKey,
        });
      } else if (status === 3) {
        const failureReason = queryResult.Result?.FailureReason;

        // 记录失败到数据库
        try {
          await query(
            `INSERT INTO music_generations (task_id, prompt, duration, status, error_message)
             VALUES ($1, $2, $3, $4, $5)`,
            [taskId, prompt, duration, 'failed', failureReason?.Msg || '未知原因']
          );
        } catch (dbError) {
          console.error('[Music] Failed to save failure record (non-fatal):', dbError);
        }

        return res.status(500).json({
          error: '音乐生成失败',
          message: failureReason?.Msg || '未知原因',
          code: failureReason?.Code,
        });
      }

      // 继续轮询
    }

    return res.status(500).json({ error: '音乐生成超时，请重试' });

  } catch (error) {
    console.error('[Music] Generation error:', error);
    res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    });
  }
});

/**
 * GET /api/v1/audio/file/:id
 * 获取音乐生成记录的签名 URL（用于播放）
 * 签名 URL 过期后可重新获取
 */
router.get('/file/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM music_generations WHERE id = $1',
      [parseInt(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '音乐记录不存在' });
    }

    const record = result.rows[0];

    // 如果有 storage_key，生成新的签名 URL
    if (record.storage_key) {
      const signedUrl = await storage.generatePresignedUrl({
        key: record.storage_key,
        expireTime: 7 * 24 * 3600,
      });
      return res.json({
        success: true,
        audioUrl: signedUrl,
        genre: record.genre,
        mood: record.mood,
        duration: record.duration,
        captions: record.captions,
      });
    }

    // 没有 storage_key，返回原始 URL
    return res.json({
      success: true,
      audioUrl: record.audio_url,
      genre: record.genre,
      mood: record.mood,
      duration: record.duration,
      captions: record.captions,
    });
  } catch (error) {
    console.error('[Music] Get file error:', error);
    res.status(500).json({ error: '获取音乐记录失败' });
  }
});

/**
 * GET /api/v1/audio/proxy
 * 音频代理接口 - 备用方案，当对象存储转存失败时使用
 */
router.get('/proxy', async (req: Request, res: Response) => {
  try {
    const audioUrl = req.query.url as string;
    if (!audioUrl) {
      return res.status(400).json({ error: '缺少音频 URL' });
    }

    console.log(`[Music] Proxying audio: ${audioUrl.substring(0, 80)}...`);

    const response = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': '*/*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      console.error(`[Music] Proxy fetch failed: ${response.status}`);
      return res.status(response.status).json({ error: `音频下载失败: ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // 流式传输，避免大文件占满内存
    if (response.body) {
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    res.end();

  } catch (error) {
    console.error('[Music] Proxy error:', error);
    res.status(500).json({ error: '音频代理失败' });
  }
});

/**
 * GET /api/v1/audio/test
 * 诊断接口 - 测试火山引擎音乐 API 连通性
 */
router.get('/test', async (_req: Request, res: Response) => {
  const result: Record<string, any> = {
    ak: VOLC_MUSIC_AK ? `${VOLC_MUSIC_AK.substring(0, 8)}...` : 'NOT SET',
    sk: VOLC_MUSIC_SK ? `${VOLC_MUSIC_SK.substring(0, 4)}...` : 'NOT SET',
    host: VOLC_MUSIC_HOST,
    region: VOLC_MUSIC_REGION,
    service: VOLC_MUSIC_SERVICE,
  };

  if (!VOLC_MUSIC_AK || !VOLC_MUSIC_SK) {
    return res.json({ ...result, error: 'AK/SK 未配置' });
  }

  try {
    // 用最简单的参数测试 GenBGMForTime
    const testBody = {
      Text: '测试纯音乐',
      Duration: 30,
      Version: 'v5.0',
    };
    const response = await callMusicAPI('GenBGMForTime', testBody);
    result.apiResponse = response;
    result.status = response.Code === 0 ? 'SUCCESS' : 'FAILED';
    if (response.Code !== 0) {
      result.errorCode = response.Code;
      result.errorMessage = response.Message;
    }
  } catch (error) {
    result.status = 'ERROR';
    result.error = error instanceof Error ? error.message : String(error);
  }

  res.json(result);
});

export default router;
