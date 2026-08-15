import { randomUUID } from 'node:crypto';

import type {
  ApplyAcceptanceCueCommandBody, CreateAcceptanceIssueBody, CreateAcceptanceReleaseBody,
  CreateAcceptanceReworkBody, CreateAcceptanceSessionBody, CreateAcceptancePlaybackGrantBody,
  PassAcceptanceEpisodeBody, PassAcceptanceEpisodesBody, ResolveAcceptanceIssueBody,
  SelectAcceptanceVideoBody, UndoAcceptanceEditBody,
} from '@qimao-terms-cloud/contracts';

import type { DatabasePool } from '../../database/pool.js';
import type { UploadStorage } from '../uploads/upload-storage.js';
import { sha256 } from './subtitle-acceptance.domain.js';
import { acceptanceConflict, acceptanceInvalid, acceptanceNotFound } from './subtitle-acceptance.errors.js';
import { SubtitleAcceptanceReadRepository } from './subtitle-acceptance.read.repository.js';
import { SubtitleAcceptanceSourceService } from './subtitle-acceptance.source.js';
import { SubtitleAcceptanceWriteRepository } from './subtitle-acceptance.write.repository.js';

export class SubtitleAcceptanceService {
  private readonly reads: SubtitleAcceptanceReadRepository;
  private readonly writes: SubtitleAcceptanceWriteRepository;
  private readonly source: SubtitleAcceptanceSourceService;

  constructor(private readonly pool: DatabasePool, private readonly storage: UploadStorage) {
    this.reads = new SubtitleAcceptanceReadRepository(pool);
    this.writes = new SubtitleAcceptanceWriteRepository(pool);
    this.source = new SubtitleAcceptanceSourceService(pool);
  }

  private async session(projectId: string, sessionId: string) {
    const session = await this.reads.getSession(projectId, sessionId);
    if (!session) throw acceptanceNotFound('ACCEPTANCE_SESSION_NOT_FOUND', '验收会话不存在。');
    return session;
  }

  private async refresh(projectId: string, sessionId: string) {
    const session = await this.session(projectId, sessionId);
    if (session.status === 'stale') return session;
    const current = await this.source.isCurrent({ projectId, ...session.source } as any);
    if (!current) { await this.writes.markStale(projectId, sessionId); return this.session(projectId, sessionId); }
    return session;
  }

  private async requireFresh(projectId: string, sessionId: string) {
    const session = await this.refresh(projectId, sessionId);
    if (session.status === 'stale') throw acceptanceConflict('ACCEPTANCE_SOURCE_CHANGED', '来源身份已变化，旧验收会话只读。', 'create_acceptance_session');
    return session;
  }

  async createSession(projectId: string, body: CreateAcceptanceSessionBody, key: string) {
    const snapshot = await this.source.inspect(projectId, body);
    const result = await this.writes.createSession({ projectId, body, key, snapshot });
    return { session: await this.session(projectId, result.resourceId), replay: result.replay };
  }
  async listSessions(projectId: string) { return this.reads.listSessions(projectId); }
  async getSession(projectId: string, sessionId: string) { return this.refresh(projectId, sessionId); }
  async getEpisode(projectId: string, sessionId: string, episodeNumber: number) { await this.refresh(projectId, sessionId); const episode = await this.reads.getEpisode(projectId, sessionId, episodeNumber); if (!episode) throw acceptanceNotFound('ACCEPTANCE_EPISODE_NOT_FOUND', '验收集不存在。'); return episode; }
  async events(projectId: string, sessionId: string, episodeNumber: number) { await this.refresh(projectId, sessionId); return this.reads.listEvents(projectId, sessionId, episodeNumber); }
  async rework(projectId: string, sessionId: string) { await this.refresh(projectId, sessionId); return this.reads.listRework(projectId, sessionId); }

  async edit(projectId: string, sessionId: string, episodeNumber: number, body: ApplyAcceptanceCueCommandBody, key: string) { await this.requireFresh(projectId, sessionId); const result = await this.writes.applyCueCommand({ projectId, sessionId, episodeNumber, body, key }); return { episode: await this.getEpisode(projectId, sessionId, episodeNumber), replay: result.replay }; }
  async restore(projectId: string, sessionId: string, episodeNumber: number, body: UndoAcceptanceEditBody, key: string, direction: 'undo' | 'redo') { await this.requireFresh(projectId, sessionId); const result = await this.writes.restoreEdit({ projectId, sessionId, episodeNumber, ...body, key, direction }); return { episode: await this.getEpisode(projectId, sessionId, episodeNumber), replay: result.replay }; }
  async createIssue(projectId: string, sessionId: string, episodeNumber: number, body: CreateAcceptanceIssueBody, key: string) { await this.requireFresh(projectId, sessionId); const result = await this.writes.createIssue({ projectId, sessionId, episodeNumber, body, key }); return { episode: await this.getEpisode(projectId, sessionId, episodeNumber), replay: result.replay }; }
  async resolveIssue(projectId: string, sessionId: string, episodeNumber: number, issueId: string, body: ResolveAcceptanceIssueBody, key: string) { await this.requireFresh(projectId, sessionId); const result = await this.writes.resolveIssue({ projectId, sessionId, episodeNumber, issueId, body, key }); return { episode: await this.getEpisode(projectId, sessionId, episodeNumber), replay: result.replay }; }
  async selectVideo(projectId: string, sessionId: string, episodeNumber: number, body: SelectAcceptanceVideoBody, key: string) { await this.requireFresh(projectId, sessionId); const result = await this.writes.selectVideo({ projectId, sessionId, episodeNumber, assetId: body.assetId, expectedSessionRevision: body.expectedSessionRevision, expectedEpisodeRevision: body.expectedEpisodeRevision, key }); return { episode: await this.getEpisode(projectId, sessionId, episodeNumber), replay: result.replay }; }

