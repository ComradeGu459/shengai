#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const TEMP_ROOT_PREFIX = '/tmp/qimao-asr-';
const ENV_DIR = '/etc/qimao-terms-cloud';
const DATABASE_ENV_FILE = 'database.env';
export const CANONICAL_BUSINESS_IDENTITY = Object.freeze({ user: 'qimao', group: 'qimao' });
export const DATABASE_ENVIRONMENT_KEYS = Object.freeze([
  'DATABASE_URL', 'PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD',
  'PGSERVICE', 'PGSERVICEFILE', 'PGSSLMODE', 'PGOPTIONS',
]);
const DATABASE_ENVIRONMENT_KEY_SET = new Set(DATABASE_ENVIRONMENT_KEYS);
export const MIGRATION_GATE_ORDER = Object.freeze([
  'assign_effective_env',
  'create_explicit_pool',
  'verify_current_database_and_user',
  'import_migrate',
]);
const CLEANUP_ORDER = Object.freeze([
  'cancel_unfinished_commands',
  'delete_known_cos_objects_and_head_404',
  'stop_loopback_and_workers',
  'terminate_and_drop_isolated_database',
  'remove_release_env_harness_media_temp',
]);
const FIXED_SRT = Buffer.from('1\n00:00:00,000 --> 00:00:03,000\n隔离合成测试句。\n\n', 'utf8');
const SYNTHETIC_MANIFEST_ROOT_NAME = '素材根';
const syntheticManifestPath = (fileName) => `${SYNTHETIC_MANIFEST_ROOT_NAME}/${fileName}`;
const UPLOAD_CHECKSUM_ALGORITHM = 'sha256';
const BUDGET_WARNING_LIMIT = '9';
const BUDGET_HARD_LIMIT = '10';
const BUDGET_GATE_LABELS = Object.freeze(['CREATE', 'TEST', 'IMPACT', 'APPROVE', 'PUBLISH']);
const SOURCE_SRT_SET_DIGEST = /^[0-9a-f]{64}$/u;
const CONNECTION_SCREEN_TEXT_MODULE = 'modules/screen-text/screen-text.adapter-registry.js';
const SYSTEM_CAPABILITIES = Object.freeze([
  'system-control:read', 'system-control:engines:read', 'system-control:engines:write',
  'system-control:engines:test', 'system-control:routing:read', 'system-control:routing:write',
  'system-control:routing:publish', 'budget:read', 'budget:write', 'budget:publish', 'system-control:logs:read',
]);

class HarnessError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const fail = (code, message) => { throw new HarnessError(code, message); };

const SAFE_STAGE_CODE = /^[A-Z][A-Z0-9_]{2,80}$/u;
const TENCENT_ASR_CONFIGURATION_CODES = new Set([
  'CONFIG_INVALID',
  'CONFIG_INCOMPLETE',
  'DISABLED_IN_PRODUCTION',
  'SDK_UNAVAILABLE',
]);
export const WORKER_ENTRY_IMPORTS = Object.freeze({
  core: 'workers/asr.worker.js',
  entry: 'workers/asr.worker.entry.js',
});

/**
 * 业务子进程只把稳定阶段码交给外层 runner；错误对象/消息永不透传。
 * CreateRecTask 的调用前失败与调用后未知由调用点产生的稳定码区分，
 * 例如 ASR_CREATE_NOT_ATTEMPTED 与 ASR_CREATE_UNKNOWN。
 */
export const safeBusinessFailureCode = (error) => {
  if (!(error instanceof HarnessError) || typeof error.code !== 'string' || !SAFE_STAGE_CODE.test(error.code)) {
    return 'UNEXPECTED_FAILURE';
  }
  return error.code;
};

export const businessBlockedSummary = (error) => Object.freeze({
  component: 'business',
  outcome: 'blocked',
  code: safeBusinessFailureCode(error),
});

export const stageFailureCode = (stage, error) => {
  if (error instanceof HarnessError && error.code === 'API_GATE_FAILED') return `${stage}_API_GATE_FAILED`;
  return error instanceof HarnessError ? error.code : `UNEXPECTED_${stage}`;
};

export const projectAsrRegistryError = (error) => {
  if (!(error instanceof Error)
    || error.name !== 'TencentAsrConfigurationError'
    || error.constructor?.name !== 'TencentAsrConfigurationError'
    || !TENCENT_ASR_CONFIGURATION_CODES.has(error.code)) return null;
  return `TENCENT_ASR_${error.code}`;
};

export const readWorkspaceSourceSrtSetDigest = (workspace) => {
  const digest = workspace?.source?.sourceSrtSetDigest;
  if (typeof digest !== 'string' || !SOURCE_SRT_SET_DIGEST.test(digest)) fail('TERMS_WORKSPACE_DIGEST_MISSING', '术语 workspace 未返回有效来源 digest。');
  return digest;
};

export const extractAcceptedDispatchBatch = (group, termVersionId) => {
  const acceptedResult = group?.results?.find((result) => result?.acceptanceStatus === 'accepted');
  if (!acceptedResult?.batchId) fail('ASR_DISPATCH_BATCH_MISSING', 'dispatch accepted result 未返回 batch。');
  if (acceptedResult.eligibility?.termVersionId !== termVersionId) fail('ASR_DISPATCH_TERM_VERSION_MISMATCH', 'dispatch accepted result 术语版本不一致。');
  return String(acceptedResult.batchId);
};

export const runStage = async (stage, action) => {
  try {
    return await action();
  } catch (error) {
    if (error instanceof HarnessError && error.code !== 'API_GATE_FAILED') throw error;
    fail(stageFailureCode(stage, error), '阶段异常已收敛为稳定码。');
  }
};

export const projectBudgetApiErrorCode = (gateLabel, response) => {
  if (!BUDGET_GATE_LABELS.includes(gateLabel)) return null;
  const errorCode = response?.error?.code;
  if (typeof errorCode !== 'string' || !SAFE_STAGE_CODE.test(errorCode)) return null;
  const projected = `BUDGET_${gateLabel}_API_${errorCode}`;
  return SAFE_STAGE_CODE.test(projected) ? projected : null;
};

const ASR_CREATE_NOT_ATTEMPTED = 'ASR_CREATE_NOT_ATTEMPTED';
const ASR_CREATE_UNKNOWN = 'ASR_CREATE_UNKNOWN';
const ASR_CREATE_NOT_OBSERVABLE = 'ASR_CREATE_NOT_OBSERVABLE';
const ASR_CREATE_ACTUAL_NOT_OBSERVABLE = 'ASR_CREATE_ACTUAL_NOT_OBSERVABLE';
export const PRECREATE_DIAGNOSTIC_OUTCOME = 'precreate_ready';
export const shouldPreserveReconciliation = (status) => status === 'accepted' || status === 'unknown';

export const createPrecreateDiagnosticResult = () => Object.freeze({
  component: 'business',
  outcome: PRECREATE_DIAGNOSTIC_OUTCOME,
  evidence: Object.freeze({
    asrWorkerRunOnce: false,
    externalCreateCount: 0,
    tencentWrites: 0,
    dispatchPrepared: true,
  }),
  speechTextEmitted: false,
});

/**
 * 把 AsrWorker 的唯一结果映射为可审计的外部创建阶段事实。
 * Worker 只在 completed 时证明一次完成的 CreateRecTask；failed 因缺少 provider 身份事实保持不可观测，其余结果不制造第二次创建。
 */
export const classifyAsrWorkerOutcome = (result) => {
  if (!result || result.processed !== true) {
    return Object.freeze({ status: 'not_attempted', code: ASR_CREATE_NOT_ATTEMPTED, externalCreateCount: 0 });
  }
  if (result.outcome === 'cancelled') {
    return Object.freeze({ status: 'not_attempted', code: ASR_CREATE_NOT_ATTEMPTED, externalCreateCount: 0 });
  }
  if (result.outcome === 'failed') {
    return Object.freeze({ status: 'not_observable', code: ASR_CREATE_ACTUAL_NOT_OBSERVABLE, externalCreateCount: null });
  }
  if (result.outcome === 'reconciliation_required') {
    return Object.freeze({ status: 'unknown', code: ASR_CREATE_UNKNOWN, externalCreateCount: null });
  }
  if (result.outcome === 'completed') {
    return Object.freeze({ status: 'completed', code: null, externalCreateCount: 1 });
  }
  return Object.freeze({ status: 'not_observable', code: ASR_CREATE_NOT_OBSERVABLE, externalCreateCount: null });
};

