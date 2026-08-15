import { Static, Type } from '@sinclair/typebox';

const Uuid = () => Type.String({ format: 'uuid' });
const Digest = () => Type.String({ pattern: '^[0-9a-f]{64}$' });
const Timestamp = () => Type.String({ format: 'date-time' });

export const PreEditSessionStatusSchema = Type.Union([
  Type.Literal('preparing'), Type.Literal('ready'), Type.Literal('limited'),
  Type.Literal('stale'), Type.Literal('completed'), Type.Literal('failed'),
]);
export type PreEditSessionStatus = Static<typeof PreEditSessionStatusSchema>;

export const PreEditEpisodeStatusSchema = Type.Union([
  Type.Literal('preparing'), Type.Literal('ready'), Type.Literal('limited'),
  Type.Literal('completed'),
]);
export type PreEditEpisodeStatus = Static<typeof PreEditEpisodeStatusSchema>;

export const PreEditAlignmentKindSchema = Type.Union([
  Type.Literal('one_to_one'), Type.Literal('one_company_many_asr'),
  Type.Literal('many_company_one_asr'), Type.Literal('company_only'),
  Type.Literal('asr_only'), Type.Literal('uncertain'),
]);
export type PreEditAlignmentKind = Static<typeof PreEditAlignmentKindSchema>;

export const PreEditBaselinePolicySchema = Type.Union([
  Type.Literal('company_primary'), Type.Literal('asr_text_primary'),
]);
export type PreEditBaselinePolicy = Static<typeof PreEditBaselinePolicySchema>;

export const PreEditDecisionActionSchema = Type.Union([
  Type.Literal('keep_company'), Type.Literal('use_asr_text'), Type.Literal('custom_text'),
  Type.Literal('remove_company'), Type.Literal('add_asr'), Type.Literal('ignore_asr'),
]);
export type PreEditDecisionAction = Static<typeof PreEditDecisionActionSchema>;

export const PreEditCueSchema = Type.Object({
  cueId: Type.String({ minLength: 1, maxLength: 64 }),
  cueIndex: Type.Integer({ minimum: 1 }),
  startMs: Type.Integer({ minimum: 0 }),
  endMs: Type.Integer({ minimum: 1 }),
  text: Type.String({ minLength: 1 }),
  confidence: Type.Union([Type.Number({ minimum: 0, maximum: 1 }), Type.Null()]),
}, { additionalProperties: false });
export type PreEditCue = Static<typeof PreEditCueSchema>;

export const PreEditFormatIssueSchema = Type.Object({
  code: Type.Union([
    Type.Literal('empty_text'), Type.Literal('invalid_time'), Type.Literal('after_video_end'),
    Type.Literal('hard_punctuation'), Type.Literal('markup'), Type.Literal('brackets'),
    Type.Literal('long_line'), Type.Literal('speaker_dash'),
  ]),
  message: Type.String(),
  blocking: Type.Boolean(),
  overridable: Type.Boolean(),
}, { additionalProperties: false });
export type PreEditFormatIssue = Static<typeof PreEditFormatIssueSchema>;

export const PreEditAsrIdentitySchema = Type.Object({
  resultId: Uuid(),
  resultDigest: Digest(),
  assetId: Uuid(),
  termVersionId: Uuid(),
  provider: Type.String(),
  adapter: Type.String(),
  model: Type.String(),
  language: Type.String(),
  configDigest: Digest(),
  hotwordDigest: Digest(),
  qualityStatus: Type.Union([Type.Literal('pass'), Type.Literal('warning')]),
}, { additionalProperties: false });
export type PreEditAsrIdentity = Static<typeof PreEditAsrIdentitySchema>;

