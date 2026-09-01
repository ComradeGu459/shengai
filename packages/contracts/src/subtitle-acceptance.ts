import { Type, type Static } from '@sinclair/typebox';

import { ScreenTextReleaseExclusionSchema } from './screen-text.js';

const Uuid = () => Type.String({ format: 'uuid' });
const Digest = () => Type.String({ pattern: '^[0-9a-f]{64}$' });
const Timestamp = () => Type.String({ format: 'date-time' });
const EpisodeNumber = () => Type.Integer({ minimum: 1, maximum: 100 });

export const AcceptanceTrackSchema = Type.Union([Type.Literal('dialogue'), Type.Literal('screen_text')]);
export type AcceptanceTrack = Static<typeof AcceptanceTrackSchema>;
export const AcceptanceSessionStatusSchema = Type.Union([
  Type.Literal('draft'), Type.Literal('preflighting'), Type.Literal('ready_to_release'),
  Type.Literal('released'), Type.Literal('stale'), Type.Literal('blocked'),
]);
export type AcceptanceSessionStatus = Static<typeof AcceptanceSessionStatusSchema>;
export const AcceptanceEpisodeStatusSchema = Type.Union([
  Type.Literal('not_started'), Type.Literal('in_review'), Type.Literal('changes_pending'),
  Type.Literal('blocked'), Type.Literal('rework_required'), Type.Literal('passed'),
]);
export type AcceptanceEpisodeStatus = Static<typeof AcceptanceEpisodeStatusSchema>;

export const AcceptanceCueSchema = Type.Object({
  id: Uuid(), episodeNumber: EpisodeNumber(), track: AcceptanceTrackSchema,
  ordinal: Type.Integer({ minimum: 1 }), startMs: Type.Integer({ minimum: 0 }),
  endMs: Type.Integer({ minimum: 1 }), text: Type.String(),
  sourceCueId: Type.Union([Type.String({ minLength: 1, maxLength: 128 }), Type.Null()]),
  revision: Type.Integer({ minimum: 1 }), deleted: Type.Boolean(),
}, { additionalProperties: false });
export type AcceptanceCue = Static<typeof AcceptanceCueSchema>;

export const AcceptanceIssueCodeSchema = Type.Union([
  Type.Literal('invalid_time'), Type.Literal('after_video_end'), Type.Literal('empty_text'),
  Type.Literal('track_overlap'), Type.Literal('shared_endpoint'), Type.Literal('duration_too_short'),
  Type.Literal('duration_too_long'), Type.Literal('gap_too_short'), Type.Literal('forbidden_markup'),
  Type.Literal('hard_punctuation'), Type.Literal('source_missing'), Type.Literal('video_missing'),
  Type.Literal('video_duration_unknown'), Type.Literal('screen_text_pair_incomplete'), Type.Literal('manual'),
]);
export type AcceptanceIssueCode = Static<typeof AcceptanceIssueCodeSchema>;
export const AcceptanceIssueSchema = Type.Object({
  id: Uuid(), episodeNumber: EpisodeNumber(), origin: Type.Union([Type.Literal('automatic'), Type.Literal('manual')]),
  code: AcceptanceIssueCodeSchema, severity: Type.Union([Type.Literal('error'), Type.Literal('warning')]),
  track: Type.Union([AcceptanceTrackSchema, Type.Null()]), cueId: Type.Union([Uuid(), Type.Null()]),
  timeMs: Type.Union([Type.Integer({ minimum: 0 }), Type.Null()]), note: Type.String(),
  status: Type.Union([Type.Literal('open'), Type.Literal('resolved'), Type.Literal('waived')]),
  resolutionReason: Type.Union([Type.String(), Type.Null()]), createdAt: Timestamp(), updatedAt: Timestamp(),
}, { additionalProperties: false });
export type AcceptanceIssue = Static<typeof AcceptanceIssueSchema>;

