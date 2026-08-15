import { createHash } from 'node:crypto';

import type {
  CreateTermExportTemplateBody,
  TermExport,
  TermExportField,
  TermExportTemplateColumn,
  TermExportTemplateVersion,
} from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import { termConflict, termInvalid, termNotFound } from './term-errors.js';

interface TemplateRow extends QueryResultRow {
  id: string;
  version: number;
  name: string;
  field_order: TermExportField[];
  type_header: string;
  name_header: string;
  aliases_header: string;
  gender_header: string;
  note_header: string;
  is_active: boolean;
  created_at: Date;
}

interface ExportRow extends QueryResultRow {
  id: string;
  project_id: string;
  term_version_id: string;
  template_version_id: string;
  template_name: string;
  template_version: number;
  field_order: TermExportField[];
  type_header: string;
  name_header: string;
  aliases_header: string;
  gender_header: string;
  note_header: string;
  structure_digest: string;
  created_at: Date;
}

const templateColumns = `
  template.id, template.version, template.name, array_to_json(template.field_order) AS field_order,
  template.type_header, template.name_header, template.aliases_header,
  template.gender_header, template.note_header,
  (settings.active_template_version_id = template.id) AS is_active,
  template.created_at
`;

const exportColumns = `
  export.id, export.project_id, export.term_version_id, export.template_version_id,
  template.name AS template_name, template.version AS template_version,
  array_to_json(template.field_order) AS field_order,
  template.type_header, template.name_header, template.aliases_header,
  template.gender_header, template.note_header, export.structure_digest, export.created_at
`;

const headers = (row: Pick<TemplateRow | ExportRow,
  'type_header' | 'name_header' | 'aliases_header' | 'gender_header' | 'note_header'>) => ({
  type: row.type_header,
  name: row.name_header,
  aliases: row.aliases_header,
  gender: row.gender_header,
  note: row.note_header,
});

const columnsFrom = (row: Pick<TemplateRow | ExportRow,
  'field_order' | 'type_header' | 'name_header' | 'aliases_header' | 'gender_header' | 'note_header'>) => {
  const fieldHeaders = headers(row);
  return row.field_order.map((field) => ({ field, header: fieldHeaders[field] }));
};

const toTemplate = (row: TemplateRow): TermExportTemplateVersion => ({
  id: row.id,
  version: row.version,
  name: row.name,
  columns: columnsFrom(row),
  isActive: row.is_active,
  createdAt: row.created_at.toISOString(),
});

const toExport = (row: ExportRow): TermExport => ({
  id: row.id,
  projectId: row.project_id,
  termVersionId: row.term_version_id,
  templateVersionId: row.template_version_id,
  templateName: row.template_name,
  templateVersion: row.template_version,
  columns: columnsFrom(row),
  structureDigest: row.structure_digest,
  createdAt: row.created_at.toISOString(),
});

const normalizeTemplate = (body: CreateTermExportTemplateBody) => {
  const name = body.name.trim();
  const columns = body.columns.map((column) => ({ field: column.field, header: column.header.trim() }));
  const fields = columns.map((column) => column.field);
  const expected = new Set<TermExportField>(['type', 'name', 'aliases', 'gender', 'note']);
  if (!name || columns.some((column) => !column.header)
    || fields.length !== expected.size || new Set(fields).size !== expected.size
    || fields.some((field) => !expected.has(field))) {
    throw termInvalid(
      'TERM_EXPORT_TEMPLATE_INVALID',
      '导出模板必须包含五个标准字段且各出现一次，模板名和表头不能为空。',
      'edit_export_template',
    );
  }
  return { name, columns };
};

export const termExportStructureDigest = (columns: TermExportTemplateColumn[]) => createHash('sha256')
  .update(JSON.stringify(columns))
  .digest('hex');

export const loadTermExportTemplate = async (client: PoolClient, templateVersionId: string) => {
  const result = await client.query<TemplateRow>(
    `SELECT ${templateColumns}
       FROM term_export_template_versions template
       CROSS JOIN term_export_template_settings settings
      WHERE template.id = $1`,
    [templateVersionId],
  );
  return result.rows[0] ? toTemplate(result.rows[0]) : null;
};

export const loadTermExport = async (client: PoolClient, exportId: string) => {
  const result = await client.query<ExportRow>(
    `SELECT ${exportColumns}
       FROM term_exports export
       JOIN term_export_template_versions template ON template.id = export.template_version_id
      WHERE export.id = $1`,
    [exportId],
  );
  return result.rows[0] ? toExport(result.rows[0]) : null;
};

export class TermExportRepository {
  constructor(private readonly pool: DatabasePool) {}

  async listTemplates() {
    const result = await this.pool.query<TemplateRow>(
      `SELECT ${templateColumns}
         FROM term_export_template_versions template
         CROSS JOIN term_export_template_settings settings
        ORDER BY template.version DESC`,
    );
    const items = result.rows.map(toTemplate);
    return {
      activeTemplateVersionId: items.find((item) => item.isActive)!.id,
      items,
    };
  }

