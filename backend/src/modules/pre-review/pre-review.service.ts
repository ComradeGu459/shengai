import type {
  ApplyPreEditPolicyBody,
  CreatePreEditDecisionBody,
  CreatePreEditReleaseBody,
  CreatePreEditSessionBody,
  PreEditItemQuery,
  RetryPreEditPreparationBody,
  UndoPreEditDecisionBody,
} from '@qimao-terms-cloud/contracts';

import { TermDomainError } from '../terms/term-errors.js';
import { PreReviewReadRepository } from './pre-review.read.repository.js';
import { PreReviewSourceService } from './pre-review.source.js';
import { PreReviewWriteRepository } from './pre-review.write.repository.js';
import { preReviewConflict, preReviewNotFound } from './pre-review.errors.js';

export class PreReviewService {
  constructor(
    private readonly source: PreReviewSourceService,
    private readonly reads: PreReviewReadRepository,
    private readonly writes: PreReviewWriteRepository,
  ) {}

  private async readSession(projectId: string, sessionId: string) {
    const session = await this.reads.getSession(projectId, sessionId);
    if (!session) throw preReviewNotFound('PRE_EDIT_SESSION_NOT_FOUND', '前置审改会话不存在。');
    return session;
  }

  private async reconcileSource(projectId: string, sessionId: string) {
    const session = await this.readSession(projectId, sessionId);
    if (session.status === 'stale') return session;
    try {
      const current = await this.source.inspect(projectId, session.termVersionId);
      if (current.sourceDigest !== session.sourceDigest) {
        await this.writes.markStale(projectId, sessionId);
        return this.readSession(projectId, sessionId);
      }
      return session;
    } catch (error) {
      if (!(error instanceof TermDomainError) && !(error instanceof Error && error.name === 'PreReviewDomainError')) {
        throw error;
      }
      await this.writes.markStale(projectId, sessionId);
      return this.readSession(projectId, sessionId);
    }
  }

  private async requireFresh(projectId: string, sessionId: string) {
    const session = await this.reconcileSource(projectId, sessionId);
    if (session.status === 'stale') {
      throw preReviewConflict('PRE_EDIT_SOURCE_CHANGED', '来源身份已经变化，旧会话只读；请显式创建新会话。');
    }
    return session;
  }

  async createSession(
    projectId: string,
    body: CreatePreEditSessionBody,
    idempotencyKey: string,
  ) {
    const snapshot = await this.source.inspect(projectId, body.termVersionId);
    const created = await this.writes.createSession({
      snapshot,
      expectedProjectVersion: body.expectedProjectVersion,
      key: idempotencyKey,
    });
    return { session: await this.readSession(projectId, created.sessionId), replay: created.replay };
  }

  async getSession(projectId: string, sessionId: string) {
    return this.reconcileSource(projectId, sessionId);
  }

  listSessions(projectId: string) {
    return this.reads.listSessions(projectId);
  }

  async listItems(projectId: string, sessionId: string, query: PreEditItemQuery) {
    await this.reconcileSource(projectId, sessionId);
    return this.reads.listItems(projectId, sessionId, query);
  }

  async listDecisionEvents(projectId: string, sessionId: string, itemId: string) {
    await this.reconcileSource(projectId, sessionId);
    return { items: await this.reads.listDecisionEvents(projectId, sessionId, itemId) };
  }

  async retryPreparation(
    projectId: string,
    sessionId: string,
    body: RetryPreEditPreparationBody,
    idempotencyKey: string,
  ) {
    await this.requireFresh(projectId, sessionId);
    const result = await this.writes.retryPreparation({
      projectId,
      sessionId,
      expectedRevision: body.expectedSessionRevision,
      key: idempotencyKey,
    });
    return { session: await this.readSession(projectId, sessionId), replay: result.replay };
  }