export const AcceptanceVideoSchema = Type.Object({
  assetId: Uuid(), role: Type.Union([Type.Literal('asr_video'), Type.Literal('screen_video')]),
  checksum: Type.String({ minLength: 1, maxLength: 128 }),
}, { additionalProperties: false });
export const AcceptanceEpisodeSchema = Type.Object({
  id: Uuid(), episodeNumber: EpisodeNumber(), status: AcceptanceEpisodeStatusSchema,
  availableVideos: Type.Array(AcceptanceVideoSchema, { maxItems: 2 }), selectedVideoAssetId: Type.Union([Uuid(), Type.Null()]),
  authoritativeDurationMs: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]),
  dialogueCueCount: Type.Integer({ minimum: 0 }), screenTextCueCount: Type.Integer({ minimum: 0 }),
  openErrorCount: Type.Integer({ minimum: 0 }), openWarningCount: Type.Integer({ minimum: 0 }),
  passSignature: Type.Union([Digest(), Type.Null()]), revision: Type.Integer({ minimum: 1 }), updatedAt: Timestamp(),
}, { additionalProperties: false });
export type AcceptanceEpisode = Static<typeof AcceptanceEpisodeSchema>;

export const AcceptanceSourceSnapshotSchema = Type.Object({
  preEditReleaseId: Uuid(), preEditReleaseVersion: Type.Integer({ minimum: 1 }), preEditHeadReleaseId: Uuid(),
  screenTextReleaseId: Type.Union([Uuid(), Type.Null()]), screenTextReleaseVersion: Type.Union([Type.Integer({ minimum: 1 }), Type.Null()]), screenTextHeadReleaseId: Type.Union([Uuid(), Type.Null()]),
  screenTextExcludedEpisodes: Type.Array(ScreenTextReleaseExclusionSchema),
  manifestId: Uuid(), manifestVersion: Type.Integer({ minimum: 1 }), termVersionId: Uuid(), termVersion: Type.Integer({ minimum: 1 }),
  ruleVersion: Type.String({ minLength: 1, maxLength: 80 }), sourceDigest: Digest(),
}, { additionalProperties: false });
export type AcceptanceSourceSnapshot = Static<typeof AcceptanceSourceSnapshotSchema>;
export const AcceptanceSessionSchema = Type.Object({
  id: Uuid(), projectId: Uuid(), projectVersion: Type.Integer({ minimum: 1 }), status: AcceptanceSessionStatusSchema,
  source: AcceptanceSourceSnapshotSchema, revision: Type.Integer({ minimum: 1 }),
  episodeCounts: Type.Object({ total: Type.Integer({ minimum: 0 }), passed: Type.Integer({ minimum: 0 }), blocked: Type.Integer({ minimum: 0 }), reworkRequired: Type.Integer({ minimum: 0 }) }, { additionalProperties: false }),
  createdAt: Timestamp(), updatedAt: Timestamp(),
}, { additionalProperties: false });
export type AcceptanceSession = Static<typeof AcceptanceSessionSchema>;
export const AcceptanceSessionDetailSchema = Type.Intersect([AcceptanceSessionSchema, Type.Object({ episodes: Type.Array(AcceptanceEpisodeSchema) }, { additionalProperties: false })]);
export type AcceptanceSessionDetail = Static<typeof AcceptanceSessionDetailSchema>;
export const AcceptanceSessionListSchema = Type.Object({ items: Type.Array(AcceptanceSessionSchema) }, { additionalProperties: false });
export const AcceptanceEpisodeDetailSchema = Type.Object({ episode: AcceptanceEpisodeSchema, cues: Type.Array(AcceptanceCueSchema), issues: Type.Array(AcceptanceIssueSchema) }, { additionalProperties: false });

export const CreateAcceptanceSessionBodySchema = Type.Object({ expectedProjectVersion: Type.Integer({ minimum: 1 }), preEditReleaseId: Type.Optional(Uuid()), screenTextReleaseId: Type.Optional(Type.Union([Uuid(), Type.Null()])) }, { additionalProperties: false });
export type CreateAcceptanceSessionBody = Static<typeof CreateAcceptanceSessionBodySchema>;
export const AcceptanceCommandResultSchema = Type.Object({ session: AcceptanceSessionDetailSchema, replay: Type.Boolean() }, { additionalProperties: false });

