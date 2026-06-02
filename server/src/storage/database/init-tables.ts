import { query, pool } from './pg-client';

// 初始化数据库表
export async function initDatabase() {
  console.log('[DB] Initializing database tables...');

  try {
    // 确保用户表有所需的列（兼容已存在的表结构）
    // 先尝试添加可能缺失的列，如果已存在则忽略
    const alterStatements = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(255)`,
      `ALTER TABLE users ALTER COLUMN device_id DROP NOT NULL`,
    ];

    for (const sql of alterStatements) {
      try {
        await query(sql);
      } catch {
        // 列可能已存在，忽略错误
      }
    }

    // 创建 email 唯一索引（如果不存在）
    try {
      await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL`);
    } catch {
      // 索引可能已存在
    }

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
    await query(`CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);`);

    // 创建音乐生成记录表
    await query(`
      CREATE TABLE IF NOT EXISTS music_generations (
        id SERIAL PRIMARY KEY,
        task_id VARCHAR(255) UNIQUE,
        prompt TEXT,
        duration FLOAT,
        genre VARCHAR(255),
        mood VARCHAR(255),
        captions TEXT,
        audio_url TEXT,
        storage_key VARCHAR(500),
        status VARCHAR(50) DEFAULT 'processing',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 创建音乐生成记录索引
    await query(`CREATE INDEX IF NOT EXISTS idx_music_generations_task_id ON music_generations(task_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_music_generations_status ON music_generations(status);`);

    console.log('[DB] Database tables initialized successfully');
  } catch (err) {
    console.error('[DB] Failed to initialize tables:', err);
    // 不抛出错误，允许服务继续启动
  }
}
