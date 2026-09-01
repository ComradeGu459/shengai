#!/usr/bin/env node

import { readFileSync } from "node:fs";

const SCHEMA_V1 = "qimao.application-release/v1";
const SCHEMA_V2 = "qimao.application-release/v2";
const DECLARATION_NAME = "application-release.declaration.json";
const BACKEND_PREFIX = "/opt/qimao-terms-cloud/releases/";
const STATIC_PREFIX = "/srv/qimao-terms-cloud/frontend-";
const SYSTEM_STATIC_PREFIX = "/srv/qimao-terms-cloud/system-frontend-";
const RELEASE_ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const LABEL = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;
const MIGRATION_SCHEMA = /^\d{13}_[a-z0-9_]+$/;
const UNIT_STATE = /^(?:active\/running|inactive\/dead)\/\d+\/\d+$/;

class DeclarationError extends Error {
  constructor(code) {
    super(code);
    this.name = "DeclarationError";
    this.code = code;
  }
}

function fail(code) {
  throw new DeclarationError(code);
}

function assertObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(`${code}_KEYS`);
}

function assertReleaseTarget(value, prefix, code) {
  if (typeof value !== "string" || !value.startsWith(prefix)) fail(code);
  const suffix = value.slice(prefix.length);
  if (!RELEASE_ID.test(suffix)) fail(code);
}

function assertProbePath(value) {
  if (typeof value !== "string" || value.length > 512 || !value.startsWith("/api/")) {
    fail("PROBE_PATH_INVALID");
  }
  if (/[^\x21-\x7e]/.test(value) || value.includes("\\") || value.includes("?") || value.includes("#")) {
    fail("PROBE_PATH_INVALID");
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) fail("PROBE_PATH_INVALID");
}

function assertMarker(value) {
  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") < 1 || Buffer.byteLength(value, "utf8") > 160) {
    fail("STATIC_MARKER_INVALID");
  }
  if (/[\u0000-\u001f\u007f]/u.test(value)) fail("STATIC_MARKER_INVALID");
}

function assertMarkers(values, setCode, markerCode, duplicateCode) {
  if (!Array.isArray(values) || values.length < 1 || values.length > 8) fail(setCode);
  values.forEach((value) => {
    try {
      assertMarker(value);
    } catch (error) {
      if (error instanceof DeclarationError && error.code === "STATIC_MARKER_INVALID") fail(markerCode);
      throw error;
    }
  });
  if (new Set(values).size !== values.length) fail(duplicateCode);
}

