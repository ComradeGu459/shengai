import type {
  UploadAsset,
  UploadMaterialBindingIntent,
  UploadMaterialTarget,
  UploadPart,
  UploadSession,
} from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import { recomputeProjectWorkflowStatus } from '../projects/project-workflow.js';

interface SessionRow extends QueryResultRow {
  id: string;
  project_id: string;
  object_key: string;
  original_filename: string;
  media_kind: UploadSession['mediaKind'];
  size_bytes: string;
  part_size_bytes: string;
  total_parts: number;
  storage_upload_id: string;
  transport_kind: UploadSession['transportKind'];
  file_fingerprint: string;
  checksum_algorithm: 'sha256';
  checksum_value: string | null;
  status: UploadSession['status'];
  expires_at: Date;
  error_code: string | null;
  error_detail: string | null;
  version: number;
  asset_id: string | null;
}

interface PartRow extends QueryResultRow {
  part_number: number;
  size_bytes: string;
  etag: string;
  checksum_value: string;
  confirmed_at: Date;
}

interface AssetRow extends QueryResultRow {
  id: string;
  project_id: string;
  object_key: string;
  original_filename: string;
  media_kind: UploadAsset['mediaKind'];
  size_bytes: string;
  checksum_algorithm: 'sha256';
  checksum_value: string;
  verified_at: Date;
}

interface CommandRow extends QueryResultRow {
  command_kind: string;
  request_hash: string;
  upload_session_id: string;
}

interface LockedSessionStateRow extends QueryResultRow {
  project_id: string;
  status: UploadSession['status'];
  expires_at: Date;
  version: number;
  lifecycle_status: 'active' | 'recycled' | 'purging' | 'purged';
}

interface TargetRow extends QueryResultRow {
  manifest_id: string;
  episode_number: number;
  role: UploadMaterialTarget['role'];
  source_fingerprint: string;
}

interface ManifestSlotRow extends QueryResultRow {
  project_id: string;
  is_latest: boolean;
  episode_number: number;
  role: UploadMaterialTarget['role'];
  file_name: string;
  size_bytes: string;
  fingerprint: string;
  media_type: UploadSession['mediaKind'];
  asset_id: string | null;
  active_upload_id: string | null;
  active_upload_transport_kind: UploadSession['transportKind'] | null;
  active_upload_status: UploadSession['status'] | null;
  active_upload_has_parts: boolean | null;
}

export interface InternalUploadSession extends UploadSession {
  storageUploadId: string;
}

export class UploadIdempotencyConflictError extends Error {}
export class UploadVersionConflictError extends Error {}
export class UploadPartConflictError extends Error {}
export class UploadStateConflictError extends Error {}
export class UploadProjectInactiveError extends Error {}
export class UploadSessionExpiredError extends Error {}
export class UploadMaterialBindingError extends Error {
  constructor(
    readonly code: 'MATERIAL_UPLOAD_BINDING_INVALID' | 'MATERIAL_MANIFEST_VERSION_CONFLICT'
      | 'MATERIAL_SLOT_ALREADY_BOUND' | 'MATERIAL_SLOT_UPLOAD_ACTIVE' | 'FILE_FINGERPRINT_MISMATCH'
      | 'UPLOAD_REPLACEMENT_UNSAFE',
    message: string,
  ) {
    super(message);
  }
}

const sessionColumns = `
  id, project_id, object_key, original_filename, media_kind, size_bytes,
  part_size_bytes, total_parts, storage_upload_id, file_fingerprint,
  transport_kind,
  checksum_algorithm, checksum_value, status, expires_at, error_code,
  error_detail, version, asset_id
`;

const toPart = (row: PartRow): UploadPart => ({
  partNumber: row.part_number,
  sizeBytes: Number(row.size_bytes),
  etag: row.etag,
  checksumValue: row.checksum_value,
  confirmedAt: row.confirmed_at.toISOString(),
});

const toAsset = (row: AssetRow): UploadAsset => ({
  id: row.id,
  projectId: row.project_id,
  objectKey: row.object_key,
  originalFileName: row.original_filename,
  mediaKind: row.media_kind,
  sizeBytes: Number(row.size_bytes),
  checksumAlgorithm: row.checksum_algorithm,
  checksumValue: row.checksum_value,
  verifiedAt: row.verified_at.toISOString(),
});

