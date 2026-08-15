import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('仓库骨架', () => {
  it('后端、前端、契约、测试、部署和文档目录彼此分离', async () => {
    await Promise.all(
      ['backend', 'frontend', 'packages/contracts', 'tests', 'deploy', 'docs'].map(
        (directory) => access(resolve(repositoryRoot, directory)),
      ),
    );
  });

  it('根包保持私有并固定工具版本', async () => {
    const packageJson = JSON.parse(
      await readFile(resolve(repositoryRoot, 'package.json'), 'utf8'),
    );
    expect(packageJson.private).toBe(true);
    expect(packageJson.packageManager).toBe('pnpm@11.21.0');
    expect(packageJson.volta).toEqual({
      node: '24.19.0',
      pnpm: '11.21.0',
    });
  });
});