function validate(value) {
  assertObject(value, ["$schema", "formatVersion", "release", "runtime", "candidate", "migration"], "DECLARATION");
  const schemaVersion = value.$schema === SCHEMA_V1 && value.formatVersion === 1
    ? 1
    : value.$schema === SCHEMA_V2 && value.formatVersion === 2
      ? 2
      : 0;
  if (!schemaVersion) fail("DECLARATION_VERSION");

  const hasEmployeeStaticContract = schemaVersion === 2
    && Object.prototype.hasOwnProperty.call(value.release ?? {}, "employeeStatic");
  let employeeStaticMode = "replace";
  let previousStaticTarget = value.release?.previousStaticTarget;
  if (hasEmployeeStaticContract) {
    const employeeStatic = value.release.employeeStatic;
    if (!employeeStatic || typeof employeeStatic !== "object" || Array.isArray(employeeStatic)) {
      fail("EMPLOYEE_STATIC_INVALID");
    }
    if (employeeStatic.mode === "replace") {
      assertObject(employeeStatic, ["mode"], "EMPLOYEE_STATIC_REPLACE");
    } else if (employeeStatic.mode === "preserve") {
      assertObject(employeeStatic, ["mode", "expectedTarget"], "EMPLOYEE_STATIC_PRESERVE");
      employeeStaticMode = "preserve";
      previousStaticTarget = employeeStatic.expectedTarget;
    } else {
      fail("EMPLOYEE_STATIC_MODE_INVALID");
    }
  }
  const hasSystemStaticContract = schemaVersion === 2
    && Object.prototype.hasOwnProperty.call(value.release ?? {}, "systemStatic");
  let systemStaticMode = "replace";
  let previousSystemStaticTarget = value.release?.previousSystemStaticTarget;
  if (hasSystemStaticContract) {
    const systemStatic = value.release.systemStatic;
    if (!systemStatic || typeof systemStatic !== "object" || Array.isArray(systemStatic)) {
      fail("SYSTEM_STATIC_INVALID");
    }
    if (systemStatic.mode === "replace") {
      assertObject(systemStatic, ["mode"], "SYSTEM_STATIC_REPLACE");
    } else if (systemStatic.mode === "preserve") {
      assertObject(systemStatic, ["mode", "expectedTarget"], "SYSTEM_STATIC_PRESERVE");
      systemStaticMode = "preserve";
      previousSystemStaticTarget = systemStatic.expectedTarget;
    } else {
      fail("SYSTEM_STATIC_MODE_INVALID");
    }
  }
  const releaseKeys = ["id", "previousBackendTarget"];
  if (employeeStaticMode === "replace") releaseKeys.push("previousStaticTarget");
  if (schemaVersion === 2 && systemStaticMode === "replace") releaseKeys.push("previousSystemStaticTarget");
  if (hasEmployeeStaticContract) releaseKeys.push("employeeStatic");
  if (hasSystemStaticContract) releaseKeys.push("systemStatic");
  assertObject(value.release, releaseKeys, "RELEASE");
  if (typeof value.release.id !== "string" || !RELEASE_ID.test(value.release.id)) fail("RELEASE_ID_INVALID");
  assertReleaseTarget(value.release.previousBackendTarget, BACKEND_PREFIX, "PREVIOUS_BACKEND_TARGET_INVALID");
  assertReleaseTarget(
    previousStaticTarget,
    STATIC_PREFIX,
    employeeStaticMode === "preserve"
      ? "EMPLOYEE_STATIC_EXPECTED_TARGET_INVALID"
      : "PREVIOUS_STATIC_TARGET_INVALID",
  );
  if (schemaVersion === 2) {
    assertReleaseTarget(
      previousSystemStaticTarget,
      SYSTEM_STATIC_PREFIX,
      systemStaticMode === "preserve"
        ? "SYSTEM_STATIC_EXPECTED_TARGET_INVALID"
        : "PREVIOUS_SYSTEM_STATIC_TARGET_INVALID",
    );
  }

  const archiveName = `${value.release.id}.tar.gz`;
  const nextBackendTarget = `${BACKEND_PREFIX}${value.release.id}`;
  const nextStaticTarget = employeeStaticMode === "preserve"
    ? previousStaticTarget
    : `${STATIC_PREFIX}${value.release.id}`;
  const nextSystemStaticTarget = schemaVersion === 2
    ? systemStaticMode === "preserve" ? previousSystemStaticTarget : `${SYSTEM_STATIC_PREFIX}${value.release.id}`
    : "";
  if (value.release.previousBackendTarget === nextBackendTarget) fail("BACKEND_TARGET_NOT_NEW");
  if (employeeStaticMode === "replace" && previousStaticTarget === nextStaticTarget) {
    fail("STATIC_TARGET_NOT_NEW");
  }
  if (schemaVersion === 2 && systemStaticMode === "replace"
    && previousSystemStaticTarget === nextSystemStaticTarget) {
    fail("SYSTEM_STATIC_TARGET_NOT_NEW");
  }

  assertObject(value.runtime, ["preservedUnits"], "RUNTIME");
  assertObject(value.runtime.preservedUnits, ["asr", "screenText", "openVino"], "PRESERVED_UNITS");
  for (const state of Object.values(value.runtime.preservedUnits)) {
    if (typeof state !== "string" || !UNIT_STATE.test(state)) fail("PRESERVED_UNIT_STATE_INVALID");
  }

  const hasExplicitSystemProbe = schemaVersion === 2
    && Object.prototype.hasOwnProperty.call(value.candidate ?? {}, "systemUnauthenticatedProbe");
  const probeKey = hasExplicitSystemProbe ? "systemUnauthenticatedProbe" : "unauthenticatedProbe";
  assertObject(
    value.candidate,
    schemaVersion === 2
      ? [
          ...(employeeStaticMode === "replace" ? ["staticMarkers"] : []),
          ...(systemStaticMode === "replace" ? ["systemStaticMarkers"] : []),
          probeKey,
        ]
      : ["staticMarkers", "unauthenticatedProbe"],
    "CANDIDATE",
  );
  const staticMarkers = employeeStaticMode === "preserve" ? [] : value.candidate.staticMarkers;
  if (employeeStaticMode === "replace") {
    assertMarkers(
      staticMarkers,
      "STATIC_MARKER_SET_INVALID",
      "STATIC_MARKER_INVALID",
      "STATIC_MARKER_DUPLICATE",
    );
  }
  const systemStaticMarkers = schemaVersion === 2 && systemStaticMode === "replace"
    ? value.candidate.systemStaticMarkers
    : [];
  if (schemaVersion === 2 && systemStaticMode === "replace") {
    assertMarkers(
      systemStaticMarkers,
      "SYSTEM_STATIC_MARKER_SET_INVALID",
      "SYSTEM_STATIC_MARKER_INVALID",
      "SYSTEM_STATIC_MARKER_DUPLICATE",
    );
  }
  const probe = hasExplicitSystemProbe
    ? value.candidate.systemUnauthenticatedProbe
    : value.candidate.unauthenticatedProbe;
  assertObject(
    probe,
    hasExplicitSystemProbe ? ["label", "path", "expectedStatus"] : ["label", "path"],
    hasExplicitSystemProbe ? "SYSTEM_PROBE" : "PROBE",
  );
  if (typeof probe.label !== "string" || !LABEL.test(probe.label)) {
    fail("PROBE_LABEL_INVALID");
  }
  assertProbePath(probe.path);
  const probeExpectedStatus = hasExplicitSystemProbe ? probe.expectedStatus : 401;
  if (!Number.isInteger(probeExpectedStatus) || ![401, 403].includes(probeExpectedStatus)) {
    fail("PROBE_EXPECTED_STATUS_INVALID");
  }

  let migrationHelper = "";
  let migrationSchema = "";
  if (value.migration?.mode === "none") {
    assertObject(value.migration, ["mode"], "MIGRATION_NONE");
  } else if (value.migration?.mode === "gated") {
    assertObject(value.migration, ["mode", "helper", "schema"], "MIGRATION_GATED");
    if (value.migration.helper !== "db-migration-gate.mjs") fail("MIGRATION_HELPER_INVALID");
    if (typeof value.migration.schema !== "string" || !MIGRATION_SCHEMA.test(value.migration.schema)) {
      fail("MIGRATION_SCHEMA_INVALID");
    }
    migrationHelper = value.migration.helper;
    migrationSchema = value.migration.schema;
  } else {
    fail("MIGRATION_MODE_INVALID");
  }

  return {
    schema: value.$schema,
    formatVersion: value.formatVersion,
    releaseId: value.release.id,
    archiveName,
    previousBackendTarget: value.release.previousBackendTarget,
    nextBackendTarget,
    employeeStaticMode,
    previousStaticTarget,
    nextStaticTarget,
    systemStaticEnabled: schemaVersion === 2,
    systemStaticMode,
    previousSystemStaticTarget: schemaVersion === 2 ? previousSystemStaticTarget : "",
    nextSystemStaticTarget,
    asrExpectedState: value.runtime.preservedUnits.asr,
    screenExpectedState: value.runtime.preservedUnits.screenText,
    openVinoExpectedState: value.runtime.preservedUnits.openVino,
    probeLabel: probe.label,
    probePath: probe.path,
    probeExpectedStatus,
    staticMarkers: [...staticMarkers],
    systemStaticMarkers: [...systemStaticMarkers],
    migrationMode: value.migration.mode,
    migrationHelper,
    migrationSchema,
  };
}

