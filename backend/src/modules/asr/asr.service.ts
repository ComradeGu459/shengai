import type {
  AsrBatchListQuery,
  AsrBatchPreparationQuery,
  AsrDispatchGroupListQuery,
  AsrEligibilityBody,
  AsrProjectEligibilitySearchQuery,
  CreateAsrDispatchGroupBody,
  CreateAsrBatchBody,
  RetryAsrBatchBody,
} from '@qimao-terms-cloud/contracts';

import { AsrCommandRepository } from './asr-command.repository.js';
import { AsrDispatchRepository } from './asr-dispatch.repository.js';
import { AsrEligibilityRepository } from './asr-eligibility.repository.js';
import { AsrDomainError, asrNotFound } from './asr-errors.js';
import { AsrReadRepository } from './asr-read.repository.js';

export class AsrService {
  constructor(
    private readonly commands: AsrCommandRepository,
    private readonly reads: AsrReadRepository,
    private readonly eligibility: AsrEligibilityRepository,
    private readonly dispatches: AsrDispatchRepository,
    private readonly fakeEnabled: boolean,
  ) {}

  create(projectId: string, body: CreateAsrBatchBody, idempotencyKey: string) {
    if (!this.fakeEnabled) {
      throw new AsrDomainError(
        'ASR_FAKE_DISABLED',
        '生产环境未启用模拟识别，真实供应商仍需单独授权。',
        503,
        'contact_administrator',
      );
    }
    return this.commands.create({ projectId, body, idempotencyKey });
  }

  previewHotwords(projectId: string, termVersionId: string) {
    return this.reads.previewHotwords(projectId, termVersionId);
  }

  prepareBatch(projectId: string, query: AsrBatchPreparationQuery) {
    return this.eligibility.prepareBatch(projectId, query);
  }

  async batchHotwords(projectId: string, batchId: string) {
    const evidence = await this.reads.batchHotwords(projectId, batchId);
    if (!evidence) throw asrNotFound('ASR_BATCH_NOT_FOUND', 'ASR 批次不存在。');
    return evidence;
  }

  evaluateEligibility(body: AsrEligibilityBody) {
    return this.eligibility.evaluate(body.projectIds);
  }

  searchEligibility(query: AsrProjectEligibilitySearchQuery) {
    return this.eligibility.search(query);
  }

  createDispatchGroup(
    body: CreateAsrDispatchGroupBody,
    idempotencyKey: string,
    requestId: string,
  ) {
    if (!this.fakeEnabled) {
      throw new AsrDomainError(
        'ASR_FAKE_DISABLED',
        '生产环境未启用模拟识别，真实供应商仍需单独授权。',
        503,
        'contact_administrator',
      );
    }
    return this.dispatches.create({ body, idempotencyKey, requestId });
  }

  listDispatchGroups(query: AsrDispatchGroupListQuery) {
    return this.dispatches.list(query);
  }

  getDispatchGroup(groupId: string) {
    return this.dispatches.get(groupId);
  }

  cancelDispatchGroup(groupId: string, idempotencyKey: string) {
    return this.dispatches.cancel({ groupId, idempotencyKey });
  }

  list(projectId: string, query: AsrBatchListQuery) {
    return this.reads.list(projectId, query);
  }

  async get(projectId: string, batchId: string) {
    const batch = await this.reads.get(projectId, batchId);
    if (!batch) throw asrNotFound('ASR_BATCH_NOT_FOUND', 'ASR 批次不存在。');
    return batch;
  }

  cancel(projectId: string, batchId: string, idempotencyKey: string) {
    return this.commands.cancel({ projectId, batchId, idempotencyKey });
  }

  retry(projectId: string, batchId: string, body: RetryAsrBatchBody, idempotencyKey: string) {
    if (!this.fakeEnabled) {
      throw new AsrDomainError(
        'ASR_FAKE_DISABLED',
        '生产环境未启用模拟识别，真实供应商仍需单独授权。',
        503,
        'contact_administrator',
      );
    }
    return this.commands.retry({ projectId, batchId, body, idempotencyKey });
  }
}
