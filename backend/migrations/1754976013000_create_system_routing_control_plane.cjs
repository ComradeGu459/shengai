exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('system_routing_status', ['draft', 'testing', 'impact_checked', 'approved', 'active', 'retired']);
  pgm.createTable('routing_policy_versions', {
    id: { type: 'uuid', primaryKey: true },
    environment: { type: 'varchar(40)', notNull: true },
    workflow_stage: { type: 'varchar(40)', notNull: true },
    version: { type: 'integer', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('routing_policy_versions', 'routing_policy_versions_key_unique', { unique: ['environment', 'workflow_stage', 'version'] });
  pgm.addConstraint('routing_policy_versions', 'routing_policy_versions_stage_valid', { check: "environment = 'development' AND workflow_stage IN ('asr','screen_text') AND version >= 1" });
  pgm.createTable('routing_policy_pools', {
    routing_version_id: { type: 'uuid', notNull: true, references: 'routing_policy_versions(id)', onDelete: 'RESTRICT' },
    pool_id: { type: 'varchar(40)', notNull: true },
    primary_deployment_version_id: { type: 'uuid', references: 'engine_deployment_versions(id)', onDelete: 'RESTRICT' },
    fallback_deployment_version_id: { type: 'uuid', references: 'engine_deployment_versions(id)', onDelete: 'RESTRICT' },
    max_concurrent_jobs: { type: 'integer', notNull: true },
    per_project_max: { type: 'integer', notNull: true },
    queue_limit: { type: 'integer', notNull: true },
  });
  pgm.addConstraint('routing_policy_pools', 'routing_policy_pools_pk', { primaryKey: ['routing_version_id', 'pool_id'] });
  pgm.addConstraint('routing_policy_pools', 'routing_policy_pools_values_valid', { check: "pool_id IN ('asr_api','ocr_api','ocr_self_hosted_worker') AND max_concurrent_jobs > 0 AND per_project_max > 0 AND queue_limit >= 0" });
  pgm.createTable('routing_policy_status_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    routing_version_id: { type: 'uuid', notNull: true, references: 'routing_policy_versions(id)', onDelete: 'RESTRICT' },
    status: { type: 'system_routing_status', notNull: true },
    request_id: { type: 'varchar(255)', notNull: true },
    actor_subject: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createIndex('routing_policy_status_events', ['routing_version_id', 'created_at', 'id']);
  pgm.createTable('active_control_plane_pointers', {
    environment: { type: 'varchar(40)', notNull: true },
    workflow_stage: { type: 'varchar(40)', notNull: true },
    routing_version_id: { type: 'uuid', notNull: true, references: 'routing_policy_versions(id)', onDelete: 'RESTRICT' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('active_control_plane_pointers', 'active_control_plane_pointers_pk', { primaryKey: ['environment', 'workflow_stage'] });
  pgm.addConstraint('active_control_plane_pointers', 'active_control_plane_pointers_stage_valid', { check: "environment = 'development' AND workflow_stage IN ('asr','screen_text')" });
  pgm.createTable('routing_policy_impact_snapshots', {
    routing_version_id: { type: 'uuid', primaryKey: true, references: 'routing_policy_versions(id)', onDelete: 'RESTRICT' },
    snapshot: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.sql(`
    CREATE TRIGGER routing_policy_versions_immutable BEFORE UPDATE OR DELETE ON routing_policy_versions FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
    CREATE TRIGGER routing_policy_pools_immutable BEFORE UPDATE OR DELETE ON routing_policy_pools FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
    CREATE TRIGGER routing_policy_status_events_immutable BEFORE UPDATE OR DELETE ON routing_policy_status_events FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
    CREATE TRIGGER routing_policy_impact_immutable BEFORE UPDATE OR DELETE ON routing_policy_impact_snapshots FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
  `);

  pgm.addColumns('asr_batches', {
    routing_version_id: { type: 'uuid', references: 'routing_policy_versions(id)', onDelete: 'RESTRICT' },
    deployment_version_id: { type: 'uuid', references: 'engine_deployment_versions(id)', onDelete: 'RESTRICT' },
  });
  pgm.addColumns('asr_jobs', {
    routing_version_id: { type: 'uuid', references: 'routing_policy_versions(id)', onDelete: 'RESTRICT' },
    deployment_version_id: { type: 'uuid', references: 'engine_deployment_versions(id)', onDelete: 'RESTRICT' },
  });
  pgm.addColumns('asr_attempts', {
    routing_version_id: { type: 'uuid', references: 'routing_policy_versions(id)', onDelete: 'RESTRICT' },
    deployment_version_id: { type: 'uuid', references: 'engine_deployment_versions(id)', onDelete: 'RESTRICT' },
  });
  pgm.addColumns('screen_text_batches', {
    routing_version_id: { type: 'uuid', references: 'routing_policy_versions(id)', onDelete: 'RESTRICT' },
    deployment_version_id: { type: 'uuid', references: 'engine_deployment_versions(id)', onDelete: 'RESTRICT' },
  });
  pgm.addColumns('screen_text_jobs', {
    routing_version_id: { type: 'uuid', references: 'routing_policy_versions(id)', onDelete: 'RESTRICT' },
    deployment_version_id: { type: 'uuid', references: 'engine_deployment_versions(id)', onDelete: 'RESTRICT' },
  });
  pgm.addColumns('screen_text_attempts', {
    routing_version_id: { type: 'uuid', references: 'routing_policy_versions(id)', onDelete: 'RESTRICT' },
    deployment_version_id: { type: 'uuid', references: 'engine_deployment_versions(id)', onDelete: 'RESTRICT' },
  });

};

exports.down = (pgm) => {
  pgm.dropColumns('screen_text_attempts', ['routing_version_id', 'deployment_version_id']);
  pgm.dropColumns('screen_text_jobs', ['routing_version_id', 'deployment_version_id']);
  pgm.dropColumns('screen_text_batches', ['routing_version_id', 'deployment_version_id']);
  pgm.dropColumns('asr_attempts', ['routing_version_id', 'deployment_version_id']);
  pgm.dropColumns('asr_jobs', ['routing_version_id', 'deployment_version_id']);
  pgm.dropColumns('asr_batches', ['routing_version_id', 'deployment_version_id']);
  pgm.sql('DROP TRIGGER routing_policy_impact_immutable ON routing_policy_impact_snapshots');
  pgm.sql('DROP TRIGGER routing_policy_status_events_immutable ON routing_policy_status_events');
  pgm.sql('DROP TRIGGER routing_policy_pools_immutable ON routing_policy_pools');
  pgm.sql('DROP TRIGGER routing_policy_versions_immutable ON routing_policy_versions');
  pgm.dropTable('routing_policy_impact_snapshots');
  pgm.dropTable('active_control_plane_pointers');
  pgm.dropTable('routing_policy_status_events');
  pgm.dropTable('routing_policy_pools');
  pgm.dropTable('routing_policy_versions');
  pgm.dropType('system_routing_status');
};
