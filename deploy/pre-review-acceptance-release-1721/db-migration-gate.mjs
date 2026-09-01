#!/usr/bin/env node

import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED = '1754976035000_lock_review_source_identity';
const PREVIOUS = '1754976034000_add_partial_screen_text_release';
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
  try { assertPending([...all, '1754976036000_future'], new Set([PREVIOUS])); throw new Error('SELF_TEST_EXTRA_NOT_REJECTED'); }
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

    const column = await pool.query(`
      SELECT data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='pre_edit_sessions'
        AND column_name='screen_text_release_id'
    `);
    if (column.rowCount !== 1 || column.rows[0].data_type !== 'uuid' || column.rows[0].is_nullable !== 'YES') {
      throw new Error('SCREEN_TEXT_RELEASE_COLUMN_INVALID');
    }

    const constraints = await pool.query(`
      SELECT conname, contype, confrelid, confdeltype, convalidated
      FROM pg_constraint
      WHERE conrelid='public.pre_edit_sessions'::regclass
        AND conname = ANY($1::text[])
      ORDER BY conname
    `, [[
      'pre_edit_sessions_screen_text_release_id_fkey',
      'pre_edit_sessions_screen_text_source_consistent',
    ]]);
    const byName = new Map(constraints.rows.map((row) => [String(row.conname), row]));
    const foreignKey = byName.get('pre_edit_sessions_screen_text_release_id_fkey');
    if (!foreignKey || foreignKey.contype !== 'f'
      || String(foreignKey.confrelid) !== String((await pool.query("SELECT 'public.screen_text_releases'::regclass::oid AS oid")).rows[0].oid)
      || foreignKey.confdeltype !== 'r' || foreignKey.convalidated !== true) {
      throw new Error('SCREEN_TEXT_RELEASE_FOREIGN_KEY_INVALID');
    }
    const consistency = byName.get('pre_edit_sessions_screen_text_source_consistent');
    if (!consistency || consistency.contype !== 'c' || consistency.convalidated !== true) {
      throw new Error('SCREEN_TEXT_SOURCE_CONSTRAINT_INVALID');
    }

    const index = await pool.query(`
      SELECT entry.indisvalid, entry.indisready
      FROM pg_index entry
      JOIN pg_class index_class ON index_class.oid=entry.indexrelid
      WHERE entry.indrelid='public.pre_edit_sessions'::regclass
        AND index_class.relname='pre_edit_sessions_screen_text_release_id_index'
    `);
    if (index.rowCount !== 1 || index.rows[0].indisvalid !== true || index.rows[0].indisready !== true) {
      throw new Error('SCREEN_TEXT_RELEASE_INDEX_INVALID');
    }

    const triggers = await pool.query(`
      SELECT table_class.relname AS table_name,
             trigger_entry.tgname AS trigger_name,
             function_entry.proname AS function_name
      FROM pg_trigger trigger_entry
      JOIN pg_class table_class ON table_class.oid=trigger_entry.tgrelid
      JOIN pg_namespace namespace_entry ON namespace_entry.oid=table_class.relnamespace
      JOIN pg_proc function_entry ON function_entry.oid=trigger_entry.tgfoid
      WHERE namespace_entry.nspname='public'
        AND trigger_entry.tgenabled='O'
        AND NOT trigger_entry.tgisinternal
        AND trigger_entry.tgname = ANY($1::text[])
      ORDER BY table_class.relname, trigger_entry.tgname
    `, [[
      'pre_edit_sessions_source_identity_immutable',
      'pre_edit_episodes_source_identity_immutable',
      'acceptance_sessions_source_identity_immutable',
    ]]);
    const actualTriggers = triggers.rows.map((row) => `${row.table_name}:${row.trigger_name}:${row.function_name}`).sort();
    const expectedTriggers = [
      'acceptance_sessions:acceptance_sessions_source_identity_immutable:reject_acceptance_source_identity_update',
      'pre_edit_episodes:pre_edit_episodes_source_identity_immutable:reject_pre_edit_episode_source_identity_update',
      'pre_edit_sessions:pre_edit_sessions_source_identity_immutable:reject_pre_edit_source_identity_update',
    ].sort();
    if (JSON.stringify(actualTriggers) !== JSON.stringify(expectedTriggers)) {
      throw new Error('SOURCE_IDENTITY_TRIGGERS_INVALID');
    }

    const backfill = await pool.query(`
      SELECT COUNT(*)::int AS inconsistent
      FROM pre_edit_sessions session
      JOIN screen_text_releases release
        ON session.source_snapshot #>> '{screenTextRelease,id}' = release.id::text
      WHERE session.screen_text_release_id IS DISTINCT FROM release.id
    `);
    if (backfill.rows[0]?.inconsistent !== 0) throw new Error('SCREEN_TEXT_RELEASE_BACKFILL_INCOMPLETE');

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
