import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

import { createApp } from './app.js';
import type { DeliveryStorage } from './modules/deliveries/delivery-storage.js';
import { FilesystemDeliveryStorage, FilesystemUploadStorage } from './modules/storage/filesystem-storage.js';
import { createProductionS3ConfigFromEnv, ProductionS3CompatibleUploadStorage } from './modules/storage/s3-compatible-storage.js';
import type { UploadStorage } from './modules/uploads/upload-storage.js';
import type { SystemControlPrincipalResolver } from './modules/system-control/system-control.auth.js';
import { createSystemControlSecretProviderFromEnv, type SystemControlAccessReadinessProvider, type SystemControlSecretProvider } from './modules/system-control/system-control.secret-provider.js';
import type { CostConversionRateProvider } from './modules/system-control/system-control.cost.service.js';
import type { RuntimeTelemetryProvider } from './modules/system-control/system-control.runtime.service.js';
import { createRuntimeTelemetryProviderFromEnv } from './modules/system-control/system-control.runtime.snapshot-provider.js';
import {
  createCloudflareAccessBindingFromEnv,
  type CloudflareAccessPrincipalResolver,
} from './modules/access/cloudflare-access.js';
import { createEmployeeAuthConfigFromEnv, EmployeeAuthService, type EmployeePrincipalResolver } from './modules/employee-auth/employee-auth.js';
import { getDirectUploadOrigin } from './config.js';
import type { AsrAdapterRegistry } from './modules/asr/asr-adapter-registry.js';
import {
  createTencentAsrRegistryFromEnv,
  createTencentAsrRuntimeConfigFromEnv,
  createTencentAsrSdkFactory,
  TencentAsrConfigurationError,
} from './modules/asr/tencent-asr-runtime.js';
import type { ScreenTextAdapterRegistry } from './modules/screen-text/screen-text.adapter-registry.js';
import { PersistentScreenTextEvidenceStorage, type ScreenTextEvidenceStorage } from './modules/screen-text/screen-text.evidence-storage.js';
import {
  createLocalOcrAdapterRegistryFromEnv,
  type LocalOcrTransportFactory,
} from './modules/screen-text/local-ocr-runtime.js';
import type { TermExtractionAdapter } from './modules/terms/term-extraction.js';

/** 控制面在显式开启 Tencent ASR 时复用上传存储的私有对象签名器。 */
export const createServerAsrRegistryFromEnv = (input: {
  env?: NodeJS.ProcessEnv;
  uploadStorage?: UploadStorage;
  sdkFactory?: Parameters<typeof createTencentAsrRegistryFromEnv>[0]['sdkFactory'];
}) => {
  const env = input.env ?? process.env;
  const config = createTencentAsrRuntimeConfigFromEnv(env);
  if (!config.enabled) return null;
  if (!(input.uploadStorage instanceof ProductionS3CompatibleUploadStorage)
    || typeof (input.uploadStorage as { createGetUrl?: unknown }).createGetUrl !== 'function') {
    throw new TencentAsrConfigurationError('CONFIG_INVALID');
  }
  return createTencentAsrRegistryFromEnv({
    env,
    sdkFactory: input.sdkFactory ?? createTencentAsrSdkFactory(),
    objectUrlSigner: input.uploadStorage,
  });
};

/** 控制面只登记显式启用的本地 PP-OCR 主备；历史 Tencent OCR 不进入活动 registry。 */
export const createServerScreenTextRegistryFromEnv = (input: {
  env?: NodeJS.ProcessEnv;
  transportFactory?: LocalOcrTransportFactory;
} = {}): ScreenTextAdapterRegistry | null => createLocalOcrAdapterRegistryFromEnv({
  env: input.env ?? process.env,
  ...(input.transportFactory ? { transportFactory: input.transportFactory } : {}),
});

