import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type {
  SystemControlCreateEvaluationRunBody,
  SystemControlCreateOptimizationRunBody,
  SystemControlEvaluationRun,
  SystemControlEvaluationRunList,
  SystemControlEvaluationRunListQuery,
  SystemControlOptimizationRun,
  SystemControlOptimizationRunList,
  SystemControlOptimizationRunListQuery,
  SystemControlStrategyCandidate,
  SystemControlStrategyCandidateDecisionResult,
  SystemControlStrategyCandidateDecisionBody,
  SystemControlStrategyCandidateList,
  SystemControlStrategyCandidateListQuery,
} from '@qimao-terms-cloud/contracts';
import type { DatabasePool } from '../../database/pool.js';
import type { SystemControlPrincipal } from './system-control.auth.js';
import { SystemControlStrategyError, SystemControlStrategyService } from './system-control.strategy.service.js';

type CommandInput = { idempotencyKey: string; requestId: string; principal: SystemControlPrincipal };
type CandidateRow = Record<string, any>;

const stable = (value: unknown): unknown => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]))
    : value;
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const page = (query: { limit?: string; offset?: string }) => {
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0 || offset > 1_000_000) {
    throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_INVALID_PAGE', '分页参数无效', 400);
  }
  return { limit, offset };
};
const parseJson = <T>(value: unknown): T => typeof value === 'string' ? JSON.parse(value) as T : value as T;
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const cny = (value: unknown) => String(value ?? '0.000000');
const safeFailure = (error: unknown) => error instanceof SystemControlStrategyError ? error.message.slice(0, 240) : '零网络分析未完成';

const lock = async (client: PoolClient, key: string) => {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key]);
};

const toRun = (row: any): SystemControlOptimizationRun => ({
  runId: row.id, artifactId: row.artifact_id, baseVersionId: row.base_version_id, module: row.module,
  projectId: row.project_id, from: row.from_at, to: row.to_at, minEvidenceCount: row.min_evidence_count,
  maxEvents: row.max_events, budgetCny: cny(row.budget_cny), actualCostCny: row.actual_cost_cny == null ? null : cny(row.actual_cost_cny),
  analyzerKey: row.analyzer_key, status: row.status, inputDigest: row.input_digest,
  eventSnapshotDigest: row.event_snapshot_digest, eventCount: row.event_count, candidateCount: row.candidate_count,
  requestId: row.request_id, failureReason: row.failure_reason, createdAt: row.created_at,
  startedAt: row.started_at, completedAt: row.completed_at,
});

const toCandidate = (row: CandidateRow): SystemControlStrategyCandidate => ({
  candidateId: row.id, runId: row.run_id, artifactId: row.artifact_id, baseVersionId: row.base_version_id,
  sourceEventRefId: row.source_event_ref_id, kind: row.candidate_kind, status: row.status, revision: row.revision,
  module: row.module, title: row.title, rationale: row.rationale, proposal: parseJson(row.proposal),
  supportCount: row.support_count, opposeCount: row.oppose_count, unknownCount: row.unknown_count,
  evidenceDigest: row.evidence_digest, createdAt: row.created_at, updatedAt: row.updated_at,
});

const toEvaluation = (row: any): SystemControlEvaluationRun => ({
  evaluationRunId: row.id, status: row.status, candidateIds: row.candidate_ids,
  candidateDigest: row.candidate_digest, budgetCny: cny(row.budget_cny),
  actualCostCny: row.actual_cost_cny == null ? null : cny(row.actual_cost_cny), metrics: row.metrics == null ? null : parseJson(row.metrics),
  requestId: row.request_id, failureReason: row.failure_reason, createdAt: row.created_at,
  startedAt: row.started_at, completedAt: row.completed_at,
});

export class SystemControlStrategyOptimizationService {
  private readonly strategy: SystemControlStrategyService;

  constructor(private readonly database: DatabasePool) {
    this.strategy = new SystemControlStrategyService(database);
  }

