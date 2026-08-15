exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('asr_batch_status', [
    'blocked', 'queued', 'running', 'partial', 'completed', 'failed', 'cancelled',
  ]);
  pgm.createType('asr_scope_kind', ['all', 'selected', 'single']);
  pgm.createType('asr_job_status', [
    'queued', 'leased', 'running', 'completed', 'failed',
    'cancel_requested', 'cancelled', 'reconciliation_required',
  ]);
  pgm.createType('asr_attempt_status', [
    'leased', 'running', 'completed', 'failed', 'cancelled', 'reconciliation_required',
  ]);
  pgm.createType('asr_quality_status', ['pass', 'warning', 'rejected']);

  pgm.createTable('asr_batches', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    retry_of_batch_id: { type: 'uuid', references: 'asr_batches', onDelete: 'SET NULL' },
    scope_kind: { type: 'asr_scope_kind', notNull: true },
    episode_numbers: { type: 'integer[]', notNull: true },
    term_version_id: { type: 'uuid', notNull: true, references: 'term_versions', onDelete: 'CASCADE' },
    manifest_id: { type: 'uuid', notNull: true, references: 'material_manifests', onDelete: 'CASCADE' },
    manifest_version: { type: 'integer', notNull: true },
    provider: { type: 'varchar(40)', notNull: true },
    adapter: { type: 'varchar(80)', notNull: true },
    model: { type: 'varchar(80)', notNull: true },
    language: { type: 'varchar(20)', notNull: true },
    config_digest: { type: 'varchar(64)', notNull: true },
    hotword_digest: { type: 'varchar(64)', notNull: true },
    hotword_term_count: { type: 'integer', notNull: true },
    hotword_alias_count: { type: 'integer', notNull: true },
    hotword_filtered_count: { type: 'integer', notNull: true },
    hotword_truncated_count: { type: 'integer', notNull: true },
    force_new_recognition: { type: 'boolean', notNull: true, default: false },
    status: { type: 'asr_batch_status', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('asr_batches', 'asr_batches_episode_numbers_valid', {
    check: 'cardinality(episode_numbers) BETWEEN 1 AND 100',
  });
  pgm.addConstraint('asr_batches', 'asr_batches_hotword_counts_valid', {
    check: 'hotword_term_count >= 0 AND hotword_alias_count >= 0 AND hotword_filtered_count >= 0 AND hotword_truncated_count >= 0',
  });
  pgm.createIndex('asr_batches', ['project_id', 'created_at']);
  pgm.createIndex('asr_batches', ['project_id', 'status', 'created_at']);

  pgm.createTable('asr_batch_blockers', {
    id: { type: 'bigserial', primaryKey: true },
    batch_id: { type: 'uuid', notNull: true, references: 'asr_batches', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    code: { type: 'varchar(100)', notNull: true },
    message: { type: 'varchar(500)', notNull: true },
  });
  pgm.addConstraint('asr_batch_blockers', 'asr_batch_blockers_episode_positive', {
    check: 'episode_number BETWEEN 1 AND 100',
  });
  pgm.createIndex('asr_batch_blockers', ['batch_id', 'episode_number']);

  pgm.createTable('asr_jobs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    batch_id: { type: 'uuid', notNull: true, references: 'asr_batches', onDelete: 'CASCADE' },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    manifest_id: { type: 'uuid', notNull: true, references: 'material_manifests', onDelete: 'CASCADE' },
    asset_id: { type: 'uuid', notNull: true, references: 'assets', onDelete: 'RESTRICT' },
    asset_original_filename: { type: 'varchar(255)', notNull: true },
    asset_checksum_algorithm: { type: 'varchar(20)', notNull: true },
    asset_checksum_value: { type: 'varchar(128)', notNull: true },
    term_version_id: { type: 'uuid', notNull: true, references: 'term_versions', onDelete: 'CASCADE' },
    config_digest: { type: 'varchar(64)', notNull: true },
    hotword_digest: { type: 'varchar(64)', notNull: true },
    status: { type: 'asr_job_status', notNull: true, default: 'queued' },
    current_attempt_id: { type: 'uuid' },
    current_result_id: { type: 'uuid' },
    reused_result: { type: 'boolean', notNull: true, default: false },
    cancel_requested: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('asr_jobs', 'asr_jobs_batch_episode_unique', {
    unique: ['batch_id', 'episode_number'],
  });
  pgm.addConstraint('asr_jobs', 'asr_jobs_episode_positive', {
    check: 'episode_number BETWEEN 1 AND 100',
  });
  pgm.createIndex('asr_jobs', ['status', 'updated_at']);
  pgm.createIndex('asr_jobs', ['project_id', 'episode_number', 'created_at']);

  pgm.createTable('asr_attempts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    job_id: { type: 'uuid', notNull: true, references: 'asr_jobs', onDelete: 'CASCADE' },
    attempt_number: { type: 'integer', notNull: true },
    status: { type: 'asr_attempt_status', notNull: true },
    lease_owner: { type: 'varchar(200)' },
    lease_expires_at: { type: 'timestamptz' },
    provider_request_id: { type: 'varchar(255)' },
    error_code: { type: 'varchar(100)' },
    error_detail: { type: 'text' },
    retryable: { type: 'boolean', notNull: true, default: false },
    external_side_effect_possible: { type: 'boolean', notNull: true, default: false },
    started_at: { type: 'timestamptz' },
    completed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('asr_attempts', 'asr_attempts_job_number_unique', {
    unique: ['job_id', 'attempt_number'],
  });
  pgm.addConstraint('asr_attempts', 'asr_attempts_number_positive', { check: 'attempt_number >= 1' });
  pgm.createIndex('asr_attempts', ['job_id', 'created_at']);
  pgm.createIndex('asr_attempts', ['status', 'lease_expires_at']);

  pgm.createTable('asr_results', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    source_job_id: { type: 'uuid', notNull: true, references: 'asr_jobs', onDelete: 'CASCADE' },
    attempt_id: { type: 'uuid', notNull: true, unique: true, references: 'asr_attempts', onDelete: 'CASCADE' },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    revision: { type: 'integer', notNull: true },
    asset_id: { type: 'uuid', notNull: true, references: 'assets', onDelete: 'RESTRICT' },
    term_version_id: { type: 'uuid', notNull: true, references: 'term_versions', onDelete: 'CASCADE' },
    config_digest: { type: 'varchar(64)', notNull: true },
    hotword_digest: { type: 'varchar(64)', notNull: true },
    quality_status: { type: 'asr_quality_status', notNull: true },
    quality_summary: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('asr_results', 'asr_results_project_episode_revision_unique', {
    unique: ['project_id', 'episode_number', 'revision'],
  });
  pgm.addConstraint('asr_results', 'asr_results_values_valid', {
    check: 'episode_number BETWEEN 1 AND 100 AND revision >= 1',
  });
  pgm.createIndex('asr_results', [
    'project_id', 'episode_number', 'asset_id', 'term_version_id', 'config_digest', 'hotword_digest',
  ]);

  pgm.createTable('asr_cues', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    result_id: { type: 'uuid', notNull: true, references: 'asr_results', onDelete: 'CASCADE' },
    cue_index: { type: 'integer', notNull: true },
    start_ms: { type: 'integer', notNull: true },
    end_ms: { type: 'integer', notNull: true },
    text: { type: 'text', notNull: true },
    confidence: { type: 'numeric(6,5)' },
  });
  pgm.addConstraint('asr_cues', 'asr_cues_result_index_unique', {
    unique: ['result_id', 'cue_index'],
  });
  pgm.addConstraint('asr_cues', 'asr_cues_values_valid', {
    check: 'cue_index >= 1 AND start_ms >= 0 AND end_ms > start_ms AND length(text) > 0 AND (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))',
  });

  pgm.createTable('asr_usage', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    attempt_id: { type: 'uuid', notNull: true, unique: true, references: 'asr_attempts', onDelete: 'CASCADE' },
    provider: { type: 'varchar(40)', notNull: true },
    media_duration_ms: { type: 'bigint', notNull: true, default: 0 },
    billing_unit: { type: 'varchar(40)', notNull: true },
    billing_quantity: { type: 'numeric(20,6)', notNull: true, default: 0 },
    currency: { type: 'varchar(12)', notNull: true },
    estimated_amount: { type: 'numeric(20,6)', notNull: true, default: 0 },
    final_amount: { type: 'numeric(20,6)', notNull: true, default: 0 },
    reconciliation_status: { type: 'varchar(20)', notNull: true },
    provider_request_id: { type: 'varchar(255)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('asr_usage', 'asr_usage_nonnegative', {
    check: 'media_duration_ms >= 0 AND billing_quantity >= 0 AND estimated_amount >= 0 AND final_amount >= 0',
  });

  pgm.addConstraint('asr_jobs', 'asr_jobs_current_attempt_fk', {
    foreignKeys: { columns: 'current_attempt_id', references: 'asr_attempts(id)', onDelete: 'SET NULL' },
  });
  pgm.addConstraint('asr_jobs', 'asr_jobs_current_result_fk', {
    foreignKeys: { columns: 'current_result_id', references: 'asr_results(id)', onDelete: 'SET NULL' },
  });

  pgm.createTable('asr_batch_commands', {
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    idempotency_key: { type: 'varchar(200)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    batch_id: { type: 'uuid', notNull: true, references: 'asr_batches', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('asr_batch_commands', 'asr_batch_commands_primary', {
    primaryKey: ['project_id', 'idempotency_key'],
  });
  pgm.createTable('asr_cancel_commands', {
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    idempotency_key: { type: 'varchar(200)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    batch_id: { type: 'uuid', notNull: true, references: 'asr_batches', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('asr_cancel_commands', 'asr_cancel_commands_primary', {
    primaryKey: ['project_id', 'idempotency_key'],
  });
  pgm.createTable('asr_retry_commands', {
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    idempotency_key: { type: 'varchar(200)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    source_batch_id: { type: 'uuid', notNull: true, references: 'asr_batches', onDelete: 'CASCADE' },
    retry_batch_id: { type: 'uuid', notNull: true, references: 'asr_batches', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('asr_retry_commands', 'asr_retry_commands_primary', {
    primaryKey: ['project_id', 'idempotency_key'],
  });

  pgm.sql(`
    CREATE FUNCTION reject_asr_result_update() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'ASR results, cues and usage are immutable';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER asr_results_immutable BEFORE UPDATE ON asr_results
      FOR EACH ROW EXECUTE FUNCTION reject_asr_result_update();
    CREATE TRIGGER asr_cues_immutable BEFORE UPDATE ON asr_cues
      FOR EACH ROW EXECUTE FUNCTION reject_asr_result_update();
    CREATE TRIGGER asr_usage_immutable BEFORE UPDATE ON asr_usage
      FOR EACH ROW EXECUTE FUNCTION reject_asr_result_update();
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER asr_usage_immutable ON asr_usage');
  pgm.sql('DROP TRIGGER asr_cues_immutable ON asr_cues');
  pgm.sql('DROP TRIGGER asr_results_immutable ON asr_results');
  pgm.sql('DROP FUNCTION reject_asr_result_update()');
  pgm.dropTable('asr_retry_commands');
  pgm.dropTable('asr_cancel_commands');
  pgm.dropTable('asr_batch_commands');
  pgm.dropConstraint('asr_jobs', 'asr_jobs_current_result_fk');
  pgm.dropConstraint('asr_jobs', 'asr_jobs_current_attempt_fk');
  pgm.dropTable('asr_usage');
  pgm.dropTable('asr_cues');
  pgm.dropTable('asr_results');
  pgm.dropTable('asr_attempts');
  pgm.dropTable('asr_jobs');
  pgm.dropTable('asr_batch_blockers');
  pgm.dropTable('asr_batches');
  pgm.dropType('asr_quality_status');
  pgm.dropType('asr_attempt_status');
  pgm.dropType('asr_job_status');
  pgm.dropType('asr_scope_kind');
  pgm.dropType('asr_batch_status');
};
