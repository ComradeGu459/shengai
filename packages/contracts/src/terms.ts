import { type Static, Type } from '@sinclair/typebox';

export const TermTypeSchema = Type.Union([
  Type.Literal('人名'),
  Type.Literal('地名'),
  Type.Literal('特定物品'),
  Type.Literal('朝代'),
  Type.Literal('组织名'),
  Type.Literal('等级'),
  Type.Literal('物种/种族名'),
  Type.Literal('特殊概念/事件'),
]);

export const TermCandidateStatusSchema = Type.Union([
  Type.Literal('pending'),
  Type.Literal('approved'),
  Type.Literal('edited'),
  Type.Literal('rejected'),
]);

export const TermGenderSchema = Type.Union([
  Type.Literal('male'),
  Type.Literal('female'),
  Type.Literal('unknown'),
]);

export const TermEvidenceSchema = Type.Object({
  cueId: Type.String({ minLength: 64, maxLength: 64 }),
  assetId: Type.String({ format: 'uuid' }),
  episodeNumber: Type.Integer({ minimum: 1, maximum: 100 }),
  cueIndex: Type.Integer({ minimum: 1 }),
  startMs: Type.Integer({ minimum: 0 }),
  endMs: Type.Integer({ minimum: 1 }),
  text: Type.String({ minLength: 1 }),
});

export const TermCandidateSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  draftId: Type.String({ format: 'uuid' }),
  type: TermTypeSchema,
  name: Type.String({ minLength: 1, maxLength: 120 }),
  aliases: Type.Array(Type.String({ minLength: 1, maxLength: 120 })),
  gender: TermGenderSchema,
  note: Type.String({ maxLength: 500 }),
  origin: Type.Union([Type.Literal('extracted'), Type.Literal('manual')]),
  confidence: Type.Union([Type.Number({ minimum: 0, maximum: 1 }), Type.Null()]),
  status: TermCandidateStatusSchema,
  version: Type.Integer({ minimum: 1 }),
  evidenceCount: Type.Integer({ minimum: 1 }),
  firstEvidence: TermEvidenceSchema,
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export const TermDecisionEventSchema = Type.Object({
  id: Type.Integer({ minimum: 1 }),
  action: Type.Union([
    Type.Literal('approved'),
    Type.Literal('edited'),
    Type.Literal('rejected'),
    Type.Literal('restored'),
    Type.Literal('added'),
  ]),
  before: Type.Union([Type.Record(Type.String(), Type.Unknown()), Type.Null()]),
  after: Type.Record(Type.String(), Type.Unknown()),
  actor: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
});

export const TermCandidateDetailSchema = Type.Object({
  ...TermCandidateSchema.properties,
  evidence: Type.Array(TermEvidenceSchema, { minItems: 1 }),
  decisionEvents: Type.Array(TermDecisionEventSchema),
});

export const TermDraftSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  projectId: Type.String({ format: 'uuid' }),
  sourceSrtSetDigest: Type.String({ minLength: 64, maxLength: 64 }),
  promptVersion: Type.String(),
  baseTermVersionId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  status: Type.Union([Type.Literal('active'), Type.Literal('confirmed'), Type.Literal('superseded')]),
  revision: Type.Integer({ minimum: 1 }),
  pendingCount: Type.Integer({ minimum: 0 }),
  candidateCount: Type.Integer({ minimum: 0 }),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export const TermExtractionRunSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  projectId: Type.String({ format: 'uuid' }),
  draftId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  sourceSrtSetDigest: Type.String({ minLength: 64, maxLength: 64 }),
  promptVersion: Type.String(),
  adapter: Type.String(),
  adapterConfig: Type.Record(Type.String(), Type.Unknown()),
  usageSummary: Type.Record(Type.String(), Type.Number({ minimum: 0 })),
  status: Type.Union([Type.Literal('running'), Type.Literal('completed'), Type.Literal('failed')]),
  requestId: Type.String(),
  cueCount: Type.Integer({ minimum: 0 }),
  candidateCount: Type.Integer({ minimum: 0 }),
  diagnostics: Type.Array(Type.String()),
  errorCode: Type.Union([Type.String(), Type.Null()]),
  errorDetail: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  completedAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
});

