#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, win32 } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DECLARATION_PATH = resolve(dirname(SCRIPT_PATH), '..', 'worker-release.declaration.json');

class ProbeError extends Error {
  constructor(code) {
    super(code);
    this.name = 'ProbeError';
    this.code = code;
  }
}

const fail = (code) => {
  throw new ProbeError(code);
};

const emit = (record) => {
  process.stdout.write(`${JSON.stringify(record)}\n`);
};

const parseRoot = () => {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--root' || !args[1]) fail('USAGE: --root <staging>');
  const root = resolve(args[1]);
  if (!existsSync(root) || !lstatSync(root).isDirectory()) fail('ROOT_DIRECTORY_MISSING');
  return root;
};

const readEntries = () => {
  let declaration;
  try {
    declaration = JSON.parse(readFileSync(DECLARATION_PATH, 'utf8'));
  } catch {
    fail('DECLARATION_READ_FAILED');
  }
  const entries = declaration?.artifact?.requiredEntries;
  if (!Array.isArray(entries) || entries.length !== 5) fail('REQUIRED_ENTRY_SET');
  return entries;
};

const resolveWithinRoot = (root, value) => {
  if (typeof value !== 'string' || !value || isAbsolute(value) || win32.isAbsolute(value)) {
    fail('RELATIVE_PATH_REQUIRED');
  }
  const parts = value.split(/[\\/]+/);
  if (parts.some((part) => !part || part === '..')) fail('RELATIVE_PATH_UNSAFE');
  const candidate = resolve(root, ...parts);
  const escaped = relative(root, candidate);
  if (escaped === '..' || escaped.startsWith(`..${requireSeparator(root)}`) || isAbsolute(escaped) || win32.isAbsolute(escaped)) {
    fail('RELATIVE_PATH_ESCAPE');
  }
  return candidate;
};

const requireSeparator = (root) => root.includes('\\') ? '\\' : '/';

const assertProbeIdentity = () => {
  const actual = resolve(process.argv[1] ?? '');
  if (actual !== resolve(SCRIPT_PATH)) fail('PROBE_ARGV_IDENTITY');
  emit({ gate: 'probe-argv-identity', exit: 0, stdout: 'probe-self', stderr: '' });
};

const importEntry = async (entryPath, id) => {
  const target = pathToFileURL(entryPath).href;
  try {
    await import(target);
  } catch (error) {
    emit({ gate: `artifact-import:${id}`, exit: 1, stdout: '', stderr: error?.name || 'IMPORT_ERROR' });
    fail(`ENTRY_IMPORT_FAILED:${id}`);
  }
  emit({ gate: `artifact-import:${id}`, exit: 0, stdout: 'loaded', stderr: '' });
};

const run = async () => {
  const root = parseRoot();
  const entries = readEntries();
  assertProbeIdentity();
  for (const entry of entries) {
    if (!entry?.id || !entry?.path) fail('REQUIRED_ENTRY_INVALID');
    const entryPath = resolveWithinRoot(root, entry.path);
    let stat;
    try {
      stat = lstatSync(entryPath);
    } catch {
      emit({ gate: `portable-entry:${entry.id}`, exit: 1, stdout: '', stderr: 'ENTRY_MISSING' });
      fail(`ENTRY_MISSING:${entry.id}`);
    }
    if (!stat.isFile() || stat.isSymbolicLink()) {
      emit({ gate: `portable-entry:${entry.id}`, exit: 1, stdout: '', stderr: 'ENTRY_NOT_REGULAR' });
      fail(`ENTRY_NOT_REGULAR:${entry.id}`);
    }
    emit({ gate: `portable-entry:${entry.id}`, exit: 0, stdout: 'regular-file', stderr: '' });
    await importEntry(entryPath, entry.id);
  }
  emit({ result: 'passed', gates: 1 + entries.length * 2 });
};

run().catch((error) => {
  if (!(error instanceof ProbeError)) {
    emit({ result: 'blocked', code: error?.name || 'PROBE_ERROR' });
  } else {
    emit({ result: 'blocked', code: error.code });
  }
  process.exitCode = 1;
});
