#!/usr/bin/env node

import { lstatSync, unlinkSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { spawnSync } from 'node:child_process';

const TEMP_ROOT_PREFIX = '/tmp/qimao-asr-';
const DEFAULT_DATABASE_FILE = 'database.env';
export const CANONICAL_BUSINESS_IDENTITY = Object.freeze({ user: 'qimao', group: 'qimao' });
const FORMAL_ROLES = Object.freeze({ bootstrap: 'qimao-deploy', business: CANONICAL_BUSINESS_IDENTITY.user });
export const FROZEN_RELEASE_ENTRY = 'backend/dist/workers/asr.worker.entry.js';
export const CLEANUP_ORDER = Object.freeze([
  'cancel_unfinished_commands',
  'delete_known_cos_objects_and_head_404',
  'stop_loopback_and_workers',
  'terminate_and_drop_isolated_database',
  'remove_release_env_harness_media_temp',
]);

class HarnessError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const fail = (code, message) => { throw new HarnessError(code, message); };

export const STAGE_CODES = Object.freeze({
  identity: 'IDENTITY_CHECK_FAILED',
  ownershipRoot: 'OWNERSHIP_ROOT_FAILED',
  ownershipArchive: 'OWNERSHIP_ARCHIVE_FAILED',
  ownershipRelease: 'OWNERSHIP_RELEASE_FAILED',
  ownershipMedia: 'OWNERSHIP_MEDIA_FAILED',
  ownershipBusiness: 'OWNERSHIP_BUSINESS_FAILED',
  archiveDigest: 'ARCHIVE_DIGEST_FAILED',
  mediaDigest: 'MEDIA_DIGEST_FAILED',
  providerInstall: 'PROVIDER_INSTALL_FAILED',
  databaseEnvInstall: 'DATABASE_ENV_INSTALL_FAILED',
  qimaoReadability: 'QIMAO_READABILITY_FAILED',
  databaseCreate: 'DATABASE_CREATE_FAILED',
  databaseDrop: 'DATABASE_DROP_FAILED',
  cleanup: 'CLEANUP_FAILED',
});

export const READABILITY_CODES = Object.freeze({
  BACKEND_ENV: 'BACKEND_ENV_READABILITY_FAILED',
  OBJECT_STORAGE_ENV: 'OBJECT_STORAGE_ENV_READABILITY_FAILED',
  PROVIDER_ENV: 'PROVIDER_ENV_READABILITY_FAILED',
  DATABASE_ENV: 'DATABASE_ENV_READABILITY_FAILED',
  MEDIA: 'MEDIA_READABILITY_FAILED',
  BUSINESS: 'BUSINESS_READABILITY_FAILED',
  RELEASE_ENTRY: 'RELEASE_ENTRY_READABILITY_FAILED',
});

export const resolveReadabilityCode = (label) => {
  const code = READABILITY_CODES[label];
  if (!code) fail('READABILITY_LABEL_INVALID', 'readability label 未声明。');
  return code;
};

export const resolveStageCode = (stage) => {
  const code = STAGE_CODES[stage];
  if (!code) fail('STAGE_INVALID', '阶段标签未声明。');
  return code;
};

const parseArgs = (argv) => {
  const result = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--self-test' || token === '--prepare' || token === '--drop-db' || token === '--cleanup') {
      result.set(token.slice(2), true);
      continue;
    }
    if (!token?.startsWith('--')) fail('ARGUMENT_INVALID', '参数必须使用长选项。');
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) fail('ARGUMENT_MISSING', `缺少参数 ${token} 的值。`);
    result.set(key, value);
    index += 1;
  }
  return result;
};

const option = (args, name) => {
  const value = args.get(name);
  if (typeof value !== 'string' || !value.trim()) fail('ARGUMENT_MISSING', `缺少 --${name}。`);
  return value.trim();
};

export const dispatchCommand = (args) => {
  const commands = ['self-test', 'prepare', 'drop-db', 'cleanup'].filter((name) => args.get(name) === true);
  if (commands.length === 0) fail('COMMAND_MISSING', '仅支持 --self-test、--prepare、--drop-db、--cleanup。');
  if (commands.length > 1) fail('COMMAND_CONFLICT', '一次只能选择一个命令。');
  return commands[0];
};

