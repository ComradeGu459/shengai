export const localDatabaseUrl =
  'postgresql://postgres@127.0.0.1:55432/qimao_terms_cloud';

export const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境必须配置 DATABASE_URL。');
  }
  return localDatabaseUrl;
};

export const DIRECT_UPLOAD_ORIGIN_ENV = 'QIMAO_DIRECT_UPLOAD_ORIGIN';
export const DIRECT_UPLOAD_CORS_ORIGIN = 'https://milaidi.online';
export const DIRECT_UPLOAD_RELAY_CORS_METHODS = 'PUT, OPTIONS';
export const DIRECT_UPLOAD_RELAY_CORS_HEADERS = 'Authorization, Content-Type';
export const DIRECT_UPLOAD_RELAY_CORS_EXPOSE_HEADERS = 'ETag';

/** 仅接受服务端配置的 HTTPS origin；请求体和浏览器字段不得进入这里。 */
export const normalizeDirectUploadOrigin = (value: string | undefined | null) => {
  const raw = value?.trim();
  if (!raw) return null;
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new Error(`${DIRECT_UPLOAD_ORIGIN_ENV} 必须是有效 HTTPS origin。`); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/'
    || parsed.search || parsed.hash) {
    throw new Error(`${DIRECT_UPLOAD_ORIGIN_ENV} 必须是无凭据、无路径、无查询和片段的 HTTPS origin。`);
  }
  return parsed.origin;
};

export const getDirectUploadOrigin = (env: NodeJS.ProcessEnv = process.env) =>
  normalizeDirectUploadOrigin(env[DIRECT_UPLOAD_ORIGIN_ENV]);

export interface UploadProtocolConfig {
  partSizeBytes: number;
  maxFileSizeBytes: number;
  sessionTtlMs: number;
  authorizationTtlMs: number;
  perFileConcurrency: number;
  browserConcurrency: number;
}

// 仅作为 Fastify 接收中继分片的兼容上限。每个请求仍按上传会话中持久化的
// partSizeBytes 精确校验，因此不会放宽新会话的持久分片策略。
export const UPLOAD_RELAY_BODY_LIMIT_BYTES = 64 * 1024 * 1024;

export const uploadProtocolConfig: UploadProtocolConfig = {
  partSizeBytes: 16 * 1024 * 1024,
  maxFileSizeBytes: 50 * 1024 * 1024 * 1024,
  sessionTtlMs: 24 * 60 * 60 * 1000,
  authorizationTtlMs: 15 * 60 * 1000,
  perFileConcurrency: 3,
  browserConcurrency: 12,
};

export interface UploadCompletionConfig {
  leaseMs: number;
  retryDelayMs: number;
  maxAttempts: number;
}

export const uploadCompletionConfig: UploadCompletionConfig = {
  leaseMs: 5 * 60 * 1000,
  retryDelayMs: 30 * 1000,
  maxAttempts: 5,
};

export interface ProjectLifecycleConfig {
  recycleRetentionMs: number;
  cleanupLeaseMs: number;
  cleanupRetryDelayMs: number;
  cleanupMaxAttempts: number;
}

export const projectLifecycleConfig: ProjectLifecycleConfig = {
  recycleRetentionMs: 48 * 60 * 60 * 1000,
  cleanupLeaseMs: 5 * 60 * 1000,
  cleanupRetryDelayMs: 60 * 1000,
  cleanupMaxAttempts: 5,
};
