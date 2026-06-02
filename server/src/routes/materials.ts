import express, { type Request, type Response } from 'express';
import { query } from '../storage/database/pg-client';

const router = express.Router();

// 获取用户ID - 优先使用登录用户，否则使用device_id
function resolveUserId(req: Request): number | null {
  // 如果有登录用户信息（由auth中间件设置）
  if ((req as any).user?.userId) {
    return (req as any).user.userId;
  }
  return null;
}

// 从请求中获取设备标识
function getDeviceIdentity(req: Request): string {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const deviceId = `${ip}-${userAgent}`.slice(0, 255);
  return deviceId;
}

// 获取用户ID（兼容登录和未登录）
async function resolveUserIdentity(req: Request): Promise<number> {
  // 优先使用登录用户ID
  const loginUserId = resolveUserId(req);
  if (loginUserId) {
    return loginUserId;
  }

  // 未登录用户使用 device_id
  const deviceId = getDeviceIdentity(req);
  const selectResult = await query(
    'SELECT id FROM users WHERE device_id = $1',
    [deviceId]
  );

  if (selectResult.rows.length > 0) {
    return selectResult.rows[0].id;
  }

  const insertResult = await query(
    'INSERT INTO users (device_id) VALUES ($1) RETURNING id',
    [deviceId]
  );

  if (insertResult.rows.length === 0) {
    throw new Error('Failed to create user: no data returned');
  }

  return insertResult.rows[0].id;
}

/**
 * GET /api/v1/materials
 * 获取当前用户的素材列表
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserIdentity(req);

    const result = await query(
      'SELECT * FROM materials WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      materials: result.rows || [],
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({
      error: 'Failed to get materials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/materials/sync
 * 将收藏同步到素材（增量同步，只同步还没有的）
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserIdentity(req);

    console.log(`[Materials] Sync for user ${userId}`);

    // 获取用户的所有收藏
    const favoritesResult = await query(
      'SELECT * FROM favorites WHERE user_id = $1',
      [userId]
    );

    console.log(`[Materials] Found ${favoritesResult.rows.length} favorites for user ${userId}`);

    // 获取已有的素材（通过 source_id + source_type 去重）
    const existingResult = await query(
      "SELECT source_id FROM materials WHERE user_id = $1 AND source_type = 'favorite'",
      [userId]
    );
    const existingSourceIds = new Set(existingResult.rows.map((r: any) => r.source_id));

    let syncedCount = 0;

    for (const fav of favoritesResult.rows) {
      if (existingSourceIds.has(fav.id)) continue;

      // 确定素材类型和来源URL
      const materialType = fav.type === 'music' ? 'music' : 'image';
      const sourceUrl = fav.image_url || fav.video_url || '';

      // 从 metadata 提取子图作为额外素材
      const metadata = fav.metadata || {};

      await query(
        `INSERT INTO materials (user_id, type, source_url, title, description, metadata, source_type, source_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          materialType,
          sourceUrl,
          fav.title || '非遗创意作品',
          metadata.creativeDescription || '',
          JSON.stringify(metadata),
          'favorite',
          fav.id
        ]
      );

      syncedCount++;

      // 如果有子图，也作为单独的图片素材同步
      const subImageKeys = ['subImageUrl1', 'subImageUrl2', 'staticSubImageUrl1', 'staticSubImageUrl2'];
      for (const key of subImageKeys) {
        const subUrl = metadata[key];
        if (subUrl && typeof subUrl === 'string' && subUrl.startsWith('http')) {
          await query(
            `INSERT INTO materials (user_id, type, source_url, title, description, metadata, source_type, source_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              userId,
              'image',
              subUrl,
              `${fav.title || '非遗创意作品'} - 附图`,
              '',
              JSON.stringify({ parentFavoriteId: fav.id, subImageKey: key }),
              'favorite_sub',
              fav.id
            ]
          );
          syncedCount++;
        }
      }
    }

    console.log(`[Materials] Synced ${syncedCount} items for user ${userId}`);

    res.json({
      success: true,
      message: `成功同步 ${syncedCount} 个素材`,
      syncedCount,
    });
  } catch (error) {
    console.error('Sync materials error:', error);
    res.status(500).json({
      error: 'Failed to sync materials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/v1/materials/:id
 * 删除素材
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = await resolveUserIdentity(req);

    const checkResult = await query(
      'SELECT id, user_id FROM materials WHERE id = $1',
      [parseInt(id)]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    if (checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this material' });
    }

    await query('DELETE FROM materials WHERE id = $1', [parseInt(id)]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({
      error: 'Failed to delete material',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