  async preflight(projectId: string, sessionId: string) {
    const session = await this.refresh(projectId, sessionId); const episodes = await Promise.all(session.episodes.map((episode) => this.getEpisode(projectId, sessionId, episode.episodeNumber)));
    const states = episodes.map(({ episode, issues }) => ({ episodeNumber: episode.episodeNumber, eligible: !issues.some((issue) => issue.status === 'open' && (issue.severity === 'error' || issue.origin === 'manual')), errorCodes: issues.filter((issue) => issue.status === 'open' && issue.severity === 'error').map((issue) => issue.code), warningCodes: issues.filter((issue) => issue.status === 'open' && issue.severity === 'warning').map((issue) => issue.code) }));
    return { sessionId, sessionRevision: session.revision, stale: session.status === 'stale', canRelease: session.status !== 'stale' && states.length > 0 && states.every((state) => state.eligible), eligibleEpisodeNumbers: states.filter((state) => state.eligible).map((state) => state.episodeNumber), episodes: states };
  }

  async passOne(projectId: string, sessionId: string, episodeNumber: number, body: PassAcceptanceEpisodeBody, key: string) { await this.requireFresh(projectId, sessionId); const result = await this.writes.passEpisodes({ projectId, sessionId, body: { expectedSessionRevision: body.expectedSessionRevision }, episodeNumbers: [episodeNumber], expectedEpisodeRevision: body.expectedEpisodeRevision, key }); const session = await this.session(projectId, sessionId); return { session, passedEpisodeNumbers: result.passed, blockedEpisodeNumbers: result.blocked, replay: result.replay }; }
  async passEligible(projectId: string, sessionId: string, body: PassAcceptanceEpisodesBody, key: string) { await this.requireFresh(projectId, sessionId); const result = await this.writes.passEpisodes({ projectId, sessionId, body, ...(body.episodeNumbers ? { episodeNumbers: body.episodeNumbers } : {}), key }); const session = await this.session(projectId, sessionId); return { session, passedEpisodeNumbers: result.passed, blockedEpisodeNumbers: result.blocked, replay: result.replay }; }
  async createRework(projectId: string, sessionId: string, body: CreateAcceptanceReworkBody, key: string) { await this.requireFresh(projectId, sessionId); const result = await this.writes.createRework({ projectId, sessionId, body, key }); const items = await this.reads.listRework(projectId, sessionId); return { rework: items.items.find((item: any) => item.id === result.resourceId)!, replay: result.replay }; }
  async createRelease(projectId: string, sessionId: string, body: CreateAcceptanceReleaseBody, key: string) { await this.requireFresh(projectId, sessionId); const result = await this.writes.createRelease({ projectId, sessionId, expectedSessionRevision: body.expectedSessionRevision, key }); const releases = await this.reads.listReleases(projectId); return { release: releases.items.find((item: any) => item.id === result.resourceId)!, replay: result.replay }; }
  async listReleases(projectId: string) { return this.reads.listReleases(projectId); }

  async createPlaybackGrant(projectId: string, sessionId: string, episodeNumber: number, body: CreateAcceptancePlaybackGrantBody) {
    await this.requireFresh(projectId, sessionId); const episode = await this.getEpisode(projectId, sessionId, episodeNumber); if (!episode.episode.selectedVideoAssetId) throw acceptanceInvalid('ACCEPTANCE_PLAYBACK_NOT_AVAILABLE', '本集没有可播放视频。');
    if ((await this.session(projectId, sessionId)).revision !== body.expectedSessionRevision) throw acceptanceConflict('ACCEPTANCE_SESSION_VERSION_CONFLICT', '验收会话已变化。');
    const asset = await this.pool.query('SELECT object_key FROM assets WHERE id = $1 AND project_id = $2', [episode.episode.selectedVideoAssetId, projectId]); if (!asset.rows[0]) throw acceptanceInvalid('ACCEPTANCE_PLAYBACK_NOT_AVAILABLE', '来源视频不再可用。');
    const token = randomUUID() + randomUUID(); const expiresAt = new Date(Date.now() + 15 * 60_000); await this.pool.query('INSERT INTO acceptance_playback_grants(token_digest,session_id,episode_id,asset_id,object_key,expires_at) VALUES($1,$2,$3,$4,$5,$6)', [sha256(token), sessionId, episode.episode.id, episode.episode.selectedVideoAssetId, asset.rows[0].object_key, expiresAt]); return { assetId: episode.episode.selectedVideoAssetId, episodeNumber, url: `/api/subtitle-acceptance/playback/${token}`, expiresAt: expiresAt.toISOString() };
  }
  async playback(token: string) { const grant = await this.pool.query('SELECT object_key FROM acceptance_playback_grants WHERE token_digest = $1 AND expires_at > CURRENT_TIMESTAMP', [sha256(token)]); if (!grant.rows[0]) throw acceptanceNotFound('ACCEPTANCE_PLAYBACK_GRANT_INVALID', '播放授权不存在或已过期。'); const bytes = await this.storage.readObject(grant.rows[0].object_key); if (!bytes) throw acceptanceNotFound('ACCEPTANCE_PLAYBACK_NOT_AVAILABLE', '播放对象不存在。'); return bytes; }
}