  async createTemplate(input: {
    body: CreateTermExportTemplateBody;
    idempotencyKey: string;
    requestHash: string;
  }) {
    const normalized = normalizeTemplate(input.body);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT pg_advisory_xact_lock(hashtext('term-export-template'))");
      const command = await client.query<{ request_hash: string; template_version_id: string }>(
        `SELECT request_hash, template_version_id FROM term_export_template_commands
          WHERE idempotency_key = $1`,
        [input.idempotencyKey],
      );
      if (command.rows[0]) {
        if (command.rows[0].request_hash !== input.requestHash) {
          throw termConflict(
            'TERM_IDEMPOTENCY_KEY_REUSED',
            '该幂等键已用于另一导出模板命令。',
            'retry_with_new_idempotency_key',
          );
        }
        const template = await loadTermExportTemplate(client, command.rows[0].template_version_id);
        await client.query('COMMIT');
        return { template: template!, replay: true };
      }
      const next = await client.query<{ version: number }>(
        'SELECT COALESCE(MAX(version), 0)::integer + 1 AS version FROM term_export_template_versions',
      );
      const headerByField = Object.fromEntries(normalized.columns.map((column) => [column.field, column.header]));
      const created = await client.query<{ id: string }>(
        `INSERT INTO term_export_template_versions
           (version, name, field_order, type_header, name_header, aliases_header, gender_header, note_header)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [next.rows[0]!.version, normalized.name, normalized.columns.map((column) => column.field),
          headerByField.type, headerByField.name, headerByField.aliases, headerByField.gender, headerByField.note],
      );
      await client.query(
        `INSERT INTO term_export_template_commands (idempotency_key, request_hash, template_version_id)
         VALUES ($1,$2,$3)`,
        [input.idempotencyKey, input.requestHash, created.rows[0]!.id],
      );
      const template = await loadTermExportTemplate(client, created.rows[0]!.id);
      await client.query('COMMIT');
      return { template: template!, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async activateTemplate(templateVersionId: string, expectedActiveTemplateVersionId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const setting = await client.query<{ active_template_version_id: string }>(
        'SELECT active_template_version_id FROM term_export_template_settings WHERE singleton = TRUE FOR UPDATE',
      );
      const template = await loadTermExportTemplate(client, templateVersionId);
      if (!template) {
        throw termNotFound('TERM_EXPORT_TEMPLATE_NOT_FOUND', '导出模板版本不存在。');
      }
      if (setting.rows[0]!.active_template_version_id !== expectedActiveTemplateVersionId) {
        throw termConflict(
          'TERM_EXPORT_TEMPLATE_VERSION_CONFLICT',
          '当前启用模板已变化，请刷新后重试。',
          'reload_export_templates',
        );
      }
      await client.query(
        `UPDATE term_export_template_settings
            SET active_template_version_id = $1, updated_at = CURRENT_TIMESTAMP
          WHERE singleton = TRUE`,
        [templateVersionId],
      );
      const activated = await loadTermExportTemplate(client, templateVersionId);
      await client.query('COMMIT');
      return activated!;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createExport(input: {
    projectId: string;
    termVersionId: string;
    templateVersionId: string;
    idempotencyKey: string;
    requestHash: string;
  }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`term-export:${input.projectId}`]);
      const command = await client.query<{ request_hash: string; export_id: string }>(
        `SELECT request_hash, export_id FROM term_export_commands
          WHERE project_id = $1 AND idempotency_key = $2`,
        [input.projectId, input.idempotencyKey],
      );
      if (command.rows[0]) {
        if (command.rows[0].request_hash !== input.requestHash) {
          throw termConflict(
            'TERM_IDEMPOTENCY_KEY_REUSED',
            '该幂等键已用于另一术语导出命令。',
            'retry_with_new_idempotency_key',
          );
        }
        const exported = await loadTermExport(client, command.rows[0].export_id);
        await client.query('COMMIT');
        return { export: exported!, replay: true };
      }
      const version = await client.query(
        'SELECT id FROM term_versions WHERE id = $1 AND project_id = $2',
        [input.termVersionId, input.projectId],
      );
      if (!version.rows[0]) throw termNotFound('TERM_VERSION_NOT_FOUND', '术语版本不存在。');
      const template = await loadTermExportTemplate(client, input.templateVersionId);
      if (!template) throw termNotFound('TERM_EXPORT_TEMPLATE_NOT_FOUND', '导出模板版本不存在。');
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM term_exports WHERE term_version_id = $1 AND template_version_id = $2`,
        [input.termVersionId, input.templateVersionId],
      );
      const exportId = existing.rows[0]?.id ?? (await client.query<{ id: string }>(
        `INSERT INTO term_exports
           (project_id, term_version_id, template_version_id, structure_digest)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [input.projectId, input.termVersionId, input.templateVersionId, termExportStructureDigest(template.columns)],
      )).rows[0]!.id;
      await client.query(
        `INSERT INTO term_export_commands (project_id, idempotency_key, request_hash, export_id)
         VALUES ($1,$2,$3,$4)`,
        [input.projectId, input.idempotencyKey, input.requestHash, exportId],
      );
      const exported = await loadTermExport(client, exportId);
      await client.query('COMMIT');
      return { export: exported!, replay: Boolean(existing.rows[0]) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getExport(projectId: string, exportId: string) {
    const client = await this.pool.connect();
    try {
      const exported = await loadTermExport(client, exportId);
      return exported?.projectId === projectId ? exported : null;
    } finally {
      client.release();
    }
  }

  async listExports(projectId: string, termVersionId: string) {
    const version = await this.pool.query(
      'SELECT id FROM term_versions WHERE id = $1 AND project_id = $2',
      [termVersionId, projectId],
    );
    if (!version.rows[0]) throw termNotFound('TERM_VERSION_NOT_FOUND', '术语版本不存在。');
    const result = await this.pool.query<ExportRow>(
      `SELECT ${exportColumns}
         FROM term_exports export
         JOIN term_export_template_versions template ON template.id = export.template_version_id
        WHERE export.project_id = $1 AND export.term_version_id = $2
        ORDER BY export.created_at DESC, export.id DESC`,
      [projectId, termVersionId],
    );
    return result.rows.map(toExport);
  }
}
