import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
  entryPoints: ['src/services/feishu-bitable.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
});

function record(id, title, form = '产品', fields = {}) {
  return { record_id: id, fields: { 非遗名称: title, 非遗形式: form, ...fields } };
}

function loadContext(pages) {
  const requests = [];
  const module = { exports: {} };
  runInNewContext(bundle.outputFiles[0].text, {
    module,
    exports: module.exports,
    process: { env: {
      FEISHU_APP_ID: 'test-app',
      FEISHU_APP_SECRET: 'test-secret',
      FEISHU_BITABLE_APP_TOKEN: 'test-base',
      FEISHU_BITABLE_PRODUCT_TABLE_ID: 'test-table',
    } },
    AbortSignal,
    URLSearchParams,
    async fetch(url, options) {
      if (url.endsWith('/tenant_access_token/internal')) {
        assert.equal(options.method, 'POST');
        return { ok: true, text: async () => JSON.stringify({ code: 0, tenant_access_token: 'test-token' }) };
      }
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      const parsed = new URL(url);
      assert.equal(parsed.pathname, '/open-apis/bitable/v1/apps/test-base/tables/test-table/records');
      requests.push(parsed);
      const page = Number(parsed.searchParams.get('page_token') || 0);
      assert.ok(pages[page], `Unexpected records page: ${page}`);
      return { ok: true, text: async () => JSON.stringify({ code: 0, data: {
        items: pages[page],
        has_more: page + 1 < pages.length,
        page_token: String(page + 1),
      } }) };
    },
  });
  return { ...module.exports, requests };
}

test('创非遗 matches all 景德镇 product titles and excludes other forms and crafts', async () => {
  const service = loadContext([[
    record('ceramic-1', '景德镇青花瓷耳饰', '产品', { 工艺: '瓷胎烧制' }),
    record('poster', '景德镇海报', '海报'),
    record('ru', '汝瓷项链', '产品', { 说明: '对比景德镇陶瓷' }),
    record('ceramic-2', '景德镇陶瓷茶具', '产品', { 工艺: '釉下彩' }),
  ]]);
  const context = await service.getFeishuHeritageContext('景德镇陶瓷');
  assert.equal(context.recordId, 'ceramic-1,ceramic-2');
  assert.equal(context.fields['匹配记录数'], '2');
  assert.match(context.promptContext, /瓷胎烧制/);
  assert.match(context.promptContext, /釉下彩/);
  assert.doesNotMatch(context.promptContext, /海报|汝瓷/);
  assert.equal(context.heritageName, '景德镇陶瓷');
  assert.equal(service.requests.length, 1);
});

test('every built-in 创非遗 label matches the corresponding content title', async () => {
  const cases = [
    ['景德镇陶瓷', '景德镇青花瓷耳饰'],
    ['古琴艺术', '古琴造型香插'],
    ['香云纱', '香云纱手袋'],
    ['汝瓷', '汝瓷茶杯'],
    ['鲁班锁', '鲁班锁摆件'],
    ['桑蚕丝织技艺', '桑蚕丝围巾'],
    ['中国剪纸', '剪纸灯罩'],
    ['太极拳', '太极纹样配饰'],
    ['京剧', '京剧脸谱胸针'],
  ];
  const service = loadContext([cases.map(([, title], i) => record(String(i), title))]);
  for (const [i, [label]] of cases.entries()) {
    const context = await service.getFeishuHeritageContext(label);
    assert.equal(context.recordId, String(i), label);
  }
  assert.equal(service.requests.length, 1, 'records remain cached across lookups');
});

test('玩非遗 keeps all four forms isolated from product records', async () => {
  const cases = [['poster', '海报'], ['festival', '节日卡'], ['birthday', '生日卡'], ['newyear', '新年卡']];
  const service = loadContext([[
    record('product', '景德镇陶瓷耳饰'),
    ...cases.map(([type, form]) => record(type, `景德镇${form}设计`, form)),
  ]]);
  for (const [type] of cases) {
    const context = await service.getFeishuPlayHeritageContext(type, '景德镇');
    assert.equal(context.recordId, type);
  }
});

test('rich text, whitespace, pagination and all matching evidence are supported', async () => {
  const service = loadContext([
    [record('first', [{ text: ' 景 德 镇 ' }, { text: '青花耳饰' }], [{ text: ' 产品 ' }], { 附件: 'private-url' })],
    [record('second', '景德镇陶瓷项链')],
  ]);
  const context = await service.getFeishuHeritageContext(' 景德镇陶瓷 ');
  assert.equal(context.recordId, 'first,second');
  assert.equal(service.requests[1].searchParams.get('page_token'), '1');
  assert.doesNotMatch(context.promptContext, /private-url/);
});

test('custom heritage uses only its own name and missing evidence still fails', async () => {
  const service = loadContext([[
    record('custom', '潮绣手工香囊'),
    record('other', '景德镇青花瓷耳饰'),
  ]]);
  assert.equal((await service.getFeishuHeritageContext('潮绣')).recordId, 'custom');
  for (const name of ['不存在的技艺', '其他', '景德镇陶瓷新技艺']) {
    await assert.rejects(service.getFeishuHeritageContext(name), /没有找到标题包含/);
  }
  await assert.rejects(service.getFeishuHeritageContext('   '), /非遗名称不能为空/);
});
