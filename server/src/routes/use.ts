import express, { type Request, type Response } from 'express';
import { taskStore } from '../task-queue';
import { query } from '../storage/database/pg-client';
import { authMiddleware } from './auth';
import { getWorkflowId, runCozeWorkflow } from '../services/coze-workflows';
import { createObjectStorage } from '../services/object-storage';

const router = express.Router();

const ORDER_STATUS_TEXT: Record<string, string> = {
  pending: '待接单',
  accepted: '已接单',
  completed: '已完成',
  canceled: '已取消',
};

function isCraftsmanRole(role?: string) {
  return role === 'craftsman' || role === 'artisan';
}

function parseMetadata(value: any) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

function normalizeOrder(row: any) {
  const metadata = parseMetadata(row.metadata);
  const referenceWork = metadata.referenceWork || null;

  return {
    id: row.id,
    title: row.title,
    contactName: row.contact_name || '',
    contactPhone: row.contact_phone || '',
    contactWechat: row.contact_wechat || '',
    ichType: row.ich_type || '',
    interactionType: row.interaction_type || '',
    applicationScene: row.application_scene || '',
    keywords: row.keywords || '',
    requirements: row.requirements || '',
    budgetAmount: Number(row.budget_amount || 0),
    status: row.status || 'pending',
    statusText: ORDER_STATUS_TEXT[row.status] || row.status || '待接单',
    paymentStatus: row.payment_status || 'unpaid',
    paymentAmount: Number(row.payment_amount || 0),
    paymentProvider: row.payment_provider || '',
    paymentOrderId: row.payment_order_id || '',
    metadata,
    referenceWork,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
    updatedAt: row.updated_at,
    user: {
      id: row.user_id,
      username: row.user_username || '',
    },
    artisan: row.artisan_id
      ? {
          id: row.artisan_id,
          username: row.artisan_username || '',
          craft: row.artisan_craft || '',
        }
      : null,
  };
}

// 初始化对象存储
const storage = createObjectStorage();

// 火山引擎 API 配置
const VOLCENGINE_API_KEY = process.env.COZE_API_KEY || process.env.VOLCENGINE_API_KEY || '';
const VOLCENGINE_BASE_URL = process.env.VOLCENGINE_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';

// 模型 ID 配置（使用推理接入点 ID）
const TEXT_MODEL = process.env.VOLCENGINE_TEXT_MODEL || 'ep-20260326185613-8d6lx';
const IMAGE_MODEL = process.env.VOLCENGINE_IMAGE_MODEL || 'ep-20260326185459-8rt74';

const USE_WORKFLOW_IDS: Record<string, string> = {
  fashion: getWorkflowId('COZE_WORKFLOW_USE_FASHION', '7639041545900245007'),
  home: getWorkflowId('COZE_WORKFLOW_USE_HOME', '7651488708608950314'),
  art: getWorkflowId('COZE_WORKFLOW_USE_ART', '7651590834337300499'),
  gifts: getWorkflowId('COZE_WORKFLOW_USE_GIFTS', '7657855187197231155'),
};

const USE_CATEGORY_NAMES: Record<string, string> = {
  fashion: '时尚配饰',
  home: '家居装饰',
  art: '艺术品',
  gifts: '礼品',
};

const ICH_TYPE_NAMES: Record<string, string> = {
  jingdezhen: '景德镇陶瓷',
  guqin: '古琴艺术',
  xiangyunsha: '香云纱',
  ru: '汝瓷',
  luban: '鲁班锁',
  silkworm: '桑蚕丝织技艺',
  'paper-cut': '中国剪纸',
  taiji: '太极拳',
  jingju: '京剧',
  other: '其他',
};

const USE_INTERACTION_NAMES: Record<string, string> = {
  inheritor: '传承人',
  creator: '创作者',
  explorer: '探索者',
  artist: '艺术家',
  consumer: '消费者',
};

function getName(map: Record<string, string>, id = '') {
  return map[id] || id;
}

