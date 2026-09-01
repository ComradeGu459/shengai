import type { ProjectLifecycleConfig } from '../../config.js';
import type { UploadStorage } from '../uploads/upload-storage.js';
import {
  ProjectLifecycleRepository,
  type MultipartCleanupTarget,
} from './project-lifecycle.repository.js';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

export class ProjectLifecycleService {
  constructor(
    private readonly repository: ProjectLifecycleRepository,
    private readonly storage: UploadStorage,
    private readonly config: ProjectLifecycleConfig,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  private async cleanupMultipartTargets(projectId: string, targets: MultipartCleanupTarget[]) {
    for (const target of targets) {
      const now = this.clock();
      try {
        await this.storage.abortMultipart({ storageUploadId: target.storageUploadId, objectKey: target.objectKey });
        const objectOutcome = await this.storage.deleteObject(target.objectKey);
        await this.repository.recordMultipartCleanup(target, { ok: true }, now);
        await this.repository.recordAudit(projectId, 'multipart_cleanup_completed', {
          uploadSessionId: target.uploadSessionId,
          objectOutcome,
        }, now);
      } catch (error) {
        await this.repository.recordMultipartCleanup(
          target,
          { ok: false, error: errorMessage(error) },
          now,
        ).catch(() => undefined);
        await this.repository.recordAudit(projectId, 'multipart_cleanup_failed', {
          uploadSessionId: target.uploadSessionId,
          error: errorMessage(error),
        }, now).catch(() => undefined);
      }
    }
  }

  async recycle(input: {
    projectId: string;
    expectedVersion: number;
    idempotencyKey: string;
    requestHash: string;
    actor: string;
  }) {
    const now = this.clock();
    const result = await this.repository.recycle({
      ...input,
      now,
      expiresAt: new Date(now.getTime() + this.config.recycleRetentionMs),
    });
    await this.cleanupMultipartTargets(input.projectId, result.cleanupTargets);
    return {
      project: result.project,
      terminatedUploadCount: result.terminatedUploadCount,
      replay: result.replay,
    };
  }

  async restore(input: {
    projectId: string;
    expectedVersion: number;
    idempotencyKey: string;
    requestHash: string;
    actor: string;
  }) {
    const result = await this.repository.restore({ ...input, now: this.clock() });
    await this.cleanupMultipartTargets(input.projectId, result.cleanupTargets);
    return {
      project: result.project,
      replay: result.replay,
    };
  }

  async purge(input: {
    projectId: string;
    expectedVersion: number;
    idempotencyKey: string;
    requestHash: string;
    actor: string;
  }) {
    const result = await this.repository.purge({ ...input, now: this.clock() });
    return {
      project: result.project,
      replay: result.replay,
    };
  }

  async findPurgeCommand(input: { projectId: string; idempotencyKey: string }) {
    return this.repository.findPurgeCommand(input);
  }
}
