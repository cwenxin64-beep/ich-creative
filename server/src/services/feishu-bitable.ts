const FEISHU_API_BASE_URL = process.env.FEISHU_API_BASE_URL || 'https://open.feishu.cn/open-apis';
const FEISHU_APP_ID = process.env.FEISHU_APP_ID || '';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || '';
const FEISHU_BITABLE_APP_TOKEN = process.env.FEISHU_BITABLE_APP_TOKEN || '';
const FEISHU_BITABLE_PRODUCT_TABLE_ID = process.env.FEISHU_BITABLE_PRODUCT_TABLE_ID || '';
const FEISHU_BITABLE_PLAY_TABLES = {
  poster: '海报',
  festival: '节日卡',
  birthday: '生日卡',
  newyear: '新年卡',
} as const;

export type FeishuPlayProductType = keyof typeof FEISHU_BITABLE_PLAY_TABLES;

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

function requireBaseConfiguration() {
  const missing = [
    ['FEISHU_APP_ID', FEISHU_APP_ID],
    ['FEISHU_APP_SECRET', FEISHU_APP_SECRET],
    ['FEISHU_BITABLE_APP_TOKEN', FEISHU_BITABLE_APP_TOKEN],
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
  requireBaseConfiguration();
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

// 按用户选择的非遗大类查资料，不要求标题写出完整项目名或具体产品名。
// 输入名称和检索词分开：大类关键词不会反过来重写用户自填的其他技艺。
const HERITAGE_CATEGORIES = [
  { names: ['景德镇陶瓷', '景德镇'], keywords: ['景德镇', '陶瓷', '青花瓷', '瓷器'] },
  { names: ['古琴艺术', '古琴'], keywords: ['古琴', '七弦琴'] },
  { names: ['香云纱'], keywords: ['香云纱'] },
  { names: ['汝瓷'], keywords: ['汝瓷', '汝窑'] },
  { names: ['鲁班锁'], keywords: ['鲁班锁', '孔明锁', '榫卯'] },
  { names: ['桑蚕丝织技艺', '桑蚕丝'], keywords: ['桑蚕丝', '蚕丝', '丝织'] },
  { names: ['中国剪纸', '剪纸'], keywords: ['剪纸', '刻纸'] },
  { names: ['太极拳', '太极'], keywords: ['太极'] },
  { names: ['京剧'], keywords: ['京剧', '京戏', '脸谱'] },
];

function getHeritageKeywords(heritageName: string): string[] {
  const name = normalizeName(heritageName);
  return HERITAGE_CATEGORIES.find(category => category.names.includes(name))?.keywords || [name];
}

export async function getFeishuHeritageContext(
  heritageName: string
): Promise<FeishuHeritageContext> {
  requireBaseConfiguration();
  if (!FEISHU_BITABLE_PRODUCT_TABLE_ID) {
    throw new Error('飞书多维表格配置缺失：FEISHU_BITABLE_PRODUCT_TABLE_ID');
  }
  return getContextFromTable('产品', FEISHU_BITABLE_PRODUCT_TABLE_ID, heritageName, '产品');
}

async function getContextFromTable(
  tableName: string,
  tableId: string,
  heritageName: string,
  heritageForm = ''
): Promise<FeishuHeritageContext> {
  const cleanHeritageName = heritageName.trim();
  if (!cleanHeritageName) throw new Error('非遗名称不能为空');

  const records = await listRecords(tableId);
  const targetNames = getHeritageKeywords(cleanHeritageName);
  const targetForm = normalizeName(heritageForm);
  const matchedRecords = records.filter(item => {
    const recordName = normalizeName(item.fields?.['非遗名称']);
    const nameMatches = targetNames.some(name => recordName.includes(name));
    return nameMatches && (!targetForm || normalizeName(item.fields?.['非遗形式']) === targetForm);
  });
  if (matchedRecords.length === 0) {
    const formText = heritageForm ? `、非遗形式“${heritageForm}”` : '';
    throw new Error(`飞书“${tableName}”表中没有找到标题包含“${targetNames.join(' / ')}”${formText}的记录`);
  }

  const fields: Record<string, string> = {};
  const contextBlocks = matchedRecords.map((record, index) => {
    const recordFields: Record<string, string> = {};
    for (const [name, value] of Object.entries(record.fields || {})) {
      if (/图片|附件|url|父记录/i.test(name)) continue;
      const text = fieldToText(value);
      if (text) recordFields[name] = text;
    }
    if (matchedRecords.length === 1) Object.assign(fields, recordFields);
    const block = Object.entries(recordFields).map(([name, value]) => `${name}：${value}`).join('\n');
    return block ? `参考记录 ${index + 1}：\n${block}` : '';
  }).filter(Boolean);

  if (matchedRecords.length > 1) {
    fields['匹配记录数'] = String(matchedRecords.length);
  }

  const promptContext = contextBlocks.join('\n\n');
  if (!promptContext) {
    throw new Error(`飞书记录“${cleanHeritageName}”没有可用于生成的文字字段`);
  }

  return {
    tableName,
    tableId,
    recordId: matchedRecords.map(record => record.record_id).join(','),
    heritageName: cleanHeritageName,
    fields,
    promptContext,
  };
}

export async function getFeishuPlayHeritageContext(
  productType: FeishuPlayProductType,
  heritageName: string
): Promise<FeishuHeritageContext> {
  const table = FEISHU_BITABLE_PLAY_TABLES[productType];
  if (!table) {
    throw new Error(`暂不支持的玩非遗产品类型：${productType}`);
  }

  requireBaseConfiguration();
  if (!FEISHU_BITABLE_PRODUCT_TABLE_ID) {
    throw new Error('飞书多维表格配置缺失：FEISHU_BITABLE_PRODUCT_TABLE_ID');
  }

  return getContextFromTable('非遗数据库', FEISHU_BITABLE_PRODUCT_TABLE_ID, heritageName, table);
}
