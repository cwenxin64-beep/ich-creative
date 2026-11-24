import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { build } from 'esbuild';

const require = createRequire(new URL('../package.json', import.meta.url));
const mocks = {
  '../task-queue': 'export const taskStore = globalThis.fixture.taskStore;',
  '../services/object-storage': 'export const createObjectStorage = () => ({}); export const extractObjectStorageKey = () => "";',
  '../storage/database/pg-client': 'export const query = () => { throw new Error("Unexpected order database query"); };',
  './auth': 'export const authMiddleware = (req, res, next) => next();',
};
const bundle = await build({
  absWorkingDir: fileURLToPath(new URL('../', import.meta.url)),
  entryPoints: ['src/routes/use.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['express'],
  write: false,
  plugins: [{ name: 'isolate-order-services', setup(builder) {
    builder.onResolve({ filter: /^(?:\.\.\/(?:task-queue|services\/object-storage|storage\/database\/pg-client)|\.\/auth)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path] }));
  } }],
});

for (const hasEvidence of [true, false]) {
  test(`创非遗 request ${hasEvidence ? 'completes using real title matching' : 'fails before generation when product evidence is missing'}`, { timeout: 3000 }, async () => {
    const task = { id: 'test-use-task', status: 'pending' };
    const imageRequests = [];
    let resolveTask;
    const finished = new Promise(resolve => { resolveTask = resolve; });
    const module = { exports: {} };
    runInNewContext(bundle.outputFiles[0].text, {
      module, exports: module.exports, require, AbortSignal, URLSearchParams,
      console: { log() {}, error() {} },
      process: { env: {
        VOLCENGINE_API_KEY: 'test-model-key',
        FEISHU_APP_ID: 'test-app', FEISHU_APP_SECRET: 'test-secret',
        FEISHU_BITABLE_APP_TOKEN: 'test-base', FEISHU_BITABLE_PRODUCT_TABLE_ID: 'test-table',
      } },
      fixture: { taskStore: {
        create: () => task,
        update(id, updates) {
          assert.equal(id, task.id);
          Object.assign(task, updates);
          if (['completed', 'failed'].includes(updates.status)) resolveTask();
        },
      } },
      async fetch(url, options) {
        let payload;
        if (url.endsWith('/tenant_access_token/internal')) {
          payload = { code: 0, tenant_access_token: 'test-token' };
        } else if (url.includes('/records?')) {
          payload = { code: 0, data: { items: [{
            record_id: 'ceramic-product',
            fields: { 非遗名称: '景德镇青花瓷耳饰', 非遗形式: hasEvidence ? '产品' : '海报', 工艺: '瓷胎烧制' },
          }] } };
        } else if (url.endsWith('/chat/completions')) {
          assert.ok(hasEvidence);
          const content = JSON.parse(options.body).messages[1].content;
          assert.match(content, /景德镇陶瓷/);
          assert.match(content, /景德镇青花瓷耳饰/);
          assert.match(content, /瓷胎烧制/);
          payload = { choices: [{ message: { content: '真实陶瓷产品摄影提示词' } }] };
        } else {
          assert.ok(url.endsWith('/images/generations'), `Unexpected request: ${url}`);
          imageRequests.push(JSON.parse(options.body));
          payload = { data: [{ url: `https://example.invalid/product-${imageRequests.length}.png` }] };
        }
        return { ok: true, text: async () => JSON.stringify(payload), json: async () => payload };
      },
    });
    let response;
    await module.exports.default.handle({ method: 'POST', url: '/customize', headers: {}, body: {
      ichType: 'jingdezhen', keywords: '简约青花瓷耳饰', interactionType: 'chinese', applicationScene: 'fashion',
    } }, {
      status(code) { throw new Error(`Unexpected response: ${code}`); },
      json(value) { response = value; },
    }, error => { throw error || new Error('Route did not match'); });
    assert.equal(response.taskId, task.id);
    await finished;
    if (!hasEvidence) {
      assert.equal(task.status, 'failed');
      assert.match(task.error, /没有找到标题包含/);
      assert.equal(imageRequests.length, 0);
      return;
    }
    assert.equal(task.status, 'completed', task.error);
    assert.equal(task.progress, 100);
    assert.equal(task.result.provider, 'feishu-volcengine');
    const [product] = task.result.results;
    assert.equal(product.metadata.recordId, 'ceramic-product');
    assert.equal(product.category, 'fashion');
    assert.equal(imageRequests.length, 3);
    assert.equal(imageRequests[1].image, product.mainImageUrl);
    assert.equal(imageRequests[2].image, product.mainImageUrl);
  });
}