export const assertCommandArguments = (command, args) => {
  const required = {
    prepare: ['root', 'archive', 'release', 'env-dir', 'media', 'business', 'provider-source', 'db-name', 'archive-sha', 'media-sha', 'media-bytes'],
    'drop-db': ['db-name'],
    cleanup: ['root'],
  }[command] ?? [];
  for (const name of required) option(args, name);
  return command;
};

const isSafeTempRoot = (value) => {
  const root = posix.resolve(value);
  return root.startsWith(TEMP_ROOT_PREFIX) && root !== TEMP_ROOT_PREFIX && !root.endsWith('/');
};

export const assertSafeTempRoot = (value) => {
  if (!isSafeTempRoot(value)) fail('TEMP_ROOT_UNSAFE', '临时根必须是 /tmp/qimao-asr-* 下的具体目录。');
  return posix.resolve(value);
};

export const assertWithin = (rootValue, childValue) => {
  const root = posix.resolve(rootValue);
  const child = posix.resolve(childValue);
  const relative = posix.relative(root, child);
  if (!relative || relative === '..' || relative.startsWith(`..${posix.sep}`) || posix.isAbsolute(relative)) {
    fail('PATH_OUTSIDE_ROOT', `${child} 不在临时根内。`);
  }
  return child;
};

export const assertEnvDir = (rootValue, envDirValue) => {
  const root = assertSafeTempRoot(rootValue);
  if (typeof envDirValue !== 'string' || !envDirValue.trim()) fail('ENV_DIR_REQUIRED', 'prepare 必须提供 root 内具体 env-dir。');
  const envDir = posix.resolve(envDirValue);
  if (envDir === root) fail('ENV_DIR_INVALID', 'env-dir 必须是 root 内的具体目录。');
  return assertWithin(root, envDir);
};

export const deriveProviderTarget = (envDirValue) => posix.join(posix.resolve(envDirValue), 'provider.env');

export const createProviderEvidence = ({ envDir, target, stat, sha256 }) => {
  const expectedTarget = deriveProviderTarget(envDir);
  if (target !== expectedTarget) fail('PROVIDER_TARGET_MISMATCH', 'provider target 数据流不一致。');
  if (stat === undefined || sha256 === undefined) fail('PROVIDER_EVIDENCE_FIELDS_INVALID', 'provider evidence 字段不完整。');
  return Object.freeze({ target, stat, sha256 });
};

export const assertNoProviderTarget = (args) => {
  if (args.has('provider-target')) fail('PROVIDER_TARGET_FORBIDDEN', 'provider target 只能由 env-dir 派生。');
};

export const assertReleasePath = (rootValue, releaseValue) => {
  const root = assertSafeTempRoot(rootValue);
  if (typeof releaseValue !== 'string' || !releaseValue.trim()) fail('RELEASE_REQUIRED', 'prepare 必须提供 release。');
  return assertWithin(root, releaseValue);
};

export const resolveReleaseEntry = (releaseValue) => {
  if (typeof releaseValue !== 'string' || !releaseValue.trim()) fail('RELEASE_REQUIRED', 'release 入口必须位于 release 树内。');
  const release = posix.resolve(releaseValue);
  return assertWithin(release, posix.join(release, FROZEN_RELEASE_ENTRY));
};

export const createOwnershipPlan = ({ root: rootValue, archive: archiveValue, release: releaseValue, media: mediaValue, business: businessValue }) => {
  const root = assertSafeTempRoot(rootValue);
  const archive = assertWithin(root, archiveValue);
  const release = assertReleasePath(root, releaseValue);
  const media = assertWithin(root, mediaValue);
  const business = assertWithin(root, businessValue);
  const owner = `qimao-deploy:${CANONICAL_BUSINESS_IDENTITY.group}`;
  return Object.freeze({
    root: Object.freeze({ path: root, owner, mode: '0750' }),
    archive: Object.freeze({ path: archive, owner, mode: '0640' }),
    release: Object.freeze({ path: release, owner, directoryMode: '0750', fileMode: '0640' }),
    media: Object.freeze({ path: media, owner, mode: '0640' }),
    business: Object.freeze({ path: business, owner, mode: '0640' }),
  });
};

