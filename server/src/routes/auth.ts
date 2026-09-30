import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { query } from '../storage/database/pg-client';
import { hashPassword, verifyPassword } from '../lib/password';
import { signTokens, verifyToken, verifyRefreshToken } from '../lib/jwt';
import type { TokenPayload } from '../lib/jwt';
import { createObjectStorage } from '../services/object-storage';
import { sendPasswordResetCode } from '../services/email';

const router = Router();
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const storage = createObjectStorage();

const USER_SELECT_FIELDS = 'id, username, email, role, avatar_key, avatar_url, created_at';
const RESET_CODE_TTL_MINUTES = 10;
const RESET_CODE_MAX_ATTEMPTS = 5;

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashResetCode(userId: number, code: string) {
  const secret = (process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET || '').trim();
  if (!secret) {
    throw new Error('密码重置服务未配置，请设置 PASSWORD_RESET_SECRET');
  }
  return createHash('sha256').update(`${userId}:${code}:${secret}`).digest('hex');
}

function resetCodeMatches(expectedHash: string, actualHash: string) {
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(actualHash, 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

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

// 可选认证中间件 - 有 token 就解析，没有就跳过
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

// 从请求中获取设备标识
function getDeviceIdentity(req: Request): string {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  return `${ip}-${userAgent}`.slice(0, 255);
}

async function formatUser(user: any) {
  let avatar = user.avatar_url || null;
  if (user.avatar_key) {
    avatar = await storage.generatePresignedUrl({
      key: user.avatar_key,
      expireTime: 86400 * 30,
    });
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    avatar,
    createdAt: user.created_at,
  };
}

function getAvatarExtension(file: Express.Multer.File) {
  const extFromName = (file.originalname || '').match(/\.[a-zA-Z0-9]{1,8}$/)?.[0]?.toLowerCase();
  if (extFromName) return extFromName;
  if (file.mimetype === 'image/png') return '.png';
  if (file.mimetype === 'image/webp') return '.webp';
  return '.jpg';
}

// ============ 注册 ============
router.post('/register', async (req, res) => {
  try {
    const {
      username,
      email: rawEmail,
      password,
      role,
      artisanName,
      artisanContact,
      artisanCraft,
      artisanDescription,
    } = req.body;
    const email = normalizeEmail(rawEmail);
    const requestedRole = role === 'craftsman' ? 'craftsman' : 'user';
    const savedArtisanName = requestedRole === 'craftsman' ? String(artisanName || username).trim() : '';
    const savedArtisanContact = requestedRole === 'craftsman' ? String(artisanContact || '').trim() : '';
    const savedArtisanCraft = requestedRole === 'craftsman' ? String(artisanCraft || '').trim() : '';
    const savedArtisanDescription = requestedRole === 'craftsman' ? String(artisanDescription || '').trim() : '';

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: '请填写所有必填字段' });
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
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

    if (requestedRole === 'craftsman' && !savedArtisanCraft) {
      return res.status(400).json({ success: false, error: '请填写手艺人非遗项目' });
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

    // 检查是否已有 device_id 用户（未注册的匿名用户），如果有则升级为注册用户
    const deviceId = getDeviceIdentity(req);
    const deviceUser = await query('SELECT id FROM users WHERE device_id = $1 AND (email IS NULL OR email = \'\') LIMIT 1', [deviceId]);

    let user: any;
    if (deviceUser.rows.length > 0) {
      // 升级匿名用户为注册用户，保留原有收藏和素材数据
      const updateResult = await query(
        `UPDATE users
         SET username = $1,
             email = $2,
             password_hash = $3,
             role = $4,
             artisan_name = $5,
             artisan_contact = $6,
             artisan_craft = $7,
             artisan_description = $8
         WHERE id = $9
         RETURNING ${USER_SELECT_FIELDS}`,
        [
          username,
          email,
          hashedPassword,
          requestedRole,
          savedArtisanName,
          savedArtisanContact,
          savedArtisanCraft,
          savedArtisanDescription,
          deviceUser.rows[0].id,
        ]
      );
      user = updateResult.rows[0];
      console.log(`[AUTH] Upgraded anonymous user ${user.id} to registered: ${email}`);
    } else {
      // 创建新用户
      const insertResult = await query(
        `INSERT INTO users (
           username,
           email,
           password_hash,
           role,
           artisan_name,
           artisan_contact,
           artisan_craft,
           artisan_description
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING ${USER_SELECT_FIELDS}`,
        [
          username,
          email,
          hashedPassword,
          requestedRole,
          savedArtisanName,
          savedArtisanContact,
          savedArtisanCraft,
          savedArtisanDescription,
        ]
      );
      user = insertResult.rows[0];
      console.log(`[AUTH] New user registered: ${email}`);
    }

    // 自动登录 - 签发 token
    const tokens = signTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: '注册成功',
      user: await formatUser(user),
      ...tokens,
    });
  } catch (error: any) {
    console.error('[AUTH] Register error:', error);
    // 数据库连接错误给用户更明确的提示
    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      return res.status(503).json({
        success: false,
        error: '服务暂时不可用，请稍后重试（数据库连接失败）',
        code: 'DB_UNAVAILABLE',
      });
    }
    res.status(500).json({ success: false, error: '注册失败，请稍后重试' });
  }
});

