import { createRequire } from 'node:module';
import { build } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.resolve('vite'));
const esbuild = require('esbuild');
await build({ configFile: 'learning-platform/vite.config.ts' });
await esbuild.build({
  entryPoints: ['learning-platform/worker.ts'],
  outfile: 'learning-platform/dist/_worker.js',
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  conditions: ['workerd', 'worker', 'browser'],
  external: ['node:*', 'cloudflare:*'],
  minify: true,
  define: { 'process.env.NODE_ENV': '"production"' },
});
await writeFile(
  'learning-platform/dist/_routes.json',
  JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }),
);
// Prevent Wrangler discovering the parent Vinext deployment redirect.
await mkdir('learning-platform/.wrangler/deploy', { recursive: true });
await writeFile(
  'learning-platform/.wrangler/deploy/config.json',
  JSON.stringify({ configPath: '../../wrangler.jsonc' }),
);
console.log('Learning platform build complete.');
