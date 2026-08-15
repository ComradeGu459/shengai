import type { DatabasePool } from '../database/pool.js';
import type { ProjectLifecycleConfig, UploadProtocolConfig } from '../config.js';
import type { UploadStorage } from '../modules/uploads/upload-storage.js';
import type { TermExtractionAdapter } from '../modules/terms/term-extraction.js';
import type { AsrAdapterRegistry } from '../modules/asr/asr-adapter-registry.js';
import type { ScreenTextAdapterRegistry } from '../modules/screen-text/screen-text.adapter-registry.js';
import type { ScreenTextEvidenceStorage } from '../modules/screen-text/screen-text.evidence-storage.js';

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
  }
}
