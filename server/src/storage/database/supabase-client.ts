import { createClient } from '@supabase/supabase-js';
import * as dns from 'dns';
import { lookup } from 'dns/promises';

// 强制 IPv4 优先
dns.setDefaultResultOrder('ipv4first');

const supabaseUrl = process.env.COZE_SUPABASE_URL;
const supabaseKey = process.env.COZE_SUPABASE_ANON_KEY;

console.log('[Supabase] URL:', supabaseUrl);
console.log('[Supabase] Key exists:', !!supabaseKey);

// 详细 DNS 调试
async function debugDNS() {
  try {
    const hostname = new URL(supabaseUrl).hostname;

    // 测试1：用默认 DNS 解析 Supabase 域名
    console.log('[DNS Debug] Resolving:', hostname);
    const result = await lookup(hostname);
    console.log('[DNS Debug] Lookup result:', result);
  } catch (err) {
    console.error('[DNS Debug] Lookup failed:', err.message);

    // 测试2：尝试解析其他外网域名，确认是 DNS 问题还是网络问题
    try {
      const testResult = await lookup('www.baidu.com');
      console.log('[DNS Debug] baidu.com resolved:', testResult.address);
    } catch (err2) {
      console.error('[DNS Debug] baidu.com also failed:', err2.message);
    }

    // 测试3：用 Google DNS (8.8.8.8) 解析
    try {
      const resolver = new dns.promises.Resolver();
      resolver.setServers(['8.8.8.8', '1.1.1.1']);
      const googleResult = await resolver.resolve4(new URL(supabaseUrl).hostname);
      console.log('[DNS Debug] Google DNS resolved:', googleResult);
    } catch (err3) {
      console.error('[DNS Debug] Google DNS also failed:', err3.message);
    }
  }
}
debugDNS();

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
