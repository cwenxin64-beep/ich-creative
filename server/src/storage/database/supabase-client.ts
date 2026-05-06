import { createClient } from '@supabase/supabase-js';
import * as dns from 'dns';

const supabaseUrl = process.env.COZE_SUPABASE_URL;
const supabaseKey = process.env.COZE_SUPABASE_ANON_KEY;

// 调试：打印环境变量
console.log('=== Supabase Config Debug ===');
console.log('COZE_SUPABASE_URL:', supabaseUrl);
console.log('COZE_SUPABASE_ANON_KEY exists:', !!supabaseKey);

// 调试：同步测试 DNS 解析
try {
  const hostname = new URL(supabaseUrl).hostname;
  console.log('Testing DNS for:', hostname);
  dns.lookup(hostname, (err, address, family) => {
    if (err) {
      console.error('DNS lookup failed:', err.message);
    } else {
      console.log('DNS lookup success:', address, family);
    }
  });
} catch (e) {
  console.error('DNS test error:', e.message);
}

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
