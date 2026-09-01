import { createHash } from 'node:crypto';

import type {
  PreEditAlignmentKind,
  PreEditBaselinePolicy,
  PreEditCue,
  PreEditDecisionAction,
  PreEditFormatIssue,
} from '@qimao-terms-cloud/contracts';

export interface PreReviewRulePack {
  alignmentNearbyGapMs: number;
  alignmentSimilarityThreshold: number;
  maxCharacters: number;
  forbidSentencePunctuation: boolean;
  forbidMarkup: boolean;
  forbidBrackets: boolean;
  requireSpeakerDashForMultipleLines: boolean;
}

export const sha256 = (value: string | Uint8Array) =>
  createHash('sha256').update(value).digest('hex');

export const normalizePreEditText = (text: string) => text
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[\s，。？！,.?!、；;：:“”"'‘’（）()【】\[\]{}<>《》]/g, '');

const bigrams = (text: string) => {
  const normalized = normalizePreEditText(text);
  if (normalized.length < 2) return new Set(normalized ? [normalized] : []);
  return new Set(Array.from({ length: normalized.length - 1 }, (_, index) => normalized.slice(index, index + 2)));
};

export const textSimilarity = (left: string, right: string) => {
  const a = bigrams(left);
  const b = bigrams(right);
  if (!a.size && !b.size) return 1;
  const intersection = [...a].filter((value) => b.has(value)).length;
  return intersection / new Set([...a, ...b]).size;
};

export interface AlignmentCue extends PreEditCue {
  assetId?: string;
}

export interface AlignmentGroupSeed {
  kind: PreEditAlignmentKind;
  companyCues: AlignmentCue[];
  asrCues: AlignmentCue[];
  timeOverlapMs: number;
  textSimilarity: number;
  digest: string;
}

const overlapMs = (left: AlignmentCue, right: AlignmentCue) =>
  Math.max(0, Math.min(left.endMs, right.endMs) - Math.max(left.startMs, right.startMs));

const related = (left: AlignmentCue, right: AlignmentCue, rulePack: PreReviewRulePack) => {
  const overlap = overlapMs(left, right);
  if (overlap > 0) return true;
  const leftCenter = (left.startMs + left.endMs) / 2;
  const rightCenter = (right.startMs + right.endMs) / 2;
  return Math.abs(leftCenter - rightCenter) <= rulePack.alignmentNearbyGapMs
    && textSimilarity(left.text, right.text) >= rulePack.alignmentSimilarityThreshold;
};

export const alignEpisode = (
  companyCues: AlignmentCue[],
  asrCues: AlignmentCue[],
  rulePack: PreReviewRulePack,
): AlignmentGroupSeed[] => {
  const companyEdges = companyCues.map(() => new Set<number>());
  const asrEdges = asrCues.map(() => new Set<number>());
  companyCues.forEach((company, companyIndex) => {
    asrCues.forEach((asr, asrIndex) => {
      if (!related(company, asr, rulePack)) return;
      companyEdges[companyIndex]!.add(asrIndex);
      asrEdges[asrIndex]!.add(companyIndex);
    });
  });

  const visitedCompany = new Set<number>();
  const visitedAsr = new Set<number>();
  const groups: AlignmentGroupSeed[] = [];
  const pushGroup = (companyIndexes: number[], asrIndexes: number[]) => {
    const company = companyIndexes.map((index) => companyCues[index]!).sort((a, b) => a.cueIndex - b.cueIndex);
    const asr = asrIndexes.map((index) => asrCues[index]!).sort((a, b) => a.cueIndex - b.cueIndex);
    const kind: PreEditAlignmentKind = company.length === 0 ? 'asr_only'
      : asr.length === 0 ? 'company_only'
        : company.length === 1 && asr.length === 1 ? 'one_to_one'
          : company.length === 1 ? 'one_company_many_asr'
            : asr.length === 1 ? 'many_company_one_asr'
              : 'uncertain';
    const overlap = company.reduce((total, left) => total
      + asr.reduce((inner, right) => inner + overlapMs(left, right), 0), 0);
    const similarity = textSimilarity(
      company.map((cue) => cue.text).join(' '),
      asr.map((cue) => cue.text).join(' '),
    );
    const identity = {
      kind,
      companyCueIds: company.map((cue) => cue.cueId),
      asrCueIds: asr.map((cue) => cue.cueId),
      overlap,
      similarity: Number(similarity.toFixed(5)),
      algorithmVersion: `pre-review-rule-pack:${sha256(JSON.stringify(rulePack)).slice(0, 16)}`,
    };
    groups.push({ ...identity, companyCues: company, asrCues: asr, timeOverlapMs: overlap,
      textSimilarity: identity.similarity, digest: sha256(JSON.stringify(identity)) });
  };

  companyCues.forEach((_cue, start) => {
    if (visitedCompany.has(start)) return;
    if (!companyEdges[start]!.size) {
      visitedCompany.add(start);
      pushGroup([start], []);
      return;
    }
    const companyQueue = [start];
    const companyIndexes: number[] = [];
    const asrIndexes: number[] = [];
    while (companyQueue.length) {
      const companyIndex = companyQueue.shift()!;
      if (visitedCompany.has(companyIndex)) continue;
      visitedCompany.add(companyIndex);
      companyIndexes.push(companyIndex);
      for (const asrIndex of companyEdges[companyIndex]!) {
        if (!visitedAsr.has(asrIndex)) {
          visitedAsr.add(asrIndex);
          asrIndexes.push(asrIndex);
          for (const linkedCompany of asrEdges[asrIndex]!) {
            if (!visitedCompany.has(linkedCompany)) companyQueue.push(linkedCompany);
          }
        }
      }
    }
    pushGroup(companyIndexes, asrIndexes);
  });
  asrCues.forEach((_cue, index) => {
    if (visitedAsr.has(index)) return;
    visitedAsr.add(index);
    pushGroup([], [index]);
  });
  return groups.sort((left, right) => {
    const leftCue = left.companyCues[0] ?? left.asrCues[0]!;
    const rightCue = right.companyCues[0] ?? right.asrCues[0]!;
    return leftCue.startMs - rightCue.startMs
      || Number(Boolean(right.companyCues.length)) - Number(Boolean(left.companyCues.length))
      || leftCue.cueIndex - rightCue.cueIndex;
  });
};

export const scanFormatIssues = (
  text: string,
  rulePack: PreReviewRulePack,
  timing?: { startMs: number; endMs: number; videoDurationMs?: number | null },
): PreEditFormatIssue[] => {
  const issues: PreEditFormatIssue[] = [];
  const add = (issue: PreEditFormatIssue) => issues.push(issue);
  if (!text.trim()) add({ code: 'empty_text', message: '最终台词为空。', blocking: true, overridable: false });
  if (timing && (timing.startMs < 0 || timing.endMs <= timing.startMs)) {
    add({ code: 'invalid_time', message: '字幕时间无效。', blocking: true, overridable: false });
  }
  if (timing?.videoDurationMs && timing.endMs > timing.videoDurationMs) {
    add({ code: 'after_video_end', message: '字幕结束时间晚于视频终点。', blocking: true, overridable: false });
  }
  if (rulePack.forbidSentencePunctuation && /[，。？！,.?!]/u.test(text)) {
    add({ code: 'hard_punctuation', message: '普通台词不得包含中英文句末标点。', blocking: true, overridable: false });
  }
  if (rulePack.forbidMarkup && /<[^>]+>|\{\\[^}]+\}/u.test(text)) {
    add({ code: 'markup', message: '台词包含 HTML/ASS 格式字符。', blocking: true, overridable: false });
  }
  if (rulePack.forbidBrackets && /[()（）\[\]【】{}]/u.test(text)) {
    add({ code: 'brackets', message: '普通台词不得包含括号。', blocking: true, overridable: false });
  }
  if (text.replace(/\s/gu, '').length > rulePack.maxCharacters) {
    add({ code: 'long_line', message: `去空白后超过 ${rulePack.maxCharacters} 字。`, blocking: true, overridable: true });
  }
  const lines = text.split(/\r?\n/u).filter((line) => line.trim());
  if (rulePack.requireSpeakerDashForMultipleLines
    && lines.length > 1 && lines.some((line) => !line.trimStart().startsWith('-'))) {
    add({ code: 'speaker_dash', message: '多人同轴每行必须以半角 - 开头。', blocking: true, overridable: false });
  }
  return issues;
};

