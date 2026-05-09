import { Pool } from 'pg';

// 数据库连接配置 - 通过环境变量注入
const databaseUrl = process.env.DATABASE_URL;

console.log('[DB] DATABASE_URL exists:', !!databaseUrl);

// 创建连接池
export const pool = new Pool(
  databaseUrl
    ? { connectionString: databaseUrl, ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'ich_creative',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      }
);

// 测试连接
pool.query('SELECT NOW()')
  .then(() => console.log('[DB] Connected successfully'))
  .catch((err) => console.error('[DB] Connection failed:', err.message));

// 导出查询辅助函数
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('[DB] Query executed:', { text: text.substring(0, 100), duration: `${duration}ms`, rows: res.rowCount });
  return res;
}

// 导出获取客户端的函数（兼容旧代码）
export function getDb() {
  return pool;
}
