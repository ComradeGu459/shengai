exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('screen_text_scope_kind', ['all', 'selected', 'single']);
  pgm.createType('screen_text_batch_status', [
    'queued', 'running', 'review_pending', 'partial', 'completed', 'failed',
    'cancel_requested', 'cancelled', 'reconciliation_required', 'stale',
  ]);
  pgm.createType('screen_text_job_status', [
    'not_started', 'queued', 'running', 'review_pending', 'completed', 'confirmed_empty',
    'failed', 'cancel_requested', 'cancelled', 'reconciliation_required', 'stale',
  ]);
  pgm.createType('screen_text_attempt_status', [
    'leased', 'running', 'completed', 'failed', 'cancelled', 'reconciliation_required',
  ]);
  pgm.createType('screen_text_candidate_status', ['pending', 'approved', 'edited', 'rejected']);
  pgm.createType('screen_text_candidate_source', ['ocr', 'manual', 'split']);
  pgm.createType('screen_text_category', [
    'nameplate', 'place', 'time', 'chapter', 'title', 'message', 'interface', 'other',
  ]);
  pgm.createType('screen_text_position', ['left', 'center', 'right', 'full']);
  pgm.createType('screen_text_decision_action', [
    'approve', 'reject', 'restore', 'edit', 'split_left_right', 'manual_add', 'confirm_empty',
  ]);

  pgm.createTable('screen_text_batches', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    scope_kind: { type: 'screen_text_scope_kind', notNull: true },
    episode_numbers: { type: 'integer[]', notNull: true },
    term_version_id: { type: 'uuid', notNull: true, references: 'term_versions', onDelete: 'RESTRICT' },
    manifest_id: { type: 'uuid', notNull: true, references: 'material_manifests', onDelete: 'RESTRICT' },
    manifest_version: { type: 'integer', notNull: true },
    execution_kind: { type: 'varchar(30)', notNull: true },
    provider: { type: 'varchar(40)', notNull: true },
    adapter: { type: 'varchar(80)', notNull: true },
    model: { type: 'varchar(80)', notNull: true },
    language: { type: 'varchar(20)', notNull: true },
    deployment: { type: 'varchar(80)', notNull: true },
    input_version: { type: 'varchar(40)', notNull: true },
    output_version: { type: 'varchar(40)', notNull: true },
    capabilities: { type: 'jsonb', notNull: true },
    config_digest: { type: 'varchar(64)', notNull: true },
    frame_strategy_version: { type: 'varchar(80)', notNull: true },
    dedupe_strategy_version: { type: 'varchar(80)', notNull: true },
    term_projection: { type: 'jsonb', notNull: true },
    term_projection_entries: { type: 'jsonb', notNull: true },
    status: { type: 'screen_text_batch_status', notNull: true, default: 'queued' },
    revision: { type: 'integer', notNull: true, default: 1 },
    request_id: { type: 'varchar(200)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('screen_text_batches', 'screen_text_batches_values_valid', {
    check: 'cardinality(episode_numbers) BETWEEN 1 AND 100 AND manifest_version >= 1 AND revision >= 1',
  });
  pgm.createIndex('screen_text_batches', ['project_id', 'created_at']);
  pgm.createIndex('screen_text_batches', ['project_id', 'status']);

  pgm.createTable('screen_text_batch_assets', {
    batch_id: { type: 'uuid', notNull: true, references: 'screen_text_batches', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    asset_id: { type: 'uuid', notNull: true, references: 'assets', onDelete: 'RESTRICT' },
    object_key: { type: 'varchar(700)', notNull: true },
    original_filename: { type: 'varchar(255)', notNull: true },
    size_bytes: { type: 'bigint', notNull: true },
    checksum_algorithm: { type: 'varchar(20)', notNull: true },
    checksum_value: { type: 'varchar(128)', notNull: true },
  });
  pgm.addConstraint('screen_text_batch_assets', 'screen_text_batch_assets_primary', {
    primaryKey: ['batch_id', 'episode_number'],
  });

  pgm.createTable('screen_text_jobs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    batch_id: { type: 'uuid', notNull: true, references: 'screen_text_batches', onDelete: 'CASCADE' },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    asset_id: { type: 'uuid', notNull: true, references: 'assets', onDelete: 'RESTRICT' },
    status: { type: 'screen_text_job_status', notNull: true, default: 'queued' },
    cancel_requested: { type: 'boolean', notNull: true, default: false },
    current_attempt_id: { type: 'uuid' },
    video_duration_ms: { type: 'integer' },
    stats: { type: 'jsonb', notNull: true, default: '{"probedFrameCount":0,"ocrFrameCount":0,"deduplicatedFrameCount":0,"candidateCount":0,"processingDurationMs":0}' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('screen_text_jobs', 'screen_text_jobs_batch_episode_unique', {
    unique: ['batch_id', 'episode_number'],
  });
  pgm.addConstraint('screen_text_jobs', 'screen_text_jobs_values_valid', {
    check: 'episode_number BETWEEN 1 AND 100 AND (video_duration_ms IS NULL OR video_duration_ms > 0)',
  });
  pgm.createIndex('screen_text_jobs', ['status', 'updated_at']);

  pgm.createTable('screen_text_attempts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    job_id: { type: 'uuid', notNull: true, references: 'screen_text_jobs', onDelete: 'CASCADE' },
    attempt_number: { type: 'integer', notNull: true },
    status: { type: 'screen_text_attempt_status', notNull: true },
    lease_owner: { type: 'varchar(200)' },
    lease_expires_at: { type: 'timestamptz' },
    execution_kind: { type: 'varchar(30)', notNull: true },
    provider: { type: 'varchar(40)', notNull: true },
    adapter: { type: 'varchar(80)', notNull: true },
    model: { type: 'varchar(80)', notNull: true },
    language: { type: 'varchar(20)', notNull: true },
    deployment: { type: 'varchar(80)', notNull: true },
    input_version: { type: 'varchar(40)', notNull: true },
    output_version: { type: 'varchar(40)', notNull: true },
    capabilities: { type: 'jsonb', notNull: true },
    config_digest: { type: 'varchar(64)', notNull: true },
    input_digest: { type: 'varchar(64)', notNull: true },
    provider_request_id: { type: 'varchar(255)' },
    receipt: { type: 'varchar(40)', notNull: true, default: 'simulated' },
    stats: { type: 'jsonb', notNull: true, default: '{"probedFrameCount":0,"ocrFrameCount":0,"deduplicatedFrameCount":0,"candidateCount":0,"processingDurationMs":0}' },
    usage: { type: 'jsonb' },
    error_code: { type: 'varchar(100)' },
    error_detail: { type: 'text' },
    retryable: { type: 'boolean', notNull: true, default: false },
    external_side_effect_possible: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    completed_at: { type: 'timestamptz' },
  });
  pgm.addConstraint('screen_text_attempts', 'screen_text_attempts_job_number_unique', {
    unique: ['job_id', 'attempt_number'],
  });
  pgm.addConstraint('screen_text_attempts', 'screen_text_attempts_number_positive', { check: 'attempt_number >= 1' });
  pgm.createIndex('screen_text_attempts', ['status', 'lease_expires_at']);
  pgm.addConstraint('screen_text_jobs', 'screen_text_jobs_current_attempt_fk', {
    foreignKeys: { columns: 'current_attempt_id', references: 'screen_text_attempts(id)', onDelete: 'SET NULL' },
  });

  pgm.createTable('screen_text_candidates', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    batch_id: { type: 'uuid', notNull: true, references: 'screen_text_batches', onDelete: 'CASCADE' },
    job_id: { type: 'uuid', notNull: true, references: 'screen_text_jobs', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    source: { type: 'screen_text_candidate_source', notNull: true },
    raw_text: { type: 'text', notNull: true },
    text: { type: 'text', notNull: true },
    start_ms: { type: 'integer', notNull: true },
    end_ms: { type: 'integer', notNull: true },
    category: { type: 'screen_text_category', notNull: true },
    position: { type: 'screen_text_position', notNull: true },
    confidence: { type: 'numeric(6,5)' },
    status: { type: 'screen_text_candidate_status', notNull: true, default: 'pending' },
    system_suggestion: { type: 'varchar(20)' },
    suggestion_reason: { type: 'varchar(200)' },
    pair_group_id: { type: 'uuid' },
    evidence: { type: 'jsonb', notNull: true },
    term_hits: { type: 'jsonb', notNull: true, default: '[]' },
    revision: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('screen_text_candidates', 'screen_text_candidates_values_valid', {
    check: "episode_number BETWEEN 1 AND 100 AND start_ms >= 0 AND end_ms > start_ms AND length(btrim(text)) > 0 AND revision >= 1 AND (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))",
  });
  pgm.createIndex('screen_text_candidates', ['batch_id', 'episode_number', 'status', 'created_at']);

  pgm.createTable('screen_text_decision_events', {
    id: { type: 'bigserial', primaryKey: true },
    batch_id: { type: 'uuid', notNull: true, references: 'screen_text_batches', onDelete: 'CASCADE' },
    job_id: { type: 'uuid', notNull: true, references: 'screen_text_jobs', onDelete: 'CASCADE' },
    candidate_id: { type: 'uuid', references: 'screen_text_candidates', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    action: { type: 'screen_text_decision_action', notNull: true },
    before_state: { type: 'jsonb' },
    after_state: { type: 'jsonb', notNull: true },
    idempotency_key: { type: 'varchar(200)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    actor: { type: 'varchar(120)', notNull: true, default: 'employee' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('screen_text_decision_events', 'screen_text_decision_events_key_unique', {
    unique: ['batch_id', 'idempotency_key'],
  });
  pgm.sql(`
    CREATE FUNCTION reject_screen_text_event_update() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'screen text decision events are immutable'; END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER screen_text_decision_events_immutable
      BEFORE UPDATE ON screen_text_decision_events
      FOR EACH ROW EXECUTE FUNCTION reject_screen_text_event_update();
  `);

  pgm.createTable('screen_text_commands', {
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    command_kind: { type: 'varchar(40)', notNull: true },
    idempotency_key: { type: 'varchar(200)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    resource_id: { type: 'uuid', notNull: true },
    response_snapshot: { type: 'jsonb' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('screen_text_commands', 'screen_text_commands_primary', {
    primaryKey: ['project_id', 'command_kind', 'idempotency_key'],
  });

  pgm.createTable('screen_text_playback_grants', {
    token_digest: { type: 'varchar(64)', primaryKey: true },
    batch_id: { type: 'uuid', notNull: true, references: 'screen_text_batches', onDelete: 'CASCADE' },
    candidate_id: { type: 'uuid', notNull: true, references: 'screen_text_candidates', onDelete: 'CASCADE' },
    asset_id: { type: 'uuid', notNull: true, references: 'assets', onDelete: 'CASCADE' },
    object_key: { type: 'varchar(700)', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createIndex('screen_text_playback_grants', ['expires_at']);

  pgm.createTable('screen_text_releases', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    version: { type: 'integer', notNull: true },
    batch_id: { type: 'uuid', notNull: true, references: 'screen_text_batches', onDelete: 'RESTRICT' },
    term_version_id: { type: 'uuid', notNull: true, references: 'term_versions', onDelete: 'RESTRICT' },
    manifest_id: { type: 'uuid', notNull: true, references: 'material_manifests', onDelete: 'RESTRICT' },
    draft_revision: { type: 'integer', notNull: true },
    release_digest: { type: 'varchar(64)', notNull: true },
    cue_count: { type: 'integer', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('screen_text_releases', 'screen_text_releases_project_version_unique', {
    unique: ['project_id', 'version'],
  });
  pgm.addConstraint('screen_text_releases', 'screen_text_releases_values_valid', {
    check: 'version >= 1 AND draft_revision >= 1 AND cue_count >= 0',
  });

  pgm.createTable('screen_text_release_cues', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    release_id: { type: 'uuid', notNull: true, references: 'screen_text_releases', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    cue_index: { type: 'integer', notNull: true },
    source_candidate_id: { type: 'uuid', notNull: true, references: 'screen_text_candidates', onDelete: 'RESTRICT' },
    start_ms: { type: 'integer', notNull: true },
    end_ms: { type: 'integer', notNull: true },
    text: { type: 'text', notNull: true },
    position: { type: 'screen_text_position', notNull: true },
  });
  pgm.addConstraint('screen_text_release_cues', 'screen_text_release_cues_order_unique', {
    unique: ['release_id', 'episode_number', 'cue_index'],
  });

  pgm.createTable('screen_text_exports', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    release_id: { type: 'uuid', notNull: true, references: 'screen_text_releases', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    filename: { type: 'varchar(255)', notNull: true },
    sha256: { type: 'varchar(64)', notNull: true },
    content: { type: 'bytea', notNull: true },
    size_bytes: { type: 'integer', notNull: true },
  });
  pgm.addConstraint('screen_text_exports', 'screen_text_exports_episode_unique', {
    unique: ['release_id', 'episode_number'],
  });

  pgm.sql(`
    CREATE FUNCTION reject_screen_text_release_update() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'screen text releases are immutable'; END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER screen_text_releases_immutable BEFORE UPDATE ON screen_text_releases
      FOR EACH ROW EXECUTE FUNCTION reject_screen_text_release_update();
    CREATE TRIGGER screen_text_release_cues_immutable BEFORE UPDATE ON screen_text_release_cues
      FOR EACH ROW EXECUTE FUNCTION reject_screen_text_release_update();
    CREATE TRIGGER screen_text_exports_immutable BEFORE UPDATE ON screen_text_exports
      FOR EACH ROW EXECUTE FUNCTION reject_screen_text_release_update();
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER screen_text_exports_immutable ON screen_text_exports');
  pgm.sql('DROP TRIGGER screen_text_release_cues_immutable ON screen_text_release_cues');
  pgm.sql('DROP TRIGGER screen_text_releases_immutable ON screen_text_releases');
  pgm.sql('DROP FUNCTION reject_screen_text_release_update()');
  pgm.dropTable('screen_text_exports');
  pgm.dropTable('screen_text_release_cues');
  pgm.dropTable('screen_text_releases');
  pgm.dropTable('screen_text_playback_grants');
  pgm.dropTable('screen_text_commands');
  pgm.sql('DROP TRIGGER screen_text_decision_events_immutable ON screen_text_decision_events');
  pgm.sql('DROP FUNCTION reject_screen_text_event_update()');
  pgm.dropTable('screen_text_decision_events');
  pgm.dropTable('screen_text_candidates');
  pgm.dropConstraint('screen_text_jobs', 'screen_text_jobs_current_attempt_fk');
  pgm.dropTable('screen_text_attempts');
  pgm.dropTable('screen_text_jobs');
  pgm.dropTable('screen_text_batch_assets');
  pgm.dropTable('screen_text_batches');
  pgm.dropType('screen_text_decision_action');
  pgm.dropType('screen_text_position');
  pgm.dropType('screen_text_category');
  pgm.dropType('screen_text_candidate_source');
  pgm.dropType('screen_text_candidate_status');
  pgm.dropType('screen_text_attempt_status');
  pgm.dropType('screen_text_job_status');
  pgm.dropType('screen_text_batch_status');
  pgm.dropType('screen_text_scope_kind');
};
