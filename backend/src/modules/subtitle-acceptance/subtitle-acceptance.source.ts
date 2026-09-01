import type { AcceptanceTrack, ScreenTextReleaseExclusion } from '@qimao-terms-cloud/contracts';
import type { QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import { parseSrt } from '../terms/srt-parser.js';
import { ACCEPTANCE_RULE_VERSION, stableDigest } from './subtitle-acceptance.domain.js';
import { acceptanceConflict, acceptanceInvalid, acceptanceNotFound } from './subtitle-acceptance.errors.js';

interface HeadRow extends QueryResultRow {
  project_id: string;
  project_version: number;
  lifecycle_status: string;
  manifest_id: string | null;
  manifest_version: number | null;
  term_version_id: string | null;
  term_version: number | null;
  pre_edit_head_id: string | null;
  screen_text_head_id: string | null;
}

export interface AcceptanceSourceCueSeed {
  sourceCueId: string;
  track: AcceptanceTrack;
  ordinal: number;
  startMs: number;
  endMs: number;
  text: string;
  metadata: Record<string, unknown>;
}

export interface AcceptanceEpisodeSeed {
  episodeNumber: number;
  availableVideos: Array<{ assetId: string; role: 'asr_video' | 'screen_video'; checksum: string }>;
  selectedVideoAssetId: string | null;
  authoritativeDurationMs: number | null;
  cues: AcceptanceSourceCueSeed[];
}

export interface AcceptanceSourceInspection {
  projectId: string;
  projectVersion: number;
  preEditReleaseId: string;
  preEditReleaseVersion: number;
  preEditHeadReleaseId: string;
  screenTextReleaseId: string | null;
  screenTextReleaseVersion: number | null;
  screenTextHeadReleaseId: string | null;
  screenTextExcludedEpisodes: ScreenTextReleaseExclusion[];
  manifestId: string;
  manifestVersion: number;
  termVersionId: string;
  termVersion: number;
  ruleVersion: string;
  sourceDigest: string;
  episodes: AcceptanceEpisodeSeed[];
}

const readHeads = async (pool: DatabasePool, projectId: string) => {
  const result = await pool.query<HeadRow>(
    `SELECT project.id AS project_id, project.version AS project_version, project.lifecycle_status,
            manifest.id AS manifest_id, manifest.version AS manifest_version,
            term.id AS term_version_id, term.version AS term_version,
            pre.id AS pre_edit_head_id, screen.id AS screen_text_head_id
       FROM projects project
       LEFT JOIN LATERAL (SELECT id, version FROM material_manifests WHERE project_id = project.id ORDER BY version DESC LIMIT 1) manifest ON true
       LEFT JOIN LATERAL (SELECT id, version FROM term_versions WHERE project_id = project.id ORDER BY version DESC LIMIT 1) term ON true
       LEFT JOIN LATERAL (SELECT id FROM pre_edit_releases WHERE project_id = project.id ORDER BY version DESC LIMIT 1) pre ON true
       LEFT JOIN LATERAL (SELECT id FROM screen_text_releases WHERE project_id = project.id ORDER BY version DESC LIMIT 1) screen ON true
      WHERE project.id = $1`,
    [projectId],
  );
  const row = result.rows[0];
  if (!row) throw acceptanceNotFound('ACCEPTANCE_PROJECT_NOT_FOUND', '项目不存在或已被清理。');
  if (row.lifecycle_status !== 'active') throw acceptanceConflict('ACCEPTANCE_PROJECT_NOT_ACTIVE', '项目不在可验收状态。', 'return_to_projects');
  if (!row.manifest_id || !row.manifest_version || !row.term_version_id || !row.term_version || !row.pre_edit_head_id) {
    throw acceptanceInvalid('ACCEPTANCE_SOURCE_NOT_READY', '必须先准备已确认素材、术语版本和前置审改 Release。', 'prepare_sources');
  }
  return row;
};

export class SubtitleAcceptanceSourceService {
  constructor(private readonly pool: DatabasePool) {}

  async inspect(projectId: string, selection: { preEditReleaseId?: string; screenTextReleaseId?: string | null } = {}): Promise<AcceptanceSourceInspection> {
    const heads = await readHeads(this.pool, projectId);
    const preEditReleaseId = selection.preEditReleaseId ?? heads.pre_edit_head_id!;
    const pre = await this.pool.query<{ id: string; version: number; release_digest: string; session_id: string; term_version_id: string; manifest_id: string; source_snapshot: any }>(
      `SELECT release.id, release.version, release.release_digest, release.session_id,
              session.term_version_id, session.manifest_id, session.source_snapshot
         FROM pre_edit_releases release JOIN pre_edit_sessions session ON session.id = release.session_id
        WHERE release.id = $1 AND release.project_id = $2`, [preEditReleaseId, projectId],
    );
    if (!pre.rows[0]) throw acceptanceInvalid('ACCEPTANCE_SOURCE_NOT_READY', '指定的前置审改 Release 不存在或不属于当前项目。', 'select_release');
    const preScreenTextReleaseId = pre.rows[0].source_snapshot?.screenTextRelease?.id ?? heads.screen_text_head_id;
    const screenTextReleaseId = selection.screenTextReleaseId === undefined ? preScreenTextReleaseId : selection.screenTextReleaseId;
    const screen = screenTextReleaseId ? await this.pool.query<{ id: string; version: number; release_digest: string; term_version_id: string; manifest_id: string; excluded_episodes: unknown }>(
      `SELECT id, version, release_digest, term_version_id, manifest_id, excluded_episodes FROM screen_text_releases WHERE id = $1 AND project_id = $2`,
      [screenTextReleaseId, projectId],
    ) : null;
    if (screenTextReleaseId && !screen?.rows[0]) throw acceptanceInvalid('ACCEPTANCE_SOURCE_NOT_READY', '指定的画面字 Release 不存在或不属于当前项目。', 'select_release');
    if (pre.rows[0].term_version_id !== heads.term_version_id || pre.rows[0].manifest_id !== heads.manifest_id
      || (screen?.rows[0] && (screen.rows[0].term_version_id !== heads.term_version_id || screen.rows[0].manifest_id !== heads.manifest_id))) {
      throw acceptanceConflict('ACCEPTANCE_SOURCE_CHANGED', '所选 Release 与当前术语或素材来源不一致。', 'select_release');
    }

    const files = await this.pool.query<{ episode_number: number; file_name: string; bytes: Buffer }>(
      'SELECT episode_number, file_name, bytes FROM pre_edit_release_files WHERE release_id = $1 ORDER BY episode_number',
      [preEditReleaseId],
    );
    if (!files.rowCount) throw acceptanceInvalid('ACCEPTANCE_SOURCE_NOT_READY', '前置审改 Release 没有逐集字幕。', 'prepare_sources');
    const screenTextExcludedEpisodes: ScreenTextReleaseExclusion[] = Array.isArray(screen?.rows[0]?.excluded_episodes)
      ? screen!.rows[0]!.excluded_episodes.map((item: any) => ({
        episodeNumber: item.episodeNumber,
        jobId: item.jobId,
        status: item.status,
        attemptId: item.attemptId ?? null,
        errorCode: item.errorCode ?? null,
        effectClass: item.effectClass ?? null,
        providerRequestId: item.providerRequestId ?? null,
      })) : [];
    const screenCues = screenTextReleaseId ? await this.pool.query<{ id: string; episode_number: number; cue_index: number; start_ms: number; end_ms: number; text: string; position: string; pair_group_id: string | null }>(
      `SELECT cue.id, cue.episode_number, cue.cue_index, cue.start_ms, cue.end_ms, cue.text, cue.position, candidate.pair_group_id
         FROM screen_text_release_cues cue
         JOIN screen_text_candidates candidate ON candidate.id = cue.source_candidate_id
        WHERE cue.release_id = $1 ORDER BY cue.episode_number, cue.cue_index, cue.id`, [screenTextReleaseId],
    ) : { rows: [] };
    const episodeNumbers = files.rows.map((file) => file.episode_number);
    const videos = await this.pool.query<{ episode_number: number; role: 'asr_video' | 'screen_video'; asset_id: string; checksum_value: string }>(
      `SELECT binding.episode_number, binding.role, asset.id AS asset_id, asset.checksum_value
         FROM material_asset_bindings binding JOIN assets asset ON asset.id = binding.asset_id
        WHERE binding.manifest_id = $1 AND binding.episode_number = ANY($2::integer[])
          AND binding.role IN ('asr_video', 'screen_video') AND asset.verified_at IS NOT NULL`,
      [heads.manifest_id, episodeNumbers],
    );
    const durations = await this.pool.query<{ episode_number: number; video_duration_ms: string | null }>(
      `SELECT episode.episode_number, episode.video_duration_ms::text
         FROM pre_edit_episodes episode WHERE episode.session_id = $1`, [pre.rows[0].session_id],
    );
    const durationByEpisode = new Map(durations.rows.map((row) => [row.episode_number, row.video_duration_ms === null ? null : Number(row.video_duration_ms)]));
    const episodes = files.rows.map((file) => {
      let dialogue;
      try {
        dialogue = parseSrt({ bytes: file.bytes, assetId: preEditReleaseId, episodeNumber: file.episode_number, fileName: file.file_name });
      } catch {
        throw acceptanceInvalid('ACCEPTANCE_SOURCE_NOT_READY', `第 ${file.episode_number} 集前置审改 SRT 无法解析。`, 'repair_release');
      }
      const availableVideos = videos.rows.filter((video) => video.episode_number === file.episode_number).map((video) => ({ assetId: video.asset_id, role: video.role, checksum: video.checksum_value }));
      const preferred = availableVideos.find((video) => video.role === 'screen_video') ?? availableVideos.find((video) => video.role === 'asr_video') ?? null;
      const cues: AcceptanceSourceCueSeed[] = dialogue.map((cue) => ({ sourceCueId: cue.id, track: 'dialogue', ordinal: cue.cueIndex, startMs: cue.startMs, endMs: cue.endMs, text: cue.text, metadata: {} }));
      cues.push(...screenCues.rows.filter((cue) => cue.episode_number === file.episode_number).map((cue) => ({ sourceCueId: cue.id, track: 'screen_text' as const, ordinal: cue.cue_index, startMs: cue.start_ms, endMs: cue.end_ms, text: cue.text, metadata: { position: cue.position, pairGroupId: cue.pair_group_id } })));
      return { episodeNumber: file.episode_number, availableVideos, selectedVideoAssetId: preferred?.assetId ?? null, authoritativeDurationMs: durationByEpisode.get(file.episode_number) ?? null, cues };
    });
    const identity = {
      projectId, projectVersion: heads.project_version,
      preEditReleaseId, preEditReleaseVersion: pre.rows[0].version, preEditHeadReleaseId: heads.pre_edit_head_id!,
      screenTextReleaseId: screenTextReleaseId ?? null, screenTextReleaseVersion: screen?.rows[0]?.version ?? null, screenTextHeadReleaseId: heads.screen_text_head_id,
      screenTextExcludedEpisodes,
      manifestId: heads.manifest_id!, manifestVersion: heads.manifest_version!, termVersionId: heads.term_version_id!, termVersion: heads.term_version!,
      ruleVersion: ACCEPTANCE_RULE_VERSION,
    };
    return { ...identity, sourceDigest: stableDigest({ ...identity, preDigest: pre.rows[0].release_digest, screenDigest: screen?.rows[0]?.release_digest ?? null, episodes }), episodes };
  }

  async isCurrent(snapshot: AcceptanceSourceInspection) {
    try {
      const current = await this.inspect(snapshot.projectId, { preEditReleaseId: snapshot.preEditReleaseId, screenTextReleaseId: snapshot.screenTextReleaseId });
      return current.preEditHeadReleaseId === snapshot.preEditHeadReleaseId
        && current.screenTextHeadReleaseId === snapshot.screenTextHeadReleaseId
        && current.manifestId === snapshot.manifestId && current.termVersionId === snapshot.termVersionId
        && current.sourceDigest === snapshot.sourceDigest;
    } catch {
      return false;
    }
  }
}