export const assertFormalMjs = (value, role) => {
  if (!posix.basename(value).endsWith('.mjs')) fail('FORMAL_MJS_REQUIRED', `${role} 文件必须以 .mjs 结尾。`);
  return value;
};

export const assertDatabaseName = (value) => {
  if (!/^qimao_asr_05a_[a-z0-9_]+$/.test(value)) fail('DATABASE_NAME_INVALID', '隔离数据库名必须使用 qimao_asr_05a_ 前缀。');
  return value;
};

export const createIsolatedDatabaseUrl = (dbName) => {
  assertDatabaseName(dbName);
  return `postgresql:///${encodeURIComponent(dbName)}?host=${encodeURIComponent('/var/run/postgresql')}`;
};

const renderDatabaseEnv = (dbName) => `DATABASE_URL=${createIsolatedDatabaseUrl(dbName)}\n`;

export const assertMediaIdentity = ({ bytes, sha256, expectedBytes, expectedSha256 }) => {
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 1) fail('MEDIA_BYTES_INVALID', '媒体字节数必须为正整数。');
  if (bytes !== expectedBytes) fail('MEDIA_BYTES_MISMATCH', '媒体字节数与固定输入不一致。');
  if (!/^[0-9a-f]{64}$/.test(expectedSha256) || sha256 !== expectedSha256) fail('MEDIA_SHA_MISMATCH', '媒体 SHA-256 与固定输入不一致。');
};

export const validateIdentity = (actualUser, role) => {
  const expected = FORMAL_ROLES[role];
  if (!expected || actualUser !== expected) fail('IDENTITY_MISMATCH', `${role} 必须以 ${expected} 身份运行。`);
  return { role, user: actualUser };
};

export const createLifecyclePlan = (input) => {
  const root = assertSafeTempRoot(input.root);
  const business = assertFormalMjs(assertWithin(root, input.business), 'business');
  const bootstrap = assertFormalMjs(assertWithin(root, input.bootstrap), 'bootstrap');
  assertDatabaseName(input.dbName);
  assertMediaIdentity({
    bytes: input.mediaBytes,
    sha256: input.mediaSha,
    expectedBytes: input.mediaBytes,
    expectedSha256: input.mediaSha,
  });
  return Object.freeze({
    root,
    business,
    bootstrap,
    dbName: input.dbName,
    identities: FORMAL_ROLES,
    providerReadRole: FORMAL_ROLES.business,
    externalPolicy: Object.freeze({ createRecTaskMaximum: 1, unknown: 'same_task_id_get_head_only' }),
    cleanupOrder: CLEANUP_ORDER,
  });
};

const expectReject = (callback, code) => {
  try {
    callback();
  } catch (error) {
    if (error?.code === code) return;
    throw error;
  }
  fail('SELF_TEST_EXPECTED_FAILURE', `未得到 ${code}。`);
};

