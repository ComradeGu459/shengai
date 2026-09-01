import type { DatabasePool } from '../database/pool.js';
import type { ProjectLifecycleConfig, UploadProtocolConfig } from '../config.js';
import type { UploadStorage } from '../modules/uploads/upload-storage.js';
import type { TermExtractionAdapter } from '../modules/terms/term-extraction.js';
import type { AsrAdapterRegistry } from '../modules/asr/asr-adapter-registry.js';
import type { ScreenTextAdapterRegistry } from '../modules/screen-text/screen-text.adapter-registry.js';
import type { ScreenTextEvidenceStorage } from '../modules/screen-text/screen-text.evidence-storage.js';
import type { DeliveryStorage } from '../modules/deliveries/delivery-storage.js';
import type { SystemControlPrincipalResolver } from '../modules/system-control/system-control.auth.js';
import type { SystemControlAccessReadinessProvider, SystemControlSecretProvider } from '../modules/system-control/system-control.secret-provider.js';
import type { CostConversionRateProvider } from '../modules/system-control/system-control.cost.service.js';
import type { RuntimeTelemetryProvider } from '../modules/system-control/system-control.runtime.service.js';
import type { FeedbackScreenshotStorage } from '../modules/feedback/feedback-storage.js';
import type { SystemControlPrincipal } from '../modules/system-control/system-control.auth.js';
import type { EmployeeAuthService } from '../modules/employee-auth/employee-auth.js';

declare module 'fastify' {
  interface FastifyInstance {
    database: DatabasePool;
    uploadStorage: UploadStorage;
    uploadConfig: UploadProtocolConfig;
    lifecycleConfig: ProjectLifecycleConfig;
    termExtractionAdapter: TermExtractionAdapter;
    asrAdapterRegistry: AsrAdapterRegistry;
    screenTextAdapterRegistry: ScreenTextAdapterRegistry;
    screenTextEvidenceStorage: ScreenTextEvidenceStorage;
    deliveryStorage: DeliveryStorage;
    systemControlPrincipalResolver: SystemControlPrincipalResolver;
    systemControlSecretProvider: SystemControlSecretProvider;
    systemControlAccessReadinessProvider: SystemControlAccessReadinessProvider;
    systemControlCostConversionProvider: CostConversionRateProvider;
    systemControlRuntimeTelemetryProvider: RuntimeTelemetryProvider | null;
    feedbackScreenshotStorage: FeedbackScreenshotStorage;
    employeeAuthService: EmployeeAuthService | null;
    directUploadOrigin: string | null;
    /** 仅测试/历史兼容实例显式开启；正式 COS 实例不注册可写 TUS 面。 */
    legacyTusEnabled: boolean;
  }

  interface FastifyRequest {
    accessPrincipal: SystemControlPrincipal | null;
    employeePrincipal: SystemControlPrincipal | null;
  }
}
