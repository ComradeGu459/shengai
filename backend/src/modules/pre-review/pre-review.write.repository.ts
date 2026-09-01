import { randomBytes } from 'node:crypto';

import type {
  ApplyPreEditPolicyBody,
  CreatePreEditDecisionBody,
  CreatePreEditReleaseBody,
  PreEditCue,
  PreEditDecisionAction,
  PreEditFormatIssue,
  PreEditItem,
  UndoPreEditDecisionBody,
} from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import type { UploadStorage } from '../uploads/upload-storage.js';
import {
  effectiveSystemDecision,
  renderSrt,
  resolveDecision,
  scanFormatIssues,
  type PreReviewRulePack,
  sha256,
  type AlignmentCue,
  type ReleaseCue,
} from './pre-review.domain.js';
import {
  preReviewConflict,
  PreReviewDomainError,
  preReviewInvalid,
  preReviewNotFound,
} from './pre-review.errors.js';
import type { PreReviewSourceSnapshot } from './pre-review.source.js';

const commandHash = (value: unknown) => sha256(JSON.stringify(value));

interface CommandRow extends QueryResultRow {
  command_kind: string;
  request_hash: string;
  response_payload: Record<string, unknown>;
}

interface SessionLockRow extends QueryResultRow {
  id: string;
  project_id: string;
  source_digest: string;
  strategy_version_id: string | null;
  status: string;
  default_policy: 'company_primary' | 'asr_text_primary';
  revision: number;
}

interface WritableItemRow extends QueryResultRow {
  id: string;
  session_id: string;
  episode_id: string;
  episode_number: number;
  group_id: string;
  kind: PreEditItem['groupKind'];
  target_company_cue_id: string | null;
  policy_override: PreEditItem['policyOverride'];
  episode_policy_override: PreEditItem['policyOverride'];
  default_policy: PreEditItem['effectivePolicy'];
  system_action: PreEditDecisionAction;
  system_text: string;
  current_action: PreEditDecisionAction;
  current_text: string;
  decision_origin: 'system' | 'human';
  current_decision_event_id: string | null;
  format_override_reason: string | null;
  version: number;
  company_cues: PreEditCue[];
  asr_cues: PreEditCue[];
  asr_quality_status: 'pass' | 'warning' | null;
  video_duration_ms: string | null;
  term_evidence: PreEditItem['termEvidence'];
}

const requireCommand = async (
  client: PoolClient,
  input: { projectId: string; key: string; kind: string; hash: string },
) => {
  await client.query(
    'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
    [input.projectId, input.key],
  );
  const result = await client.query<CommandRow>(
    `SELECT command_kind, request_hash, response_payload
       FROM pre_edit_commands
      WHERE project_id = $1 AND idempotency_key = $2`,
    [input.projectId, input.key],
  );
  const command = result.rows[0];
  if (!command) return null;
  if (command.command_kind !== input.kind || command.request_hash !== input.hash) {
    throw preReviewConflict(
      'PRE_EDIT_IDEMPOTENCY_KEY_REUSED',
      '同一幂等键已用于另一项前置审改请求。',
      'retry_with_original_request',
    );
  }
  return command.response_payload;
};

const saveCommand = async (
  client: PoolClient,
  input: {
    projectId: string;
    key: string;
    kind: string;
    hash: string;
    resourceId?: string;
    payload: Record<string, unknown>;
  },
) => client.query(
  `INSERT INTO pre_edit_commands (
     project_id, idempotency_key, command_kind, request_hash, resource_id, response_payload
   ) VALUES ($1, $2, $3, $4, $5, $6)`,
  [input.projectId, input.key, input.kind, input.hash, input.resourceId ?? null, JSON.stringify(input.payload)],
);

const lockSession = async (client: PoolClient, projectId: string, sessionId: string) => {
  const result = await client.query<SessionLockRow>(
    `SELECT id, project_id, source_digest, strategy_version_id, status, default_policy, revision
       FROM pre_edit_sessions WHERE id = $1 AND project_id = $2 FOR UPDATE`,
    [sessionId, projectId],
  );
  if (!result.rows[0]) throw preReviewNotFound('PRE_EDIT_SESSION_NOT_FOUND', '前置审改会话不存在。');
  return result.rows[0];
};

const requireWritable = (session: SessionLockRow) => {
  if (!['ready', 'limited', 'completed'].includes(session.status)) {
    throw preReviewConflict(
      'PRE_EDIT_SESSION_NOT_WRITABLE',
      session.status === 'stale' ? '来源已经变化，旧会话只读。' : '会话尚未准备完成。',
    );
  }
};

const loadRulePack = async (client: PoolClient, session: SessionLockRow): Promise<PreReviewRulePack> => {
  if (!session.strategy_version_id) {
    throw preReviewConflict('PRE_EDIT_STRATEGY_NOT_ACTIVE', '前置审改会话没有绑定策略版本。', 'publish_strategy');
  }
  const result = await client.query<{ rule_pack: PreReviewRulePack }>(
    `SELECT v.payload AS rule_pack FROM strategy_artifact_versions v JOIN strategy_artifacts a ON a.id=v.artifact_id WHERE v.id = $1 AND a.runtime_module='pre_review' AND v.runtime_status IN ('active','retired','approved') FOR SHARE`,
    [session.strategy_version_id],
  );
  if (!result.rows[0]) throw preReviewConflict('PRE_EDIT_STRATEGY_NOT_ACTIVE', '绑定的策略版本不可读取。', 'publish_strategy');
  return result.rows[0].rule_pack;
};

