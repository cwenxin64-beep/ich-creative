import { createClient } from '@supabase/supabase-js';
import { setDefaultResultOrder } from 'dns';

// 必须在创建 Supabase 客户端之前设置
setDefaultResultOrder('ipv4first');

const supabaseUrl = process.env.COZE_SUPABASE_URL;
const supabaseKey = process.env.COZE_SUPABASE_ANON_KEY;

console.log('[Supabase] URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  schema: 'public',
  global: {
    headers: {
      'apikey': supabaseKey,
    },
  },
});

// 导出获取客户端的函数（兼容旧代码）
export function getSupabaseClient() {
  return supabase;
}