  private async commandReplay(client: PoolClient, kind: string, key: string, requestHash: string, stableKey: string) {
    const byKey = await client.query<{ request_hash: string }>('SELECT request_hash FROM system_control_commands WHERE command_kind=$1 AND idempotency_key=$2 FOR UPDATE', [kind, key]);
    if (byKey.rowCount) {
      if (byKey.rows[0]!.request_hash !== requestHash) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_IDEMPOTENCY_CONFLICT', '相同幂等键对应的请求不同', 409);
      return true;
    }
    const byStable = await client.query<{ command_kind: string; idempotency_key: string; request_hash: string }>('SELECT command_kind,idempotency_key,request_hash FROM system_control_commands WHERE stable_command_key=$1 FOR UPDATE', [stableKey]);
    if (byStable.rowCount) {
      if (byStable.rows[0]!.command_kind !== kind || byStable.rows[0]!.idempotency_key !== key || byStable.rows[0]!.request_hash !== requestHash) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_STABLE_ID_REUSED', '稳定命令身份已被其他请求使用', 409);
      return true;
    }
    return false;
  }

  private async insertCommand(client: PoolClient, input: CommandInput, kind: string, key: string, stableKey: string, resourceId: string, requestHash: string, response: unknown) {
    await client.query('INSERT INTO system_control_commands(id,command_kind,idempotency_key,stable_command_key,request_hash,resource_id,response_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7)', [randomUUID(), kind, key, stableKey, requestHash, resourceId, response]);
  }

