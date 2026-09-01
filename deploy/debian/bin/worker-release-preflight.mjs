#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DECLARATION_PATH = join(SCRIPT_DIR, "..", "worker-release.declaration.json");
const manifest = JSON.parse(readFileSync(DECLARATION_PATH, "utf8"));

class GateError extends Error {
  constructor(code) {
    super(code);
    this.name = "GateError";
    this.code = code;
  }
}

function fail(code) {
  throw new GateError(code);
}

function isWithin(root, candidate) {
  const rootWithSep = root.endsWith(sep) ? root : `${root}${sep}`;
  return candidate === root || candidate.startsWith(rootWithSep);
}

function resolveRelative(root, relativePath) {
  if (typeof relativePath !== "string" || !relativePath || isAbsolute(relativePath)) {
    fail("RELATIVE_PATH_REQUIRED");
  }
  const parts = relativePath.split(/[\\/]+/);
  if (parts.includes("..") || parts.includes("")) {
    fail("RELATIVE_PATH_UNSAFE");
  }
  const candidate = resolve(root, ...parts);
  if (!isWithin(resolve(root), candidate)) {
    fail("RELATIVE_PATH_ESCAPE");
  }
  return candidate;
}

function assertManifest(value) {
  if (value?.["$schema"] !== "qimao.worker-release/v1" || value?.formatVersion !== 1) {
    fail("DECLARATION_VERSION");
  }

  const entries = value?.artifact?.requiredEntries;
  if (!Array.isArray(entries) || entries.length !== 5) {
    fail("REQUIRED_ENTRY_SET");
  }
  const ids = entries.map((entry) => entry?.id);
  const paths = entries.map((entry) => entry?.path);
  if (new Set(ids).size !== ids.length || new Set(paths).size !== paths.length) {
    fail("REQUIRED_ENTRY_DUPLICATE");
  }
  if (!ids.includes("storage") || !ids.includes("asr-runtime") || !ids.includes("asr-worker") || !ids.includes("app") || !ids.includes("server")) {
    fail("REQUIRED_ENTRY_ID");
  }
  for (const entry of entries) {
    resolveRelative("/fixture", entry.path);
  }
  if (value.artifact.standaloneEntry !== entries.find((entry) => entry.id === "asr-worker")?.path) {
    fail("STANDALONE_ENTRY_MISMATCH");
  }

  const environmentFiles = value?.systemd?.environmentFiles;
  const environmentIds = environmentFiles?.map((entry) => entry?.id);
  if (!Array.isArray(environmentFiles) || environmentFiles.length !== 3 || JSON.stringify(environmentIds) !== JSON.stringify(["backend", "object-storage", "provider"])) {
    fail("ENVIRONMENT_FILE_SET");
  }
  if (environmentFiles.some((entry) => entry.required !== true || !entry.path.startsWith("/etc/qimao-terms-cloud/") || !entry.path.endsWith(".env"))) {
    fail("ENVIRONMENT_FILE_DECLARATION");
  }
  if (value?.systemd?.user !== "qimao" || value?.systemd?.group !== "qimao") {
    fail("SERVICE_IDENTITY_DECLARATION");
  }

  const execStart = value?.systemd?.execStart;
  if (!Array.isArray(execStart) || JSON.stringify(execStart) !== JSON.stringify([
    "/usr/local/bin/node",
    "--preserve-symlinks-main",
    "/opt/qimao-terms-cloud/current/backend/dist/workers/asr.worker.entry.js"
  ])) {
    fail("EXEC_START_DECLARATION");
  }
  if (value?.preflight?.runnerFlag !== "--preserve-symlinks-main" || value?.preflight?.requireExitCode !== 0 || value?.preflight?.silentStdoutIsFailure !== true) {
    fail("PREFLIGHT_POLICY");
  }
}

function renderDropIn(value = manifest) {
  assertManifest(value);
  const lines = ["[Service]"];
  lines.push(`User=${value.systemd.user}`);
  lines.push(`Group=${value.systemd.group}`);
  lines.push("EnvironmentFile=");
  for (const environmentFile of value.systemd.environmentFiles) {
    lines.push(`EnvironmentFile=${environmentFile.path}`);
  }
  lines.push("ExecStart=");
  lines.push(`ExecStart=${value.systemd.execStart.join(" ")}`);
  return `${lines.join("\n")}\n`;
}

