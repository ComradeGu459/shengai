import type {
  AsrBatchPreparation,
  AsrBatchPreparationQuery,
  AsrBatchStatus,
  AsrEligibilityList,
  AsrProjectEligibilitySearchItem,
  AsrProjectEligibilitySearchQuery,
  AsrProjectEligibilityStatus,
  AsrProjectEligibility,
} from '@qimao-terms-cloud/contracts';
import type { PoolClient, QueryResultRow } from 'pg';

import type { DatabasePool } from '../../database/pool.js';
import type { AsrAdapterDescriptor } from './asr-adapter.js';
import { asrConflict, asrInvalid, asrNotFound } from './asr-errors.js';
import { applyAsrHotwordCapabilities, buildHotwordProjection } from './asr-hotwords.js';

export const normalizeDispatchProjectIds = (projectIds: string[]) =>
  [...new Set(projectIds)].sort((left, right) => left.localeCompare(right));

const blocker = (code: string, message: string, action: string) => ({ code, message, action });

interface EligibilitySearchRow extends QueryResultRow {
  project_id: string | null;
  project_name: string | null;
  workflow_status: AsrProjectEligibilitySearchItem['workflowStatus'] | null;
  lifecycle_status: AsrProjectEligibilitySearchItem['lifecycleStatus'] | null;
  eligibility_status: AsrProjectEligibilityStatus | null;
  latest_batch_id: string | null;
  latest_batch_status: AsrBatchStatus | null;
  latest_batch_total_episodes: number | null;
  latest_batch_result_episodes: number | null;
  latest_batch_created_at: Date | null;
  latest_batch_updated_at: Date | null;
  effective_updated_at: Date | null;
  total_count: string;
}

interface PreparationSourceRow extends QueryResultRow {
  episode_number: number;
  slot_exists: boolean;
  asset_id: string | null;
  original_filename: string | null;
  media_kind: string | null;
  checksum_value: string | null;
  verified_at: Date | null;
}

export class AsrEligibilityRepository {
  constructor(
    private readonly pool: DatabasePool,
    private readonly adapterDescriptor: Readonly<AsrAdapterDescriptor>,
  ) {}

