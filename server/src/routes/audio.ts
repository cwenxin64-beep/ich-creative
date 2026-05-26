import express, { type Request, type Response } from 'express';
import crypto from 'crypto';

const router = express.Router();

// 火山引擎音乐 API 配置
const VOLC_MUSIC_AK = process.env.VOLC_MUSIC_AK || '';
const VOLC_MUSIC_SK = process.env.VOLC_MUSIC_SK || '';
const VOLC_MUSIC_HOST = 'open.volcengineapi.com';
const VOLC_MUSIC_REGION = 'cn-beijing';
const VOLC_MUSIC_SERVICE = 'imagination';
const VOLC_MUSIC_VERSION = '2024-08-12';

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
  const query: Record<string, string> = {
    Action: action,
    Version: VOLC_MUSIC_VERSION,
  };

  const bodyStr = JSON.stringify(body);
  const { authorization, xDate } = signRequest('POST', query, bodyStr, new Date());

  const queryString = Object.keys(query).sort().map(key => {
    return `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`;
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
  console.log(`[Music] ${action} response headers:`, JSON.stringify(Object.fromEntries(response.headers.entries())));
  console.log(`[Music] ${action} response body:`, responseText.substring(0, 1000));

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
 * POST /api/v1/audio/generate
 * 使用火山引擎音乐 API (GenBGMForTime 后付费) 生成非遗风格纯音乐/BGM
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
        return res.json({
          success: true,
          audioUrl: songDetail.AudioUrl,
          captions: songDetail.Captions,
          duration: songDetail.Duration,
          genre: songDetail.Genre,
          mood: songDetail.Mood,
          taskId,
        });
      } else if (status === 3) {
        const failureReason = queryResult.Result?.FailureReason;
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

export default router;
