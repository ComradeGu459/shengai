import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('后端、前端、测试、部署和文档目录彼此分离', async () => {
  await Promise.all(
    ['backend', 'frontend', 'tests', 'deploy', 'docs'].map((directory) =>
      access(resolve(repositoryRoot, directory)),
    ),
  );
});

test('根包保持私有并固定工具版本', async () => {
  const packageJson = JSON.parse(
    await readFile(resolve(repositoryRoot, 'package.json'), 'utf8'),
  );
  assert.equal(packageJson.private, true);
  assert.equal(packageJson.packageManager, 'pnpm@11.21.0');
  assert.deepEqual(packageJson.volta, {
    node: '24.19.0',
    pnpm: '11.21.0',
  });
});
