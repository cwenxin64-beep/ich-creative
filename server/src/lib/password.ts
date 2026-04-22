import { createHash, randomBytes, timingSafeEqual } from 'crypto';

// 简单的密码哈希函数（使用 PBKDF2 风格）
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256')
    .update(salt + password + 'ich-heritage-salt')
    .digest('hex');
  return `${salt}:${hash}`;
}

// 验证密码
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(':');
    const testHash = createHash('sha256')
      .update(salt + password + 'ich-heritage-salt')
      .digest('hex');
    
    const hashBuffer = Buffer.from(hash, 'hex');
    const testHashBuffer = Buffer.from(testHash, 'hex');
    
    return hashBuffer.length === testHashBuffer.length && 
           timingSafeEqual(hashBuffer, testHashBuffer);
  } catch {
    return false;
  }
}
