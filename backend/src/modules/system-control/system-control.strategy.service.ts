import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import type {
  SystemControlStrategyArtifact, SystemControlStrategyArtifactList, SystemControlStrategyArtifactListQuery,
  SystemControlStrategyCreateArtifactBody, SystemControlStrategyCreateVersionBody, SystemControlStrategyEvent,
  SystemControlStrategyEventList, SystemControlStrategyEventListQuery, SystemControlStrategyVersion,
  SystemControlStrategyVersionList, SystemControlStrategyVersionListQuery, SystemControlStrategyPayload,
} from '@qimao-terms-cloud/contracts';
import type { DatabasePool } from '../../database/pool.js';
import type { SystemControlPrincipal } from './system-control.auth.js';

export class SystemControlStrategyError extends Error {
  constructor(readonly code: string, message: string, readonly statusCode: 400 | 404 | 409 | 422 = 400) {
    super(message); this.name = 'SystemControlStrategyError';
  }
}

const stable = (value: unknown): unknown => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, stable(v)])) : value;
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const parsePage = (query: { limit?: string; offset?: string }) => {
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || offset > 1_000_000) {
    throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_INVALID_PAGE', '分页参数无效', 400);
  }
  return { limit, offset };
};
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const hasAtMostSixDecimalPlaces = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
  && Math.abs(value * 1_000_000 - Math.round(value * 1_000_000)) <= 1e-9;

const payloadForKind = (kind: string, payload: unknown): payload is SystemControlStrategyPayload => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  const keys = Object.keys(payload as object);
  const exact = (allowed: string[]) => keys.every((key) => allowed.includes(key));
  if (kind === 'local_rule_pack') {
    if (keys.includes('payloadType')) return keys.length === 8 && (payload as any).payloadType === 'pre_review_local_rule_pack_v1'
      && Number.isInteger((payload as any).alignmentNearbyGapMs) && Number((payload as any).alignmentNearbyGapMs) >= 0 && Number((payload as any).alignmentNearbyGapMs) <= 5000
      && hasAtMostSixDecimalPlaces((payload as any).alignmentSimilarityThreshold) && Number((payload as any).alignmentSimilarityThreshold) >= 0 && Number((payload as any).alignmentSimilarityThreshold) <= 1
      && Number.isInteger((payload as any).maxCharacters) && Number((payload as any).maxCharacters) >= 1 && Number((payload as any).maxCharacters) <= 200
      && ['forbidSentencePunctuation', 'forbidMarkup', 'forbidBrackets', 'requireSpeakerDashForMultipleLines'].every((key) => typeof (payload as any)[key] === 'boolean');
    return exact(['rules']) && Array.isArray((payload as any).rules);
  }
  if (kind === 'ai_filter_policy') return exact(['mode', 'sampleRate', 'riskThreshold', 'maxCandidates']) && typeof (payload as any).mode === 'string' && typeof (payload as any).sampleRate === 'number' && typeof (payload as any).riskThreshold === 'number' && Number.isInteger((payload as any).maxCandidates);
  if (kind === 'prompt_template') return exact(['template', 'variables']) && typeof (payload as any).template === 'string' && Array.isArray((payload as any).variables);
  if (kind === 'hotword_projection') return exact(['terms', 'caseSensitive']) && Array.isArray((payload as any).terms) && typeof (payload as any).caseSensitive === 'boolean';
  return kind === 'risk_lexicon' && exact(['terms', 'severity']) && Array.isArray((payload as any).terms) && typeof (payload as any).severity === 'string';
};

const summaryForKind = (kind: string, payload: any): string => {
  if (!payload || typeof payload !== 'object') return '未配置摘要';
  if (kind === 'local_rule_pack') return `规则 ${Array.isArray(payload.rules) ? payload.rules.length : 0} 条`;
  if (kind === 'ai_filter_policy') return `模式 ${String(payload.mode ?? 'unknown')}，候选上限 ${Number(payload.maxCandidates ?? 0)}`;
  if (kind === 'prompt_template') return `模板 ${String(payload.template ?? '').length} 字符，变量 ${Array.isArray(payload.variables) ? payload.variables.length : 0} 个`;
  if (kind === 'hotword_projection') return `热词 ${Array.isArray(payload.terms) ? payload.terms.length : 0} 条`;
  return `风险词 ${Array.isArray(payload.terms) ? payload.terms.length : 0} 条，级别 ${String(payload.severity ?? 'unknown')}`;
};

