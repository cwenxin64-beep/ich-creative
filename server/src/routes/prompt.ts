import express, { type Request, type Response } from 'express';

const router = express.Router();

const VOLCENGINE_API_KEY = process.env.COZE_API_KEY || process.env.VOLCENGINE_API_KEY || '';
const VOLCENGINE_BASE_URL = process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const TEXT_MODEL = process.env.VOLCENGINE_TEXT_MODEL || 'ep-20260326185613-8d6lx';

const SCENE_GUIDES: Record<string, string> = {
  photo: [
    '这是“拍非遗”图片创作页。',
    '用户可能会上传一张参考图，优化时要保留用户指定的最终产品或原图主体，不要把产品改成别的东西。',
    '重点补充：非遗元素怎么融入主体、材质/纹样/色彩/构图、成品质感。',
  ].join(''),
  audio: [
    '这是“唱非遗”音乐创作页。',
    '优化成适合音乐生成的描述，补充主题、曲风、乐器、节奏、情绪和非遗氛围。',
    '不要写完整歌词，不要生成长段故事。',
  ].join(''),
  play: [
    '这是“玩非遗”视觉作品创作页。',
    '优化成适合生成海报、节日卡、生日卡、新年卡的视觉描述。',
    '重点补充：非遗元素、作品类型、画面风格、版式、目标市场。',
  ].join(''),
  use: [
    '这是“创非遗”实用文创产品设计页。',
    '优化时必须明确产品本体，不要把包装盒、礼盒、海报当作主体。',
    '重点补充：产品用途、材质、纹样、工艺、风格和使用场景。',
  ].join(''),
};

function toCleanString(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value.map(toCleanString).filter(Boolean).join('、');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const text = toCleanString(item);
        return text ? `${key}：${text}` : '';
      })
      .filter(Boolean)
      .join('；');
  }
  return String(value).trim();
}

function buildContextText(context: unknown): string {
  if (!context || typeof context !== 'object') return '';
  return Object.entries(context as Record<string, unknown>)
    .map(([key, value]) => {
      const text = toCleanString(value);
      return text ? `${key}：${text}` : '';
    })
    .filter(Boolean)
    .join('；');
}

function cleanOptimizedText(text: string): string {
  return text
    .replace(/^```[\s\S]*?\n/, '')
    .replace(/```$/g, '')
    .replace(/^["“]+|["”]+$/g, '')
    .trim();
}

async function callTextModel(messages: Array<{ role: string; content: string }>): Promise<string> {
  if (!VOLCENGINE_API_KEY) {
    throw new Error('缺少大模型密钥，请配置 VOLCENGINE_API_KEY 或 COZE_API_KEY');
  }

  const response = await fetch(`${VOLCENGINE_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${VOLCENGINE_API_KEY}`,
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      messages,
      temperature: 0.35,
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`提示词优化失败：${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || '';
  const optimizedText = cleanOptimizedText(content);

  if (!optimizedText) {
    throw new Error('提示词优化没有返回内容');
  }

  return optimizedText;
}

router.post('/optimize', async (req: Request, res: Response) => {
  try {
    const scene = String(req.body?.scene || '').trim();
    const text = String(req.body?.text || '').trim();
    const contextText = buildContextText(req.body?.context);
    const sceneGuide = SCENE_GUIDES[scene];

    if (!sceneGuide) {
      return res.status(400).json({ success: false, error: '未知的创作页面' });
    }

    if (!text && !contextText) {
      return res.status(400).json({ success: false, error: '请先输入一点描述或选择创作条件' });
    }

    const optimizedText = await callTextModel([
      {
        role: 'system',
        content: [
          '你是非遗 AI 创作提示词优化助手。',
          '把用户很短的想法改写成更适合 AI 生成的中文提示词。',
          '必须保留用户的核心对象、用途和风格，不得偷换产品主体。',
          '可以补充合理的非遗纹样、材质、构图和氛围，但不要编造具体历史故事。',
          '只输出优化后的中文提示词，不要解释，不要标题，不要 Markdown。',
          '长度控制在 60 到 140 个汉字。',
        ].join(''),
      },
      {
        role: 'user',
        content: [
          sceneGuide,
          text ? `用户原始描述：${text}` : '',
          contextText ? `页面已选条件：${contextText}` : '',
          '请输出一段可以直接放回输入框的优化后描述。',
        ].filter(Boolean).join('\n'),
      },
    ]);

    res.json({ success: true, optimizedText });
  } catch (error: any) {
    console.error('[Prompt Optimize] Error:', error);
    res.status(500).json({ success: false, error: error.message || '提示词优化失败' });
  }
});

export default router;
