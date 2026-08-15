import {
  ApiErrorSchema,
  ConfirmMaterialManifestBodySchema,
  MaterialManifestSchema,
  ProjectMaterialStateSchema,
  type ConfirmMaterialManifestBody,
  type MaterialBinding,
} from '@qimao-terms-cloud/contracts';
import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';

import { ProjectRepository } from '../projects/project.repository.js';
import {
  MaterialManifestIdempotencyConflictError,
  MaterialManifestRepository,
  MaterialManifestVersionConflictError,
} from './material.repository.js';

const ProjectParamsSchema = Type.Object({
  projectId: Type.String({ format: 'uuid' }),
});

const IdempotencyHeadersSchema = Type.Object({
  'idempotency-key': Type.String({ minLength: 8, maxLength: 200 }),
});

const normalizeBinding = (binding: MaterialBinding): MaterialBinding => {
  const relativePath = binding.relativePath.trim().replaceAll('\\', '/');
  return {
    ...binding,
    relativePath,
    fileName: binding.fileName.trim(),
    fingerprint: binding.fingerprint.trim(),
  };
};

const normalizeBody = (body: ConfirmMaterialManifestBody): ConfirmMaterialManifestBody => ({
  expectedVersion: body.expectedVersion,
  rootName: body.rootName.trim(),
  bindings: body.bindings
    .map(normalizeBinding)
    .sort((left, right) =>
      left.episodeNumber - right.episodeNumber || left.role.localeCompare(right.role),
    ),
});

const validationMessage = (body: ConfirmMaterialManifestBody) => {
  if (
    !body.rootName
    || body.rootName === '.'
    || body.rootName === '..'
    || body.rootName.includes('/')
    || body.rootName.includes('\\')
  ) {
    return '请选择有效的整剧素材文件夹。';
  }
  const paths = new Map<string, MaterialBinding>();
  const roles = new Set<string>();
  const episodes = new Set<number>();
  for (const binding of body.bindings) {
    if (
      binding.relativePath.startsWith('/')
      || /^[A-Za-z]:\//.test(binding.relativePath)
      || binding.fileName.includes('/')
      || binding.fileName.includes('\\')
    ) {
      return `文件 ${binding.fileName} 必须使用当前文件夹内的相对路径。`;
    }
    const segments = binding.relativePath.split('/');
    if (
      segments.length < 2
      || segments.some((segment) => !segment || segment === '.' || segment === '..')
      || segments[0] !== body.rootName
    ) {
      return `文件 ${binding.fileName} 不属于当前整剧素材根目录。`;
    }
    if (segments.at(-1) !== binding.fileName) {
      return `文件 ${binding.fileName} 与相对路径末段不一致。`;
    }
    const key = `${binding.episodeNumber}:${binding.role}`;
    if (roles.has(key)) return `第 ${binding.episodeNumber} 集的同一素材角色不能重复绑定。`;
    roles.add(key);
    const existingPath = paths.get(binding.relativePath);
    if (existingPath) {
      const sharedVideoRoles = new Set([existingPath.role, binding.role]);
      const canShareVideo = existingPath.episodeNumber === binding.episodeNumber
        && sharedVideoRoles.size === 2
        && sharedVideoRoles.has('asr_video')
        && sharedVideoRoles.has('screen_video')
        && existingPath.mediaType === 'video'
        && binding.mediaType === 'video'
        && existingPath.fileName === binding.fileName
        && existingPath.sizeBytes === binding.sizeBytes
        && existingPath.lastModifiedMs === binding.lastModifiedMs
        && existingPath.fingerprint === binding.fingerprint;
      if (!canShareVideo) return `文件 ${binding.relativePath} 不能跨集或跨类型重复绑定。`;
    } else {
      paths.set(binding.relativePath, binding);
    }
    episodes.add(binding.episodeNumber);
    const expectedMediaType = binding.role === 'company_srt' ? 'srt' : 'video';
    if (binding.mediaType !== expectedMediaType) return `文件 ${binding.fileName} 的类型与素材角色不匹配。`;
    const expectedExtension = expectedMediaType === 'srt' ? '.srt' : '.mp4';
    if (!binding.fileName.toLowerCase().endsWith(expectedExtension)) {
      return `文件 ${binding.fileName} 不是本切片允许的 ${expectedExtension} 文件。`;
    }
    const expectedFingerprint = `${binding.relativePath}|${binding.sizeBytes}|${binding.lastModifiedMs}`;
    if (binding.fingerprint !== expectedFingerprint) return `文件 ${binding.fileName} 的元数据指纹无效。`;
  }
  for (const episode of episodes) {
    if (!roles.has(`${episode}:company_srt`)) return `第 ${episode} 集缺少公司字幕 SRT。`;
    if (!roles.has(`${episode}:asr_video`)) return `第 ${episode} 集缺少中文识别视频。`;
  }
  return null;
};

