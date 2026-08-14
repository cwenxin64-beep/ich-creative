import { query, pool } from './pg-client';

// 初始化数据库表
export async function initDatabase() {
  console.log('[DB] Initializing database tables...');

  try {
    // ✅ 关键：先创建用户表（如果不存在）—— 新数据库必须先有表，ALTER 才能执行
    // 旧数据库已有此表时 CREATE IF NOT EXISTS 不会重建
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255),
        email VARCHAR(255),
        password_hash TEXT,
        device_id VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        nickname VARCHAR(255),
        artisan_name VARCHAR(255),
        artisan_contact VARCHAR(255),
        artisan_craft VARCHAR(255),
        artisan_description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 确保用户表有所需的列（兼容已存在的表结构）
    // 先尝试添加可能缺失的列，如果已存在则忽略
    const alterStatements = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS artisan_name VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS artisan_contact VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS artisan_craft VARCHAR(255)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS artisan_description TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
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

    // 创建分享表 - 存储分享的作品数据，用短ID作为分享URL
    await query(`
      CREATE TABLE IF NOT EXISTS shares (
        id VARCHAR(32) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_shares_created_at ON shares(created_at DESC);`);

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

    // 创建素材表
    await query(`
      CREATE TABLE IF NOT EXISTS materials (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        type VARCHAR(50) NOT NULL DEFAULT 'image',
        source_url TEXT,
        title VARCHAR(255),
        description TEXT,
        metadata JSONB DEFAULT '{}',
        source_type VARCHAR(50) DEFAULT 'favorite',
        source_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_materials_user_id ON materials(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_materials_source ON materials(source_type, source_id);`);

    // 创建定制订单表：普通用户提交，手艺人接单；支付字段先预留，后续接微信支付不用重建订单结构
    await query(`
      CREATE TABLE IF NOT EXISTS customization_orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        artisan_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        contact_phone VARCHAR(255),
        contact_wechat VARCHAR(255),
        ich_type VARCHAR(100),
        interaction_type VARCHAR(100),
        application_scene VARCHAR(100),
        keywords TEXT,
        requirements TEXT NOT NULL,
        budget_amount INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'unpaid',
        payment_amount INTEGER DEFAULT 0,
        payment_provider VARCHAR(50),
        payment_order_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        accepted_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const orderAlterStatements = [
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS artisan_id INTEGER REFERENCES users(id) ON DELETE SET NULL`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL DEFAULT '非遗定制需求'`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255)`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(255)`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS contact_wechat VARCHAR(255)`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS ich_type VARCHAR(100)`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS interaction_type VARCHAR(100)`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS application_scene VARCHAR(100)`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS keywords TEXT`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS requirements TEXT NOT NULL DEFAULT ''`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS budget_amount INTEGER DEFAULT 0`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid'`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS payment_amount INTEGER DEFAULT 0`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50)`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS payment_order_id VARCHAR(255)`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
      `ALTER TABLE customization_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
    ];

    for (const sql of orderAlterStatements) {
      try {
        await query(sql);
      } catch {
        // 表结构兼容处理，忽略已存在字段
      }
    }

    await query(`CREATE INDEX IF NOT EXISTS idx_customization_orders_user_id ON customization_orders(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_customization_orders_artisan_id ON customization_orders(artisan_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_customization_orders_status ON customization_orders(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_customization_orders_created_at ON customization_orders(created_at DESC);`);

    console.log('[DB] Database tables initialized successfully');
  } catch (err) {
    console.error('[DB] Failed to initialize tables:', err);
    // 不抛出错误，允许服务继续启动
  }
}
