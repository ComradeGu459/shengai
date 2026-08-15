import { createHash, randomBytes } from 'node:crypto';

import type { DatabasePool } from '../../database/pool.js';
import type { UploadStorage } from '../uploads/upload-storage.js';
import { ScreenTextDomainError, screenTextConflict, screenTextNotFound } from './screen-text.errors.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export class ScreenTextPlaybackRepository {
  constructor(
    private readonly database: DatabasePool,
    private readonly storage: UploadStorage,
  ) {}

  async createGrant(input: {
    projectId: string;
    candidateId: string;
    expectedBatchRevision: number;
  }) {
    const result = await this.database.query<any>(`
      SELECT c.episode_number,c.start_ms,c.end_ms,b.id AS batch_id,b.revision,
        ba.asset_id,ba.object_key
      FROM screen_text_candidates c
      JOIN screen_text_batches b ON b.id=c.batch_id
      JOIN screen_text_batch_assets ba ON ba.batch_id=b.id AND ba.episode_number=c.episode_number
      WHERE b.project_id=$1 AND c.id=$2
    `, [input.projectId, input.candidateId]);
    const row = result.rows[0];
    if (!row) throw screenTextNotFound('SCREEN_TEXT_CANDIDATE_NOT_FOUND', '画面字候选不存在。');
    if (row.revision !== input.expectedBatchRevision) {
      throw screenTextConflict('SCREEN_TEXT_CANDIDATE_VERSION_CONFLICT', '画面字批次修订已变化。');
    }
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await this.database.query(`
      INSERT INTO screen_text_playback_grants (
        token_digest,batch_id,candidate_id,asset_id,object_key,expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6)
    `, [sha256(token), row.batch_id, input.candidateId, row.asset_id, row.object_key, expiresAt]);
    return {
      assetId: row.asset_id,
      episodeNumber: row.episode_number,
      url: `/api/screen-text/playback/${token}`,
      expiresAt: expiresAt.toISOString(),
      seek: {
        startMs: Math.max(0, row.start_ms - 1_800),
        contextEndMs: Math.max(row.start_ms, row.end_ms + 2_500),
      },
    };
  }

  async read(token: string) {
    const result = await this.database.query<any>(`
      SELECT grant_row.object_key,asset.original_filename
      FROM screen_text_playback_grants grant_row
      JOIN assets asset ON asset.id=grant_row.asset_id
      WHERE grant_row.token_digest=$1 AND grant_row.expires_at>CURRENT_TIMESTAMP
    `, [sha256(token)]);
    const row = result.rows[0];
    if (!row) throw new ScreenTextDomainError(
      'SCREEN_TEXT_PLAYBACK_GRANT_INVALID', '播放地址不存在或已过期。', 410, 'reload_playback', false,
    );
    const bytes = await this.storage.readObject(row.object_key);
    if (!bytes) throw screenTextConflict(
      'SCREEN_TEXT_PLAYBACK_NOT_AVAILABLE', '视频对象不存在。', 'prepare_screen_videos',
    );
    return { bytes, fileName: row.original_filename };
  }
}