export const materialRoutes: FastifyPluginAsyncTypebox = async (app) => {
  const projects = new ProjectRepository(app.database);
  const manifests = new MaterialManifestRepository(app.database);

  app.get(
    '/api/projects/:projectId/material-manifest',
    {
      schema: {
        params: ProjectParamsSchema,
        response: { 200: ProjectMaterialStateSchema, 404: ApiErrorSchema, 500: ApiErrorSchema },
      },
    },
    async (request, reply) => {
      const project = await projects.findById(request.params.projectId);
      if (!project) {
        return reply.code(404).send({
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: '项目不存在或已被清理。',
            retryable: false,
            action: 'return_to_projects',
            requestId: request.id,
          },
        });
      }
      return { project, manifest: await manifests.latest(project.id) };
    },
  );

  app.post(
    '/api/projects/:projectId/material-manifests/confirm',
    {
      schema: {
        params: ProjectParamsSchema,
        headers: IdempotencyHeadersSchema,
        body: ConfirmMaterialManifestBodySchema,
        response: {
          200: MaterialManifestSchema,
          201: MaterialManifestSchema,
          400: ApiErrorSchema,
          404: ApiErrorSchema,
          409: ApiErrorSchema,
          500: ApiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const project = await projects.findById(request.params.projectId);
      if (!project) {
        return reply.code(404).send({
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: '项目不存在或已被清理。',
            retryable: false,
            action: 'return_to_projects',
            requestId: request.id,
          },
        });
      }
      if (project.lifecycleStatus !== 'active') {
        return reply.code(409).send({
          error: {
            code: 'PROJECT_NOT_ACTIVE',
            message: '项目当前不可修改，请返回项目中心检查生命周期状态。',
            retryable: false,
            action: 'return_to_projects',
            requestId: request.id,
          },
        });
      }
      const body = normalizeBody(request.body);
      const invalid = validationMessage(body);
      if (invalid) {
        return reply.code(400).send({
          error: {
            code: 'MATERIAL_MANIFEST_INVALID',
            message: invalid ?? '请选择有效的整剧素材文件夹。',
            retryable: false,
            action: 'edit_material_pairing',
            requestId: request.id,
          },
        });
      }
      try {
        const result = await manifests.confirm({
          projectId: project.id,
          idempotencyKey: request.headers['idempotency-key'],
          actor: 'local-user',
          body,
        });
        return reply.code(result.created ? 201 : 200).send(result.manifest);
      } catch (error) {
        if (error instanceof MaterialManifestVersionConflictError) {
          return reply.code(409).send({
            error: {
              code: 'MATERIAL_MANIFEST_VERSION_CONFLICT',
              message: error.message,
              retryable: false,
              action: 'reload_latest_manifest',
              requestId: request.id,
            },
          });
        }
        if (error instanceof MaterialManifestIdempotencyConflictError) {
          return reply.code(409).send({
            error: {
              code: 'IDEMPOTENCY_KEY_REUSED',
              message: error.message,
              retryable: false,
              action: 'retry_with_new_idempotency_key',
              requestId: request.id,
            },
          });
        }
        throw error;
      }
    },
  );
};
