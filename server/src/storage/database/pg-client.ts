import { Pool, PoolConfig } from 'pg';

// ==================== 数据库连接配置 ====================
// 兼容多种环境变量名: DATABASE_URL (Docker/CloudBase) / PGDATABASE_URL (Coze/沙箱) / POSTGRES_URL
const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.PGDATABASE_URL ||
  process.env.POSTGRES_URL;

// 脱敏输出（只显示 hostname，不显示密码）
function maskUrl(url: string | undefined): string {
  if (!url) return 'NONE';
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username}@${u.hostname}:${u.port}${u.pathname}`;
  } catch {
    return 'INVALID_URL';
  }
}

const source = process.env.DATABASE_URL
  ? 'DATABASE_URL'
  : process.env.PGDATABASE_URL
  ? 'PGDATABASE_URL'
  : process.env.POSTGRES_URL
  ? 'POSTGRES_URL'
  : 'NONE';

console.log('[DB] Config:', { source, url: maskUrl(databaseUrl), ssl: process.env.DB_SSL === 'true' });

// ==================== 连接池配置 ====================
const poolConfig: PoolConfig = databaseUrl
  ? {
      connectionString: databaseUrl,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      // 连接池优化
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ich_creative',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

export const pool = new Pool(poolConfig);

// ==================== 启动时测试连接（带重试） ====================
async function testConnection(retries = 5, delayMs = 3000): Promise<void> {
  for (let i = 1; i <= retries; i++) {
    try {
      const result = await pool.query('SELECT NOW() as now, version()');
      console.log('[DB] ✅ Connected successfully');
      console.log('[DB] Server time:', result.rows[0].now);
      console.log('[DB] Version:', result.rows[0].version.substring(0, 50));
      return;
    } catch (err: any) {
      const isLast = i === retries;
      console.error(`[DB] ❌ Connection attempt ${i}/${retries} failed:`, err.message);

      if (err.code === 'ENOTFOUND') {
        console.error('[DB] 💡 错误原因：DNS 解析失败');
        console.error('[DB] 💡 可能原因：1) 容器无法访问外部网络  2) 域名拼写错误  3) DNS 服务器配置问题');
        console.error('[DB] 💡 解决方案：');
        console.error('[DB]    - 检查 CloudBase 容器是否配置了出站公网访问');
        console.error('[DB]    - 或将数据库迁移到 CloudBase 自带数据库');
        console.error('[DB]    - 或检查 DATABASE_URL 域名是否正确');
      } else if (err.code === 'ECONNREFUSED') {
        console.error('[DB] 💡 错误原因：连接被拒绝，端口不可达');
      } else if (err.code === 'ETIMEDOUT') {
        console.error('[DB] 💡 错误原因：连接超时');
      } else if (err.code === '28P01') {
        console.error('[DB] 💡 错误原因：认证失败（用户名或密码错误）');
      } else if (err.code === '3D000') {
        console.error('[DB] 💡 错误原因：数据库不存在');
      }

      if (isLast) {
        console.error('[DB] ⛔ 所有重试都失败，数据库功能将不可用');
        return;
      }

      console.log(`[DB] ⏳ ${delayMs / 1000}秒后重试...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

// 异步执行，不阻塞启动
testConnection().catch((err) => {
  console.error('[DB] Fatal error during connection test:', err);
});

// ==================== 查询辅助函数（带错误处理） ====================
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn('[DB] Slow query:', { text: text.substring(0, 100), duration: `${duration}ms` });
    }
    return res;
  } catch (err: any) {
    console.error('[DB] Query failed:', {
      text: text.substring(0, 100),
      error: err.message,
      code: err.code,
    });
    throw err;
  }
}

// ==================== 兼容旧代码 ====================
export function getDb() {
  return pool;
}
