const FEISHU_API_BASE_URL = process.env.FEISHU_API_BASE_URL || 'https://open.feishu.cn/open-apis';
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BITABLE_APP_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN || '';
const FEISHU_BITABLE_PRODUCT_TABLE_ID = process.env.FEISHU_BITABLE_PRODUCT_TABLE_ID || '';

type FeishuResponse<T> = {
  code?: number;
  msg?: string;
  data?: T;
};

type FeishuRecord = {
  record_id: string;
  fields: Record<string, unknown>;
};

export type FeishuHeritageContext = {
  tableName: string;
  tableId: string;
  recordId: string;
  heritageName: string;
  fields: Record<string, string>;
  promptContext: string;
};

let accessToken = '';
let accessTokenExpiresAt = 0;
const recordCache = new Map<string, { expiresAt: number; items: FeishuRecord[] }>();

function requireConfiguration() {
  const missing = [
    ['FEISHU_APP_ID', FEISHU_APP_ID],
    ['FEISHU_APP_SECRET', FEISHU_APP_SECRET],
    ['FEISHU_BITABLE_APP_TOKEN', FEISHU_BITABLE_APP_TOKEN],
    ['FEISHU_BITABLE_PRODUCT_TABLE_ID', FEISHU_BITABLE_PRODUCT_TABLE_ID],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(`飞书多维表格配置缺失：${missing.join('、')}`);
  }
}

async function parseJsonResponse<T>(response: Response, action: string): Promise<T> {
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`${action}失败：HTTP ${response.status} ${responseText}`);
  }

  let payload: FeishuResponse<T>;
  try {
    payload = JSON.parse(responseText) as FeishuResponse<T>;
  } catch {
    throw new Error(`${action}失败：飞书返回了非 JSON 数据`);
  }

  if (payload.code !== 0) {
    throw new Error(`${action}失败：${payload.code} ${payload.msg || ''}`.trim());
  }

  if (!payload.data) {
    throw new Error(`${action}失败：飞书没有返回 data`);
  }

  return payload.data;
}

async function getAccessToken(): Promise<string> {
  requireConfiguration();
  if (accessToken && Date.now() < accessTokenExpiresAt) {
    return accessToken;
  }

  const response = await fetch(`${FEISHU_API_BASE_URL}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: FEISHU_APP_SECRET }),
    signal: AbortSignal.timeout(30000),
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`获取飞书访问凭证失败：HTTP ${response.status} ${responseText}`);
  }

  const payload = JSON.parse(responseText) as {
    code?: number;
    msg?: string;
    tenant_access_token?: string;
    expire?: number;
  };
  if (payload.code !== 0 || !payload.tenant_access_token) {
    throw new Error(`获取飞书访问凭证失败：${payload.code} ${payload.msg || ''}`.trim());
  }

  accessToken = payload.tenant_access_token;
  const expiresInSeconds = Math.max(60, Number(payload.expire || 7200) - 300);
  accessTokenExpiresAt = Date.now() + expiresInSeconds * 1000;
  return accessToken;
}

async function feishuGet<T>(path: string, action: string): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${FEISHU_API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30000),
  });
  return parseJsonResponse<T>(response, action);
}

async function listRecords(tableId: string): Promise<FeishuRecord[]> {
  const cached = recordCache.get(tableId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.items;
  }

  const items: FeishuRecord[] = [];
  let pageToken = '';
  do {
    const query = new URLSearchParams({ page_size: '500' });
    if (pageToken) query.set('page_token', pageToken);
    const data = await feishuGet<{
      items?: FeishuRecord[];
      has_more?: boolean;
      page_token?: string;
    }>(`/bitable/v1/apps/${encodeURIComponent(FEISHU_BITABLE_APP_TOKEN)}/tables/${encodeURIComponent(tableId)}/records?${query}`, '读取飞书非遗记录');
    items.push(...(data.items || []));
    pageToken = data.has_more ? (data.page_token || '') : '';
  } while (pageToken);

  recordCache.set(tableId, { items, expiresAt: Date.now() + 5 * 60 * 1000 });
  return items;
}

function fieldToText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value.map(fieldToText).filter(Boolean).join('、');
  }
  if (typeof value === 'object') {
    const item = value as Record<string, unknown>;
    for (const key of ['text', 'name', 'value']) {
      const text = fieldToText(item[key]);
      if (text) return text;
    }
  }
  return '';
}

function normalizeName(value: unknown): string {
  return fieldToText(value).replace(/\s+/g, '').trim();
}

export async function getFeishuHeritageContext(
  heritageName: string
): Promise<FeishuHeritageContext> {
  const cleanHeritageName = heritageName.trim();
  if (!cleanHeritageName) {
    throw new Error('非遗名称不能为空');
  }

  requireConfiguration();
  const tableName = '产品';
  const records = await listRecords(FEISHU_BITABLE_PRODUCT_TABLE_ID);
  const targetName = normalizeName(cleanHeritageName);
  const record = records.find(item => normalizeName(item.fields?.['非遗名称']) === targetName);
  if (!record) {
    throw new Error(`飞书“${tableName}”表中没有找到非遗名称“${cleanHeritageName}”`);
  }

  const fields: Record<string, string> = {};
  for (const [name, value] of Object.entries(record.fields || {})) {
    if (/图片|附件|url|父记录/i.test(name)) continue;
    const text = fieldToText(value);
    if (text) fields[name] = text;
  }

  const promptContext = Object.entries(fields)
    .map(([name, value]) => `${name}：${value}`)
    .join('\n');
  if (!promptContext) {
    throw new Error(`飞书记录“${cleanHeritageName}”没有可用于生成的文字字段`);
  }

  return {
    tableName,
    tableId: FEISHU_BITABLE_PRODUCT_TABLE_ID,
    recordId: record.record_id,
    heritageName: cleanHeritageName,
    fields,
    promptContext,
  };
}
