import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabaseUrl = process.env.COZE_SUPABASE_URL;
const supabaseKey = process.env.COZE_SUPABASE_ANON_KEY;

// 添加调试日志
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  schema: 'public',
  global: {
    fetch: fetch as any,
    headers: {
      'apikey': supabaseKey,
    },
  },
});

// 导出获取客户端的函数（兼容旧代码）
export function getSupabaseClient() {
  return supabase;
}