const loadSession = async (client: PoolClient, uploadId: string): Promise<InternalUploadSession | null> => {
  const result = await client.query<SessionRow>(
    `SELECT ${sessionColumns} FROM upload_sessions WHERE id = $1`,
    [uploadId],
  );
  const row = result.rows[0];
  if (!row) return null;
  const partsResult = await client.query<PartRow>(
    `SELECT part_number, size_bytes, etag, checksum_value, confirmed_at
       FROM upload_parts WHERE upload_session_id = $1 ORDER BY part_number`,
    [uploadId],
  );
  let asset: UploadAsset | null = null;
  if (row.asset_id) {
    const assetResult = await client.query<AssetRow>(
      `SELECT id, project_id, object_key, original_filename, media_kind,
              size_bytes, checksum_algorithm, checksum_value, verified_at
         FROM assets WHERE id = $1`,
      [row.asset_id],
    );
    if (assetResult.rows[0]) asset = toAsset(assetResult.rows[0]);
  }
  const confirmedParts = partsResult.rows.map(toPart);
  const targetResult = await client.query<TargetRow>(
    `SELECT manifest_id, episode_number, role, source_fingerprint
       FROM upload_session_material_targets
      WHERE upload_session_id = $1
      ORDER BY episode_number, role`,
    [uploadId],
  );
  const materialBinding: UploadMaterialBindingIntent | null = targetResult.rows[0]
    ? {
        manifestId: targetResult.rows[0].manifest_id,
        targets: targetResult.rows.map((target) => ({
          episodeNumber: target.episode_number,
          role: target.role,
        })),
      }
    : null;
  const confirmedNumbers = new Set(confirmedParts.map((part) => part.partNumber));
  const session: InternalUploadSession = {
    id: row.id,
    storageUploadId: row.storage_upload_id,
    transportKind: row.transport_kind,
    tusEndpoint: row.transport_kind === 'tus' ? '/api/uploads/tus' : null,
    projectId: row.project_id,
    objectKey: row.object_key,
    originalFileName: row.original_filename,
    mediaKind: row.media_kind,
    sizeBytes: Number(row.size_bytes),
    partSizeBytes: Number(row.part_size_bytes),
    totalParts: row.total_parts,
    fileFingerprint: row.file_fingerprint,
    checksumAlgorithm: row.checksum_algorithm,
    checksumValue: row.checksum_value,
    status: row.status,
    expiresAt: row.expires_at.toISOString(),
    version: row.version,
    errorCode: row.error_code,
    errorDetail: row.error_detail,
    confirmedParts,
    missingPartNumbers: Array.from({ length: row.total_parts }, (_, index) => index + 1)
      .filter((partNumber) => !confirmedNumbers.has(partNumber)),
    asset,
    materialBinding,
  };
  Object.defineProperty(session, 'storageUploadId', { value: row.storage_upload_id, enumerable: row.transport_kind === 'tus' });
  return session;
};