export const TermSourceStateSchema = Type.Object({
  status: Type.Union([Type.Literal('ready'), Type.Literal('blocked'), Type.Literal('invalid')]),
  manifestId: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  sourceSrtSetDigest: Type.Union([Type.String({ minLength: 64, maxLength: 64 }), Type.Null()]),
  episodeCount: Type.Integer({ minimum: 0 }),
  assetCount: Type.Integer({ minimum: 0 }),
  issueCode: Type.Union([Type.String(), Type.Null()]),
  issueDetail: Type.Union([Type.String(), Type.Null()]),
});

export const TermVersionSummarySchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  projectId: Type.String({ format: 'uuid' }),
  version: Type.Integer({ minimum: 1 }),
  sourceSrtSetDigest: Type.String({ minLength: 64, maxLength: 64 }),
  promptVersion: Type.String(),
  itemCount: Type.Integer({ minimum: 0 }),
  createdAt: Type.String({ format: 'date-time' }),
});

export const TermWorkspaceSchema = Type.Object({
  source: TermSourceStateSchema,
  sourceIsCurrent: Type.Boolean(),
  activeDraft: Type.Union([TermDraftSchema, Type.Null()]),
  latestRun: Type.Union([TermExtractionRunSchema, Type.Null()]),
  latestVersion: Type.Union([TermVersionSummarySchema, Type.Null()]),
});

export const StartTermExtractionBodySchema = Type.Object({
  expectedSourceSrtSetDigest: Type.Optional(Type.String({ minLength: 64, maxLength: 64 })),
}, { additionalProperties: false });

export const StartTermExtractionResultSchema = Type.Object({
  run: TermExtractionRunSchema,
  draft: Type.Union([TermDraftSchema, Type.Null()]),
});

export const TermCandidateDecisionBodySchema = Type.Object({
  expectedVersion: Type.Integer({ minimum: 1 }),
  action: Type.Union([
    Type.Literal('approve'),
    Type.Literal('edit'),
    Type.Literal('reject'),
    Type.Literal('restore'),
  ]),
  type: Type.Optional(TermTypeSchema),
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
  aliases: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 120 }), { maxItems: 30 })),
  gender: Type.Optional(TermGenderSchema),
  note: Type.Optional(Type.String({ maxLength: 500 })),
}, { additionalProperties: false });

export const CreateManualTermCandidateBodySchema = Type.Object({
  draftId: Type.String({ format: 'uuid' }),
  expectedDraftRevision: Type.Integer({ minimum: 1 }),
  type: TermTypeSchema,
  name: Type.String({ minLength: 1, maxLength: 120 }),
  aliases: Type.Array(Type.String({ minLength: 1, maxLength: 120 }), { maxItems: 30 }),
  gender: TermGenderSchema,
  note: Type.String({ maxLength: 500 }),
  evidenceCueIds: Type.Array(Type.String({ minLength: 64, maxLength: 64 }), { minItems: 1, maxItems: 100 }),
}, { additionalProperties: false });

export const BatchTermDecisionBodySchema = Type.Object({
  items: Type.Array(Type.Object({
    candidateId: Type.String({ format: 'uuid' }),
    expectedVersion: Type.Integer({ minimum: 1 }),
    action: Type.Union([Type.Literal('approve'), Type.Literal('reject')]),
  }, { additionalProperties: false }), { minItems: 1, maxItems: 100 }),
}, { additionalProperties: false });

export const BatchTermDecisionResultSchema = Type.Object({
  items: Type.Array(Type.Union([
    Type.Object({ candidateId: Type.String({ format: 'uuid' }), ok: Type.Literal(true), candidate: TermCandidateSchema }),
    Type.Object({
      candidateId: Type.String({ format: 'uuid' }),
      ok: Type.Literal(false),
      error: Type.Object({ code: Type.String(), message: Type.String() }),
    }),
  ])),
});