export const PreEditEpisodeSchema = Type.Object({
  id: Uuid(),
  sessionId: Uuid(),
  episodeNumber: Type.Integer({ minimum: 1, maximum: 100 }),
  companyAssetId: Uuid(),
  asr: Type.Union([PreEditAsrIdentitySchema, Type.Null()]),
  videoAssetId: Type.Union([Uuid(), Type.Null()]),
  videoDurationMs: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
  videoDurationStatus: Type.Union([Type.Literal('known'), Type.Literal('unknown')]),
  status: PreEditEpisodeStatusSchema,
  limitedReason: Type.Union([Type.String(), Type.Null()]),
  policyOverride: Type.Union([PreEditBaselinePolicySchema, Type.Null()]),
  effectivePolicy: PreEditBaselinePolicySchema,
  completionSignature: Type.Union([Digest(), Type.Null()]),
  revision: Type.Integer({ minimum: 1 }),
  counts: Type.Object({
    total: Type.Integer({ minimum: 0 }),
    pending: Type.Integer({ minimum: 0 }),
    blocking: Type.Integer({ minimum: 0 }),
    decided: Type.Integer({ minimum: 0 }),
  }, { additionalProperties: false }),
  updatedAt: Timestamp(),
}, { additionalProperties: false });
export type PreEditEpisode = Static<typeof PreEditEpisodeSchema>;

export const PreEditSessionSchema = Type.Object({
  id: Uuid(),
  projectId: Uuid(),
  projectVersion: Type.Integer({ minimum: 1 }),
  sourceSrtSetDigest: Digest(),
  termVersionId: Uuid(),
  manifestId: Uuid(),
  manifestVersion: Type.Integer({ minimum: 1 }),
  sourceDigest: Digest(),
  algorithmVersion: Type.String(),
  formatPolicyVersion: Type.String(),
  status: PreEditSessionStatusSchema,
  defaultPolicy: PreEditBaselinePolicySchema,
  revision: Type.Integer({ minimum: 1 }),
  errorCode: Type.Union([Type.String(), Type.Null()]),
  errorDetail: Type.Union([Type.String(), Type.Null()]),
  episodeCounts: Type.Object({
    total: Type.Integer({ minimum: 0 }),
    completed: Type.Integer({ minimum: 0 }),
    limited: Type.Integer({ minimum: 0 }),
  }, { additionalProperties: false }),
  createdAt: Timestamp(),
  updatedAt: Timestamp(),
}, { additionalProperties: false });
export type PreEditSession = Static<typeof PreEditSessionSchema>;

export const PreEditSessionDetailSchema = Type.Intersect([
  PreEditSessionSchema,
  Type.Object({ episodes: Type.Array(PreEditEpisodeSchema) }, { additionalProperties: false }),
]);
export type PreEditSessionDetail = Static<typeof PreEditSessionDetailSchema>;

export const PreEditSessionCommandResultSchema = Type.Object({
  session: PreEditSessionDetailSchema,
  replay: Type.Boolean(),
}, { additionalProperties: false });

