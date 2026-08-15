import { randomUUID } from 'node:crypto';

import type { ProjectLifecycleConfig } from '../config.js';
import type { DatabasePool } from '../database/pool.js';
import { ProjectLifecycleRepository } from '../modules/projects/project-lifecycle.repository.js';
import type { UploadStorage } from '../modules/uploads/upload-storage.js';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

export class ProjectCleanupWorker {
  private readonly repository: ProjectLifecycleRepository;

  constructor(
    database: DatabasePool,
    private readonly storage: UploadStorage,
    private readonly config: ProjectLifecycleConfig,
    private readonly options: { workerId?: string; clock?: () => Date } = {},
  ) {
    this.repository = new ProjectLifecycleRepository(database);
  }

  private now() {
    return this.options.clock?.() ?? new Date();
  }

  async runOnce(): Promise<{ processed: false } | { processed: true; projectId: string; status: 'completed' | 'retryable' | 'failed' }> {
    const workerId = this.options.workerId ?? `cleanup-${randomUUID()}`;
    const claimedAt = this.now();
    const job = await this.repository.claimCleanupJob({
      workerId,
      now: claimedAt,
      leaseExpiresAt: new Date(claimedAt.getTime() + this.config.cleanupLeaseMs),
    });
    if (!job) return { processed: false };

    try {
      const multipartTargets = await this.repository.listMultipartCleanups(job.projectId);
      for (const target of multipartTargets) {
        const now = this.now();
        try {
          await this.storage.abortMultipart(target.storageUploadId);
          const objectOutcome = await this.storage.deleteObject(target.objectKey);
          await this.repository.recordMultipartCleanup(target, { ok: true }, now);
          await this.repository.recordAudit(job.projectId, 'multipart_cleanup_completed', {
            uploadSessionId: target.uploadSessionId,
            objectOutcome,
          }, now);
        } catch (error) {
          await this.repository.recordMultipartCleanup(target, {
            ok: false,
            error: errorMessage(error),
          }, now);
          throw error;
        }
      }

      for (const asset of await this.repository.listCleanupAssets(job.projectId)) {
        const outcome = await this.storage.deleteObject(asset.objectKey);
        await this.repository.recordAudit(job.projectId, `object_${outcome}`, {
          assetId: asset.id,
          objectKey: asset.objectKey,
        }, this.now());
      }

      await this.repository.finalizePurge({
        job,
        workerId,
        now: this.now(),
      });
      return { processed: true, projectId: job.projectId, status: 'completed' };
    } catch (error) {
      const failedAt = this.now();
      await this.repository.failCleanupJob({
        job,
        workerId,
        now: failedAt,
        nextAttemptAt: new Date(failedAt.getTime() + this.config.cleanupRetryDelayMs),
        maxAttempts: this.config.cleanupMaxAttempts,
        error: errorMessage(error),
      });
      return {
        processed: true,
        projectId: job.projectId,
        status: job.attemptCount >= this.config.cleanupMaxAttempts ? 'failed' : 'retryable',
      };
    }
  }
}
