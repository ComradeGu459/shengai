import { createHash } from 'node:crypto';

import type {
  ConfirmMaterialManifestBody,
  MaterialAssetBinding,
  MaterialBinding,
  MaterialManifest,
} from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import { recomputeProjectWorkflowStatus } from '../projects/project-workflow.js';

interface ManifestRow extends QueryResultRow {
  id: string;
  project_id: string;
  version: number;
  root_name: string;
  confirmed_at: Date;
  created_by: string;
}

interface BindingRow extends QueryResultRow {
  episode_number: number;
  role: MaterialBinding['role'];
  relative_path: string;
  file_name: string;
  size_bytes: string;
  last_modified_ms: string;
  fingerprint: string;
  media_type: MaterialBinding['mediaType'];
}

interface CommandRow extends QueryResultRow {
  request_hash: string;
  manifest_id: string;
}

interface AssetBindingRow extends QueryResultRow {
  manifest_id: string;
  episode_number: number;
  role: MaterialAssetBinding['role'];
  asset_id: string;
  source_fingerprint: string;
  bound_at: Date;
}

export class MaterialManifestVersionConflictError extends Error {
  constructor(readonly latestVersion: number) {
    super(`素材清单已更新到版本 ${latestVersion}，请读取最新清单后重试。`);
    this.name = 'MaterialManifestVersionConflictError';
  }
}

export class MaterialManifestIdempotencyConflictError extends Error {
  constructor() {
    super('该幂等键已用于另一份素材清单。');
    this.name = 'MaterialManifestIdempotencyConflictError';
  }
}

const toBinding = (row: BindingRow): MaterialBinding => ({
  episodeNumber: row.episode_number,
  role: row.role,
  relativePath: row.relative_path,
  fileName: row.file_name,
  sizeBytes: Number(row.size_bytes),
  lastModifiedMs: Number(row.last_modified_ms),
  fingerprint: row.fingerprint,
  mediaType: row.media_type,
});

const toAssetBinding = (row: AssetBindingRow): MaterialAssetBinding => ({
  manifestId: row.manifest_id,
  episodeNumber: row.episode_number,
  role: row.role,
  assetId: row.asset_id,
  sourceFingerprint: row.source_fingerprint,
  boundAt: row.bound_at.toISOString(),
});

const loadManifest = async (client: PoolClient, manifestId: string): Promise<MaterialManifest> => {
  const manifestResult = await client.query<ManifestRow>(
    `SELECT id, project_id, version, root_name, confirmed_at, created_by
       FROM material_manifests
      WHERE id = $1`,
    [manifestId],
  );
  const row = manifestResult.rows[0];
  if (!row) {
    throw new Error('素材清单记录不存在。');
  }
  const bindingResult = await client.query<BindingRow>(
    `SELECT episode_number, role, relative_path, file_name, size_bytes,
            last_modified_ms, fingerprint, media_type
       FROM material_manifest_bindings
      WHERE manifest_id = $1
      ORDER BY episode_number, role`,
    [manifestId],
  );
  const bindings = bindingResult.rows.map(toBinding);
  const assetBindingResult = await client.query<AssetBindingRow>(
    `SELECT manifest_id, episode_number, role, asset_id, source_fingerprint, bound_at
       FROM material_asset_bindings
      WHERE manifest_id = $1
      ORDER BY episode_number, role`,
    [manifestId],
  );
  return {
    id: row.id,
    projectId: row.project_id,
    version: row.version,
    rootName: row.root_name,
    episodeCount: new Set(bindings.map((binding) => binding.episodeNumber)).size,
    bindingCount: bindings.length,
    confirmedAt: row.confirmed_at.toISOString(),
    createdBy: row.created_by,
    bindings,
    assetBindings: assetBindingResult.rows.map(toAssetBinding),
  };
};

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

const requestHash = (input: ConfirmMaterialManifestBody) =>
  createHash('sha256').update(canonicalJson(input)).digest('hex');

export class MaterialManifestRepository {
  constructor(private readonly pool: DatabasePool) {}

