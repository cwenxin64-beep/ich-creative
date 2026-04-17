import express, { type Request, type Response } from 'express';
import crypto from 'crypto';

const router = express.Router();

// 火山引擎 API 配置
const VOLCENGINE_API_KEY = process.env.COZE_API_KEY || process.env.VOLCENGINE_API_KEY || '';
const VOLCENGINE_BASE_URL = process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

// 扣子智能体配置
const COZE_API_TOKEN = process.env.COZE_API_TOKEN || '';
const COZE_BOT_ID = process.env.COZE_BOT_ID || '7623723702928572457';

// 模型 ID 配置（使用推理接入点 ID）
const TEXT_MODEL = process.env.VOLCENGINE_TEXT_MODEL || 'ep-20260326185613-8d6lx';
const IMAGE_MODEL = process.env.VOLCENGINE_IMAGE_MODEL || 'ep-20260326185459-8rt74';

/**
 * 调用扣子智能体优化提示词
 */
async function callCozeBot(userMessage: string): Promise<string> {
  const url = 'https://api.coze.cn/v3/chat';
  const conversationId = crypto.randomUUID();
  const chatId = crypto.randomUUID();
  
  const body = {
    conversation_id: conversationId,
    bot_id: COZE_BOT_ID,
    user_id: 'ich-user',
    query: userMessage,
    stream: false,
  };

  console.log('[Coze Bot] Calling bot:', COZE_BOT_ID);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${COZE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Coze API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('[Coze Bot] Response:', JSON.stringify(data).substring(0, 500));

  if (data.code !== 0) {
    throw new Error(`Coze API error: ${data.code} - ${data.msg}`);
  }

  // 获取 chat_id 用于查询结果
  const resultChatId = data.data.id;
  
  // 轮询查询结果
  return await pollCozeResult(resultChatId, conversationId);
}

/**
 * 轮询扣子对话结果
 */
async function pollCozeResult(chatId: string, conversationId: string): Promise<string> {
  const url = `https://api.coze.cn/v3/chat/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`;
  
  const maxRetries = 30;
  const retryInterval = 2000;

  for (let i = 0; i < maxRetries; i++) {
    console.log(`[Coze Bot] Polling... ${i + 1}/${maxRetries}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${COZE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.json();
    
    if (data.code === 0 && data.data) {
      const status = data.data.status;
      
      if (status === 'completed') {
        // 获取消息内容
        const messagesResponse = await fetch(
          `https://api.coze.cn/v3/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${COZE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        const messagesData = await messagesResponse.json();
        
        if (messagesData.code === 0 && messagesData.data?.length > 0) {
          const botMessage = messagesData.data.find((m: any) => m.role === 'assistant');
          if (botMessage?.content) {
            console.log('[Coze Bot] Success, response length:', botMessage.content.length);
            return botMessage.content;
          }
        }
        
        throw new Error('No assistant message found in response');
      } else if (status === 'failed') {
        throw new Error('Coze chat task failed');
      }
      // 继续等待
    }

    await new Promise(resolve => setTimeout(resolve, retryInterval));
  }

  throw new Error('Coze chat timeout');
}

/**
 * 直接调用火山引擎 LLM API
 */