  async createOptimization(body: SystemControlCreateOptimizationRunBody, input: CommandInput): Promise<{ run: SystemControlOptimizationRun; replay: boolean }> {
    if (!uuid(body.runId) || !uuid(body.artifactId) || !uuid(body.baseVersionId)) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_INVALID_ID', '稳定身份无效', 400);
    const requestHash = digest(body);
    const client = await this.database.connect();
    try {
      await client.query('BEGIN'); await lock(client, `strategy-optimization-run:${body.runId}`); await lock(client, `strategy-command:${input.idempotencyKey}`);
      const replay = await this.commandReplay(client, 'strategy_optimization_run_create', input.idempotencyKey, requestHash, body.runId);
      if (replay) {
        const existing = await client.query('SELECT * FROM strategy_optimization_runs WHERE id=$1', [body.runId]);
        if (!existing.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_RUN_NOT_FOUND', '优化运行不存在', 404);
        await client.query('COMMIT'); return { run: toRun(existing.rows[0]), replay: true };
      }
      const version = await client.query('SELECT a.id artifact_id,a.applicable_modules,v.id version_id FROM strategy_artifacts a JOIN strategy_artifact_versions v ON v.artifact_id=a.id WHERE a.id=$1 AND v.id=$2', [body.artifactId, body.baseVersionId]);
      if (!version.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_VERSION_NOT_FOUND', '策略版本不存在', 404);
      if (!(version.rows[0].applicable_modules as string[]).includes(body.module)) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_MODULE_NOT_APPLICABLE', '策略版本未登记该模块', 422);
      if (body.from && body.to && new Date(body.from) >= new Date(body.to)) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_INVALID_RANGE', '时间范围无效', 400);
      await client.query('INSERT INTO strategy_optimization_runs(id,artifact_id,base_version_id,module,project_id,from_at,to_at,min_evidence_count,max_events,budget_cny,input_digest,request_id,created_by) VALUES($1,$2,$3,$4,$5,$6,COALESCE($7,CURRENT_TIMESTAMP),$8,$9,$10,$11,$12,$13)', [body.runId, body.artifactId, body.baseVersionId, body.module, body.projectId, body.from, body.to, body.minEvidenceCount, body.maxEvents, body.budgetCny, requestHash, input.requestId, input.principal.subject]);
      const row = await client.query('SELECT * FROM strategy_optimization_runs WHERE id=$1', [body.runId]);
      const run = toRun(row.rows[0]);
      await this.insertCommand(client, input, 'strategy_optimization_run_create', input.idempotencyKey, body.runId, body.runId, requestHash, run);
      await client.query('INSERT INTO system_control_audit_events(actor_subject,actor_audience,action,resource_type,resource_id,idempotency_key,request_id,result,after_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [input.principal.subject, Array.isArray(input.principal.audience) ? input.principal.audience.join(',') : input.principal.audience, 'strategy_optimization_run_create', 'strategy_optimization_run', body.runId, input.idempotencyKey, input.requestId, 'succeeded', { runId: body.runId, module: body.module }]);
      await client.query('COMMIT'); return { run, replay: false };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async getRun(runId: string): Promise<SystemControlOptimizationRun> {
    const result = await this.database.query('SELECT * FROM strategy_optimization_runs WHERE id=$1', [runId]);
    if (!result.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_RUN_NOT_FOUND', '优化运行不存在', 404);
    return toRun(result.rows[0]);
  }

  async listRuns(query: SystemControlOptimizationRunListQuery): Promise<SystemControlOptimizationRunList> {
    const { limit, offset } = page(query); const values: unknown[] = []; const where: string[] = ['1=1'];
    if (query.artifactId) { values.push(query.artifactId); where.push(`artifact_id=$${values.length}`); }
    if (query.module) { values.push(query.module); where.push(`module=$${values.length}`); }
    if (query.status) { values.push(query.status); where.push(`status=$${values.length}`); }
    values.push(limit, offset);
    const result = await this.database.query(`SELECT *,count(*) OVER() total FROM strategy_optimization_runs WHERE ${where.join(' AND ')} ORDER BY created_at DESC,id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    const total = result.rows[0] ? Number(result.rows[0].total) : Number((await this.database.query(`SELECT count(*) total FROM strategy_optimization_runs WHERE ${where.join(' AND ')}`, values.slice(0, -2))).rows[0].total);
    return { items: result.rows.map(toRun), total, limit, offset };
  }

  async listCandidates(query: SystemControlStrategyCandidateListQuery): Promise<SystemControlStrategyCandidateList> {
    const { limit, offset } = page(query); const values: unknown[] = []; const where: string[] = ['1=1'];
    if (query.runId) { values.push(query.runId); where.push(`run_id=$${values.length}`); }
    if (query.status) { values.push(query.status); where.push(`status=$${values.length}`); }
    values.push(limit, offset);
    const result = await this.database.query(`SELECT *,count(*) OVER() total FROM strategy_optimization_candidates WHERE ${where.join(' AND ')} ORDER BY created_at ASC,id ASC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    const total = result.rows[0] ? Number(result.rows[0].total) : Number((await this.database.query(`SELECT count(*) total FROM strategy_optimization_candidates WHERE ${where.join(' AND ')}`, values.slice(0, -2))).rows[0].total);
    return { items: result.rows.map(toCandidate), total, limit, offset };
  }

  async getCandidate(candidateId: string): Promise<SystemControlStrategyCandidate> {
    const result = await this.database.query('SELECT * FROM strategy_optimization_candidates WHERE id=$1', [candidateId]);
    if (!result.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_CANDIDATE_NOT_FOUND', '候选不存在', 404);
    return toCandidate(result.rows[0]);
  }

  async getDecision(decisionId: string): Promise<SystemControlStrategyCandidateDecisionResult> {
    const event = await this.database.query<{ id: string; candidate_id: string; action: SystemControlStrategyCandidateDecisionResult['action']; request_id: string; after_snapshot: unknown }>("SELECT id,candidate_id,action,request_id,after_snapshot FROM strategy_candidate_decision_events WHERE id=$1", [decisionId]);
    if (!event.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_DECISION_NOT_FOUND', '候选决定不存在', 404);
    return { decisionId: event.rows[0]!.id, candidateId: event.rows[0]!.candidate_id, action: event.rows[0]!.action, requestId: event.rows[0]!.request_id, afterSnapshot: parseJson<SystemControlStrategyCandidate>(event.rows[0]!.after_snapshot) };
  }

  async decide(candidateId: string, body: SystemControlStrategyCandidateDecisionBody, input: CommandInput): Promise<{ candidate: SystemControlStrategyCandidate; replay: boolean }> {
    const requestHash = digest({ candidateId, body }); const client = await this.database.connect();
    try {
      await client.query('BEGIN'); await lock(client, `strategy-candidate:${candidateId}`); await lock(client, `strategy-command:${input.idempotencyKey}`);
      const replay = await this.commandReplay(client, 'strategy_candidate_decision', input.idempotencyKey, requestHash, body.decisionId);
      if (replay) {
        const existing = await client.query('SELECT * FROM strategy_optimization_candidates WHERE id=$1', [candidateId]);
        if (!existing.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_CANDIDATE_NOT_FOUND', '候选不存在', 404);
        await client.query('COMMIT'); return { candidate: toCandidate(existing.rows[0]), replay: true };
      }
      const current = await client.query('SELECT * FROM strategy_optimization_candidates WHERE id=$1 FOR UPDATE', [candidateId]);
      if (!current.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_CANDIDATE_NOT_FOUND', '候选不存在', 404);
      const before = toCandidate(current.rows[0]);
      if (before.revision !== body.expectedRevision) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_CANDIDATE_REVISION_CONFLICT', '候选版本已变化', 409);
      if (body.action === 'edit' && (!body.title || !body.rationale || !body.proposal)) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_DECISION_PAYLOAD_REQUIRED', '编辑决定需要完整安全摘要', 400);
      const nextStatus = body.action === 'reject' ? 'rejected' : body.action === 'send_to_evaluation' ? 'evaluation_ready' : body.action === 'restore' ? 'proposed' : 'edited';
      const updated = await client.query('UPDATE strategy_optimization_candidates SET status=$2,title=COALESCE($3,title),rationale=COALESCE($4,rationale),proposal=COALESCE($5,proposal),revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *', [candidateId, nextStatus, body.title ?? null, body.rationale ?? null, body.proposal ?? null]);
      const after = toCandidate(updated.rows[0]);
      await client.query('INSERT INTO strategy_candidate_decision_events(id,candidate_id,action,before_snapshot,after_snapshot,request_id,actor_subject) VALUES($1,$2,$3,$4,$5,$6,$7)', [body.decisionId, candidateId, body.action, before, after, input.requestId, input.principal.subject]);
      await this.insertCommand(client, input, 'strategy_candidate_decision', input.idempotencyKey, body.decisionId, candidateId, requestHash, after);
      await client.query('INSERT INTO system_control_audit_events(actor_subject,actor_audience,action,resource_type,resource_id,idempotency_key,request_id,result,after_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [input.principal.subject, Array.isArray(input.principal.audience) ? input.principal.audience.join(',') : input.principal.audience, `strategy_candidate_${body.action}`, 'strategy_candidate', candidateId, input.idempotencyKey, input.requestId, 'succeeded', { candidateId, status: after.status, revision: after.revision }]);
      await client.query('COMMIT'); return { candidate: after, replay: false };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async createEvaluation(body: SystemControlCreateEvaluationRunBody, input: CommandInput): Promise<{ evaluation: SystemControlEvaluationRun; replay: boolean }> {
    const candidateDigest = digest([...body.candidateIds].sort()); const requestHash = digest({ ...body, candidateDigest }); const client = await this.database.connect();
    try {
      await client.query('BEGIN'); await lock(client, `strategy-evaluation:${body.evaluationRunId}`); await lock(client, `strategy-command:${input.idempotencyKey}`);
      const replay = await this.commandReplay(client, 'strategy_evaluation_run_create', input.idempotencyKey, requestHash, body.evaluationRunId);
      if (replay) {
        const existing = await client.query('SELECT * FROM strategy_evaluation_runs WHERE id=$1', [body.evaluationRunId]);
        if (!existing.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_EVALUATION_NOT_FOUND', '评测运行不存在', 404);
        await client.query('COMMIT'); return { evaluation: toEvaluation(existing.rows[0]), replay: true };
      }
      const candidates = await client.query('SELECT id,status FROM strategy_optimization_candidates WHERE id = ANY($1::uuid[])', [body.candidateIds]);
      if (candidates.rowCount !== body.candidateIds.length) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_CANDIDATE_NOT_FOUND', '评测候选不存在', 404);
      if (candidates.rows.some((row) => row.status === 'rejected')) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_CANDIDATE_REJECTED', '已拒绝候选不能评测', 422);
      await client.query('INSERT INTO strategy_evaluation_runs(id,candidate_ids,candidate_digest,budget_cny,request_id,created_by) VALUES($1,$2,$3,$4,$5,$6)', [body.evaluationRunId, body.candidateIds, candidateDigest, body.budgetCny, input.requestId, input.principal.subject]);
      const row = await client.query('SELECT * FROM strategy_evaluation_runs WHERE id=$1', [body.evaluationRunId]); const evaluation = toEvaluation(row.rows[0]);
      await this.insertCommand(client, input, 'strategy_evaluation_run_create', input.idempotencyKey, body.evaluationRunId, body.evaluationRunId, requestHash, evaluation);
      await client.query('INSERT INTO system_control_audit_events(actor_subject,actor_audience,action,resource_type,resource_id,idempotency_key,request_id,result,after_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)', [input.principal.subject, Array.isArray(input.principal.audience) ? input.principal.audience.join(',') : input.principal.audience, 'strategy_evaluation_run_create', 'strategy_evaluation_run', body.evaluationRunId, input.idempotencyKey, input.requestId, 'succeeded', { evaluationRunId: body.evaluationRunId, candidateCount: body.candidateIds.length }]);
      await client.query('COMMIT'); return { evaluation, replay: false };
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async getEvaluation(evaluationRunId: string): Promise<SystemControlEvaluationRun> {
    const result = await this.database.query('SELECT * FROM strategy_evaluation_runs WHERE id=$1', [evaluationRunId]);
    if (!result.rowCount) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_EVALUATION_NOT_FOUND', '评测运行不存在', 404);
    return toEvaluation(result.rows[0]);
  }

  async listEvaluations(query: SystemControlEvaluationRunListQuery): Promise<SystemControlEvaluationRunList> {
    const { limit, offset } = page(query); const values: unknown[] = []; const where: string[] = ['1=1'];
    if (query.status) { values.push(query.status); where.push(`status=$${values.length}`); }
    values.push(limit, offset); const result = await this.database.query(`SELECT *,count(*) OVER() total FROM strategy_evaluation_runs WHERE ${where.join(' AND ')} ORDER BY created_at DESC,id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    const total = result.rows[0] ? Number(result.rows[0].total) : Number((await this.database.query(`SELECT count(*) total FROM strategy_evaluation_runs WHERE ${where.join(' AND ')}`, values.slice(0, -2))).rows[0].total);
    return { items: result.rows.map(toEvaluation), total, limit, offset };
  }

  async sweepExpired(limit = 20): Promise<number> {
    const result = await this.database.query(`WITH expired AS (SELECT id FROM strategy_optimization_runs WHERE status='running' AND lease_expires_at < CURRENT_TIMESTAMP ORDER BY lease_expires_at ASC,id ASC LIMIT $1) UPDATE strategy_optimization_runs r SET status='unknown',failure_reason='工作租约已过期',completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE r.id IN (SELECT id FROM expired) RETURNING r.id`, [limit]);
    const evaluation = await this.database.query(`WITH expired AS (SELECT id FROM strategy_evaluation_runs WHERE status='running' AND lease_expires_at < CURRENT_TIMESTAMP ORDER BY lease_expires_at ASC,id ASC LIMIT $1) UPDATE strategy_evaluation_runs r SET status='unknown',failure_reason='工作租约已过期',completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE r.id IN (SELECT id FROM expired) RETURNING r.id`, [limit]);
    return (result.rowCount ?? 0) + (evaluation.rowCount ?? 0);
  }

  async claimOptimization(workerId: string): Promise<any | null> {
    const client = await this.database.connect();
    try {
      await client.query('BEGIN'); const result = await client.query(`SELECT * FROM strategy_optimization_runs WHERE status='queued' ORDER BY created_at ASC,id ASC FOR UPDATE SKIP LOCKED LIMIT 1`);
      if (!result.rowCount) { await client.query('COMMIT'); return null; }
      const updated = await client.query(`UPDATE strategy_optimization_runs SET status='running',lease_owner=$2,lease_expires_at=CURRENT_TIMESTAMP + INTERVAL '60 seconds',started_at=COALESCE(started_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`, [result.rows[0].id, workerId]);
      await client.query('COMMIT'); return updated.rows[0];
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async claimEvaluation(workerId: string): Promise<any | null> {
    const client = await this.database.connect();
    try {
      await client.query('BEGIN'); const result = await client.query(`SELECT * FROM strategy_evaluation_runs WHERE status='queued' ORDER BY created_at ASC,id ASC FOR UPDATE SKIP LOCKED LIMIT 1`);
      if (!result.rowCount) { await client.query('COMMIT'); return null; }
      const updated = await client.query(`UPDATE strategy_evaluation_runs SET status='running',lease_owner=$2,lease_expires_at=CURRENT_TIMESTAMP + INTERVAL '60 seconds',started_at=COALESCE(started_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`, [result.rows[0].id, workerId]);
      await client.query('COMMIT'); return updated.rows[0];
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }

  async processOptimization(workerId: string): Promise<{ processed: false } | { processed: true; runId: string; status: string }> {
    await this.sweepExpired(20); const run = await this.claimOptimization(workerId); if (!run) return { processed: false };
    try {
      const events = await this.strategy.listEvents({ domain: run.module, projectId: run.project_id ?? undefined, from: run.from_at?.toISOString(), to: run.to_at.toISOString(), limit: String(run.max_events), offset: '0' });
      const usable = events.items.filter((event) => !event.reversesEventRefId && !event.restoresEventRefId && event.evidenceCount >= run.min_evidence_count && !['undo', 'redo', 'restore', 'revert'].includes(event.action)).slice(0, run.max_events);
      const snapshotDigest = digest(usable.map((event) => ({ ref: event.eventRefId, before: event.beforeDigest, after: event.afterDigest, evidence: event.evidenceCount })));
      const client = await this.database.connect();
      try {
        await client.query('BEGIN');
        for (const event of usable) {
          const candidateKind = run.module === 'screen_text' ? 'prompt_review' : run.module === 'subtitle_acceptance' ? 'risk_review' : 'rule_review';
          const candidateId = randomUUID(); const evidenceDigest = digest({ runId: run.id, eventRefId: event.eventRefId, before: event.beforeDigest, after: event.afterDigest });
          const fields = event.changedFields.length ? event.changedFields.join(',') : 'review';
          await client.query('INSERT INTO strategy_optimization_candidates(id,run_id,artifact_id,base_version_id,source_event_ref_id,candidate_kind,module,title,rationale,proposal,support_count,oppose_count,unknown_count,evidence_digest) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)', [candidateId, run.id, run.artifact_id, run.base_version_id, event.eventRefId, candidateKind, run.module, `${run.module} 变更复核`, `基于 ${event.evidenceCount} 条脱敏证据复核人工变化`, { operation: 'review_when_changed', target: event.changedFields[0] ?? 'review', value: fields, notes: `来源事件 ${event.action} 的安全字段摘要` }, event.evidenceCount, 0, 0, evidenceDigest]);
        }
        const updated = await client.query(`UPDATE strategy_optimization_runs SET status='succeeded',event_snapshot_digest=$2,event_count=$3,candidate_count=$4,actual_cost_cny='0.000000',completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,lease_owner=NULL,lease_expires_at=NULL WHERE id=$1 AND status='running' AND lease_owner=$5 RETURNING status`, [run.id, snapshotDigest, events.items.length, usable.length, workerId]);
        if (!updated.rowCount) throw new Error('优化运行租约已失效');
        await client.query('COMMIT'); return { processed: true, runId: run.id, status: 'succeeded' };
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    } catch (error) {
      await this.database.query(`UPDATE strategy_optimization_runs SET status='failed',failure_reason=$2,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,lease_owner=NULL,lease_expires_at=NULL WHERE id=$1 AND status='running' AND lease_owner=$3`, [run.id, safeFailure(error), workerId]);
      return { processed: true, runId: run.id, status: 'failed' };
    }
  }

  async processEvaluation(workerId: string): Promise<{ processed: false } | { processed: true; evaluationRunId: string; status: string }> {
    await this.sweepExpired(20); const run = await this.claimEvaluation(workerId); if (!run) return { processed: false };
    try {
      const candidates = await this.database.query('SELECT support_count,oppose_count,unknown_count FROM strategy_optimization_candidates WHERE id = ANY($1::uuid[])', [run.candidate_ids]);
      if (candidates.rowCount !== run.candidate_ids.length) throw new SystemControlStrategyError('SYSTEM_CONTROL_STRATEGY_CANDIDATE_NOT_FOUND', '评测候选不存在', 404);
      const baseline = candidates.rows.reduce((sum, row) => sum + row.support_count + row.oppose_count + row.unknown_count, 0);
      const metrics = { baselineManualReviewCount: baseline, candidateManualReviewCount: candidates.rowCount ?? 0, estimatedFalsePositiveCount: candidates.rows.reduce((sum, row) => sum + row.oppose_count, 0), estimatedFalseNegativeCount: candidates.rows.reduce((sum, row) => sum + row.unknown_count, 0), baselineHandlingSeconds: baseline * 30, candidateHandlingSeconds: (candidates.rowCount ?? 0) * 10, metricKind: 'deterministic_proxy_v1' as const };
      await this.database.query(`UPDATE strategy_evaluation_runs SET status='succeeded',metrics=$2,actual_cost_cny='0.000000',completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,lease_owner=NULL,lease_expires_at=NULL WHERE id=$1 AND status='running' AND lease_owner=$3`, [run.id, metrics, workerId]);
      return { processed: true, evaluationRunId: run.id, status: 'succeeded' };
    } catch (error) {
      await this.database.query(`UPDATE strategy_evaluation_runs SET status='failed',failure_reason=$2,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,lease_owner=NULL,lease_expires_at=NULL WHERE id=$1 AND status='running' AND lease_owner=$3`, [run.id, safeFailure(error), workerId]);
      return { processed: true, evaluationRunId: run.id, status: 'failed' };
    }
  }
}
