#!/usr/bin/env node

import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED = '1754976034000_add_partial_screen_text_release';
const PREVIOUS = '1754976033000_add_budget_enforcement_enabled';
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
  try { assertPending([...all, '1754976035000_future'], new Set([PREVIOUS])); throw new Error('SELF_TEST_EXTRA_NOT_REJECTED'); }
  catch (error) { if (error.message !== 'PENDING_MIGRATIONS_NOT_EXACT') throw error; }
  process.stdout.write('helper_self_test=passed\n');
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
      process.stdout.write(`db_gate=before passed pending=${pending[0]}\n`);
      return;
    }
    if (mode !== 'after') throw new Error('MODE_INVALID');
    if (!applied.has(EXPECTED)) throw new Error('EXPECTED_MIGRATION_NOT_REGISTERED');
    const columns = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='screen_text_releases'
        AND column_name = ANY($1::text[])
      ORDER BY column_name
    `, [['partial', 'excluded_episodes']]);
    const columnNames = new Set(columns.rows.map((row) => String(row.column_name)));
    if (!columnNames.has('partial') || !columnNames.has('excluded_episodes')) throw new Error('PARTIAL_RELEASE_COLUMNS_MISSING');
    const constraint = await pool.query(`
      SELECT 1 FROM pg_constraint
      WHERE conrelid='public.screen_text_releases'::regclass
        AND conname='screen_text_releases_partial_snapshot_valid'
    `);
    if (constraint.rowCount !== 1) throw new Error('PARTIAL_RELEASE_CONSTRAINT_MISSING');
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
