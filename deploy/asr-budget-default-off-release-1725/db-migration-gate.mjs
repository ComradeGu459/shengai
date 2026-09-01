#!/usr/bin/env node

import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED = '1754976036000_default_budget_enforcement_off';
const PREVIOUS = '1754976035000_lock_review_source_identity';
const MIGRATION_PATTERN = /^(\d+)_.*\.cjs$/;

const fail = (code) => {
  process.stderr.write(`gate=failed code=${code}\n`);
  process.exitCode = 1;
};

const migrationNames = (directory) => readdirSync(resolve(directory), { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => MIGRATION_PATTERN.test(name))
  .map((name) => name.slice(0, -4))
  .sort();

const assertPending = (all, applied) => {
  const pending = all.filter((name) => !applied.has(name));
  if (!applied.has(PREVIOUS)) throw new Error('PREVIOUS_MIGRATION_MISSING');
  if (applied.has(EXPECTED)) throw new Error('EXPECTED_MIGRATION_ALREADY_APPLIED');
  if (pending.length !== 1 || pending[0] !== EXPECTED) throw new Error('PENDING_MIGRATIONS_NOT_EXACT');
  return pending;
};

const runSelfTest = () => {
  const all = [PREVIOUS, EXPECTED];
  const pending = assertPending(all, new Set([PREVIOUS]));
  if (pending.length !== 1 || pending[0] !== EXPECTED) throw new Error('SELF_TEST_PENDING');
  try { assertPending(all, new Set()); throw new Error('SELF_TEST_NEGATIVE_NOT_REJECTED'); }
  catch (error) { if (error.message !== 'PREVIOUS_MIGRATION_MISSING') throw error; }
  try { assertPending(all, new Set([PREVIOUS, EXPECTED])); throw new Error('SELF_TEST_APPLIED_NOT_REJECTED'); }
  catch (error) { if (error.message !== 'EXPECTED_MIGRATION_ALREADY_APPLIED') throw error; }
  try { assertPending([...all, '1754976037000_future'], new Set([PREVIOUS])); throw new Error('SELF_TEST_EXTRA_NOT_REJECTED'); }
  catch (error) { if (error.message !== 'PENDING_MIGRATIONS_NOT_EXACT') throw error; }
  process.stdout.write('helper_self_test=passed\n');
};

const loadActiveDevelopmentPolicy = async (pool) => {
  const active = await pool.query(`
    SELECT policy.version,
           policy.enforcement_enabled,
           EXISTS (
             SELECT 1
               FROM system_control_audit_events audit
              WHERE audit.resource_type='budget_policy_version'
                AND audit.resource_id=policy.id
                AND audit.action='budget_policy_created'
                AND audit.after_snapshot @> '{"enforcementEnabled":true}'::jsonb
           ) AS explicitly_enabled
      FROM active_budget_policy_pointers pointer
      JOIN budget_policy_versions policy
        ON policy.id=pointer.budget_policy_version_id
     WHERE pointer.environment='development'
  `);
  if (active.rowCount !== 1 || Number(active.rows[0].version) !== 3) {
    throw new Error('ACTIVE_BUDGET_BASELINE_INVALID');
  }
  return active.rows[0];
};

const dbGate = async (mode, directory) => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_MISSING');
  const all = migrationNames(directory);
  if (!all.includes(EXPECTED) || !all.includes(PREVIOUS)) throw new Error('CANDIDATE_MIGRATION_SET_INVALID');
  const requireFromBackend = createRequire(pathToFileURL(join(process.cwd(), 'package.json')));
  const { Pool } = requireFromBackend('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const appliedRows = await pool.query('SELECT name FROM schema_migrations ORDER BY id');
    const applied = new Set(appliedRows.rows.map((row) => String(row.name)));
    if (mode === 'before') {
      const pending = assertPending(all, applied);
      const active = await loadActiveDevelopmentPolicy(pool);
      if (active.enforcement_enabled !== true || active.explicitly_enabled !== false) {
        throw new Error('ACTIVE_BUDGET_BASELINE_INVALID');
      }
      process.stdout.write(`db_gate=before passed pending=${pending[0]}\n`);
      return;
    }
    if (mode !== 'after') throw new Error('MODE_INVALID');

    const migrationIdentity = await pool.query(
      'SELECT COUNT(*)::int AS count FROM schema_migrations WHERE name=$1',
      [EXPECTED],
    );
    if (migrationIdentity.rows[0]?.count !== 1) throw new Error('EXPECTED_MIGRATION_IDENTITY_INVALID');

    const enforcementColumn = await pool.query(`
      SELECT data_type, is_nullable, column_default
        FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name='budget_policy_versions'
         AND column_name='enforcement_enabled'
    `);
    if (enforcementColumn.rowCount !== 1
      || enforcementColumn.rows[0].data_type !== 'boolean'
      || enforcementColumn.rows[0].is_nullable !== 'NO'
      || enforcementColumn.rows[0].column_default !== 'false') {
      throw new Error('BUDGET_ENFORCEMENT_COLUMN_INVALID');
    }

    const reservationColumn = await pool.query(`
      SELECT data_type, is_nullable
        FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name='budget_reservations'
         AND column_name='budget_policy_version_id'
    `);
    if (reservationColumn.rowCount !== 1
      || reservationColumn.rows[0].data_type !== 'uuid'
      || reservationColumn.rows[0].is_nullable !== 'YES') {
      throw new Error('BUDGET_RESERVATION_POLICY_COLUMN_INVALID');
    }

    const immutableTrigger = await pool.query(`
      SELECT trigger_entry.tgenabled, function_entry.proname AS function_name
        FROM pg_trigger trigger_entry
        JOIN pg_proc function_entry ON function_entry.oid=trigger_entry.tgfoid
       WHERE trigger_entry.tgrelid='public.budget_policy_versions'::regclass
         AND trigger_entry.tgname='budget_policy_versions_immutable'
         AND NOT trigger_entry.tgisinternal
    `);
    if (immutableTrigger.rowCount !== 1
      || immutableTrigger.rows[0].tgenabled !== 'O'
      || immutableTrigger.rows[0].function_name !== 'reject_system_control_immutable_update') {
      throw new Error('BUDGET_POLICY_IMMUTABLE_TRIGGER_INVALID');
    }

    const implicitEnforcement = await pool.query(`
      SELECT COUNT(*)::int AS count
        FROM budget_policy_versions policy
       WHERE policy.enforcement_enabled=TRUE
         AND NOT EXISTS (
           SELECT 1
             FROM system_control_audit_events audit
            WHERE audit.resource_type='budget_policy_version'
              AND audit.resource_id=policy.id
              AND audit.action='budget_policy_created'
              AND audit.after_snapshot @> '{"enforcementEnabled":true}'::jsonb
         )
    `);
    if (implicitEnforcement.rows[0]?.count !== 0) throw new Error('IMPLICIT_BUDGET_ENFORCEMENT_REMAINS');

    const active = await loadActiveDevelopmentPolicy(pool);
    if (active.enforcement_enabled !== false || active.explicitly_enabled !== false) {
      throw new Error('ACTIVE_BUDGET_DEFAULT_OFF_INVALID');
    }

    process.stdout.write(`db_gate=after passed schema=${EXPECTED}\n`);
  } finally {
    await pool.end();
  }
};

const { values } = parseArgs({
  options: {
    'self-test': { type: 'boolean', default: false },
    before: { type: 'boolean', default: false },
    after: { type: 'boolean', default: false },
    'migration-dir': { type: 'string' },
  },
  strict: true,
});

try {
  if (values['self-test']) {
    if (values.before || values.after || values['migration-dir']) throw new Error('SELF_TEST_ARGUMENTS_INVALID');
    runSelfTest();
  } else {
    const mode = values.before ? 'before' : values.after ? 'after' : null;
    if (!mode || !values['migration-dir'] || values.before === values.after) throw new Error('GATE_ARGUMENTS_INVALID');
    const directory = resolve(values['migration-dir']);
    if (!statSync(directory).isDirectory()) throw new Error('MIGRATION_DIRECTORY_INVALID');
    await dbGate(mode, directory);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : 'GATE_FAILED');
}
