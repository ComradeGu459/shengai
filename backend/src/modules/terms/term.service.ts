import { createHash } from 'node:crypto';

import type {
  BatchTermDecisionBody,
  CreateManualTermCandidateBody,
  CreateTermExportBody,
  CreateTermExportTemplateBody,
  CreateTermDraftBody,
  PublishTermVersionBody,
  TermCandidateDecisionBody,
} from '@qimao-terms-cloud/contracts';

import { TermCandidateRepository } from './term-candidate.repository.js';
import { TermExtractionRepository } from './term-extraction.repository.js';
import type { ExtractedTermSeed, TermExtractionAdapter } from './term-extraction.js';
import { TermExportRepository } from './term-export.repository.js';
import { TermDomainError, termInvalid, termNotFound, type TermErrorCode } from './term-errors.js';
import { TermSourceService } from './term-source.service.js';
import { TermVersionRepository } from './term-version.repository.js';
import { TermWorkspaceRepository } from './term-workspace.repository.js';
import { createTermVersionXlsx } from './term-xlsx.js';

export const TERM_PROMPT_VERSION = 'term-prompt-v1';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const termTypes = new Set([
  '人名', '地名', '特定物品', '朝代', '组织名', '等级', '物种/种族名', '特殊概念/事件',
]);

const validateSeeds = (seeds: ExtractedTermSeed[], cueIds: Set<string>) => {
  const candidates: ExtractedTermSeed[] = [];
  const diagnostics: string[] = [];
  const seen = new Set<string>();
  for (const seed of seeds) {
    const evidence = [...new Set(seed.evidenceCueIds)].filter((cueId) => cueIds.has(cueId));
    const key = seed.name.trim();
    if (!termTypes.has(seed.type) || !seed.name.trim() || !evidence.length || seen.has(key)
      || !Number.isFinite(seed.confidence) || seed.confidence < 0 || seed.confidence > 1) {
      diagnostics.push(`候选“${seed.name || '未命名'}”因缺少真实证据、名称无效或重复而未进入人工草稿。`);
      continue;
    }
    seen.add(key);
    candidates.push({
      ...seed,
      name: seed.name.trim(),
      aliases: [...new Set(seed.aliases.map((item) => item.trim()).filter(Boolean))],
      gender: seed.type === '人名' ? seed.gender : 'unknown',
      evidenceCueIds: evidence,
    });
  }
  return { candidates, diagnostics };
};

export class TermService {
  constructor(
    private readonly source: TermSourceService,
    private readonly extraction: TermExtractionRepository,
    private readonly candidates: TermCandidateRepository,
    private readonly versions: TermVersionRepository,
    private readonly workspace: TermWorkspaceRepository,
    private readonly adapter: TermExtractionAdapter,
    private readonly exports: TermExportRepository,
  ) {}

  async getWorkspace(projectId: string) {
    const [source, projection] = await Promise.all([
      this.source.inspect(projectId),
      this.workspace.projection(projectId),
    ]);
    const currentDigest = source.state.sourceSrtSetDigest;
    const trackedDigest = projection.activeDraft?.sourceSrtSetDigest
      ?? projection.latestVersion?.sourceSrtSetDigest
      ?? projection.latestRun?.sourceSrtSetDigest
      ?? null;
    return {
      source: source.state,
      sourceIsCurrent: source.state.status === 'ready' && trackedDigest !== null && trackedDigest === currentDigest,
      ...projection,
    };
  }