function buildUseWorkflowParameters(params: {
  keywords: string;
  ichType: string;
  interactionType: string;
  category: string;
  material?: string;
}) {
  const ichName = getName(ICH_TYPE_NAMES, params.ichType);
  const experienceType = getName(USE_INTERACTION_NAMES, params.interactionType) || '创意定制';
  const productType = USE_CATEGORY_NAMES[params.category] || params.category;
  const coreProduct = params.keywords.trim();
  const designRequirement = [
    `核心产品：${coreProduct}`,
    ichName ? `非遗类型：${ichName}` : '',
    `应用品类：${productType}`,
    `体验对象：${experienceType}`,
    `生成要求：画面主体必须是“${coreProduct}”本体，并将${ichName || '非遗'}元素融合到产品造型、材质、纹样或结构中`,
    '禁止偏离：不要把包装盒、礼盒、海报、说明卡、展示牌作为主体；如出现包装，只能作为辅助背景',
    params.material ? `参考素材：${params.material}` : '',
  ].filter(Boolean).join('；');

  return {
    design_requirement: designRequirement,
    experience_type: experienceType,
    product_type: productType,
    target_market: '中国年轻消费市场',
  };
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
  console.log('[Image] Response keys:', Object.keys(data));
  console.log('[Image] Response:', JSON.stringify(data).substring(0, 1000));
  
  // 尝试多种可能的返回格式
  const imageUrl = data.data?.[0]?.url 
    || data.data?.[0]?.b64_json
    || data.images?.[0]?.url 
    || data.images?.[0]?.image_url
    || data.url
    || data.result?.url;
    
  console.log('[Image] Extracted URL:', imageUrl ? imageUrl.substring(0, 100) : 'undefined');
  
  // 检查是否是内部代理 URL，如果是则下载并上传到对象存储
  if (imageUrl && imageUrl.includes('code.coze.cn')) {
    console.log('[Image] Detected internal proxy URL');
    
    // 检查是否在沙箱环境（通过环境变量）
    const isSandbox = process.env.COZE_PROJECT_DOMAIN_DEFAULT?.includes('coze.site') || 
                       process.env.COZE_WORKSPACE_PATH?.includes('/workspace/');
    
    if (isSandbox) {
      // 沙箱环境：直接返回 URL（浏览器也在沙箱内，可以访问）
      console.log('[Image] Sandbox environment detected, using internal URL directly');
      return imageUrl;
    }
    
    // 云服务器：尝试下载并上传到对象存储
    console.log('[Image] Cloud server detected, downloading and re-uploading to object storage...');
    try {
      // 下载图片
      const downloadResponse = await fetch(imageUrl, {
        signal: AbortSignal.timeout(60000),
      });
      
      if (!downloadResponse.ok) {
        throw new Error(`Failed to download image: ${downloadResponse.status}`);
      }
      
      const imageBuffer = Buffer.from(await downloadResponse.arrayBuffer());
      const fileName = `generated_images/image_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
      
      // 上传到对象存储
      const fileKey = await storage.uploadFile({
        fileContent: imageBuffer,
        fileName,
        contentType: 'image/png',
      });
      
      // 生成可访问的签名 URL
      const publicUrl = await storage.generatePresignedUrl({
        key: fileKey,
        expireTime: 86400 * 30, // 30 天有效期
      });
      
      console.log('[Image] Successfully re-uploaded to storage, new URL:', publicUrl.substring(0, 100));
      return publicUrl;
    } catch (uploadError: any) {
      // 下载或上传失败时，返回原始 URL（至少沙箱内可以访问）
      console.error('[Image] Failed to re-upload image, returning original URL:', uploadError.message);
      return imageUrl;
    }
  }
  
  if (!imageUrl) {
    throw new Error(`Image API returned no URL. Response: ${JSON.stringify(data).substring(0, 500)}`);
  }
  
  return imageUrl;
}

/**
 * 异步执行定制任务（不阻塞 HTTP 响应）
 */
async function executeCustomizeTask(taskId: string, params: {
  keywords: string;
  ichType?: string;
  interactionType?: string;
  applicationScene?: string;
  material?: string;
}) {
  const { keywords, ichType = '', interactionType = '', applicationScene = '', material } = params;

  taskStore.update(taskId, { status: 'processing', progress: 5 });
  console.log(`[Task ${taskId}] Starting customization: ichType=${ichType}, applicationScene=${applicationScene}, keywords="${keywords}"`);

  try {
    const results: any[] = [];
    const categories = ['fashion', 'home', 'art', 'gifts'];
    const targetCategories = applicationScene && applicationScene !== 'all' 
      ? [applicationScene] 
      : categories;
    
    const totalCategories = targetCategories.length;
    let completedCategories = 0;

    for (const category of targetCategories) {
      const workflowId = USE_WORKFLOW_IDS[category];
      if (!workflowId) {
        throw new Error(`未配置 ${category} 对应的 Coze 工作流`);
      }

      const workflowParams = buildUseWorkflowParameters({
        keywords,
        ichType,
        interactionType,
        category,
        material,
      });
      const workflowResult = await runCozeWorkflow(workflowId, workflowParams);
      const imageUrl = workflowResult.output;

      results.push({
        category,
        mainImageUrl: imageUrl,
        subImageUrl1: imageUrl,
        subImageUrl2: imageUrl,
        creativeDescription: keywords,
        metadata: {
          workflowId,
          workflowParameters: workflowParams,
        },
      });
      
      completedCategories++;
      const progress = 10 + Math.round((completedCategories / totalCategories) * 80);
      taskStore.update(taskId, { progress });
    }

    console.log(`[Task ${taskId}] Customization completed: ${results.length} products generated`);

    taskStore.update(taskId, {
      status: 'completed',
      progress: 100,
      result: {
        success: true,
        results,
        keywords,
        provider: 'coze-workflow'
      }
    });
  } catch (error) {
    console.error(`[Task ${taskId}] Customization error:`, error);
    taskStore.update(taskId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/v1/use/customization-order
 * 普通用户提交定制需求单，支付字段先预留但不触发真实支付
 */
router.post('/customization-order', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (isCraftsmanRole(req.user?.role)) {
      return res.status(403).json({ success: false, error: '手艺人账号用于接单，请用普通用户账号提交需求' });
    }

    const {
      title,
      contactName,
      contactPhone,
      contactWechat,
      ichType = '',
      interactionType = '',
      applicationScene = '',
      keywords = '',
      requirements,
      budgetAmount = 0,
      metadata = {},
    } = req.body;

    const cleanTitle = String(title || '非遗定制需求').trim();
    const cleanRequirements = String(requirements || keywords || '').trim();

    if (!cleanRequirements) {
      return res.status(400).json({ success: false, error: '请填写定制需求' });
    }

    const amount = Math.max(0, Math.round(Number(budgetAmount) || 0));

    const result = await query(
      `
      WITH inserted AS (
        INSERT INTO customization_orders (
          user_id,
          title,
          contact_name,
          contact_phone,
          contact_wechat,
          ich_type,
          interaction_type,
          application_scene,
          keywords,
          requirements,
          budget_amount,
          payment_amount,
          payment_status,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, 'unpaid', $12)
        RETURNING *
      )
      SELECT inserted.*, u.username AS user_username, a.username AS artisan_username, a.artisan_craft AS artisan_craft
      FROM inserted
      LEFT JOIN users u ON inserted.user_id = u.id
      LEFT JOIN users a ON inserted.artisan_id = a.id
      `,
      [
        req.user!.userId,
        cleanTitle,
        contactName || '',
        contactPhone || '',
        contactWechat || '',
        ichType,
        interactionType,
        applicationScene,
        keywords,
        cleanRequirements,
        amount,
        metadata,
      ]
    );

    res.status(201).json({
      success: true,
      message: '需求单已提交',
      order: normalizeOrder(result.rows[0]),
    });
  } catch (error) {
    console.error('[USE] Create customization order error:', error);
    res.status(500).json({ success: false, error: '提交需求单失败' });
  }
});

/**
 * GET /api/v1/use/customization-orders
 * 普通用户看自己的需求单；手艺人看待接单和自己已接单
 */
router.get('/customization-orders', authMiddleware, async (req: Request, res: Response) => {
  try {
    const craftsman = isCraftsmanRole(req.user?.role);
    const sql = craftsman
      ? `
        SELECT o.*, u.username AS user_username, a.username AS artisan_username, a.artisan_craft AS artisan_craft
        FROM customization_orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN users a ON o.artisan_id = a.id
        WHERE (o.status = 'pending' AND o.artisan_id IS NULL) OR o.artisan_id = $1
        ORDER BY CASE WHEN o.status = 'pending' THEN 0 ELSE 1 END, o.created_at DESC
      `
      : `
        SELECT o.*, u.username AS user_username, a.username AS artisan_username, a.artisan_craft AS artisan_craft
        FROM customization_orders o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN users a ON o.artisan_id = a.id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
      `;

    const result = await query(sql, [req.user!.userId]);

    res.json({
      success: true,
      role: craftsman ? 'craftsman' : 'user',
      orders: result.rows.map(normalizeOrder),
    });
  } catch (error) {
    console.error('[USE] List customization orders error:', error);
    res.status(500).json({ success: false, error: '获取需求单失败' });
  }
});

/**
 * POST /api/v1/use/customization-orders/:id/accept
 * 手艺人接单
 */
router.post('/customization-orders/:id/accept', authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!isCraftsmanRole(req.user?.role)) {
      return res.status(403).json({ success: false, error: '只有手艺人可以接单' });
    }

    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ success: false, error: '订单不存在' });
    }

    const result = await query(
      `
      WITH updated AS (
        UPDATE customization_orders
        SET artisan_id = $1,
            status = 'accepted',
            accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = $2 AND status = 'pending' AND artisan_id IS NULL
        RETURNING *
      )
      SELECT updated.*, u.username AS user_username, a.username AS artisan_username, a.artisan_craft AS artisan_craft
      FROM updated
      LEFT JOIN users u ON updated.user_id = u.id
      LEFT JOIN users a ON updated.artisan_id = a.id
      `,
      [req.user!.userId, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ success: false, error: '订单已被接走或状态不可接单' });
    }

    res.json({
      success: true,
      message: '接单成功',
      order: normalizeOrder(result.rows[0]),
    });
  } catch (error) {
    console.error('[USE] Accept customization order error:', error);
    res.status(500).json({ success: false, error: '接单失败' });
  }
});

/**
 * POST /api/v1/use/customization-orders/:id/payment-intent
 * 支付预留接口：只创建本系统支付意向，不调用真实支付渠道
 */
router.post('/customization-orders/:id/payment-intent', authMiddleware, async (req: Request, res: Response) => {
  try {
    const orderId = Number(req.params.id);
    const amount = Math.max(0, Math.round(Number(req.body.amount) || 0));

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ success: false, error: '订单不存在' });
    }

    const orderResult = await query(
      'SELECT id, user_id, budget_amount, payment_status FROM customization_orders WHERE id = $1 LIMIT 1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '订单不存在' });
    }

    const order = orderResult.rows[0];
    if (order.user_id !== req.user!.userId) {
      return res.status(403).json({ success: false, error: '不能操作别人的订单' });
    }

    if (order.payment_status === 'paid') {
      return res.status(409).json({ success: false, error: '订单已支付' });
    }

    const paymentAmount = amount || Number(order.budget_amount || 0);
    const paymentOrderId = `reserved_${orderId}_${Date.now()}`;

    await query(
      `UPDATE customization_orders
       SET payment_status = 'pending',
           payment_amount = $1,
           payment_provider = 'reserved',
           payment_order_id = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [paymentAmount, paymentOrderId, orderId]
    );

    res.json({
      success: true,
      message: '支付接口已预留，尚未接入真实支付',
      payment: {
        orderId,
        paymentOrderId,
        amount: paymentAmount,
        provider: 'reserved',
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('[USE] Create payment intent error:', error);
    res.status(500).json({ success: false, error: '创建支付意向失败' });
  }
});

/**
 * POST /api/v1/use/customize
 * 创建定制任务，立即返回 taskId（异步执行）
 */
router.post('/customize', async (req: Request, res: Response) => {
  try {
    const { keywords, ichType = '', interactionType = '', applicationScene = '', material } = req.body;

    if (!keywords) {
      return res.status(400).json({ error: 'No keywords provided' });
    }

    // 创建任务
    const task = taskStore.create();
    console.log(`[Task ${task.id}] Created for customization request`);

    // 异步执行任务（不阻塞 HTTP 响应）
    executeCustomizeTask(task.id, { keywords, ichType, interactionType, applicationScene, material });

    // 立即返回 taskId，让前端轮询状态
    res.json({
      taskId: task.id,
      status: 'processing',
      message: '任务已创建，请轮询查询状态'
    });
  } catch (error) {
    console.error('Customize request error:', error);
    res.status(500).json({
      error: 'Failed to create task',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/use/status/:taskId
 * 查询定制任务状态
 */
router.get('/status/:taskId', (req: Request, res: Response) => {
  const { taskId } = req.params;
  const task = taskStore.get(taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json({
    taskId: task.id,
    status: task.status,
    progress: task.progress,
    result: task.result,
    error: task.error
  });
});

export default router;
