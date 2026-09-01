exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('system_secret_references', {
    id: { type: 'uuid', primaryKey: true },
    environment: { type: 'varchar(40)', notNull: true, default: 'development' },
    capability: { type: 'system_engine_capability', notNull: true },
    provider: { type: 'varchar(80)', notNull: true },
    display_name: { type: 'varchar(120)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('system_secret_references', 'system_secret_references_values_valid', {
    check: "environment = 'development' AND length(btrim(provider)) > 0 AND length(btrim(display_name)) > 0",
  });
  pgm.createIndex('system_secret_references', ['capability', 'created_at', 'id'], { name: 'system_secret_references_listing_idx' });

  pgm.createTable('system_secret_reference_versions', {
    id: { type: 'uuid', primaryKey: true },
    secret_reference_id: {
      type: 'uuid', notNull: true,
      references: 'system_secret_references(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    },
    version: { type: 'integer', notNull: true },
    environment: { type: 'varchar(40)', notNull: true, default: 'development' },
    capability: { type: 'system_engine_capability', notNull: true },
    provider: { type: 'varchar(80)', notNull: true },
    candidate_id: { type: 'uuid', notNull: true },
    redacted_label: { type: 'varchar(80)', notNull: true },
    reference_digest: { type: 'char(64)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('system_secret_reference_versions', 'system_secret_reference_versions_values_valid', {
    check: "version >= 1 AND environment = 'development' AND length(btrim(provider)) > 0 AND length(btrim(redacted_label)) > 0 AND reference_digest ~ '^[0-9a-f]{64}$'",
  });
  pgm.addConstraint('system_secret_reference_versions', 'system_secret_reference_versions_unique_version', {
    unique: ['secret_reference_id', 'version'],
  });
  pgm.createIndex('system_secret_reference_versions', ['secret_reference_id', 'version', 'id'], { name: 'system_secret_reference_versions_listing_idx' });

  pgm.createTable('system_secret_reference_status_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    secret_reference_version_id: {
      type: 'uuid', notNull: true,
      references: 'system_secret_reference_versions(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    },
    status: { type: 'varchar(40)', notNull: true },
    request_id: { type: 'varchar(255)', notNull: true },
    actor_subject: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('system_secret_reference_status_events', 'system_secret_reference_status_events_values_valid', {
    check: "status IN ('available','validation_failed','unknown','revoked') AND length(btrim(request_id)) > 0 AND length(btrim(actor_subject)) > 0",
  });
  pgm.createIndex('system_secret_reference_status_events', ['secret_reference_version_id', 'created_at', 'id'], { name: 'system_secret_reference_status_events_latest_idx' });

  pgm.addColumn('engine_deployment_versions', {
    secret_reference_version_id: {
      type: 'uuid',
      references: 'system_secret_reference_versions(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    },
  });
  pgm.sql("ALTER TABLE engine_deployment_versions DROP CONSTRAINT IF EXISTS engine_deployment_versions_values_valid");
  pgm.addConstraint('engine_deployment_versions', 'engine_deployment_versions_values_valid', {
    check: "version >= 1 AND length(btrim(model)) > 0 AND length(btrim(language)) > 0 AND config_digest ~ '^[0-9a-f]{64}$' AND (endpoint_reference IS NULL OR (endpoint_reference !~ '://' AND endpoint_reference !~ '[?&#<>[:space:]]')) AND (region_hint IS NULL OR region_hint !~ '[?&#<>[:space:]]')",
  });
  pgm.dropColumn('engine_deployment_versions', 'secret_reference_id');

  pgm.createTable('system_secret_validation_runs', {
    id: { type: 'uuid', primaryKey: true },
    secret_reference_version_id: {
      type: 'uuid', notNull: true,
      references: 'system_secret_reference_versions(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    },
    status: { type: 'varchar(30)', notNull: true, default: 'queued' },
    request_id: { type: 'varchar(255)', notNull: true },
    attempt_count: { type: 'integer', notNull: true, default: 0 },
    lease_owner: { type: 'varchar(120)' },
    lease_expires_at: { type: 'timestamptz' },
    latency_ms: { type: 'integer' },
    reason_code: { type: 'varchar(120)' },
    reason_message: { type: 'varchar(240)' },
    queued_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    started_at: { type: 'timestamptz' },
    completed_at: { type: 'timestamptz' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('system_secret_validation_runs', 'system_secret_validation_runs_values_valid', {
    check: "status IN ('queued','running','succeeded','failed','unknown') AND attempt_count >= 0 AND (latency_ms IS NULL OR latency_ms >= 0)",
  });
  pgm.createIndex('system_secret_validation_runs', ['status', 'lease_expires_at', 'queued_at', 'id'], { name: 'system_secret_validation_runs_claim_idx' });
  pgm.createIndex('system_secret_validation_runs', ['secret_reference_version_id', 'queued_at', 'id'], { name: 'system_secret_validation_runs_version_idx' });

  pgm.createTable('system_secret_validation_attempts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    validation_run_id: {
      type: 'uuid', notNull: true,
      references: 'system_secret_validation_runs(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT',
    },
    attempt_number: { type: 'integer', notNull: true },
    status: { type: 'varchar(30)', notNull: true },
    latency_ms: { type: 'integer' },
    reason_code: { type: 'varchar(120)' },
    reason_message: { type: 'varchar(240)' },
    started_at: { type: 'timestamptz' },
    completed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('system_secret_validation_attempts', 'system_secret_validation_attempts_key_unique', {
    unique: ['validation_run_id', 'attempt_number'],
  });
  pgm.addConstraint('system_secret_validation_attempts', 'system_secret_validation_attempts_values_valid', {
    check: "attempt_number >= 1 AND status IN ('queued','running','succeeded','failed','unknown') AND (latency_ms IS NULL OR latency_ms >= 0)",
  });

  pgm.sql(`
    CREATE TRIGGER system_secret_reference_versions_immutable BEFORE UPDATE OR DELETE ON system_secret_reference_versions FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
    CREATE TRIGGER system_secret_reference_status_events_immutable BEFORE UPDATE OR DELETE ON system_secret_reference_status_events FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER system_secret_reference_status_events_immutable ON system_secret_reference_status_events');
  pgm.sql('DROP TRIGGER system_secret_reference_versions_immutable ON system_secret_reference_versions');
  pgm.dropTable('system_secret_validation_attempts');
  pgm.dropTable('system_secret_validation_runs');
  pgm.dropColumn('engine_deployment_versions', 'secret_reference_version_id');
  pgm.addColumn('engine_deployment_versions', { secret_reference_id: { type: 'varchar(255)' } });
  pgm.dropTable('system_secret_reference_status_events');
  pgm.dropTable('system_secret_reference_versions');
  pgm.dropTable('system_secret_references');
};
