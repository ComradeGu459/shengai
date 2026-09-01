#!/usr/bin/env node

import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED = '1754976037000_add_screen_text_runtime_config';
const PREVIOUS = '1754976036000_default_budget_enforcement_off';
const MIGRATION_PATTERN = /^(\d+)_.*\.cjs$/;
const SNAPSHOT_TABLES = ['screen_text_attempts', 'screen_text_batches'];

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

const assertColumnContract = (rows) => {
  if (rows.length !== 4) throw new Error('RUNTIME_CONFIG_COLUMNS_INVALID');
  for (const tableName of SNAPSHOT_TABLES) {
    const runtimeConfig = rows.find((row) => row.table_name === tableName && row.column_name === 'runtime_config');
    const digest = rows.find((row) => row.table_name === tableName && row.column_name === 'runtime_config_digest');
    if (!runtimeConfig || runtimeConfig.data_type !== 'jsonb' || runtimeConfig.is_nullable !== 'YES') {
      throw new Error('RUNTIME_CONFIG_COLUMNS_INVALID');
    }
    if (!digest || digest.data_type !== 'character varying' || digest.is_nullable !== 'YES'
      || Number(digest.character_maximum_length) !== 64) {
      throw new Error('RUNTIME_CONFIG_COLUMNS_INVALID');
    }
  }
};

const assertConstraintContract = (rows) => {
  const expectedNames = new Set([
    'engine_deployment_versions_values_valid',
    'screen_text_attempts_runtime_config_valid',
    'screen_text_batches_runtime_config_valid',
  ]);
  if (rows.length !== expectedNames.size || rows.some((row) => !expectedNames.has(row.conname))) {
    throw new Error('RUNTIME_CONFIG_CONSTRAINTS_INVALID');
  }
  const engine = rows.find((row) => row.conname === 'engine_deployment_versions_values_valid');
  if (!engine || !engine.definition.includes('runtime_config')
    || !engine.definition.includes('screen_text_openvino_ppocrv6_small')
    || !engine.definition.includes('frameIntervalMs')
    || !engine.definition.includes('maxFramesPerEpisode')) {
    throw new Error('ENGINE_RUNTIME_CONFIG_CONSTRAINT_INVALID');
  }
  for (const tableName of SNAPSHOT_TABLES) {
    const row = rows.find((entry) => entry.table_name === tableName);
    if (!row || !row.definition.includes('runtime_config_digest')
      || !row.definition.includes('screen_text_openvino_ppocrv6_small')
      || !row.definition.includes('frameIntervalMs')
      || !row.definition.includes('maxFramesPerEpisode')) {
      throw new Error('SNAPSHOT_RUNTIME_CONFIG_CONSTRAINT_INVALID');
    }
  }
};

const assertTriggerContract = (rows) => {
  if (rows.length !== 2) throw new Error('RUNTIME_CONFIG_TRIGGERS_INVALID');
  for (const tableName of SNAPSHOT_TABLES) {
    const row = rows.find((entry) => entry.table_name === tableName);
    if (!row || row.tgenabled !== 'O'
      || row.function_name !== 'reject_screen_text_runtime_config_update'
      || row.trigger_name !== `${tableName}_runtime_config_immutable`) {
      throw new Error('RUNTIME_CONFIG_TRIGGERS_INVALID');
    }
  }
};