export const PreEditSessionListSchema = Type.Object({
  items: Type.Array(PreEditSessionSchema),
  total: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const PreEditItemSchema = Type.Object({
  id: Uuid(),
  sessionId: Uuid(),
  episodeId: Uuid(),
  episodeNumber: Type.Integer({ minimum: 1, maximum: 100 }),
  groupId: Uuid(),
  groupKind: PreEditAlignmentKindSchema,
  groupDigest: Digest(),
  targetCompanyCueId: Type.Union([Type.String({ minLength: 1, maxLength: 64 }), Type.Null()]),
  companyCues: Type.Array(PreEditCueSchema),
  asrCues: Type.Array(PreEditCueSchema),
  timeOverlapMs: Type.Integer({ minimum: 0 }),
  textSimilarity: Type.Number({ minimum: 0, maximum: 1 }),
  policyOverride: Type.Union([PreEditBaselinePolicySchema, Type.Null()]),
  effectivePolicy: PreEditBaselinePolicySchema,
  systemAction: PreEditDecisionActionSchema,
  systemText: Type.String(),
  currentAction: PreEditDecisionActionSchema,
  currentText: Type.String(),
  decisionOrigin: Type.Union([Type.Literal('system'), Type.Literal('human')]),
  currentDecisionEventId: Type.Union([Uuid(), Type.Null()]),
  requiresReview: Type.Boolean(),
  termEvidence: Type.Array(Type.Object({
    termItemId: Uuid(),
    type: Type.String({ minLength: 1 }),
    name: Type.String({ minLength: 1 }),
    matchedForms: Type.Array(Type.String({ minLength: 1 }), { uniqueItems: true }),
    companyMatched: Type.Boolean(),
    asrMatched: Type.Boolean(),
    conflict: Type.Boolean(),
  }, { additionalProperties: false })),
  formatIssues: Type.Array(PreEditFormatIssueSchema),
  formatOverrideReason: Type.Union([Type.String(), Type.Null()]),
  version: Type.Integer({ minimum: 1 }),
  updatedAt: Timestamp(),
}, { additionalProperties: false });
export type PreEditItem = Static<typeof PreEditItemSchema>;

export const PreEditDecisionEventSchema = Type.Object({
  id: Uuid(),
  sessionId: Uuid(),
  episodeId: Uuid(),
  itemId: Uuid(),
  eventKind: Type.Union([
    Type.Literal('baseline'), Type.Literal('policy'), Type.Literal('decision'), Type.Literal('undo'),
  ]),
  action: PreEditDecisionActionSchema,
  origin: Type.Union([Type.Literal('system'), Type.Literal('human')]),
  beforeState: Type.Record(Type.String(), Type.Unknown()),
  afterState: Type.Record(Type.String(), Type.Unknown()),
  reversesEventId: Type.Union([Uuid(), Type.Null()]),
  createdAt: Timestamp(),
}, { additionalProperties: false });

export const PreEditDecisionEventListSchema = Type.Object({
  items: Type.Array(PreEditDecisionEventSchema),
}, { additionalProperties: false });

export const PreEditItemQuerySchema = Type.Object({
  episodeNumber: Type.Union([
    Type.Integer({ minimum: 1, maximum: 100 }),
    Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' }),
  ]),
  status: Type.Optional(Type.Union([
    Type.Literal('pending'), Type.Literal('blocking'), Type.Literal('decided'), Type.Literal('all'),
  ], { default: 'all' })),
  search: Type.Optional(Type.String({ maxLength: 120 })),
  limit: Type.Optional(Type.Union([
    Type.Integer({ minimum: 1, maximum: 100 }),
    Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' }),
  ])),
  offset: Type.Optional(Type.Union([
    Type.Integer({ minimum: 0 }),
    Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' }),
  ])),
}, { additionalProperties: false });
export type PreEditItemQuery = Static<typeof PreEditItemQuerySchema>;

export const PreEditItemListSchema = Type.Object({
  items: Type.Array(PreEditItemSchema),
  total: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const CreatePreEditSessionBodySchema = Type.Object({
  termVersionId: Uuid(),
  expectedProjectVersion: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });
export type CreatePreEditSessionBody = Static<typeof CreatePreEditSessionBodySchema>;

export const RetryPreEditPreparationBodySchema = Type.Object({
  expectedSessionRevision: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });
export type RetryPreEditPreparationBody = Static<typeof RetryPreEditPreparationBodySchema>;

export const ApplyPreEditPolicyBodySchema = Type.Object({
  expectedSessionRevision: Type.Integer({ minimum: 1 }),
  scope: Type.Union([Type.Literal('series'), Type.Literal('episodes'), Type.Literal('item')]),
  policy: PreEditBaselinePolicySchema,
  episodeNumbers: Type.Optional(Type.Array(Type.Integer({ minimum: 1, maximum: 100 }), {
    minItems: 1, maxItems: 100, uniqueItems: true,
  })),
  itemId: Type.Optional(Uuid()),
}, { additionalProperties: false });
export type ApplyPreEditPolicyBody = Static<typeof ApplyPreEditPolicyBodySchema>;

export const ApplyPreEditPolicyResultSchema = Type.Object({
  session: PreEditSessionSchema,
  affectedItemCount: Type.Integer({ minimum: 0 }),
  systemDecisionCount: Type.Integer({ minimum: 0 }),
  protectedHumanDecisionCount: Type.Integer({ minimum: 0 }),
  safeUpdateCount: Type.Integer({ minimum: 0 }),
  requiresHumanDecisionCount: Type.Integer({ minimum: 0 }),
  replay: Type.Boolean(),
}, { additionalProperties: false });

export const PreviewPreEditPolicyResultSchema = Type.Object({
  sessionId: Uuid(),
  sessionRevision: Type.Integer({ minimum: 1 }),
  scope: Type.Union([Type.Literal('series'), Type.Literal('episodes'), Type.Literal('item')]),
  policy: PreEditBaselinePolicySchema,
  affectedItemCount: Type.Integer({ minimum: 0 }),
  safeUpdateCount: Type.Integer({ minimum: 0 }),
  protectedHumanDecisionCount: Type.Integer({ minimum: 0 }),
  requiresHumanDecisionCount: Type.Integer({ minimum: 0 }),
}, { additionalProperties: false });

export const PreEditItemCommandResultSchema = Type.Object({
  item: PreEditItemSchema,
  replay: Type.Boolean(),
}, { additionalProperties: false });

export const CreatePreEditDecisionBodySchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1 }),
  action: PreEditDecisionActionSchema,
  text: Type.Optional(Type.String({ maxLength: 2_000 })),
  formatOverrideReason: Type.Optional(Type.String({ minLength: 8, maxLength: 500 })),
}, { additionalProperties: false });
export type CreatePreEditDecisionBody = Static<typeof CreatePreEditDecisionBodySchema>;

export const UndoPreEditDecisionBodySchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1 }),
  decisionEventId: Uuid(),
}, { additionalProperties: false });
export type UndoPreEditDecisionBody = Static<typeof UndoPreEditDecisionBodySchema>;

export const CompletePreEditEpisodeBodySchema = Type.Object({
  expectedEpisodeRevision: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });
export type CompletePreEditEpisodeBody = Static<typeof CompletePreEditEpisodeBodySchema>;

export const CompletePreEditEpisodeResultSchema = Type.Object({
  episode: PreEditEpisodeSchema,
  replay: Type.Boolean(),
}, { additionalProperties: false });

export const CreatePreEditReleaseBodySchema = Type.Object({
  expectedSessionRevision: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });
export type CreatePreEditReleaseBody = Static<typeof CreatePreEditReleaseBodySchema>;

export const PreEditReleaseFileSchema = Type.Object({
  episodeNumber: Type.Integer({ minimum: 1, maximum: 100 }),
  fileName: Type.String(),
  cueCount: Type.Integer({ minimum: 0 }),
  contentDigest: Digest(),
  downloadUrl: Type.String(),
}, { additionalProperties: false });

export const PreEditReleaseSchema = Type.Object({
  id: Uuid(),
  projectId: Uuid(),
  sessionId: Uuid(),
  version: Type.Integer({ minimum: 1 }),
  sourceDigest: Digest(),
  decisionDigest: Digest(),
  releaseDigest: Digest(),
  files: Type.Array(PreEditReleaseFileSchema),
  createdAt: Timestamp(),
}, { additionalProperties: false });
export type PreEditRelease = Static<typeof PreEditReleaseSchema>;

export const PreEditReleaseCommandResultSchema = Type.Object({
  release: PreEditReleaseSchema,
  replay: Type.Boolean(),
}, { additionalProperties: false });

export const PreEditReleaseListSchema = Type.Object({ items: Type.Array(PreEditReleaseSchema) }, {
  additionalProperties: false,
});

export const CreatePreEditPlaybackGrantBodySchema = Type.Object({
  expectedSessionRevision: Type.Integer({ minimum: 1 }),
}, { additionalProperties: false });

export const PreEditPlaybackGrantSchema = Type.Object({
  assetId: Uuid(),
  episodeNumber: Type.Integer({ minimum: 1, maximum: 100 }),
  url: Type.String(),
  expiresAt: Timestamp(),
  seek: Type.Object({
    startMs: Type.Integer({ minimum: 0 }),
    contextEndMs: Type.Integer({ minimum: 0 }),
  }, { additionalProperties: false }),
}, { additionalProperties: false });