const QueryLimitSchema = Type.Union([
  Type.Integer({ minimum: 1, maximum: 100 }),
  Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' }),
]);
const QueryOffsetSchema = Type.Union([
  Type.Integer({ minimum: 0 }),
  Type.String({ pattern: '^(?:0|[1-9][0-9]*)$' }),
]);

export const TermCandidateQuerySchema = Type.Object({
  draftId: Type.String({ format: 'uuid' }),
  search: Type.Optional(Type.String({ maxLength: 120 })),
  status: Type.Optional(TermCandidateStatusSchema),
  type: Type.Optional(TermTypeSchema),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('firstEvidence'),
    Type.Literal('name'),
    Type.Literal('type'),
    Type.Literal('status'),
    Type.Literal('updatedAt'),
  ])),
  sortDirection: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
  limit: Type.Optional(QueryLimitSchema),
  offset: Type.Optional(QueryOffsetSchema),
});

export const TermCandidateListSchema = Type.Object({
  items: Type.Array(TermCandidateSchema),
  total: Type.Integer({ minimum: 0 }),
});

export const TermCueSchema = Type.Object({
  cueId: Type.String({ minLength: 64, maxLength: 64 }),
  assetId: Type.String({ format: 'uuid' }),
  episodeNumber: Type.Integer({ minimum: 1, maximum: 100 }),
  cueIndex: Type.Integer({ minimum: 1 }),
  startMs: Type.Integer({ minimum: 0 }),
  endMs: Type.Integer({ minimum: 1 }),
  text: Type.String({ minLength: 1 }),
});

export const TermCueQuerySchema = Type.Object({
  draftId: Type.String({ format: 'uuid' }),
  search: Type.Optional(Type.String({ maxLength: 120 })),
  episodeNumber: Type.Optional(Type.Union([
    Type.Integer({ minimum: 1, maximum: 100 }),
    Type.String({ pattern: '^(?:[1-9]|[1-9][0-9]|100)$' }),
  ])),
  limit: Type.Optional(QueryLimitSchema),
  offset: Type.Optional(QueryOffsetSchema),
}, { additionalProperties: false });

export const TermCueListSchema = Type.Object({
  items: Type.Array(TermCueSchema),
  total: Type.Integer({ minimum: 0 }),
});

export const CreateTermDraftBodySchema = Type.Object({
  baseTermVersionId: Type.String({ format: 'uuid' }),
  expectedSourceSrtSetDigest: Type.String({ minLength: 64, maxLength: 64 }),
}, { additionalProperties: false });

export const ConfirmTermVersionBodySchema = Type.Object({
  draftId: Type.String({ format: 'uuid' }),
  expectedDraftRevision: Type.Integer({ minimum: 1 }),
  expectedSourceSrtSetDigest: Type.String({ minLength: 64, maxLength: 64 }),
}, { additionalProperties: false });

export const PublishTermVersionBodySchema = Type.Object({
  draftId: Type.String({ format: 'uuid' }),
  expectedDraftRevision: Type.Integer({ minimum: 1 }),
  expectedSourceSrtSetDigest: Type.String({ minLength: 64, maxLength: 64 }),
  templateVersionId: Type.String({ format: 'uuid' }),
}, { additionalProperties: false });

export const TermVersionItemSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  type: TermTypeSchema,
  name: Type.String(),
  aliases: Type.Array(Type.String()),
  gender: TermGenderSchema,
  note: Type.String(),
  firstEpisodeNumber: Type.Integer({ minimum: 1 }),
  firstCueIndex: Type.Integer({ minimum: 1 }),
});

export const TermVersionSchema = Type.Object({
  ...TermVersionSummarySchema.properties,
  items: Type.Array(TermVersionItemSchema),
});

export const TermExportFieldSchema = Type.Union([
  Type.Literal('type'),
  Type.Literal('name'),
  Type.Literal('aliases'),
  Type.Literal('gender'),
  Type.Literal('note'),
]);

export const TermExportTemplateColumnSchema = Type.Object({
  field: TermExportFieldSchema,
  header: Type.String({ minLength: 1, maxLength: 120 }),
}, { additionalProperties: false });

