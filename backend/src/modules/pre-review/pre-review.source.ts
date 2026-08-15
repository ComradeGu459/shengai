import { createHash } from 'node:crypto';

import type { QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import type { UploadStorage } from '../uploads/upload-storage.js';
import { TermSourceRepository } from '../terms/term-source.repository.js';
import { TermSourceService } from '../terms/term-source.service.js';
import { preReviewConflict, preReviewInvalid, preReviewNotFound } from './pre-review.errors.js';
import { PRE_EDIT_ALGORITHM_VERSION, PRE_EDIT_FORMAT_POLICY_VERSION, sha256 } from './pre-review.domain.js';

interface ProjectRow extends QueryResultRow {
  id: string;
  version: number;
  lifecycle_status: string;
  latest_term_version_id: string | null;
  manifest_version: number | null;
}

interface EpisodeSourceRow extends QueryResultRow {
  episode_number: number;
  video_asset_id: string | null;
  video_checksum_value: string | null;
  asr_result_id: string | null;
  asr_asset_id: string | null;
  asr_term_version_id: string | null;
  asr_config_digest: string | null;
  asr_hotword_digest: string | null;
  quality_status: 'pass' | 'warning' | null;
  provider: string | null;
  adapter: string | null;
  model: string | null;
  language: string | null;
  cue_identity: string | null;
  video_duration_ms: string | null;
}

export interface PreReviewEpisodeSource {
  episodeNumber: number;
  companyAssetId: string;
  videoAssetId: string | null;
  videoChecksumValue: string | null;
  videoDurationMs: number | null;
  asr: null | {
    resultId: string;
    resultDigest: string;
    assetId: string;
    termVersionId: string;
    provider: string;
    adapter: string;
    model: string;
    language: string;
    configDigest: string;
    hotwordDigest: string;
    qualityStatus: 'pass' | 'warning';
  };
}

export interface PreReviewSourceSnapshot {
  projectId: string;
  projectVersion: number;
  sourceSrtSetDigest: string;
  termVersionId: string;
  manifestId: string;
  manifestVersion: number;
  algorithmVersion: string;
  formatPolicyVersion: string;
  sourceDigest: string;
  episodes: PreReviewEpisodeSource[];
}

const sourceDigest = (snapshot: Omit<PreReviewSourceSnapshot, 'sourceDigest'>) => sha256(JSON.stringify({
  projectId: snapshot.projectId,
  projectVersion: snapshot.projectVersion,
  sourceSrtSetDigest: snapshot.sourceSrtSetDigest,
  termVersionId: snapshot.termVersionId,
  manifestId: snapshot.manifestId,
  manifestVersion: snapshot.manifestVersion,
  algorithmVersion: snapshot.algorithmVersion,
  formatPolicyVersion: snapshot.formatPolicyVersion,
  episodes: snapshot.episodes,
}));

export class PreReviewSourceService {
  private readonly termSource: TermSourceService;

  constructor(
    private readonly pool: DatabasePool,
    storage: UploadStorage,
  ) {
    this.termSource = new TermSourceService(new TermSourceRepository(pool), storage);
  }

  async inspect(projectId: string, termVersionId: string): Promise<PreReviewSourceSnapshot> {
    const ready = await this.termSource.requireReady(projectId);
    const project = await this.pool.query<ProjectRow>(
      `SELECT project.id, project.version, project.lifecycle_status,
              (SELECT id FROM term_versions WHERE project_id = project.id ORDER BY version DESC LIMIT 1)
                AS latest_term_version_id,
              manifest.version AS manifest_version
         FROM projects project
         LEFT JOIN material_manifests manifest ON manifest.id = $2
        WHERE project.id = $1`,
      [projectId, ready.state.manifestId],
    );
    const row = project.rows[0];
    if (!row) throw preReviewNotFound('PRE_EDIT_PROJECT_NOT_FOUND', '项目不存在或已被清理。');
    if (row.lifecycle_status !== 'active') {
      throw preReviewConflict('PRE_EDIT_PROJECT_NOT_ACTIVE', '项目不在可审改状态。', 'return_to_projects');
    }
    if (!row.latest_term_version_id || row.latest_term_version_id !== termVersionId) {
      const exists = await this.pool.query(
        'SELECT 1 FROM term_versions WHERE id = $1 AND project_id = $2',
        [termVersionId, projectId],
      );
      if (!exists.rows[0]) {
        throw preReviewInvalid('PRE_EDIT_TERM_VERSION_NOT_FOUND', '术语版本不存在或不属于当前项目。', 'confirm_terms');
      }
      throw preReviewConflict('PRE_EDIT_TERM_VERSION_STALE', '必须使用当前最新已确认术语版本创建审改会话。', 'confirm_terms');
    }
    const termVersion = await this.pool.query<{ source_srt_set_digest: string }>(
      'SELECT source_srt_set_digest FROM term_versions WHERE id = $1',
      [termVersionId],
    );
    if (termVersion.rows[0]?.source_srt_set_digest !== ready.state.sourceSrtSetDigest) {
      throw preReviewConflict('PRE_EDIT_TERM_VERSION_STALE', '术语版本与当前公司 SRT 来源不一致。', 'confirm_terms');
    }
    if (!row.manifest_version) {
      throw preReviewInvalid('PRE_EDIT_SOURCE_NOT_READY', '最新素材清单不存在。', 'prepare_materials');
    }

    const result = await this.pool.query<EpisodeSourceRow>(
      `WITH episodes AS (
         SELECT DISTINCT unnest($3::integer[]) AS episode_number
       ), videos AS (
         SELECT binding.episode_number, asset.id AS video_asset_id, asset.checksum_value
           FROM material_asset_bindings binding
           JOIN assets asset ON asset.id = binding.asset_id
          WHERE binding.manifest_id = $2 AND binding.role = 'asr_video'
       ), current_asr AS (
         SELECT DISTINCT ON (result.episode_number)
                result.episode_number, result.id AS asr_result_id, result.asset_id AS asr_asset_id,
                result.term_version_id AS asr_term_version_id,
                result.config_digest AS asr_config_digest,
                result.hotword_digest AS asr_hotword_digest, result.quality_status,
                batch.provider, batch.adapter, batch.model, batch.language,
                NULLIF(usage.media_duration_ms, 0)::text AS video_duration_ms,
                string_agg(
                  concat_ws(':', cue.id, cue.cue_index, cue.start_ms, cue.end_ms, cue.text, coalesce(cue.confidence::text, '')),
                  E'\\n' ORDER BY cue.cue_index, cue.id
                ) AS cue_identity
           FROM asr_results result
           JOIN asr_jobs job ON job.current_result_id = result.id
           JOIN asr_batches batch ON batch.id = job.batch_id
           JOIN asr_cues cue ON cue.result_id = result.id
           JOIN videos video ON video.episode_number = result.episode_number
                            AND video.video_asset_id = result.asset_id
      LEFT JOIN asr_usage usage ON usage.attempt_id = result.attempt_id
          WHERE result.project_id = $1 AND result.term_version_id = $4
            AND result.quality_status IN ('pass', 'warning')
          GROUP BY result.episode_number, result.id, batch.id, usage.media_duration_ms
          ORDER BY result.episode_number, result.created_at DESC, result.id DESC
       )
       SELECT episode.episode_number, video.video_asset_id,
              video.checksum_value AS video_checksum_value,
              current_asr.asr_result_id, current_asr.asr_asset_id,
              current_asr.asr_term_version_id, current_asr.asr_config_digest,
              current_asr.asr_hotword_digest, current_asr.quality_status,
              current_asr.provider, current_asr.adapter, current_asr.model,
              current_asr.language, current_asr.video_duration_ms, current_asr.cue_identity
         FROM episodes episode
         LEFT JOIN videos video USING (episode_number)
         LEFT JOIN current_asr USING (episode_number)
        ORDER BY episode.episode_number`,
      [projectId, ready.state.manifestId, ready.assets.map((asset) => asset.episodeNumber), termVersionId],
    );
    const companyByEpisode = new Map(ready.assets.map((asset) => [asset.episodeNumber, asset]));
    const episodes: PreReviewEpisodeSource[] = result.rows.map((episode) => {
      const company = companyByEpisode.get(episode.episode_number)!;
      const asr = episode.asr_result_id ? {
        resultId: episode.asr_result_id,
        resultDigest: createHash('sha256').update([
          episode.asr_result_id,
          episode.asr_asset_id,
          episode.asr_term_version_id,
          episode.asr_config_digest,
          episode.asr_hotword_digest,
          episode.quality_status,
          episode.provider,
          episode.adapter,
          episode.model,
          episode.language,
          episode.cue_identity,
        ].join('\n')).digest('hex'),
        assetId: episode.asr_asset_id!,
        termVersionId: episode.asr_term_version_id!,
        provider: episode.provider!,
        adapter: episode.adapter!,
        model: episode.model!,
        language: episode.language!,
        configDigest: episode.asr_config_digest!,
        hotwordDigest: episode.asr_hotword_digest!,
        qualityStatus: episode.quality_status!,
      } : null;
      return {
        episodeNumber: episode.episode_number,
        companyAssetId: company.assetId,
        videoAssetId: episode.video_asset_id,
        videoChecksumValue: episode.video_checksum_value,
        videoDurationMs: episode.video_duration_ms === null ? null : Number(episode.video_duration_ms),
        asr,
      };
    });
    if (!episodes.some((episode) => episode.asr)) {
      throw preReviewInvalid('PRE_EDIT_SOURCE_NOT_READY', '当前术语版本下没有任何可用 ASR 结果。', 'run_asr');
    }
    const identity = {
      projectId,
      projectVersion: row.version,
      sourceSrtSetDigest: ready.state.sourceSrtSetDigest,
      termVersionId,
      manifestId: ready.state.manifestId,
      manifestVersion: row.manifest_version,
      algorithmVersion: PRE_EDIT_ALGORITHM_VERSION,
      formatPolicyVersion: PRE_EDIT_FORMAT_POLICY_VERSION,
      episodes,
    };
    return { ...identity, sourceDigest: sourceDigest(identity) };
  }
}