  async startExtraction(input: {
    projectId: string;
    expectedSourceDigest?: string;
    idempotencyKey: string;
    requestId: string;
  }) {
    const inspected = await this.source.inspect(input.projectId);
    const sourceDigest = inspected.state.sourceSrtSetDigest;
    if (!sourceDigest) {
      throw termInvalid('TERM_SOURCE_NOT_READY', inspected.state.issueDetail ?? '公司 SRT 尚未就绪。');
    }
    if (input.expectedSourceDigest && input.expectedSourceDigest !== sourceDigest) {
      throw new TermDomainError('TERM_SOURCE_CHANGED', '公司 SRT 来源已经变化，请刷新后重试。', 409, 'reload_terms');
    }
    const requestHash = hash({ sourceDigest, promptVersion: TERM_PROMPT_VERSION });
    const begun = await this.extraction.begin({
      projectId: input.projectId,
      sourceDigest,
      promptVersion: TERM_PROMPT_VERSION,
      adapter: this.adapter.name,
      adapterConfig: this.adapter.configSummary,
      idempotencyKey: input.idempotencyKey,
      requestHash,
      requestId: input.requestId,
    });
    if (begun.replay) return begun;
    if (!inspected.ready) {
      await this.extraction.fail(begun.run.id, inspected.state.issueCode ?? 'TERM_SRT_INVALID', inspected.state.issueDetail ?? 'SRT 无效。');
      throw termInvalid(
        (inspected.state.issueCode ?? 'TERM_SRT_INVALID') as TermErrorCode,
        inspected.state.issueDetail ?? 'SRT 无效。',
        'replace_source_srt',
      );
    }
    try {
      const output = await this.adapter.extract({ cues: inspected.ready.cues, promptVersion: TERM_PROMPT_VERSION });
      const validated = validateSeeds(output.candidates, new Set(inspected.ready.cues.map((cue) => cue.id)));
      const completed = await this.extraction.complete({
        runId: begun.run.id,
        projectId: input.projectId,
        sourceDigest,
        promptVersion: TERM_PROMPT_VERSION,
        cues: inspected.ready.cues,
        candidates: validated.candidates,
        diagnostics: [...output.diagnostics, ...validated.diagnostics],
        usageSummary: output.usageSummary,
      });
      return { ...completed, replay: false };
    } catch (error) {
      const detail = error instanceof Error ? error.message : '术语提取失败。';
      await this.extraction.fail(begun.run.id, 'TERM_EXTRACTION_FAILED', detail);
      throw new TermDomainError('TERM_EXTRACTION_FAILED', '术语提取失败，请检查来源后显式重试。', 500, 'retry_extraction', true);
    }
  }

  decide(projectId: string, candidateId: string, body: TermCandidateDecisionBody) {
    return this.candidates.decide(projectId, candidateId, body, null);
  }

  createManual(projectId: string, body: CreateManualTermCandidateBody) {
    return this.candidates.createManual(projectId, body, null);
  }

  async batch(projectId: string, body: BatchTermDecisionBody) {
    const items = [];
    for (const item of body.items) {
      try {
        const candidate = await this.candidates.decide(projectId, item.candidateId, {
          expectedVersion: item.expectedVersion,
          action: item.action,
        }, null);
        items.push({ candidateId: item.candidateId, ok: true as const, candidate });
      } catch (error) {
        if (error instanceof TermDomainError) {
          items.push({
            candidateId: item.candidateId,
            ok: false as const,
            error: { code: error.code, message: error.message },
          });
          continue;
        }
        throw error;
      }
    }
    return { items };
  }

  async createDraft(input: {
    projectId: string;
    body: CreateTermDraftBody;
    idempotencyKey: string;
  }) {
    const ready = await this.source.requireReady(input.projectId, input.body.expectedSourceSrtSetDigest);
    return this.versions.createDraftFromVersion({
      projectId: input.projectId,
      baseVersionId: input.body.baseTermVersionId,
      sourceDigest: ready.state.sourceSrtSetDigest,
      idempotencyKey: input.idempotencyKey,
      requestHash: hash(input.body),
    });
  }

  async publishVersion(input: {
    projectId: string;
    body: PublishTermVersionBody;
    idempotencyKey: string;
  }) {
    return this.versions.publish({
      projectId: input.projectId,
      draftId: input.body.draftId,
      expectedDraftRevision: input.body.expectedDraftRevision,
      sourceDigest: input.body.expectedSourceSrtSetDigest,
      templateVersionId: input.body.templateVersionId,
      idempotencyKey: input.idempotencyKey,
      requestHash: hash(input.body),
    });
  }

  listExportTemplates() {
    return this.exports.listTemplates();
  }

  createExportTemplate(body: CreateTermExportTemplateBody, idempotencyKey: string) {
    return this.exports.createTemplate({ body, idempotencyKey, requestHash: hash(body) });
  }

  activateExportTemplate(templateVersionId: string, expectedActiveTemplateVersionId: string) {
    return this.exports.activateTemplate(templateVersionId, expectedActiveTemplateVersionId);
  }

  createExport(input: {
    projectId: string;
    termVersionId: string;
    body: CreateTermExportBody;
    idempotencyKey: string;
  }) {
    return this.exports.createExport({
      projectId: input.projectId,
      termVersionId: input.termVersionId,
      templateVersionId: input.body.templateVersionId,
      idempotencyKey: input.idempotencyKey,
      requestHash: hash({ termVersionId: input.termVersionId, ...input.body }),
    });
  }

  async downloadExport(projectId: string, exportId: string) {
    const exported = await this.exports.getExport(projectId, exportId);
    if (!exported) throw termNotFound('TERM_EXPORT_NOT_FOUND', '术语导出不存在。');
    const version = await this.versions.get(projectId, exported.termVersionId);
    if (!version) throw termNotFound('TERM_VERSION_NOT_FOUND', '术语版本不存在。');
    return { export: exported, version, bytes: createTermVersionXlsx(version, exported.columns) };
  }

}
