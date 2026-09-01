import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, readdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDatabaseUrl } from '../../backend/src/config.js';

const requireBackendDependency = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackendDependency('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackendDependency('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');
const migration = '1754976033000_add_budget_enforcement_enabled.cjs';
const normalizationMigration = '1754976036000_default_budget_enforcement_off.cjs';

let adminPool: any;
let pool: any;
let databaseName = '';
let previousMigrationsDir = '';
let targetMigrationDir = '';
let normalizationMigrationDir = '';

beforeAll(async () => {
  const sourceUrl = new URL(getDatabaseUrl());
  const adminUrl = new URL(sourceUrl); adminUrl.pathname = '/postgres';
  databaseName = `qimao_budget_migration_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  adminPool = new pg.Pool({ connectionString: adminUrl.toString(), max: 1, connectionTimeoutMillis: 5_000 });
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  const databaseUrl = new URL(sourceUrl); databaseUrl.pathname = `/${databaseName}`;
  previousMigrationsDir = await mkdtemp(join(tmpdir(), 'qimao-budget-migrations-'));
  for (const name of await readdir(resolve(backendRoot, 'migrations'))) {
    const number = Number(name.slice(0, 13));
    if (Number.isInteger(number) && number < Number(migration.slice(0, 13))) {
      await cp(join(backendRoot, 'migrations', name), join(previousMigrationsDir, name));
    }
  }
  await runner({ databaseUrl: databaseUrl.toString(), dir: previousMigrationsDir, direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  targetMigrationDir = await mkdtemp(join(tmpdir(), 'qimao-budget-target-migration-'));
  await cp(join(backendRoot, 'migrations', migration), join(targetMigrationDir, migration));
  normalizationMigrationDir = await mkdtemp(join(tmpdir(), 'qimao-budget-normalization-migration-'));
  await cp(join(backendRoot, 'migrations', normalizationMigration), join(normalizationMigrationDir, normalizationMigration));
  pool = new pg.Pool({ connectionString: databaseUrl.toString(), max: 1, connectionTimeoutMillis: 5_000 });
});

afterAll(async () => {
  if (pool) await pool.end();
  if (adminPool && databaseName) {
    await adminPool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()', [databaseName]);
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminPool.end();
  }
  if (previousMigrationsDir) await rm(previousMigrationsDir, { recursive: true, force: true });
  if (targetMigrationDir) await rm(targetMigrationDir, { recursive: true, force: true });
  if (normalizationMigrationDir) await rm(normalizationMigrationDir, { recursive: true, force: true });
});

describe('预算保护开关迁移', () => {
  it('6033000 增加开关，6036000 将非显式历史值归一为关闭并保留管理员显式开启', async () => {
    const existingPolicyId = randomUUID();
    await pool.query(`INSERT INTO budget_policy_versions(id,environment,version) VALUES($1,'development',1)`, [existingPolicyId]);
    await pool.query(`INSERT INTO budget_policy_rules(budget_policy_version_id,resource_pool,currency,period,warning_limit,hard_limit) VALUES($1,'asr_api','CNY','day',1,10)`, [existingPolicyId]);
    await pool.query(`INSERT INTO budget_policy_status_events(budget_policy_version_id,status,request_id,actor_subject) VALUES($1,'active','migration-before','migration-test')`, [existingPolicyId]);
    await pool.query(`INSERT INTO active_budget_policy_pointers(environment,budget_policy_version_id) VALUES('development',$1)`, [existingPolicyId]);
    await pool.query(`INSERT INTO system_control_audit_events(actor_subject,actor_audience,action,resource_type,resource_id,request_id,result,after_snapshot) VALUES('migration-test','system-control','budget_policy_published','budget_policy_version',$1,'migration-audit-before','succeeded',$2)`, [existingPolicyId, JSON.stringify({ budgetPolicyVersionId: existingPolicyId, status: 'active' })]);

    const beforePointer = await pool.query('SELECT environment,budget_policy_version_id FROM active_budget_policy_pointers');
    const beforeAudit = await pool.query(`SELECT actor_subject,actor_audience,action,resource_type,resource_id,request_id,result,after_snapshot FROM system_control_audit_events WHERE resource_id=$1`, [existingPolicyId]);

    await runner({ databaseUrl: getDatabaseUrlForTestDatabase(), dir: targetMigrationDir, direction: 'up', migrationsTable: 'schema_migrations', checkOrder: false, singleTransaction: true });

    expect((await pool.query<{ value: boolean }>('SELECT enforcement_enabled AS value FROM budget_policy_versions WHERE id=$1', [existingPolicyId])).rows[0]?.value).toBe(true);
    const newPolicyId = randomUUID();
    await pool.query(`INSERT INTO budget_policy_versions(id,environment,version) VALUES($1,'development',2)`, [newPolicyId]);
    expect((await pool.query<{ value: boolean }>('SELECT enforcement_enabled AS value FROM budget_policy_versions WHERE id=$1', [newPolicyId])).rows[0]?.value).toBe(false);

    const explicitlyEnabledPolicyId = randomUUID();
    await pool.query(`INSERT INTO budget_policy_versions(id,environment,version,enforcement_enabled) VALUES($1,'development',3,TRUE)`, [explicitlyEnabledPolicyId]);
    await pool.query(`INSERT INTO system_control_audit_events(actor_subject,actor_audience,action,resource_type,resource_id,request_id,result,after_snapshot) VALUES('migration-test','system-control','budget_policy_created','budget_policy_version',$1,'migration-explicit-enable','succeeded',$2)`, [explicitlyEnabledPolicyId, JSON.stringify({ budgetPolicyVersionId: explicitlyEnabledPolicyId, enforcementEnabled: true })]);

    await runner({ databaseUrl: getDatabaseUrlForTestDatabase(), dir: normalizationMigrationDir, direction: 'up', migrationsTable: 'schema_migrations', checkOrder: false, singleTransaction: true });

    expect((await pool.query<{ value: boolean }>('SELECT enforcement_enabled AS value FROM budget_policy_versions WHERE id=$1', [existingPolicyId])).rows[0]?.value).toBe(false);
    expect((await pool.query<{ value: boolean }>('SELECT enforcement_enabled AS value FROM budget_policy_versions WHERE id=$1', [newPolicyId])).rows[0]?.value).toBe(false);
    expect((await pool.query<{ value: boolean }>('SELECT enforcement_enabled AS value FROM budget_policy_versions WHERE id=$1', [explicitlyEnabledPolicyId])).rows[0]?.value).toBe(true);
    expect((await pool.query<{ is_nullable: string }>(`SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='budget_reservations' AND column_name='budget_policy_version_id'`)).rows[0]?.is_nullable).toBe('YES');
    expect((await pool.query('SELECT environment,budget_policy_version_id FROM active_budget_policy_pointers')).rows).toEqual(beforePointer.rows);
    expect((await pool.query(`SELECT actor_subject,actor_audience,action,resource_type,resource_id,request_id,result,after_snapshot FROM system_control_audit_events WHERE resource_id=$1`, [existingPolicyId])).rows).toEqual(beforeAudit.rows);
  });
});

const getDatabaseUrlForTestDatabase = () => {
  const sourceUrl = new URL(getDatabaseUrl());
  sourceUrl.pathname = `/${databaseName}`;
  return sourceUrl.toString();
};
