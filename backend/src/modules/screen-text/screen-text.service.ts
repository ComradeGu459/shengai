import { createHash } from 'node:crypto';
import type {
  ConfirmEmptyScreenTextEpisodeBody,
  CreateManualScreenTextCandidateBody,
  CreateScreenTextBatchBody,
  CreateScreenTextDecisionBody,
  CreateScreenTextReleaseBody,
  RetryScreenTextBatchBody,
  ScreenTextBatchListQuery,
  ScreenTextCandidateQuery,
  ScreenTextReleaseListQuery,
} from '@qimao-terms-cloud/contracts';

import type { ScreenTextEvidenceStorage } from './screen-text.evidence-storage.js';
import { screenTextConflict, screenTextNotFound } from './screen-text.errors.js';
import { ScreenTextReadRepository } from './screen-text.read.repository.js';
import { ScreenTextPlaybackRepository } from './screen-text.playback.repository.js';
import { ScreenTextWriteRepository } from './screen-text.write.repository.js';

export class ScreenTextService {
  constructor(
    private readonly reads: ScreenTextReadRepository,
    private readonly writes: ScreenTextWriteRepository,
    private readonly playback: ScreenTextPlaybackRepository,
    private readonly evidenceStorage: ScreenTextEvidenceStorage,
  ) {}

  create(projectId: string, body: CreateScreenTextBatchBody, key: string, requestId: string) {
    return this.writes.create({ projectId, body, idempotencyKey: key, requestId });
  }

  async getBatch(projectId: string, batchId: string) {
    const batch = await this.reads.getBatch(projectId, batchId);
    if (!batch) throw screenTextNotFound('SCREEN_TEXT_BATCH_NOT_FOUND', '画面字批次不存在。');
    return batch;
  }

  listBatches(projectId: string, query: ScreenTextBatchListQuery) {
    return this.reads.listBatches(projectId, query);
  }

  listCandidates(projectId: string, batchId: string, query: ScreenTextCandidateQuery) {
    return this.reads.listCandidates(projectId, batchId, query);
  }

  decide(projectId: string, candidateId: string, body: CreateScreenTextDecisionBody, key: string) {
    return this.writes.decide(projectId, candidateId, body, key);
  }

  createManual(projectId: string, batchId: string, episodeNumber: number, body: CreateManualScreenTextCandidateBody, key: string) {
    return this.writes.createManual(projectId, batchId, episodeNumber, body, key);
  }

  confirmEmpty(projectId: string, batchId: string, episodeNumber: number, body: ConfirmEmptyScreenTextEpisodeBody, key: string) {
    return this.writes.confirmEmpty(projectId, batchId, episodeNumber, body, key);
  }

  cancel(projectId: string, batchId: string, key: string) { return this.writes.cancel(projectId, batchId, key); }
  retry(projectId: string, batchId: string, body: RetryScreenTextBatchBody, key: string) {
    return this.writes.retry(projectId, batchId, body, key);
  }
  listEvents(projectId: string, batchId: string) { return this.reads.listEvents(projectId, batchId); }
  release(projectId: string, body: CreateScreenTextReleaseBody, key: string) { return this.writes.release(projectId, body, key); }

  async getRelease(projectId: string, releaseId: string) {
    const release = await this.reads.getRelease(projectId, releaseId);
    if (!release) throw screenTextNotFound('SCREEN_TEXT_RELEASE_NOT_FOUND', '画面字发布版本不存在。');
    return release;
  }

  listReleases(projectId: string, query: ScreenTextReleaseListQuery) {
    return this.reads.listReleases(projectId, query);
  }

  async getExport(projectId: string, exportId: string) {
    const item = await this.reads.getExport(projectId, exportId);
    if (!item) throw screenTextNotFound('SCREEN_TEXT_EXPORT_NOT_FOUND', '画面字 SRT 不存在。');
    return item;
  }

  async getEvidence(projectId: string, candidateId: string) {
    const item = await this.reads.getEvidence(projectId, candidateId);
    if (!item) throw screenTextNotFound('SCREEN_TEXT_CANDIDATE_NOT_FOUND', '画面字截图证据不存在。');
    const expectedPrefix = `derived/screen-text/${item.batch_id}/${item.episode_number}/`;
    if (typeof item.evidence.objectKey !== 'string' || !item.evidence.objectKey.startsWith(expectedPrefix)) {
      throw screenTextConflict(
        'SCREEN_TEXT_EVIDENCE_NOT_AVAILABLE', '画面字截图证据缺失或归属不一致。', 'retry_screen_text_episode',
      );
    }
    const stored = await this.evidenceStorage.readObject(item.evidence.objectKey);
    const checksum = stored ? createHash('sha256').update(stored.bytes).digest('hex') : null;
    if (!stored || checksum !== item.evidence.checksum
      || stored.checksum !== item.evidence.checksum
      || stored.sizeBytes !== item.evidence.sizeBytes
      || stored.contentType !== item.evidence.contentType) {
      throw screenTextConflict(
        'SCREEN_TEXT_EVIDENCE_NOT_AVAILABLE', '画面字截图证据缺失或摘要不一致。', 'retry_screen_text_episode',
      );
    }
    return { bytes: stored.bytes, contentType: stored.contentType, checksum: stored.checksum };
  }

  createPlaybackGrant(projectId: string, candidateId: string, expectedBatchRevision: number) {
    return this.playback.createGrant({ projectId, candidateId, expectedBatchRevision });
  }

  readPlayback(token: string) { return this.playback.read(token); }
}