function fixtureDropInPath(root, value = manifest) {
  return join(root, "systemd", basename(value.systemd.dropInDirectory), value.systemd.dropInFile);
}

function runProcess(gate, args, environment, check) {
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    env: { ...process.env, ...environment },
    timeout: 15000,
    maxBuffer: 1024 * 1024
  });
  const stdout = typeof result.stdout === "string" ? result.stdout.trim() : "";
  const stderr = typeof result.stderr === "string" ? result.stderr.trim() : "";
  const exit = Number.isInteger(result.status) ? result.status : 1;
  const record = { gate, exit, stdout, stderr };
  if (result.error && !stderr) {
    record.stderr = result.error.name || "PROCESS_ERROR";
  }
  if (!check({ ...record, timedOut: result.signal === "SIGTERM" && result.status === null })) {
    return record;
  }
  return record;
}

function importGate(root, entry, id, records = null) {
  const target = pathToFileURL(entry).href;
  const probe = [
    "const target = process.env.WORKER_RELEASE_ENTRY;",
    "import(target).then(() => process.stdout.write('loaded\\n')).catch((error) => {",
    "  process.stderr.write(error?.name || 'IMPORT_ERROR');",
    "  process.exitCode = 1;",
    "});"
  ].join("\n");
  const record = runProcess(`artifact-import:${id}`, ["--input-type=module", "-e", probe], { WORKER_RELEASE_ENTRY: target }, ({ exit, stdout }) => exit === 0 && stdout !== "");
  records?.push(record);
  if (record.exit !== 0) {
    fail(`ENTRY_IMPORT_FAILED:${id}`);
  }
  if (record.stdout === "") {
    fail(`ENTRY_SILENT:${id}`);
  }
  return record;
}

function standaloneGate(entry, gate = "current-standalone", records = null) {
  const record = runProcess(gate, [manifest.preflight.runnerFlag, entry], {}, ({ exit, stdout }) => exit === 0 && stdout.includes("worker-ready"));
  records?.push(record);
  if (record.exit !== 0) {
    fail("STANDALONE_EXIT");
  }
  if (!record.stdout.includes("worker-ready")) {
    fail("STANDALONE_GUARD_MISS");
  }
  if (record.stdout === "") {
    fail("ENTRY_SILENT:standalone");
  }
  return record;
}