function parseDeclaration(path) {
  let value;
  try {
    const text = readFileSync(path, "utf8");
    if (text.charCodeAt(0) === 0xfeff || text.includes("\r")) fail("DECLARATION_ENCODING_INVALID");
    value = JSON.parse(text);
  } catch (error) {
    if (error instanceof DeclarationError) throw error;
    fail("DECLARATION_READ_OR_JSON_INVALID");
  }
  return validate(value);
}

function expectedFiles(normalized) {
  const files = [DECLARATION_NAME, normalized.archiveName];
  if (normalized.migrationMode === "gated") files.push(normalized.migrationHelper);
  return files.sort();
}

function verifyChecksumText(normalized, text) {
  if (!text.endsWith("\n") || text.includes("\r") || text.charCodeAt(0) === 0xfeff) {
    fail("CHECKSUMS_ENCODING_INVALID");
  }
  const lines = text.slice(0, -1).split("\n");
  const names = [];
  for (const line of lines) {
    const match = /^([a-f0-9]{64})  ([A-Za-z0-9._-]+)$/.exec(line);
    if (!match) fail("CHECKSUMS_LINE_INVALID");
    names.push(match[2]);
  }
  if (new Set(names).size !== names.length) fail("CHECKSUMS_DUPLICATE");
  if (JSON.stringify([...names].sort()) !== JSON.stringify(expectedFiles(normalized))) {
    fail("CHECKSUMS_FILE_SET_INVALID");
  }
  return names.length;
}

