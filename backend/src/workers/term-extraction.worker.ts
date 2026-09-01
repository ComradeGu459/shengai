import { randomUUID } from 'node:crypto';

import { TermExtractionRepository, type TermExtractionAttemptRow, type TermExtractionAttemptClaim } from '../modules/terms/term-extraction.repository.js';
import type { TermExtractionAdapter } from '../modules/terms/term-extraction.js';
import { validateExtractedTermSeeds } from '../modules/terms/term-extraction.js';
import {
  createCustomTermExtractionAdapter,
  createDeepSeekV4FlashTermExtractionAdapter,
  TermProviderError,
  type TermProviderRunConfigSnapshot,
} from '../modules/terms/term-openai-compatible-adapter.js';
import { TermSourceService } from '../modules/terms/term-source.service.js';
import type { DatabasePool } from '../database/pool.js';
import type { UploadStorage } from '../modules/uploads/upload-storage.js';
import { TermSourceRepository } from '../modules/terms/term-source.repository.js';
import type { TermsRouteTargetSnapshot } from '../modules/system-control/system-control.routing.service.js';

export type TermExtractionAdapterFactory = (
  target: TermsRouteTargetSnapshot,
  secretKey: string,
) => TermExtractionAdapter | Promise<TermExtractionAdapter>;

export type TermExtractionSecretKeyResolver = (secretReferenceVersionId: string) => Promise<string | null>;

export interface TermExtractionWorkerOptions {
  workerId?: string;
  leaseMs?: number;
  pollIntervalMs?: number;
  clock?: () => Date;
  /** 测试或宿主可注入按快照构造适配器的工厂；默认只支持 OpenAI-compatible 两种 preset。 */
  adapterFactory?: TermExtractionAdapterFactory;
  /** 解析引用对应的运行时 key；key 不会进入 run/attempt 快照。 */
  secretKeyResolver?: TermExtractionSecretKeyResolver;
  fetchImpl?: typeof fetch;
}

const waitForNextPoll = async (signal: AbortSignal, milliseconds: number) => {
  if (signal.aborted) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      resolve();
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
};

const safeUsageSummary = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('术语 Provider usage 无效。');
  const summary: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'number' || !Number.isFinite(item) || item < 0) throw new Error('术语 Provider usage 无效。');
    summary[key] = item;
  }
  return summary;
};

const safeDiagnostics = (value: unknown) => {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) throw new Error('术语 Provider diagnostics 无效。');
  return value as string[];
};

const targetFromAttempt = (attempt: TermExtractionAttemptRow): TermsRouteTargetSnapshot => {
  const config = attempt.adapter_config;
  return {
    routingVersionId: attempt.routing_version_id,
    routingTargetId: attempt.routing_target_id,
    deploymentVersionId: attempt.deployment_version_id,
    priority: attempt.priority,
    role: attempt.role,
    adapterKey: attempt.adapter,
    executionKind: 'cloud_api',
    provider: typeof config.provider === 'string' ? config.provider : 'unknown',
    model: typeof config.model === 'string' ? config.model : '',
    runtimeConfig: config,
    adapterConfig: config,
    configDigest: attempt.config_digest,
    secretReferenceVersionId: attempt.secret_reference_version_id,
    secretReferenceSummary: {},
  };
};

const defaultAdapterFactory = (
  target: TermsRouteTargetSnapshot,
  secretKey: string,
  fetchImpl: typeof fetch,
) => {
  const config = target.adapterConfig as Partial<TermProviderRunConfigSnapshot> & { preset?: unknown; endpoint?: unknown; model?: unknown };
  if (config.preset === 'deepseek-v4-flash') {
    return createDeepSeekV4FlashTermExtractionAdapter(secretKey, fetchImpl, config);
  }
  if (config.preset === 'custom'
    && typeof config.endpoint === 'string'
    && typeof config.model === 'string') {
    return createCustomTermExtractionAdapter({
      endpoint: config.endpoint,
      model: config.model,
      bearerKey: secretKey,
      snapshot: config,
    }, fetchImpl);
  }
  throw new Error('术语 route 快照的 preset 不受当前 Worker 支持。');
};