const CueDraftSchema = Type.Object({ track: AcceptanceTrackSchema, startMs: Type.Integer({ minimum: 0 }), endMs: Type.Integer({ minimum: 1 }), text: Type.String({ maxLength: 5_000 }) }, { additionalProperties: false });
export const AcceptanceCueOperationSchema = Type.Union([
  Type.Object({ kind: Type.Literal('update'), cueId: Uuid(), text: Type.Optional(Type.String({ maxLength: 5_000 })), startMs: Type.Optional(Type.Integer({ minimum: 0 })), endMs: Type.Optional(Type.Integer({ minimum: 1 })) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('move'), cueId: Uuid(), deltaMs: Type.Integer() }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('add'), cue: CueDraftSchema }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('delete'), cueIds: Type.Array(Uuid(), { minItems: 1, maxItems: 100, uniqueItems: true }) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('cut'), cueIds: Type.Array(Uuid(), { minItems: 1, maxItems: 100, uniqueItems: true }) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal('paste'), cues: Type.Array(CueDraftSchema, { minItems: 1, maxItems: 100 }) }, { additionalProperties: false }),
]);
export type AcceptanceCueOperation = Static<typeof AcceptanceCueOperationSchema>;
export const ApplyAcceptanceCueCommandBodySchema = Type.Object({ expectedSessionRevision: Type.Integer({ minimum: 1 }), expectedEpisodeRevision: Type.Integer({ minimum: 1 }), operations: Type.Array(AcceptanceCueOperationSchema, { minItems: 1, maxItems: 100 }) }, { additionalProperties: false });
export type ApplyAcceptanceCueCommandBody = Static<typeof ApplyAcceptanceCueCommandBodySchema>;
export const AcceptanceEpisodeCommandResultSchema = Type.Object({ episode: AcceptanceEpisodeDetailSchema, replay: Type.Boolean() }, { additionalProperties: false });
export const UndoAcceptanceEditBodySchema = Type.Object({ expectedSessionRevision: Type.Integer({ minimum: 1 }), expectedEpisodeRevision: Type.Integer({ minimum: 1 }), eventId: Uuid() }, { additionalProperties: false });
export type UndoAcceptanceEditBody = Static<typeof UndoAcceptanceEditBodySchema>;
export const RedoAcceptanceEditBodySchema = UndoAcceptanceEditBodySchema;
export type RedoAcceptanceEditBody = Static<typeof RedoAcceptanceEditBodySchema>;
export const AcceptanceEditEventSchema = Type.Object({
  id: Uuid(), kind: Type.Union([Type.Literal('edit'), Type.Literal('undo'), Type.Literal('redo'), Type.Literal('issue'), Type.Literal('video'), Type.Literal('pass'), Type.Literal('bulk_pass')]),
  reversesEventId: Type.Union([Uuid(), Type.Null()]), restoresEventId: Type.Union([Uuid(), Type.Null()]),
  actor: Type.String(), createdAt: Timestamp(),
}, { additionalProperties: false });
export const AcceptanceEditEventListSchema = Type.Object({ items: Type.Array(AcceptanceEditEventSchema) }, { additionalProperties: false });
export const CreateAcceptanceIssueBodySchema = Type.Object({ expectedSessionRevision: Type.Integer({ minimum: 1 }), expectedEpisodeRevision: Type.Integer({ minimum: 1 }), track: Type.Optional(AcceptanceTrackSchema), cueId: Type.Optional(Uuid()), timeMs: Type.Optional(Type.Integer({ minimum: 0 })), note: Type.String({ minLength: 1, maxLength: 2_000 }) }, { additionalProperties: false });
export type CreateAcceptanceIssueBody = Static<typeof CreateAcceptanceIssueBodySchema>;
export const ResolveAcceptanceIssueBodySchema = Type.Object({ expectedSessionRevision: Type.Integer({ minimum: 1 }), expectedEpisodeRevision: Type.Integer({ minimum: 1 }), status: Type.Union([Type.Literal('resolved'), Type.Literal('waived')]), reason: Type.String({ minLength: 8, maxLength: 500 }) }, { additionalProperties: false });
export type ResolveAcceptanceIssueBody = Static<typeof ResolveAcceptanceIssueBodySchema>;
export const SelectAcceptanceVideoBodySchema = Type.Object({ expectedSessionRevision: Type.Integer({ minimum: 1 }), expectedEpisodeRevision: Type.Integer({ minimum: 1 }), assetId: Uuid() }, { additionalProperties: false });
export type SelectAcceptanceVideoBody = Static<typeof SelectAcceptanceVideoBodySchema>;