const flattenObjects = (value, seen = new Set()) => {
  if (!value || typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  const values = [value];
  for (const child of Object.values(value)) values.push(...flattenObjects(child, seen));
  return values;
};

/** 只把同一 batch 的持久事实投影为安全阶段，不返回 TaskId 或其他供应商字段。 */
export const classifyPersistedAsrFact = (batch) => {
  const objects = flattenObjects(batch);
  const attempts = objects.filter((value) => value && typeof value === 'object'
    && ('providerRequestId' in value || 'externalSideEffectPossible' in value || 'effectClass' in value
      || 'budgetReservationId' in value || 'budgetReservationStatus' in value || 'reservationStatus' in value));
  const unknown = attempts.some((attempt) => attempt.externalSideEffectPossible === true
    || attempt.effectClass === 'external_unknown'
    || attempt.status === 'reconciliation_required'
    || attempt.budgetReservationStatus === 'reconciliation_required'
    || attempt.reservationStatus === 'reconciliation_required');
  // 只要存在 unknown 证据，优先于已持久化的 providerRequestId，避免把竞态误报为已接受终态。
  if (unknown) return Object.freeze({ status: 'unknown', code: ASR_CREATE_UNKNOWN, externalCreateCount: null });
  const accepted = attempts.some((attempt) => typeof attempt.providerRequestId === 'string' && attempt.providerRequestId.length > 0);
  const acceptedFailure = attempts.find((attempt) => accepted
    && attempt.status === 'failed'
    && typeof attempt.errorCode === 'string' && SAFE_STAGE_CODE.test(attempt.errorCode));
  if (acceptedFailure) return Object.freeze({ status: 'accepted_failed', code: acceptedFailure.errorCode, errorCode: acceptedFailure.errorCode, externalCreateCount: 1 });
  if (accepted) return Object.freeze({ status: 'accepted', code: 'ASR_TASK_ACCEPTED', externalCreateCount: null });
  if (attempts.length > 0 && attempts.every((attempt) => attempt.providerRequestId == null
    && attempt.externalSideEffectPossible === false
    && attempt.effectClass !== 'external_unknown')) {
    const errorCode = attempts.map((attempt) => attempt.errorCode ?? attempt.reasonCode ?? attempt.failureCode)
      .find((value) => typeof value === 'string' && SAFE_STAGE_CODE.test(value)) ?? null;
    return Object.freeze({ status: 'not_attempted', code: errorCode ?? ASR_CREATE_NOT_ATTEMPTED, stageCode: ASR_CREATE_NOT_ATTEMPTED, errorCode, externalCreateCount: 0 });
  }
  return Object.freeze({ status: 'not_observable', code: ASR_CREATE_ACTUAL_NOT_OBSERVABLE, stageCode: ASR_CREATE_ACTUAL_NOT_OBSERVABLE, errorCode: null, externalCreateCount: null });
};

const parseArgs = (argv) => {
  const result = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--self-test' || token === '--run' || token === '--precreate-diagnostic') {
      result.set(token.slice(2), true);
      continue;
    }
    if (!token?.startsWith('--')) fail('ARGUMENT_INVALID', '参数必须使用长选项。');
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) fail('ARGUMENT_MISSING', `缺少参数 ${token} 的值。`);
    result.set(token.slice(2), value.trim());
    index += 1;
  }
  return result;
};

const option = (args, name) => {
  const value = args.get(name);
  if (typeof value !== 'string' || !value) fail('ARGUMENT_MISSING', `缺少 --${name}。`);
  return value;
};

const assertSafeTempRoot = (value) => {
  const root = posix.resolve(value);
  if (!root.startsWith(TEMP_ROOT_PREFIX) || root === TEMP_ROOT_PREFIX || root.endsWith('/')) {
    fail('TEMP_ROOT_UNSAFE', '临时根必须是 /tmp/qimao-asr-* 下的具体目录。');
  }
  return root;
};

const assertWithin = (rootValue, childValue) => {
  const root = posix.resolve(rootValue);
  const child = posix.resolve(childValue);
  const relative = posix.relative(root, child);
  if (!relative || relative === '..' || relative.startsWith(`..${posix.sep}`) || posix.isAbsolute(relative)) {
    fail('PATH_OUTSIDE_ROOT', `${child} 不在临时根内。`);
  }
  return child;
};

const assertFormalMjs = (value, role) => {
  if (!posix.basename(value).endsWith('.mjs')) fail('FORMAL_MJS_REQUIRED', `${role} 文件必须以 .mjs 结尾。`);
  return value;
};

const assertDatabaseName = (value) => {
  if (!/^qimao_asr_05a_[a-z0-9_]+$/.test(value)) fail('DATABASE_NAME_INVALID', '隔离数据库名前缀不正确。');
  return value;
};

export const createIsolatedDatabaseUrl = (dbName) => {
  assertDatabaseName(dbName);
  return `postgresql:///${encodeURIComponent(dbName)}?host=${encodeURIComponent('/var/run/postgresql')}`;
};

export const parseIsolatedDatabaseUrl = (value, dbName) => {
  assertDatabaseName(dbName);
  if (typeof value !== 'string' || !value.startsWith('postgresql:///')) fail('DATABASE_URL_INVALID', '隔离数据库 URL scheme 不正确。');
  let parsed;
  try { parsed = new URL(value); } catch { fail('DATABASE_URL_INVALID', '隔离数据库 URL 无法解析。'); }
  const queryKeys = [...parsed.searchParams.keys()];
  if (parsed.protocol !== 'postgresql:'
    || parsed.hostname !== ''
    || parsed.username !== ''
    || parsed.password !== ''
    || parsed.port !== ''
    || parsed.pathname !== `/${dbName}`
    || parsed.hash !== ''
    || queryKeys.length !== 1
    || queryKeys[0] !== 'host'
    || parsed.searchParams.get('host') !== '/var/run/postgresql') {
    fail('DATABASE_URL_INVALID', '隔离数据库 URL 必须使用无凭据 Unix socket。');
  }
  return Object.freeze({ database: dbName, host: '/var/run/postgresql' });
};

export const parseDatabaseEnvText = (text, dbName) => {
  if (typeof text !== 'string') fail('DATABASE_ENV_INVALID', 'database.env 内容无效。');
  const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  if (lines.length !== 1 || !lines[0].startsWith('DATABASE_URL=')) fail('DATABASE_ENV_KEYS_INVALID', 'database.env 只能包含 DATABASE_URL。');
  const value = lines[0].slice('DATABASE_URL='.length).trim();
  parseIsolatedDatabaseUrl(value, dbName);
  return Object.freeze({ DATABASE_URL: value });
};

export const normalizeDatabasePeerRow = (row) => Object.freeze({
  databaseName: row?.database_name,
  userName: row?.user_name,
});

export const assertDatabasePeerIdentity = (actual, expectedDatabase) => {
  if (actual?.databaseName !== expectedDatabase || actual?.userName !== CANONICAL_BUSINESS_IDENTITY.user) fail('DATABASE_PEER_MISMATCH', '数据库 peer 身份不符合隔离合同。');
  return Object.freeze({ databaseName: actual.databaseName, userName: actual.userName });
};

export const validateIdentity = (actualUser, role) => {
  const expected = CANONICAL_BUSINESS_IDENTITY.user;
  if (role !== 'business' || actualUser !== expected) fail('IDENTITY_MISMATCH', `business 必须以 ${expected} 身份运行。`);
  return actualUser;
};

export const validateGroup = (actualGroup, role) => {
  const expected = CANONICAL_BUSINESS_IDENTITY.group;
  if (role !== 'business' || actualGroup !== expected) fail('GROUP_MISMATCH', `business 必须以 ${expected} 组运行。`);
  return actualGroup;
};

const assertMediaIdentity = ({ bytes, sha256, expectedBytes, expectedSha256 }) => {
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 1 || bytes !== expectedBytes) fail('MEDIA_BYTES_MISMATCH', '媒体字节数不一致。');
  if (!/^[0-9a-f]{64}$/.test(expectedSha256) || sha256 !== expectedSha256) fail('MEDIA_SHA_MISMATCH', '媒体 SHA-256 不一致。');
};

