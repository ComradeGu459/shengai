import type { Project } from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';

interface ProjectRow extends QueryResultRow {
  id: string;
  name: string;
  workflow_status: Project['workflowStatus'];
  lifecycle_status: Project['lifecycleStatus'];
  recycle_expires_at: Date | null;
  version: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by: string;
  total_count?: string;
}

interface ProjectCommandRow extends ProjectRow {
  request_name: string;
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super('该幂等键已用于另一个项目创建请求。');
    this.name = 'IdempotencyConflictError';
  }
}

const projectColumns = `
  id,
  name,
  workflow_status,
  lifecycle_status,
  recycle_expires_at,
  version,
  created_at,
  updated_at,
  created_by,
  updated_by
`;

const qualifiedProjectColumns = `
  project.id,
  project.name,
  project.workflow_status,
  project.lifecycle_status,
  project.recycle_expires_at,
  project.version,
  project.created_at,
  project.updated_at,
  project.created_by,
  project.updated_by
`;

const toProject = (row: ProjectRow): Project => ({
  id: row.id,
  name: row.name,
  workflowStatus: row.workflow_status,
  lifecycleStatus: row.lifecycle_status,
  recycleExpiresAt: row.recycle_expires_at?.toISOString() ?? null,
  version: row.version,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  createdBy: row.created_by,
  updatedBy: row.updated_by,
});

const findCommandProject = async (client: PoolClient, idempotencyKey: string) => {
  const result = await client.query<ProjectCommandRow>(
    `SELECT ${qualifiedProjectColumns}, command.request_name
       FROM project_commands AS command
       JOIN projects AS project ON project.id = command.project_id
      WHERE command.idempotency_key = $1
        AND command.command_kind = 'create_project'`,
    [idempotencyKey],
  );
  const row = result.rows[0];
  return row ? { project: toProject(row), requestName: row.request_name } : null;
};

export class ProjectRepository {
  constructor(private readonly pool: DatabasePool) {}

  async findById(projectId: string) {
    const result = await this.pool.query<ProjectRow>(
      `SELECT ${projectColumns}
         FROM projects
        WHERE id = $1 AND lifecycle_status <> 'purged'`,
      [projectId],
    );
    return result.rows[0] ? toProject(result.rows[0]) : null;
  }

  async create(input: {
    name: string;
    idempotencyKey: string;
    actor: string;
  }): Promise<{ project: Project; created: boolean }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `create_project:${input.idempotencyKey}`,
      ]);
      const existing = await findCommandProject(client, input.idempotencyKey);
      if (existing) {
        if (existing.requestName !== input.name) {
          throw new IdempotencyConflictError();
        }
        await client.query('COMMIT');
        return { project: existing.project, created: false };
      }

      const inserted = await client.query<ProjectRow>(
        `INSERT INTO projects (name, created_by, updated_by)
         VALUES ($1, $2, $2)
         RETURNING ${projectColumns}`,
        [input.name, input.actor],
      );
      const projectRow = inserted.rows[0];
      if (!projectRow) {
        throw new Error('项目写入后未返回记录。');
      }
      await client.query(
        `INSERT INTO project_commands (idempotency_key, command_kind, project_id, request_name)
         VALUES ($1, 'create_project', $2, $3)`,
        [input.idempotencyKey, projectRow.id, input.name],
      );
      await client.query('COMMIT');
      return { project: toProject(projectRow), created: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async list(input: {
    search?: string;
    workflowStatus?: Project['workflowStatus'];
    lifecycleStatus: Project['lifecycleStatus'];
    limit: number;
    offset: number;
  }) {
    const values: unknown[] = [input.lifecycleStatus];
    const predicates = [`lifecycle_status = $1`, `lifecycle_status <> 'purged'`];
    if (input.workflowStatus) {
      values.push(input.workflowStatus);
      predicates.push(`workflow_status = $${values.length}`);
    }
    if (input.search) {
      values.push(`%${input.search}%`);
      predicates.push(`name ILIKE $${values.length}`);
    }
    values.push(input.limit, input.offset);
    const result = await this.pool.query<ProjectRow>(
      `SELECT ${projectColumns}, COUNT(*) OVER() AS total_count
         FROM projects
        WHERE ${predicates.join(' AND ')}
        ORDER BY updated_at DESC, id DESC
        LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    return {
      items: result.rows.map(toProject),
      total: Number(result.rows[0]?.total_count ?? 0),
    };
  }
}
