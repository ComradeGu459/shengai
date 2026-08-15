import type { Project, UploadStatus } from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';

type Queryable = Pick<PoolClient, 'query'> | Pick<DatabasePool, 'query'>;

interface ManifestRow extends QueryResultRow {
  id: string;
  version: number;
}

interface SlotStateRow extends QueryResultRow {
  asset_id: string | null;
  upload_status: UploadStatus | null;
}

export const recomputeProjectWorkflowStatus = async (
  database: Queryable,
  projectId: string,
  actor = 'system',
): Promise<Project['workflowStatus']> => {
  const manifestResult = await database.query<ManifestRow>(
    `SELECT id, version
       FROM material_manifests
      WHERE project_id = $1
      ORDER BY version DESC
      LIMIT 1`,
    [projectId],
  );
  const manifest = manifestResult.rows[0];
  let status: Project['workflowStatus'] = 'draft';

  if (manifest) {
    const slotResult = await database.query<SlotStateRow>(
      `SELECT asset_binding.asset_id,
              latest_upload.status AS upload_status
         FROM material_manifest_bindings slot
         LEFT JOIN material_asset_bindings asset_binding
           ON asset_binding.manifest_id = slot.manifest_id
          AND asset_binding.episode_number = slot.episode_number
          AND asset_binding.role = slot.role
         LEFT JOIN LATERAL (
           SELECT upload.status
             FROM upload_session_material_targets target
             JOIN upload_sessions upload ON upload.id = target.upload_session_id
            WHERE target.manifest_id = slot.manifest_id
              AND target.episode_number = slot.episode_number
              AND target.role = slot.role
            ORDER BY upload.created_at DESC, upload.id DESC
            LIMIT 1
         ) latest_upload ON TRUE
        WHERE slot.manifest_id = $1`,
      [manifest.id],
    );
    const unbound = slotResult.rows.filter((slot) => !slot.asset_id);
    const hasBlockingProblem = unbound.some((slot) =>
      slot.upload_status === 'failed'
      || slot.upload_status === 'expired'
      || (manifest.version > 1
        && !['created', 'uploading', 'completing', 'verifying'].includes(slot.upload_status ?? '')),
    );
    if (hasBlockingProblem) status = 'blocked';
    else if (unbound.some((slot) => slot.upload_status === 'completing' || slot.upload_status === 'verifying')) {
      status = 'verifying';
    } else if (unbound.some((slot) => slot.upload_status === 'created' || slot.upload_status === 'uploading')) {
      status = 'uploading';
    } else if (slotResult.rows.length > 0 && unbound.length === 0) status = 'ready';
  }

  await database.query(
    `UPDATE projects
        SET workflow_status = $2, version = version + 1,
            updated_at = CURRENT_TIMESTAMP, updated_by = $3
      WHERE id = $1 AND workflow_status IS DISTINCT FROM $2`,
    [projectId, status, actor],
  );
  return status;
};
