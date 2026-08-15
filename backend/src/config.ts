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

export interface UploadProtocolConfig {
  partSizeBytes: number;
  maxFileSizeBytes: number;
  sessionTtlMs: number;
  authorizationTtlMs: number;
  perFileConcurrency: number;
  browserConcurrency: number;
}

export const uploadProtocolConfig: UploadProtocolConfig = {
  partSizeBytes: 64 * 1024 * 1024,
  maxFileSizeBytes: 50 * 1024 * 1024 * 1024,
  sessionTtlMs: 24 * 60 * 60 * 1000,
  authorizationTtlMs: 15 * 60 * 1000,
  perFileConcurrency: 3,
  browserConcurrency: 12,
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
