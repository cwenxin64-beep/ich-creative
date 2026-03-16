import express, { type Request, type Response } from 'express';
import multer from 'multer';
import { LLMClient, Config, ImageGenerationClient, VideoGenerationClient, HeaderUtils } from 'coze-coding-dev-sdk';
import { taskStore, type TaskStatus } from '../task-queue';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/**
 * 执行生成任务（后台执行）
 */
async function executeGenerationTask(
  taskId: string,
  fileBuffer: Buffer,
  mimetype: string,
  originalname: string,
  description: string,
  outputType: string,
  customHeaders: Record<string, string>
) {
  try {
    // 更新状态为处理中
    taskStore.update(taskId, { status: 'processing', progress: 10 });

    const config = new Config({ timeout: 180000 }); // 180 秒超时

    // Step 1: 分析图片
    console.log(`[${taskId}] Starting LLM analysis...`);
    taskStore.update(taskId, { progress: 20 });

    const llmClient = new LLMClient(config, customHeaders);
    const base64Data = fileBuffer.toString('base64');
    const dataUri = `data:${mimetype};base64,${base64Data}`;

    const analysisPrompt = `你是一位非物质文化遗产创意设计专家。请根据用户上传的图片和需求，生成精准的设计方案。

## 用户需求
${description || '（用户未提供额外描述，请根据图片内容自动创作）'}

## 任务要求
1. **识别图片中的非遗元素**：工艺类型、纹样图案、色彩搭配、材质特征
2. **生成创意描述**：用20个汉字概括，包含：关键词+寓意+效果
3. **生成图像生成Prompt**：用于AI生图，必须具体、详细、可执行

## 生图Prompt要求（非常重要！）
- 三个Prompt必须是**同一个产品**的**三个不同角度**
- 必须保持：相同的产品外观、相同的风格、相同的配色、相同的材质
- 区别仅在于拍摄角度：
  - mainPrompt：正面全景图，展示完整产品
  - subPrompt1：细节特写图，聚焦核心工艺细节
  - subPrompt2：侧面/俯视图，展示立体结构

## 输出格式（JSON）
{
  "creativeDescription": "20字创意描述",
  "ichElements": ["非遗元素1", "非遗元素2"],
  "emotionalTone": "情感基调",
  "culturalNarrative": "文化内涵说明",
  "mainPrompt": "产品正面全景，[产品类型]，[非遗元素描述]，[色彩]，[材质]，[场景]，[光线]，高清产品摄影",
  "subPrompt1": "同一产品细节特写，[聚焦部位]，[工艺细节]，[纹理质感]，微距摄影",
  "subPrompt2": "同一产品侧面视角，[立体结构]，[整体轮廓]，[空间关系]，产品展示图"
}

请严格按照以上要求输出JSON：`;

    const analysisMessages = [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: analysisPrompt },
          {
            type: mimetype.startsWith('video') ? 'video_url' as const : 'image_url' as const,
            [mimetype.startsWith('video') ? 'video_url' : 'image_url']: {
              url: dataUri,
              fps: mimetype.startsWith('video') ? 1 : undefined,
              detail: 'high',
            }
          },
        ],
      },
    ];

    const analysisResponse = await llmClient.invoke(analysisMessages, {
      model: 'doubao-seed-1-6-vision-250815',
      temperature: 0.5,
    });

    // 解析 JSON
    let analysisData;
    try {
      let content = analysisResponse.content.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();
      }
      analysisData = JSON.parse(content);
    } catch (parseError) {
      throw new Error('AI 响应格式错误，请重试');
    }

    console.log(`[${taskId}] LLM analysis completed`);
    taskStore.update(taskId, { progress: 40 });

    // Step 2: 生成图片
    let staticMainImageUrl: string | undefined;
    let staticSubImageUrl1: string | undefined;
    let staticSubImageUrl2: string | undefined;

    const needsStaticImage = outputType === 'all' || outputType === 'static' || outputType === 'dynamic';
    if (needsStaticImage) {
      console.log(`[${taskId}] Starting image generation...`);
      const imageClient = new ImageGenerationClient(config, customHeaders);

      // 只生成 1 张主图
      const mainResponse = await imageClient.generate({
        prompt: analysisData.mainPrompt,
        size: '1K',
        watermark: false,
      });
      const mainHelper = imageClient.getResponseHelper(mainResponse);
      if (mainHelper.success && mainHelper.imageUrls.length > 0) {
        staticMainImageUrl = mainHelper.imageUrls[0];
      }

      console.log(`[${taskId}] Image generation completed`);
      taskStore.update(taskId, { progress: 80 });
    }

    // Step 3: 完成任务
    const result: any = {
      success: true,
      analysis: analysisData,
      staticMainImageUrl,
    };

    taskStore.update(taskId, {
      status: 'completed',
      progress: 100,
      result,
    });

    console.log(`[${taskId}] Task completed successfully`);
  } catch (error) {
    console.error(`[${taskId}] Task failed:`, error);
    taskStore.update(taskId, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * POST /api/v1/photo/generate
 * 异步生成：立即返回任务 ID，后台执行生成
 */
router.post('/generate', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const description = req.body.description || '';
    const outputType = req.body.outputType || 'static';

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // 创建任务
    const task = taskStore.create();
    console.log(`Created task ${task.id} for photo generation`);

    // 提取 headers
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    // 后台执行生成任务
    executeGenerationTask(
      task.id,
      file.buffer,
      file.mimetype,
      file.originalname,
      description,
      outputType,
      customHeaders
    ).catch(err => {
      console.error(`Task ${task.id} execution error:`, err);
    });

    // 立即返回任务 ID
    res.json({
      taskId: task.id,
      status: 'pending',
      message: '任务已创建，请轮询查询状态',
    });
  } catch (error) {
    console.error('Photo generation error:', error);
    res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/photo/status/:taskId
 * 查询任务状态
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
    error: task.error,
  });
});

export default router;
