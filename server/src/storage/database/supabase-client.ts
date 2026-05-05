import { createClient } from '@supabase/supabase-js';
import { lookup } from 'dns/promises';

const supabaseUrl = process.env.COZE_SUPABASE_URL;
const supabaseKey = process.env.COZE_SUPABASE_ANON_KEY;

// 调试：打印环境变量
console.log('=== Supabase Config Debug ===');
console.log('COZE_SUPABASE_URL:', supabaseUrl);
console.log('COZE_SUPABASE_ANON_KEY exists:', !!supabaseKey);

// 调试：测试 DNS 解析
async function testDNS() {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    console.log('Testing DNS for:', hostname);
    const result = await lookup(hostname);
    console.log('DNS lookup success:', result);
  } catch (err) {
    console.error('DNS lookup failed:', err.message);
  }
}
testDNS();

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