export class TermExtractionWorker {
  private readonly workerId: string;
  private readonly leaseMs: number;
  private readonly pollIntervalMs: number;
  private readonly now: () => Date;
  private readonly repository: TermExtractionRepository;
  private readonly adapterFactory: TermExtractionAdapterFactory | undefined;
  private readonly secretKeyResolver: TermExtractionSecretKeyResolver | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly database: DatabasePool,
    private readonly storage: UploadStorage,
    /** 仅用于旧的无 route 快照 run；受控 run 按 attempt 快照构造新 adapter。 */
    private readonly adapter: TermExtractionAdapter,
    options: TermExtractionWorkerOptions = {},
  ) {
    this.repository = new TermExtractionRepository(database);
    this.workerId = options.workerId ?? `term-extraction-${randomUUID()}`;
    this.leaseMs = Math.max(1_000, options.leaseMs ?? 5 * 60_000);
    this.pollIntervalMs = Math.min(Math.max(options.pollIntervalMs ?? 1_000, 50), 60_000);
    this.now = options.clock ?? (() => new Date());
    this.adapterFactory = options.adapterFactory;
    this.secretKeyResolver = options.secretKeyResolver;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async failControlled(
    claim: TermExtractionAttemptClaim,
    code: string,
    detail: string,
    disposition: 'external_not_accepted' | 'stop' | 'unknown',
  ) {
    const result = await this.repository.failAttempt({
      runId: claim.run.id,
      attemptId: claim.attempt.id,
      workerId: this.workerId,
      code,
      detail,
      disposition,
    });
    return {
      processed: true as const,
      runId: claim.run.id,
      projectId: claim.run.project_id,
      status: result?.run?.status ?? 'failed',
      attemptId: claim.attempt.id,
      fallback: result?.shouldFallback ?? false,
    };
  }

  private async processControlled(claim: TermExtractionAttemptClaim) {
    let providerStarted = false;
    const source = new TermSourceService(new TermSourceRepository(this.database), this.storage);
    try {
      const inspected = await source.inspect(claim.run.project_id);
      if (!inspected.ready) {
        return await this.failControlled(
          claim,
          inspected.state.issueCode ?? 'TERM_SOURCE_NOT_READY',
          inspected.state.issueDetail ?? '公司 SRT 尚未就绪。',
          'stop',
        );
      }
      if (inspected.ready.state.sourceSrtSetDigest !== claim.run.source_srt_set_digest) {
        return await this.failControlled(claim, 'TERM_SOURCE_CHANGED', '术语提取运行期间公司 SRT 来源发生变化。', 'stop');
      }
      const secretKey = claim.attempt.secret_reference_version_id
        ? await this.secretKeyResolver?.(claim.attempt.secret_reference_version_id) ?? null
        : null;
      if (!this.adapterFactory && !secretKey && claim.attempt.adapter !== this.adapter.name) {
        return await this.failControlled(claim, 'TERM_SECRET_UNAVAILABLE', '术语 Provider Secret 引用当前不可用。', 'stop');
      }
      const target = targetFromAttempt(claim.attempt);
      const adapter = this.adapterFactory
        ? await this.adapterFactory(target, secretKey ?? '')
        : claim.attempt.adapter === this.adapter.name
          ? this.adapter
          : defaultAdapterFactory(target, secretKey ?? '', this.fetchImpl);
      if (!await this.repository.markAttemptProviderStarted({
        runId: claim.run.id,
        attemptId: claim.attempt.id,
        workerId: this.workerId,
        now: this.now(),
      })) {
        return await this.failControlled(claim, 'TERM_EXTRACTION_CLAIM_LOST', '术语提取 attempt claim 已失效。', 'stop');
      }
      providerStarted = true;
      const output = await adapter.extract({
        cues: inspected.ready.cues,
        promptVersion: claim.run.prompt_version,
        config: claim.attempt.adapter_config,
      });
      const validated = validateExtractedTermSeeds(
        output.candidates,
        new Set(inspected.ready.cues.map((cue) => cue.id)),
      );
      await this.repository.complete({
        runId: claim.run.id,
        projectId: claim.run.project_id,
        sourceDigest: claim.run.source_srt_set_digest,
        promptVersion: claim.run.prompt_version,
        cues: inspected.ready.cues,
        candidates: validated.candidates,
        diagnostics: [...safeDiagnostics(output.diagnostics), ...validated.diagnostics],
        usageSummary: safeUsageSummary(output.usageSummary),
        workerId: this.workerId,
        attemptId: claim.attempt.id,
      });
      return {
        processed: true as const,
        runId: claim.run.id,
        projectId: claim.run.project_id,
        status: 'completed' as const,
        attemptId: claim.attempt.id,
      };
    } catch (error) {
      if (error instanceof TermProviderError) {
        return this.failControlled(claim, error.code, error.message, error.disposition);
      }
      // Provider 后的非协议异常视为 unknown：不重发、不切备用；协议校验异常则稳定停在当前 attempt。
      return this.failControlled(
        claim,
        'TERM_EXTRACTION_FAILED',
        '术语提取失败，请检查 Provider 响应或来源后显式重试。',
        providerStarted ? 'unknown' : 'stop',
      );
    }
  }

  async runOnce() {
    // 先原子收敛 marker 后过期的 running attempt；该路径不构造 adapter，也不触发 Provider。
    await this.repository.sweepExpiredAttemptClaims({ now: this.now() });
    const controlled = await this.repository.claimAttempt({ workerId: this.workerId, leaseMs: this.leaseMs, now: this.now() });
    if (controlled) return this.processControlled(controlled);

    // 保留 116 前已存在的无 route 快照 run；新受控 run 永远先走上面的 attempt。
    const claim = await this.repository.claim({ workerId: this.workerId, leaseMs: this.leaseMs, now: this.now() });
    if (!claim) return { processed: false as const };
    const fail = async (code: string, detail: string) => {
      await this.repository.fail(claim.id, code, detail, this.workerId);
      return {
        processed: true as const,
        runId: claim.id,
        projectId: claim.project_id,
        status: 'failed' as const,
      };
    };
    try {
      if (claim.adapter !== this.adapter.name) {
        return await fail('TERM_EXTRACTION_ADAPTER_UNAVAILABLE', '保存的术语适配器当前不可用。');
      }
      const source = new TermSourceService(new TermSourceRepository(this.database), this.storage);
      const inspected = await source.inspect(claim.project_id);
      if (!inspected.ready) {
        return await fail(inspected.state.issueCode ?? 'TERM_SOURCE_NOT_READY', inspected.state.issueDetail ?? '公司 SRT 尚未就绪。');
      }
      if (inspected.ready.state.sourceSrtSetDigest !== claim.source_srt_set_digest) {
        return await fail('TERM_SOURCE_CHANGED', '术语提取运行期间公司 SRT 来源发生变化。');
      }
      if (!await this.repository.markProviderStarted({ runId: claim.id, workerId: this.workerId, now: this.now() })) {
        return await fail('TERM_EXTRACTION_CLAIM_LOST', '术语提取运行的 Worker claim 已失效。');
      }
      const output = await this.adapter.extract({
        cues: inspected.ready.cues,
        promptVersion: claim.prompt_version,
        config: claim.adapter_config,
      });
      const validated = validateExtractedTermSeeds(
        output.candidates,
        new Set(inspected.ready.cues.map((cue) => cue.id)),
      );
      await this.repository.complete({
        runId: claim.id,
        projectId: claim.project_id,
        sourceDigest: claim.source_srt_set_digest,
        promptVersion: claim.prompt_version,
        cues: inspected.ready.cues,
        candidates: validated.candidates,
        diagnostics: [...safeDiagnostics(output.diagnostics), ...validated.diagnostics],
        usageSummary: safeUsageSummary(output.usageSummary),
        workerId: this.workerId,
      });
      return { processed: true as const, runId: claim.id, projectId: claim.project_id, status: 'completed' as const };
    } catch (error) {
      if (error instanceof TermProviderError) return fail(error.code, error.message);
      return fail('TERM_EXTRACTION_FAILED', '术语提取失败，请检查 Provider 响应或来源后显式重试。');
    }
  }

  async runUntilStopped(signal: AbortSignal) {
    while (!signal.aborted) {
      const result = await this.runOnce();
      if (!result.processed) await waitForNextPoll(signal, this.pollIntervalMs);
    }
  }
}