export const TermExportTemplateVersionSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  version: Type.Integer({ minimum: 1 }),
  name: Type.String({ minLength: 1, maxLength: 120 }),
  columns: Type.Array(TermExportTemplateColumnSchema, { minItems: 5, maxItems: 5 }),
  isActive: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
});

export const TermExportTemplateListSchema = Type.Object({
  activeTemplateVersionId: Type.String({ format: 'uuid' }),
  items: Type.Array(TermExportTemplateVersionSchema),
});

export const CreateTermExportTemplateBodySchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }),
  columns: Type.Array(TermExportTemplateColumnSchema, { minItems: 5, maxItems: 5 }),
}, { additionalProperties: false });

export const ActivateTermExportTemplateBodySchema = Type.Object({
  expectedActiveTemplateVersionId: Type.String({ format: 'uuid' }),
}, { additionalProperties: false });

export const CreateTermExportBodySchema = Type.Object({
  templateVersionId: Type.String({ format: 'uuid' }),
}, { additionalProperties: false });

export const TermExportSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  projectId: Type.String({ format: 'uuid' }),
  termVersionId: Type.String({ format: 'uuid' }),
  templateVersionId: Type.String({ format: 'uuid' }),
  templateName: Type.String(),
  templateVersion: Type.Integer({ minimum: 1 }),
  columns: Type.Array(TermExportTemplateColumnSchema, { minItems: 5, maxItems: 5 }),
  structureDigest: Type.String({ minLength: 64, maxLength: 64 }),
  createdAt: Type.String({ format: 'date-time' }),
});

export const TermExportListSchema = Type.Object({ items: Type.Array(TermExportSchema) });

export const ConfirmTermVersionResultSchema = Type.Object({ version: TermVersionSchema });
export const PublishTermVersionResultSchema = Type.Object({
  version: TermVersionSchema,
  export: TermExportSchema,
});
export const TermVersionListSchema = Type.Object({ items: Type.Array(TermVersionSchema) });

export type TermType = Static<typeof TermTypeSchema>;
export type TermCandidateStatus = Static<typeof TermCandidateStatusSchema>;
export type TermGender = Static<typeof TermGenderSchema>;
export type TermEvidence = Static<typeof TermEvidenceSchema>;
export type TermCandidate = Static<typeof TermCandidateSchema>;
export type TermCandidateDetail = Static<typeof TermCandidateDetailSchema>;
export type TermDecisionEvent = Static<typeof TermDecisionEventSchema>;
export type TermDraft = Static<typeof TermDraftSchema>;
export type TermExtractionRun = Static<typeof TermExtractionRunSchema>;
export type TermSourceState = Static<typeof TermSourceStateSchema>;
export type TermCandidateDecisionBody = Static<typeof TermCandidateDecisionBodySchema>;
export type CreateManualTermCandidateBody = Static<typeof CreateManualTermCandidateBodySchema>;
export type BatchTermDecisionBody = Static<typeof BatchTermDecisionBodySchema>;
export type TermCandidateQuery = Static<typeof TermCandidateQuerySchema>;
export type TermCue = Static<typeof TermCueSchema>;
export type TermCueQuery = Static<typeof TermCueQuerySchema>;
export type CreateTermDraftBody = Static<typeof CreateTermDraftBodySchema>;
export type ConfirmTermVersionBody = Static<typeof ConfirmTermVersionBodySchema>;
export type PublishTermVersionBody = Static<typeof PublishTermVersionBodySchema>;
export type TermVersionItem = Static<typeof TermVersionItemSchema>;
export type TermVersion = Static<typeof TermVersionSchema>;
export type TermExportField = Static<typeof TermExportFieldSchema>;
export type TermExportTemplateColumn = Static<typeof TermExportTemplateColumnSchema>;
export type TermExportTemplateVersion = Static<typeof TermExportTemplateVersionSchema>;
export type CreateTermExportTemplateBody = Static<typeof CreateTermExportTemplateBodySchema>;
export type ActivateTermExportTemplateBody = Static<typeof ActivateTermExportTemplateBodySchema>;
export type CreateTermExportBody = Static<typeof CreateTermExportBodySchema>;
export type TermExport = Static<typeof TermExportSchema>;