const loadItems = async (client: PoolClient, predicate: string, values: unknown[]) =>
  client.query<WritableItemRow>(
    `SELECT item.*, episode.episode_number, episode.policy_override AS episode_policy_override,
            episode.asr_quality_status, episode.video_duration_ms::text,
            session.default_policy, group_row.kind,
            coalesce((
              SELECT jsonb_agg(jsonb_build_object(
                'cueId', cue.id, 'cueIndex', cue.cue_index, 'startMs', cue.start_ms,
                'endMs', cue.end_ms, 'text', cue.text, 'confidence', NULL
              ) ORDER BY cue.cue_index, cue.id)
              FROM term_cues cue WHERE cue.id = ANY(group_row.company_cue_ids)
            ), '[]') AS company_cues,
            coalesce((
              SELECT jsonb_agg(jsonb_build_object(
                'cueId', cue.id, 'cueIndex', cue.cue_index, 'startMs', cue.start_ms,
                'endMs', cue.end_ms, 'text', cue.text, 'confidence', cue.confidence
              ) ORDER BY cue.cue_index, cue.id)
              FROM asr_cues cue WHERE cue.id = ANY(group_row.asr_cue_ids)
            ), '[]') AS asr_cues
       FROM pre_edit_items item
       JOIN pre_edit_episodes episode ON episode.id = item.episode_id
       JOIN pre_edit_sessions session ON session.id = item.session_id
       JOIN pre_edit_alignment_groups group_row ON group_row.id = item.group_id
      WHERE ${predicate}
      ORDER BY episode.episode_number, item.id
      FOR UPDATE OF item`,
    values,
  );

const asAlignment = (cue: PreEditCue | undefined): AlignmentCue | null => cue ? { ...cue } : null;

const evaluatePolicyItem = (item: WritableItemRow, policy: PreEditItem['effectivePolicy'], rulePack: PreReviewRulePack) => {
  const companyCue = item.company_cues.find((cue) => cue.cueId === item.target_company_cue_id)
    ?? item.company_cues[0];
  const system = effectiveSystemDecision({
    kind: item.kind, policy, companyCue: asAlignment(companyCue), asrCues: item.asr_cues,
  });
  const timing = companyCue ?? item.asr_cues[0];
  const issues = ['remove_company', 'ignore_asr'].includes(system.action) ? [] : scanFormatIssues(
    system.text, rulePack,
    timing ? {
      startMs: timing.startMs,
      endMs: companyCue?.endMs ?? item.asr_cues.at(-1)!.endMs,
      videoDurationMs: item.video_duration_ms === null ? null : Number(item.video_duration_ms),
    } : undefined,
  );
  const safe = item.kind === 'one_to_one'
    && item.asr_quality_status === 'pass'
    && !issues.some((issue) => issue.blocking)
    && !item.term_evidence.some((evidence) => evidence.conflict);
  return { system, issues, safe };
};

const invalidateEpisode = async (client: PoolClient, episodeId: string) => client.query(
  `UPDATE pre_edit_episodes
      SET status = CASE WHEN asr_result_id IS NULL THEN 'limited'::pre_edit_episode_status
                        ELSE 'ready'::pre_edit_episode_status END,
          completion_signature = NULL, completed_at = NULL,
          revision = revision + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1`,
  [episodeId],
);

const refreshSessionStatus = async (client: PoolClient, sessionId: string) => client.query(
  `UPDATE pre_edit_sessions session
      SET status = CASE
        WHEN EXISTS (SELECT 1 FROM pre_edit_episodes WHERE session_id = session.id AND status <> 'completed')
          THEN CASE WHEN EXISTS (
            SELECT 1 FROM pre_edit_episodes WHERE session_id = session.id AND limited_reason IS NOT NULL
          ) THEN 'limited'::pre_edit_session_status ELSE 'ready'::pre_edit_session_status END
        ELSE 'completed'::pre_edit_session_status
      END,
      revision = revision + 1, updated_at = CURRENT_TIMESTAMP
    WHERE session.id = $1`,
  [sessionId],
);

export class PreReviewWriteRepository {
  constructor(
    private readonly pool: DatabasePool,
    private readonly storage: UploadStorage,
  ) {}

