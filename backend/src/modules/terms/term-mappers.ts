import type {
  TermCandidate,
  TermDraft,
  TermEvidence,
  TermExtractionRun,
  TermVersion,
} from '@qimao-terms-cloud/contracts';
import type { QueryResultRow } from 'pg';

export interface DraftRow extends QueryResultRow {
  id: string;
  project_id: string;
  source_srt_set_digest: string;
  prompt_version: string;
  base_term_version_id: string | null;
  status: TermDraft['status'];
  revision: number;
  pending_count: string;
  candidate_count: string;
  created_at: Date;
  updated_at: Date;
}

export interface RunRow extends QueryResultRow {
  id: string;
  project_id: string;
  draft_id: string | null;
  source_srt_set_digest: string;
  prompt_version: string;
  adapter: string;
  adapter_config: Record<string, unknown>;
  usage_summary: Record<string, number>;
  status: TermExtractionRun['status'];
  request_id: string;
  cue_count: number;
  candidate_count: number;
  diagnostics: string[];
  error_code: string | null;
  error_detail: string | null;
  created_at: Date;
  completed_at: Date | null;
}

export interface CandidateRow extends QueryResultRow {
  id: string;
  draft_id: string;
  type: TermCandidate['type'];
  name: string;
  aliases: string[];
  gender: TermCandidate['gender'];
  note: string;
  origin: TermCandidate['origin'];
  confidence: string | null;
  status: TermCandidate['status'];
  version: number;
  evidence_count: string;
  cue_id: string;
  asset_id: string;
  episode_number: number;
  cue_index: number;
  start_ms: number;
  end_ms: number;
  cue_text: string;
  created_at: Date;
  updated_at: Date;
  total_count?: string;
}

export interface VersionRow extends QueryResultRow {
  id: string;
  project_id: string;
  version: number;
  source_srt_set_digest: string;
  prompt_version: string;
  item_count: string;
  created_at: Date;
}

export const draftColumns = `
  draft.id, draft.project_id, draft.source_srt_set_digest, draft.prompt_version,
  draft.base_term_version_id, draft.status, draft.revision, draft.created_at, draft.updated_at,
  COUNT(candidate.id) FILTER (WHERE candidate.status = 'pending') AS pending_count,
  COUNT(candidate.id) AS candidate_count
`;

export const candidateColumns = `
  candidate.id, candidate.draft_id, candidate.type, candidate.name, candidate.aliases,
  candidate.gender, candidate.note, candidate.origin, candidate.confidence,
  candidate.status, candidate.version, candidate.created_at, candidate.updated_at,
  evidence_summary.evidence_count, evidence_summary.cue_id, evidence_summary.asset_id,
  evidence_summary.episode_number, evidence_summary.cue_index,
  evidence_summary.start_ms, evidence_summary.end_ms, evidence_summary.cue_text
`;

export const candidateEvidenceJoin = `
  JOIN LATERAL (
    SELECT COUNT(*) OVER() AS evidence_count, cue.id AS cue_id, cue.asset_id,
           cue.episode_number, cue.cue_index, cue.start_ms, cue.end_ms, cue.text AS cue_text
      FROM term_evidence evidence
      JOIN term_cues cue ON cue.id = evidence.cue_id
     WHERE evidence.candidate_id = candidate.id
     ORDER BY cue.episode_number, cue.cue_index, cue.id
     LIMIT 1
  ) evidence_summary ON TRUE
`;

export const toEvidence = (row: CandidateRow): TermEvidence => ({
  cueId: row.cue_id,
  assetId: row.asset_id,
  episodeNumber: row.episode_number,
  cueIndex: row.cue_index,
  startMs: row.start_ms,
  endMs: row.end_ms,
  text: row.cue_text,
});

export const toCandidate = (row: CandidateRow): TermCandidate => ({
  id: row.id,
  draftId: row.draft_id,
  type: row.type,
  name: row.name,
  aliases: row.aliases,
  gender: row.gender,
  note: row.note,
  origin: row.origin,
  confidence: row.confidence === null ? null : Number(row.confidence),
  status: row.status,
  version: row.version,
  evidenceCount: Number(row.evidence_count),
  firstEvidence: toEvidence(row),
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const toDraft = (row: DraftRow): TermDraft => ({
  id: row.id,
  projectId: row.project_id,
  sourceSrtSetDigest: row.source_srt_set_digest,
  promptVersion: row.prompt_version,
  baseTermVersionId: row.base_term_version_id,
  status: row.status,
  revision: row.revision,
  pendingCount: Number(row.pending_count),
  candidateCount: Number(row.candidate_count),
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});

export const toRun = (row: RunRow): TermExtractionRun => ({
  id: row.id,
  projectId: row.project_id,
  draftId: row.draft_id,
  sourceSrtSetDigest: row.source_srt_set_digest,
  promptVersion: row.prompt_version,
  adapter: row.adapter,
  adapterConfig: row.adapter_config,
  usageSummary: row.usage_summary,
  status: row.status,
  requestId: row.request_id,
  cueCount: row.cue_count,
  candidateCount: row.candidate_count,
  diagnostics: row.diagnostics,
  errorCode: row.error_code,
  errorDetail: row.error_detail,
  createdAt: row.created_at.toISOString(),
  completedAt: row.completed_at?.toISOString() ?? null,
});

export const toVersionSummary = (row: VersionRow): Omit<TermVersion, 'items'> => ({
  id: row.id,
  projectId: row.project_id,
  version: row.version,
  sourceSrtSetDigest: row.source_srt_set_digest,
  promptVersion: row.prompt_version,
  itemCount: Number(row.item_count),
  createdAt: row.created_at.toISOString(),
});
