import express, { type Request, type Response } from 'express';
import { query } from '../storage/database/pg-client';

const router = express.Router();

// 获取用户ID - 优先使用登录用户，否则使用device_id
function resolveLoginUserId(req: Request): number | null {
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
  const loginUserId = resolveLoginUserId(req);
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
 * POST /api/v1/favorites
 * 添加收藏
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, imageUrl, videoUrl, title, metadata } = req.body;

    if (!type || (!imageUrl && !videoUrl && type !== 'music')) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userId = await resolveUserIdentity(req);
    console.log(`[Favorites] Add favorite for user ${userId}`);

    const insertResult = await query(
      `INSERT INTO favorites (user_id, type, image_url, video_url, title, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, type, imageUrl || null, videoUrl || null, title || '非遗创意作品', JSON.stringify(metadata || {})]
    );

    const favorite = insertResult.rows[0];

    res.json({
      success: true,
      id: favorite.id,
      favorite,
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      error: 'Failed to add favorite',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/favorites
 * 获取当前用户的收藏列表
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = await resolveUserIdentity(req);

    const result = await query(
      'SELECT * FROM favorites WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      favorites: result.rows || [],
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      error: 'Failed to get favorites',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/v1/favorites/:id
 * 删除收藏（只能删除自己的）
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const userId = await resolveUserIdentity(req);

    const checkResult = await query(
      'SELECT id, user_id FROM favorites WHERE id = $1',
      [parseInt(id)]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    if (checkResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this favorite' });
    }

    await query('DELETE FROM favorites WHERE id = $1', [parseInt(id)]);

    res.json({ success: true });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      error: 'Failed to remove favorite',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