  async createSession(input: {
    snapshot: PreReviewSourceSnapshot;
    expectedProjectVersion: number;
    key: string;
  }) {
    const kind = 'create_session';
    const hash = commandHash({
      termVersionId: input.snapshot.termVersionId,
      expectedProjectVersion: input.expectedProjectVersion,
      sourceDigest: input.snapshot.sourceDigest,
    });
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const replay = await requireCommand(client, {
        projectId: input.snapshot.projectId, key: input.key, kind, hash,
      });
      if (replay) {
        await client.query('COMMIT');
        return { sessionId: String(replay.sessionId), replay: true };
      }
      const project = await client.query<{ version: number; lifecycle_status: string }>(
        'SELECT version, lifecycle_status FROM projects WHERE id = $1 FOR UPDATE',
        [input.snapshot.projectId],
      );
      if (!project.rows[0]) throw preReviewNotFound('PRE_EDIT_PROJECT_NOT_FOUND', '项目不存在或已被清理。');
      if (project.rows[0].lifecycle_status !== 'active') {
        throw preReviewConflict('PRE_EDIT_PROJECT_NOT_ACTIVE', '项目不在可审改状态。', 'return_to_projects');
      }
      if (project.rows[0].version !== input.expectedProjectVersion
        || project.rows[0].version !== input.snapshot.projectVersion) {
        throw preReviewConflict('PRE_EDIT_SOURCE_CHANGED', '项目版本已经变化，请刷新后重新创建会话。');
      }
      const strategy = await client.query<{ id: string; content_digest: string }>(
        `SELECT version.id, version.content_digest
           FROM strategy_runtime_active_pointers pointer
           JOIN strategy_artifact_versions version ON version.id = pointer.strategy_version_id
           JOIN strategy_artifacts artifact ON artifact.id = version.artifact_id
          WHERE pointer.module = 'pre_review' AND artifact.runtime_module = 'pre_review' AND version.runtime_status = 'active'
          FOR UPDATE`,
      );
      if (!strategy.rows[0]) {
        throw preReviewConflict('PRE_EDIT_STRATEGY_NOT_ACTIVE', '前置审改尚未发布可用规则，请先完成策略发布。', 'publish_strategy');
      }
      const active = await client.query(
        `SELECT 1 FROM pre_edit_sessions
          WHERE project_id = $1 AND status IN ('preparing', 'ready', 'limited')`,
        [input.snapshot.projectId],
      );
      if (active.rows[0]) {
        throw preReviewConflict('PRE_EDIT_SESSION_ACTIVE', '项目已经存在可写的前置审改会话。');
      }
      const session = await client.query<{ id: string }>(
        `INSERT INTO pre_edit_sessions (
           project_id, project_version, source_srt_set_digest, term_version_id,
           manifest_id, manifest_version, source_digest, source_snapshot,
           strategy_version_id, strategy_content_digest, algorithm_version, format_policy_version,
           screen_text_release_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
        [
          input.snapshot.projectId, input.snapshot.projectVersion, input.snapshot.sourceSrtSetDigest,
          input.snapshot.termVersionId, input.snapshot.manifestId, input.snapshot.manifestVersion,
          input.snapshot.sourceDigest, JSON.stringify(input.snapshot), strategy.rows[0].id,
          strategy.rows[0].content_digest, `strategy-runtime:${strategy.rows[0].id}`,
          strategy.rows[0].content_digest, input.snapshot.screenTextRelease.id,
        ],
      );
      const sessionId = session.rows[0]!.id;
      for (const episode of input.snapshot.episodes) {
        await client.query(
          `INSERT INTO pre_edit_episodes (
             session_id, episode_number, company_asset_id,
             asr_result_id, asr_result_digest, asr_asset_id, asr_term_version_id,
             asr_provider, asr_adapter, asr_model, asr_language, asr_config_digest,
             asr_hotword_digest, asr_quality_status, video_asset_id, video_checksum_value
             , video_duration_ms
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
           )`,
          [
            sessionId, episode.episodeNumber, episode.companyAssetId,
            episode.asr?.resultId ?? null, episode.asr?.resultDigest ?? null,
            episode.asr?.assetId ?? null, episode.asr?.termVersionId ?? null,
            episode.asr?.provider ?? null, episode.asr?.adapter ?? null,
            episode.asr?.model ?? null, episode.asr?.language ?? null,
            episode.asr?.configDigest ?? null, episode.asr?.hotwordDigest ?? null,
            episode.asr?.qualityStatus ?? null, episode.videoAssetId, episode.videoChecksumValue,
            episode.videoDurationMs,
          ],
        );
      }
      await client.query('INSERT INTO pre_edit_prepare_jobs (session_id) VALUES ($1)', [sessionId]);
      await saveCommand(client, {
        projectId: input.snapshot.projectId,
        key: input.key,
        kind,
        hash,
        resourceId: sessionId,
        payload: { sessionId },
      });
      await client.query('COMMIT');
      return { sessionId, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async markStale(projectId: string, sessionId: string) {
    await this.pool.query(
      `UPDATE pre_edit_sessions
          SET status = 'stale', revision = revision + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND project_id = $2 AND status <> 'stale'`,
      [sessionId, projectId],
    );
  }

  async retryPreparation(input: {
    projectId: string; sessionId: string; expectedRevision: number; key: string;
  }) {
    const kind = 'retry_preparation';
    const hash = commandHash({ sessionId: input.sessionId, expectedRevision: input.expectedRevision });
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const replay = await requireCommand(client, {
        projectId: input.projectId, key: input.key, kind, hash,
      });
      if (replay) {
        await client.query('COMMIT');
        return { replay: true };
      }
      const session = await lockSession(client, input.projectId, input.sessionId);
      if (session.revision !== input.expectedRevision) {
        throw preReviewConflict('PRE_EDIT_SESSION_VERSION_CONFLICT', '会话版本已经变化。');
      }
      if (session.status !== 'failed') {
        throw preReviewConflict('PRE_EDIT_SESSION_NOT_WRITABLE', '只有准备失败的会话可以显式重试。');
      }
      await client.query(
        `UPDATE pre_edit_prepare_jobs
            SET status = 'queued', lease_owner = NULL, lease_expires_at = NULL,
                error_code = NULL, error_detail = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE session_id = $1`,
        [input.sessionId],
      );
      await client.query(
        `UPDATE pre_edit_sessions
            SET status = 'preparing', revision = revision + 1,
                error_code = NULL, error_detail = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [input.sessionId],
      );
      await saveCommand(client, {
        projectId: input.projectId, key: input.key, kind, hash,
        resourceId: input.sessionId, payload: { sessionId: input.sessionId },
      });
      await client.query('COMMIT');
      return { replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async previewPolicy(input: {
    projectId: string; sessionId: string; body: ApplyPreEditPolicyBody;
  }) {
    const normalizedEpisodes = [...(input.body.episodeNumbers ?? [])].sort((a, b) => a - b);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const session = await lockSession(client, input.projectId, input.sessionId);
      requireWritable(session);
      const rulePack = await loadRulePack(client, session);
      if (session.revision !== input.body.expectedSessionRevision) {
        throw preReviewConflict('PRE_EDIT_SESSION_VERSION_CONFLICT', '会话版本已经变化。');
      }
      if (input.body.scope === 'episodes' && !normalizedEpisodes.length) {
        throw preReviewInvalid('PRE_EDIT_POLICY_SCOPE_INVALID', '选中集策略必须包含集数。');
      }
      if (input.body.scope === 'item' && !input.body.itemId) {
        throw preReviewInvalid('PRE_EDIT_POLICY_SCOPE_INVALID', '单条策略必须指定条目。');
      }
      if (input.body.scope === 'series' && (normalizedEpisodes.length || input.body.itemId)) {
        throw preReviewInvalid('PRE_EDIT_POLICY_SCOPE_INVALID', '整剧策略不能同时指定集数或条目。');
      }
      let predicate = 'item.session_id = $1';
      const values: unknown[] = [input.sessionId];
      if (input.body.scope === 'episodes') {
        values.push(normalizedEpisodes);
        predicate += ` AND episode.episode_number = ANY($${values.length}::integer[])`;
      }
      if (input.body.scope === 'item') {
        values.push(input.body.itemId);
        predicate += ` AND item.id = $${values.length}`;
      }
      const items = await loadItems(client, predicate, values);
      if (!items.rows.length) {
        throw preReviewInvalid('PRE_EDIT_POLICY_SCOPE_INVALID', '策略范围没有可处理条目。');
      }
      let safeUpdateCount = 0;
      let protectedHumanDecisionCount = 0;
      let requiresHumanDecisionCount = 0;
      for (const item of items.rows) {
        if (item.decision_origin === 'human') protectedHumanDecisionCount += 1;
        else if (evaluatePolicyItem(item, input.body.policy, rulePack).safe) safeUpdateCount += 1;
        else requiresHumanDecisionCount += 1;
      }
      await client.query('COMMIT');
      return {
        sessionId: session.id,
        sessionRevision: session.revision,
        scope: input.body.scope,
        policy: input.body.policy,
        affectedItemCount: items.rows.length,
        safeUpdateCount,
        protectedHumanDecisionCount,
        requiresHumanDecisionCount,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async applyPolicy(input: {
    projectId: string; sessionId: string; body: ApplyPreEditPolicyBody; key: string;
  }) {
    const kind = 'apply_policy';
    const normalizedEpisodes = [...(input.body.episodeNumbers ?? [])].sort((a, b) => a - b);
    const hash = commandHash({ sessionId: input.sessionId, ...input.body, episodeNumbers: normalizedEpisodes });
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const replay = await requireCommand(client, { projectId: input.projectId, key: input.key, kind, hash });
      if (replay) {
        await client.query('COMMIT');
        return {
          affectedItemCount: Number(replay.affectedItemCount),
          systemDecisionCount: Number(replay.systemDecisionCount),
          protectedHumanDecisionCount: Number(replay.protectedHumanDecisionCount),
          safeUpdateCount: Number(replay.safeUpdateCount),
          requiresHumanDecisionCount: Number(replay.requiresHumanDecisionCount),
          replay: true,
        };
      }
      const session = await lockSession(client, input.projectId, input.sessionId);
      requireWritable(session);
      const rulePack = await loadRulePack(client, session);
      if (session.revision !== input.body.expectedSessionRevision) {
        throw preReviewConflict('PRE_EDIT_SESSION_VERSION_CONFLICT', '会话版本已经变化。');
      }
      if (input.body.scope === 'episodes' && !normalizedEpisodes.length) {
        throw preReviewInvalid('PRE_EDIT_POLICY_SCOPE_INVALID', '选中集策略必须包含集数。');
      }
      if (input.body.scope === 'item' && !input.body.itemId) {
        throw preReviewInvalid('PRE_EDIT_POLICY_SCOPE_INVALID', '单条策略必须指定条目。');
      }
      if (input.body.scope === 'series' && (normalizedEpisodes.length || input.body.itemId)) {
        throw preReviewInvalid('PRE_EDIT_POLICY_SCOPE_INVALID', '整剧策略不能同时指定集数或条目。');
      }
      let predicate = 'item.session_id = $1';
      const values: unknown[] = [input.sessionId];
      if (input.body.scope === 'episodes') {
        values.push(normalizedEpisodes);
        predicate += ` AND episode.episode_number = ANY($${values.length}::integer[])`;
      }
      if (input.body.scope === 'item') {
        values.push(input.body.itemId);
        predicate += ` AND item.id = $${values.length}`;
      }
      const items = await loadItems(client, predicate, values);
      if (!items.rows.length) {
        throw preReviewInvalid('PRE_EDIT_POLICY_SCOPE_INVALID', '策略范围没有可处理条目。');
      }
      if (input.body.scope === 'series') {
        await client.query('UPDATE pre_edit_sessions SET default_policy = $2 WHERE id = $1', [input.sessionId, input.body.policy]);
      } else if (input.body.scope === 'episodes') {
        await client.query(
          'UPDATE pre_edit_episodes SET policy_override = $2 WHERE session_id = $1 AND episode_number = ANY($3::integer[])',
          [input.sessionId, input.body.policy, normalizedEpisodes],
        );
      } else {
        await client.query('UPDATE pre_edit_items SET policy_override = $2 WHERE id = $1', [input.body.itemId, input.body.policy]);
      }
      let systemDecisionCount = 0;
      let protectedHumanDecisionCount = 0;
      let safeUpdateCount = 0;
      let requiresHumanDecisionCount = 0;
      for (const item of items.rows) {
        const policy = input.body.scope === 'item' || input.body.scope === 'episodes' || input.body.scope === 'series'
          ? input.body.policy
          : item.policy_override ?? item.episode_policy_override ?? item.default_policy;
        const { system, issues, safe } = evaluatePolicyItem(item, policy, rulePack);
        await client.query(
          `UPDATE pre_edit_items SET system_action = $2, system_text = $3 WHERE id = $1`,
          [item.id, system.action, system.text],
        );
        if (item.decision_origin === 'human') {
          protectedHumanDecisionCount += 1;
          continue;
        }
        if (safe) safeUpdateCount += 1;
        else requiresHumanDecisionCount += 1;
        const event = await client.query<{ id: string }>(
          `INSERT INTO pre_edit_decision_events (
             session_id, episode_id, item_id, event_kind, action, origin, before_state, after_state
           ) VALUES ($1, $2, $3, 'policy', $4, 'system', $5, $6) RETURNING id`,
          [
            input.sessionId, item.episode_id, item.id, system.action,
            JSON.stringify({ action: item.current_action, text: item.current_text }),
            JSON.stringify({ action: system.action, text: system.text, formatOverrideReason: null }),
          ],
        );
        await client.query(
          `UPDATE pre_edit_items
              SET current_action = $2, current_text = $3, current_decision_event_id = $4,
                  format_issues = $5, format_override_reason = NULL,
                  requires_review = $6,
                  version = version + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [item.id, system.action, system.text, event.rows[0]!.id, JSON.stringify(issues), !safe],
        );
        systemDecisionCount += 1;
      }
      for (const episodeId of new Set(items.rows.map((item) => item.episode_id))) {
        await invalidateEpisode(client, episodeId);
      }
      await client.query(
        `INSERT INTO pre_edit_policy_events (
           session_id, scope, episode_numbers, item_id, policy,
           affected_item_count, protected_human_count
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          input.sessionId, input.body.scope, normalizedEpisodes, input.body.itemId ?? null,
          input.body.policy, items.rows.length, protectedHumanDecisionCount,
        ],
      );
      await refreshSessionStatus(client, input.sessionId);
      const payload = {
        affectedItemCount: items.rows.length,
        systemDecisionCount,
        protectedHumanDecisionCount,
        safeUpdateCount,
        requiresHumanDecisionCount,
      };
      await saveCommand(client, {
        projectId: input.projectId, key: input.key, kind, hash,
        resourceId: input.sessionId, payload,
      });
      await client.query('COMMIT');
      return { ...payload, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async decide(input: {
    projectId: string; sessionId: string; itemId: string;
    body: CreatePreEditDecisionBody; key: string;
  }) {
    const kind = 'decide_item';
    const hash = commandHash({ sessionId: input.sessionId, itemId: input.itemId, ...input.body });
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const replay = await requireCommand(client, { projectId: input.projectId, key: input.key, kind, hash });
      if (replay) {
        await client.query('COMMIT');
        return { itemId: String(replay.itemId), eventId: String(replay.eventId), replay: true };
      }
      const session = await lockSession(client, input.projectId, input.sessionId);
      requireWritable(session);
      const rulePack = await loadRulePack(client, session);
      const items = await loadItems(client, 'item.id = $1 AND item.session_id = $2', [input.itemId, input.sessionId]);
      const item = items.rows[0];
      if (!item) throw preReviewNotFound('PRE_EDIT_ITEM_NOT_FOUND', '审改条目不存在。');
      if (item.version !== input.body.expectedVersion) {
        throw preReviewConflict('PRE_EDIT_ITEM_VERSION_CONFLICT', '条目版本已经变化。');
      }
      const companyCue = item.company_cues.find((cue) => cue.cueId === item.target_company_cue_id)
        ?? item.company_cues[0];
      const resolved = resolveDecision({
        kind: item.kind,
        action: input.body.action,
        ...(input.body.text !== undefined ? { text: input.body.text } : {}),
        companyCue: asAlignment(companyCue),
        asrCues: item.asr_cues,
      });
      if (!resolved) {
        throw preReviewInvalid(
          'PRE_EDIT_ACTION_INVALID',
          '该对齐类型不允许此决定；组合轴不能把整组 ASR 文本直接写入单个公司轴。',
        );
      }
      const timing = companyCue ?? item.asr_cues[0];
      const issues: PreEditFormatIssue[] = ['remove_company', 'ignore_asr'].includes(resolved.action)
        ? [] : scanFormatIssues(resolved.text, rulePack, timing ? {
          startMs: timing.startMs,
          endMs: companyCue?.endMs ?? item.asr_cues.at(-1)!.endMs,
          videoDurationMs: item.video_duration_ms === null ? null : Number(item.video_duration_ms),
        } : undefined);
      const trimmedOverride = input.body.formatOverrideReason?.trim();
      if (input.body.formatOverrideReason !== undefined && (!trimmedOverride || trimmedOverride.length < 8)) {
        throw preReviewInvalid('PRE_EDIT_ACTION_INVALID', '格式保留理由去除首尾空白后至少需要 8 个字符。');
      }
      const override = trimmedOverride || null;
      if (override && !issues.some((issue) => issue.overridable)) {
        throw preReviewInvalid('PRE_EDIT_ACTION_INVALID', '当前条目没有允许填写保留理由的格式问题。');
      }
      const event = await client.query<{ id: string }>(
        `INSERT INTO pre_edit_decision_events (
           session_id, episode_id, item_id, event_kind, action, origin, before_state, after_state, actor
         ) VALUES ($1, $2, $3, 'decision', $4, 'human', $5, $6, NULL) RETURNING id`,
        [
          input.sessionId, item.episode_id, item.id, resolved.action,
          JSON.stringify({
            action: item.current_action, text: item.current_text,
            formatOverrideReason: item.format_override_reason,
          }),
          JSON.stringify({ action: resolved.action, text: resolved.text, formatOverrideReason: override }),
        ],
      );
      await client.query(
        `UPDATE pre_edit_items
            SET current_action = $2, current_text = $3, decision_origin = 'human',
                current_decision_event_id = $4, format_issues = $5,
                format_override_reason = $6, version = version + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [item.id, resolved.action, resolved.text, event.rows[0]!.id, JSON.stringify(issues), override],
      );
      await invalidateEpisode(client, item.episode_id);
      await refreshSessionStatus(client, input.sessionId);
      const payload = { itemId: item.id, eventId: event.rows[0]!.id };
      await saveCommand(client, {
        projectId: input.projectId, key: input.key, kind, hash, resourceId: event.rows[0]!.id, payload,
      });
      await client.query('COMMIT');
      return { ...payload, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async undo(input: {
    projectId: string; sessionId: string; itemId: string;
    body: UndoPreEditDecisionBody; key: string;
  }) {
    const kind = 'undo_decision';
    const hash = commandHash({ sessionId: input.sessionId, itemId: input.itemId, ...input.body });
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const replay = await requireCommand(client, { projectId: input.projectId, key: input.key, kind, hash });
      if (replay) {
        await client.query('COMMIT');
        return { itemId: String(replay.itemId), eventId: String(replay.eventId), replay: true };
      }
      const session = await lockSession(client, input.projectId, input.sessionId);
      requireWritable(session);
      const rulePack = await loadRulePack(client, session);
      const items = await loadItems(client, 'item.id = $1 AND item.session_id = $2', [input.itemId, input.sessionId]);
      const item = items.rows[0];
      if (!item) throw preReviewNotFound('PRE_EDIT_ITEM_NOT_FOUND', '审改条目不存在。');
      if (item.version !== input.body.expectedVersion) {
        throw preReviewConflict('PRE_EDIT_ITEM_VERSION_CONFLICT', '条目版本已经变化。');
      }
      if (item.decision_origin !== 'human' || item.current_decision_event_id !== input.body.decisionEventId) {
        throw preReviewConflict('PRE_EDIT_DECISION_NOT_REVERSIBLE', '只能撤销当前仍生效的人工决定。');
      }
      const companyCue = item.company_cues.find((cue) => cue.cueId === item.target_company_cue_id)
        ?? item.company_cues[0];
      const timing = companyCue ?? item.asr_cues[0];
      const issues = ['remove_company', 'ignore_asr'].includes(item.system_action) ? [] : scanFormatIssues(
        item.system_text, rulePack,
        timing ? {
          startMs: timing.startMs,
          endMs: companyCue?.endMs ?? item.asr_cues.at(-1)!.endMs,
          videoDurationMs: item.video_duration_ms === null ? null : Number(item.video_duration_ms),
        } : undefined,
      );
      const event = await client.query<{ id: string }>(
        `INSERT INTO pre_edit_decision_events (
           session_id, episode_id, item_id, event_kind, action, origin,
           before_state, after_state, reverses_event_id
         ) VALUES ($1, $2, $3, 'undo', $4, 'human', $5, $6, $7) RETURNING id`,
        [
          input.sessionId, item.episode_id, item.id, item.system_action,
          JSON.stringify({ action: item.current_action, text: item.current_text }),
          JSON.stringify({ action: item.system_action, text: item.system_text, formatOverrideReason: null }),
          input.body.decisionEventId,
        ],
      );
      await client.query(
        `UPDATE pre_edit_items
            SET current_action = system_action, current_text = system_text, decision_origin = 'system',
                current_decision_event_id = $2, format_issues = $3, format_override_reason = NULL,
                version = version + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [item.id, event.rows[0]!.id, JSON.stringify(issues)],
      );
      await invalidateEpisode(client, item.episode_id);
      await refreshSessionStatus(client, input.sessionId);
      const payload = { itemId: item.id, eventId: event.rows[0]!.id };
      await saveCommand(client, {
        projectId: input.projectId, key: input.key, kind, hash, resourceId: event.rows[0]!.id, payload,
      });
      await client.query('COMMIT');
      return { ...payload, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async completeEpisode(input: {
    projectId: string; sessionId: string; episodeNumber: number;
    expectedRevision: number; key: string;
  }) {
    const kind = 'complete_episode';
    const hash = commandHash({
      sessionId: input.sessionId, episodeNumber: input.episodeNumber, expectedRevision: input.expectedRevision,
    });
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const replay = await requireCommand(client, { projectId: input.projectId, key: input.key, kind, hash });
      if (replay) {
        await client.query('COMMIT');
        return { episodeId: String(replay.episodeId), replay: true };
      }
      const session = await lockSession(client, input.projectId, input.sessionId);
      requireWritable(session);
      const episode = await client.query<{
        id: string; revision: number; status: string; limited_reason: string | null;
      }>(
        `SELECT id, revision, status, limited_reason FROM pre_edit_episodes
          WHERE session_id = $1 AND episode_number = $2 FOR UPDATE`,
        [input.sessionId, input.episodeNumber],
      );
      if (!episode.rows[0]) throw preReviewNotFound('PRE_EDIT_EPISODE_NOT_FOUND', '审改集数不存在。');
      if (episode.rows[0].status === 'limited' || episode.rows[0].limited_reason !== null) {
        throw preReviewConflict(
          'PRE_EDIT_COMPLETION_BLOCKED',
          '本集缺少可用 ASR 对照，只能进行有限审改，不能标记为已完成双源对照。',
          'run_asr',
        );
      }
      if (episode.rows[0].revision !== input.expectedRevision) {
        throw preReviewConflict('PRE_EDIT_EPISODE_VERSION_CONFLICT', '本集版本已经变化。');
      }
      const blockers = await client.query<{ pending: string; blocking: string }>(
        `SELECT
           count(*) FILTER (WHERE requires_review AND decision_origin = 'system')::text AS pending,
           count(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM jsonb_array_elements(format_issues) issue
              WHERE (issue->>'blocking')::boolean
                AND (NOT (issue->>'overridable')::boolean OR format_override_reason IS NULL)
           ))::text AS blocking
         FROM pre_edit_items WHERE episode_id = $1`,
        [episode.rows[0].id],
      );
      if (Number(blockers.rows[0]!.pending) || Number(blockers.rows[0]!.blocking)) {
        throw preReviewConflict(
          'PRE_EDIT_COMPLETION_BLOCKED',
          `本集仍有 ${blockers.rows[0]!.pending} 条待人工决定、${blockers.rows[0]!.blocking} 条格式阻断。`,
          'resolve_pre_edit_items',
        );
      }
      const decisions = await client.query<{
        id: string; version: number; current_action: string; current_text: string;
        format_override_reason: string | null; current_decision_event_id: string | null;
      }>(
        `SELECT id, version, current_action, current_text, format_override_reason, current_decision_event_id
           FROM pre_edit_items WHERE episode_id = $1 ORDER BY id`,
        [episode.rows[0].id],
      );
      const signature = sha256(JSON.stringify({
        sourceDigest: session.source_digest,
        episodeNumber: input.episodeNumber,
        decisions: decisions.rows,
      }));
      await client.query(
        `UPDATE pre_edit_episodes
            SET status = 'completed', completion_signature = $2, completed_at = CURRENT_TIMESTAMP,
                revision = revision + 1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [episode.rows[0].id, signature],
      );
      await refreshSessionStatus(client, input.sessionId);
      const payload = { episodeId: episode.rows[0].id, completionSignature: signature };
      await saveCommand(client, {
        projectId: input.projectId, key: input.key, kind, hash,
        resourceId: episode.rows[0].id, payload,
      });
      await client.query('COMMIT');
      return { ...payload, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createRelease(input: {
    projectId: string; sessionId: string; body: CreatePreEditReleaseBody; key: string;
  }) {
    const kind = 'create_release';
    const hash = commandHash({ sessionId: input.sessionId, ...input.body });
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const replay = await requireCommand(client, { projectId: input.projectId, key: input.key, kind, hash });
      if (replay) {
        await client.query('COMMIT');
        return { releaseId: String(replay.releaseId), replay: true };
      }
      await client.query('SELECT id FROM projects WHERE id = $1 FOR UPDATE', [input.projectId]);
      const session = await lockSession(client, input.projectId, input.sessionId);
      if (session.revision !== input.body.expectedSessionRevision) {
        throw preReviewConflict('PRE_EDIT_SESSION_VERSION_CONFLICT', '会话版本已经变化。');
      }
      if (session.status !== 'completed') {
        throw preReviewConflict('PRE_EDIT_RELEASE_BLOCKED', '全部集完成并签名后才能发布待验收修订。');
      }
      const episodeRows = await client.query<{
        id: string; episode_number: number; completion_signature: string | null;
      }>(
        `SELECT id, episode_number, completion_signature
           FROM pre_edit_episodes WHERE session_id = $1 ORDER BY episode_number FOR UPDATE`,
        [input.sessionId],
      );
      if (!episodeRows.rows.length || episodeRows.rows.some((episode) => !episode.completion_signature)) {
        throw preReviewConflict('PRE_EDIT_RELEASE_BLOCKED', '存在尚未完成签名的集数。');
      }
      const project = await client.query<{ name: string }>('SELECT name FROM projects WHERE id = $1', [input.projectId]);
      const safeName = project.rows[0]!.name.replace(/[\\/:*?"<>|]/gu, '_').trim() || 'project';
      const files: Array<{ episodeNumber: number; fileName: string; cueCount: number; bytes: Buffer; contentDigest: string }> = [];
      const decisionRows: unknown[] = [];
      for (const episode of episodeRows.rows) {
        const rows = await client.query<{
          id: string; current_action: PreEditDecisionAction; current_text: string;
          target_start_ms: number | null; target_end_ms: number | null;
          asr_start_ms: number | null; asr_end_ms: number | null;
          version: number; current_decision_event_id: string | null;
        }>(
          `SELECT item.id, item.current_action, item.current_text, item.version,
                  item.current_decision_event_id,
                  company.start_ms AS target_start_ms, company.end_ms AS target_end_ms,
                  (SELECT min(start_ms) FROM asr_cues WHERE id = ANY(group_row.asr_cue_ids)) AS asr_start_ms,
                  (SELECT max(end_ms) FROM asr_cues WHERE id = ANY(group_row.asr_cue_ids)) AS asr_end_ms
             FROM pre_edit_items item
             JOIN pre_edit_alignment_groups group_row ON group_row.id = item.group_id
             LEFT JOIN term_cues company ON company.id = item.target_company_cue_id
            WHERE item.episode_id = $1
            ORDER BY coalesce(company.start_ms, (
              SELECT min(start_ms) FROM asr_cues WHERE id = ANY(group_row.asr_cue_ids)
            )), item.id`,
          [episode.id],
        );
        const cues: ReleaseCue[] = rows.rows.flatMap((row) => {
          decisionRows.push({ episodeNumber: episode.episode_number, ...row });
          if (['remove_company', 'ignore_asr'].includes(row.current_action)) return [];
          const startMs = row.target_start_ms ?? row.asr_start_ms;
          const endMs = row.target_end_ms ?? row.asr_end_ms;
          if (startMs === null || endMs === null || !row.current_text) return [];
          return [{ startMs, endMs, text: row.current_text }];
        });
        const bytes = renderSrt(cues);
        files.push({
          episodeNumber: episode.episode_number,
          fileName: `${safeName}-EP${String(episode.episode_number).padStart(2, '0')}-pre-edit.srt`,
          cueCount: cues.length,
          bytes,
          contentDigest: sha256(bytes),
        });
      }
      const decisionDigest = sha256(JSON.stringify(decisionRows));
      const releaseDigest = sha256(JSON.stringify(files.map((file) => ({
        episodeNumber: file.episodeNumber, contentDigest: file.contentDigest,
      }))));
      const nextVersion = await client.query<{ version: number }>(
        'SELECT coalesce(max(version), 0) + 1 AS version FROM pre_edit_releases WHERE project_id = $1',
        [input.projectId],
      );
      const release = await client.query<{ id: string }>(
        `INSERT INTO pre_edit_releases (
           project_id, session_id, version, source_digest, decision_digest, release_digest
         ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          input.projectId, input.sessionId, nextVersion.rows[0]!.version,
          session.source_digest, decisionDigest, releaseDigest,
        ],
      );
      for (const file of files) {
        await client.query(
          `INSERT INTO pre_edit_release_files (
             release_id, episode_number, file_name, cue_count, content_digest, bytes
           ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [release.rows[0]!.id, file.episodeNumber, file.fileName, file.cueCount, file.contentDigest, file.bytes],
        );
      }
      const payload = { releaseId: release.rows[0]!.id };
      await saveCommand(client, {
        projectId: input.projectId, key: input.key, kind, hash,
        resourceId: release.rows[0]!.id, payload,
      });
      await client.query('COMMIT');
      return { ...payload, replay: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async downloadReleaseFile(projectId: string, releaseId: string, episodeNumber: number) {
    const result = await this.pool.query<{ file_name: string; bytes: Buffer }>(
      `SELECT file.file_name, file.bytes
         FROM pre_edit_release_files file
         JOIN pre_edit_releases release ON release.id = file.release_id
        WHERE release.id = $1 AND release.project_id = $2 AND file.episode_number = $3`,
      [releaseId, projectId, episodeNumber],
    );
    if (!result.rows[0]) throw preReviewNotFound('PRE_EDIT_RELEASE_NOT_FOUND', '待验收 SRT 不存在。');
    return result.rows[0];
  }

  async createPlaybackGrant(input: {
    projectId: string; sessionId: string; itemId: string; expectedSessionRevision: number;
  }) {
    const result = await this.pool.query<{
      session_revision: number; session_status: string; episode_id: string; episode_number: number;
      video_asset_id: string | null; object_key: string | null; start_ms: number | null; end_ms: number | null;
    }>(
      `SELECT session.revision AS session_revision, session.status AS session_status,
              episode.id AS episode_id, episode.episode_number, episode.video_asset_id,
              asset.object_key,
              coalesce(company.start_ms, (
                SELECT min(start_ms) FROM asr_cues WHERE id = ANY(group_row.asr_cue_ids)
              )) AS start_ms,
              coalesce(company.end_ms, (
                SELECT max(end_ms) FROM asr_cues WHERE id = ANY(group_row.asr_cue_ids)
              )) AS end_ms
         FROM pre_edit_items item
         JOIN pre_edit_sessions session ON session.id = item.session_id
         JOIN pre_edit_episodes episode ON episode.id = item.episode_id
         JOIN pre_edit_alignment_groups group_row ON group_row.id = item.group_id
         LEFT JOIN term_cues company ON company.id = item.target_company_cue_id
         LEFT JOIN assets asset ON asset.id = episode.video_asset_id
        WHERE item.id = $1 AND session.id = $2 AND session.project_id = $3`,
      [input.itemId, input.sessionId, input.projectId],
    );
    const row = result.rows[0];
    if (!row) throw preReviewNotFound('PRE_EDIT_ITEM_NOT_FOUND', '审改条目不存在。');
    if (row.session_revision !== input.expectedSessionRevision) {
      throw preReviewConflict('PRE_EDIT_SESSION_VERSION_CONFLICT', '会话版本已经变化。');
    }
    if (!row.video_asset_id || !row.object_key || row.start_ms === null || row.end_ms === null) {
      throw preReviewConflict('PRE_EDIT_PLAYBACK_NOT_AVAILABLE', '本集没有可读取的视频证据。', 'prepare_video');
    }
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1_000);
    await this.pool.query(
      `INSERT INTO pre_edit_playback_grants (
         token_digest, session_id, episode_id, asset_id, object_key, expires_at
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [sha256(token), input.sessionId, row.episode_id, row.video_asset_id, row.object_key, expiresAt],
    );
    return {
      assetId: row.video_asset_id,
      episodeNumber: row.episode_number,
      url: `/api/pre-review/playback/${token}`,
      expiresAt: expiresAt.toISOString(),
      seek: {
        startMs: Math.max(0, row.start_ms - 1_800),
        contextEndMs: Math.min(row.start_ms + 12_000, row.end_ms + 2_500),
      },
    };
  }

  async readPlayback(token: string) {
    const digest = sha256(token);
    const result = await this.pool.query<{ object_key: string; original_filename: string }>(
      `SELECT grant_row.object_key, asset.original_filename
         FROM pre_edit_playback_grants grant_row
         JOIN assets asset ON asset.id = grant_row.asset_id
        WHERE grant_row.token_digest = $1 AND grant_row.expires_at > CURRENT_TIMESTAMP`,
      [digest],
    );
    const grant = result.rows[0];
    if (!grant) {
      throw new PreReviewDomainError(
        'PRE_EDIT_PLAYBACK_GRANT_INVALID',
        '播放地址不存在、已过期或已经使用。',
        410,
        'reload_playback',
      );
    }
    const bytes = await this.storage.readObject(grant.object_key);
    if (!bytes) throw preReviewConflict('PRE_EDIT_PLAYBACK_NOT_AVAILABLE', '视频对象不存在。', 'prepare_video');
    return { bytes, fileName: grant.original_filename };
  }
}

export { commandHash };
