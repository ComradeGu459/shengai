import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, readdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPool } from '../../backend/src/database/pool.js';
import { getDatabaseUrl } from '../../backend/src/config.js';
import { SystemControlRoutingService } from '../../backend/src/modules/system-control/system-control.routing.service.js';
import { createDefaultAsrAdapterRegistry } from '../../backend/src/modules/asr/asr-adapter-registry.js';
import { createDefaultScreenTextAdapterRegistry } from '../../backend/src/modules/screen-text/screen-text.adapter-registry.js';

const requireBackend = createRequire(new URL('../../backend/package.json', import.meta.url));
const pg = requireBackend('pg') as { Pool: new (options: Record<string, unknown>) => any };
const { runner } = requireBackend('node-pg-migrate') as { runner: (options: Record<string, unknown>) => Promise<unknown> };
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../backend');
const finalMigration = '1754976022000_create_ordered_execution_routing';
const termsMigration = '1754976031000_add_terms_system_control';
const termsAttemptsMigration = '1754976032000_add_term_controlled_attempts';
let adminPool: any;
let pool: ReturnType<typeof createPool>;
let databaseName = '';
let previousMigrationsDir = '';
let termsAttemptsMigrationDir = '';

beforeAll(async () => {
  const sourceUrl = new URL(getDatabaseUrl());
  const adminUrl = new URL(sourceUrl); adminUrl.pathname = '/postgres';
  databaseName = `qimao_routing_migration_${process.pid}_${randomUUID().replaceAll('-', '').slice(0, 10)}`;
  adminPool = new pg.Pool({ connectionString: adminUrl.toString(), max: 1, connectionTimeoutMillis: 5_000 });
  await adminPool.query(`CREATE DATABASE "${databaseName}"`);
  const databaseUrl = new URL(sourceUrl); databaseUrl.pathname = `/${databaseName}`;
  previousMigrationsDir = await mkdtemp(join(tmpdir(), 'qimao-routing-migrations-'));
  for (const name of await readdir(resolve(backendRoot, 'migrations'))) {
    const migrationNumber = Number(name.slice(0, 13));
    if (Number.isInteger(migrationNumber) && migrationNumber < Number(finalMigration.slice(0, 13))) await cp(join(backendRoot, 'migrations', name), join(previousMigrationsDir, name));
  }
  await runner({ databaseUrl: databaseUrl.toString(), dir: previousMigrationsDir, direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  pool = createPool(databaseUrl.toString());
});

afterAll(async () => {
  if (pool) await pool.end();
  if (adminPool && databaseName) {
    await adminPool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid <> pg_backend_pid()', [databaseName]);
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminPool.end();
  }
  if (previousMigrationsDir) await rm(previousMigrationsDir, { recursive: true, force: true });
  if (termsAttemptsMigrationDir) await rm(termsAttemptsMigrationDir, { recursive: true, force: true });
});

describe('1754976022000 旧主备数据确定性迁移', () => {
  it('screen_text 旧主备按本地 primary→fallback→云 primary→fallback，全局连续且唯一 preferred', async () => {
    const databaseUrl = new URL(getDatabaseUrl()); databaseUrl.pathname = `/${databaseName}`;
    const routingVersionId = randomUUID();
    const versions: string[] = [];
    for (const [poolId, slot] of [
      ['ocr_self_hosted_worker', 'primary'], ['ocr_self_hosted_worker', 'fallback'],
      ['ocr_api', 'primary'], ['ocr_api', 'fallback'],
    ] as const) {
      const deploymentId = randomUUID(); const versionId = randomUUID(); versions.push(versionId);
      await pool.query(`INSERT INTO engine_deployments(id,capability,execution_kind,display_name,provider,adapter_key,status) VALUES($1,'screen_text',$2,$3,'fake',$4,'enabled')`, [deploymentId, poolId === 'ocr_self_hosted_worker' ? 'self_hosted_worker' : 'cloud_api', `${poolId}-${slot}`, `screen_text_${poolId}_${slot}`]);
      await pool.query(`INSERT INTO engine_deployment_versions(id,deployment_id,version,model,language,capabilities_snapshot,secret_reference_summary,config_digest) VALUES($1,$2,1,$3,'zh-CN',$4,'{}',$5)`, [versionId, deploymentId, `${poolId}-${slot}`, JSON.stringify({ capability: 'screen_text', adapterKey: `screen_text_${poolId}_${slot}` }), 'a'.repeat(64)]);
    }
    await pool.query(`INSERT INTO routing_policy_versions(id,environment,workflow_stage,version) VALUES($1,'development','screen_text',1)`, [routingVersionId]);
    await pool.query(`INSERT INTO routing_policy_pools(routing_version_id,pool_id,primary_deployment_version_id,fallback_deployment_version_id,max_concurrent_jobs,per_project_max,queue_limit) VALUES($1,'ocr_self_hosted_worker',$2,$3,4,2,10),($1,'ocr_api',$4,$5,4,2,10),($1,'asr_api',NULL,NULL,4,2,10)`, [routingVersionId, versions[0], versions[1], versions[2], versions[3]]);

  await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), file: finalMigration, direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  await runner({ databaseUrl: databaseUrl.toString(), dir: resolve(backendRoot, 'migrations'), file: termsMigration, direction: 'up', migrationsTable: 'schema_migrations', checkOrder: true, singleTransaction: true });
  termsAttemptsMigrationDir = await mkdtemp(join(tmpdir(), 'qimao-terms-attempts-migration-'));
  await cp(join(backendRoot, 'migrations', `${termsAttemptsMigration}.cjs`), join(termsAttemptsMigrationDir, `${termsAttemptsMigration}.cjs`));
  // 118 是在该隔离测试中补跑的单文件；前置迁移目录刻意只包含 117 之前的历史，
  // node-pg-migrate 的全局顺序检查会把未复制的中间历史误判为回退。
  await runner({ databaseUrl: databaseUrl.toString(), dir: termsAttemptsMigrationDir, direction: 'up', migrationsTable: 'schema_migrations', checkOrder: false, singleTransaction: true });
    const rows = await pool.query<{ pool_id: string; deployment_version_id: string; priority: number; role: string }>(`SELECT pool_id,deployment_version_id,priority,role FROM routing_policy_targets WHERE routing_version_id=$1 ORDER BY priority`, [routingVersionId]);
    expect(rows.rows.map((row) => [row.pool_id, row.deployment_version_id, Number(row.priority), row.role])).toEqual([
      ['ocr_self_hosted_worker', versions[0], 1, 'preferred'],
      ['ocr_self_hosted_worker', versions[1], 2, 'standard'],
      ['ocr_api', versions[2], 3, 'standard'],
      ['ocr_api', versions[3], 4, 'standard'],
    ]);
    expect(new Set(rows.rows.map((row) => row.priority)).size).toBe(4);
    const oldColumns = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='routing_policy_pools' AND column_name IN ('primary_deployment_version_id','fallback_deployment_version_id')`);
    expect(oldColumns.rowCount).toBe(0);
    const runtimeColumn = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='engine_deployment_versions' AND column_name='runtime_config'`);
    expect(runtimeColumn.rowCount).toBe(1);
    const capabilityValues = await pool.query<{ value: string }>(`SELECT enumlabel AS value FROM pg_enum WHERE enumtypid='system_engine_capability'::regtype AND enumlabel='terms'`);
    expect(capabilityValues.rowCount).toBe(1);
    const runColumns = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='term_extraction_runs' AND column_name IN ('routing_version_id','route_digest','config_digest','route_snapshot')`);
    expect(runColumns.rows.map((row: { column_name: string }) => row.column_name).sort()).toEqual(['config_digest', 'route_digest', 'route_snapshot', 'routing_version_id']);
    const attemptsTable = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_name='term_extraction_attempts'`);
    expect(attemptsTable.rowCount).toBe(1);
    const service = new SystemControlRoutingService(pool, { asr: createDefaultAsrAdapterRegistry(), screenText: createDefaultScreenTextAdapterRegistry() });
    const policy = await service.get(routingVersionId);
    expect(policy.pools.find((poolItem) => poolItem.poolId === 'ocr_self_hosted_worker')?.targets.map((target) => target.priority)).toEqual([1, 2]);
    expect(policy.pools.find((poolItem) => poolItem.poolId === 'ocr_api')?.targets.map((target) => target.priority)).toEqual([3, 4]);
  });
});