  async latest(projectId: string): Promise<MaterialManifest | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query<ManifestRow>(
        `SELECT id, project_id, version, root_name, confirmed_at, created_by
           FROM material_manifests
          WHERE project_id = $1
          ORDER BY version DESC
          LIMIT 1`,
        [projectId],
      );
      return result.rows[0] ? await loadManifest(client, result.rows[0].id) : null;
    } finally {
      client.release();
    }
  }

  async confirm(input: {
    projectId: string;
    idempotencyKey: string;
    actor: string;
    body: ConfirmMaterialManifestBody;
  }): Promise<{ manifest: MaterialManifest; created: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `material_manifest:${input.projectId}`,
      ]);
      const hash = requestHash(input.body);
      const commandResult = await client.query<CommandRow>(
        `SELECT request_hash, manifest_id
           FROM material_manifest_commands
          WHERE project_id = $1 AND idempotency_key = $2`,
        [input.projectId, input.idempotencyKey],
      );
      const command = commandResult.rows[0];
      if (command) {
        if (command.request_hash !== hash) {
          throw new MaterialManifestIdempotencyConflictError();
        }
        const manifest = await loadManifest(client, command.manifest_id);
        await client.query('COMMIT');
        return { manifest, created: false };
      }

      const versionResult = await client.query<{ latest_version: number | null }>(
        `SELECT MAX(version)::integer AS latest_version
           FROM material_manifests
          WHERE project_id = $1`,
        [input.projectId],
      );
      const latestVersion = versionResult.rows[0]?.latest_version ?? 0;
      if (latestVersion !== input.body.expectedVersion) {
        throw new MaterialManifestVersionConflictError(latestVersion);
      }

      const manifestResult = await client.query<ManifestRow>(
        `INSERT INTO material_manifests (project_id, version, root_name, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id, project_id, version, root_name, confirmed_at, created_by`,
        [input.projectId, latestVersion + 1, input.body.rootName, input.actor],
      );
      const manifest = manifestResult.rows[0];
      if (!manifest) {
        throw new Error('素材清单写入后未返回记录。');
      }
      for (const binding of input.body.bindings) {
        await client.query(
          `INSERT INTO material_manifest_bindings
             (manifest_id, episode_number, role, relative_path, file_name,
              size_bytes, last_modified_ms, fingerprint, media_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            manifest.id,
            binding.episodeNumber,
            binding.role,
            binding.relativePath,
            binding.fileName,
            binding.sizeBytes,
            binding.lastModifiedMs,
            binding.fingerprint,
            binding.mediaType,
          ],
        );
      }
      await client.query(
        `INSERT INTO material_asset_bindings
           (manifest_id, episode_number, role, asset_id, source_fingerprint, bound_at)
         SELECT $2, next_slot.episode_number, next_slot.role,
                previous_binding.asset_id, next_slot.fingerprint, CURRENT_TIMESTAMP
           FROM material_manifest_bindings next_slot
           JOIN LATERAL (
             SELECT binding.asset_id
               FROM material_asset_bindings binding
               JOIN material_manifests previous_manifest
                 ON previous_manifest.id = binding.manifest_id
               JOIN assets asset ON asset.id = binding.asset_id
              WHERE previous_manifest.project_id = $1
                AND previous_manifest.version < $3
                AND binding.source_fingerprint = next_slot.fingerprint
                AND asset.project_id = $1
                AND asset.size_bytes = next_slot.size_bytes
                AND asset.media_kind::text = next_slot.media_type::text
              ORDER BY previous_manifest.version DESC
              LIMIT 1
           ) previous_binding ON TRUE
          WHERE next_slot.manifest_id = $2
         ON CONFLICT (manifest_id, episode_number, role) DO NOTHING`,
        [input.projectId, manifest.id, manifest.version],
      );
      await client.query(
        `INSERT INTO material_manifest_commands
           (project_id, idempotency_key, request_hash, manifest_id)
         VALUES ($1, $2, $3, $4)`,
        [input.projectId, input.idempotencyKey, hash, manifest.id],
      );
      await client.query(
        `UPDATE projects
            SET version = version + 1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
          WHERE id = $1`,
        [input.projectId, input.actor],
      );
      await recomputeProjectWorkflowStatus(client, input.projectId, input.actor);
      const saved = await loadManifest(client, manifest.id);
      await client.query('COMMIT');
      return { manifest: saved, created: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