const runSelfTest = () => {
  const all = [PREVIOUS, EXPECTED];
  const pending = assertPending(all, new Set([PREVIOUS]));
  if (pending.length !== 1 || pending[0] !== EXPECTED) throw new Error('SELF_TEST_PENDING');
  try { assertPending(all, new Set()); throw new Error('SELF_TEST_NEGATIVE_NOT_REJECTED'); }
  catch (error) { if (error.message !== 'PREVIOUS_MIGRATION_MISSING') throw error; }
  try { assertPending(all, new Set([PREVIOUS, EXPECTED])); throw new Error('SELF_TEST_APPLIED_NOT_REJECTED'); }
  catch (error) { if (error.message !== 'EXPECTED_MIGRATION_ALREADY_APPLIED') throw error; }
  try { assertPending([...all, '1754976038000_future'], new Set([PREVIOUS])); throw new Error('SELF_TEST_EXTRA_NOT_REJECTED'); }
  catch (error) { if (error.message !== 'PENDING_MIGRATIONS_NOT_EXACT') throw error; }

  const columns = SNAPSHOT_TABLES.flatMap((tableName) => [
    { table_name: tableName, column_name: 'runtime_config', data_type: 'jsonb', is_nullable: 'YES', character_maximum_length: null },
    { table_name: tableName, column_name: 'runtime_config_digest', data_type: 'character varying', is_nullable: 'YES', character_maximum_length: 64 },
  ]);
  assertColumnContract(columns);
  const definition = 'runtime_config screen_text_openvino_ppocrv6_small frameIntervalMs maxFramesPerEpisode runtime_config_digest';
  assertConstraintContract([
    { table_name: 'engine_deployment_versions', conname: 'engine_deployment_versions_values_valid', definition },
    { table_name: 'screen_text_attempts', conname: 'screen_text_attempts_runtime_config_valid', definition },
    { table_name: 'screen_text_batches', conname: 'screen_text_batches_runtime_config_valid', definition },
  ]);
  assertTriggerContract(SNAPSHOT_TABLES.map((tableName) => ({
    table_name: tableName,
    trigger_name: `${tableName}_runtime_config_immutable`,
    tgenabled: 'O',
    function_name: 'reject_screen_text_runtime_config_update',
  })));
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

    const migrationIdentity = await pool.query(
      'SELECT COUNT(*)::int AS count FROM schema_migrations WHERE name=$1',
      [EXPECTED],
    );
    if (migrationIdentity.rows[0]?.count !== 1) throw new Error('EXPECTED_MIGRATION_IDENTITY_INVALID');

    const columns = await pool.query(`
      SELECT table_name, column_name, data_type, is_nullable, character_maximum_length
        FROM information_schema.columns
       WHERE table_schema='public'
         AND table_name = ANY($1::text[])
         AND column_name = ANY($2::text[])
       ORDER BY table_name, column_name
    `, [SNAPSHOT_TABLES, ['runtime_config', 'runtime_config_digest']]);
    assertColumnContract(columns.rows);

    const constraints = await pool.query(`
      SELECT relation.relname AS table_name,
             constraint_entry.conname,
             pg_get_constraintdef(constraint_entry.oid) AS definition
        FROM pg_constraint constraint_entry
        JOIN pg_class relation ON relation.oid=constraint_entry.conrelid
        JOIN pg_namespace namespace_entry ON namespace_entry.oid=relation.relnamespace
       WHERE namespace_entry.nspname='public'
         AND constraint_entry.conname = ANY($1::text[])
       ORDER BY constraint_entry.conname
    `, [[
      'engine_deployment_versions_values_valid',
      'screen_text_attempts_runtime_config_valid',
      'screen_text_batches_runtime_config_valid',
    ]]);
    assertConstraintContract(constraints.rows);

    const triggers = await pool.query(`
      SELECT relation.relname AS table_name,
             trigger_entry.tgname AS trigger_name,
             trigger_entry.tgenabled,
             function_entry.proname AS function_name
        FROM pg_trigger trigger_entry
        JOIN pg_class relation ON relation.oid=trigger_entry.tgrelid
        JOIN pg_namespace namespace_entry ON namespace_entry.oid=relation.relnamespace
        JOIN pg_proc function_entry ON function_entry.oid=trigger_entry.tgfoid
       WHERE namespace_entry.nspname='public'
         AND trigger_entry.tgname = ANY($1::text[])
         AND NOT trigger_entry.tgisinternal
       ORDER BY trigger_entry.tgname
    `, [[
      'screen_text_attempts_runtime_config_immutable',
      'screen_text_batches_runtime_config_immutable',
    ]]);
    assertTriggerContract(triggers.rows);

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
