import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { query } from '../storage/database/pg-client';
import { hashPassword, verifyPassword } from '../lib/password';
import { signTokens, verifyToken, verifyRefreshToken } from '../lib/jwt';
import type { TokenPayload } from '../lib/jwt';

const router = Router();

// ============ Auth Middleware ============
// 扩展 Request 类型以携带 user 信息
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// 认证中间件 - 验证 Bearer token
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未登录，请先登录' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
  }

  req.user = payload;
  next();
}

// ============ 注册 ============
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: '请填写所有必填字段' });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: '邮箱格式不正确' });
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: '密码长度至少6位' });
    }

    // 验证用户名长度
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ success: false, error: '用户名长度2-20位' });
    }

    // 检查邮箱是否已注册
    const existingResult = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ success: false, error: '该邮箱已被注册' });
    }

    // 检查用户名是否已存在
    const existingUsername = await query('SELECT id FROM users WHERE username = $1 LIMIT 1', [username]);
    if (existingUsername.rows.length > 0) {
      return res.status(409).json({ success: false, error: '该用户名已被使用' });
    }

    // 哈希密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const insertResult = await query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at',
      [username, email, hashedPassword, 'user']
    );

    const user = insertResult.rows[0];
    console.log(`[AUTH] New user registered: ${email}`);

    // 自动登录 - 签发 token
    const tokens = signTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: '注册成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: null,
        createdAt: user.created_at,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('[AUTH] Register error:', error);
    res.status(500).json({ success: false, error: '注册失败，请稍后重试' });
  }
});

// ============ 登录 ============
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: '请输入邮箱和密码' });
    }

    // 查找用户
    const result = await query(
      'SELECT id, username, email, password_hash, role, created_at FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: '邮箱或密码不正确' });
    }

    const user = result.rows[0];

    // 验证密码
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: '邮箱或密码不正确' });
    }

    // 签发 token
    const tokens = signTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    console.log(`[AUTH] User logged in: ${email}`);

    res.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: null,
        createdAt: user.created_at,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ success: false, error: '登录失败，请稍后重试' });
  }
});

// ============ 刷新 Token ============
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, error: '缺少 refresh token' });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ success: false, error: 'Refresh token 已过期，请重新登录' });
    }

    // 验证用户仍存在
    const result = await query('SELECT id, username, email, role, created_at FROM users WHERE id = $1', [payload.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: '用户不存在' });
    }

    const user = result.rows[0];
    const tokens = signTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: null,
        createdAt: user.created_at,
      },
      ...tokens,
    });
  } catch (error) {
    console.error('[AUTH] Refresh error:', error);
    res.status(500).json({ success: false, error: '刷新 token 失败' });
  }
});

// ============ 获取当前用户信息 ============
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: null,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('[AUTH] Get profile error:', error);
    res.status(500).json({ success: false, error: '获取用户信息失败' });
  }
});

// ============ 登出 ============
router.post('/logout', authMiddleware, async (_req, res) => {
  // JWT 是无状态的，登出由前端清除 token 即可
  res.json({ success: true, message: '已登出' });
});

export default router;
