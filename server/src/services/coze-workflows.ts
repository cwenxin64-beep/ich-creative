const COZE_WORKFLOW_API_URL = process.env.COZE_WORKFLOW_API_URL || 'https://api.coze.cn/v1/workflow/run';
const COZE_WORKFLOW_TOKEN = process.env.COZE_WORKFLOW_TOKEN || process.env.COZE_API_TOKEN || '';

export type CozeWorkflowResult = {
  output: string;
  raw: unknown;
};

type WorkflowData = {
  output?: unknown;
  data?: unknown;
  msg?: unknown;
};

type CozeWorkflowResponse = {
  code?: number;
  msg?: string;
  data?: unknown;
};

const TRANSIENT_RETRY_CODES = new Set([4024]);
const MAX_WORKFLOW_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isTransientWorkflowError(code?: number, msg = ''): boolean {
  const lowerMsg = msg.toLowerCase();
  return TRANSIENT_RETRY_CODES.has(Number(code))
    || lowerMsg.includes('rate-limited')
    || lowerMsg.includes('requestbursttoofast')
    || lowerMsg.includes('please retry after a brief interval');
}

export function getWorkflowId(envName: string, defaultWorkflowId: string): string {
  return process.env[envName] || defaultWorkflowId;
}

export function requireCozeWorkflowToken(): string {
  if (!COZE_WORKFLOW_TOKEN) {
    throw new Error('Coze 工作流 Token 未配置，请在后端环境变量中设置 COZE_WORKFLOW_TOKEN');
  }

  return COZE_WORKFLOW_TOKEN;
}

function parseWorkflowData(value: unknown): WorkflowData {
  if (typeof value === 'string') {
    return JSON.parse(value) as WorkflowData;
  }

  if (value && typeof value === 'object') {
    return value as WorkflowData;
  }

  throw new Error('Coze 工作流返回 data 格式错误');
}

function extractOutput(data: WorkflowData): string {
  const output = data.output ?? data.data ?? data.msg;

  if (typeof output !== 'string' || !output.trim()) {
    throw new Error('Coze 工作流没有返回 output');
  }

  return output.trim();
}

export async function runCozeWorkflow(
  workflowId: string,
  parameters: Record<string, unknown> = {}
): Promise<CozeWorkflowResult> {
  if (!workflowId) {
    throw new Error('Coze 工作流 ID 未配置');
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_WORKFLOW_ATTEMPTS; attempt += 1) {
    const response = await fetch(COZE_WORKFLOW_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requireCozeWorkflowToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: workflowId,
        parameters,
      }),
      signal: AbortSignal.timeout(240000),
    });

    const responseText = await response.text();

    if (!response.ok) {
      const shouldRetry = response.status === 429 && attempt < MAX_WORKFLOW_ATTEMPTS;
      lastError = new Error(`Coze 工作流请求失败：${response.status} ${responseText}`);
      if (shouldRetry) {
        await sleep(4000 * attempt);
        continue;
      }
      throw lastError;
    }

    const responseJson = JSON.parse(responseText) as CozeWorkflowResponse;

    if (responseJson.code !== 0) {
      const message = `Coze 工作流执行失败：${responseJson.code} ${responseJson.msg || ''}`.trim();
      const shouldRetry = isTransientWorkflowError(responseJson.code, responseJson.msg) && attempt < MAX_WORKFLOW_ATTEMPTS;
      lastError = new Error(message);
      if (shouldRetry) {
        console.warn(`[Coze] Transient workflow error, retrying ${attempt + 1}/${MAX_WORKFLOW_ATTEMPTS}: ${message}`);
        await sleep(4000 * attempt);
        continue;
      }
      throw lastError;
    }

    const data = parseWorkflowData(responseJson.data);

    return {
      output: extractOutput(data),
      raw: responseJson,
    };
  }

  throw lastError || new Error('Coze 工作流执行失败');
}

export async function uploadWorkflowInputImage(
  storage: {
    uploadFile: (params: { fileContent: Buffer; fileName: string; contentType: string }) => Promise<string>;
    generatePresignedUrl: (params: { key: string; expireTime: number }) => Promise<string>;
  },
  fileBuffer: Buffer,
  mimetype: string,
  taskId: string
): Promise<string> {
  const extension = mimetype.includes('png') ? 'png' : 'jpg';
  const fileName = `workflow_inputs/${taskId}_${Date.now()}.${extension}`;
  const key = await storage.uploadFile({
    fileContent: fileBuffer,
    fileName,
    contentType: mimetype,
  });

  return storage.generatePresignedUrl({
    key,
    expireTime: 3600,
  });
}
