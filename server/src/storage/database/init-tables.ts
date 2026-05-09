import { query, pool } from './pg-client';

// 初始化数据库表
export async function initDatabase() {
  console.log('[DB] Initializing database tables...');

  try {
    // 创建用户表
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password_hash TEXT,
        device_id VARCHAR(255) UNIQUE,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 创建收藏表
    await query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        image_url TEXT,
        video_url TEXT,
        title VARCHAR(500) DEFAULT '非遗创意作品',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 创建索引
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_device_id ON users(device_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);`);

    console.log('[DB] Database tables initialized successfully');
  } catch (err) {
    console.error('[DB] Failed to initialize tables:', err);
    // 不抛出错误，允许服务继续启动
  }
}
