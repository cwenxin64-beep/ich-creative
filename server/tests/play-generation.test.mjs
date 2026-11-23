import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { build } from 'esbuild';

const serverDir = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(new URL('../package.json', import.meta.url));
const mocks = {
  '../task-queue': 'export const taskStore = globalThis.fixture.taskStore;',
  '../services/object-storage': 'export const createObjectStorage = () => ({});',
  '../services/feishu-bitable': 'export const getFeishuPlayHeritageContext = globalThis.fixture.getContext;',
};
const bundle = await build({
  absWorkingDir: serverDir,
  entryPoints: ['src/routes/play.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['express'],
  write: false,
  plugins: [{
    name: 'generation-dependencies',
    setup(builder) {
      builder.onResolve({ filter: /^\.\.\/(?:task-queue|services\/(?:object-storage|feishu-bitable))$/ }, args => ({
        path: args.path,
        namespace: 'fixture',
      }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ contents: mocks[args.path] }));
    },
  }],
});

async function generate(productType) {
  const task = { id: 'test-task', status: 'pending', progress: 0 };
  const progress = [];
  const contextTypes = [];
  const imageRequests = [];
  let finish;
  const finished = new Promise(resolve => { finish = resolve; });
  const fixture = {
    taskStore: {
      create: () => task,
      update(id, updates) {
        assert.equal(id, task.id);
        Object.assign(task, updates);
        if (updates.progress !== undefined) progress.push(updates.progress);
        if (updates.status === 'completed' || updates.status === 'failed') finish(task);
      },
    },
    async getContext(type, heritageName) {
      assert.equal(heritageName, '景德镇');
      contextTypes.push(type);
      return { tableName: 'heritage', tableId: 'table', recordId: type, promptContext: 'Database heritage evidence' };
    },
  };
  const module = { exports: {} };
  runInNewContext(bundle.outputFiles[0].text, {
    module,
    exports: module.exports,
    require,
    fixture,
    process: { env: { VOLCENGINE_API_KEY: 'test-only' } },
    console: { log() {}, error() {}, warn() {} },
    AbortSignal,
    setTimeout,
    async fetch(url, options) {
      const body = JSON.parse(options.body);
      if (url.endsWith('/chat/completions')) {
        assert.match(body.messages[1].content, /Database heritage evidence/);
        return { ok: true, json: async () => ({ choices: [{ message: { content: 'Heritage design prompt' } }] }) };
      }
      assert.ok(url.endsWith('/images/generations'), `Unexpected external request: ${url}`);
      imageRequests.push(body);
      const imageUrl = `https://example.invalid/image-${imageRequests.length}.png`;
      return { ok: true, json: async () => ({ data: [{ url: imageUrl }] }) };
    },
  });
  let created;
  module.exports.default.handle({
    method: 'POST',
    url: '/generate',
    headers: {},
    body: { text: 'Heritage poster', ichType: 'jingdezhen', productType, targetMarket: 'america' },
  }, {
    status(code) { throw new Error(`Task creation failed: ${code}`); },
    json(body) { created = body; },
  }, error => { throw error || new Error('Generation route not matched'); });
  assert.equal(created.taskId, task.id);
  await finished;
  return { task, progress, contextTypes, imageRequests };
}

for (const [productType, expectedTypes] of [
  ['poster', ['poster']],
  ['all', ['poster', 'festival', 'birthday', 'newyear']],
]) {
  test(`database generation completes after rendering ${productType}`, { timeout: 3000 }, async () => {
    const { task, progress, contextTypes, imageRequests } = await generate(productType);
    assert.equal(task.status, 'completed', task.error);
    assert.equal(task.result.success, true);
    assert.equal(task.result.provider, 'feishu-volcengine');
    assert.deepEqual(Array.from(task.result.results, result => result.type), expectedTypes);
    assert.deepEqual(contextTypes, expectedTypes);
    assert.equal(imageRequests.length, expectedTypes.length * 3);
    assert.equal(progress.at(-1), 100);
    assert.ok(progress.every((value, i) => value >= 0 && value <= 100 && (i === 0 || value >= progress[i - 1])));
    for (let i = 0; i < expectedTypes.length; i++) {
      const result = task.result.results[i];
      assert.equal(imageRequests[i * 3 + 1].image, result.mainImageUrl);
      assert.equal(imageRequests[i * 3 + 2].image, result.mainImageUrl);
      assert.equal(new Set([result.mainImageUrl, result.subImageUrl1, result.subImageUrl2]).size, 3);
    }
  });
}
