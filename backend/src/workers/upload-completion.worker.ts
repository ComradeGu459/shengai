import type { UploadCompletionConfig } from '../config.js';
import type { DatabasePool } from '../database/pool.js';
import { UploadCompletionRepository } from '../modules/uploads/upload-completion.repository.js';
import {
  UploadProjectInactiveError,
  UploadRepository,
} from '../modules/uploads/upload.repository.js';
import type { UploadStorage } from '../modules/uploads/upload-storage.js';

const errorText = (error: unknown) => error instanceof Error ? error.message : '完成任务发生未知错误。';

export type UploadCompletionRunResult =
  | { processed: false }
  | { processed: true; uploadSessionId: string; status: 'completed' | 'retryable' | 'failed' | 'cancelled' };

export class UploadCompletionWorker {
  private readonly jobs: UploadCompletionRepository;
  private readonly uploads: UploadRepository;

  constructor(
    database: DatabasePool,
    private readonly storage: UploadStorage,
    private readonly config: UploadCompletionConfig,
    private readonly options: { workerId?: string; clock?: () => Date } = {},
  ) {
    this.jobs = new UploadCompletionRepository(database);
    this.uploads = new UploadRepository(database);
  }

  private now() {
    return this.options.clock?.() ?? new Date();
  }

  private async retry(input: {
    claim: NonNullable<Awaited<ReturnType<UploadCompletionRepository['claim']>>>;
    stage: Parameters<UploadCompletionRepository['markRetryable']>[0]['stage'];
    code: string;
    error: string;
  }): Promise<'retryable' | 'failed'> {
    const now = this.now();
    const transition = await this.jobs.markRetryable({
      job: input.claim.job,
      workerId: this.workerId,
      stage: input.stage,
      code: input.code,
      error: input.error,
      now,
      nextAttemptAt: new Date(now.getTime() + this.config.retryDelayMs),
      maxAttempts: this.config.maxAttempts,
    });
    if (transition.applied && transition.terminal) {
      await this.uploads.fail(input.claim.uploadSessionId, codeForSession(input.code), input.error);
    }
    return transition.applied && transition.terminal ? 'failed' : 'retryable';
  }

  private get workerId() {
    return this.options.workerId ?? 'upload-completion-worker';
  }

  private async removeLateObject(input: {
    claim: NonNullable<Awaited<ReturnType<UploadCompletionRepository['claim']>>>;
    objectKey: string;
  }): Promise<'cleaned' | 'retryable' | 'failed'> {
    try {
      await this.storage.deleteObject(input.objectKey);
      return 'cleaned';
    } catch (error) {
      return this.retry({
        claim: input.claim,
        stage: 'reconciliation_required',
        code: 'UPLOAD_LATE_OBJECT_CLEANUP_UNKNOWN',
        error: errorText(error),
      });
    }
  }