const toArtifact = (row: any): SystemControlStrategyArtifact => ({
  artifactId: row.id, kind: row.artifact_kind, displayName: row.display_name, status: 'draft',
  purpose: row.purpose, applicableModules: row.applicable_modules, latestVersionId: row.latest_version_id, versionCount: Number(row.version_count),
  latestVersionSummary: row.latest_version_id ? summaryForKind(row.artifact_kind, row.latest_payload) : null,
  createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(),
});
const toVersion = (row: any): SystemControlStrategyVersion => ({
  versionId: row.id, artifactId: row.artifact_id, version: Number(row.version), schemaVersion: Number(row.schema_version), status: 'draft',
  contentDigest: row.content_digest, versionSummary: summaryForKind(row.artifact_kind ?? 'prompt_template', row.payload), payload: row.payload,
  baseVersionId: row.base_version_id ?? null, source: row.source ?? 'manual', evaluationRunId: row.evaluation_run_id ?? null, candidateDigest: row.candidate_digest ?? null,
  createdAt: new Date(row.created_at).toISOString(),
});
const toVersionListItem = (row: any) => ({
  versionId: row.id, artifactId: row.artifact_id, version: Number(row.version), schemaVersion: Number(row.schema_version), status: 'draft' as const,
  contentDigest: row.content_digest, versionSummary: summaryForKind(row.artifact_kind, row.payload), createdAt: new Date(row.created_at).toISOString(),
});
const lock = async (client: PoolClient, name: string) => { await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [name]); };