const stableUuid = (runId, label) => {
  const bytes = createHash('sha256').update(`qimao-asr-05a:${runId}:${label}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
  const sha = 'a'.repeat(64);
  const root = '/tmp/qimao-asr-05a-business-self-test';
  const base = {
    root,
    business: `${root}/bin/business.mjs`,
    mediaBytes: 8,
    mediaSha: sha,
  };
  assertSafeTempRoot(root);
  assertFormalMjs(base.business, 'business');
  const consoleMethods = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  let quietLogCalls = 0;
  withQuietMigrationLogsForTest(() => {
    console.log('suppressed');
    console.info('suppressed');
    quietLogCalls += 1;
  });
  if (quietLogCalls !== 1 || console.log !== consoleMethods.log || console.info !== consoleMethods.info
    || console.warn !== consoleMethods.warn || console.error !== consoleMethods.error) fail('MIGRATION_LOG_RESTORE_INVALID', '迁移日志静默成功路径未恢复 console。');
  let quietFailure;
  try {
    withQuietMigrationLogsForTest(() => {
      console.log('suppressed');
      console.info('suppressed');
      throw new Error('migration self-test');
    });
  } catch (error) {
    quietFailure = error;
  }
  if (!(quietFailure instanceof Error) || console.log !== consoleMethods.log || console.info !== consoleMethods.info
    || console.warn !== consoleMethods.warn || console.error !== consoleMethods.error) fail('MIGRATION_LOG_ERROR_RESTORE_INVALID', '迁移日志静默异常路径未恢复 console。');
  process.env.NODE_ENV = 'production';
  let observedNodeEnv;
  const quietResult = createAppWithQuietLogger({
    createApp: () => {
      observedNodeEnv = process.env.NODE_ENV;
      return { close: async () => undefined };
    },
  }, {});
  if (observedNodeEnv !== 'test' || process.env.NODE_ENV !== 'production' || !quietResult) fail('APP_ENV_RESTORE_INVALID', 'createApp 成功后 NODE_ENV 未恢复。');
  let quietError;
  try {
    createAppWithQuietLogger({
      createApp: () => {
        observedNodeEnv = process.env.NODE_ENV;
        throw new Error('quiet app self-test');
      },
    }, {});
  } catch (error) {
    quietError = error;
  }
  if (!(quietError instanceof Error)) fail('APP_ERROR_NOT_PROPAGATED', 'createApp 抛错未向上传递。');
  if (observedNodeEnv !== 'test' || process.env.NODE_ENV !== 'production') fail('APP_ENV_ERROR_RESTORE_INVALID', 'createApp 抛错后 NODE_ENV 未恢复。');
  assertMediaIdentity({ bytes: 8, sha256: sha, expectedBytes: 8, expectedSha256: sha });
  const dbName = 'qimao_asr_05a_business_self_test';
  const databaseUrl = createIsolatedDatabaseUrl(dbName);
  if (databaseUrl !== 'postgresql:///qimao_asr_05a_business_self_test?host=%2Fvar%2Frun%2Fpostgresql') fail('DATABASE_URL_GENERATION_INVALID', '隔离数据库 URL 生成不符合 Unix socket 合同。');
  const parsedDatabaseUrl = parseIsolatedDatabaseUrl(databaseUrl, dbName);
  if (parsedDatabaseUrl.database !== dbName || parsedDatabaseUrl.host !== '/var/run/postgresql') fail('DATABASE_URL_PARSE_INVALID', '隔离数据库 URL 解析结果不符合合同。');
  if (CANONICAL_BUSINESS_IDENTITY.user !== 'qimao' || CANONICAL_BUSINESS_IDENTITY.group !== 'qimao') fail('BUSINESS_IDENTITY_DRIFT', '业务用户与组必须固定为 qimao。');
  for (const capability of ['budget:read', 'budget:write', 'budget:publish']) {
    if (!SYSTEM_CAPABILITIES.includes(capability)) fail('BUDGET_CAPABILITY_MISSING', '预算权威 capability 缺失。');
  }
  for (const capability of ['system-control:budget:read', 'system-control:budget:write', 'system-control:budget:publish']) {
    if (SYSTEM_CAPABILITIES.includes(capability)) fail('BUDGET_CAPABILITY_ALIAS_PRESENT', '预算错误 capability 别名仍存在。');
  }
  if (validateIdentity('qimao', 'business') !== CANONICAL_BUSINESS_IDENTITY.user || validateGroup('qimao', 'business') !== CANONICAL_BUSINESS_IDENTITY.group) fail('BUSINESS_IDENTITY_INVALID', '业务身份/组 happy 门失败。');
  const normalizedPeer = normalizeDatabasePeerRow({ database_name: dbName, user_name: CANONICAL_BUSINESS_IDENTITY.user });
  if (normalizedPeer.databaseName !== dbName || normalizedPeer.userName !== CANONICAL_BUSINESS_IDENTITY.user) fail('DATABASE_PEER_NORMALIZATION_INVALID', '数据库 peer 查询行规范化失败。');
  if (assertDatabasePeerIdentity({ databaseName: dbName, userName: CANONICAL_BUSINESS_IDENTITY.user }, dbName).databaseName !== dbName) fail('DATABASE_PEER_IDENTITY_INVALID', '数据库 peer 身份 happy 门失败。');
  expectReject(() => assertDatabasePeerIdentity({ databaseName: 'qimao_asr_05a_other', userName: 'qimao' }, dbName), 'DATABASE_PEER_MISMATCH');
  expectReject(() => assertDatabasePeerIdentity({ databaseName: dbName, userName: 'postgres' }, dbName), 'DATABASE_PEER_MISMATCH');
  const databaseEnv = parseDatabaseEnvText(`DATABASE_URL=${databaseUrl}\n`, dbName);
  if (JSON.stringify(Object.keys(databaseEnv)) !== JSON.stringify(['DATABASE_URL'])) fail('DATABASE_ENV_KEYS_INVALID', 'database.env 键集合发生漂移。');
  const mergedEnv = mergeRuntimeEnv({
    processEnv: { DATABASE_URL: 'postgresql://production.invalid/prod', PGHOST: '127.0.0.1', inheritedOnly: 'keep' },
    backendEnv: { DATABASE_URL: 'postgresql://production.invalid/backend', backendOnly: 'keep' },
    objectStorageEnv: { DATABASE_URL: 'postgresql://production.invalid/object', PGPORT: '5432' },
    providerEnv: { PGPASSWORD: 'not-allowed' },
    databaseEnv,
  });
  if (mergedEnv.DATABASE_URL !== databaseUrl || mergedEnv.PGHOST !== undefined || mergedEnv.PGPORT !== undefined || mergedEnv.PGPASSWORD !== undefined || mergedEnv.backendOnly !== 'keep') fail('ENV_MERGE_PRECEDENCE_INVALID', 'database.env 未成为最后且唯一数据库配置。');
  expectReject(() => parseDatabaseEnvText(`DATABASE_URL=${databaseUrl}\nPGHOST=/tmp`, dbName), 'DATABASE_ENV_KEYS_INVALID');
  expectReject(() => parseDatabaseEnvText('DATABASE_URL=postgresql://127.0.0.1:5432/qimao_asr_05a_business_self_test', dbName), 'DATABASE_URL_INVALID');
  expectReject(() => parseDatabaseEnvText('DATABASE_URL=postgresql://user@/qimao_asr_05a_business_self_test?host=%2Fvar%2Frun%2Fpostgresql', dbName), 'DATABASE_URL_INVALID');
  expectReject(() => parseDatabaseEnvText(`DATABASE_URL=${databaseUrl}`, 'qimao_asr_05a_other'), 'DATABASE_URL_INVALID');
  if (JSON.stringify(MIGRATION_GATE_ORDER) !== JSON.stringify(['assign_effective_env', 'create_explicit_pool', 'verify_current_database_and_user', 'import_migrate'])) fail('MIGRATION_ORDER_INVALID', '迁移前门顺序发生漂移。');
  expectReject(() => assertFormalMjs(`${base.business}.stage`, 'business'), 'FORMAL_MJS_REQUIRED');
  expectReject(() => validateIdentity('qimao-deploy', 'business'), 'IDENTITY_MISMATCH');
  expectReject(() => validateGroup('qimao-deploy', 'business'), 'GROUP_MISMATCH');
  expectReject(() => assertMediaIdentity({ bytes: 8, sha256: 'b'.repeat(64), expectedBytes: 8, expectedSha256: sha }), 'MEDIA_SHA_MISMATCH');
  if (JSON.stringify(CLEANUP_ORDER) !== JSON.stringify([
    'cancel_unfinished_commands',
    'delete_known_cos_objects_and_head_404',
    'stop_loopback_and_workers',
    'terminate_and_drop_isolated_database',
    'remove_release_env_harness_media_temp',
  ])) fail('CLEANUP_ORDER_INVALID', '清理顺序发生漂移。');
  if (stableUuid('self-test', 'batch') === stableUuid('self-test', 'other')) fail('STABLE_ID_INVALID', '稳定 ID 发生碰撞。');
  const workerOutcomeCases = [
    [{ processed: false }, { status: 'not_attempted', code: ASR_CREATE_NOT_ATTEMPTED, externalCreateCount: 0 }],
    [{ processed: true, outcome: 'failed' }, { status: 'not_observable', code: ASR_CREATE_ACTUAL_NOT_OBSERVABLE, externalCreateCount: null }],
    [{ processed: true, outcome: 'cancelled' }, { status: 'not_attempted', code: ASR_CREATE_NOT_ATTEMPTED, externalCreateCount: 0 }],
    [{ processed: true, outcome: 'reconciliation_required' }, { status: 'unknown', code: ASR_CREATE_UNKNOWN, externalCreateCount: null }],
    [{ processed: true, outcome: 'completed' }, { status: 'completed', code: null, externalCreateCount: 1 }],
  ];
  for (const [workerResult, expected] of workerOutcomeCases) {
    if (JSON.stringify(classifyAsrWorkerOutcome(workerResult)) !== JSON.stringify(expected)) fail('CREATE_STAGE_CLASSIFICATION_INVALID', 'Worker 结果阶段分类不符合合同。');
  }
  const persistedFacts = [
    [{ jobs: [{ attempts: [{ providerRequestId: null, externalSideEffectPossible: false, effectClass: 'none', errorCode: 'ASR_INPUT_REJECTED' }] }] }, 'not_attempted'],
    [{ jobs: [{ attempts: [{ providerRequestId: 'redacted-task-id', externalSideEffectPossible: false, effectClass: 'external_accepted' }] }] }, 'accepted'],
    [{ jobs: [{ attempts: [{ providerRequestId: 'redacted-task-id', status: 'failed', errorCode: 'ASR_TENCENT_PROVIDER_FAILED', externalSideEffectPossible: false, effectClass: 'external_accepted' }] }] }, 'accepted_failed'],
    [{ jobs: [{ attempts: [{ providerRequestId: null, externalSideEffectPossible: true, effectClass: 'external_unknown', status: 'reconciliation_required' }] }] }, 'unknown'],
    [{ jobs: [{ attempts: [{ providerRequestId: 'redacted-task-id', externalSideEffectPossible: true, effectClass: 'external_unknown', status: 'reconciliation_required' }] }] }, 'unknown'],
  ];
  for (const status of ['accepted', 'unknown']) if (!shouldPreserveReconciliation(status)) fail('RECONCILIATION_PRESERVE_RULE_INVALID', 'accepted/unknown 必须保留远端事实。');
  for (const status of ['accepted_failed', 'completed', 'terminal', 'failed']) if (shouldPreserveReconciliation(status)) fail('RECONCILIATION_TERMINAL_RULE_INVALID', '终态不得保留远端事实。');
  for (const [batch, expectedStatus] of persistedFacts) {
    const fact = classifyPersistedAsrFact(batch);
    if (fact.status !== expectedStatus || (expectedStatus === 'accepted' && fact.externalCreateCount !== null)) fail('PERSISTED_ATTEMPT_FACT_INVALID', '持久 attempt/job 事实分类不符合合同。');
  }
  const terminalFact = classifyPersistedAsrFact(persistedFacts[0][0]);
  if (terminalFact.errorCode !== 'ASR_INPUT_REJECTED' || terminalFact.stageCode !== ASR_CREATE_NOT_ATTEMPTED) fail('PERSISTED_ERROR_CODE_INVALID', '终态 errorCode 未按安全码投影。');
  const acceptedFailureFact = classifyPersistedAsrFact(persistedFacts[2][0]);
  if (acceptedFailureFact.status !== 'accepted_failed' || acceptedFailureFact.code !== 'ASR_TENCENT_PROVIDER_FAILED' || acceptedFailureFact.externalCreateCount !== 1) fail('ACCEPTED_FAILURE_FACT_INVALID', '已受理失败事实未按稳定码投影。');
  const invalidAcceptedFailure = classifyPersistedAsrFact({ jobs: [{ attempts: [{ providerRequestId: 'redacted-task-id', status: 'failed', errorCode: 'not-safe' }] }] });
  if (invalidAcceptedFailure.status !== 'accepted' || invalidAcceptedFailure.externalCreateCount !== null) fail('ACCEPTED_FAILURE_CODE_INVALID', '非法错误码不得伪造已完成失败事实。');
  const noFact = classifyPersistedAsrFact({ jobs: [] });
  if (noFact.status !== 'not_observable' || noFact.externalCreateCount !== null) fail('PERSISTED_FACT_MISSING_INVALID', '缺少持久事实时不得伪造外部创建次数。');
  const notObservable = classifyAsrWorkerOutcome({ processed: true, outcome: 'unexpected' });
  if (notObservable.status !== 'not_observable' || notObservable.externalCreateCount !== null) fail('CREATE_COUNT_NOT_OBSERVABLE_INVALID', '无法证明外部创建时不得伪造计数。');
  const precreate = createPrecreateDiagnosticResult();
  if (precreate.outcome !== PRECREATE_DIAGNOSTIC_OUTCOME
    || precreate.evidence.asrWorkerRunOnce !== false
    || precreate.evidence.externalCreateCount !== 0
    || precreate.evidence.tencentWrites !== 0
    || precreate.evidence.dispatchPrepared !== true) fail('PRECREATE_DIAGNOSTIC_CONTRACT_INVALID', '调用前诊断结果边界不符合合同。');
  const knownStageError = new HarnessError('KNOWN_STAGE_FAILURE', '不应改变原始阶段码。');
  if (stageFailureCode('TERMS', knownStageError) !== 'KNOWN_STAGE_FAILURE') fail('STAGE_ERROR_CODE_CHANGED', 'HarnessError 原码被改写。');
  const unexpectedStageCode = stageFailureCode('TERMS', new TypeError('不应输出异常正文。'));
  if (unexpectedStageCode !== 'UNEXPECTED_TERMS') fail('STAGE_ERROR_CODE_UNSTABLE', '未知异常未映射到当前阶段码。');
  const apiGateStageCode = stageFailureCode('TERMS', new HarnessError('API_GATE_FAILED', '不应输出路径或响应体。'));
  if (apiGateStageCode !== 'TERMS_API_GATE_FAILED') fail('API_GATE_STAGE_CODE_INVALID', 'API_GATE_FAILED 未映射到阶段稳定码。');
  if (projectBudgetApiErrorCode('CREATE', { error: { code: 'AUTH_REQUIRED' } }) !== 'BUDGET_CREATE_API_AUTH_REQUIRED'
    || projectBudgetApiErrorCode('PUBLISH', { error: { code: 'BUDGET_POLICY_INVALID' } }) !== 'BUDGET_PUBLISH_API_BUDGET_POLICY_INVALID'
    || projectBudgetApiErrorCode('CREATE', { error: { code: 'bad-code' } }) !== null
    || projectBudgetApiErrorCode('CREATE', { error: { code: 'A'.repeat(80) } }) !== null
    || projectBudgetApiErrorCode('UNKNOWN', { error: { code: 'AUTH_REQUIRED' } }) !== null) fail('BUDGET_API_ERROR_PROJECTION_INVALID', '预算 API 错误未按固定 gate label 安全投影。');
  const projectedStageError = businessBlockedSummary(new HarnessError(unexpectedStageCode, '不应输出异常正文。'));
  if (JSON.stringify(projectedStageError).includes('不应输出异常正文') || Object.keys(projectedStageError).length !== 3) fail('STAGE_ERROR_MESSAGE_LEAKED', '阶段错误正文进入输出。');
  for (const stage of ['STORAGE_CONFIG', 'STORAGE_CLIENT', 'ASR_REGISTRY']) {
    if (stageFailureCode(stage, new TypeError('不应输出异常正文。')) !== `UNEXPECTED_${stage}`) fail('STORAGE_STAGE_CODE_UNSTABLE', 'storage 阶段码未按当前阶段稳定映射。');
  }
  class TencentAsrConfigurationError extends Error {
    constructor(code) {
      super('不应输出异常正文。');
      this.name = 'TencentAsrConfigurationError';
      this.code = code;
    }
  }
  for (const code of TENCENT_ASR_CONFIGURATION_CODES) {
    if (projectAsrRegistryError(new TencentAsrConfigurationError(code)) !== `TENCENT_ASR_${code}`) fail('ASR_REGISTRY_ERROR_PROJECTION_INVALID', 'ASR registry 合法配置错误未投影。');
  }
  const forgedName = new Error('不应输出异常正文。');
  forgedName.name = 'TencentAsrConfigurationError';
  forgedName.code = 'CONFIG_INVALID';
  if (projectAsrRegistryError(forgedName) !== null
    || projectAsrRegistryError(new TencentAsrConfigurationError('NOT_ALLOWED')) !== null
    || projectAsrRegistryError({ name: 'TencentAsrConfigurationError', code: 'CONFIG_INVALID' }) !== null) fail('ASR_REGISTRY_ERROR_FORGERY_ACCEPTED', '伪造的 ASR registry 错误未被拒绝。');
  const projectedRegistryError = new HarnessError('TENCENT_ASR_CONFIG_INVALID', '不应输出异常正文。');
  if (JSON.stringify(businessBlockedSummary(projectedRegistryError)).includes('不应输出异常正文')) fail('ASR_REGISTRY_ERROR_MESSAGE_LEAKED', 'ASR registry 错误正文进入输出。');
  if (WORKER_ENTRY_IMPORTS.core !== 'workers/asr.worker.js' || WORKER_ENTRY_IMPORTS.entry !== 'workers/asr.worker.entry.js') fail('WORKER_ENTRY_IMPORT_CONTRACT_INVALID', 'Worker core/entry 导入契约发生漂移。');
  const manifestPaths = [syntheticManifestPath('episode-001.srt'), syntheticManifestPath('episode-001.mp4')];
  if (manifestPaths.some((path, index) => !path.startsWith(`${SYNTHETIC_MANIFEST_ROOT_NAME}/`) || !path.endsWith(index === 0 ? '/episode-001.srt' : '/episode-001.mp4'))) fail('MANIFEST_ROOT_PREFIX_INVALID', 'manifest binding root 前缀或末段文件名不符合契约。');
  if ([1, 1].some((lastModifiedMs) => !Number.isSafeInteger(lastModifiedMs) || lastModifiedMs < 1)) fail('MANIFEST_TIMESTAMP_INVALID', 'manifest binding lastModifiedMs 不符合契约。');
  const manifestFingerprint = createManifestFingerprint({ relativePath: manifestPaths[1], sizeBytes: 5, lastModifiedMs: 1 });
  if (manifestFingerprint !== `${manifestPaths[1]}|5|1`) fail('MANIFEST_FINGERPRINT_INVALID', '清单 fingerprint 未按路径、大小、时间生成。');
  const srtManifestFingerprint = createManifestFingerprint({ relativePath: manifestPaths[0], sizeBytes: FIXED_SRT.byteLength, lastModifiedMs: 1 });
  if (srtManifestFingerprint !== `${manifestPaths[0]}|${FIXED_SRT.byteLength}|1`) fail('MANIFEST_SRT_FINGERPRINT_INVALID', 'SRT 清单 fingerprint 不符合合同。');
  const uploadBody = createUploadSessionBody({ manifestId: 'manifest-self-test', fileName: 'episode-001.mp4', mediaKind: 'video', bytes: Buffer.from('media'), fileFingerprint: manifestFingerprint, checksumValue: sha });
  if (uploadBody.fileFingerprint !== manifestFingerprint || uploadBody.checksumValue !== sha || uploadBody.fileFingerprint === uploadBody.checksumValue) fail('UPLOAD_IDENTITY_SEPARATION_INVALID', 'fileFingerprint 与 checksumValue 未分离。');
  if (uploadBody.checksumAlgorithm !== UPLOAD_CHECKSUM_ALGORITHM || uploadBody.checksumAlgorithm !== 'sha256') fail('UPLOAD_CHECKSUM_CONTRACT_INVALID', '上传创建请求未声明 sha256 校验算法。');
  const workspaceDigest = readWorkspaceSourceSrtSetDigest({ source: { sourceSrtSetDigest: sha } });
  if (workspaceDigest !== sha) fail('TERMS_WORKSPACE_DIGEST_CONTRACT_INVALID', '术语 workspace 来源 digest 未按合同读取。');
  expectReject(() => readWorkspaceSourceSrtSetDigest({ source: { sourceSrtSetDigest: 'not-a-digest' } }), 'TERMS_WORKSPACE_DIGEST_MISSING');
  const asrRegistryForConnectionTest = { marker: 'asr' };
  const screenTextRegistryForConnectionTest = { marker: 'screen-text' };
  const connectionRegistries = createConnectionTestRegistries({ asrRegistry: asrRegistryForConnectionTest, screenTextRegistry: screenTextRegistryForConnectionTest });
  if (connectionRegistries.asr !== asrRegistryForConnectionTest || connectionRegistries.screenText !== screenTextRegistryForConnectionTest
    || CONNECTION_SCREEN_TEXT_MODULE !== 'modules/screen-text/screen-text.adapter-registry.js') fail('CONNECTION_REGISTRY_CONTRACT_INVALID', 'connection-test registry 未复用 ASR 或 default screen-text registry。');
  const termVersionForDispatchTest = 'term-version-self-test';
  const acceptedBatch = extractAcceptedDispatchBatch({ results: [{ acceptanceStatus: 'blocked', batchId: 'blocked-batch' }, { acceptanceStatus: 'accepted', batchId: 'accepted-batch', eligibility: { termVersionId: termVersionForDispatchTest } }] }, termVersionForDispatchTest);
  if (acceptedBatch !== 'accepted-batch') fail('DISPATCH_ACCEPTED_BATCH_INVALID', 'dispatch accepted result 未提供唯一 batch。');
  expectReject(() => extractAcceptedDispatchBatch({ results: [{ acceptanceStatus: 'accepted', batchId: 'accepted-batch', eligibility: { termVersionId: 'other-term-version' } }] }, termVersionForDispatchTest), 'ASR_DISPATCH_TERM_VERSION_MISMATCH');
  expectReject(() => extractAcceptedDispatchBatch({ results: [] }, termVersionForDispatchTest), 'ASR_DISPATCH_BATCH_MISSING');
  const maxTencentReservation = 1.75 * 5;
  if (BUDGET_WARNING_LIMIT !== '9' || BUDGET_HARD_LIMIT !== '10' || !(maxTencentReservation < Number(BUDGET_WARNING_LIMIT)) || !(Number(BUDGET_WARNING_LIMIT) < Number(BUDGET_HARD_LIMIT))) fail('BUDGET_CONTRACT_INVALID', '预算阈值未覆盖腾讯最大预留。');
  const blocked = businessBlockedSummary(new HarnessError(ASR_CREATE_UNKNOWN, '不应输出此消息。'));
  if (JSON.stringify(Object.keys(blocked)) !== JSON.stringify(['component', 'outcome', 'code']) || JSON.stringify(blocked).includes('不应输出此消息') || blocked.code !== ASR_CREATE_UNKNOWN) fail('BUSINESS_ERROR_CONTRACT_INVALID', 'business blocked 错误契约不是最小三字段。');
  const sanitized = businessBlockedSummary({ code: 'LEAKED_MESSAGE', message: '不应透传' });
  if (sanitized.code !== 'UNEXPECTED_FAILURE') fail('UNSAFE_ERROR_CODE_LEAKED', '未知错误未收敛到稳定安全码。');
  return {
    component: 'business',
    outcome: 'passed',
    cases: ['happy', 'business_identity_group', 'budget_capabilities', 'database_url_generation', 'database_env_keys', 'merge_precedence', 'database_rejections', 'migration_gate_order', 'wrong_extension', 'wrong_identity', 'media_sha_mismatch', 'cleanup_order', 'reconciliation_preserved', 'reconciliation_terminal_cleanup', 'worker_create_stage_classification', 'worker_entry_import_contract', 'manifest_contract', 'contract_sweep_upload_checksum', 'contract_sweep_terms_workspace_digest', 'contract_sweep_connection_registry_reuse', 'contract_sweep_dispatch_group_batch_acceptance', 'contract_sweep_budget_reservation', 'budget_api_error_projection', 'precreate_diagnostic_boundary', 'stage_error_localization', 'storage_stage_split', 'asr_registry_error_projection', 'safe_error_projection'],
    providerReadRole: CANONICAL_BUSINESS_IDENTITY.user,
    createRecTaskMaximum: 1,
  };
};

const runCommand = (command, args) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });
  if (result.error || result.status !== 0) fail('IDENTITY_CHECK_FAILED', '业务身份检查失败。');
  return String(result.stdout ?? '').trim();
};

const regularFile = (value, label) => {
  let stat;
  try { stat = lstatSync(value); } catch { fail('FILE_MISSING', `${label} 不存在。`); }
  if (!stat.isFile()) fail('FILE_NOT_REGULAR', `${label} 不是普通文件。`);
  return stat;
};

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const readEnvFile = (file, excludedKeys = new Set()) => {
  const values = {};
  for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    if (excludedKeys.has(key)) continue;
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
};

const readDatabaseEnvFile = (file, dbName) => {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { fail('DATABASE_ENV_INVALID', 'database.env 不可读。'); }
  return parseDatabaseEnvText(text, dbName);
};

const stripDatabaseEnvironment = (values = {}) => Object.fromEntries(
  Object.entries(values).filter(([key]) => !DATABASE_ENVIRONMENT_KEY_SET.has(key)),
);

export const mergeRuntimeEnv = ({ processEnv = {}, backendEnv = {}, objectStorageEnv = {}, providerEnv = {}, databaseEnv = {} } = {}) => ({
  ...stripDatabaseEnvironment(processEnv),
  ...stripDatabaseEnvironment(backendEnv),
  ...stripDatabaseEnvironment(objectStorageEnv),
  ...stripDatabaseEnvironment(providerEnv),
  ...databaseEnv,
});

const loadRuntimeEnv = (envDir = ENV_DIR, dbName) => ({
  ...mergeRuntimeEnv({
    processEnv: process.env,
    backendEnv: readEnvFile(`${envDir}/backend.env`, DATABASE_ENVIRONMENT_KEY_SET),
    objectStorageEnv: readEnvFile(`${envDir}/object-storage.env`, DATABASE_ENVIRONMENT_KEY_SET),
    providerEnv: readEnvFile(`${envDir}/provider.env`, DATABASE_ENVIRONMENT_KEY_SET),
    databaseEnv: readDatabaseEnvFile(`${envDir}/${DATABASE_ENV_FILE}`, dbName),
  }),
  NODE_ENV: 'production',
  QIMAO_ACCESS_REQUIRED: 'false',
});

const moduleImport = async (file) => {
  regularFile(file, 'release module');
  return import(pathToFileURL(file).href);
};

/**
 * 仅在 createApp() 构造瞬间关闭 Fastify stdout logger；调用者环境始终恢复。
 * Registry 等生产装配必须在调用本 helper 前完成并保持 production。
 */
export const createAppWithQuietLogger = (appModule, options) => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  try {
    return appModule.createApp(options);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
};

const withQuietMigrationLogs = async (action) => {
  const originalLog = console.log;
  const originalInfo = console.info;
  console.log = () => undefined;
  console.info = () => undefined;
  try {
    return await action();
  } finally {
    console.log = originalLog;
    console.info = originalInfo;
  }
};

export const withQuietMigrationLogsForTest = (action) => {
  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  try {
    console.log = () => undefined;
    console.info = () => undefined;
    return action();
  } finally {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
  }
};

const verifyDatabasePeer = async (database, dbName, closePool) => {
  let result;
  try {
    result = await database.query('SELECT current_database() AS database_name, current_user AS user_name');
  } catch {
    await closePool();
    fail('DATABASE_PEER_CHECK_FAILED', '数据库 peer 只读检查失败。');
  }
  try {
    return assertDatabasePeerIdentity(normalizeDatabasePeerRow(result.rows?.[0]), dbName);
  } catch (error) {
    await closePool();
    throw error;
  }
};

const deepValue = (value, names) => {
  if (!value || typeof value !== 'object') return undefined;
  for (const name of names) if (typeof value[name] === 'string' || typeof value[name] === 'number') return value[name];
  for (const child of Object.values(value)) {
    const found = deepValue(child, names);
    if (found !== undefined) return found;
  }
  return undefined;
};

const mustId = (value, label, names = ['id']) => {
  const found = deepValue(value, names);
  if (!found) fail('RESPONSE_ID_MISSING', `${label} 未返回稳定 ID。`);
  return String(found);
};

const requestJson = async (baseUrl, method, path, body, idempotencyKey, expected = [200, 201, 202], gateLabel = null) => {
  const headers = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (idempotencyKey) headers['idempotency-key'] = idempotencyKey;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = {};
  try { parsed = text ? JSON.parse(text) : {}; } catch { fail('RESPONSE_NOT_JSON', `${method} ${path} 未返回 JSON。`); }
  if (!expected.includes(response.status)) {
    const projected = projectBudgetApiErrorCode(gateLabel, parsed);
    if (projected) fail(projected, '预算阶段接口返回稳定错误码。');
    fail('API_GATE_FAILED', '阶段接口未通过。');
  }
  return parsed;
};

const putSignedPart = async (uploadRequest, bytes) => {
  const response = await fetch(uploadRequest.url, {
    method: uploadRequest.method,
    headers: uploadRequest.headers,
    body: bytes,
  });
  if (!response.ok) fail('COS_PUT_FAILED', `COS 分片写入返回 ${response.status}。`);
  return response.headers.get('etag') ?? response.headers.get('ETag');
};

const objectKeyFromUrl = (url, env) => {
  const parsed = new URL(url);
  let key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  const bucket = env.QIMAO_OBJECT_STORAGE_BUCKET ?? env.QIMAO_COS_BUCKET;
  if (bucket && key.startsWith(`${bucket}/`)) key = key.slice(bucket.length + 1);
  if (!key) fail('COS_OBJECT_ID_MISSING', '无法从同一签名 URL 得到对象身份。');
  return key;
};

export const createManifestFingerprint = ({ relativePath, sizeBytes, lastModifiedMs }) => {
  if (typeof relativePath !== 'string' || !relativePath || !Number.isSafeInteger(sizeBytes) || sizeBytes < 0 || !Number.isSafeInteger(lastModifiedMs) || lastModifiedMs < 0) {
    fail('MANIFEST_FINGERPRINT_INVALID', '清单指纹输入不符合合同。');
  }
  return `${relativePath}|${sizeBytes}|${lastModifiedMs}`;
};

export const createUploadSessionBody = ({ manifestId, fileName, mediaKind, bytes, fileFingerprint, checksumValue }) => ({
    originalFileName: fileName,
    mediaKind,
    sizeBytes: bytes.byteLength,
    fileFingerprint,
    checksumAlgorithm: UPLOAD_CHECKSUM_ALGORITHM,
    checksumValue,
    transportKind: 'multipart',
    materialBinding: { manifestId, targets: [{ episodeNumber: 1, role: mediaKind === 'video' ? 'asr_video' : 'company_srt' }] },
});

export const createConnectionTestRegistries = ({ asrRegistry, screenTextRegistry }) => ({
  asr: asrRegistry,
  screenText: screenTextRegistry,
});

const createUpload = async ({ baseUrl, projectId, manifestId, fileName, mediaKind, bytes, fileFingerprint, checksumValue, keyPrefix, knownObjectKeys, env }) => {
  const session = await requestJson(baseUrl, 'POST', `/api/projects/${projectId}/uploads`, createUploadSessionBody({ manifestId, fileName, mediaKind, bytes, fileFingerprint, checksumValue }), keyPrefix);
  const uploadId = mustId(session, `${mediaKind} upload`, ['uploadId', 'id']);
  const authorization = await requestJson(baseUrl, 'POST', `/api/uploads/${uploadId}/parts/authorize`, {
    partNumber: 1,
    fileFingerprint,
  }, `${keyPrefix}:authorize`);
  const uploadRequest = authorization.uploadRequest;
  if (!uploadRequest?.url || uploadRequest.method !== 'PUT' || !uploadRequest.headers) fail('COS_CAPABILITY_MISSING', '上传授权未返回单分片 PUT capability。');
  knownObjectKeys.push(objectKeyFromUrl(uploadRequest.url, env));
  const etag = await putSignedPart(uploadRequest, bytes);
  if (!etag) fail('COS_ETAG_MISSING', 'COS 未返回 ETag。');
  const confirmed = await requestJson(baseUrl, 'POST', `/api/uploads/${uploadId}/parts/confirm`, {
    partNumber: 1,
    sizeBytes: bytes.byteLength,
    etag,
    checksumValue,
  }, `${keyPrefix}:confirm`);
  const expectedVersion = Number(deepValue(confirmed, ['version']) ?? deepValue(session, ['version']) ?? 1);
  await requestJson(baseUrl, 'POST', `/api/uploads/${uploadId}/complete`, { expectedVersion }, `${keyPrefix}:complete`, [202, 200]);
  return { uploadId, expectedVersion };
};

const runBusiness = async (args) => {
  validateIdentity(runCommand('id', ['-un']), 'business');
  validateGroup(runCommand('id', ['-gn']), 'business');
  const root = assertSafeTempRoot(option(args, 'root'));
  const release = assertWithin(root, option(args, 'release'));
  const businessFile = assertFormalMjs(assertWithin(root, option(args, 'business')), 'business');
  regularFile(businessFile, 'business harness');
  const media = option(args, 'media');
  regularFile(media, '媒体');
  const expectedBytes = Number(option(args, 'media-bytes'));
  const expectedSha = option(args, 'media-sha').toLowerCase();
  const mediaBytes = readFileSync(media);
  assertMediaIdentity({ bytes: mediaBytes.byteLength, sha256: sha256(mediaBytes), expectedBytes, expectedSha256: expectedSha });
  const dbName = assertDatabaseName(option(args, 'db-name'));
  const runId = option(args, 'run-id').toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{7,80}$/.test(runId)) fail('RUN_ID_INVALID', 'run-id 必须是稳定、可审计的安全标识。');

  const envDir = args.get('env-dir') ?? ENV_DIR;
  const env = loadRuntimeEnv(envDir, dbName);
  for (const key of DATABASE_ENVIRONMENT_KEYS) delete process.env[key];
  Object.assign(process.env, env);
  const dist = posix.join(release, 'backend', 'dist');
  const poolModule = await runStage('MODULE_IMPORT_MIGRATION', () => moduleImport(posix.join(dist, 'database', 'pool.js')));
  const database = poolModule.createPool(env.DATABASE_URL);
  let databaseEnded = false;
  const closePool = async () => {
    if (databaseEnded) return;
    databaseEnded = true;
    await database.end().catch(() => undefined);
  };
  let app = null;

  try {
    await verifyDatabasePeer(database, dbName, closePool);
    await runStage('MODULE_IMPORT_MIGRATION', () => withQuietMigrationLogs(() => moduleImport(posix.join(dist, 'database', 'migrate.js'))));
    const [appModule, storageModule, configModule, uploadWorkerModule, asrWorkerModule, asrWorkerEntryModule, controlWorkerModule, screenTextRegistryModule] = await runStage('MODULE_IMPORT_MIGRATION', () => Promise.all([
        moduleImport(posix.join(dist, 'app.js')),
        moduleImport(posix.join(dist, 'modules', 'storage', 's3-compatible-storage.js')),
        moduleImport(posix.join(dist, 'config.js')),
        moduleImport(posix.join(dist, 'workers', 'upload-completion.worker.js')),
        moduleImport(posix.join(dist, WORKER_ENTRY_IMPORTS.core)),
        moduleImport(posix.join(dist, WORKER_ENTRY_IMPORTS.entry)),
        moduleImport(posix.join(dist, 'modules', 'system-control', 'system-control.connection-test.worker.js')),
        moduleImport(posix.join(dist, CONNECTION_SCREEN_TEXT_MODULE)),
      ]));
    const storageConfig = await runStage('STORAGE_CONFIG', () => storageModule.createProductionS3ConfigFromEnv(env));
    const storage = await runStage('STORAGE_CLIENT', () => new storageModule.ProductionS3CompatibleUploadStorage(storageConfig));
    const asrRegistry = await runStage('ASR_REGISTRY', () => {
      try {
        return asrWorkerEntryModule.createAsrWorkerRegistryFromEnv({ env, objectUrlSigner: storage });
      } catch (error) {
        const projectedCode = projectAsrRegistryError(error);
        if (projectedCode) fail(projectedCode, 'ASR registry 配置错误。');
        throw error;
      }
    });
    const principal = {
      subject: `qimao-asr-05a:${runId}`,
      audience: ['employee', 'system-control'],
      capabilities: SYSTEM_CAPABILITIES,
      projectAccess: 'all',
    };
    const baseUrl = await runStage('APP_LISTEN', async () => {
      app = createAppWithQuietLogger(appModule, {
        database,
        uploadStorage: storage,
        deliveryStorage: storage,
        asrAdapterRegistry: asrRegistry,
        systemControlPrincipalResolver: () => principal,
        employeePrincipalResolver: () => principal,
        employeeSessionRequired: true,
        accessRequired: false,
      });
      await app.listen({ host: '127.0.0.1', port: 0 });
      const address = app.server.address();
      if (!address || typeof address === 'string') fail('LOOPBACK_BIND_FAILED', 'loopback 未返回端口。');
      return `http://127.0.0.1:${address.port}`;
    });
    const state = { projectId: null, projectVersion: 0, batchId: null, dispatchGroupId: null, knownObjectKeys: [], externalCreateCount: null, externalCreateStatus: 'not_observable', reconciliationPreserved: false };
    const srtSha = sha256(FIXED_SRT);
    const ids = (label) => stableUuid(runId, label);

    try {
    const { projectId, projectVersion, manifestId } = await runStage('PROJECT_MANIFEST', async () => {
      const project = await requestJson(baseUrl, 'POST', '/api/projects', { name: `ASR isolated synthetic ${runId}` }, `${runId}:project`);
      const nextProjectId = mustId(project, 'project', ['projectId', 'id']);
      const nextProjectVersion = Number(deepValue(project, ['version']) ?? 1);
      const manifest = await requestJson(baseUrl, 'POST', `/api/projects/${nextProjectId}/material-manifests/confirm`, {
        expectedVersion: 0,
        rootName: SYNTHETIC_MANIFEST_ROOT_NAME,
        bindings: [
          { episodeNumber: 1, role: 'company_srt', relativePath: syntheticManifestPath('episode-001.srt'), fileName: 'episode-001.srt', sizeBytes: FIXED_SRT.byteLength, lastModifiedMs: 1, fingerprint: createManifestFingerprint({ relativePath: syntheticManifestPath('episode-001.srt'), sizeBytes: FIXED_SRT.byteLength, lastModifiedMs: 1 }), mediaType: 'srt' },
          { episodeNumber: 1, role: 'asr_video', relativePath: syntheticManifestPath('episode-001.mp4'), fileName: 'episode-001.mp4', sizeBytes: mediaBytes.byteLength, lastModifiedMs: 1, fingerprint: createManifestFingerprint({ relativePath: syntheticManifestPath('episode-001.mp4'), sizeBytes: mediaBytes.byteLength, lastModifiedMs: 1 }), mediaType: 'video' },
        ],
      }, `${runId}:manifest`);
      return {
        projectId: nextProjectId,
        projectVersion: nextProjectVersion,
        manifestId: mustId(manifest, 'manifest', ['manifestId', 'id']),
      };
    });
    state.projectId = projectId;
    state.projectVersion = projectVersion;
    await runStage('UPLOADS_WORKER', async () => {
      await createUpload({ baseUrl, projectId: state.projectId, manifestId, fileName: 'episode-001.srt', mediaKind: 'srt', bytes: FIXED_SRT, fileFingerprint: createManifestFingerprint({ relativePath: syntheticManifestPath('episode-001.srt'), sizeBytes: FIXED_SRT.byteLength, lastModifiedMs: 1 }), checksumValue: srtSha, keyPrefix: `${runId}:srt`, knownObjectKeys: state.knownObjectKeys, env });
      await createUpload({ baseUrl, projectId: state.projectId, manifestId, fileName: 'episode-001.mp4', mediaKind: 'video', bytes: mediaBytes, fileFingerprint: createManifestFingerprint({ relativePath: syntheticManifestPath('episode-001.mp4'), sizeBytes: mediaBytes.byteLength, lastModifiedMs: 1 }), checksumValue: expectedSha, keyPrefix: `${runId}:video`, knownObjectKeys: state.knownObjectKeys, env });
      const uploadWorker = new uploadWorkerModule.UploadCompletionWorker(database, storage, configModule.uploadCompletionConfig, { workerId: `upload-05a-${runId}` });
      const uploadRuns = [await uploadWorker.runOnce(), await uploadWorker.runOnce()];
      if (uploadRuns.some((run) => !run.processed || run.status !== 'completed')) fail('UPLOAD_WORKER_FAILED', 'UploadCompletionWorker 未完成两份素材。');
    });

    const { termVersionId } = await runStage('TERMS', async () => {
      const workspace = await requestJson(baseUrl, 'GET', `/api/projects/${state.projectId}/terms`);
      const sourceSrtSetDigest = readWorkspaceSourceSrtSetDigest(workspace);
      const extraction = await requestJson(baseUrl, 'POST', `/api/projects/${state.projectId}/terms/extractions`, { expectedSourceSrtSetDigest: sourceSrtSetDigest }, `${runId}:terms-extraction`);
      const draft = extraction.draft;
      if (!draft?.id) fail('TERMS_DRAFT_MISSING', '术语抽取未返回 draft。');
      const templates = await requestJson(baseUrl, 'GET', '/api/terms/export-templates');
      const templateVersionId = templates.activeTemplateVersionId ?? templates.items?.find((item) => item.isActive)?.id;
      if (!templateVersionId) fail('TERMS_TEMPLATE_MISSING', '没有 active export template。');
      const termVersion = await requestJson(baseUrl, 'POST', `/api/projects/${state.projectId}/terms/releases`, {
        draftId: draft.id,
        expectedDraftRevision: Number(draft.revision ?? 1),
        expectedSourceSrtSetDigest: sourceSrtSetDigest,
        templateVersionId,
      }, `${runId}:terms-release`);
      return { termVersionId: mustId(termVersion, 'term version', ['versionId', 'id']) };
    });

    const deploymentVersionId = await runStage('ENGINE_CONNECTION', async () => {
      const deploymentId = ids('engine-deployment');
      const versionId = ids('engine-version');
      const engine = await requestJson(baseUrl, 'POST', '/api/system-control/engines', {
        deploymentId,
        versionId,
        capability: 'asr',
        executionKind: 'cloud_api',
        displayName: `Tencent ASR isolated ${runId}`,
        adapterKey: 'tencent_cloud_recorded_v1',
        endpointReference: 'asr.tencentcloudapi.com',
        regionHint: 'ap-shanghai',
      }, `${runId}:engine`);
      const nextDeploymentVersionId = mustId(engine.latestVersion, 'engine version', ['versionId']);
      const statusCommandId = ids('engine-status-command');
      await requestJson(baseUrl, 'POST', `/api/system-control/engines/${deploymentId}/status`, { statusCommandId, status: 'enabled' }, `${runId}:engine-status`);
      const testRunId = ids('engine-connection-test');
      await requestJson(baseUrl, 'POST', '/api/system-control/engine-connection-tests', { testRunId, deploymentVersionId: nextDeploymentVersionId }, `${runId}:engine-test`);
      const connectionWorker = new controlWorkerModule.SystemControlConnectionTestWorker(
        database,
        createConnectionTestRegistries({
          asrRegistry,
          screenTextRegistry: screenTextRegistryModule.createDefaultScreenTextAdapterRegistry(),
        }),
        undefined,
        { workerId: `connection-05a-${runId}` },
      );
      const connectionRun = await connectionWorker.runOnce();
      if (!connectionRun.processed || connectionRun.status !== 'succeeded') fail('ENGINE_CONNECTION_WORKER_FAILED', 'connection-test Worker 未完成。');
      const connection = await requestJson(baseUrl, 'GET', `/api/system-control/engine-connection-tests/${testRunId}`);
      if (connection.status !== 'succeeded') fail('ENGINE_CONNECTION_TEST_FAILED', 'ASR engine connection test 未成功。');
      return nextDeploymentVersionId;
    });

    await runStage('ROUTING', async () => {
      const routingVersionId = ids('routing-version');
      const routing = await requestJson(baseUrl, 'POST', '/api/system-control/routing', {
        routingVersionId,
        environment: 'development',
        workflowStage: 'asr',
        pools: [
          { poolId: 'asr_api', targets: [{ routingTargetId: ids('routing-target'), deploymentVersionId, priority: 1, role: 'preferred', maxConcurrentJobs: 1, perProjectMax: 1, queueLimit: 10 }] },
          { poolId: 'ocr_api', targets: [] },
          { poolId: 'ocr_self_hosted_worker', targets: [] },
        ],
      }, `${runId}:routing`);
      const routingId = mustId(routing, 'routing policy', ['routingVersionId', 'id']);
      await requestJson(baseUrl, 'POST', `/api/system-control/routing/${routingId}/test`, {}, `${runId}:routing-test`);
      await requestJson(baseUrl, 'POST', `/api/system-control/routing/${routingId}/impact-check`, {}, `${runId}:routing-impact`);
      await requestJson(baseUrl, 'POST', `/api/system-control/routing/${routingId}/approve`, {}, `${runId}:routing-approve`);
      await requestJson(baseUrl, 'POST', `/api/system-control/routing/${routingId}/publish`, { releaseCommandId: ids('routing-release') }, `${runId}:routing-publish`);
    });

    await runStage('BUDGET', async () => {
      const budgetVersionId = ids('budget-version');
      const budget = await runStage('BUDGET_CREATE', () => requestJson(baseUrl, 'POST', '/api/system-control/budget-policies', {
        budgetPolicyVersionId: budgetVersionId,
        environment: 'development',
        rules: [{ resourcePool: 'asr_api', currency: 'CNY', period: 'day', warningLimit: BUDGET_WARNING_LIMIT, hardLimit: BUDGET_HARD_LIMIT }],
      }, `${runId}:budget`, [200, 201, 202], 'CREATE'));
      const budgetId = mustId(budget, 'budget policy', ['budgetPolicyVersionId', 'id']);
      await runStage('BUDGET_TEST', () => requestJson(baseUrl, 'POST', `/api/system-control/budget-policies/${budgetId}/tests`, { commandId: ids('budget-test-command'), budgetTestRunId: ids('budget-test') }, `${runId}:budget-test`, [200, 201, 202], 'TEST'));
      await runStage('BUDGET_IMPACT', () => requestJson(baseUrl, 'POST', `/api/system-control/budget-policies/${budgetId}/impact-check`, { commandId: ids('budget-impact-command') }, `${runId}:budget-impact`, [200, 201, 202], 'IMPACT'));
      await runStage('BUDGET_APPROVE', () => requestJson(baseUrl, 'POST', `/api/system-control/budget-policies/${budgetId}/approve`, { commandId: ids('budget-approve-command') }, `${runId}:budget-approve`, [200, 201, 202], 'APPROVE'));
      await runStage('BUDGET_PUBLISH', () => requestJson(baseUrl, 'POST', `/api/system-control/budget-policies/${budgetId}/publish`, { budgetReleaseCommandId: ids('budget-release') }, `${runId}:budget-publish`, [200, 201, 202], 'PUBLISH'));
    });

    const { batchId, dispatchGroupId } = await runStage('BATCH_DISPATCH', async () => {
      const group = await requestJson(baseUrl, 'POST', '/api/asr/dispatch-groups', { dispatchGroupId: ids('dispatch-group'), projectIds: [state.projectId], allowPartial: false }, `${runId}:dispatch-group`);
      return {
        batchId: extractAcceptedDispatchBatch(group, termVersionId),
        dispatchGroupId: mustId(group, 'dispatch group', ['id']),
      };
    });
    state.batchId = batchId;
    state.dispatchGroupId = dispatchGroupId;
    if (args.get('precreate-diagnostic') === true) {
      state.externalCreateCount = 0;
      state.externalCreateStatus = 'not_attempted';
      return createPrecreateDiagnosticResult();
    }
    const asrWorker = new asrWorkerModule.AsrWorker(database, asrRegistry, asrWorkerModule.asrWorkerConfig, { workerId: `asr-05a-${runId}` });
    let asrRun;
    try {
      asrRun = await asrWorker.runOnce();
    } catch {
      let persistedFact = null;
      try {
        persistedFact = classifyPersistedAsrFact(await requestJson(baseUrl, 'GET', `/api/projects/${state.projectId}/asr/batches/${state.batchId}`));
      } catch { /* 详情不可读时保持不可观测，不吞业务主错误。 */ }
      const fact = persistedFact ?? { status: 'not_observable', code: ASR_CREATE_ACTUAL_NOT_OBSERVABLE, externalCreateCount: null };
      state.externalCreateCount = fact.externalCreateCount;
      state.externalCreateStatus = fact.status;
      fail(fact.code, 'AsrWorker 异常；已读取同一 batch 的持久执行事实。');
    }
    let asrClassification = classifyAsrWorkerOutcome(asrRun);
    if (asrClassification.status !== 'completed') {
      try {
        const persistedFact = classifyPersistedAsrFact(await requestJson(baseUrl, 'GET', `/api/projects/${state.projectId}/asr/batches/${state.batchId}`));
        if (persistedFact.status !== 'not_observable') asrClassification = persistedFact;
      } catch { /* 详情不可读时保留 Worker 原始分类。 */ }
    }
    state.externalCreateCount = asrClassification.externalCreateCount;
    state.externalCreateStatus = asrClassification.status;
    if (shouldPreserveReconciliation(asrClassification.status)) {
      state.reconciliationPreserved = true;
    }
    if (asrClassification.status === 'unknown') {
      await requestJson(baseUrl, 'GET', `/api/projects/${state.projectId}/asr/batches/${state.batchId}`);
      for (const objectKey of state.knownObjectKeys) await storage.headObject(objectKey);
      fail(asrClassification.code, '外部结果未知；仅完成同一 batch/object 身份对账，不重复创建。');
    }
    if (asrClassification.status !== 'completed' || asrClassification.externalCreateCount !== 1) fail(asrClassification.code ?? ASR_CREATE_NOT_OBSERVABLE, 'AsrWorker 未证明一次已完成的外部创建。');
    const finalBatch = await requestJson(baseUrl, 'GET', `/api/projects/${state.projectId}/asr/batches/${state.batchId}`);
    const cues = await requestJson(baseUrl, 'GET', `/api/projects/${state.projectId}/terms/cues?limit=100`);
    const budgetUsage = await requestJson(baseUrl, 'GET', `/api/system-control/budget-usage?projectId=${encodeURIComponent(state.projectId)}`);
    const operations = await requestJson(baseUrl, 'GET', `/api/system-control/operations?projectId=${encodeURIComponent(state.projectId)}`);
    if (finalBatch.status !== 'completed') fail('ASR_BATCH_NOT_COMPLETED', 'ASR batch 未进入 completed。');
    return {
      component: 'business',
      outcome: 'completed',
      projectId: state.projectId,
      batchId: state.batchId,
      dispatchGroupId: state.dispatchGroupId,
      media: { bytes: mediaBytes.byteLength, sha256: expectedSha },
      evidence: {
        batchStatus: finalBatch.status,
        cueCount: Array.isArray(cues.items) ? cues.items.length : null,
        usageCount: Array.isArray(budgetUsage.items) ? budgetUsage.items.length : null,
        operationCount: Array.isArray(operations.items) ? operations.items.length : null,
        externalCreateCount: state.externalCreateCount,
      },
      speechTextEmitted: false,
    };
  } finally {
    if (!state.reconciliationPreserved) {
      for (const [path, key, body] of [
        [state.dispatchGroupId ? `/api/asr/dispatch-groups/${state.dispatchGroupId}/cancel` : null, `${runId}:cleanup-dispatch`, {}],
        [state.batchId ? `/api/projects/${state.projectId}/asr/batches/${state.batchId}/cancel` : null, `${runId}:cleanup-batch`, {}],
      ]) {
        if (path) await requestJson(baseUrl, 'POST', path, body, key).catch(() => undefined);
      }
      for (const objectKey of state.knownObjectKeys) {
        await storage.deleteObject(objectKey).catch(() => undefined);
        const head = await storage.headObject(objectKey).catch(() => null);
        if (head !== null) fail('COS_CLEANUP_FAILED', '已知 COS 对象未核对为缺失。');
      }
    }
    }
  } finally {
    let appClosed = false;
    if (app) {
      try {
        await app.close();
        appClosed = true;
      } catch {
        // 关闭失败时仍由 closePool 兜底，避免迁移前门或业务失败泄漏连接。
      }
    }
    if (appClosed) databaseEnded = true;
    await closePool();
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.get('self-test') === true) {
    if (args.get('run') === true || args.get('precreate-diagnostic') === true) fail('COMMAND_CONFLICT', 'self-test 不能与业务运行模式同时使用。');
    console.log(JSON.stringify(runSelfTest()));
    return;
  }
  if (args.get('run') === true && args.get('precreate-diagnostic') === true) fail('COMMAND_CONFLICT', '业务运行模式不能重复指定。');
  if (args.get('precreate-diagnostic') === true) {
    console.log(JSON.stringify(await runBusiness(args)));
    return;
  }
  if (args.get('run') !== true) fail('COMMAND_MISSING', '仅支持 --self-test、--run 或 --precreate-diagnostic。');
  console.log(JSON.stringify(await runBusiness(args)));
};

try {
  await main();
} catch (error) {
  console.error(JSON.stringify(businessBlockedSummary(error)));
  process.exitCode = 1;
}