export const runSelfTest = () => {
  const mediaSha = 'a'.repeat(64);
  const base = {
    root: '/tmp/qimao-asr-05a-self-test',
    business: '/tmp/qimao-asr-05a-self-test/bin/business.mjs',
    archive: '/tmp/qimao-asr-05a-self-test/candidate.tar.gz',
    bootstrap: '/tmp/qimao-asr-05a-self-test/bin/bootstrap.mjs',
    release: '/tmp/qimao-asr-05a-self-test/release',
    envDir: '/tmp/qimao-asr-05a-self-test/env',
    media: '/tmp/qimao-asr-05a-self-test/media.mp4',
    dbName: 'qimao_asr_05a_self_test',
    mediaBytes: 17,
    mediaSha,
  };
  const happy = createLifecyclePlan(base);
  if (CANONICAL_BUSINESS_IDENTITY.user !== 'qimao' || CANONICAL_BUSINESS_IDENTITY.group !== 'qimao') fail('BUSINESS_IDENTITY_DRIFT', '业务用户与组必须固定为 qimao。');
  if (happy.providerReadRole !== CANONICAL_BUSINESS_IDENTITY.user || happy.externalPolicy.createRecTaskMaximum !== 1) fail('SELF_TEST_HAPPY', 'happy 合同不完整。');
  for (const [label, code] of Object.entries(READABILITY_CODES)) {
    if (resolveReadabilityCode(label) !== code || !code.endsWith('_READABILITY_FAILED')) fail('READABILITY_CODE_MAPPING_INVALID', 'readability code 映射不稳定。');
  }
  expectReject(() => resolveReadabilityCode('UNKNOWN'), 'READABILITY_LABEL_INVALID');
  const isolatedDbName = 'qimao_asr_05a_self_test';
  if (createIsolatedDatabaseUrl(isolatedDbName) !== 'postgresql:///qimao_asr_05a_self_test?host=%2Fvar%2Frun%2Fpostgresql') fail('DATABASE_URL_GENERATION_INVALID', '隔离数据库 URL 生成不符合 Unix socket 合同。');
  const ownership = createOwnershipPlan(base);
  if (ownership.root.owner !== `qimao-deploy:${CANONICAL_BUSINESS_IDENTITY.group}` || ownership.root.mode !== '0750' || ownership.archive.owner !== `qimao-deploy:${CANONICAL_BUSINESS_IDENTITY.group}` || ownership.archive.mode !== '0640' || ownership.release.owner !== `qimao-deploy:${CANONICAL_BUSINESS_IDENTITY.group}` || ownership.release.directoryMode !== '0750' || ownership.release.fileMode !== '0640' || ownership.media.owner !== `qimao-deploy:${CANONICAL_BUSINESS_IDENTITY.group}` || ownership.media.mode !== '0640' || ownership.business.mode !== '0640') {
    fail('OWNERSHIP_PLAN_INVALID', 'ownership plan 未固定为 qimao 可穿透的 canonical 计划。');
  }
  const legacyOwnership = createOwnershipPlan({ ...base, requestedOwnership: { root: 'qimao-deploy:qimao-deploy', release: 'root:qimao-deploy', media: 'root:qimao' } });
  if (JSON.stringify(legacyOwnership) !== JSON.stringify(ownership)) fail('OWNERSHIP_PLAN_DRIFT', '旧 05B ownership 参数未被 canonical 化。');
  if (resolveReleaseEntry(base.release) !== '/tmp/qimao-asr-05a-self-test/release/backend/dist/workers/asr.worker.entry.js') fail('RELEASE_ENTRY_RESOLUTION_INVALID', '冻结 release 入口解析结果不精确。');
  expectReject(() => assertReleasePath(base.root, ''), 'RELEASE_REQUIRED');
  expectReject(() => assertReleasePath(base.root, '/opt/qimao-terms-cloud/release'), 'PATH_OUTSIDE_ROOT');
  if (resolveStageCode('mediaDigest') !== 'MEDIA_DIGEST_FAILED' || resolveStageCode('providerInstall') !== 'PROVIDER_INSTALL_FAILED' || resolveStageCode('databaseEnvInstall') !== 'DATABASE_ENV_INSTALL_FAILED' || resolveStageCode('qimaoReadability') !== 'QIMAO_READABILITY_FAILED') {
    fail('STAGE_CODE_MAPPING_INVALID', '阶段码映射不稳定。');
  }
  expectReject(() => resolveStageCode('inline'), 'STAGE_INVALID');
  for (const [command, tokens] of [['prepare', ['--prepare']], ['drop-db', ['--drop-db']], ['cleanup', ['--cleanup']]]) {
    const parsed = parseArgs(tokens);
    if (dispatchCommand(parsed) !== command || parsed.get('self-test') === true) fail('COMMAND_DISPATCH_INVALID', `${command} 错误落入 self-test。`);
    expectReject(() => assertCommandArguments(command, parsed), 'ARGUMENT_MISSING');
  }
  const prepareTokens = [
    '--prepare',
    '--root', base.root,
    '--archive', base.archive,
    '--release', base.release,
    '--env-dir', base.envDir,
    '--media', base.media,
    '--business', base.business,
    '--provider-source', `${base.root}/provider.tmp`,
    '--db-name', base.dbName,
    '--archive-sha', mediaSha,
    '--media-sha', mediaSha,
    '--media-bytes', String(base.mediaBytes),
  ];
  const preparedArgs = parseArgs(prepareTokens);
  if (dispatchCommand(preparedArgs) !== 'prepare' || preparedArgs.has('provider-target')) fail('PREPARE_ARGUMENT_PLAN_INVALID', '05F prepare 参数计划不符合 canonical 形态。');
  assertCommandArguments('prepare', preparedArgs);
  assertNoProviderTarget(preparedArgs);
  const canonicalEnvDir = assertEnvDir(base.root, option(preparedArgs, 'env-dir'));
  if (canonicalEnvDir !== base.envDir) fail('ENV_DIR_CANONICAL_INVALID', 'env-dir 未被解析为 root 内具体目录。');
  const providerTarget = deriveProviderTarget(canonicalEnvDir);
  if (providerTarget !== '/tmp/qimao-asr-05a-self-test/env/provider.env') fail('PROVIDER_TARGET_DERIVATION_INVALID', 'provider target 派生结果不精确。');
  const providerEvidence = createProviderEvidence({ envDir: canonicalEnvDir, target: providerTarget, stat: 'root:qimao:640:1', sha256: mediaSha });
  if (JSON.stringify(providerEvidence) !== JSON.stringify({ target: providerTarget, stat: 'root:qimao:640:1', sha256: mediaSha }) || providerEvidence.target !== '/tmp/qimao-asr-05a-self-test/env/provider.env') fail('PROVIDER_TARGET_RETURN_INVALID', 'provider evidence 未返回精确 target。');
  const providerReadabilityEntry = { label: 'PROVIDER_ENV', code: READABILITY_CODES.PROVIDER_ENV, target: providerEvidence.target };
  const preparedProvider = { target: providerEvidence.target, stat: providerEvidence.stat, sha256: providerEvidence.sha256 };
  if (providerReadabilityEntry.target !== preparedProvider.target) fail('PROVIDER_TARGET_DATA_FLOW_INVALID', 'readability entry 与 prepared result 未复用同一 target。');
  expectReject(() => createProviderEvidence({ envDir: canonicalEnvDir, target: providerTarget, stat: 'root:qimao:640:1' }), 'PROVIDER_EVIDENCE_FIELDS_INVALID');
  expectReject(() => createProviderEvidence({ envDir: canonicalEnvDir, target: `${canonicalEnvDir}/other.env`, stat: 'root:qimao:640:1', sha256: mediaSha }), 'PROVIDER_TARGET_MISMATCH');
  const missingEnvDir = new Map(preparedArgs);
  missingEnvDir.delete('env-dir');
  expectReject(() => assertCommandArguments('prepare', missingEnvDir), 'ARGUMENT_MISSING');
  expectReject(() => assertEnvDir(base.root, '/opt/qimao-asr-env'), 'PATH_OUTSIDE_ROOT');
  const legacyProviderTarget = new Map(preparedArgs);
  legacyProviderTarget.set('provider-target', `${base.root}/other/provider.env`);
  expectReject(() => assertNoProviderTarget(legacyProviderTarget), 'PROVIDER_TARGET_FORBIDDEN');
  const legacyCanonicalTarget = new Map(preparedArgs);
  legacyCanonicalTarget.set('provider-target', deriveProviderTarget(base.envDir));
  expectReject(() => assertNoProviderTarget(legacyCanonicalTarget), 'PROVIDER_TARGET_FORBIDDEN');
  expectReject(() => createLifecyclePlan({ ...base, business: `${base.business}.stage` }), 'FORMAL_MJS_REQUIRED');
  expectReject(() => validateIdentity('qimao-deploy', 'business'), 'IDENTITY_MISMATCH');
  expectReject(() => assertMediaIdentity({ bytes: 17, sha256: 'b'.repeat(64), expectedBytes: 17, expectedSha256: mediaSha }), 'MEDIA_SHA_MISMATCH');
  if (JSON.stringify(CLEANUP_ORDER) !== JSON.stringify([
    'cancel_unfinished_commands',
    'delete_known_cos_objects_and_head_404',
    'stop_loopback_and_workers',
    'terminate_and_drop_isolated_database',
    'remove_release_env_harness_media_temp',
  ])) fail('CLEANUP_ORDER_INVALID', '清理顺序发生漂移。');
  return {
    component: 'bootstrap',
    outcome: 'passed',
    cases: ['happy', 'business_identity_group', 'readability_code_mapping', 'unknown_readability_label', 'database_url_generation', 'ownership_plan', 'release_required', 'release_within_root', 'stage_code_mapping', 'command_dispatch', 'prepare_env_dir_required', 'env_dir_within_root', 'provider_target_derivation', 'provider_target_return', 'provider_target_data_flow', 'provider_target_missing_fields_rejected', 'provider_target_mismatch_rejected', 'legacy_provider_target_rejected', '05f_prepare_without_provider_target', 'wrong_extension', 'wrong_identity', 'media_sha_mismatch', 'cleanup_order'],
    createRecTaskMaximum: 1,
    providerReadRole: 'qimao',
  };
};