  async evaluateWithClient(
    client: PoolClient,
    projectId: string,
  ): Promise<AsrProjectEligibility> {
    const project = await client.query<{ name: string; lifecycle_status: string }>(
      'SELECT name, lifecycle_status FROM projects WHERE id = $1',
      [projectId],
    );
    if (!project.rows[0]) {
      return {
        projectId,
        projectName: null,
        eligible: false,
        termVersionId: null,
        manifestId: null,
        totalEpisodeCount: 0,
        readyEpisodeCount: 0,
        newJobCount: 0,
        reusableResultCount: 0,
        activeBatchCount: 0,
        hotwords: null,
        blockers: [blocker('ASR_PROJECT_NOT_FOUND', '项目不存在。', 'reload_projects')],
      };
    }

    const blockers: AsrProjectEligibility['blockers'] = [];
    if (project.rows[0].lifecycle_status !== 'active') {
      blockers.push(blocker('ASR_PROJECT_NOT_ACTIVE', '项目已进入回收流程。', 'restore_project'));
    }
    const termVersion = await client.query<{ id: string }>(
      `SELECT version.id FROM term_versions version
         JOIN term_drafts draft ON draft.id = version.draft_id
        WHERE version.project_id = $1 AND draft.status = 'confirmed'
        ORDER BY version.version DESC, version.id DESC LIMIT 1`,
      [projectId],
    );
    const manifest = await client.query<{ id: string }>(
      'SELECT id FROM material_manifests WHERE project_id = $1 ORDER BY version DESC, id DESC LIMIT 1',
      [projectId],
    );
    if (!manifest.rows[0]) {
      blockers.push(blocker('ASR_SOURCE_NOT_READY', '项目还没有已确认素材清单。', 'confirm_materials'));
    }

    let totalEpisodeCount = 0;
    let readyEpisodeCount = 0;
    let reusableResultCount = 0;
    let hotwords: AsrProjectEligibility['hotwords'] = null;
    if (manifest.rows[0]) {
      const episodes = await client.query<{ episode_number: number }>(
        `SELECT DISTINCT episode_number
           FROM material_manifest_bindings
          WHERE manifest_id = $1
          ORDER BY episode_number`,
        [manifest.rows[0].id],
      );
      totalEpisodeCount = episodes.rowCount ?? 0;
      if (totalEpisodeCount === 0) {
        blockers.push(blocker('ASR_BATCH_SCOPE_EMPTY', '素材清单中没有可识别集数。', 'confirm_materials'));
      } else {
        const sources = await client.query<{ episode_number: number; asset_id: string | null }>(
          `SELECT episode.episode_number, asset.id AS asset_id
             FROM unnest($2::integer[]) AS episode(episode_number)
             LEFT JOIN material_manifest_bindings slot
               ON slot.manifest_id = $1 AND slot.episode_number = episode.episode_number
              AND slot.role = 'asr_video'
             LEFT JOIN material_asset_bindings binding
               ON binding.manifest_id = slot.manifest_id
              AND binding.episode_number = slot.episode_number AND binding.role = slot.role
             LEFT JOIN assets asset
               ON asset.id = binding.asset_id AND asset.media_kind = 'video'
              AND asset.verified_at IS NOT NULL
            ORDER BY episode.episode_number`,
          [manifest.rows[0].id, episodes.rows.map((row) => row.episode_number)],
        );
        readyEpisodeCount = sources.rows.filter((source) => source.asset_id !== null).length;
        if (readyEpisodeCount !== totalEpisodeCount) {
          blockers.push(blocker(
            'ASR_VIDEO_NOT_READY',
            `仍有 ${totalEpisodeCount - readyEpisodeCount} 集中文识别视频未完成校验。`,
            'prepare_asr_videos',
          ));
        }
        {
          const projection = applyAsrHotwordCapabilities(
            await buildHotwordProjection(client, termVersion.rows[0]?.id ?? null),
            this.adapterDescriptor,
          );
          hotwords = projection.summary;
          const readySources = sources.rows.filter(
            (source): source is { episode_number: number; asset_id: string } => source.asset_id !== null,
          );
          if (readySources.length > 0) {
            const reusable = await client.query<{ count: string }>(
              `SELECT COUNT(*)::text AS count
                 FROM unnest($2::integer[], $3::uuid[]) AS source(episode_number, asset_id)
                WHERE EXISTS (
                  SELECT 1 FROM asr_results result
                   WHERE result.project_id = $1
                     AND result.episode_number = source.episode_number
                     AND result.asset_id = source.asset_id
                     AND result.term_version_id IS NOT DISTINCT FROM $4
                     AND result.config_digest = $5
                     AND result.hotword_digest = $6
                     AND result.quality_status IN ('pass','warning')
                )`,
              [projectId,
                readySources.map((source) => source.episode_number),
                readySources.map((source) => source.asset_id),
                termVersion.rows[0]?.id ?? null,
                this.adapterDescriptor.configDigest,
                projection.summary.digest],
            );
            reusableResultCount = Number(reusable.rows[0]!.count);
          }
        }
      }
    }

    const activeBatches = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM asr_batches
        WHERE project_id = $1 AND status IN ('queued','running','cancel_requested')`,
      [projectId],
    );
    const activeBatchCount = Number(activeBatches.rows[0]!.count);
    if (activeBatchCount > 0) {
      blockers.push(blocker(
        'ASR_BATCH_ALREADY_ACTIVE',
        '项目已有排队中或执行中的中文识别批次。',
        'view_asr_batches',
      ));
    }

    return {
      projectId,
      projectName: project.rows[0].name,
      eligible: blockers.length === 0,
      termVersionId: termVersion.rows[0]?.id ?? null,
      manifestId: manifest.rows[0]?.id ?? null,
      totalEpisodeCount,
      readyEpisodeCount,
      newJobCount: Math.max(0, readyEpisodeCount - reusableResultCount),
      reusableResultCount,
      activeBatchCount,
      hotwords,
      blockers,
    };
  }

  async evaluateProject(projectId: string) {
    const client = await this.pool.connect();
    try {
      return await this.evaluateWithClient(client, projectId);
    } finally {
      client.release();
    }
  }

  async evaluate(projectIds: string[]): Promise<AsrEligibilityList> {
    const normalizedProjectIds = normalizeDispatchProjectIds(projectIds);
    const client = await this.pool.connect();
    try {
      const items: AsrProjectEligibility[] = [];
      for (const projectId of normalizedProjectIds) {
        items.push(await this.evaluateWithClient(client, projectId));
      }
      return {
        items,
        counts: {
          selectedProjects: items.length,
          eligibleProjects: items.filter((item) => item.eligible).length,
          blockedProjects: items.filter((item) => !item.eligible).length,
          totalEpisodes: items.reduce((total, item) => total + item.totalEpisodeCount, 0),
          newJobs: items.reduce((total, item) => total + item.newJobCount, 0),
          reusableResults: items.reduce((total, item) => total + item.reusableResultCount, 0),
        },
      };
    } finally {
      client.release();
    }
  }

  async prepareBatchWithClient(
    client: PoolClient,
    projectId: string,
    query: AsrBatchPreparationQuery,
  ): Promise<AsrBatchPreparation> {
    const project = await client.query<{ lifecycle_status: string }>(
      'SELECT lifecycle_status FROM projects WHERE id = $1',
      [projectId],
    );
    if (!project.rows[0]) throw asrNotFound('ASR_PROJECT_NOT_FOUND', '项目不存在。');
    if (project.rows[0].lifecycle_status !== 'active') {
      throw asrConflict('ASR_PROJECT_NOT_ACTIVE', '项目已进入回收流程，不能准备识别批次。', 'restore_project');
    }
    const termVersion = query.termVersionId !== undefined && query.termVersionId !== null
      ? await client.query<{ id: string }>(
        `SELECT version.id FROM term_versions version JOIN term_drafts draft ON draft.id = version.draft_id
          WHERE version.id = $1 AND version.project_id = $2 AND draft.status = 'confirmed'`,
        [query.termVersionId, projectId],
      )
      : await client.query<{ id: string }>(
        `SELECT version.id FROM term_versions version JOIN term_drafts draft ON draft.id = version.draft_id
          WHERE version.project_id = $1 AND draft.status = 'confirmed'
          ORDER BY version.version DESC, version.id DESC LIMIT 1`,
        [projectId],
      );
    const lockedTermVersionId = query.termVersionId === null
      ? null
      : termVersion.rows[0]?.id ?? null;
    if (query.termVersionId !== undefined && query.termVersionId !== null && !lockedTermVersionId) {
      throw asrInvalid(
        'ASR_TERM_VERSION_NOT_FOUND',
        '必须选择属于当前项目的已确认术语版本。',
        'select_term_version',
      );
    }
    const manifest = await client.query<{ id: string; version: number }>(
      `SELECT id, version FROM material_manifests
        WHERE project_id = $1 ORDER BY version DESC, id DESC LIMIT 1`,
      [projectId],
    );
    if (!manifest.rows[0]) {
      throw asrInvalid('ASR_SOURCE_NOT_READY', '项目还没有已确认素材清单。', 'confirm_materials');
    }
    const episodeRows = await client.query<{ episode_number: number }>(
      `SELECT DISTINCT episode_number FROM material_manifest_bindings
        WHERE manifest_id = $1 ORDER BY episode_number LIMIT 100`,
      [manifest.rows[0].id],
    );
    const episodeNumbers = episodeRows.rows.map((row) => row.episode_number);
    if (episodeNumbers.length === 0) {
      throw asrInvalid('ASR_BATCH_SCOPE_EMPTY', '素材清单中没有可识别集数。');
    }
    const sources = await client.query<PreparationSourceRow>(
      `SELECT requested.episode_number,
              (slot.episode_number IS NOT NULL) AS slot_exists,
              asset.id AS asset_id, asset.original_filename, asset.media_kind,
              asset.checksum_value, asset.verified_at
         FROM unnest($2::integer[]) AS requested(episode_number)
         LEFT JOIN material_manifest_bindings slot
           ON slot.manifest_id = $1 AND slot.episode_number = requested.episode_number
          AND slot.role = 'asr_video'
         LEFT JOIN material_asset_bindings binding
           ON binding.manifest_id = slot.manifest_id
          AND binding.episode_number = slot.episode_number AND binding.role = slot.role
         LEFT JOIN assets asset ON asset.id = binding.asset_id
        ORDER BY requested.episode_number`,
      [manifest.rows[0].id, episodeNumbers],
    );
    const hotwords = applyAsrHotwordCapabilities(
      await buildHotwordProjection(client, lockedTermVersionId),
      this.adapterDescriptor,
    );
    const readySources = sources.rows.filter(
      (source): source is PreparationSourceRow & { asset_id: string } => Boolean(
        source.slot_exists
        && source.asset_id
        && source.verified_at
        && source.media_kind === 'video'
        && source.original_filename
        && source.checksum_value,
      ),
    );
    const reusableResults = new Map<string, string>();
    if (readySources.length > 0) {
      const reusable = await client.query<{
        episode_number: number; asset_id: string; result_id: string;
      }>(
        `SELECT DISTINCT ON (result.episode_number, result.asset_id)
                result.episode_number, result.asset_id, result.id AS result_id
           FROM asr_results result
           JOIN unnest($2::integer[], $3::uuid[]) AS source(episode_number, asset_id)
             ON source.episode_number = result.episode_number AND source.asset_id = result.asset_id
          WHERE result.project_id = $1 AND result.term_version_id IS NOT DISTINCT FROM $4
            AND result.config_digest = $5 AND result.hotword_digest = $6
            AND result.quality_status IN ('pass','warning')
          ORDER BY result.episode_number, result.asset_id, result.revision DESC, result.id DESC`,
        [projectId,
          readySources.map((source) => source.episode_number),
          readySources.map((source) => source.asset_id),
          lockedTermVersionId,
          this.adapterDescriptor.configDigest,
          hotwords.summary.digest],
      );
      for (const row of reusable.rows) {
        reusableResults.set(`${row.episode_number}:${row.asset_id}`, row.result_id);
      }
    }
    const forceNewRecognition = query.forceNewRecognition === true
      || query.forceNewRecognition === 'true';
    const episodes = sources.rows.map((source): AsrBatchPreparation['episodes'][number] => {
      const blockers: AsrBatchPreparation['episodes'][number]['blockers'] = [];
      if (!source.slot_exists) {
        blockers.push({
          code: 'ASR_VIDEO_SLOT_MISSING',
          message: `第 ${source.episode_number} 集没有中文识别视频槽位。`,
          action: 'prepare_asr_videos',
        });
      } else if (!source.asset_id || !source.verified_at || source.media_kind !== 'video'
        || !source.original_filename || !source.checksum_value) {
        blockers.push({
          code: 'ASR_VIDEO_NOT_READY',
          message: `第 ${source.episode_number} 集中文识别视频尚未完成服务端校验。`,
          action: 'prepare_asr_videos',
        });
      }
      const reusableResultId = source.asset_id
        ? reusableResults.get(`${source.episode_number}:${source.asset_id}`) ?? null
        : null;
      return {
        episodeNumber: source.episode_number,
        assetId: source.asset_id,
        assetOriginalFilename: source.original_filename,
        assetChecksum: source.checksum_value,
        status: blockers.length > 0
          ? 'blocked'
          : reusableResultId && !forceNewRecognition ? 'reusable' : 'executable',
        reusableResultId,
        blockers,
      };
    });
    const executable = episodes.filter((episode) => episode.status === 'executable').length;
    const reusable = episodes.filter((episode) => episode.status === 'reusable').length;
    const blocked = episodes.filter((episode) => episode.status === 'blocked').length;
    return {
      projectId,
      termVersionId: lockedTermVersionId,
      manifestId: manifest.rows[0].id,
      manifestVersion: manifest.rows[0].version,
      provider: this.adapterDescriptor.provider,
      adapter: this.adapterDescriptor.adapter,
      model: this.adapterDescriptor.model,
      language: this.adapterDescriptor.language,
      configDigest: this.adapterDescriptor.configDigest,
      forceNewRecognition,
      hotwords: hotwords.summary,
      counts: {
        total: episodes.length,
        executable,
        reusable,
        blocked,
        newJobs: executable,
      },
      episodes,
    };
  }

  async prepareBatch(projectId: string, query: AsrBatchPreparationQuery) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const preparation = await this.prepareBatchWithClient(client, projectId, query);
      await client.query('COMMIT');
      return preparation;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async search(query: AsrProjectEligibilitySearchQuery) {
    const values: unknown[] = [];
    const predicates = ['TRUE'];
    const search = query.search?.trim();
    if (search) {
      values.push(`%${search}%`);
      predicates.push(`project_name ILIKE $${values.length}`);
    }
    if (query.eligibilityStatus) {
      values.push(query.eligibilityStatus);
      predicates.push(`eligibility_status = $${values.length}`);
    }
    if (query.lifecycleStatus) {
      values.push(query.lifecycleStatus);
      predicates.push(`lifecycle_status = $${values.length}`);
    }
    if (query.workflowStatus) {
      values.push(query.workflowStatus);
      predicates.push(`workflow_status = $${values.length}`);
    }
    const sortBy = query.sortBy ?? 'actionPriority';
    const direction = (query.sortDirection ?? (sortBy === 'name' ? 'asc' : 'desc')) === 'asc'
      ? 'ASC'
      : 'DESC';
    const sortExpression = sortBy === 'name'
      ? 'project_name'
      : sortBy === 'updatedAt'
        ? 'effective_updated_at'
        : `CASE eligibility_status
            WHEN 'failed' THEN 6
            WHEN 'eligible' THEN 5
            WHEN 'active' THEN 4
            WHEN 'missing_terms' THEN 3
            WHEN 'missing_videos' THEN 2
            ELSE 1 END`;
    values.push(Number(query.limit ?? 50), Number(query.offset ?? 0));
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const result = await client.query<EligibilitySearchRow>(
        `WITH project_projection AS (
           SELECT project.id AS project_id, project.name AS project_name,
                  project.workflow_status, project.lifecycle_status,
                  term_version.id AS term_version_id,
                  manifest.id AS manifest_id,
                  COALESCE(manifest.total_episodes, 0) AS total_episodes,
                  COALESCE(manifest.ready_episodes, 0) AS ready_episodes,
                  COALESCE(active_batch.count, 0) AS active_batch_count,
                  latest_batch.id AS latest_batch_id,
                  latest_batch.status AS latest_batch_status,
                  latest_batch.total_episodes AS latest_batch_total_episodes,
                  latest_batch.result_episodes AS latest_batch_result_episodes,
                  latest_batch.created_at AS latest_batch_created_at,
                  latest_batch.updated_at AS latest_batch_updated_at,
                  GREATEST(project.updated_at, COALESCE(latest_batch.updated_at, project.updated_at))
                    AS effective_updated_at
             FROM projects project
             LEFT JOIN LATERAL (
               SELECT id FROM term_versions
                WHERE project_id = project.id ORDER BY version DESC, id DESC LIMIT 1
             ) term_version ON TRUE
             LEFT JOIN LATERAL (
               SELECT material.id,
                      (SELECT COUNT(DISTINCT slot.episode_number)::integer
                         FROM material_manifest_bindings slot
                        WHERE slot.manifest_id = material.id) AS total_episodes,
                      (SELECT COUNT(DISTINCT slot.episode_number)::integer
                         FROM material_manifest_bindings slot
                         JOIN material_asset_bindings binding
                           ON binding.manifest_id = slot.manifest_id
                          AND binding.episode_number = slot.episode_number
                          AND binding.role = slot.role
                         JOIN assets asset ON asset.id = binding.asset_id
                        WHERE slot.manifest_id = material.id AND slot.role = 'asr_video'
                          AND asset.media_kind = 'video' AND asset.verified_at IS NOT NULL)
                        AS ready_episodes
                 FROM material_manifests material
                WHERE material.project_id = project.id
                ORDER BY material.version DESC, material.id DESC LIMIT 1
             ) manifest ON TRUE
             LEFT JOIN LATERAL (
               SELECT COUNT(*)::integer AS count FROM asr_batches batch
                WHERE batch.project_id = project.id
                  AND batch.status IN ('queued','running','cancel_requested')
             ) active_batch ON TRUE
             LEFT JOIN LATERAL (
               SELECT batch.id, batch.status,
                      cardinality(batch.episode_numbers)::integer AS total_episodes,
                      COUNT(*) FILTER (WHERE job.current_result_id IS NOT NULL)::integer
                        AS result_episodes,
                      batch.created_at, batch.updated_at
                 FROM asr_batches batch
                 LEFT JOIN asr_jobs job ON job.batch_id = batch.id
                WHERE batch.project_id = project.id
                GROUP BY batch.id
                ORDER BY batch.created_at DESC, batch.id DESC LIMIT 1
             ) latest_batch ON TRUE
            WHERE project.lifecycle_status <> 'purged'
         ), classified AS (
           SELECT *, CASE
             WHEN lifecycle_status <> 'active' THEN 'blocked'
             WHEN active_batch_count > 0 THEN 'active'
             WHEN manifest_id IS NULL OR total_episodes = 0 OR ready_episodes <> total_episodes
               THEN 'missing_videos'
             WHEN latest_batch_status IN ('failed','partial','reconciliation_required') THEN 'failed'
             ELSE 'eligible' END AS eligibility_status
             FROM project_projection
         ), filtered AS (
           SELECT * FROM classified WHERE ${predicates.join(' AND ')}
         ), page AS (
           SELECT * FROM filtered
            ORDER BY ${sortExpression} ${direction}, effective_updated_at DESC, project_id DESC
            LIMIT $${values.length - 1} OFFSET $${values.length}
         )
         SELECT page.*, totals.total_count
           FROM (SELECT COUNT(*)::text AS total_count FROM filtered) totals
           LEFT JOIN page ON TRUE
          ORDER BY ${sortExpression} ${direction}, effective_updated_at DESC, project_id DESC`,
        values,
      );
      const items: AsrProjectEligibilitySearchItem[] = [];
      for (const row of result.rows) {
        if (!row.project_id) continue;
        items.push({
          projectId: row.project_id,
          projectName: row.project_name!,
          workflowStatus: row.workflow_status!,
          lifecycleStatus: row.lifecycle_status!,
          eligibilityStatus: row.eligibility_status!,
          eligibility: await this.evaluateWithClient(client, row.project_id),
          latestBatch: row.latest_batch_id ? {
            id: row.latest_batch_id,
            status: row.latest_batch_status!,
            totalEpisodes: row.latest_batch_total_episodes ?? 0,
            resultEpisodes: row.latest_batch_result_episodes ?? 0,
            createdAt: row.latest_batch_created_at!.toISOString(),
            updatedAt: row.latest_batch_updated_at!.toISOString(),
          } : null,
          updatedAt: row.effective_updated_at!.toISOString(),
        });
      }
      await client.query('COMMIT');
      return { items, total: Number(result.rows[0]?.total_count ?? 0) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
