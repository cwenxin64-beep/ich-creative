import express, { type Request, type Response } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

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
async function getOrCreateUser(client: any, deviceId: string): Promise<number> {
  // 先查询用户
  console.log(`[Favorites] Looking up user with device_id: ${deviceId.substring(0, 50)}...`);
  const { data: existingUser, error: selectError } = await client
    .from('users')
    .select('id')
    .eq('device_id', deviceId)
    .single();

  if (selectError) {
    console.error(`[Favorites] Select user error:`, selectError);
  }

  if (existingUser) {
    console.log(`[Favorites] Found existing user: ${existingUser.id}`);
    return existingUser.id;
  }

  // 创建新用户
  console.log(`[Favorites] Creating new user with device_id: ${deviceId.substring(0, 50)}...`);
  const { data: newUser, error } = await client
    .from('users')
    .insert({ device_id: deviceId })
    .select('id')
    .single();

  if (error) {
    console.error(`[Favorites] Insert user error:`, error);
    throw new Error(`Failed to create user: ${error.message}`);
  }

  if (!newUser) {
    console.error(`[Favorites] Insert succeeded but no data returned`);
    throw new Error('Failed to create user: no data returned');
  }

  console.log(`[Favorites] Created new user: ${newUser.id}`);
  return newUser.id;
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

    console.log(`[Favorites] Initializing Supabase client...`);
    const client = getSupabaseClient();
    console.log(`[Favorites] Supabase client initialized`);
    
    const deviceId = getUserIdentity(req);
    console.log(`[Favorites] Device ID: ${deviceId.substring(0, 50)}...`);
    
    const userId = await getOrCreateUser(client, deviceId);
    console.log(`[Favorites] User ID: ${userId}`);

    const { data: favorite, error } = await client
      .from('favorites')
      .insert({
        user_id: userId,
        type,
        image_url: imageUrl,
        video_url: videoUrl,
        title: title || '非遗创意作品',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Insert error:', error);
      return res.status(500).json({ error: 'Failed to add favorite' });
    }

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
    const client = getSupabaseClient();
    const deviceId = getUserIdentity(req);
    const userId = await getOrCreateUser(client, deviceId);

    const { data: favorites, error } = await client
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Query error:', error);
      return res.status(500).json({ error: 'Failed to get favorites' });
    }

    res.json({
      success: true,
      favorites: favorites || [],
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
    const { id } = req.params;
    const client = getSupabaseClient();
    const deviceId = getUserIdentity(req);
    const userId = await getOrCreateUser(client, deviceId);

    // 先检查是否是该用户的收藏
    const { data: favorite } = await client
      .from('favorites')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    if (favorite.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this favorite' });
    }

    const { error } = await client
      .from('favorites')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return res.status(500).json({ error: 'Failed to delete favorite' });
    }

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