const runCommand = (stage, command, args, options = {}) => {
  const code = resolveStageCode(stage);
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    ...options,
  });
  if (result.error || result.status !== 0) fail(code, `${code}。`);
  return String(result.stdout ?? '').trim();
};

const requireDirectory = (value, label, code = 'ROOT_OWNERSHIP_FAILED') => {
  let stat;
  try { stat = lstatSync(value); } catch { fail(code, `${label} 不存在。`); }
  if (!stat.isDirectory()) fail(code, `${label} 不是目录。`);
  return stat;
};

const requireRegularFile = (value, label, code = 'FILE_INPUT_FAILED') => {
  let stat;
  try { stat = lstatSync(value); } catch { fail(code, `${label} 不存在。`); }
  if (!stat.isFile()) fail(code, `${label} 不是普通文件。`);
  return stat;
};

const digestFile = (stage, value) => {
  const output = runCommand(stage, 'sha256sum', [value]);
  const digest = output.split(/\s+/)[0]?.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(digest ?? '')) fail(resolveStageCode(stage), `${resolveStageCode(stage)}。`);
  return digest;
};

const applyOwnershipPlan = (plan) => {
  runCommand('ownershipRoot', 'sudo', ['-n', 'chown', plan.root.owner, '--', plan.root.path]);
  runCommand('ownershipRoot', 'sudo', ['-n', 'chmod', plan.root.mode, '--', plan.root.path]);
  runCommand('ownershipArchive', 'sudo', ['-n', 'chown', plan.archive.owner, '--', plan.archive.path]);
  runCommand('ownershipArchive', 'sudo', ['-n', 'chmod', plan.archive.mode, '--', plan.archive.path]);
  runCommand('ownershipRelease', 'sudo', ['-n', 'find', plan.release.path, '-xdev', '-type', 'd', '-exec', 'chown', plan.release.owner, '--', '{}', '+']);
  runCommand('ownershipRelease', 'sudo', ['-n', 'find', plan.release.path, '-xdev', '-type', 'd', '-exec', 'chmod', plan.release.directoryMode, '--', '{}', '+']);
  runCommand('ownershipRelease', 'sudo', ['-n', 'find', plan.release.path, '-xdev', '-type', 'f', '-exec', 'chown', plan.release.owner, '--', '{}', '+']);
  runCommand('ownershipRelease', 'sudo', ['-n', 'find', plan.release.path, '-xdev', '-type', 'f', '-exec', 'chmod', plan.release.fileMode, '--', '{}', '+']);
  runCommand('ownershipMedia', 'sudo', ['-n', 'chown', plan.media.owner, '--', plan.media.path]);
  runCommand('ownershipMedia', 'sudo', ['-n', 'chmod', plan.media.mode, '--', plan.media.path]);
  runCommand('ownershipBusiness', 'sudo', ['-n', 'chown', plan.business.owner, '--', plan.business.path]);
  runCommand('ownershipBusiness', 'sudo', ['-n', 'chmod', plan.business.mode, '--', plan.business.path]);
};