  async runOnce(): Promise<UploadCompletionRunResult> {
    const claimed = await this.jobs.claim({
      workerId: this.workerId,
      now: this.now(),
      leaseExpiresAt: new Date(this.now().getTime() + this.config.leaseMs),
    });
    if (!claimed) return { processed: false };
    if (claimed.sessionStatus === 'completed') {
      await this.jobs.markCompleted({ jobId: claimed.job.id, workerId: this.workerId, now: this.now() });
      return { processed: true, uploadSessionId: claimed.uploadSessionId, status: 'completed' };
    }
    if (claimed.lifecycleStatus !== 'active' || claimed.sessionStatus !== 'verifying') {
      const cleanup = await this.removeLateObject({ claim: claimed, objectKey: claimed.objectKey });
      if (cleanup !== 'cleaned') return { processed: true, uploadSessionId: claimed.uploadSessionId, status: cleanup };
      await this.jobs.markCancelled({
        jobId: claimed.job.id,
        workerId: this.workerId,
        now: this.now(),
        code: 'UPLOAD_COMPLETION_CANCELLED',
        error: '项目或上传会话已进入终态。',
      });
      return { processed: true, uploadSessionId: claimed.uploadSessionId, status: 'cancelled' };
    }

    const step = await this.jobs.prepareExternalStep({ jobId: claimed.job.id, workerId: this.workerId, now: this.now() });
    if (!step.active) {
      if (step.reason === 'already_completed') {
        await this.jobs.markCompleted({ jobId: claimed.job.id, workerId: this.workerId, now: this.now() });
        return { processed: true, uploadSessionId: claimed.uploadSessionId, status: 'completed' };
      }
      if (step.reason === 'not_active') {
        const cleanup = await this.removeLateObject({ claim: claimed, objectKey: claimed.objectKey });
        if (cleanup !== 'cleaned') return { processed: true, uploadSessionId: claimed.uploadSessionId, status: cleanup };
        await this.jobs.markCancelled({
          jobId: claimed.job.id, workerId: this.workerId, now: this.now(),
          code: 'UPLOAD_COMPLETION_CANCELLED', error: '项目或上传会话已进入终态。',
        });
        return { processed: true, uploadSessionId: claimed.uploadSessionId, status: 'cancelled' };
      }
      return { processed: true, uploadSessionId: claimed.uploadSessionId, status: 'retryable' };
    }

    const session = await this.uploads.findById(claimed.uploadSessionId);
    if (!session || session.status !== 'verifying') {
      const cleanup = await this.removeLateObject({ claim: claimed, objectKey: step.objectKey });
      if (cleanup !== 'cleaned') return { processed: true, uploadSessionId: claimed.uploadSessionId, status: cleanup };
      await this.jobs.markCancelled({
        jobId: claimed.job.id,
        workerId: this.workerId,
        now: this.now(),
        code: 'UPLOAD_COMPLETION_CANCELLED',
        error: '上传会话已不在 verifying 状态。',
      });
      return { processed: true, uploadSessionId: claimed.uploadSessionId, status: 'cancelled' };
    }
    if (session.transportKind !== 'multipart') {
      const transition = await this.jobs.markFailed({
        jobId: claimed.job.id,
        workerId: this.workerId,
        stage: 'verifying',
        code: 'UPLOAD_TRANSPORT_MISMATCH',
        error: '异步完成 Worker 只处理 multipart 会话。',
        now: this.now(),
      });
      if (transition.applied) await this.uploads.fail(session.id, 'UPLOAD_TRANSPORT_MISMATCH', '异步完成 Worker 只处理 multipart 会话。');
      return { processed: true, uploadSessionId: session.id, status: transition.applied ? 'failed' : 'retryable' };
    }

    if (step.shouldComplete) {
      try {
        await this.storage.completeMultipart({
          storageUploadId: step.storageUploadId,
          objectKey: step.objectKey,
          parts: session.confirmedParts,
        });
        await this.jobs.setStage({ jobId: claimed.job.id, workerId: this.workerId, stage: 'verifying', now: this.now() });
      } catch (error) {
        const currentAfterFailure = await this.uploads.findById(session.id);
        if (!currentAfterFailure || ['aborted', 'expired'].includes(currentAfterFailure.status)) {
          const cleanup = await this.removeLateObject({ claim: claimed, objectKey: step.objectKey });
          if (cleanup !== 'cleaned') return { processed: true, uploadSessionId: session.id, status: cleanup };
          await this.jobs.markCancelled({
            jobId: claimed.job.id, workerId: this.workerId, now: this.now(),
            code: 'PROJECT_PURGED_DURING_UPLOAD', error: '项目清理期间完成结果晚到，已删除同一对象。',
          });
          return { processed: true, uploadSessionId: session.id, status: 'cancelled' };
        }
        const status = await this.retry({
          claim: claimed,
          stage: 'reconciliation_required',
          code: 'UPLOAD_COMPLETE_UNKNOWN',
          error: errorText(error),
        });
        return { processed: true, uploadSessionId: session.id, status };
      }
    }

    const head = await this.storage.headObject(step.objectKey).catch((error) => ({ error } as const));
    if (head === null) {
      const status = await this.retry({ claim: claimed, stage: 'reconciliation_required', code: 'STORAGE_OBJECT_NOT_FOUND', error: '完成后按同一对象身份未找到对象。' });
      return { processed: true, uploadSessionId: session.id, status };
    }
    if ('error' in head) {
      const status = await this.retry({ claim: claimed, stage: 'reconciliation_required', code: 'UPLOAD_HEAD_UNKNOWN', error: errorText(head.error) });
      return { processed: true, uploadSessionId: session.id, status };
    }
    if (head.sizeBytes !== session.sizeBytes) {
      const transition = await this.jobs.markFailed({ jobId: claimed.job.id, workerId: this.workerId, stage: 'verifying', code: 'UPLOAD_SIZE_MISMATCH', error: '对象总大小与声明不一致。', now: this.now() });
      if (transition.applied) await this.uploads.fail(session.id, 'UPLOAD_SIZE_MISMATCH', '对象总大小与声明不一致。');
      return { processed: true, uploadSessionId: session.id, status: transition.applied ? 'failed' : 'retryable' };
    }
    if (session.checksumValue !== null && head.checksumValue !== session.checksumValue) {
      const transition = await this.jobs.markFailed({ jobId: claimed.job.id, workerId: this.workerId, stage: 'verifying', code: 'UPLOAD_CHECKSUM_MISMATCH', error: '对象校验值不一致。', now: this.now() });
      if (transition.applied) await this.uploads.fail(session.id, 'UPLOAD_CHECKSUM_MISMATCH', '对象校验值不一致。');
      return { processed: true, uploadSessionId: session.id, status: transition.applied ? 'failed' : 'retryable' };
    }

    try {
      await this.jobs.setStage({ jobId: claimed.job.id, workerId: this.workerId, stage: 'binding', now: this.now() });
      const completed = await this.uploads.complete({
        uploadId: session.id,
        idempotencyKey: claimed.job.idempotencyKey,
        requestHash: claimed.job.requestHash,
        checksumValue: head.checksumValue,
      });
      if (!completed) throw new Error('完成会话不存在。');
      await this.jobs.markCompleted({ jobId: claimed.job.id, workerId: this.workerId, now: this.now() });
      return { processed: true, uploadSessionId: session.id, status: 'completed' };
    } catch (error) {
      if (error instanceof UploadProjectInactiveError) {
        const cleanup = await this.removeLateObject({ claim: claimed, objectKey: step.objectKey });
        if (cleanup !== 'cleaned') return { processed: true, uploadSessionId: session.id, status: cleanup };
        await this.jobs.markCancelled({ jobId: claimed.job.id, workerId: this.workerId, now: this.now(), code: 'PROJECT_NOT_ACTIVE', error: error.message });
        return { processed: true, uploadSessionId: session.id, status: 'cancelled' };
      }
      const stillPresent = await this.uploads.findById(session.id);
      if (!stillPresent) {
        const cleanup = await this.removeLateObject({ claim: claimed, objectKey: step.objectKey });
        if (cleanup !== 'cleaned') return { processed: true, uploadSessionId: session.id, status: cleanup };
        await this.jobs.markCancelled({ jobId: claimed.job.id, workerId: this.workerId, now: this.now(), code: 'PROJECT_PURGED_DURING_UPLOAD', error: '项目清理期间完成结果晚到，已删除同一对象。' });
        return { processed: true, uploadSessionId: session.id, status: 'cancelled' };
      }
      const transition = await this.jobs.markFailed({ jobId: claimed.job.id, workerId: this.workerId, stage: 'binding', code: 'UPLOAD_COMPLETION_FAILED', error: errorText(error), now: this.now() });
      if (transition.applied) await this.uploads.fail(session.id, 'UPLOAD_COMPLETION_FAILED', errorText(error));
      return { processed: true, uploadSessionId: session.id, status: transition.applied ? 'failed' : 'retryable' };
    }
  }
}

const codeForSession = (code: string) => code === 'STORAGE_OBJECT_NOT_FOUND' ? code : 'STORAGE_TEMPORARY_FAILURE';