async function callVolcengineLLM(messages: any[], model: string = TEXT_MODEL): Promise<string> {
  const url = `${VOLCENGINE_BASE_URL}/chat/completions`;
  
  const body = {
    model,
    messages,
    temperature: 0.5,
    max_tokens: 4000,
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
 * POST /api/v1/use/customize
 * Generate customized ICH creative products
 */
router.post('/customize', async (req: Request, res: Response) => {
  try {
    const { keywords, ichType = '', interactionType = '', applicationScene = '', material } = req.body;

    if (!keywords) {
      return res.status(400).json({ error: 'No keywords provided' });
    }

    console.log(`Customize request: ichType=${ichType}, applicationScene=${applicationScene}, keywords="${keywords}"`);

    // Step 0: 用扣子智能体优化用户关键词
    let optimizedKeywords = keywords;
    if (COZE_API_TOKEN) {
      try {
        console.log('[Customize] Optimizing keywords with Coze Bot...');
        const cozePrompt = `你是一位非物质文化遗产创意设计专家。用户想要生成非遗创意产品。请将用户的简短描述优化为详细的创意设计需求描述，包含：产品类型、应用场景、文化元素、风格特点等。直接输出优化后的描述，不要其他解释。

用户输入：${keywords}`;
        
        optimizedKeywords = await callCozeBot(cozePrompt);
        console.log('[Customize] Keywords optimized:', optimizedKeywords.substring(0, 100));
      } catch (error: any) {
        console.error('[Customize] Coze Bot failed, using original keywords:', error.message);
      }
    }

    // 构建设计 Prompt
    const designPrompt = `你是一位非物质文化遗产创意设计专家。请根据用户关键词，生成精准的定制产品设计方案。

## 用户关键词
"${optimizedKeywords}"

## 任务要求
为每个应用场景生成：
1. **创意描述**：20个汉字，包含关键词+寓意+效果
2. **生图Prompt**：用于AI生图，必须具体、详细、可执行

## 输出格式（JSON）
{
  "fashion": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "时尚配饰正面展示，[产品类型]，[非遗图案]，现代时尚摄影",
    "ichElements": ["非遗元素"],
    "colorPalette": ["配色方案"]
  },
  "home": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "家居装饰品正面展示，[产品类型]，[非遗元素]，温馨场景摄影",
    "ichElements": ["非遗元素"],
    "colorPalette": ["配色方案"]
  },
  "art": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "艺术品正面展示，[产品类型]，[非遗技艺]，画廊级摄影",
    "ichElements": ["非遗元素"],
    "colorPalette": ["配色方案"]
  },
  "gifts": {
    "creativeDescription": "20字创意描述",
    "mainPrompt": "礼品正面展示，[产品类型]，[非遗元素]，精致礼品摄影",
    "ichElements": ["非遗元素"],
    "colorPalette": ["配色方案"]
  }
}

请严格按照以上要求输出JSON：`;

    // Step 1: 分析并生成 prompts
    const analysisResponse = await callVolcengineLLM([
      { role: 'user', content: designPrompt }
    ]);

    // 解析 JSON
    let prompts;
    try {
      let content = analysisResponse.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();
      }
      prompts = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return res.status(500).json({
        error: 'AI 响应格式错误，请重试',
      });
    }
    console.log('Generated design prompts:', Object.keys(prompts));

    // Step 2: 生成产品图片
    const results: any[] = [];
    const categories = ['fashion', 'home', 'art', 'gifts'];

    for (const category of categories) {
      if (applicationScene && applicationScene !== 'all' && applicationScene !== category) {
        continue;
      }

      const promptData = prompts[category];
      if (!promptData) continue;

      try {
        const imageUrl = await callVolcengineImage(promptData.mainPrompt);
        
        results.push({
          category,
          mainImageUrl: imageUrl,
          subImageUrl1: imageUrl,
          subImageUrl2: imageUrl,
          creativeDescription: promptData.creativeDescription || '',
          metadata: {
            ichElements: promptData.ichElements,
            colorPalette: promptData.colorPalette
          }
        });
      } catch (error) {
        console.error(`Failed to generate ${category} product:`, error);
      }
    }

    console.log(`Customization completed: ${results.length} products generated`);

    res.json({
      success: true,
      results,
      keywords,
      optimizedKeywords,
      prompts
    });
  } catch (error) {
    console.error('Customization error:', error);
    res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/use/customization-order
 * Submit a product customization order
 */
router.post('/customization-order', async (req: Request, res: Response) => {
  try {
    const { productId, imageUrl, size, time, price, requirement } = req.body;

    if (!size || !time || !price) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide size, time, and price'
      });
    }

    console.log(`Customization order received: productId=${productId}, size=${size}, time=${time}, price=${price}`);

    // 生成订单 ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const orderData = {
      id: orderId,
      productId,
      imageUrl,
      size,
      time,
      price,
      requirement: requirement || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    console.log('Order saved:', orderData);

    res.json({
      success: true,
      message: '定制订单已提交成功',
      orderId,
      order: orderData,
    });
  } catch (error) {
    console.error('Customization order error:', error);
    res.status(500).json({
      error: 'Order submission failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
