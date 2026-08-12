import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(frontendRoot, 'dist');

await mkdir(outputRoot, { recursive: true });
await copyFile(resolve(frontendRoot, 'index.html'), resolve(outputRoot, 'index.html'));
console.log('前端骨架构建完成：frontend/dist/index.html');
