import { createHash } from 'node:crypto';

import type { PoolClient } from 'pg';

import { termConflict, termNotFound } from './term-errors.js';

interface WritableDraft {
  status: string;
  revision: number;
  source_srt_set_digest: string;
  prompt_version: string;
}

const currentSourceDigest = async (client: PoolClient, projectId: string) => {
  const result = await client.query<{
    episode_number: number;
    asset_id: string | null;
    checksum_algorithm: string | null;
    checksum_value: string | null;
    media_kind: string | null;
    verified_at: Date | null;
  }>(
    `WITH latest_manifest AS (
       SELECT id FROM material_manifests WHERE project_id = $1 ORDER BY version DESC LIMIT 1
     )
     SELECT slot.episode_number, asset.id AS asset_id,
            asset.checksum_algorithm, asset.checksum_value,
            asset.media_kind, asset.verified_at
       FROM latest_manifest manifest
       JOIN material_manifest_bindings slot
         ON slot.manifest_id = manifest.id AND slot.role = 'company_srt'
       LEFT JOIN material_asset_bindings binding
         ON binding.manifest_id = manifest.id
        AND binding.episode_number = slot.episode_number AND binding.role = slot.role
       LEFT JOIN assets asset ON asset.id = binding.asset_id
      ORDER BY slot.episode_number`,
    [projectId],
  );
  if (!result.rows.length || result.rows.some((row) => !row.asset_id
    || !row.checksum_algorithm || !row.checksum_value
    || row.media_kind !== 'srt' || !row.verified_at)) return null;
  return createHash('sha256').update(result.rows.map((row) => [
    row.episode_number, row.asset_id, row.checksum_algorithm, row.checksum_value,
  ].join(':')).join('\n')).digest('hex');
};

export const assertWritableTermDraft = async (
  client: PoolClient,
  projectId: string,
  draftId: string,
): Promise<WritableDraft> => {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`material_manifest:${projectId}`]);
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`term-extraction:${projectId}`]);

  const project = await client.query<{ lifecycle_status: string }>(
    'SELECT lifecycle_status FROM projects WHERE id = $1 FOR UPDATE',
    [projectId],
  );
  if (!project.rows[0]) throw termNotFound('TERM_PROJECT_NOT_FOUND', '项目不存在。');
  if (project.rows[0].lifecycle_status !== 'active') {
    throw termConflict('TERM_PROJECT_NOT_ACTIVE', '项目已进入回收流程，不能修改术语。', 'restore_project');
  }

  const draftResult = await client.query<WritableDraft>(
    `SELECT status, revision, source_srt_set_digest, prompt_version
       FROM term_drafts WHERE id = $1 AND project_id = $2 FOR UPDATE`,
    [draftId, projectId],
  );
  const draft = draftResult.rows[0];
  if (!draft) throw termNotFound('TERM_DRAFT_NOT_FOUND', '术语草稿不存在。');
  if (draft.status !== 'active') {
    throw termConflict('TERM_DRAFT_NOT_ACTIVE', '该草稿已经确认或失效，不能继续修改。', 'create_draft_from_version');
  }

  const digest = await currentSourceDigest(client, projectId);
  if (digest !== draft.source_srt_set_digest) {
    throw termConflict('TERM_SOURCE_CHANGED', '公司 SRT 来源已变化，当前草稿不能继续修改。', 'start_extraction');
  }
  const running = await client.query(
    `SELECT id FROM term_extraction_runs
      WHERE project_id = $1 AND status = 'running' LIMIT 1`,
    [projectId],
  );
  if (running.rowCount) {
    throw termConflict('TERM_EXTRACTION_RUNNING', '术语提取仍在运行，当前草稿暂不可修改。', 'wait_for_extraction');
  }
  return draft;
};
