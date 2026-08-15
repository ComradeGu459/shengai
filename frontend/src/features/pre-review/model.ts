import type {
  PreEditAlignmentKind,
  PreEditDecisionAction,
  PreEditEpisodeStatus,
  PreEditItem,
  PreEditSessionStatus,
} from '@qimao-terms-cloud/contracts';

export const sessionStatusLabels: Record<PreEditSessionStatus, string> = {
  preparing: '正在准备', ready: '可审改', limited: '有限审改', stale: '来源已变化',
  completed: '整剧已完成', failed: '准备失败',
};

export const episodeStatusLabels: Record<PreEditEpisodeStatus, string> = {
  preparing: '准备中', ready: '待审改', limited: '有限审改', completed: '已完成',
};

export const alignmentLabels: Record<PreEditAlignmentKind, string> = {
  one_to_one: '一对一', one_company_many_asr: '一公司轴对多识别轴',
  many_company_one_asr: '多公司轴对一识别轴', company_only: '仅公司轴',
  asr_only: '仅识别轴', uncertain: '关系待人工确认',
};

export const decisionLabels: Record<PreEditDecisionAction, string> = {
  keep_company: '保留公司稿', use_asr_text: '采用识别文本', custom_text: '手动修改',
  remove_company: '删除公司轴', add_asr: '补入识别轴', ignore_asr: '忽略识别轴',
};

export const statusLabels = { pending: '待处理', blocking: '格式阻断', decided: '已决定', all: '全部' } as const;

export const formatMs = (value: number) => {
  const minutes = Math.floor(value / 60_000);
  const seconds = Math.floor((value % 60_000) / 1_000);
  const milliseconds = value % 1_000;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
};

export const itemTimeRange = (item: PreEditItem) => {
  const cues = item.companyCues.length ? item.companyCues : item.asrCues;
  if (!cues.length) return '无有效时间';
  return `${formatMs(Math.min(...cues.map((cue) => cue.startMs)))}–${formatMs(Math.max(...cues.map((cue) => cue.endMs)))}`;
};

export const itemState = (item: PreEditItem) => {
  if (item.formatIssues.some((issue) => issue.blocking)) return 'blocking';
  if (item.requiresReview) return 'pending';
  return 'decided';
};

export const normalizedTextLength = (text: string) => text.replace(/\s/g, '').length;

export const makeIntent = (signature: string) => ({ signature, key: crypto.randomUUID() });
