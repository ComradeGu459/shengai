exports.shorthands = undefined;

// TERM-CONTROL-BACK-118：把一次术语 run 绑定到创建时的 active route，
// 每个 enabled target 预先生成一个稳定 attempt；Worker 只消费这些快照。
exports.up = (pgm) => {
  pgm.addColumns('term_extraction_runs', {
    routing_version_id: { type: 'uuid', references: 'routing_policy_versions(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    route_digest: { type: 'char(64)' },
    config_digest: { type: 'char(64)' },
    route_snapshot: { type: 'jsonb' },
  });
  pgm.addConstraint('term_extraction_runs', 'term_extraction_runs_route_snapshot_valid', {
    check: "(route_digest IS NULL AND config_digest IS NULL AND route_snapshot IS NULL) OR (route_digest ~ '^[0-9a-f]{64}$' AND config_digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(route_snapshot) = 'object' AND route_snapshot ? 'routingVersionId' AND route_snapshot ? 'targets' AND jsonb_typeof(route_snapshot->'targets') = 'array' AND route_snapshot::text !~* 'bearerkey')",
  });
  pgm.createIndex('term_extraction_runs', ['routing_version_id', 'created_at'], { name: 'term_extraction_runs_routing_idx' });

  pgm.createTable('term_extraction_attempts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    run_id: { type: 'uuid', notNull: true, references: 'term_extraction_runs(id)', onDelete: 'CASCADE', onUpdate: 'RESTRICT' },
    routing_target_id: { type: 'uuid', notNull: true },
    deployment_version_id: { type: 'uuid', notNull: true },
    routing_version_id: { type: 'uuid', notNull: true },
    priority: { type: 'integer', notNull: true },
    role: { type: 'varchar(20)', notNull: true },
    adapter: { type: 'varchar(120)', notNull: true },
    adapter_config: { type: 'jsonb', notNull: true },
    config_digest: { type: 'char(64)', notNull: true },
    route_digest: { type: 'char(64)', notNull: true },
    secret_reference_version_id: { type: 'uuid', references: 'system_secret_reference_versions(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    status: { type: 'varchar(20)', notNull: true, default: 'queued' },
    claimed_by: { type: 'varchar(120)' },
    claim_expires_at: { type: 'timestamptz' },
    provider_started_at: { type: 'timestamptz' },
    usage_summary: { type: 'jsonb', notNull: true, default: '{}' },
    error_code: { type: 'varchar(120)' },
    error_detail: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    completed_at: { type: 'timestamptz' },
  });
  pgm.addConstraint('term_extraction_attempts', 'term_extraction_attempts_key_unique', {
    unique: ['run_id', 'routing_target_id'],
  });
  pgm.addConstraint('term_extraction_attempts', 'term_extraction_attempts_values_valid', {
    check: "priority BETWEEN 1 AND 8 AND role IN ('preferred','standard','emergency') AND status IN ('queued','running','succeeded','failed','unknown','skipped') AND config_digest ~ '^[0-9a-f]{64}$' AND route_digest ~ '^[0-9a-f]{64}$' AND adapter_config::text !~* 'bearerkey'",
  });
  pgm.createIndex('term_extraction_attempts', ['status', 'claim_expires_at', 'created_at', 'id'], { name: 'term_extraction_attempts_claim_idx' });
  pgm.createIndex('term_extraction_attempts', ['run_id', 'priority', 'routing_target_id'], { name: 'term_extraction_attempts_order_idx' });
};

// 与现有控制面历史迁移一致，不对线上历史快照做破坏性回滚。
exports.down = () => {};