  async applyPolicy(
    projectId: string,
    sessionId: string,
    body: ApplyPreEditPolicyBody,
    idempotencyKey: string,
  ) {
    await this.requireFresh(projectId, sessionId);
    const result = await this.writes.applyPolicy({
      projectId,
      sessionId,
      body,
      key: idempotencyKey,
    });
    const { episodes: _episodes, ...session } = await this.readSession(projectId, sessionId);
    return {
      session,
      affectedItemCount: Number(result.affectedItemCount),
      systemDecisionCount: Number(result.systemDecisionCount),
      protectedHumanDecisionCount: Number(result.protectedHumanDecisionCount),
      safeUpdateCount: Number(result.safeUpdateCount),
      requiresHumanDecisionCount: Number(result.requiresHumanDecisionCount),
      replay: result.replay,
    };
  }

  async previewPolicy(projectId: string, sessionId: string, body: ApplyPreEditPolicyBody) {
    await this.requireFresh(projectId, sessionId);
    return this.writes.previewPolicy({ projectId, sessionId, body });
  }

  async decide(
    projectId: string,
    sessionId: string,
    itemId: string,
    body: CreatePreEditDecisionBody,
    idempotencyKey: string,
  ) {
    await this.requireFresh(projectId, sessionId);
    const result = await this.writes.decide({
      projectId, sessionId, itemId, body, key: idempotencyKey,
    });
    const item = await this.reads.getItem(projectId, sessionId, result.itemId);
    if (!item) throw preReviewNotFound('PRE_EDIT_ITEM_NOT_FOUND', '审改条目不存在。');
    return { item, replay: result.replay };
  }

  async undo(
    projectId: string,
    sessionId: string,
    itemId: string,
    body: UndoPreEditDecisionBody,
    idempotencyKey: string,
  ) {
    await this.requireFresh(projectId, sessionId);
    const result = await this.writes.undo({
      projectId, sessionId, itemId, body, key: idempotencyKey,
    });
    const item = await this.reads.getItem(projectId, sessionId, result.itemId);
    if (!item) throw preReviewNotFound('PRE_EDIT_ITEM_NOT_FOUND', '审改条目不存在。');
    return { item, replay: result.replay };
  }

  async completeEpisode(
    projectId: string,
    sessionId: string,
    episodeNumber: number,
    expectedRevision: number,
    idempotencyKey: string,
  ) {
    await this.requireFresh(projectId, sessionId);
    const result = await this.writes.completeEpisode({
      projectId, sessionId, episodeNumber, expectedRevision, key: idempotencyKey,
    });
    const session = await this.readSession(projectId, sessionId);
    const episode = session.episodes.find((entry) => entry.id === result.episodeId);
    if (!episode) throw preReviewNotFound('PRE_EDIT_EPISODE_NOT_FOUND', '审改集数不存在。');
    return { episode, replay: result.replay };
  }

  async createRelease(
    projectId: string,
    sessionId: string,
    body: CreatePreEditReleaseBody,
    idempotencyKey: string,
  ) {
    await this.requireFresh(projectId, sessionId);
    const result = await this.writes.createRelease({
      projectId, sessionId, body, key: idempotencyKey,
    });
    const release = (await this.reads.listReleases(projectId)).find((entry) => entry.id === result.releaseId);
    if (!release) throw preReviewNotFound('PRE_EDIT_RELEASE_NOT_FOUND', '待验收修订不存在。');
    return { release, replay: result.replay };
  }

  listReleases(projectId: string) {
    return this.reads.listReleases(projectId).then((items) => ({ items }));
  }

  downloadReleaseFile(projectId: string, releaseId: string, episodeNumber: number) {
    return this.writes.downloadReleaseFile(projectId, releaseId, episodeNumber);
  }

  async createPlaybackGrant(
    projectId: string,
    sessionId: string,
    itemId: string,
    expectedSessionRevision: number,
  ) {
    return this.writes.createPlaybackGrant({
      projectId, sessionId, itemId, expectedSessionRevision,
    });
  }

  readPlayback(token: string) {
    return this.writes.readPlayback(token);
  }
}
