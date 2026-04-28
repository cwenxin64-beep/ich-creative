import { createClient } from '@supabase/supabase-js';
import { setDefaultResultOrder } from 'dns';

// 设置 DNS 解析优先使用 IPv4
setDefaultResultOrder('ipv4first');

const supabaseUrl = process.env.COZE_SUPABASE_URL;
const supabaseKey = process.env.COZE_SUPABASE_ANON_KEY;

// 添加调试日志
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  schema: 'public',
  global: {
    headers: {
      'apikey': supabaseKey,
    },
  },
});