function checkDropIn(root, value = manifest, records = null) {
  const directory = dirname(fixtureDropInPath(root, value));
  if (!existsSync(directory) || !lstatSync(directory).isDirectory()) {
    records?.push({ gate: "canonical-dropin-directory", exit: 1, stdout: "", stderr: "DROPIN_DIR_MISSING" });
    fail("DROPIN_DIR_MISSING");
  }
  const file = fixtureDropInPath(root, value);
  if (!existsSync(file) || !lstatSync(file).isFile()) {
    records?.push({ gate: "canonical-dropin-file", exit: 1, stdout: "", stderr: "DROPIN_FILE_MISSING" });
    fail("DROPIN_FILE_MISSING");
  }
  const actual = readFileSync(file, "utf8");
  if (actual !== renderDropIn(value)) {
    records?.push({ gate: "canonical-dropin-content", exit: 1, stdout: "", stderr: "DROPIN_CONTENT_MISMATCH" });
    fail("DROPIN_CONTENT_MISMATCH");
  }
  const lines = actual.split(/\r?\n/);
  const userLines = lines.filter((line) => line.startsWith("User=")).map((line) => line.slice("User=".length));
  const groupLines = lines.filter((line) => line.startsWith("Group=")).map((line) => line.slice("Group=".length));
  if (userLines.length !== 1 || groupLines.length !== 1 || userLines[0] !== value.systemd.user || groupLines[0] !== value.systemd.group) {
    records?.push({ gate: "service-identity", exit: 1, stdout: "", stderr: "SERVICE_IDENTITY_MISMATCH" });
    fail("SERVICE_IDENTITY_MISMATCH");
  }
  const declaredEnvironmentFiles = lines.filter((line) => line.startsWith("EnvironmentFile=")).map((line) => line.slice("EnvironmentFile=".length));
  const expectedEnvironmentFiles = ["", ...value.systemd.environmentFiles.map((entry) => entry.path)];
  if (JSON.stringify(declaredEnvironmentFiles) !== JSON.stringify(expectedEnvironmentFiles)) {
    records?.push({ gate: "environment-files", exit: 1, stdout: "", stderr: "ENVIRONMENT_DECLARATION_MISMATCH" });
    fail("ENVIRONMENT_DECLARATION_MISMATCH");
  }
  const execStartLines = lines.filter((line) => line.startsWith("ExecStart=")).map((line) => line.slice("ExecStart=".length));
  const expectedExecStart = value.systemd.execStart.join(" ");
  if (execStartLines.length !== 2 || execStartLines[0] !== "" || execStartLines[1] !== expectedExecStart) {
    records?.push({ gate: "effective-exec-start", exit: 1, stdout: "", stderr: "EFFECTIVE_EXEC_START_MISMATCH" });
    fail("EFFECTIVE_EXEC_START_MISMATCH");
  }
  const passed = [
    { gate: "service-identity", exit: 0, stdout: "qimao:qimao", stderr: "" },
    { gate: "canonical-dropin-directory", exit: 0, stdout: "present", stderr: "" },
    { gate: "environment-files", exit: 0, stdout: `declared=${expectedEnvironmentFiles.length - 1}+reset`, stderr: "" },
    { gate: "effective-exec-start", exit: 0, stdout: "matches-declaration", stderr: "" }
  ];
  records?.push(...passed);
  return passed;
}

function checkArtifactAndCurrent(root, value = manifest, records = []) {
  assertManifest(value);
  const releaseRoot = resolveRelative(root, value.artifact.releaseDirectory);
  const currentRoot = resolveRelative(root, value.artifact.currentLink);
  let currentStat;
  try {
    currentStat = lstatSync(currentRoot);
  } catch {
    records.push({ gate: "current-symlink", exit: 1, stdout: "", stderr: "CURRENT_SYMLINK_MISSING" });
    fail("CURRENT_SYMLINK_MISSING");
  }
  if (!currentStat.isSymbolicLink()) {
    records.push({ gate: "current-symlink", exit: 1, stdout: "", stderr: "CURRENT_SYMLINK_MISSING" });
    fail("CURRENT_SYMLINK_MISSING");
  }
  const currentTarget = readlinkSync(currentRoot);
  const resolvedCurrentTarget = isAbsolute(currentTarget) ? resolve(currentTarget) : resolve(dirname(currentRoot), currentTarget);
  if ((!isAbsolute(currentTarget) && currentTarget.split(/[\\/]+/).includes("..")) || resolvedCurrentTarget !== releaseRoot) {
    fail("CURRENT_SYMLINK_TARGET");
  }

  const entryPaths = new Map();
  for (const entry of value.artifact.requiredEntries) {
    const entryPath = resolveRelative(releaseRoot, entry.path);
    const stat = lstatSync(entryPath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      records.push({ gate: `portable-entry:${entry.id}`, exit: 1, stdout: "", stderr: `PORTABLE_ENTRY_NOT_REGULAR:${entry.id}` });
      fail(`PORTABLE_ENTRY_NOT_REGULAR:${entry.id}`);
    }
    entryPaths.set(entry.id, entryPath);
    records.push({ gate: `portable-entry:${entry.id}`, exit: 0, stdout: "regular-file", stderr: "" });
  }
  const currentEntry = resolveRelative(currentRoot, value.artifact.standaloneEntry);
  if (!lstatSync(currentEntry).isFile()) {
    records.push({ gate: "current-entry", exit: 1, stdout: "", stderr: "CURRENT_ENTRY_MISSING" });
    fail("CURRENT_ENTRY_MISSING");
  }
  records.push({ gate: "current-symlink", exit: 0, stdout: "relative-target", stderr: "" });
  for (const entry of value.artifact.requiredEntries) {
    importGate(root, entryPaths.get(entry.id), entry.id, records);
  }
  standaloneGate(currentEntry, "current-standalone", records);
  checkDropIn(root, value, records);
  return records;
}