const EVENTS_CTE = `
WITH screen_event_states AS (
 SELECT e.*, CASE WHEN jsonb_typeof(e.after_state)='object' AND e.after_state ? 'candidate' THEN e.after_state->'candidate' ELSE e.after_state END normalized_after_state
 FROM screen_text_decision_events e
), acceptance_snapshots AS (
 SELECT e.id, e.event_kind, e.before_snapshot, e.after_snapshot, e.reverses_event_id, e.restores_event_id,
  e.created_at, s.project_id, s.term_version_id, ep.episode_number,
  COALESCE((SELECT jsonb_object_agg(cue->>'id', cue)
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(e.before_snapshot)='array' THEN e.before_snapshot ELSE '[]'::jsonb END) cue), '{}'::jsonb) before_map,
  COALESCE((SELECT jsonb_object_agg(cue->>'id', cue)
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(e.after_snapshot)='array' THEN e.after_snapshot ELSE '[]'::jsonb END) cue), '{}'::jsonb) after_map
 FROM acceptance_edit_events e
 JOIN acceptance_sessions s ON s.id=e.session_id
 JOIN acceptance_episodes ep ON ep.id=e.episode_id
), acceptance_changes AS (
 SELECT s.id, s.event_kind, s.before_snapshot, s.after_snapshot, s.reverses_event_id, s.restores_event_id,
  s.created_at, s.project_id, s.term_version_id, s.episode_number, ids.cue_id,
  s.before_map -> ids.cue_id before_cue, s.after_map -> ids.cue_id after_cue
 FROM acceptance_snapshots s
 CROSS JOIN LATERAL (
   SELECT key AS cue_id FROM jsonb_each(s.before_map)
   UNION
   SELECT key AS cue_id FROM jsonb_each(s.after_map)
 ) ids
), events AS (
 SELECT 'terms:' || e.id::text event_ref_id, 'terms'::text domain, d.project_id, NULL::int episode_number, NULL::text track,
  e.action::text action, d.base_term_version_id source_version_id, NULL::uuid artifact_version_id, e.created_at,
  CASE WHEN e.before_state IS NULL THEN NULL ELSE md5(e.before_state::text) END before_digest, md5(e.after_state::text) after_digest,
  CASE WHEN e.before_state IS NULL OR e.before_state = e.after_state THEN ARRAY[]::text[] ELSE ARRAY(SELECT key FROM (SELECT key FROM jsonb_object_keys(CASE WHEN jsonb_typeof(e.before_state)='object' THEN e.before_state ELSE '{}'::jsonb END) key UNION SELECT key FROM jsonb_object_keys(CASE WHEN jsonb_typeof(e.after_state)='object' THEN e.after_state ELSE '{}'::jsonb END) key) changed(key) WHERE (e.before_state->key) IS DISTINCT FROM (e.after_state->key) ORDER BY key) END changed_fields,
  COALESCE((SELECT count(*)::int FROM term_evidence evidence WHERE evidence.candidate_id=e.candidate_id),0) evidence_count, NULL::text reverses_event_ref_id, NULL::text restores_event_ref_id
  FROM term_decision_events e JOIN term_drafts d ON d.id = e.draft_id
 UNION ALL
 SELECT 'pre_review:' || e.id::text, 'pre_review', s.project_id, pe.episode_number, NULL::text, e.action::text, s.term_version_id, NULL::uuid, e.created_at,
  md5(e.before_state::text), md5(e.after_state::text), CASE WHEN e.before_state = e.after_state THEN ARRAY[]::text[] ELSE ARRAY(SELECT key FROM (SELECT key FROM jsonb_object_keys(CASE WHEN jsonb_typeof(e.before_state)='object' THEN e.before_state ELSE '{}'::jsonb END) key UNION SELECT key FROM jsonb_object_keys(CASE WHEN jsonb_typeof(e.after_state)='object' THEN e.after_state ELSE '{}'::jsonb END) key) changed(key) WHERE (e.before_state->key) IS DISTINCT FROM (e.after_state->key) ORDER BY key) END,
  COALESCE((SELECT CASE WHEN jsonb_typeof(item.term_evidence)='array' THEN jsonb_array_length(item.term_evidence) ELSE 0 END FROM pre_edit_items item WHERE item.id=e.item_id),0),
  CASE WHEN e.reverses_event_id IS NULL THEN NULL ELSE 'pre_review:' || e.reverses_event_id::text END, NULL
  FROM pre_edit_decision_events e JOIN pre_edit_sessions s ON s.id=e.session_id JOIN pre_edit_episodes pe ON pe.id=e.episode_id
 UNION ALL
  SELECT 'screen_text:' || e.id::text, 'screen_text', b.project_id, e.episode_number, NULL::text, e.action::text, b.term_version_id, NULL::uuid, e.created_at,
   CASE WHEN e.before_state IS NULL THEN NULL ELSE md5(e.before_state::text) END, md5(e.normalized_after_state::text), CASE WHEN e.before_state IS NULL OR e.before_state=e.normalized_after_state THEN ARRAY[]::text[] ELSE ARRAY(SELECT field FROM (VALUES
     ('text', (e.before_state->>'text') IS DISTINCT FROM (e.normalized_after_state->>'text')),
     ('startMs', (e.before_state->>'startMs') IS DISTINCT FROM (e.normalized_after_state->>'startMs')),
     ('endMs', (e.before_state->>'endMs') IS DISTINCT FROM (e.normalized_after_state->>'endMs')),
     ('category', (e.before_state->>'category') IS DISTINCT FROM (e.normalized_after_state->>'category')),
     ('position', (e.before_state->>'position') IS DISTINCT FROM (e.normalized_after_state->>'position')),
     ('status', (e.before_state->>'status') IS DISTINCT FROM (e.normalized_after_state->>'status'))
   ) changed(field, changed) WHERE changed ORDER BY field) END,
  COALESCE((SELECT CASE WHEN jsonb_typeof(candidate.evidence)='array' THEN jsonb_array_length(candidate.evidence) WHEN candidate.evidence IS NULL THEN 0 ELSE 1 END FROM screen_text_candidates candidate WHERE candidate.id=e.candidate_id),0), NULL, NULL
   FROM screen_event_states e JOIN screen_text_batches b ON b.id=e.batch_id
 UNION ALL
 SELECT 'subtitle_acceptance:' || e.id::text, 'subtitle_acceptance', e.project_id, e.episode_number,
  CASE WHEN (SELECT count(DISTINCT change.after_cue->>'track') FROM acceptance_changes change WHERE change.id=e.id AND change.before_cue IS DISTINCT FROM change.after_cue AND change.after_cue->>'track' IS NOT NULL)=1 THEN (SELECT min(change.after_cue->>'track') FROM acceptance_changes change WHERE change.id=e.id AND change.before_cue IS DISTINCT FROM change.after_cue AND change.after_cue->>'track' IS NOT NULL) ELSE NULL END,
  e.event_kind, e.term_version_id, NULL::uuid, e.created_at,
  md5(e.before_snapshot::text), md5(e.after_snapshot::text), CASE WHEN e.before_snapshot=e.after_snapshot THEN ARRAY[]::text[] ELSE ARRAY(SELECT field FROM (VALUES
    ('text', EXISTS (SELECT 1 FROM acceptance_changes change WHERE change.id=e.id AND change.before_cue IS DISTINCT FROM change.after_cue AND change.before_cue->>'text' IS DISTINCT FROM change.after_cue->>'text')),
    ('timing', EXISTS (SELECT 1 FROM acceptance_changes change WHERE change.id=e.id AND change.before_cue IS DISTINCT FROM change.after_cue AND (change.before_cue->>'startMs' IS DISTINCT FROM change.after_cue->>'startMs' OR change.before_cue->>'endMs' IS DISTINCT FROM change.after_cue->>'endMs'))),
    ('track', EXISTS (SELECT 1 FROM acceptance_changes change WHERE change.id=e.id AND change.before_cue IS DISTINCT FROM change.after_cue AND change.before_cue->>'track' IS DISTINCT FROM change.after_cue->>'track')),
    ('cue_set', EXISTS (SELECT 1 FROM acceptance_changes change WHERE change.id=e.id AND (change.before_cue IS NULL OR change.after_cue IS NULL)))
  ) changed(field, changed) WHERE changed ORDER BY field) END,
  (SELECT count(*)::int FROM acceptance_changes change WHERE change.id=e.id AND change.before_cue IS DISTINCT FROM change.after_cue),
  CASE WHEN e.reverses_event_id IS NULL THEN NULL ELSE 'subtitle_acceptance:' || e.reverses_event_id::text END,
  CASE WHEN e.restores_event_id IS NULL THEN NULL ELSE 'subtitle_acceptance:' || e.restores_event_id::text END
   FROM acceptance_snapshots e
)
`;

