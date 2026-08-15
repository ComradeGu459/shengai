import type { QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import { TermDomainError } from './term-errors.js';

interface SourceRow extends QueryResultRow {
  project_id: string;
  lifecycle_status: string;
  manifest_id: string | null;
  episode_number: number | null;
  file_name: string | null;
  asset_id: string | null;
  object_key: string | null;
  media_kind: string | null;
  size_bytes: string | null;
  checksum_algorithm: string | null;
  checksum_value: string | null;
  verified_at: Date | null;
}

export interface CompanySrtAssetSource {
  episodeNumber: number;
  fileName: string;
  assetId: string;
  objectKey: string;
  sizeBytes: number;
  checksumAlgorithm: string;
  checksumValue: string;
}

export class TermSourceRepository {
  constructor(private readonly pool: DatabasePool) {}

  async latestCompanySrtAssets(projectId: string) {
    const result = await this.pool.query<SourceRow>(
      `WITH latest_manifest AS (
         SELECT id, project_id
           FROM material_manifests
          WHERE project_id = $1
          ORDER BY version DESC
          LIMIT 1
       )
       SELECT project.id AS project_id, project.lifecycle_status,
              manifest.id AS manifest_id, slot.episode_number, slot.file_name,
              asset.id AS asset_id, asset.object_key, asset.media_kind,
              asset.size_bytes, asset.checksum_algorithm, asset.checksum_value,
              asset.verified_at
         FROM projects project
         LEFT JOIN latest_manifest manifest ON manifest.project_id = project.id
         LEFT JOIN material_manifest_bindings slot
           ON slot.manifest_id = manifest.id AND slot.role = 'company_srt'
         LEFT JOIN material_asset_bindings binding
           ON binding.manifest_id = manifest.id
          AND binding.episode_number = slot.episode_number
          AND binding.role = slot.role
         LEFT JOIN assets asset ON asset.id = binding.asset_id
        WHERE project.id = $1
        ORDER BY slot.episode_number`,
      [projectId],
    );
    if (!result.rows.length) {
      throw new TermDomainError('TERM_PROJECT_NOT_FOUND', '项目不存在或已被清理。', 404, 'return_to_projects');
    }
    const first = result.rows[0]!;
    const manifestId = first.manifest_id;
    if (!manifestId || first.episode_number === null) {
      return { projectId, manifestId, lifecycleStatus: first.lifecycle_status, assets: [] as CompanySrtAssetSource[] };
    }
    const assets = result.rows.flatMap((row) => {
      if (row.episode_number === null || !row.file_name || !row.asset_id || !row.object_key
        || !row.size_bytes || !row.checksum_algorithm || !row.checksum_value || !row.verified_at
        || row.media_kind !== 'srt') return [];
      return [{
        episodeNumber: row.episode_number,
        fileName: row.file_name,
        assetId: row.asset_id,
        objectKey: row.object_key,
        sizeBytes: Number(row.size_bytes),
        checksumAlgorithm: row.checksum_algorithm,
        checksumValue: row.checksum_value,
      }];
    });
    return {
      projectId,
      manifestId,
      lifecycleStatus: first.lifecycle_status,
      expectedAssetCount: result.rows.length,
      assets,
    };
  }
}