function makeFixture(root) {
  const releaseRoot = join(root, manifest.artifact.releaseDirectory);
  for (const entry of manifest.artifact.requiredEntries) {
    const entryPath = resolveRelative(releaseRoot, entry.path);
    mkdirSync(dirname(entryPath), { recursive: true });
    const body = entry.id === "asr-worker"
      ? [
        "import { pathToFileURL } from 'node:url';",
        "if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log('worker-ready');",
        "export const fixture = true;",
        ""
      ].join("\n")
      : "export const fixture = true;\n";
    writeFileSync(entryPath, body, "utf8");
  }
  const currentRoot = join(root, manifest.artifact.currentLink);
  symlinkSync(manifest.artifact.releaseDirectory, currentRoot, process.platform === "win32" ? "junction" : "dir");
  const dropInFile = fixtureDropInPath(root);
  mkdirSync(dirname(dropInFile), { recursive: true });
  writeFileSync(dropInFile, renderDropIn(), "utf8");
}

function expectedFailure(gate, operation, expectedCode) {
  try {
    operation();
  } catch (error) {
    if (error?.code !== expectedCode) {
      throw error;
    }
    return { gate, exit: 1, stdout: "", stderr: expectedCode, expectedFailure: true };
  }
  fail(`NEGATIVE_GATE_DID_NOT_FAIL:${gate}`);
}

function selfTest() {
  const root = mkdtempSync(join(tmpdir(), "qimao-worker-release-"));
  const records = [];
  try {
    makeFixture(root);
    records.push(...checkArtifactAndCurrent(root));

    const dropInDirectory = dirname(fixtureDropInPath(root));
    rmSync(dropInDirectory, { recursive: true, force: true });
    records.push(expectedFailure("missing-canonical-dropin-directory", () => checkDropIn(root), "DROPIN_DIR_MISSING"));
    mkdirSync(dropInDirectory, { recursive: true });
    writeFileSync(fixtureDropInPath(root), renderDropIn(), "utf8");

    const missingEnvironment = structuredClone(manifest);
    missingEnvironment.systemd.environmentFiles.pop();
    records.push(expectedFailure("missing-provider-environment-declaration", () => assertManifest(missingEnvironment), "ENVIRONMENT_FILE_SET"));

    const silentEntry = join(root, manifest.artifact.releaseDirectory, "silent.mjs");
    writeFileSync(silentEntry, "export const fixture = true;\n", "utf8");
    records.push(expectedFailure("silent-standalone-entry", () => standaloneGate(silentEntry, "silent-standalone"), "STANDALONE_GUARD_MISS"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ result: "passed", gates: records.length, cleanup: existsSync(root) ? "present" : "absent" }));
  for (const record of records) {
    console.log(JSON.stringify(record));
  }
}

function runPreflight(root) {
  const records = [];
  try {
    checkArtifactAndCurrent(resolve(root), manifest, records);
    for (const record of records) {
      console.log(JSON.stringify(record));
    }
    console.log(JSON.stringify({ result: "passed", gates: records.length }));
  } catch (error) {
    for (const record of records) {
      console.log(JSON.stringify(record));
    }
    throw error;
  }
}

function usageError() {
  fail("USAGE: --self-test | --render-dropin <output> | --preflight <fixture-root>");
}

function main() {
  assertManifest(manifest);
  const [command, value] = process.argv.slice(2);
  if (command === "--self-test" && value === undefined) {
    selfTest();
    return;
  }
  if (command === "--render-dropin" && value) {
    mkdirSync(dirname(resolve(value)), { recursive: true });
    writeFileSync(resolve(value), renderDropIn(), "utf8");
    console.log(JSON.stringify({ result: "rendered" }));
    return;
  }
  if (command === "--preflight" && value) {
    runPreflight(value);
    return;
  }
  usageError();
}

try {
  main();
} catch (error) {
  const code = error?.code || error?.name || "PREFLIGHT_ERROR";
  console.error(JSON.stringify({ result: "blocked", code }));
  process.exitCode = 1;
}
