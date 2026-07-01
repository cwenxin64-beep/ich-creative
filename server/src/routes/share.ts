import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { query } from '../storage/database/pg-client';

const router = Router();

// 生成短分享 ID（12位随机字符）
function generateShareId(): string {
  return randomBytes(9).toString('base64url').substring(0, 12);
}

// 创建分享 - 存储作品数据，返回短 shareId
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body || {};

    if (!type || typeof type !== 'string') {
      return res.status(400).json({ error: 'type is required' });
    }
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data is required' });
    }

    // 生成唯一 shareId（碰撞概率极低但保险起见重试几次）
    let shareId = generateShareId();
    for (let i = 0; i < 5; i++) {
      const exists = await query('SELECT id FROM shares WHERE id = $1 LIMIT 1', [shareId]);
      if (exists.rows.length === 0) break;
      shareId = generateShareId();
    }

    await query(
      'INSERT INTO shares (id, type, data) VALUES ($1, $2, $3)',
      [shareId, type, JSON.stringify(data)]
    );

    return res.json({ shareId });
  } catch (err) {
    console.error('[Share] Create error:', err);
    return res.status(500).json({ error: 'Failed to create share' });
  }
});

// 通过 shareId 查询分享内容
router.get('/:shareId', async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;
    const result = await query(
      'SELECT id, type, data, created_at FROM shares WHERE id = $1 LIMIT 1',
      [shareId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Share not found' });
    }

    const row = result.rows[0];
    return res.json({
      shareId: row.id,
      type: row.type,
      data: row.data,
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error('[Share] Get error:', err);
    return res.status(500).json({ error: 'Failed to get share' });
  }
});

export default router;
