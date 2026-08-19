import { S3Storage } from 'coze-coding-dev-sdk';

function getEnv(name: string): string {
  return (process.env[name] || '').trim();
}

function buildTencentCosEndpoint(bucketName: string, region: string): string {
  return `https://${bucketName}.cos.${region}.myqcloud.com`;
}

export function createObjectStorage() {
  const bucketName = getEnv('COZE_BUCKET_NAME') || getEnv('S3_BUCKET') || getEnv('S3_BUCKET_NAME');
  const region = getEnv('COZE_BUCKET_REGION') || getEnv('S3_REGION') || 'cn-beijing';
  const endpointUrl =
    getEnv('COZE_BUCKET_ENDPOINT_URL') ||
    getEnv('S3_ENDPOINT_URL') ||
    getEnv('S3_ENDPOINT') ||
    (bucketName ? buildTencentCosEndpoint(bucketName, region) : '');

  return new S3Storage({
    endpointUrl,
    accessKey: getEnv('COZE_BUCKET_ACCESS_KEY_ID') || getEnv('S3_ACCESS_KEY_ID') || getEnv('AWS_ACCESS_KEY_ID'),
    secretKey:
      getEnv('COZE_BUCKET_SECRET_ACCESS_KEY') ||
      getEnv('S3_SECRET_ACCESS_KEY') ||
      getEnv('AWS_SECRET_ACCESS_KEY'),
    bucketName,
    region,
  });
}
