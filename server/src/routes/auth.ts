import { Router } from 'express';
import { query } from '../storage/database/pg-client';
import { hashPassword } from '../lib/password';

const router = Router();

// 注册新用户
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: '请填写所有必填字段',
      });
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: '密码长度至少6位',
      });
    }

    // 检查邮箱是否已注册
    const existingResult = await query(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: '该邮箱已被注册',
      });
    }

    // 哈希密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const insertResult = await query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, hashedPassword]
    );

    const data = insertResult.rows[0];
    console.log(`[AUTH] New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: '注册成功',
      user: {
        id: data.id,
        username: data.username,
        email: data.email,
        created_at: data.created_at,
      },
    });
  } catch (error) {
    console.error('[AUTH] Register error:', error);
    res.status(500).json({
      success: false,
      error: '注册失败，请稍后重试',
    });
  }
});

export default router;