function readChecksums(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    fail("CHECKSUMS_READ_INVALID");
  }
}

function encode(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function emit(normalized) {
  const records = [
    ["schema", normalized.schema],
    ["release_id", normalized.releaseId],
    ["archive_name", normalized.archiveName],
    ["previous_backend", normalized.previousBackendTarget],
    ["next_backend", normalized.nextBackendTarget],
    ["previous_static", normalized.previousStaticTarget],
    ["next_static", normalized.nextStaticTarget],
    ["employee_static_mode", normalized.employeeStaticMode],
    ["system_static_enabled", normalized.systemStaticEnabled ? "true" : "false"],
    ["system_static_mode", normalized.systemStaticMode],
    ["previous_system_static", normalized.previousSystemStaticTarget],
    ["next_system_static", normalized.nextSystemStaticTarget],
    ["asr_expected_state", normalized.asrExpectedState],
    ["screen_expected_state", normalized.screenExpectedState],
    ["openvino_expected_state", normalized.openVinoExpectedState],
    ["probe_label", normalized.probeLabel],
    ["probe_path", normalized.probePath],
    ["probe_expected_status", String(normalized.probeExpectedStatus)],
    ["migration_mode", normalized.migrationMode],
    ["migration_helper", normalized.migrationHelper],
    ["migration_schema", normalized.migrationSchema],
    ...normalized.staticMarkers.map((marker) => ["static_marker", marker]),
    ...normalized.systemStaticMarkers.map((marker) => ["system_static_marker", marker]),
  ];
  for (const [key, value] of records) process.stdout.write(`${key}\t${encode(value)}\n`);
}

function fixture(mode = "none", schemaVersion = 1, options = {}) {
  const legacyV2 = options.legacyV2 === true;
  const expectedStatus = options.expectedStatus ?? 401;
  const employeeStaticMode = options.employeeStaticMode ?? "legacy-replace";
  const requestedSystemStaticMode = options.systemStaticMode;
  const systemStaticMode = requestedSystemStaticMode === "preserve" ? "preserve" : "replace";
  const previousStaticTarget = `${STATIC_PREFIX}previous-release-r1`;
  const previousSystemStaticTarget = `${SYSTEM_STATIC_PREFIX}previous-release-r1`;
  const value = {
    $schema: schemaVersion === 2 ? SCHEMA_V2 : SCHEMA_V1,
    formatVersion: schemaVersion,
    release: {
      id: "fixture-release-20260901-r1",
      previousBackendTarget: `${BACKEND_PREFIX}previous-release-r1`,
      ...(employeeStaticMode === "preserve" ? {} : { previousStaticTarget }),
      ...(schemaVersion === 2 && systemStaticMode === "replace" ? { previousSystemStaticTarget } : {}),
      ...(schemaVersion === 2 && employeeStaticMode === "preserve"
        ? { employeeStatic: { mode: "preserve", expectedTarget: previousStaticTarget } }
        : schemaVersion === 2 && employeeStaticMode === "replace"
          ? { employeeStatic: { mode: "replace" } }
          : {}),
      ...(schemaVersion === 2 && requestedSystemStaticMode === "preserve"
        ? { systemStatic: { mode: "preserve", expectedTarget: previousSystemStaticTarget } }
        : schemaVersion === 2 && requestedSystemStaticMode === "replace"
          ? { systemStatic: { mode: "replace" } }
          : {}),
    },
    runtime: {
      preservedUnits: {
        asr: "active/running/0/0",
        screenText: "inactive/dead/0/0",
        openVino: "active/running/0/0",
      },
    },
    candidate: {
      ...(employeeStaticMode === "preserve" ? {} : { staticMarkers: ["固定标记", "second marker"] }),
      ...(schemaVersion === 2 && systemStaticMode === "replace"
        ? { systemStaticMarkers: ["管理员固定标记", "admin marker"] }
        : {}),
      ...(schemaVersion === 2 && !legacyV2
        ? {
            systemUnauthenticatedProbe: {
              label: "fixture_probe",
              path: "/api/projects/00000000-0000-0000-0000-000000000000/releases",
              expectedStatus,
            },
          }
        : {
            unauthenticatedProbe: {
              label: "fixture_probe",
              path: "/api/projects/00000000-0000-0000-0000-000000000000/releases",
            },
          }),
    },
    migration: mode === "gated"
      ? { mode: "gated", helper: "db-migration-gate.mjs", schema: "1754976034000_fixture" }
      : { mode: "none" },
  };
  return value;
}

function expectFailure(code, operation) {
  try {
    operation();
  } catch (error) {
    if (error?.code === code) return;
    throw error;
  }
  fail(`NEGATIVE_CASE_DID_NOT_FAIL_${code}`);
}

function selfTest() {
  const plain = validate(fixture("none"));
  const gated = validate(fixture("gated"));
  const plainV2 = validate(fixture("none", 2, { expectedStatus: 401 }));
  const gatedV2 = validate(fixture("gated", 2, { expectedStatus: 403 }));
  const legacyV2 = validate(fixture("none", 2, { legacyV2: true }));
  const explicitReplaceV2 = validate(fixture("none", 2, { employeeStaticMode: "replace" }));
  const preserveV2 = validate(fixture("gated", 2, { expectedStatus: 403, employeeStaticMode: "preserve" }));
  const systemPreserveV2 = validate(fixture("none", 2, { systemStaticMode: "preserve" }));
  const bothPreserveV2 = validate(fixture("none", 2, {
    employeeStaticMode: "preserve",
    systemStaticMode: "preserve",
  }));
  if (plain.probeExpectedStatus !== 401 || gated.probeExpectedStatus !== 401
    || plainV2.probeExpectedStatus !== 401 || gatedV2.probeExpectedStatus !== 403
    || legacyV2.probeExpectedStatus !== 401 || explicitReplaceV2.employeeStaticMode !== "replace"
    || preserveV2.employeeStaticMode !== "preserve"
    || preserveV2.previousStaticTarget !== preserveV2.nextStaticTarget
    || preserveV2.staticMarkers.length !== 0
    || systemPreserveV2.systemStaticMode !== "preserve"
    || systemPreserveV2.previousSystemStaticTarget !== systemPreserveV2.nextSystemStaticTarget
    || systemPreserveV2.systemStaticMarkers.length !== 0
    || bothPreserveV2.employeeStaticMode !== "preserve"
    || bothPreserveV2.systemStaticMode !== "preserve"
    || bothPreserveV2.staticMarkers.length !== 0
    || bothPreserveV2.systemStaticMarkers.length !== 0) {
    fail("PROBE_EXPECTED_STATUS_NORMALIZATION_INVALID");
  }
  const hash = "a".repeat(64);
  verifyChecksumText(plain, `${hash}  ${DECLARATION_NAME}\n${hash}  ${plain.archiveName}\n`);
  verifyChecksumText(gated, `${hash}  ${DECLARATION_NAME}\n${hash}  ${gated.archiveName}\n${hash}  ${gated.migrationHelper}\n`);
  verifyChecksumText(plainV2, `${hash}  ${DECLARATION_NAME}\n${hash}  ${plainV2.archiveName}\n`);
  verifyChecksumText(gatedV2, `${hash}  ${DECLARATION_NAME}\n${hash}  ${gatedV2.archiveName}\n${hash}  ${gatedV2.migrationHelper}\n`);
  verifyChecksumText(legacyV2, `${hash}  ${DECLARATION_NAME}\n${hash}  ${legacyV2.archiveName}\n`);
  verifyChecksumText(explicitReplaceV2, `${hash}  ${DECLARATION_NAME}\n${hash}  ${explicitReplaceV2.archiveName}\n`);
  verifyChecksumText(preserveV2, `${hash}  ${DECLARATION_NAME}\n${hash}  ${preserveV2.archiveName}\n${hash}  ${preserveV2.migrationHelper}\n`);
  verifyChecksumText(systemPreserveV2, `${hash}  ${DECLARATION_NAME}\n${hash}  ${systemPreserveV2.archiveName}\n`);
  verifyChecksumText(bothPreserveV2, `${hash}  ${DECLARATION_NAME}\n${hash}  ${bothPreserveV2.archiveName}\n`);

  const unsafeTarget = fixture();
  unsafeTarget.release.previousBackendTarget = `${BACKEND_PREFIX}../escape`;
  expectFailure("PREVIOUS_BACKEND_TARGET_INVALID", () => validate(unsafeTarget));

  const unknownKey = fixture();
  unknownKey.release.extra = true;
  expectFailure("RELEASE_KEYS", () => validate(unknownKey));

  const markerWithControl = fixture();
  markerWithControl.candidate.staticMarkers = ["bad\nmarker"];
  expectFailure("STATIC_MARKER_INVALID", () => validate(markerWithControl));

  const unsafeSystemTarget = fixture("none", 2);
  unsafeSystemTarget.release.previousSystemStaticTarget = `${SYSTEM_STATIC_PREFIX}../escape`;
  expectFailure("PREVIOUS_SYSTEM_STATIC_TARGET_INVALID", () => validate(unsafeSystemTarget));

  const missingSystemMarkers = fixture("none", 2);
  delete missingSystemMarkers.candidate.systemStaticMarkers;
  expectFailure("CANDIDATE_KEYS", () => validate(missingSystemMarkers));

  const v1WithSystemStatic = fixture();
  v1WithSystemStatic.release.systemStatic = { mode: "preserve", expectedTarget: `${SYSTEM_STATIC_PREFIX}unexpected` };
  expectFailure("RELEASE_KEYS", () => validate(v1WithSystemStatic));

  const v1WithPreviousSystemStatic = fixture();
  v1WithPreviousSystemStatic.release.previousSystemStaticTarget = `${SYSTEM_STATIC_PREFIX}unexpected`;
  expectFailure("RELEASE_KEYS", () => validate(v1WithPreviousSystemStatic));

  const v1WithSystemMarkers = fixture();
  v1WithSystemMarkers.candidate.systemStaticMarkers = ["must not exist"];
  expectFailure("CANDIDATE_KEYS", () => validate(v1WithSystemMarkers));

  const systemPreserveMissingTarget = fixture("none", 2, { systemStaticMode: "preserve" });
  delete systemPreserveMissingTarget.release.systemStatic.expectedTarget;
  expectFailure("SYSTEM_STATIC_PRESERVE_KEYS", () => validate(systemPreserveMissingTarget));

  const systemPreserveWithPreviousTarget = fixture("none", 2, { systemStaticMode: "preserve" });
  systemPreserveWithPreviousTarget.release.previousSystemStaticTarget = `${SYSTEM_STATIC_PREFIX}duplicate`;
  expectFailure("RELEASE_KEYS", () => validate(systemPreserveWithPreviousTarget));

  const systemPreserveUnsafeTarget = fixture("none", 2, { systemStaticMode: "preserve" });
  systemPreserveUnsafeTarget.release.systemStatic.expectedTarget = `${SYSTEM_STATIC_PREFIX}../escape`;
  expectFailure("SYSTEM_STATIC_EXPECTED_TARGET_INVALID", () => validate(systemPreserveUnsafeTarget));

  const systemPreserveWithMarkers = fixture("none", 2, { systemStaticMode: "preserve" });
  systemPreserveWithMarkers.candidate.systemStaticMarkers = ["must not exist"];
  expectFailure("CANDIDATE_KEYS", () => validate(systemPreserveWithMarkers));

  const invalidSystemMode = fixture("none", 2, { systemStaticMode: "preserve" });
  invalidSystemMode.release.systemStatic.mode = "keep";
  expectFailure("SYSTEM_STATIC_MODE_INVALID", () => validate(invalidSystemMode));

  const replaceWithExpectedSystemTarget = fixture("none", 2, { systemStaticMode: "replace" });
  replaceWithExpectedSystemTarget.release.systemStatic.expectedTarget = `${SYSTEM_STATIC_PREFIX}unexpected`;
  expectFailure("SYSTEM_STATIC_REPLACE_KEYS", () => validate(replaceWithExpectedSystemTarget));

  const invalidEmployeeMode = fixture("none", 2, { employeeStaticMode: "replace" });
  invalidEmployeeMode.release.employeeStatic.mode = "keep";
  expectFailure("EMPLOYEE_STATIC_MODE_INVALID", () => validate(invalidEmployeeMode));

  const preserveMissingTarget = fixture("none", 2, { employeeStaticMode: "preserve" });
  delete preserveMissingTarget.release.employeeStatic.expectedTarget;
  expectFailure("EMPLOYEE_STATIC_PRESERVE_KEYS", () => validate(preserveMissingTarget));

  const preserveWithPreviousStatic = fixture("none", 2, { employeeStaticMode: "preserve" });
  preserveWithPreviousStatic.release.previousStaticTarget = `${STATIC_PREFIX}duplicate`;
  expectFailure("RELEASE_KEYS", () => validate(preserveWithPreviousStatic));

  const preserveUnsafeTarget = fixture("none", 2, { employeeStaticMode: "preserve" });
  preserveUnsafeTarget.release.employeeStatic.expectedTarget = `${STATIC_PREFIX}../escape`;
  expectFailure("EMPLOYEE_STATIC_EXPECTED_TARGET_INVALID", () => validate(preserveUnsafeTarget));

  const preserveWithStaticMarkers = fixture("none", 2, { employeeStaticMode: "preserve" });
  preserveWithStaticMarkers.candidate.staticMarkers = ["must not exist"];
  expectFailure("CANDIDATE_KEYS", () => validate(preserveWithStaticMarkers));

  const replaceWithExpectedTarget = fixture("none", 2, { employeeStaticMode: "replace" });
  replaceWithExpectedTarget.release.employeeStatic.expectedTarget = `${STATIC_PREFIX}unexpected`;
  expectFailure("EMPLOYEE_STATIC_REPLACE_KEYS", () => validate(replaceWithExpectedTarget));

  const replaceWithoutPreviousStatic = fixture("none", 2, { employeeStaticMode: "replace" });
  delete replaceWithoutPreviousStatic.release.previousStaticTarget;
  expectFailure("RELEASE_KEYS", () => validate(replaceWithoutPreviousStatic));

  const v1WithEmployeeStatic = fixture();
  v1WithEmployeeStatic.release.employeeStatic = { mode: "preserve", expectedTarget: `${STATIC_PREFIX}unexpected` };
  expectFailure("RELEASE_KEYS", () => validate(v1WithEmployeeStatic));

  const invalidProbeStatus400 = fixture("none", 2, { expectedStatus: 400 });
  expectFailure("PROBE_EXPECTED_STATUS_INVALID", () => validate(invalidProbeStatus400));

  const invalidProbeStatus404 = fixture("none", 2, { expectedStatus: 404 });
  expectFailure("PROBE_EXPECTED_STATUS_INVALID", () => validate(invalidProbeStatus404));

  const invalidProbeStatusString = fixture("none", 2, { expectedStatus: "403" });
  expectFailure("PROBE_EXPECTED_STATUS_INVALID", () => validate(invalidProbeStatusString));

  const duplicateProbeContracts = fixture("none", 2, { expectedStatus: 403 });
  duplicateProbeContracts.candidate.unauthenticatedProbe = {
    label: "legacy_probe",
    path: "/api/legacy-probe",
  };
  expectFailure("CANDIDATE_KEYS", () => validate(duplicateProbeContracts));

  const v1WithExpectedStatus = fixture();
  v1WithExpectedStatus.candidate.unauthenticatedProbe.expectedStatus = 401;
  expectFailure("PROBE_KEYS", () => validate(v1WithExpectedStatus));

  const missingHelper = fixture("gated");
  delete missingHelper.migration.helper;
  expectFailure("MIGRATION_GATED_KEYS", () => validate(missingHelper));

  expectFailure("CHECKSUMS_FILE_SET_INVALID", () => verifyChecksumText(plain, `${hash}  ${DECLARATION_NAME}\n`));
  expectFailure("CHECKSUMS_LINE_INVALID", () => verifyChecksumText(plain, `${hash}  ../escape\n${hash}  ${plain.archiveName}\n`));

  process.stdout.write(JSON.stringify({
    outcome: "passed",
    cases: 46,
    schemas: [SCHEMA_V1, SCHEMA_V2],
  }) + "\n");
}

function usage() {
  fail("USAGE");
}

try {
  const [command, declarationPath, checksumsPath] = process.argv.slice(2);
  if (command === "--self-test" && declarationPath === undefined) {
    selfTest();
  } else if (command === "--validate" && declarationPath && checksumsPath === undefined) {
    const normalized = parseDeclaration(declarationPath);
    process.stdout.write(JSON.stringify({ outcome: "passed", releaseId: normalized.releaseId, migration: normalized.migrationMode }) + "\n");
  } else if (command === "--emit" && declarationPath && checksumsPath === undefined) {
    emit(parseDeclaration(declarationPath));
  } else if (command === "--verify-checksums" && declarationPath && checksumsPath) {
    const normalized = parseDeclaration(declarationPath);
    const count = verifyChecksumText(normalized, readChecksums(checksumsPath));
    process.stdout.write(JSON.stringify({ outcome: "passed", files: count }) + "\n");
  } else {
    usage();
  }
} catch (error) {
  const code = error?.code || "DECLARATION_TOOL_FAILED";
  process.stderr.write(JSON.stringify({ outcome: "blocked", code }) + "\n");
  process.exitCode = 1;
}
