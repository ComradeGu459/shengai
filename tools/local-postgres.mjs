import { createHash } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localRoot = resolve(repositoryRoot, '.local');
const postgresStateRoot = 'C:\\tmp\\qimao-terms-cloud-postgres-18.4';
const runtimeRoot = resolve(postgresStateRoot, 'runtime');
const pgRoot = resolve(runtimeRoot, 'pgsql');
const binRoot = resolve(pgRoot, 'bin');
// PostgreSQL 的 Windows 二进制在 initdb 阶段不能可靠处理当前含中文的仓库路径。
// 数据库文件因此放到专用 ASCII 临时根目录，始终与源码和 Git 候选集分离。
const dataRoot = resolve(postgresStateRoot, 'data');
const logPath = resolve(postgresStateRoot, 'postgres.log');
const archivePath = resolve(localRoot, 'postgresql-18.4.zip');
const postgresUrl =
  'https://get.enterprisedb.com/postgresql/postgresql-18.4-1-windows-x64-binaries.zip';
const postgresSha256 = '7effe34c0bf89027b3f171447d351cbc460f4566c8d0f643daec67f140787858';
const port = '55432';
const databaseName = 'qimao_terms_cloud';

const executable = (name) => resolve(binRoot, `${name}.exe`);

const run = (name, args, options = {}) => {
  const result = spawnSync(executable(name), args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${name} 执行失败（退出码 ${result.status ?? '未知'}）`);
  }
  return result;
};

const verifyArchive = async () => {
  const hash = createHash('sha256');
  hash.update(await readFile(archivePath));
  const actual = hash.digest('hex');
  if (actual !== postgresSha256) {
    await rm(archivePath, { force: true });
    throw new Error(`PostgreSQL 压缩包校验失败：${actual}`);
  }
};

const install = async () => {
  if (existsSync(executable('postgres'))) {
    console.log('PostgreSQL 18.4 项目本地运行时已存在。');
    return;
  }

  if (process.platform !== 'win32') {
    throw new Error('自动安装当前只支持 Windows；其他平台请提供 PostgreSQL 18 并设置 DATABASE_URL。');
  }

  await mkdir(localRoot, { recursive: true });
  if (!existsSync(archivePath)) {
    console.log('正在下载 PostgreSQL 18.4 项目本地运行时（约 322 MiB）…');
    const response = await fetch(postgresUrl);
    if (!response.ok || !response.body) {
      throw new Error(`下载 PostgreSQL 失败：HTTP ${response.status}`);
    }
    await pipeline(response.body, createWriteStream(archivePath));
  }
  await verifyArchive();

  await rm(runtimeRoot, { recursive: true, force: true });
  await mkdir(runtimeRoot, { recursive: true });
  const extract = spawnSync(
    'tar.exe',
    ['-xf', archivePath, '-C', runtimeRoot],
    { cwd: repositoryRoot, encoding: 'utf8', stdio: 'inherit' },
  );
  if (extract.status !== 0 || !existsSync(executable('postgres'))) {
    throw new Error('PostgreSQL 运行时解压失败。');
  }
  console.log('PostgreSQL 18.4 已安装到被 Git 忽略的 .local 目录。');
};

const initialize = async () => {
  await install();
  if (existsSync(resolve(dataRoot, 'PG_VERSION'))) {
    return;
  }

  await mkdir(postgresStateRoot, { recursive: true });
  await mkdir(dataRoot, { recursive: true });
  run('initdb', [
    '-D',
    dataRoot,
    '--username=postgres',
    '--encoding=UTF8',
    '--locale=C',
    '--auth-local=trust',
    '--auth-host=trust',
  ]);
  await appendFile(
    resolve(dataRoot, 'postgresql.conf'),
    `\n# qimao-terms-cloud local development only\nlisten_addresses = '127.0.0.1'\nport = ${port}\n`,
    'utf8',
  );
  console.log('本地 PostgreSQL 数据目录已初始化，仅监听 127.0.0.1。');
};

const isReady = () => {
  if (!existsSync(executable('pg_isready'))) {
    return false;
  }
  return run(
    'pg_isready',
    ['-h', '127.0.0.1', '-p', port, '-U', 'postgres'],
    { capture: true, allowFailure: true },
  ).status === 0;
};

const start = async () => {
  await initialize();
  await mkdir(dirname(logPath), { recursive: true });
  if (isReady()) {
    console.log(`PostgreSQL 已在 127.0.0.1:${port} 运行。`);
    return;
  }
  run('pg_ctl', ['-D', dataRoot, '-l', logPath, '-w', 'start']);
  if (!isReady()) {
    throw new Error('PostgreSQL 启动后未通过就绪检查。');
  }
  console.log(`PostgreSQL 已启动：127.0.0.1:${port}`);
};

const ensureDatabase = () => {
  const lookup = run(
    'psql',
    [
      '-h',
      '127.0.0.1',
      '-p',
      port,
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-tAc',
      `SELECT 1 FROM pg_database WHERE datname = '${databaseName}'`,
    ],
    { capture: true },
  );
  if (lookup.stdout.trim() !== '1') {
    run('createdb', [
      '-h',
      '127.0.0.1',
      '-p',
      port,
      '-U',
      'postgres',
      databaseName,
    ]);
    console.log(`已创建本地数据库：${databaseName}`);
  }
};

const stop = () => {
  if (!existsSync(resolve(dataRoot, 'PG_VERSION')) || !isReady()) {
    console.log('本地 PostgreSQL 未运行。');
    return;
  }
  run('pg_ctl', ['-D', dataRoot, '-w', 'stop', '-m', 'fast']);
  console.log('本地 PostgreSQL 已停止。');
};

const status = () => {
  if (!existsSync(executable('postgres'))) {
    console.log('PostgreSQL 项目本地运行时尚未安装。');
    process.exitCode = 1;
    return;
  }
  if (!isReady()) {
    console.log('PostgreSQL 项目本地实例未运行。');
    process.exitCode = 1;
    return;
  }
  const version = run('psql', [
    '-h',
    '127.0.0.1',
    '-p',
    port,
    '-U',
    'postgres',
    '-d',
    databaseName,
    '-tAc',
    'SHOW server_version',
  ], { capture: true });
  console.log(`PostgreSQL ${version.stdout.trim()}，数据库 ${databaseName}，端口 ${port}。`);
};

const command = process.argv[2] ?? 'status';
switch (command) {
  case 'install':
    await install();
    break;
  case 'start':
    await start();
    break;
  case 'setup':
    await start();
    ensureDatabase();
    break;
  case 'stop':
    stop();
    break;
  case 'status':
    status();
    break;
  default:
    throw new Error(`未知命令：${command}`);
}