const validateMaterialBinding = async (
  client: PoolClient,
  input: {
    projectId: string;
    originalFileName: string;
    mediaKind: UploadSession['mediaKind'];
    sizeBytes: number;
    fileFingerprint: string;
    materialBinding: UploadMaterialBindingIntent;
    replaceUploadId?: string;
  },
) => {
  const slotResult = await client.query<ManifestSlotRow>(
    `SELECT manifest.project_id,
            manifest.id = (
              SELECT latest.id FROM material_manifests latest
               WHERE latest.project_id = manifest.project_id
               ORDER BY latest.version DESC LIMIT 1
            ) AS is_latest,
            slot.episode_number, slot.role, slot.file_name, slot.size_bytes,
            slot.fingerprint, slot.media_type, asset_binding.asset_id,
            active_upload.id AS active_upload_id,
            active_upload.transport_kind AS active_upload_transport_kind,
            active_upload.status AS active_upload_status,
            active_upload.has_parts AS active_upload_has_parts
       FROM material_manifests manifest
       JOIN material_manifest_bindings slot ON slot.manifest_id = manifest.id
       LEFT JOIN material_asset_bindings asset_binding
         ON asset_binding.manifest_id = slot.manifest_id
        AND asset_binding.episode_number = slot.episode_number
        AND asset_binding.role = slot.role
       LEFT JOIN LATERAL (
         SELECT upload.id, upload.transport_kind, upload.status,
                EXISTS (
                  SELECT 1 FROM upload_parts part
                   WHERE part.upload_session_id = upload.id
                ) AS has_parts
           FROM upload_session_material_targets target
           JOIN upload_sessions upload ON upload.id = target.upload_session_id
          WHERE target.manifest_id = slot.manifest_id
            AND target.episode_number = slot.episode_number
            AND target.role = slot.role
            AND upload.status IN ('created','uploading','completing','verifying')
          ORDER BY upload.created_at DESC LIMIT 1
       ) active_upload ON TRUE
      WHERE manifest.id = $1`,
    [input.materialBinding.manifestId],
  );
  const first = slotResult.rows[0];
  if (!first || first.project_id !== input.projectId) {
    throw new UploadMaterialBindingError('MATERIAL_UPLOAD_BINDING_INVALID', '上传目标不属于当前项目的素材清单。');
  }
  if (!first.is_latest) {
    throw new UploadMaterialBindingError('MATERIAL_MANIFEST_VERSION_CONFLICT', '素材清单已更新，请读取最新版本后重新选择文件。');
  }
  const uniqueTargets = new Set(input.materialBinding.targets.map((target) => `${target.episodeNumber}:${target.role}`));
  if (uniqueTargets.size !== input.materialBinding.targets.length) {
    throw new UploadMaterialBindingError('MATERIAL_UPLOAD_BINDING_INVALID', '同一上传目标不能重复。');
  }
  const selected = slotResult.rows.filter((slot) => uniqueTargets.has(`${slot.episode_number}:${slot.role}`));
  if (selected.length !== uniqueTargets.size) {
    throw new UploadMaterialBindingError('MATERIAL_UPLOAD_BINDING_INVALID', '上传目标与最新素材清单不一致。');
  }
  if (selected.some((slot) => slot.fingerprint !== input.fileFingerprint)) {
    throw new UploadMaterialBindingError('FILE_FINGERPRINT_MISMATCH', '重新选择的文件与素材清单指纹不一致。');
  }
  const sameFileSlots = slotResult.rows.filter((slot) => slot.fingerprint === input.fileFingerprint);
  const sameFileKeys = new Set(sameFileSlots.map((slot) => `${slot.episode_number}:${slot.role}`));
  if (sameFileKeys.size !== uniqueTargets.size || [...uniqueTargets].some((key) => !sameFileKeys.has(key))) {
    throw new UploadMaterialBindingError(
      'MATERIAL_UPLOAD_BINDING_INVALID',
      '同一物理文件必须一次覆盖最新清单中共享该文件的全部角色。',
    );
  }
  const activeUploadIds = new Set(selected.flatMap((slot) => slot.active_upload_id ? [slot.active_upload_id] : []));
  if (input.replaceUploadId && (activeUploadIds.size !== 1 || !activeUploadIds.has(input.replaceUploadId))) {
    throw new UploadMaterialBindingError(
      'UPLOAD_REPLACEMENT_UNSAFE',
      '指定的旧上传会话不是当前素材槽唯一的活动上传。',
    );
  }
  for (const slot of selected) {
    if (slot.file_name !== input.originalFileName || Number(slot.size_bytes) !== input.sizeBytes
      || slot.media_type !== input.mediaKind) {
      throw new UploadMaterialBindingError('MATERIAL_UPLOAD_BINDING_INVALID', '上传文件元数据与素材清单槽位不一致。');
    }
    if (slot.asset_id) {
      throw new UploadMaterialBindingError('MATERIAL_SLOT_ALREADY_BOUND', '该素材槽位已经绑定已校验文件，无需重复上传。');
    }
    if (slot.active_upload_id) {
      const replaceable = input.replaceUploadId === slot.active_upload_id
        && slot.active_upload_transport_kind === 'tus'
        && slot.active_upload_status === 'created'
        && slot.active_upload_has_parts === false;
      if (!replaceable) {
        throw new UploadMaterialBindingError('MATERIAL_SLOT_UPLOAD_ACTIVE', '该素材槽位已有进行中的上传任务。');
      }
    }
  }
  if (!input.replaceUploadId) return null;

  const locked = await client.query<{ id: string }>(
    `SELECT id FROM upload_sessions
      WHERE id = $1 AND project_id = $2 AND transport_kind = 'tus'
        AND status = 'created' AND asset_id IS NULL
        AND original_filename = $3 AND media_kind = $4
        AND size_bytes = $5 AND file_fingerprint = $6
        AND NOT EXISTS (
          SELECT 1 FROM upload_parts part WHERE part.upload_session_id = upload_sessions.id
        )
      FOR UPDATE`,
    [input.replaceUploadId, input.projectId, input.originalFileName, input.mediaKind,
      input.sizeBytes, input.fileFingerprint],
  );
  if (!locked.rows[0]) {
    throw new UploadMaterialBindingError(
      'UPLOAD_REPLACEMENT_UNSAFE',
      '旧上传会话已有进度、状态已变化或不属于当前文件，不能安全替换。',
    );
  }
  const replacement = await loadSession(client, input.replaceUploadId);
  const expectedTargets = [...input.materialBinding.targets]
    .sort((left, right) => left.episodeNumber - right.episodeNumber || left.role.localeCompare(right.role));
  const actualTargets = [...(replacement?.materialBinding?.targets ?? [])]
    .sort((left, right) => left.episodeNumber - right.episodeNumber || left.role.localeCompare(right.role));
  if (!replacement || replacement.materialBinding?.manifestId !== input.materialBinding.manifestId
    || JSON.stringify(actualTargets) !== JSON.stringify(expectedTargets)) {
    throw new UploadMaterialBindingError(
      'UPLOAD_REPLACEMENT_UNSAFE',
      '旧上传会话的素材清单身份与本次上传不一致。',
    );
  }
  await client.query(
    `UPDATE upload_sessions
        SET status = 'aborted', version = version + 1,
            error_code = 'UPLOAD_TRANSPORT_SUPERSEDED', error_detail = NULL,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
    [input.replaceUploadId],
  );
  return replacement.storageUploadId;
};

const lockSessionAndProject = async (
  client: PoolClient,
  uploadId: string,
): Promise<LockedSessionStateRow | null> => {
  const reference = await client.query<{ project_id: string }>(
    `SELECT project_id FROM upload_sessions WHERE id = $1`,
    [uploadId],
  );
  const projectId = reference.rows[0]?.project_id;
  if (!projectId) return null;
  const project = await client.query<{ lifecycle_status: LockedSessionStateRow['lifecycle_status'] }>(
    `SELECT lifecycle_status FROM projects WHERE id = $1 FOR UPDATE`,
    [projectId],
  );
  const session = await client.query<{
    project_id: string;
    status: UploadSession['status'];
    expires_at: Date;
    version: number;
  }>(
    `SELECT project_id, status, expires_at, version
       FROM upload_sessions WHERE id = $1 FOR UPDATE`,
    [uploadId],
  );
  const sessionRow = session.rows[0];
  const lifecycleStatus = project.rows[0]?.lifecycle_status;
  return sessionRow && lifecycleStatus
    ? {
        project_id: sessionRow.project_id,
        status: sessionRow.status,
        expires_at: sessionRow.expires_at,
        version: sessionRow.version,
        lifecycle_status: lifecycleStatus,
      }
    : null;
};

export class UploadRepository {
  constructor(private readonly pool: DatabasePool) {}

  async findById(uploadId: string) {
    const client = await this.pool.connect();
    try {
      return await loadSession(client, uploadId);
    } finally {
      client.release();
    }
  }

  async findByStorageUploadId(storageUploadId: string) {
    const client = await this.pool.connect();
    try {
      const result = await client.query<{ id: string }>(
        'SELECT id FROM upload_sessions WHERE storage_upload_id = $1',
        [storageUploadId],
      );
      const row = result.rows[0];
      return row ? await loadSession(client, row.id) : null;
    } finally {
      client.release();
    }
  }

  /**
   * 按 create_upload 的全局 Idempotency-Key 读取已提交事实。
   * 项目条件是数据隔离门：同一 key 属于其它项目时返回 null，不能泄露
   * upload/session 身份；此读取不扫描项目上传列表，也不产生写副作用。
   */
  async findCreateCommand(projectId: string, commandId: string) {
    const client = await this.pool.connect();
    try {
      const result = await client.query<{ upload_session_id: string }>(
        `SELECT command.upload_session_id
           FROM upload_commands command
           JOIN upload_sessions session ON session.id = command.upload_session_id
          WHERE command.idempotency_key = $1
            AND command.command_kind = 'create_upload'
            AND session.project_id = $2`,
        [commandId, projectId],
      );
      const row = result.rows[0];
      return row ? await loadSession(client, row.upload_session_id) : null;
    } finally {
      client.release();
    }
  }

  /** POST create_upload 在触达 provider 前读取同一命令，避免响应丢失后的第二个 multipart。 */
  async findCreateCommandDetails(projectId: string, commandId: string) {
    const client = await this.pool.connect();
    try {
      const result = await client.query<{ request_hash: string; upload_session_id: string }>(
        `SELECT command.request_hash, command.upload_session_id
           FROM upload_commands command
           JOIN upload_sessions session ON session.id = command.upload_session_id
          WHERE command.idempotency_key = $1
            AND command.command_kind = 'create_upload'
            AND session.project_id = $2`,
        [commandId, projectId],
      );
      const row = result.rows[0];
      if (!row) return null;
      const session = await loadSession(client, row.upload_session_id);
      return session ? { requestHash: row.request_hash, session } : null;
    } finally {
      client.release();
    }
  }

  async listByProject(projectId: string) {
    const client = await this.pool.connect();
    try {
      const result = await client.query<{ id: string }>(
        `SELECT id FROM upload_sessions
          WHERE project_id = $1
          ORDER BY created_at DESC, id DESC`,
        [projectId],
      );
      return await Promise.all(result.rows.map(async (row) => {
        const session = await loadSession(client, row.id);
        if (!session) throw new Error('上传列表中的会话无法读取。');
        return session;
      }));
    } finally {
      client.release();
    }
  }

  async replayPartConfirmation(input: {
    uploadId: string;
    idempotencyKey: string;
    requestHash: string;
  }) {
    const client = await this.pool.connect();
    try {
      const commandResult = await client.query<CommandRow>(
        `SELECT command_kind, request_hash, upload_session_id
           FROM upload_commands WHERE idempotency_key = $1`,
        [input.idempotencyKey],
      );
      const command = commandResult.rows[0];
      if (!command) return null;
      if (command.command_kind !== 'confirm_part' || command.request_hash !== input.requestHash
        || command.upload_session_id !== input.uploadId) {
        throw new UploadIdempotencyConflictError('该幂等键已用于另一上传命令。');
      }
      return await loadSession(client, input.uploadId);
    } finally {
      client.release();
    }
  }

  async create(input: {
    projectId: string;
    idempotencyKey: string;
    requestHash: string;
    objectKey: string;
    originalFileName: string;
    mediaKind: UploadSession['mediaKind'];
    sizeBytes: number;
    partSizeBytes: number;
    totalParts: number;
    storageUploadId: string;
    fileFingerprint: string;
    checksumValue: string | null;
    transportKind: UploadSession['transportKind'];
    expiresAt: Date;
    materialBinding?: UploadMaterialBindingIntent;
    replaceUploadId?: string;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`upload-command:${input.idempotencyKey}`]);
      const commandResult = await client.query<CommandRow>(
        `SELECT command_kind, request_hash, upload_session_id
           FROM upload_commands WHERE idempotency_key = $1`,
        [input.idempotencyKey],
      );
      const command = commandResult.rows[0];
      if (command) {
        if (command.command_kind !== 'create_upload' || command.request_hash !== input.requestHash) {
          throw new UploadIdempotencyConflictError('该幂等键已用于另一上传命令。');
        }
        const session = await loadSession(client, command.upload_session_id);
        if (!session) throw new Error('幂等上传会话不存在。');
        await client.query('COMMIT');
        return { session, created: false, supersededTusStorageUploadId: null };
      }
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`material-upload:${input.projectId}`]);
      const projectResult = await client.query<{ lifecycle_status: string }>(
        `SELECT lifecycle_status FROM projects WHERE id = $1 FOR UPDATE`,
        [input.projectId],
      );
      if (projectResult.rows[0]?.lifecycle_status !== 'active') {
        throw new UploadProjectInactiveError('项目当前不可继续上传素材。');
      }
      if (input.replaceUploadId && (!input.materialBinding || input.transportKind !== 'multipart')) {
        throw new UploadMaterialBindingError(
          'UPLOAD_REPLACEMENT_UNSAFE',
          '旧会话替换只允许用于带素材清单身份的 multipart 上传。',
        );
      }
      const supersededTusStorageUploadId = input.materialBinding
        ? await validateMaterialBinding(client, {
          projectId: input.projectId,
          originalFileName: input.originalFileName,
          mediaKind: input.mediaKind,
          sizeBytes: input.sizeBytes,
          fileFingerprint: input.fileFingerprint,
          materialBinding: input.materialBinding,
          ...(input.replaceUploadId ? { replaceUploadId: input.replaceUploadId } : {}),
        })
        : null;
      const inserted = await client.query<SessionRow>(
        `INSERT INTO upload_sessions
           (project_id, object_key, original_filename, media_kind, size_bytes,
            part_size_bytes, total_parts, storage_upload_id, file_fingerprint,
            transport_kind,
            checksum_algorithm, checksum_value, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'sha256',$11,$12)
         RETURNING ${sessionColumns}`,
        [input.projectId, input.objectKey, input.originalFileName, input.mediaKind,
          input.sizeBytes, input.partSizeBytes, input.totalParts, input.storageUploadId,
          input.fileFingerprint, input.transportKind, input.checksumValue, input.expiresAt],
      );
      const row = inserted.rows[0];
      if (!row) throw new Error('上传会话写入后未返回记录。');
      await client.query(
        `INSERT INTO upload_commands
           (idempotency_key, command_kind, request_hash, upload_session_id)
         VALUES ($1, 'create_upload', $2, $3)`,
        [input.idempotencyKey, input.requestHash, row.id],
      );
      if (input.materialBinding) {
        for (const target of input.materialBinding.targets) {
          await client.query(
            `INSERT INTO upload_session_material_targets
               (upload_session_id, manifest_id, episode_number, role, source_fingerprint)
             VALUES ($1, $2, $3, $4, $5)`,
            [row.id, input.materialBinding.manifestId, target.episodeNumber, target.role,
              input.fileFingerprint],
          );
        }
      }
      await recomputeProjectWorkflowStatus(client, input.projectId, 'local-user');
      const session = await loadSession(client, row.id);
      if (!session) throw new Error('上传会话写入后无法读取。');
      await client.query('COMMIT');
      return { session, created: true, supersededTusStorageUploadId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async confirmPart(input: {
    uploadId: string;
    idempotencyKey: string;
    requestHash: string;
    part: Omit<UploadPart, 'confirmedAt'>;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`upload:${input.uploadId}`]);
      const state = await lockSessionAndProject(client, input.uploadId);
      if (!state) {
        await client.query('COMMIT');
        return null;
      }
      const commandResult = await client.query<CommandRow>(
        `SELECT command_kind, request_hash, upload_session_id FROM upload_commands WHERE idempotency_key = $1`,
        [input.idempotencyKey],
      );
      const command = commandResult.rows[0];
      if (command) {
        if (command.command_kind !== 'confirm_part' || command.request_hash !== input.requestHash
          || command.upload_session_id !== input.uploadId) {
          throw new UploadIdempotencyConflictError('该幂等键已用于另一上传命令。');
        }
        const replay = await loadSession(client, input.uploadId);
        await client.query('COMMIT');
        return replay;
      }
      if (state.lifecycle_status !== 'active') {
        throw new UploadProjectInactiveError('项目当前不可继续上传素材。');
      }
      if (state.expires_at.getTime() <= Date.now()) {
        throw new UploadSessionExpiredError('上传会话已过期。');
      }
      if (state.status !== 'created' && state.status !== 'uploading') {
        throw new UploadStateConflictError('当前上传状态不能确认分片。');
      }
      const existing = await client.query<PartRow>(
        `SELECT part_number, size_bytes, etag, checksum_value, confirmed_at
           FROM upload_parts WHERE upload_session_id = $1 AND part_number = $2`,
        [input.uploadId, input.part.partNumber],
      );
      if (existing.rows[0]) {
        const saved = toPart(existing.rows[0]);
        if (saved.sizeBytes !== input.part.sizeBytes || saved.etag !== input.part.etag
          || saved.checksumValue !== input.part.checksumValue) {
          throw new UploadPartConflictError('该分片已使用不同存储信息确认。');
        }
        await client.query(
          `INSERT INTO upload_commands
             (idempotency_key, command_kind, request_hash, upload_session_id)
           VALUES ($1, 'confirm_part', $2, $3)`,
          [input.idempotencyKey, input.requestHash, input.uploadId],
        );
        const session = await loadSession(client, input.uploadId);
        await client.query('COMMIT');
        return session;
      }
      await client.query(
        `INSERT INTO upload_parts
           (upload_session_id, part_number, size_bytes, etag, checksum_value)
         VALUES ($1,$2,$3,$4,$5)`,
        [input.uploadId, input.part.partNumber, input.part.sizeBytes, input.part.etag,
          input.part.checksumValue],
      );
      await client.query(
        `UPDATE upload_sessions SET status = 'uploading', version = version + 1,
            error_code = NULL, error_detail = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [input.uploadId],
      );
      await client.query(
        `INSERT INTO upload_commands
           (idempotency_key, command_kind, request_hash, upload_session_id)
         VALUES ($1, 'confirm_part', $2, $3)`,
        [input.idempotencyKey, input.requestHash, input.uploadId],
      );
      const session = await loadSession(client, input.uploadId);
      await client.query('COMMIT');
      return session;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async expire(uploadId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const reference = await client.query<{ project_id: string }>(
        'SELECT project_id FROM upload_sessions WHERE id = $1', [uploadId],
      );
      const projectId = reference.rows[0]?.project_id;
      if (!projectId) {
        await client.query('COMMIT');
        return;
      }
      await client.query('SELECT id FROM projects WHERE id = $1 FOR UPDATE', [projectId]);
      const result = await client.query(
        `UPDATE upload_sessions SET status = 'expired', version = version + 1,
            error_code = 'UPLOAD_SESSION_EXPIRED', error_detail = '上传会话已过期。',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status NOT IN ('completed','aborted','expired')`,
        [uploadId],
      );
      if (result.rowCount) await recomputeProjectWorkflowStatus(client, projectId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async prepareCompletion(input: { uploadId: string; idempotencyKey: string; requestHash: string; expectedVersion: number }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`upload:${input.uploadId}`]);
      const state = await lockSessionAndProject(client, input.uploadId);
      if (!state) {
        await client.query('COMMIT');
        return { session: null, replay: false };
      }
      const commandResult = await client.query<CommandRow>(
        `SELECT command_kind, request_hash, upload_session_id FROM upload_commands WHERE idempotency_key = $1`,
        [input.idempotencyKey],
      );
      const command = commandResult.rows[0];
      if (command) {
        if (command.command_kind !== 'complete_upload' || command.request_hash !== input.requestHash || command.upload_session_id !== input.uploadId) {
          throw new UploadIdempotencyConflictError('该幂等键已用于另一上传命令。');
        }
        const replay = await loadSession(client, input.uploadId);
        if (!replay) throw new Error('幂等上传会话不存在。');
        if (replay.status === 'completed') {
          await client.query('COMMIT');
          return { session: replay, replay: true };
        }
        if (state.lifecycle_status !== 'active') {
          throw new UploadProjectInactiveError('项目当前不可继续上传素材。');
        }
        if (replay.status !== 'verifying' && replay.status !== 'failed') {
          throw new UploadStateConflictError('当前上传状态不能恢复完成。');
        }
        if (replay.status === 'failed') {
          await client.query(
            `UPDATE upload_completion_jobs
                SET status = 'scheduled', lease_owner = NULL, lease_expires_at = NULL,
                    next_attempt_at = CURRENT_TIMESTAMP, completed_at = NULL, updated_at = CURRENT_TIMESTAMP
              WHERE upload_session_id = $1 AND idempotency_key = $2
                AND status IN ('retryable', 'failed')`,
            [input.uploadId, input.idempotencyKey],
          );
          await client.query(
            `UPDATE upload_sessions SET status = 'verifying', version = version + 1,
                error_code = NULL, error_detail = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [input.uploadId],
          );
        }
        await client.query('COMMIT');
        return { session: replay.status === 'failed' ? await loadSession(client, input.uploadId) : replay, replay: false, recovery: true };
      }
      if (state.lifecycle_status !== 'active') {
        throw new UploadProjectInactiveError('项目当前不可继续上传素材。');
      }
      const session = await loadSession(client, input.uploadId);
      if (!session) throw new Error('锁定后上传会话不存在。');
      if (session.version !== input.expectedVersion) throw new UploadVersionConflictError('上传会话版本已变化。');
      if (!['created', 'uploading'].includes(session.status)) {
        throw new UploadStateConflictError('当前上传状态不能完成。');
      }
      if (session.transportKind !== 'multipart') {
        throw new UploadStateConflictError('TUS 会话必须由兼容完成链处理。');
      }
      if (session.missingPartNumbers.length) {
        await client.query('COMMIT');
        return { session, replay: false, missing: true };
      }
      await client.query(
        `INSERT INTO upload_commands
           (idempotency_key, command_kind, request_hash, upload_session_id)
         VALUES ($1, 'complete_upload', $2, $3)`,
        [input.idempotencyKey, input.requestHash, input.uploadId],
      );
      await client.query(
        `INSERT INTO upload_completion_jobs
           (upload_session_id, idempotency_key, request_hash, status, stage, next_attempt_at)
         VALUES ($1, $2, $3, 'scheduled', 'queued', CURRENT_TIMESTAMP)`,
        [input.uploadId, input.idempotencyKey, input.requestHash],
      );
      await client.query(
        `UPDATE upload_sessions SET status = 'verifying', version = version + 1,
            error_code = NULL, error_detail = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [input.uploadId],
      );
      await recomputeProjectWorkflowStatus(client, session.projectId);
      const prepared = await loadSession(client, input.uploadId);
      await client.query('COMMIT');
      return { session: prepared, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /** 兼容既有 tus 完成链：不创建 multipart completion job，仍使用同一 command/Asset 事务。 */
  async prepareTusCompletion(input: { uploadId: string; idempotencyKey: string; requestHash: string; expectedVersion: number }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`upload:${input.uploadId}`]);
      const state = await lockSessionAndProject(client, input.uploadId);
      if (!state) {
        await client.query('COMMIT');
        return { session: null, replay: false };
      }
      const commandResult = await client.query<CommandRow>(
        `SELECT command_kind, request_hash, upload_session_id FROM upload_commands WHERE idempotency_key = $1`,
        [input.idempotencyKey],
      );
      const command = commandResult.rows[0];
      if (command) {
        if (command.command_kind !== 'complete_upload' || command.request_hash !== input.requestHash || command.upload_session_id !== input.uploadId) {
          throw new UploadIdempotencyConflictError('该幂等键已用于另一上传命令。');
        }
        const replay = await loadSession(client, input.uploadId);
        if (!replay) throw new Error('幂等上传会话不存在。');
        await client.query('COMMIT');
        return { session: replay, replay: replay.status === 'completed' };
      }
      if (state.lifecycle_status !== 'active') throw new UploadProjectInactiveError('项目当前不可继续上传素材。');
      const session = await loadSession(client, input.uploadId);
      if (!session) throw new Error('锁定后上传会话不存在。');
      if (session.version !== input.expectedVersion) throw new UploadVersionConflictError('上传会话版本已变化。');
      if (session.transportKind !== 'tus' || !['created', 'uploading'].includes(session.status)) {
        throw new UploadStateConflictError('当前上传状态不能完成。');
      }
      await client.query(
        `INSERT INTO upload_commands (idempotency_key, command_kind, request_hash, upload_session_id)
         VALUES ($1, 'complete_upload', $2, $3)`,
        [input.idempotencyKey, input.requestHash, input.uploadId],
      );
      await client.query(
        `UPDATE upload_sessions SET status = 'verifying', version = version + 1,
            error_code = NULL, error_detail = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [input.uploadId],
      );
      const prepared = await loadSession(client, input.uploadId);
      await client.query('COMMIT');
      return { session: prepared, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async complete(input: { uploadId: string; idempotencyKey: string; requestHash: string; checksumValue: string }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`upload:${input.uploadId}`]);
      const reference = await client.query<{ project_id: string }>(
        `SELECT project_id FROM upload_sessions WHERE id = $1`,
        [input.uploadId],
      );
      const projectId = reference.rows[0]?.project_id;
      if (!projectId) throw new Error('上传会话不存在。');
      const project = await client.query<{ lifecycle_status: string }>(
        `SELECT lifecycle_status FROM projects WHERE id = $1 FOR UPDATE`,
        [projectId],
      );
      if (project.rows[0]?.lifecycle_status !== 'active') {
        throw new UploadProjectInactiveError('项目当前不可继续上传素材。');
      }
      const sessionResult = await client.query<SessionRow>(
        `SELECT ${sessionColumns} FROM upload_sessions WHERE id = $1 FOR UPDATE`,
        [input.uploadId],
      );
      const session = sessionResult.rows[0];
      if (!session) throw new Error('上传会话不存在。');
      if (session.status === 'completed') {
        const completed = await loadSession(client, input.uploadId);
        await client.query('COMMIT');
        return completed;
      }
      if (session.status !== 'verifying' && session.status !== 'failed') {
        throw new UploadStateConflictError('当前上传状态不能落账完成。');
      }
      const assetResult = await client.query<AssetRow>(
        `INSERT INTO assets
           (project_id, object_key, original_filename, media_kind, size_bytes,
            checksum_algorithm, checksum_value, verified_at)
         VALUES ($1,$2,$3,$4,$5,'sha256',$6,CURRENT_TIMESTAMP)
         RETURNING id, project_id, object_key, original_filename, media_kind,
                   size_bytes, checksum_algorithm, checksum_value, verified_at`,
        [session.project_id, session.object_key, session.original_filename, session.media_kind,
          session.size_bytes, input.checksumValue],
      );
      const asset = assetResult.rows[0];
      if (!asset) throw new Error('素材写入后未返回记录。');
      await client.query(
        `UPDATE upload_sessions SET status = 'completed', checksum_value = $3, asset_id = $2,
            version = version + 1, error_code = NULL, error_detail = NULL,
            updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [input.uploadId, asset.id, input.checksumValue],
      );
      const targetCount = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM upload_session_material_targets
          WHERE upload_session_id = $1`,
        [input.uploadId],
      );
      const bindingInsert = await client.query(
        `INSERT INTO material_asset_bindings
           (manifest_id, episode_number, role, asset_id, source_fingerprint, bound_at)
         SELECT target.manifest_id, target.episode_number, target.role,
                $2, target.source_fingerprint, CURRENT_TIMESTAMP
           FROM upload_session_material_targets target
          WHERE target.upload_session_id = $1
         ON CONFLICT (manifest_id, episode_number, role) DO NOTHING`,
        [input.uploadId, asset.id],
      );
      if (bindingInsert.rowCount !== Number(targetCount.rows[0]?.count ?? 0)) {
        throw new UploadStateConflictError('素材槽位已被另一上传结果绑定。');
      }
      await client.query(
        `INSERT INTO material_asset_bindings
           (manifest_id, episode_number, role, asset_id, source_fingerprint, bound_at)
         SELECT latest_manifest.id, latest_slot.episode_number, latest_slot.role,
                $2, latest_slot.fingerprint, CURRENT_TIMESTAMP
           FROM material_manifests latest_manifest
           JOIN material_manifest_bindings latest_slot
             ON latest_slot.manifest_id = latest_manifest.id
           JOIN upload_session_material_targets target
             ON target.upload_session_id = $1
            AND target.source_fingerprint = latest_slot.fingerprint
          WHERE latest_manifest.project_id = $3
            AND latest_manifest.id = (
              SELECT manifest.id FROM material_manifests manifest
               WHERE manifest.project_id = $3
               ORDER BY manifest.version DESC LIMIT 1
            )
            AND latest_slot.size_bytes = $4
            AND latest_slot.media_type::text = $5::text
         ON CONFLICT (manifest_id, episode_number, role) DO NOTHING`,
        [input.uploadId, asset.id, session.project_id, session.size_bytes, session.media_kind],
      );
      const commandUpdate = await client.query(
        `UPDATE upload_commands SET asset_id = $4
          WHERE idempotency_key = $1 AND command_kind = 'complete_upload'
            AND request_hash = $2 AND upload_session_id = $3`,
        [input.idempotencyKey, input.requestHash, input.uploadId, asset.id],
      );
      if (commandUpdate.rowCount !== 1) throw new Error('完成命令占位记录不存在或不匹配。');
      await recomputeProjectWorkflowStatus(client, session.project_id);
      const completed = await loadSession(client, input.uploadId);
      await client.query('COMMIT');
      return completed;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async fail(uploadId: string, code: string, detail: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const reference = await client.query<{ project_id: string }>(
        'SELECT project_id FROM upload_sessions WHERE id = $1', [uploadId],
      );
      const projectId = reference.rows[0]?.project_id;
      if (!projectId) {
        await client.query('COMMIT');
        return;
      }
      await client.query('SELECT id FROM projects WHERE id = $1 FOR UPDATE', [projectId]);
      const result = await client.query(
        `UPDATE upload_sessions SET status = 'failed',
            version = CASE WHEN status = 'failed' THEN version ELSE version + 1 END,
            error_code = $2, error_detail = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND status IN ('verifying', 'failed')`,
        [uploadId, code, detail],
      );
      if (result.rowCount) await recomputeProjectWorkflowStatus(client, projectId);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async prepareAbort(input: { uploadId: string; idempotencyKey: string; requestHash: string; expectedVersion: number }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`upload:${input.uploadId}`]);
      const state = await lockSessionAndProject(client, input.uploadId);
      if (!state) {
        await client.query('COMMIT');
        return { session: null, replay: false };
      }
      const commandResult = await client.query<CommandRow>(
        `SELECT command_kind, request_hash, upload_session_id FROM upload_commands WHERE idempotency_key = $1`,
        [input.idempotencyKey],
      );
      const command = commandResult.rows[0];
      if (command) {
        if (command.command_kind !== 'abort_upload' || command.request_hash !== input.requestHash || command.upload_session_id !== input.uploadId) {
          throw new UploadIdempotencyConflictError('该幂等键已用于另一上传命令。');
        }
        const replay = await loadSession(client, input.uploadId);
        await client.query('COMMIT');
        return { session: replay, replay: true };
      }
      const session = await loadSession(client, input.uploadId);
      if (!session) throw new Error('锁定后上传会话不存在。');
      if (session.version !== input.expectedVersion) throw new UploadVersionConflictError('上传会话版本已变化。');
      if (!['created', 'uploading', 'failed', 'expired'].includes(session.status)) {
        throw new UploadStateConflictError('当前上传状态不能取消。');
      }
      await client.query(
        `INSERT INTO upload_commands
           (idempotency_key, command_kind, request_hash, upload_session_id)
         VALUES ($1,'abort_upload',$2,$3)`,
        [input.idempotencyKey, input.requestHash, input.uploadId],
      );
      await client.query(
        `UPDATE upload_sessions SET status = 'aborted', version = version + 1,
            error_code = NULL, error_detail = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [input.uploadId],
      );
      await recomputeProjectWorkflowStatus(client, session.projectId);
      const aborted = await loadSession(client, input.uploadId);
      await client.query('COMMIT');
      return { session: aborted, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