/** 生产装配只接受真实 S3 交付存储；本地 OCR 开启而无持久存储时在监听前失败。 */
export const createServerScreenTextEvidenceStorage = (input: {
  storage?: DeliveryStorage;
  screenTextEnabled: boolean;
}): ScreenTextEvidenceStorage | undefined => {
  if (input.storage instanceof ProductionS3CompatibleUploadStorage) {
    return new PersistentScreenTextEvidenceStorage(input.storage);
  }
  if (input.screenTextEnabled) {
    throw new Error('启用本地 OCR 时必须配置持久 ScreenText 证据对象存储。');
  }
  return undefined;
};

export const startServer = async ({
  port = Number(process.env.PORT ?? 3001),
  uploadStorage,
  deliveryStorage,
  systemControlPrincipalResolver,
  systemControlSecretProvider,
  systemControlAccessReadinessProvider,
  systemControlCostConversionProvider,
  systemControlRuntimeTelemetryProvider,
  accessPrincipalResolver,
  employeePrincipalResolver,
  accessRequired,
  termExtractionAdapter,
}: { port?: number; uploadStorage?: UploadStorage; deliveryStorage?: DeliveryStorage; termExtractionAdapter?: TermExtractionAdapter; systemControlPrincipalResolver?: SystemControlPrincipalResolver; systemControlSecretProvider?: SystemControlSecretProvider; systemControlAccessReadinessProvider?: SystemControlAccessReadinessProvider; systemControlCostConversionProvider?: CostConversionRateProvider; systemControlRuntimeTelemetryProvider?: RuntimeTelemetryProvider; accessPrincipalResolver?: CloudflareAccessPrincipalResolver; employeePrincipalResolver?: EmployeePrincipalResolver; accessRequired?: boolean } = {}) => {
  const accessBinding = createCloudflareAccessBindingFromEnv();
  const employeeAuthConfig = createEmployeeAuthConfigFromEnv();
  const employeeAuthService = employeeAuthConfig ? new EmployeeAuthService(employeeAuthConfig) : null;
  const directUploadOrigin = getDirectUploadOrigin();
  const employeeSessionRequired = employeeAuthConfig?.required ?? false;
  const required = accessRequired ?? accessBinding.config?.required ?? false;
  if (process.env.NODE_ENV === 'production' && required && !accessBinding.config) {
    throw new Error('生产环境启用 Cloudflare Access 时必须配置管理员 control issuer、audience 和邮箱白名单。');
  }
  if (process.env.NODE_ENV === 'production' && !employeeAuthService) {
    throw new Error('生产环境必须启用并完整配置员工 Cookie 会话。');
  }
  if (process.env.NODE_ENV === 'production' && systemControlPrincipalResolver) {
    throw new Error('生产环境必须使用 Cloudflare Access 服务端身份解析器。');
  }
  if (process.env.NODE_ENV === 'production' && employeePrincipalResolver) {
    throw new Error('生产环境必须使用服务器端员工 Cookie 会话解析器。');
  }
  const useInjectedAccessResolver = !(process.env.NODE_ENV === 'production' && required);
  const resolvedAccessResolver = useInjectedAccessResolver ? (accessPrincipalResolver ?? accessBinding.resolver ?? undefined) : (accessBinding.resolver ?? undefined);
  const resolvedEmployeeResolver = employeePrincipalResolver ?? (employeeAuthService ? (request) => employeeAuthService.resolvePrincipal(request) : undefined);
  const resolvedRuntimeTelemetryProvider = systemControlRuntimeTelemetryProvider ?? createRuntimeTelemetryProviderFromEnv();
  // provider.env 是唯一 Secret 来源；缺失时 server 仍启动并由受控 Worker 按引用安全失败。
  const resolvedSecretProvider = systemControlSecretProvider ?? createSystemControlSecretProviderFromEnv();
  let resolvedUploadStorage = uploadStorage;
  let resolvedDeliveryStorage = deliveryStorage;
  let resolvedAsrAdapterRegistry: AsrAdapterRegistry | undefined;
  let resolvedScreenTextAdapterRegistry: ScreenTextAdapterRegistry | undefined;
  let resolvedScreenTextEvidenceStorage: ScreenTextEvidenceStorage | undefined;
  const uploadStorageKind = process.env.QIMAO_UPLOAD_STORAGE_KIND?.trim().toLowerCase() || 'filesystem';
  if (uploadStorageKind !== 'filesystem' && uploadStorageKind !== 's3') {
    throw new Error('QIMAO_UPLOAD_STORAGE_KIND 只能是 filesystem 或 s3。');
  }
  if (uploadStorageKind === 's3') {
    const s3Storage = new ProductionS3CompatibleUploadStorage(createProductionS3ConfigFromEnv());
    // 上传与下游读取/交付必须共享同一个 provider 和 objectKey 命名空间。
    resolvedUploadStorage = s3Storage;
    resolvedDeliveryStorage = s3Storage;
  }
  resolvedAsrAdapterRegistry = createServerAsrRegistryFromEnv({
    ...(resolvedUploadStorage ? { uploadStorage: resolvedUploadStorage } : {}),
  }) ?? undefined;
  resolvedScreenTextAdapterRegistry = createServerScreenTextRegistryFromEnv() ?? undefined;
  // OCR 证据与上传/交付复用同一个持久对象存储实例，避免进程内 Map 分叉。
  resolvedScreenTextEvidenceStorage = createServerScreenTextEvidenceStorage({
    ...(resolvedDeliveryStorage ? { storage: resolvedDeliveryStorage } : {}),
    screenTextEnabled: Boolean(resolvedScreenTextAdapterRegistry),
  });
  const storageRoot = process.env.QIMAO_STORAGE_ROOT;
  const cosProvider = uploadStorageKind === 's3' && process.env.QIMAO_S3_PROVIDER?.trim().toLowerCase() === 'tencent-cos';
  const tusDirectory = storageRoot && !cosProvider ? join(storageRoot, 'tus') : undefined;
  if (uploadStorageKind === 'filesystem' && process.env.NODE_ENV === 'production' && (!resolvedUploadStorage || !resolvedDeliveryStorage)) {
    if (!resolvedUploadStorage) resolvedUploadStorage = await FilesystemUploadStorage.create(storageRoot);
    if (!resolvedDeliveryStorage) resolvedDeliveryStorage = await FilesystemDeliveryStorage.create(storageRoot);
  }
  const app = createApp({
    ...(resolvedUploadStorage ? { uploadStorage: resolvedUploadStorage } : {}),
    ...(resolvedDeliveryStorage ? { deliveryStorage: resolvedDeliveryStorage } : {}),
    ...(systemControlPrincipalResolver ? { systemControlPrincipalResolver } : {}),
    systemControlSecretProvider: resolvedSecretProvider,
    ...(systemControlAccessReadinessProvider ? { systemControlAccessReadinessProvider } : {}),
    ...(systemControlCostConversionProvider ? { systemControlCostConversionProvider } : {}),
    ...(resolvedRuntimeTelemetryProvider ? { systemControlRuntimeTelemetryProvider: resolvedRuntimeTelemetryProvider } : {}),
    ...(resolvedAsrAdapterRegistry ? { asrAdapterRegistry: resolvedAsrAdapterRegistry } : {}),
    ...(resolvedScreenTextAdapterRegistry ? { screenTextAdapterRegistry: resolvedScreenTextAdapterRegistry } : {}),
    ...(resolvedScreenTextEvidenceStorage ? { screenTextEvidenceStorage: resolvedScreenTextEvidenceStorage } : {}),
    ...(termExtractionAdapter ? { termExtractionAdapter } : {}),
    ...(resolvedAccessResolver ? { accessPrincipalResolver: resolvedAccessResolver } : {}),
    ...(resolvedEmployeeResolver ? { employeePrincipalResolver: resolvedEmployeeResolver } : {}),
    ...(employeeAuthService ? { employeeAuthService, employeeSessionRequired } : {}),
    directUploadOrigin,
    ...(tusDirectory ? { tusDirectory } : {}),
    ...(required ? { accessRequired: true } : {}),
    ...(!systemControlAccessReadinessProvider ? { systemControlAccessReadinessProvider: accessBinding.readinessProvider } : {}),
  });
  await app.listen({ port, host: '127.0.0.1' });
  return app;
};

const entryUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entryUrl) {
  await startServer();
}
