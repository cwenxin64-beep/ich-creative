import { createHash, createHmac } from 'crypto';
import { S3Storage } from 'coze-coding-dev-sdk';

function getEnv(name: string): string {
  return (process.env[name] || '').trim();
}

type UploadFileParams = {
  fileContent: Buffer;
  fileName: string;
  contentType: string;
};

type GeneratePresignedUrlParams = {
  key: string;
  expireTime: number;
};

type UploadFromUrlParams = {
  url: string;
  timeout?: number;
  fileName?: string;
  contentType?: string;
};

function buildTencentCosEndpoint(bucketName: string, region: string): string {
  return `https://${bucketName}.cos.${region}.myqcloud.com`;
}

function formatAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function encodePathPart(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeObjectKey(key: string): string {
  return key.split('/').map(encodePathPart).join('/');
}

function encodeQueryValue(value: string): string {
  return encodePathPart(value);
}

function getSigningKey(secretKey: string, dateStamp: string, region: string): Buffer {
  const dateKey = hmac(`AWS4${secretKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

class TencentCosStorage {
  private endpointUrl: string;
  private accessKey: string;
  private secretKey: string;
  private bucketName: string;
  private region: string;
  private sessionToken: string;

  constructor(params: {
    endpointUrl: string;
    accessKey: string;
    secretKey: string;
    bucketName: string;
    region: string;
    sessionToken: string;
  }) {
    this.endpointUrl = params.endpointUrl.replace(/\/+$/, '');
    this.accessKey = params.accessKey;
    this.secretKey = params.secretKey;
    this.bucketName = params.bucketName;
    this.region = params.region;
    this.sessionToken = params.sessionToken;
  }

  async uploadFromUrl(params: UploadFromUrlParams): Promise<string> {
    const response = await fetch(params.url, {
      signal: AbortSignal.timeout(params.timeout || 120000),
    });

    if (!response.ok) {
      throw new Error(`下载待转存文件失败：${response.status}`);
    }

    const fileContent = Buffer.from(await response.arrayBuffer());
    const fileName =
      params.fileName ||
      `stored_files/${Date.now()}_${Math.random().toString(36).substring(2)}${this.getExtensionFromUrl(params.url)}`;
    const contentType = params.contentType || response.headers.get('content-type') || 'application/octet-stream';

    return this.uploadFile({
      fileContent,
      fileName,
      contentType,
    });
  }

  async uploadFile(params: UploadFileParams): Promise<string> {
    if (!this.endpointUrl || !this.bucketName || !this.accessKey || !this.secretKey) {
      throw new Error('对象存储未配置完整，请设置 S3_BUCKET、S3_REGION、S3_ACCESS_KEY_ID、S3_SECRET_ACCESS_KEY');
    }

    const key = params.fileName.replace(/^\/+/, '');
    const now = new Date();
    const amzDate = formatAmzDate(now);
    const dateStamp = amzDate.substring(0, 8);
    const payloadHash = sha256(params.fileContent);
    const url = new URL(`${this.endpointUrl}/${encodeObjectKey(key)}`);

    const headers: Record<string, string> = {
      'content-type': params.contentType,
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };

    if (this.sessionToken) {
      headers['x-amz-security-token'] = this.sessionToken;
    }

    headers.authorization = this.createAuthorization('PUT', key, '', headers, payloadHash, dateStamp, amzDate);

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: params.fileContent,
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`对象存储上传失败：${response.status} ${responseText}`.trim());
    }

    return key;
  }

  async generatePresignedUrl(params: GeneratePresignedUrlParams): Promise<string> {
    if (!this.endpointUrl || !this.bucketName || !this.accessKey || !this.secretKey) {
      throw new Error('对象存储未配置完整，请设置 S3_BUCKET、S3_REGION、S3_ACCESS_KEY_ID、S3_SECRET_ACCESS_KEY');
    }

    const key = params.key.replace(/^\/+/, '');
    const now = new Date();
    const amzDate = formatAmzDate(now);
    const dateStamp = amzDate.substring(0, 8);
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const signedHeaders = 'host';
    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.accessKey}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(params.expireTime),
      'X-Amz-SignedHeaders': signedHeaders,
    };

    if (this.sessionToken) {
      queryParams['X-Amz-Security-Token'] = this.sessionToken;
    }

    const url = new URL(`${this.endpointUrl}/${encodeObjectKey(key)}`);
    const canonicalQuery = this.createCanonicalQuery(queryParams);
    const canonicalRequest = [
      'GET',
      `/${encodeObjectKey(key)}`,
      canonicalQuery,
      `host:${url.host}\n`,
      signedHeaders,
      'UNSIGNED-PAYLOAD',
    ].join('\n');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256(canonicalRequest),
    ].join('\n');
    const signature = createHmac('sha256', getSigningKey(this.secretKey, dateStamp, this.region))
      .update(stringToSign)
      .digest('hex');

    return `${url.toString()}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  }

  private createAuthorization(
    method: string,
    key: string,
    canonicalQuery: string,
    headers: Record<string, string>,
    payloadHash: string,
    dateStamp: string,
    amzDate: string
  ): string {
    const signedHeaders = Object.keys(headers)
      .filter((name) => name !== 'authorization')
      .map((name) => name.toLowerCase())
      .sort();
    const canonicalHeaders = signedHeaders.map((name) => `${name}:${headers[name].trim()}\n`).join('');
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const canonicalRequest = [
      method,
      `/${encodeObjectKey(key)}`,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders.join(';'),
      payloadHash,
    ].join('\n');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256(canonicalRequest),
    ].join('\n');
    const signature = createHmac('sha256', getSigningKey(this.secretKey, dateStamp, this.region))
      .update(stringToSign)
      .digest('hex');

    return `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`;
  }

  private createCanonicalQuery(params: Record<string, string>): string {
    return Object.keys(params)
      .sort()
      .map((key) => `${encodeQueryValue(key)}=${encodeQueryValue(params[key])}`)
      .join('&');
  }

  private getExtensionFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.[a-zA-Z0-9]{1,8}$/);
      return match ? match[0] : '';
    } catch {
      return '';
    }
  }
}

export function createObjectStorage() {
  const bucketName = getEnv('COZE_BUCKET_NAME') || getEnv('S3_BUCKET') || getEnv('S3_BUCKET_NAME');
  const region = getEnv('COZE_BUCKET_REGION') || getEnv('S3_REGION') || 'cn-beijing';
  const accessKey = getEnv('COZE_BUCKET_ACCESS_KEY_ID') || getEnv('S3_ACCESS_KEY_ID') || getEnv('AWS_ACCESS_KEY_ID');
  const secretKey =
    getEnv('COZE_BUCKET_SECRET_ACCESS_KEY') ||
    getEnv('S3_SECRET_ACCESS_KEY') ||
    getEnv('AWS_SECRET_ACCESS_KEY');
  const endpointUrl =
    getEnv('COZE_BUCKET_ENDPOINT_URL') ||
    getEnv('S3_ENDPOINT_URL') ||
    getEnv('S3_ENDPOINT') ||
    (bucketName ? buildTencentCosEndpoint(bucketName, region) : '');

  if (accessKey && secretKey) {
    return new TencentCosStorage({
      endpointUrl,
      accessKey,
      secretKey,
      bucketName,
      region,
      sessionToken: getEnv('S3_SESSION_TOKEN') || getEnv('AWS_SESSION_TOKEN'),
    });
  }

  return new S3Storage({
    endpointUrl,
    accessKey,
    secretKey,
    bucketName,
    region,
  });
}