export const effectiveSystemDecision = (input: {
  kind: PreEditAlignmentKind;
  policy: PreEditBaselinePolicy;
  companyCue: AlignmentCue | null;
  asrCues: AlignmentCue[];
}) => {
  if (!input.companyCue) return { action: 'ignore_asr' as const, text: '' };
  const asrText = input.asrCues.map((cue) => cue.text).join(' ').trim();
  const canUseAsr = input.policy === 'asr_text_primary'
    && input.kind === 'one_to_one'
    && Boolean(asrText);
  return canUseAsr
    ? { action: 'use_asr_text' as const, text: asrText }
    : { action: 'keep_company' as const, text: input.companyCue.text };
};

export const resolveDecision = (input: {
  kind: PreEditAlignmentKind;
  action: PreEditDecisionAction;
  text?: string;
  companyCue: AlignmentCue | null;
  asrCues: AlignmentCue[];
}) => {
  const asrText = input.asrCues.map((cue) => cue.text).join(' ').trim();
  if (!input.companyCue) {
    if (!['add_asr', 'ignore_asr'].includes(input.action)) return null;
    return input.action === 'add_asr'
      ? { action: input.action, text: input.text?.trim() || asrText }
      : { action: input.action, text: '' };
  }
  if (!['keep_company', 'use_asr_text', 'custom_text', 'remove_company'].includes(input.action)) return null;
  if (input.action === 'keep_company') return { action: input.action, text: input.companyCue.text };
  if (input.action === 'remove_company') return { action: input.action, text: '' };
  if (input.action === 'custom_text') {
    const text = input.text?.trim() ?? '';
    return text ? { action: input.action, text } : null;
  }
  if (!asrText || ['many_company_one_asr', 'uncertain'].includes(input.kind)) return null;
  return { action: input.action, text: asrText };
};

export interface ReleaseCue {
  startMs: number;
  endMs: number;
  text: string;
}

const renderTime = (milliseconds: number) => {
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
  const seconds = Math.floor((milliseconds % 60_000) / 1_000);
  const millis = milliseconds % 1_000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
};

export const renderSrt = (cues: ReleaseCue[]) => {
  const body = cues.map((cue, index) => [
    String(index + 1),
    `${renderTime(cue.startMs)} --> ${renderTime(cue.endMs)}`,
    cue.text,
  ].join('\r\n')).join('\r\n\r\n');
  return Buffer.from(`\uFEFF${body}${body ? '\r\n' : ''}`, 'utf8');
};
