import * as esbuild from 'esbuild';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import tsconfigPaths from 'tsconfig-paths';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const serverDir = dirname(fileURLToPath(import.meta.url));
const pkg = require('./package.json');
const dependencies = pkg.dependencies || {};
const externalList = Object.keys(dependencies).filter(dep => dep !== 'dayjs');

// 读取 tsconfig.json 获取路径别名配置
const tsconfig = JSON.parse(readFileSync(resolve(serverDir, 'tsconfig.json'), 'utf-8'));
const baseUrl = resolve(serverDir, tsconfig.compilerOptions?.baseUrl || '.');
const paths = tsconfig.compilerOptions?.paths || {};

// 配置 tsconfig-paths
tsconfigPaths.register({
  baseUrl,
  paths,
});

try {
  await esbuild.build({
    absWorkingDir: serverDir,
    entryPoints: [resolve(serverDir, 'src/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outdir: resolve(serverDir, 'dist'),
    external: externalList,
    resolveExtensions: ['.ts', '.js'],
  });
  console.log('⚡ Build complete!');
} catch (e) {
  console.error(e);
  process.exit(1);
}
