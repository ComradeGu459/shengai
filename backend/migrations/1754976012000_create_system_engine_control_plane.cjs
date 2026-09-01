exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('system_engine_capability', ['asr', 'screen_text']);
  pgm.createType('system_engine_execution_kind', ['cloud_api', 'self_hosted_worker']);
  pgm.createType('system_engine_status', ['enabled', 'disabled']);
  pgm.createType('connection_test_status', ['queued', 'running', 'succeeded', 'failed', 'unknown']);

  pgm.createTable('engine_deployments', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    capability: { type: 'system_engine_capability', notNull: true },
    execution_kind: { type: 'system_engine_execution_kind', notNull: true },
    display_name: { type: 'varchar(200)', notNull: true },
    provider: { type: 'varchar(80)', notNull: true },
    adapter_key: { type: 'varchar(120)', notNull: true },
    status: { type: 'system_engine_status', notNull: true, default: 'enabled' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('engine_deployments', 'engine_deployments_values_valid', {
    check: "length(btrim(display_name)) > 0 AND length(btrim(provider)) > 0 AND length(btrim(adapter_key)) > 0",
  });
  pgm.createIndex('engine_deployments', ['capability', 'status', 'created_at', 'id'], { name: 'engine_deployments_listing_idx' });
  pgm.createIndex('engine_deployments', ['adapter_key'], { name: 'engine_deployments_adapter_idx' });

  pgm.createTable('engine_deployment_versions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    deployment_id: {
      type: 'uuid', notNull: true,
      references: 'engine_deployments(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    },
    version: { type: 'integer', notNull: true },
    model: { type: 'varchar(120)', notNull: true },
    language: { type: 'varchar(80)', notNull: true },
    endpoint_reference: { type: 'varchar(255)' },
    region_hint: { type: 'varchar(120)' },
    capabilities_snapshot: { type: 'jsonb', notNull: true },
    secret_reference_id: { type: 'varchar(255)' },
    secret_reference_summary: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    config_digest: { type: 'char(64)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('engine_deployment_versions', 'engine_deployment_versions_values_valid', {
    check: "version >= 1 AND length(btrim(model)) > 0 AND length(btrim(language)) > 0 AND config_digest ~ '^[0-9a-f]{64}$' AND (endpoint_reference IS NULL OR (endpoint_reference !~ '://' AND endpoint_reference !~ '[?&#<>[:space:]]')) AND (region_hint IS NULL OR region_hint !~ '[?&#<>[:space:]]') AND (secret_reference_id IS NULL OR (length(btrim(secret_reference_id)) > 0 AND secret_reference_id !~ '[[:cntrl:]]'))",
  });
  pgm.addConstraint('engine_deployment_versions', 'engine_deployment_versions_deployment_version_unique', {
    unique: ['deployment_id', 'version'],
  });
  pgm.createIndex('engine_deployment_versions', ['deployment_id', 'version'], { name: 'engine_deployment_versions_listing_idx' });

  pgm.createTable('system_control_commands', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    command_kind: { type: 'varchar(80)', notNull: true },
    idempotency_key: { type: 'varchar(200)', notNull: true },
    stable_command_key: { type: 'varchar(200)', notNull: true, default: pgm.func("gen_random_uuid()::text") },
    request_hash: { type: 'char(64)', notNull: true },
    resource_id: { type: 'uuid' },
    response_snapshot: { type: 'jsonb' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('system_control_commands', 'system_control_commands_key_unique', {
    unique: ['command_kind', 'idempotency_key'],
  });
  pgm.addConstraint('system_control_commands', 'system_control_commands_stable_key_unique', {
    unique: ['stable_command_key'],
  });
  pgm.addConstraint('system_control_commands', 'system_control_commands_hash_valid', {
    check: "request_hash ~ '^[0-9a-f]{64}$' AND length(btrim(command_kind)) > 0 AND length(btrim(idempotency_key)) > 0",
  });

  pgm.createTable('connection_test_runs', {
    id: { type: 'uuid', primaryKey: true },
    deployment_version_id: {
      type: 'uuid', notNull: true,
      references: 'engine_deployment_versions(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    },
    capability: { type: 'system_engine_capability', notNull: true },
    execution_kind: { type: 'system_engine_execution_kind', notNull: true },
    adapter_key: { type: 'varchar(120)', notNull: true },
    status: { type: 'connection_test_status', notNull: true, default: 'queued' },
    request_id: { type: 'varchar(255)', notNull: true },
    attempt_count: { type: 'integer', notNull: true, default: 0 },
    lease_owner: { type: 'varchar(120)' },
    lease_expires_at: { type: 'timestamptz' },
    latency_ms: { type: 'integer' },
    capabilities_snapshot: { type: 'jsonb' },
    reason_code: { type: 'varchar(120)' },
    reason_message: { type: 'varchar(240)' },
    queued_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    started_at: { type: 'timestamptz' },
    completed_at: { type: 'timestamptz' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('connection_test_runs', 'connection_test_runs_values_valid', {
    check: "attempt_count >= 0 AND (latency_ms IS NULL OR latency_ms >= 0) AND (reason_message IS NULL OR length(btrim(reason_message)) > 0)",
  });
  pgm.createIndex('connection_test_runs', ['status', 'lease_expires_at', 'queued_at', 'id'], { name: 'connection_test_runs_claim_idx' });
  pgm.createIndex('connection_test_runs', ['deployment_version_id', 'queued_at'], { name: 'connection_test_runs_version_idx' });

  pgm.createTable('connection_test_attempts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    test_run_id: {
      type: 'uuid', notNull: true,
      references: 'connection_test_runs(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    },
    attempt_number: { type: 'integer', notNull: true },
    status: { type: 'connection_test_status', notNull: true },
    latency_ms: { type: 'integer' },
    reason_code: { type: 'varchar(120)' },
    reason_message: { type: 'varchar(240)' },
    started_at: { type: 'timestamptz' },
    completed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('connection_test_attempts', 'connection_test_attempts_key_unique', {
    unique: ['test_run_id', 'attempt_number'],
  });
  pgm.addConstraint('connection_test_attempts', 'connection_test_attempts_values_valid', {
    check: "attempt_number >= 1 AND (latency_ms IS NULL OR latency_ms >= 0)",
  });

  pgm.createTable('system_control_audit_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    actor_subject: { type: 'varchar(255)', notNull: true },
    actor_audience: { type: 'varchar(255)', notNull: true },
    action: { type: 'varchar(120)', notNull: true },
    resource_type: { type: 'varchar(80)', notNull: true },
    resource_id: { type: 'uuid' },
    idempotency_key: { type: 'varchar(200)' },
    request_id: { type: 'varchar(255)', notNull: true },
    result: { type: 'varchar(40)', notNull: true },
    before_snapshot: { type: 'jsonb' },
    after_snapshot: { type: 'jsonb' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('system_control_audit_events', 'system_control_audit_events_values_valid', {
    check: "length(btrim(actor_subject)) > 0 AND length(btrim(action)) > 0 AND length(btrim(resource_type)) > 0 AND length(btrim(result)) > 0",
  });
  pgm.createIndex('system_control_audit_events', ['created_at', 'id'], { name: 'system_control_audit_events_listing_idx' });

  pgm.sql(`
    CREATE FUNCTION reject_system_control_immutable_update() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'system control versions and audit events are immutable'; END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER engine_deployment_versions_immutable BEFORE UPDATE OR DELETE ON engine_deployment_versions FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
    CREATE TRIGGER system_control_audit_events_immutable BEFORE UPDATE OR DELETE ON system_control_audit_events FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER system_control_audit_events_immutable ON system_control_audit_events');
  pgm.sql('DROP TRIGGER engine_deployment_versions_immutable ON engine_deployment_versions');
  pgm.sql('DROP FUNCTION reject_system_control_immutable_update()');
  pgm.dropTable('system_control_audit_events');
  pgm.dropTable('connection_test_attempts');
  pgm.dropTable('connection_test_runs');
  pgm.dropTable('system_control_commands');
  pgm.dropTable('engine_deployment_versions');
  pgm.dropTable('engine_deployments');
  pgm.dropType('connection_test_status');
  pgm.dropType('system_engine_status');
  pgm.dropType('system_engine_execution_kind');
  pgm.dropType('system_engine_capability');
};
