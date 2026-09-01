exports.shorthands = undefined;

// SYSTEM-09：把旧主/备槽位一次性迁移为不可变有序目标。迁移只读取旧列一次，
// 随后删除旧列；新写路径只使用 routing_policy_targets。
exports.up = (pgm) => {
  pgm.createTable('routing_policy_targets', {
    routing_target_id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    routing_version_id: { type: 'uuid', notNull: true, references: 'routing_policy_versions(id)', onDelete: 'RESTRICT' },
    pool_id: { type: 'varchar(40)', notNull: true },
    deployment_version_id: { type: 'uuid', notNull: true, references: 'engine_deployment_versions(id)', onDelete: 'RESTRICT' },
    priority: { type: 'integer', notNull: true },
    role: { type: 'varchar(20)', notNull: true },
    max_concurrent_jobs: { type: 'integer', notNull: true },
    per_project_max: { type: 'integer', notNull: true },
    queue_limit: { type: 'integer', notNull: true },
  });
  pgm.addConstraint('routing_policy_targets', 'routing_policy_targets_key_unique', { unique: ['routing_version_id', 'priority'] });
  pgm.addConstraint('routing_policy_targets', 'routing_policy_targets_deployment_unique', { unique: ['routing_version_id', 'deployment_version_id'] });
  pgm.addConstraint('routing_policy_targets', 'routing_policy_targets_values_valid', { check: "pool_id IN ('asr_api','ocr_api','ocr_self_hosted_worker') AND priority BETWEEN 1 AND 8 AND role IN ('preferred','standard','emergency') AND max_concurrent_jobs > 0 AND per_project_max > 0 AND queue_limit >= 0" });
  pgm.createIndex('routing_policy_targets', ['routing_version_id', 'pool_id', 'priority'], { name: 'routing_policy_targets_order_idx' });
  pgm.sql(`
    WITH legacy_targets AS (
      SELECT p.routing_version_id, p.pool_id, p.primary_deployment_version_id AS deployment_version_id,
             p.max_concurrent_jobs, p.per_project_max, p.queue_limit, 1 AS legacy_priority
        FROM routing_policy_pools p JOIN routing_policy_versions v ON v.id=p.routing_version_id
       WHERE p.primary_deployment_version_id IS NOT NULL
         AND ((v.workflow_stage='asr' AND p.pool_id='asr_api') OR
              (v.workflow_stage='screen_text' AND p.pool_id IN ('ocr_self_hosted_worker','ocr_api')))
      UNION ALL
      SELECT p.routing_version_id, p.pool_id, p.fallback_deployment_version_id,
             p.max_concurrent_jobs, p.per_project_max, p.queue_limit, 2
        FROM routing_policy_pools p JOIN routing_policy_versions v ON v.id=p.routing_version_id
       WHERE p.fallback_deployment_version_id IS NOT NULL
         AND ((v.workflow_stage='asr' AND p.pool_id='asr_api') OR
              (v.workflow_stage='screen_text' AND p.pool_id IN ('ocr_self_hosted_worker','ocr_api')))
    ), ordered AS (
      SELECT l.*, row_number() OVER (
        PARTITION BY l.routing_version_id
        ORDER BY CASE l.pool_id WHEN 'ocr_self_hosted_worker' THEN 0 WHEN 'ocr_api' THEN 1 ELSE 0 END,
                 l.legacy_priority, l.pool_id, l.deployment_version_id
      )::integer AS priority
      FROM legacy_targets l
    )
    INSERT INTO routing_policy_targets (routing_version_id,pool_id,deployment_version_id,priority,role,max_concurrent_jobs,per_project_max,queue_limit)
    SELECT routing_version_id,pool_id,deployment_version_id,priority,
           CASE WHEN priority=1 THEN 'preferred'::varchar ELSE 'standard'::varchar END,
           max_concurrent_jobs,per_project_max,queue_limit
      FROM ordered;
  `);
  pgm.addColumns('asr_batches', { route_digest: { type: 'varchar(128)' } });
  pgm.addColumns('asr_jobs', { route_digest: { type: 'varchar(128)' } });
  pgm.addColumns('asr_attempts', { routing_target_id: { type: 'uuid', references: 'routing_policy_targets(routing_target_id)', onDelete: 'RESTRICT' }, routing_target_priority: { type: 'integer' } });
  pgm.addColumns('asr_attempts', { effect_class: { type: 'varchar(40)' } });
  pgm.addColumns('screen_text_batches', { route_digest: { type: 'varchar(128)' } });
  pgm.addColumns('screen_text_jobs', { route_digest: { type: 'varchar(128)' } });
  pgm.addColumns('screen_text_attempts', { routing_target_id: { type: 'uuid', references: 'routing_policy_targets(routing_target_id)', onDelete: 'RESTRICT' }, routing_target_priority: { type: 'integer' } });
  pgm.addColumns('screen_text_attempts', { effect_class: { type: 'varchar(40)' } });
  pgm.createTable('routing_advance_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    job_id: { type: 'uuid', notNull: true },
    attempt_id: { type: 'uuid', notNull: true },
    from_target_id: { type: 'uuid', notNull: true, references: 'routing_policy_targets(routing_target_id)', onDelete: 'RESTRICT' },
    to_target_id: { type: 'uuid', notNull: true, references: 'routing_policy_targets(routing_target_id)', onDelete: 'RESTRICT' },
    classification: { type: 'varchar(80)', notNull: true },
    provider_request_id: { type: 'varchar(255)' },
    request_id: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createIndex('routing_advance_events', ['job_id', 'created_at', 'id']);
  pgm.sql(`
    ALTER TABLE routing_policy_pools DROP CONSTRAINT IF EXISTS routing_policy_pools_values_valid;
    ALTER TABLE routing_policy_pools DROP COLUMN primary_deployment_version_id;
    ALTER TABLE routing_policy_pools DROP COLUMN fallback_deployment_version_id;
    ALTER TABLE routing_policy_pools DROP COLUMN max_concurrent_jobs;
    ALTER TABLE routing_policy_pools DROP COLUMN per_project_max;
    ALTER TABLE routing_policy_pools DROP COLUMN queue_limit;
    CREATE OR REPLACE FUNCTION reject_routing_target_change() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'routing target is immutable'; END; $$ LANGUAGE plpgsql;
    CREATE TRIGGER routing_policy_targets_immutable BEFORE UPDATE OR DELETE ON routing_policy_targets FOR EACH ROW EXECUTE FUNCTION reject_routing_target_change();
    CREATE TRIGGER routing_advance_events_immutable BEFORE UPDATE OR DELETE ON routing_advance_events FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
    ALTER TABLE asr_attempts ADD CONSTRAINT asr_attempts_effect_class_valid CHECK (effect_class IS NULL OR effect_class IN ('completed','external_not_accepted','unauthorized','external_unknown','quality_rejected','cancelled'));
    ALTER TABLE screen_text_attempts ADD CONSTRAINT screen_text_attempts_effect_class_valid CHECK (effect_class IS NULL OR effect_class IN ('completed','external_not_accepted','unauthorized','external_unknown','quality_rejected','cancelled'));
  `);
};

exports.down = () => {};
