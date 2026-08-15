import { type Static, Type } from '@sinclair/typebox';

import { ProjectSchema } from './projects.js';

export const MaterialRoleSchema = Type.Union([
  Type.Literal('company_srt'),
  Type.Literal('asr_video'),
  Type.Literal('screen_video'),
]);

export const MaterialMediaTypeSchema = Type.Union([
  Type.Literal('srt'),
  Type.Literal('video'),
]);

export const MaterialBindingSchema = Type.Object(
  {
    episodeNumber: Type.Integer({ minimum: 1, maximum: 100 }),
    role: MaterialRoleSchema,
    relativePath: Type.String({ minLength: 1, maxLength: 500 }),
    fileName: Type.String({ minLength: 1, maxLength: 255 }),
    sizeBytes: Type.Integer({ minimum: 1 }),
    lastModifiedMs: Type.Integer({ minimum: 1 }),
    fingerprint: Type.String({ minLength: 1, maxLength: 700 }),
    mediaType: MaterialMediaTypeSchema,
  },
  { additionalProperties: false },
);

export const ConfirmMaterialManifestBodySchema = Type.Object(
  {
    expectedVersion: Type.Integer({ minimum: 0 }),
    rootName: Type.String({ minLength: 1, maxLength: 255 }),
    bindings: Type.Array(MaterialBindingSchema, { minItems: 2, maxItems: 300 }),
  },
  { additionalProperties: false },
);

export const MaterialManifestSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  projectId: Type.String({ format: 'uuid' }),
  version: Type.Integer({ minimum: 1 }),
  rootName: Type.String(),
  episodeCount: Type.Integer({ minimum: 1 }),
  bindingCount: Type.Integer({ minimum: 1 }),
  confirmedAt: Type.String({ format: 'date-time' }),
  createdBy: Type.String(),
  bindings: Type.Array(MaterialBindingSchema),
  assetBindings: Type.Array(Type.Object({
    manifestId: Type.String({ format: 'uuid' }),
    episodeNumber: Type.Integer({ minimum: 1, maximum: 100 }),
    role: MaterialRoleSchema,
    assetId: Type.String({ format: 'uuid' }),
    sourceFingerprint: Type.String(),
    boundAt: Type.String({ format: 'date-time' }),
  })),
});

export const ProjectMaterialStateSchema = Type.Object({
  project: ProjectSchema,
  manifest: Type.Union([MaterialManifestSchema, Type.Null()]),
});

export type MaterialRole = Static<typeof MaterialRoleSchema>;
export type MaterialMediaType = Static<typeof MaterialMediaTypeSchema>;
export type MaterialBinding = Static<typeof MaterialBindingSchema>;
export type ConfirmMaterialManifestBody = Static<typeof ConfirmMaterialManifestBodySchema>;
export type MaterialManifest = Static<typeof MaterialManifestSchema>;
export type MaterialAssetBinding = MaterialManifest['assetBindings'][number];
export type ProjectMaterialState = Static<typeof ProjectMaterialStateSchema>;