export class SystemControlStrategyService {
  constructor(private readonly database: DatabasePool) {}

  async createArtifact(input: { body: SystemControlStrategyCreateArtifactBody; idempotencyKey: string; requestId: string; principal: SystemControlPrincipal }) {
    const { body, idempotencyKey } = input;
    if (!uuid(body.artifactId) || !uuid(body.versionId) || !idempotencyKey.trim() || !payloadForKind(body.kind, body.payload)) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_INVALID_BODY', '策略载荷无效', 422);
    const strictRuntimePayload = Boolean((body.payload as any)?.payloadType === 'pre_review_local_rule_pack_v1');
    if (strictRuntimePayload && (!body.baseVersionId || !body.source)) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_INVALID_PROVENANCE', '严格运行版本必须明确基线/批准版本来源', 422);
    if (body.source === 'candidate' && (!body.evaluationRunId || !body.candidateDigest)) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_INVALID_PROVENANCE', '候选版本缺少评估来源', 422);
    const requestHash = digest({ path: body.artifactId, ...body });
    const client = await this.database.connect();
    try {
      await client.query('BEGIN'); await lock(client, `strategy-artifact:${body.artifactId}`); await lock(client, `strategy-command:${idempotencyKey}`);
      const stableRow = await client.query('SELECT request_hash,response_snapshot FROM system_control_commands WHERE stable_command_key=$1 FOR UPDATE', [body.artifactId]);
      if (stableRow.rowCount) { if (stableRow.rows[0].request_hash !== requestHash) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_STABLE_ID_REUSED', '策略身份已被其他请求使用', 409); await client.query('COMMIT'); return { artifact: stableRow.rows[0].response_snapshot, replay: true }; }
      const commandIdRow = await client.query('SELECT stable_command_key FROM system_control_commands WHERE id=$1 FOR UPDATE', [body.artifactId]);
      if (commandIdRow.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_STABLE_ID_REUSED', '策略身份已被其他命令使用', 409);
      const keyRow = await client.query('SELECT request_hash,response_snapshot FROM system_control_commands WHERE command_kind=$1 AND idempotency_key=$2 FOR UPDATE', ['strategy_artifact_create', idempotencyKey]);
      if (keyRow.rowCount) { if (keyRow.rows[0].request_hash !== requestHash) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_IDEMPOTENCY_KEY_REUSED', '幂等键已被其他请求使用', 409); await client.query('COMMIT'); return { artifact: keyRow.rows[0].response_snapshot, replay: true }; }
      const exists = await client.query('SELECT 1 FROM strategy_artifacts WHERE id=$1', [body.artifactId]); if (exists.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_STABLE_ID_REUSED', '策略身份已存在', 409);
      const versionExists = await client.query('SELECT 1 FROM strategy_artifact_versions WHERE id=$1', [body.versionId]); if (versionExists.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_VERSION_ID_REUSED', '策略版本身份已存在', 409);
      if (body.baseVersionId) {
        const base = await client.query("SELECT v.id FROM strategy_artifact_versions v JOIN strategy_artifacts a ON a.id=v.artifact_id WHERE v.id=$1 AND (a.origin='system_baseline' OR v.runtime_status='approved')", [body.baseVersionId]);
        if (!base.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_BASE_VERSION_NOT_FOUND', '基础版本不存在或尚未批准', 422);
      }
      const contentDigest = digest(body.payload);
      await client.query("INSERT INTO strategy_artifacts(id,artifact_kind,display_name,purpose,applicable_modules,status,created_by,origin,protected,runtime_module) VALUES($1,$2,$3,$4,$5,'draft',$6,'custom_draft',false,$7)", [body.artifactId, body.kind, body.displayName.trim(), body.purpose.trim(), body.applicableModules, input.principal.subject, strictRuntimePayload && body.applicableModules.includes('pre_review') ? 'pre_review' : null]);
      await client.query('INSERT INTO strategy_artifact_versions(id,artifact_id,version,schema_version,payload,content_digest,created_by,base_version_id,source,evaluation_run_id,candidate_digest,runtime_status) VALUES($1,$2,1,$3,$4,$5,$6,$7,$8,$9,$10,\'draft\')', [body.versionId, body.artifactId, body.schemaVersion, body.payload, contentDigest, input.principal.subject, body.baseVersionId ?? null, body.source ?? 'manual', body.evaluationRunId ?? null, body.candidateDigest ?? null]);
      const detail = toArtifact((await client.query(`SELECT a.*,v.id latest_version_id,v.payload latest_payload,(SELECT count(*) FROM strategy_artifact_versions x WHERE x.artifact_id=a.id) version_count FROM strategy_artifacts a LEFT JOIN strategy_artifact_versions v ON v.artifact_id=a.id AND v.version=1 WHERE a.id=$1`, [body.artifactId])).rows[0]);
      await client.query('INSERT INTO system_control_commands(id,command_kind,idempotency_key,stable_command_key,request_hash,resource_id,response_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7)', [body.artifactId, 'strategy_artifact_create', idempotencyKey, body.artifactId, requestHash, body.artifactId, detail]);
      await this.audit(client, input, 'strategy_artifact_create', body.artifactId, idempotencyKey, { kind: body.kind, versionId: body.versionId, contentDigest });
      await client.query('COMMIT'); return { artifact: detail, replay: false };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async createVersion(input: { artifactId: string; body: SystemControlStrategyCreateVersionBody; idempotencyKey: string; requestId: string; principal: SystemControlPrincipal }) {
    const { artifactId, body, idempotencyKey } = input;
    if (!uuid(artifactId) || !uuid(body.versionId) || !payloadForKind('prompt_template', body.payload) && !payloadForKind('local_rule_pack', body.payload) && !payloadForKind('ai_filter_policy', body.payload) && !payloadForKind('hotword_projection', body.payload) && !payloadForKind('risk_lexicon', body.payload)) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_INVALID_BODY', '策略载荷无效', 422);
    const requestHash = digest({ path: artifactId, ...body }); const client = await this.database.connect();
    try {
      await client.query('BEGIN'); await lock(client, `strategy-artifact:${artifactId}`); await lock(client, `strategy-command:${idempotencyKey}`); await lock(client, `strategy-version:${body.versionId}`);
      const stableRow = await client.query('SELECT request_hash,response_snapshot FROM system_control_commands WHERE stable_command_key=$1 FOR UPDATE', [body.versionId]);
      if (stableRow.rowCount) { if (stableRow.rows[0].request_hash !== requestHash) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_STABLE_ID_REUSED', '策略版本身份已被其他请求使用', 409); await client.query('COMMIT'); return { version: stableRow.rows[0].response_snapshot, replay: true }; }
      const commandIdRow = await client.query('SELECT stable_command_key FROM system_control_commands WHERE id=$1 FOR UPDATE', [body.versionId]);
      if (commandIdRow.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_STABLE_ID_REUSED', '策略版本身份已被其他命令使用', 409);
      const keyRow = await client.query('SELECT request_hash,response_snapshot FROM system_control_commands WHERE command_kind=$1 AND idempotency_key=$2 FOR UPDATE', ['strategy_version_create', idempotencyKey]);
      if (keyRow.rowCount) { if (keyRow.rows[0].request_hash !== requestHash) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_IDEMPOTENCY_KEY_REUSED', '幂等键已被其他请求使用', 409); await client.query('COMMIT'); return { version: keyRow.rows[0].response_snapshot, replay: true }; }
      const artifact = await client.query('SELECT * FROM strategy_artifacts WHERE id=$1 FOR UPDATE', [artifactId]);
      if (!artifact.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_ARTIFACT_NOT_FOUND', '策略不存在', 404);
      if (!payloadForKind(artifact.rows[0].artifact_kind, body.payload)) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_INVALID_BODY', '策略版本载荷与策略类型不匹配', 422);
      const strictRuntimePayload = Boolean((body.payload as any)?.payloadType === 'pre_review_local_rule_pack_v1');
      if (strictRuntimePayload && (!body.baseVersionId || !body.source)) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_INVALID_PROVENANCE', '严格运行版本必须明确基线/批准版本来源', 422);
      if (body.baseVersionId) {
        const base = await client.query("SELECT v.id FROM strategy_artifact_versions v JOIN strategy_artifacts a ON a.id=v.artifact_id WHERE v.id=$1 AND v.artifact_id=$2 AND (a.origin='system_baseline' OR v.runtime_status='approved')", [body.baseVersionId, artifactId]);
        if (!base.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_BASE_VERSION_NOT_FOUND', '基础版本不存在或不属于该策略', 422);
      }
      const versionExists = await client.query('SELECT 1 FROM strategy_artifact_versions WHERE id=$1', [body.versionId]); if (versionExists.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_VERSION_ID_REUSED', '策略版本身份已存在', 409);
      const next = Number((await client.query('SELECT COALESCE(MAX(version),0)+1 n FROM strategy_artifact_versions WHERE artifact_id=$1', [artifactId])).rows[0].n);
      const contentDigest = digest(body.payload);
      if (body.source === 'candidate' && (!body.evaluationRunId || !body.candidateDigest)) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_INVALID_PROVENANCE', '候选版本缺少评估来源', 422);
      await client.query('INSERT INTO strategy_artifact_versions(id,artifact_id,version,schema_version,payload,content_digest,created_by,base_version_id,source,evaluation_run_id,candidate_digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [body.versionId, artifactId, next, body.schemaVersion, body.payload, contentDigest, input.principal.subject, body.baseVersionId ?? null, body.source ?? 'manual', body.evaluationRunId ?? null, body.candidateDigest ?? null]);
      const version = toVersion((await client.query('SELECT v.*,a.artifact_kind FROM strategy_artifact_versions v JOIN strategy_artifacts a ON a.id=v.artifact_id WHERE v.id=$1', [body.versionId])).rows[0]);
      await client.query('UPDATE strategy_artifacts SET updated_at=CURRENT_TIMESTAMP WHERE id=$1', [artifactId]);
      await client.query('INSERT INTO system_control_commands(id,command_kind,idempotency_key,stable_command_key,request_hash,resource_id,response_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7)', [body.versionId, 'strategy_version_create', idempotencyKey, body.versionId, requestHash, body.versionId, version]);
      await this.audit(client, input, 'strategy_version_create', artifactId, idempotencyKey, { versionId: body.versionId, contentDigest });
      await client.query('COMMIT'); return { version, replay: false };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  private async audit(client: PoolClient, input: { requestId: string; principal: SystemControlPrincipal }, action: string, resourceId: string, key: string, snapshot: unknown) {
    await client.query('INSERT INTO system_control_audit_events(actor_subject,actor_audience,action,resource_type,resource_id,idempotency_key,request_id,result,after_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [input.principal.subject, Array.isArray(input.principal.audience) ? input.principal.audience.join(',') : input.principal.audience, action, 'strategy_artifact', resourceId, key, input.requestId, 'succeeded', snapshot]);
  }

  async listArtifacts(query: SystemControlStrategyArtifactListQuery): Promise<SystemControlStrategyArtifactList> {
    const { limit, offset } = parsePage(query); const values: unknown[] = []; const where: string[] = ['1=1'];
    if (query.kind) { values.push(query.kind); where.push(`a.artifact_kind=$${values.length}`); } if (query.status) { values.push(query.status); where.push(`a.status=$${values.length}`); } if (query.applicableModule) { values.push(query.applicableModule); where.push(`$${values.length} = ANY(a.applicable_modules)`); } if (query.search?.trim()) { values.push(`%${query.search.trim()}%`); where.push(`a.display_name ILIKE $${values.length}`); }
    const order = query.sort === 'kind_asc' ? 'a.artifact_kind ASC,a.id ASC' : query.sort === 'name_asc' ? 'a.display_name ASC,a.id ASC' : query.sort === 'updated_asc' ? 'a.updated_at ASC,a.id ASC' : 'a.updated_at DESC,a.id DESC';
    values.push(limit, offset); const page = await this.database.query(`SELECT a.*,v.id latest_version_id,v.payload latest_payload,(SELECT count(*) FROM strategy_artifact_versions x WHERE x.artifact_id=a.id) version_count, count(*) OVER() total FROM strategy_artifacts a LEFT JOIN strategy_artifact_versions v ON v.artifact_id=a.id AND v.version=(SELECT max(version) FROM strategy_artifact_versions z WHERE z.artifact_id=a.id) WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    const count = page.rows[0] ? Number(page.rows[0].total) : Number((await this.database.query(`SELECT count(*) total FROM strategy_artifacts a WHERE ${where.join(' AND ')}`, values.slice(0, -2))).rows[0].total);
    return { items: page.rows.map(toArtifact), total: count, limit, offset };
  }
  async getArtifact(id: string): Promise<SystemControlStrategyArtifact> {
    const result = await this.database.query(`SELECT a.*,v.id latest_version_id,v.payload latest_payload,(SELECT count(*) FROM strategy_artifact_versions x WHERE x.artifact_id=a.id) version_count FROM strategy_artifacts a LEFT JOIN strategy_artifact_versions v ON v.artifact_id=a.id AND v.version=(SELECT max(version) FROM strategy_artifact_versions z WHERE z.artifact_id=a.id) WHERE a.id=$1`, [id]);
    if (!result.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_ARTIFACT_NOT_FOUND', '策略不存在', 404);
    return toArtifact(result.rows[0]);
  }
  async listVersions(artifactId: string, query: SystemControlStrategyVersionListQuery): Promise<SystemControlStrategyVersionList> {
    const { limit, offset } = parsePage(query); const rows = await this.database.query('SELECT v.*,a.artifact_kind,count(*) OVER() total FROM strategy_artifact_versions v JOIN strategy_artifacts a ON a.id=v.artifact_id WHERE v.artifact_id=$1 ORDER BY v.version DESC,v.id DESC LIMIT $2 OFFSET $3', [artifactId, limit, offset]);
    const total = rows.rows[0] ? Number(rows.rows[0].total) : Number((await this.database.query('SELECT count(*) total FROM strategy_artifact_versions WHERE artifact_id=$1', [artifactId])).rows[0].total);
    if (!total && !(await this.database.query('SELECT 1 FROM strategy_artifacts WHERE id=$1', [artifactId])).rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_ARTIFACT_NOT_FOUND', '策略不存在', 404);
    return { items: rows.rows.map(toVersionListItem), total, limit, offset };
  }
  async getVersion(artifactId: string, versionId: string): Promise<SystemControlStrategyVersion> { const result = await this.database.query('SELECT v.*,a.artifact_kind FROM strategy_artifact_versions v JOIN strategy_artifacts a ON a.id=v.artifact_id WHERE v.artifact_id=$1 AND v.id=$2', [artifactId, versionId]); if (!result.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_VERSION_NOT_FOUND', '策略版本不存在', 404); return toVersion(result.rows[0]); }

  async listEvents(query: SystemControlStrategyEventListQuery): Promise<SystemControlStrategyEventList> {
    const { limit, offset } = parsePage(query); const values: unknown[] = []; const where: string[] = ['1=1'];
    if (query.domain) { values.push(query.domain); where.push(`domain=$${values.length}`); } if (query.projectId) { values.push(query.projectId); where.push(`project_id=$${values.length}`); } if (query.action) { values.push(query.action); where.push(`action=$${values.length}`); } if (query.from) { values.push(query.from); where.push(`created_at >= $${values.length}`); } if (query.to) { values.push(query.to); where.push(`created_at <= $${values.length}`); } if (query.search?.trim()) { values.push(`%${query.search.trim()}%`); where.push(`event_ref_id ILIKE $${values.length}`); }
    const order = query.sort === 'created_asc' ? 'created_at ASC,event_ref_id ASC' : query.sort === 'domain_asc' ? 'domain ASC,created_at DESC,event_ref_id DESC' : query.sort === 'action_asc' ? 'action ASC,created_at DESC,event_ref_id DESC' : 'created_at DESC,event_ref_id DESC';
    values.push(limit, offset); const sql = `${EVENTS_CTE} SELECT *,count(*) OVER() total FROM events WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT $${values.length - 1} OFFSET $${values.length}`;
    const result = await this.database.query(sql, values); const total = result.rows[0] ? Number(result.rows[0].total) : Number((await this.database.query(`${EVENTS_CTE} SELECT count(*) total FROM events WHERE ${where.join(' AND ')}`, values.slice(0, -2))).rows[0].total);
    return { items: result.rows.map((row) => this.toEvent(row)), total, limit, offset };
  }
  async getEvent(eventRefId: string): Promise<SystemControlStrategyEvent> { const list = await this.listEvents({ search: eventRefId, limit: '100', offset: '0' } as any); const found = list.items.find((x) => x.eventRefId === eventRefId); if (!found) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_EVENT_NOT_FOUND', '策略事件不存在', 404); return found; }
  private toEvent(row: any): SystemControlStrategyEvent { return { eventRefId: row.event_ref_id, domain: row.domain, projectId: row.project_id, episodeNumber: row.episode_number, track: row.track, action: row.action, sourceVersionId: row.source_version_id, artifactVersionId: row.artifact_version_id, createdAt: new Date(row.created_at).toISOString(), beforeDigest: row.before_digest, afterDigest: row.after_digest, changedFields: row.changed_fields ?? [], evidenceCount: Number(row.evidence_count ?? 0), reversesEventRefId: row.reverses_event_ref_id, restoresEventRefId: row.restores_event_ref_id }; }
}
