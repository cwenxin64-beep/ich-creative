import express, { type Request, type Response } from 'express';
import { query } from '../storage/database/pg-client';

const router = express.Router();

// 从请求中获取用户标识（使用 IP + User-Agent 作为简易识别）
function getUserIdentity(req: Request): string {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  // 简单生成设备ID
  const deviceId = `${ip}-${userAgent}`.slice(0, 255);
  return deviceId;
}

// 获取或创建用户
async function getOrCreateUser(deviceId: string): Promise<number> {
  // 先查询用户
  console.log(`[Favorites] Looking up user with device_id: ${deviceId.substring(0, 50)}...`);
  const selectResult = await query(
    'SELECT id FROM users WHERE device_id = $1',
    [deviceId]
  );

  if (selectResult.rows.length > 0) {
    console.log(`[Favorites] Found existing user: ${selectResult.rows[0].id}`);
    return selectResult.rows[0].id;
  }

  // 创建新用户
  console.log(`[Favorites] Creating new user with device_id: ${deviceId.substring(0, 50)}...`);
  const insertResult = await query(
    'INSERT INTO users (device_id) VALUES ($1) RETURNING id',
    [deviceId]
  );

  if (insertResult.rows.length === 0) {
    throw new Error('Failed to create user: no data returned');
  }

  console.log(`[Favorites] Created new user: ${insertResult.rows[0].id}`);
  return insertResult.rows[0].id;
}

/**
 * POST /api/v1/favorites
 * 添加收藏（自动识别用户）
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, imageUrl, videoUrl, title, metadata } = req.body;

    if (!type || (!imageUrl && !videoUrl)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const deviceId = getUserIdentity(req);
    console.log(`[Favorites] Device ID: ${deviceId.substring(0, 50)}...`);

    const userId = await getOrCreateUser(deviceId);
    console.log(`[Favorites] User ID: ${userId}`);

    const insertResult = await query(
      `INSERT INTO favorites (user_id, type, image_url, video_url, title, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, type, imageUrl || null, videoUrl || null, title || '非遗创意作品', JSON.stringify(metadata || {})]
    );

    const favorite = insertResult.rows[0];
    console.log(`Added to favorites: user=${userId}, type=${type}`);

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
    const deviceId = getUserIdentity(req);
    const userId = await getOrCreateUser(deviceId);

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
    const deviceId = getUserIdentity(req);
    const userId = await getOrCreateUser(deviceId);

    // 先检查是否是该用户的收藏
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

    console.log(`Removed from favorites: id=${id}, user=${userId}`);

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
