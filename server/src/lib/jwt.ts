import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ich-heritage-jwt-secret-2024';
const JWT_EXPIRES_IN = '7d'; // access token 有效期 7 天
const REFRESH_EXPIRES_IN = '30d'; // refresh token 有效期 30 天

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

// 签发 access token
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// 签发 refresh token
export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

// 签发一对 token
export function signTokens(payload: TokenPayload): Tokens {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

// 验证 token
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload & { type?: string };
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

// 验证 refresh token（确保是 refresh 类型）
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload & { type?: string };
    if (decoded.type !== 'refresh') return null;
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}