// ============ 登录 ============
router.post('/login', async (req, res) => {
  try {
    const identifier = String(req.body.identifier || req.body.email || '').trim();
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: '请输入邮箱或用户名和密码' });
    }

    // 查找用户
    const result = await query(
      `SELECT ${USER_SELECT_FIELDS}, password_hash
       FROM users
       WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
       LIMIT 1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: '邮箱、用户名或密码不正确' });
    }

    const user = result.rows[0];

    // 验证密码
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: '邮箱、用户名或密码不正确' });
    }

    // 签发 token
    const tokens = signTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // 登录成功后，将当前 device_id 的匿名用户数据迁移到登录用户下
    const deviceId = getDeviceIdentity(req);
    const deviceUser = await query('SELECT id FROM users WHERE device_id = $1 AND id != $2 AND (email IS NULL OR email = \'\') LIMIT 1', [deviceId, user.id]);
    if (deviceUser.rows.length > 0) {
      const oldUserId = deviceUser.rows[0].id;
      // 迁移收藏
      await query('UPDATE favorites SET user_id = $1 WHERE user_id = $2', [user.id, oldUserId]);
      // 迁移素材
      await query('UPDATE materials SET user_id = $1 WHERE user_id = $2', [user.id, oldUserId]);
      // 删除匿名用户
      await query('DELETE FROM users WHERE id = $1', [oldUserId]);
      console.log(`[AUTH] Migrated data from anonymous user ${oldUserId} to ${user.id}`);
    }

    console.log(`[AUTH] User logged in: ${identifier}`);

    res.json({
      success: true,
      message: '登录成功',
      user: await formatUser(user),
      ...tokens,
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      return res.status(503).json({
        success: false,
        error: '服务暂时不可用，请稍后重试（数据库连接失败）',
        code: 'DB_UNAVAILABLE',
      });
    }
    res.status(500).json({ success: false, error: '登录失败，请稍后重试' });
  }
});

// ============ 忘记密码：发送邮箱验证码 ============
router.post('/password-reset/request', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: '请输入正确的邮箱' });
    }

    const userResult = await query('SELECT id, email FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
    if (userResult.rows.length === 0) {
      return res.json({ success: true, message: '如果该邮箱已注册，验证码会发送到邮箱' });
    }

    const user = userResult.rows[0];
    const recentResult = await query(
      `SELECT id FROM password_reset_codes
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '60 seconds'
       LIMIT 1`,
      [user.id]
    );
    if (recentResult.rows.length > 0) {
      return res.status(429).json({ success: false, error: '验证码发送过于频繁，请一分钟后再试' });
    }

    const code = String(randomInt(100000, 1000000));
    const codeHash = hashResetCode(user.id, code);
    const insertResult = await query(
      `INSERT INTO password_reset_codes (user_id, code_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '${RESET_CODE_TTL_MINUTES} minutes')
       RETURNING id`,
      [user.id, codeHash]
    );

    try {
      await sendPasswordResetCode(user.email, code);
    } catch (error) {
      await query('DELETE FROM password_reset_codes WHERE id = $1', [insertResult.rows[0].id]);
      throw error;
    }

    res.json({ success: true, message: '验证码已发送，请检查邮箱' });
  } catch (error: any) {
    console.error('[AUTH] Password reset email error:', error);
    res.status(500).json({ success: false, error: error.message || '验证码发送失败' });
  }
});

// ============ 忘记密码：验证验证码并重置 ============
router.post('/password-reset/confirm', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '').trim();
    const newPassword = String(req.body.newPassword || '');
    if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, error: '邮箱或验证码格式不正确' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: '新密码长度至少6位' });
    }

    const result = await query(
      `SELECT c.id, c.user_id, c.code_hash, c.attempts
       FROM password_reset_codes c
       JOIN users u ON u.id = c.user_id
       WHERE LOWER(u.email) = LOWER($1)
         AND c.used_at IS NULL
         AND c.expires_at > NOW()
       ORDER BY c.created_at DESC
       LIMIT 1`,
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, error: '验证码无效或已过期' });
    }

    const resetCode = result.rows[0];
    if (resetCode.attempts >= RESET_CODE_MAX_ATTEMPTS) {
      return res.status(400).json({ success: false, error: '验证码尝试次数过多，请重新获取' });
    }

    const matches = resetCodeMatches(resetCode.code_hash, hashResetCode(resetCode.user_id, code));
    if (!matches) {
      await query('UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = $1', [resetCode.id]);
      return res.status(400).json({ success: false, error: '验证码不正确' });
    }

    const passwordHash = await hashPassword(newPassword);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, resetCode.user_id]);
    await query('UPDATE password_reset_codes SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [resetCode.user_id]);

    res.json({ success: true, message: '密码已重置，请重新登录' });
  } catch (error) {
    console.error('[AUTH] Password reset confirm error:', error);
    res.status(500).json({ success: false, error: '重置密码失败，请稍后重试' });
  }
});

// ============ 解绑邮箱 ============
router.post('/email/unbind', authMiddleware, async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || '');
    if (!currentPassword) {
      return res.status(400).json({ success: false, error: '请输入当前密码' });
    }

    const result = await query(
      `SELECT ${USER_SELECT_FIELDS}, password_hash FROM users WHERE id = $1 LIMIT 1`,
      [req.user!.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const user = result.rows[0];
    if (!user.email) {
      return res.status(400).json({ success: false, error: '当前账号未绑定邮箱' });
    }
    if (!user.username) {
      return res.status(400).json({ success: false, error: '账号没有用户名，暂时不能解绑邮箱' });
    }
    if (!(await verifyPassword(currentPassword, user.password_hash))) {
      return res.status(400).json({ success: false, error: '当前密码不正确' });
    }

    const updateResult = await query(
      `UPDATE users SET email = NULL WHERE id = $1 RETURNING ${USER_SELECT_FIELDS}`,
      [req.user!.userId]
    );
    res.json({
      success: true,
      message: '邮箱已解绑，后续请使用用户名登录',
      user: await formatUser(updateResult.rows[0]),
    });
  } catch (error) {
    console.error('[AUTH] Unbind email error:', error);
    res.status(500).json({ success: false, error: '解绑邮箱失败，请稍后重试' });
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
    const result = await query(`SELECT ${USER_SELECT_FIELDS} FROM users WHERE id = $1`, [payload.userId]);
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
      user: await formatUser(user),
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
      `SELECT ${USER_SELECT_FIELDS} FROM users WHERE id = $1`,
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: await formatUser(user),
    });
  } catch (error) {
    console.error('[AUTH] Get profile error:', error);
    res.status(500).json({ success: false, error: '获取用户信息失败' });
  }
});

// ============ 上传头像 ============
router.post('/avatar', authMiddleware, avatarUpload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: '请选择头像图片' });
    }

    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ success: false, error: '头像必须是图片格式' });
    }

    const fileKey = `avatars/user_${req.user!.userId}_${Date.now()}${getAvatarExtension(file)}`;
    await storage.uploadFile({
      fileContent: file.buffer,
      fileName: fileKey,
      contentType: file.mimetype || 'image/jpeg',
    });

    const publicUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 86400 * 30,
    });

    const result = await query(
      `UPDATE users
       SET avatar_key = $1,
           avatar_url = $2
       WHERE id = $3
       RETURNING ${USER_SELECT_FIELDS}`,
      [fileKey, publicUrl, req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    res.json({
      success: true,
      user: await formatUser(result.rows[0]),
    });
  } catch (error: any) {
    console.error('[AUTH] Avatar upload error:', error);
    res.status(500).json({ success: false, error: error.message || '上传头像失败' });
  }
});

router.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: '头像不能超过 5MB' });
    }
    return res.status(400).json({ success: false, error: err.message || '上传头像失败' });
  }
  next(err);
});

// ============ 登出 ============
router.post('/logout', authMiddleware, async (_req, res) => {
  // JWT 是无状态的，登出由前端清除 token 即可
  res.json({ success: true, message: '已登出' });
});

export default router;