export const AcceptancePreflightEpisodeSchema = Type.Object({ episodeNumber: EpisodeNumber(), eligible: Type.Boolean(), errorCodes: Type.Array(AcceptanceIssueCodeSchema), warningCodes: Type.Array(AcceptanceIssueCodeSchema) }, { additionalProperties: false });
export const AcceptancePreflightSchema = Type.Object({ sessionId: Uuid(), sessionRevision: Type.Integer({ minimum: 1 }), stale: Type.Boolean(), canRelease: Type.Boolean(), eligibleEpisodeNumbers: Type.Array(EpisodeNumber()), episodes: Type.Array(AcceptancePreflightEpisodeSchema) }, { additionalProperties: false });
export const PassAcceptanceEpisodeBodySchema = Type.Object({ expectedSessionRevision: Type.Integer({ minimum: 1 }), expectedEpisodeRevision: Type.Integer({ minimum: 1 }) }, { additionalProperties: false });
export type PassAcceptanceEpisodeBody = Static<typeof PassAcceptanceEpisodeBodySchema>;
export const PassAcceptanceEpisodesBodySchema = Type.Object({ expectedSessionRevision: Type.Integer({ minimum: 1 }), episodeNumbers: Type.Optional(Type.Array(EpisodeNumber(), { minItems: 1, maxItems: 100, uniqueItems: true })) }, { additionalProperties: false });
export type PassAcceptanceEpisodesBody = Static<typeof PassAcceptanceEpisodesBodySchema>;
export const PassAcceptanceEpisodesResultSchema = Type.Object({ session: AcceptanceSessionDetailSchema, passedEpisodeNumbers: Type.Array(EpisodeNumber()), blockedEpisodeNumbers: Type.Array(EpisodeNumber()), replay: Type.Boolean() }, { additionalProperties: false });
export const CreateAcceptanceReworkBodySchema = Type.Object({ expectedSessionRevision: Type.Integer({ minimum: 1 }), episodeNumbers: Type.Array(EpisodeNumber(), { minItems: 1, maxItems: 100, uniqueItems: true }), tracks: Type.Array(AcceptanceTrackSchema, { minItems: 1, maxItems: 2, uniqueItems: true }), reason: Type.String({ minLength: 8, maxLength: 2_000 }) }, { additionalProperties: false });
export type CreateAcceptanceReworkBody = Static<typeof CreateAcceptanceReworkBodySchema>;
export const AcceptanceReworkSchema = Type.Object({ id: Uuid(), sessionId: Uuid(), episodeNumbers: Type.Array(EpisodeNumber()), tracks: Type.Array(AcceptanceTrackSchema), reason: Type.String(), createdAt: Timestamp() }, { additionalProperties: false });
export const AcceptanceReworkCommandResultSchema = Type.Object({ rework: AcceptanceReworkSchema, replay: Type.Boolean() }, { additionalProperties: false });
export const AcceptanceReworkListSchema = Type.Object({ items: Type.Array(AcceptanceReworkSchema) }, { additionalProperties: false });
export const AcceptanceReleaseSchema = Type.Object({ id: Uuid(), projectId: Uuid(), sessionId: Uuid(), version: Type.Integer({ minimum: 1 }), sourceDigest: Digest(), acceptanceDigest: Digest(), cueCount: Type.Integer({ minimum: 0 }), createdAt: Timestamp() }, { additionalProperties: false });
export const AcceptanceReleaseListSchema = Type.Object({ items: Type.Array(AcceptanceReleaseSchema) }, { additionalProperties: false });
export const CreateAcceptancePlaybackGrantBodySchema = Type.Object({ expectedSessionRevision: Type.Integer({ minimum: 1 }) }, { additionalProperties: false });
export type CreateAcceptancePlaybackGrantBody = Static<typeof CreateAcceptancePlaybackGrantBodySchema>;
export const AcceptancePlaybackGrantSchema = Type.Object({ assetId: Uuid(), episodeNumber: EpisodeNumber(), url: Type.String(), expiresAt: Timestamp() }, { additionalProperties: false });
