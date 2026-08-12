import { readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedNode = 'v24.19.0';
const expectedPnpm = '11.21.0';
const failures = [];

const run = (command, args, options = {}) =>
  spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: false,
    ...options,
  });

const packageJson = JSON.parse(
  await readFile(resolve(repositoryRoot, 'package.json'), 'utf8'),
);
const nodeVersion = (await readFile(resolve(repositoryRoot, '.node-version'), 'utf8')).trim();

if (process.version !== expectedNode) {
  failures.push(`Node.js 版本应为 ${expectedNode}，实际为 ${process.version}`);
}
if (nodeVersion !== expectedNode.slice(1)) {
  failures.push(`.node-version 应为 ${expectedNode.slice(1)}，实际为 ${nodeVersion}`);
}
if (packageJson.packageManager !== `pnpm@${expectedPnpm}`) {
  failures.push(`packageManager 应固定为 pnpm@${expectedPnpm}`);
}

const pnpmVersion = run('pnpm', ['--version']);
if (pnpmVersion.status !== 0 || pnpmVersion.stdout.trim() !== expectedPnpm) {
  failures.push(`pnpm 版本应为 ${expectedPnpm}，实际为 ${pnpmVersion.stdout.trim() || '不可用'}`);
}

const gitRoot = run('git', ['rev-parse', '--show-toplevel']);
if (gitRoot.status !== 0) {
  failures.push('当前目录不是 Git 仓库');
} else {
  const actualRoot = resolve(gitRoot.stdout.trim());
  if (actualRoot.toLowerCase() !== repositoryRoot.toLowerCase()) {
    failures.push(`Git 根目录错误：${actualRoot}`);
  }
}

const remotes = run('git', ['remote']);
if (remotes.status !== 0) {
  failures.push('无法读取 Git 远程配置');
} else if (remotes.stdout.trim()) {
  failures.push(`当前里程碑不允许 Git 远程：${remotes.stdout.trim()}`);
}

const ignoreCanaries = [
  '.env',
  '.env.local',
  'inputs/sample.srt',
  'data/terms.json',
  'work/sample.mp4',
  'storage/app.sqlite3',
  'outputs/export.xlsx',
  'backend/dist/server.js',
  'frontend/node_modules/example/index.js',
  'coverage/lcov.info',
];
const ignored = run('git', ['check-ignore', '--no-index', '--stdin'], {
  input: `${ignoreCanaries.join('\n')}\n`,
});
const ignoredPaths = new Set(ignored.stdout.trim().split(/\r?\n/).filter(Boolean));
for (const canary of ignoreCanaries) {
  if (!ignoredPaths.has(canary)) {
    failures.push(`.gitignore 未覆盖：${canary}`);
  }
}

const candidateFiles = run('git', [
  'ls-files',
  '-z',
  '--cached',
  '--others',
  '--exclude-standard',
]);
if (candidateFiles.status !== 0) {
  failures.push('无法读取 Git 跟踪与候选文件');
} else {
  const paths = candidateFiles.stdout.split('\0').filter(Boolean);
  const blockedExtension = /\.(?:mp4|mkv|mov|avi|wmv|webm|m4v|mpeg|mpg|mp3|wav|flac|aac|m4a|ogg|srt|ass|ssa|vtt|lrc|csv|tsv|xls|xlsx|ods|jsonl|ndjson|parquet|feather|db|sqlite|sqlite3|dump|backup)$/i;
  const blockedTermData = /(?:terms|glossary|terminology|术语).*\.json$/i;
  const blockedRoot = /^(?:inputs|work|outputs|data|storage|uploads|downloads|generated|backups)\//i;
  const blockedGeneratedDirectory = /(?:^|\/)(?:node_modules|dist|build|coverage)(?:\/|$)/i;
  const blockedEnvironment = /(?:^|\/)\.env(?:\.|$)/i;

  for (const path of paths) {
    if (
      blockedExtension.test(path) ||
      blockedTermData.test(path) ||
      blockedRoot.test(path) ||
      blockedGeneratedDirectory.test(path) ||
      blockedEnvironment.test(path)
    ) {
      failures.push(`Git 候选集中存在禁止文件：${path}`);
    }
  }
}

const referenceApplication = resolve(
  repositoryRoot,
  '..',
  'apps',
  'short-drama-terms-workbench',
);
if (!relative(repositoryRoot, referenceApplication).startsWith('..')) {
  failures.push('只读参考应用不得位于新仓库内部');
}

if (failures.length > 0) {
  console.error('仓库基础验证失败：');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log('仓库基础验证通过：独立 Git、工具版本、目录边界和忽略策略均符合要求。');
}