const installProvider = ({ source, envDir }) => {
  const target = deriveProviderTarget(envDir);
  requireRegularFile(source, 'provider 临时文件', 'PROVIDER_INSTALL_FAILED');
  runCommand('providerInstall', 'sudo', ['-n', 'install', '-d', '-o', 'root', '-g', CANONICAL_BUSINESS_IDENTITY.group, '-m', '0750', envDir]);
  runCommand('providerInstall', 'sudo', ['-n', 'install', '-o', 'root', '-g', CANONICAL_BUSINESS_IDENTITY.group, '-m', '0640', source, target]);
  const stat = runCommand('providerInstall', 'sudo', ['-n', 'stat', '-c', '%U:%G:%a:%s', target]);
  const sha256 = runCommand('providerInstall', 'sudo', ['-n', 'sha256sum', target]).split(/\s+/)[0]?.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(sha256 ?? '')) fail('PROVIDER_INSTALL_FAILED', 'PROVIDER_INSTALL_FAILED。');
  return createProviderEvidence({ envDir, target, stat, sha256 });
};

const installDatabaseEnv = ({ root, envDir, dbName }) => {
  const target = posix.join(posix.resolve(envDir), DEFAULT_DATABASE_FILE);
  const source = assertWithin(root, posix.join(root, `.database.env.${process.pid}`));
  try {
    try {
      writeFileSync(source, renderDatabaseEnv(dbName), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    } catch {
      fail('DATABASE_ENV_INSTALL_FAILED', 'database.env 临时文件生成失败。');
    }
    runCommand('databaseEnvInstall', 'sudo', ['-n', 'install', '-o', 'root', '-g', CANONICAL_BUSINESS_IDENTITY.group, '-m', '0640', source, target]);
    const stat = runCommand('databaseEnvInstall', 'sudo', ['-n', 'stat', '-c', '%U:%G:%a:%s', target]);
    return { target, stat };
  } finally {
    try {
      unlinkSync(source);
    } catch (error) {
      if (error?.code !== 'ENOENT') fail('DATABASE_ENV_INSTALL_FAILED', 'database.env 临时文件清理失败。');
    }
  }
};

const assertQimaoReadable = (entries) => {
  for (const entry of entries) {
    const expectedCode = resolveReadabilityCode(entry?.label);
    if (entry?.code !== expectedCode) fail('READABILITY_CODE_INVALID', 'readability code 未按固定 label 映射。');
    const code = entry.code;
    try {
      runCommand('qimaoReadability', 'sudo', ['-n', '-u', CANONICAL_BUSINESS_IDENTITY.user, '-g', CANONICAL_BUSINESS_IDENTITY.group, '--', 'test', '-r', entry.target]);
    } catch {
      fail(code, `${code}。`);
    }
  }
};

const prepare = (args) => {
  validateIdentity(runCommand('identity', 'id', ['-un']), 'bootstrap');
  const root = assertSafeTempRoot(option(args, 'root'));
  const envDir = assertEnvDir(root, option(args, 'env-dir'));
  assertNoProviderTarget(args);
  const archive = assertWithin(root, option(args, 'archive'));
  const release = assertReleasePath(root, option(args, 'release'));
  const media = assertWithin(root, option(args, 'media'));
  const business = assertFormalMjs(assertWithin(root, option(args, 'business')), 'business');
  const providerSource = option(args, 'provider-source');
  const dbName = assertDatabaseName(option(args, 'db-name'));
  const expectedArchiveSha = option(args, 'archive-sha').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expectedArchiveSha)) fail('ARCHIVE_SHA_INVALID', 'archive SHA 必须为 64 位十六进制。');
  const expectedMediaSha = option(args, 'media-sha').toLowerCase();
  const expectedMediaBytes = Number(option(args, 'media-bytes'));
  requireDirectory(root, 'staging root');
  requireRegularFile(archive, 'candidate archive', 'ARCHIVE_DIGEST_FAILED');
  requireDirectory(release, 'release tree', 'OWNERSHIP_RELEASE_FAILED');
  const mediaStat = requireRegularFile(media, '媒体', 'MEDIA_DIGEST_FAILED');
  requireRegularFile(business, 'business harness', 'OWNERSHIP_BUSINESS_FAILED');
  const releaseEntry = resolveReleaseEntry(release);
  requireRegularFile(releaseEntry, '冻结 release 入口', 'QIMAO_READABILITY_FAILED');
  const ownership = createOwnershipPlan({ root, archive, release, media, business });
  applyOwnershipPlan(ownership);
  const archiveSha = digestFile('archiveDigest', archive);
  if (archiveSha !== expectedArchiveSha) fail('ARCHIVE_SHA_MISMATCH', 'candidate archive SHA 不一致。');
  const mediaSha = digestFile('mediaDigest', media);
  assertMediaIdentity({ bytes: mediaStat.size, sha256: mediaSha, expectedBytes: expectedMediaBytes, expectedSha256: expectedMediaSha });
  const provider = installProvider({ source: providerSource, envDir });
  const databaseEnv = installDatabaseEnv({ root, envDir, dbName });
  assertQimaoReadable([
    { label: 'BACKEND_ENV', code: READABILITY_CODES.BACKEND_ENV, target: `${envDir}/backend.env` },
    { label: 'OBJECT_STORAGE_ENV', code: READABILITY_CODES.OBJECT_STORAGE_ENV, target: `${envDir}/object-storage.env` },
    { label: 'PROVIDER_ENV', code: READABILITY_CODES.PROVIDER_ENV, target: provider.target },
    { label: 'DATABASE_ENV', code: READABILITY_CODES.DATABASE_ENV, target: databaseEnv.target },
    { label: 'MEDIA', code: READABILITY_CODES.MEDIA, target: media },
    { label: 'BUSINESS', code: READABILITY_CODES.BUSINESS, target: business },
    { label: 'RELEASE_ENTRY', code: READABILITY_CODES.RELEASE_ENTRY, target: releaseEntry },
  ]);
  runCommand('databaseCreate', 'sudo', ['-n', '-u', 'postgres', '--', 'createdb', `--owner=${CANONICAL_BUSINESS_IDENTITY.user}`, dbName]);
  return {
    component: 'bootstrap',
    outcome: 'prepared',
    root,
    release,
    releaseEntry,
    archiveSha,
    media: { bytes: mediaStat.size, sha256: mediaSha },
    provider: { target: provider.target, stat: provider.stat, sha256: provider.sha256 },
    databaseEnv: { target: databaseEnv.target, stat: databaseEnv.stat },
    database: dbName,
    providerReadRole: CANONICAL_BUSINESS_IDENTITY.user,
    externalPolicy: { createRecTaskMaximum: 1, unknown: 'same_task_id_get_head_only' },
  };
};

const dropDatabase = (args) => {
  validateIdentity(runCommand('identity', 'id', ['-un']), 'bootstrap');
  const dbName = assertDatabaseName(option(args, 'db-name'));
  runCommand('databaseDrop', 'sudo', ['-n', '-u', 'postgres', '--', 'dropdb', '--if-exists', '--force', dbName]);
  return { component: 'bootstrap', outcome: 'database_dropped', database: dbName };
};

const cleanup = (args) => {
  validateIdentity(runCommand('identity', 'id', ['-un']), 'bootstrap');
  const root = assertSafeTempRoot(option(args, 'root'));
  runCommand('cleanup', 'sudo', ['-n', 'rm', '-rf', '--', root]);
  return { component: 'bootstrap', outcome: 'temp_root_removed', root };
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const command = dispatchCommand(args);
  if (command === 'self-test') {
    console.log(JSON.stringify(runSelfTest()));
    return;
  }
  assertCommandArguments(command, args);
  let result;
  if (command === 'prepare') result = prepare(args);
  else if (command === 'drop-db') result = dropDatabase(args);
  else if (command === 'cleanup') result = cleanup(args);
  console.log(JSON.stringify(result));
};

try {
  main();
} catch (error) {
  const code = error instanceof HarnessError ? error.code : 'UNEXPECTED_FAILURE';
  console.error(JSON.stringify({ component: 'bootstrap', outcome: 'blocked', code }));
  process.exitCode = 1;
}
