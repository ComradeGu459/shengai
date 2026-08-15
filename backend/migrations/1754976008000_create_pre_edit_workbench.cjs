exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('pre_edit_session_status', [
    'preparing', 'ready', 'limited', 'stale', 'completed', 'failed',
  ]);
  pgm.createType('pre_edit_episode_status', ['preparing', 'ready', 'limited', 'completed']);
  pgm.createType('pre_edit_alignment_kind', [
    'one_to_one', 'one_company_many_asr', 'many_company_one_asr',
    'company_only', 'asr_only', 'uncertain',
  ]);
  pgm.createType('pre_edit_baseline_policy', ['company_primary', 'asr_text_primary']);
  pgm.createType('pre_edit_decision_action', [
    'keep_company', 'use_asr_text', 'custom_text',
    'remove_company', 'add_asr', 'ignore_asr',
  ]);
  pgm.createType('pre_edit_decision_origin', ['system', 'human']);
  pgm.createType('pre_edit_prepare_status', ['queued', 'leased', 'completed', 'failed']);

  pgm.createTable('pre_edit_sessions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    project_version: { type: 'integer', notNull: true },
    source_srt_set_digest: { type: 'varchar(64)', notNull: true },
    term_version_id: { type: 'uuid', notNull: true, references: 'term_versions', onDelete: 'RESTRICT' },
    manifest_id: { type: 'uuid', notNull: true, references: 'material_manifests', onDelete: 'RESTRICT' },
    manifest_version: { type: 'integer', notNull: true },
    source_digest: { type: 'varchar(64)', notNull: true },
    source_snapshot: { type: 'jsonb', notNull: true },
    algorithm_version: { type: 'varchar(80)', notNull: true },
    format_policy_version: { type: 'varchar(80)', notNull: true },
    status: { type: 'pre_edit_session_status', notNull: true, default: 'preparing' },
    default_policy: { type: 'pre_edit_baseline_policy', notNull: true, default: 'company_primary' },
    revision: { type: 'integer', notNull: true, default: 1 },
    error_code: { type: 'varchar(100)' },
    error_detail: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('pre_edit_sessions', 'pre_edit_sessions_values_valid', {
    check: `project_version >= 1 AND manifest_version >= 1 AND revision >= 1
      AND source_srt_set_digest ~ '^[0-9a-f]{64}$' AND source_digest ~ '^[0-9a-f]{64}$'`,
  });
  pgm.createIndex('pre_edit_sessions', ['project_id', 'created_at']);
  pgm.createIndex('pre_edit_sessions', ['project_id'], {
    unique: true,
    name: 'pre_edit_sessions_one_writable_per_project',
    where: "status IN ('preparing', 'ready', 'limited')",
  });

  pgm.createTable('pre_edit_episodes', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    session_id: { type: 'uuid', notNull: true, references: 'pre_edit_sessions', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    company_asset_id: { type: 'uuid', notNull: true, references: 'assets', onDelete: 'RESTRICT' },
    asr_result_id: { type: 'uuid', references: 'asr_results', onDelete: 'RESTRICT' },
    asr_result_digest: { type: 'varchar(64)' },
    asr_asset_id: { type: 'uuid', references: 'assets', onDelete: 'RESTRICT' },
    asr_term_version_id: { type: 'uuid', references: 'term_versions', onDelete: 'RESTRICT' },
    asr_provider: { type: 'varchar(40)' },
    asr_adapter: { type: 'varchar(80)' },
    asr_model: { type: 'varchar(80)' },
    asr_language: { type: 'varchar(20)' },
    asr_config_digest: { type: 'varchar(64)' },
    asr_hotword_digest: { type: 'varchar(64)' },
    asr_quality_status: { type: 'asr_quality_status' },
    video_asset_id: { type: 'uuid', references: 'assets', onDelete: 'RESTRICT' },
    video_checksum_value: { type: 'varchar(128)' },
    status: { type: 'pre_edit_episode_status', notNull: true, default: 'preparing' },
    limited_reason: { type: 'varchar(500)' },
    policy_override: { type: 'pre_edit_baseline_policy' },
    completion_signature: { type: 'varchar(64)' },
    completed_at: { type: 'timestamptz' },
    revision: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('pre_edit_episodes', 'pre_edit_episodes_unique', {
    unique: ['session_id', 'episode_number'],
  });
  pgm.addConstraint('pre_edit_episodes', 'pre_edit_episodes_values_valid', {
    check: `episode_number BETWEEN 1 AND 100 AND revision >= 1
      AND (completion_signature IS NULL OR completion_signature ~ '^[0-9a-f]{64}$')
      AND ((asr_result_id IS NULL AND asr_result_digest IS NULL AND asr_asset_id IS NULL
        AND asr_term_version_id IS NULL AND asr_provider IS NULL AND asr_adapter IS NULL
        AND asr_model IS NULL AND asr_language IS NULL AND asr_config_digest IS NULL
        AND asr_hotword_digest IS NULL AND asr_quality_status IS NULL)
      OR (asr_result_id IS NOT NULL AND asr_result_digest ~ '^[0-9a-f]{64}$'
        AND asr_asset_id IS NOT NULL AND asr_term_version_id IS NOT NULL
        AND asr_provider IS NOT NULL AND asr_adapter IS NOT NULL AND asr_model IS NOT NULL
        AND asr_language IS NOT NULL AND asr_config_digest ~ '^[0-9a-f]{64}$'
        AND asr_hotword_digest ~ '^[0-9a-f]{64}$' AND asr_quality_status IN ('pass', 'warning')))`,
  });
  pgm.createIndex('pre_edit_episodes', ['session_id', 'episode_number']);

  pgm.createTable('pre_edit_prepare_jobs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    session_id: { type: 'uuid', notNull: true, unique: true, references: 'pre_edit_sessions', onDelete: 'CASCADE' },
    status: { type: 'pre_edit_prepare_status', notNull: true, default: 'queued' },
    attempt_count: { type: 'integer', notNull: true, default: 0 },
    lease_owner: { type: 'varchar(200)' },
    lease_expires_at: { type: 'timestamptz' },
    error_code: { type: 'varchar(100)' },
    error_detail: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('pre_edit_prepare_jobs', 'pre_edit_prepare_jobs_attempt_valid', {
    check: 'attempt_count >= 0',
  });
  pgm.createIndex('pre_edit_prepare_jobs', ['status', 'lease_expires_at', 'created_at']);

  pgm.createTable('pre_edit_alignment_groups', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    session_id: { type: 'uuid', notNull: true, references: 'pre_edit_sessions', onDelete: 'CASCADE' },
    episode_id: { type: 'uuid', notNull: true, references: 'pre_edit_episodes', onDelete: 'CASCADE' },
    kind: { type: 'pre_edit_alignment_kind', notNull: true },
    company_cue_ids: { type: 'varchar(64)[]', notNull: true, default: '{}' },
    asr_cue_ids: { type: 'uuid[]', notNull: true, default: '{}' },
    time_overlap_ms: { type: 'integer', notNull: true, default: 0 },
    text_similarity: { type: 'numeric(6,5)', notNull: true, default: 0 },
    algorithm_version: { type: 'varchar(80)', notNull: true },
    digest: { type: 'varchar(64)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('pre_edit_alignment_groups', 'pre_edit_alignment_groups_values_valid', {
    check: `time_overlap_ms >= 0 AND text_similarity BETWEEN 0 AND 1
      AND digest ~ '^[0-9a-f]{64}$' AND cardinality(company_cue_ids) + cardinality(asr_cue_ids) > 0`,
  });
  pgm.addConstraint('pre_edit_alignment_groups', 'pre_edit_alignment_groups_digest_unique', {
    unique: ['session_id', 'digest'],
  });
  pgm.createIndex('pre_edit_alignment_groups', ['episode_id', 'created_at']);

  pgm.createTable('pre_edit_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    session_id: { type: 'uuid', notNull: true, references: 'pre_edit_sessions', onDelete: 'CASCADE' },
    episode_id: { type: 'uuid', notNull: true, references: 'pre_edit_episodes', onDelete: 'CASCADE' },
    group_id: { type: 'uuid', notNull: true, references: 'pre_edit_alignment_groups', onDelete: 'CASCADE' },
    target_company_cue_id: { type: 'varchar(64)', references: 'term_cues', onDelete: 'RESTRICT' },
    policy_override: { type: 'pre_edit_baseline_policy' },
    system_action: { type: 'pre_edit_decision_action', notNull: true },
    system_text: { type: 'text', notNull: true },
    current_action: { type: 'pre_edit_decision_action', notNull: true },
    current_text: { type: 'text', notNull: true },
    decision_origin: { type: 'pre_edit_decision_origin', notNull: true, default: 'system' },
    current_decision_event_id: { type: 'uuid' },
    requires_review: { type: 'boolean', notNull: true, default: true },
    format_issues: { type: 'jsonb', notNull: true, default: '[]' },
    format_override_reason: { type: 'varchar(500)' },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('pre_edit_items', 'pre_edit_items_version_valid', { check: 'version >= 1' });
  pgm.createIndex('pre_edit_items', ['episode_id', 'requires_review', 'updated_at']);
  pgm.createIndex('pre_edit_items', ['session_id', 'target_company_cue_id'], {
    unique: true,
    name: 'pre_edit_items_target_company_unique',
    where: 'target_company_cue_id IS NOT NULL',
  });

  pgm.createTable('pre_edit_decision_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    session_id: { type: 'uuid', notNull: true, references: 'pre_edit_sessions', onDelete: 'CASCADE' },
    episode_id: { type: 'uuid', notNull: true, references: 'pre_edit_episodes', onDelete: 'CASCADE' },
    item_id: { type: 'uuid', notNull: true, references: 'pre_edit_items', onDelete: 'CASCADE' },
    event_kind: { type: 'varchar(32)', notNull: true },
    action: { type: 'pre_edit_decision_action', notNull: true },
    origin: { type: 'pre_edit_decision_origin', notNull: true },
    before_state: { type: 'jsonb', notNull: true },
    after_state: { type: 'jsonb', notNull: true },
    reverses_event_id: { type: 'uuid', references: 'pre_edit_decision_events', onDelete: 'RESTRICT' },
    actor: { type: 'varchar(120)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('pre_edit_decision_events', 'pre_edit_decision_events_kind_valid', {
    check: "event_kind IN ('baseline', 'policy', 'decision', 'undo')",
  });
  pgm.createIndex('pre_edit_decision_events', ['item_id', 'created_at', 'id']);
  pgm.addConstraint('pre_edit_items', 'pre_edit_items_current_event_fk', {
    foreignKeys: {
      columns: 'current_decision_event_id', references: 'pre_edit_decision_events(id)', onDelete: 'RESTRICT',
    },
  });

  pgm.createTable('pre_edit_policy_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    session_id: { type: 'uuid', notNull: true, references: 'pre_edit_sessions', onDelete: 'CASCADE' },
    scope: { type: 'varchar(20)', notNull: true },
    episode_numbers: { type: 'integer[]', notNull: true, default: '{}' },
    item_id: { type: 'uuid', references: 'pre_edit_items', onDelete: 'CASCADE' },
    policy: { type: 'pre_edit_baseline_policy', notNull: true },
    affected_item_count: { type: 'integer', notNull: true },
    protected_human_count: { type: 'integer', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('pre_edit_policy_events', 'pre_edit_policy_events_values_valid', {
    check: `scope IN ('series', 'episodes', 'item')
      AND affected_item_count >= 0 AND protected_human_count >= 0`,
  });

  pgm.createTable('pre_edit_releases', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    session_id: { type: 'uuid', notNull: true, references: 'pre_edit_sessions', onDelete: 'RESTRICT' },
    version: { type: 'integer', notNull: true },
    source_digest: { type: 'varchar(64)', notNull: true },
    decision_digest: { type: 'varchar(64)', notNull: true },
    release_digest: { type: 'varchar(64)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('pre_edit_releases', 'pre_edit_releases_project_version_unique', {
    unique: ['project_id', 'version'],
  });
  pgm.addConstraint('pre_edit_releases', 'pre_edit_releases_values_valid', {
    check: `version >= 1 AND source_digest ~ '^[0-9a-f]{64}$'
      AND decision_digest ~ '^[0-9a-f]{64}$' AND release_digest ~ '^[0-9a-f]{64}$'`,
  });
  pgm.createIndex('pre_edit_releases', ['project_id', 'created_at']);

  pgm.createTable('pre_edit_release_files', {
    release_id: { type: 'uuid', notNull: true, references: 'pre_edit_releases', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    file_name: { type: 'varchar(255)', notNull: true },
    cue_count: { type: 'integer', notNull: true },
    content_digest: { type: 'varchar(64)', notNull: true },
    bytes: { type: 'bytea', notNull: true },
  });
  pgm.addConstraint('pre_edit_release_files', 'pre_edit_release_files_primary', {
    primaryKey: ['release_id', 'episode_number'],
  });
  pgm.addConstraint('pre_edit_release_files', 'pre_edit_release_files_values_valid', {
    check: `episode_number BETWEEN 1 AND 100 AND cue_count >= 0
      AND content_digest ~ '^[0-9a-f]{64}$' AND octet_length(bytes) >= 3`,
  });

  pgm.createTable('pre_edit_commands', {
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    idempotency_key: { type: 'varchar(200)', notNull: true },
    command_kind: { type: 'varchar(80)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    resource_id: { type: 'uuid' },
    response_payload: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('pre_edit_commands', 'pre_edit_commands_primary', {
    primaryKey: ['project_id', 'idempotency_key'],
  });

  pgm.createTable('pre_edit_playback_grants', {
    token_digest: { type: 'varchar(64)', primaryKey: true },
    session_id: { type: 'uuid', notNull: true, references: 'pre_edit_sessions', onDelete: 'CASCADE' },
    episode_id: { type: 'uuid', notNull: true, references: 'pre_edit_episodes', onDelete: 'CASCADE' },
    asset_id: { type: 'uuid', notNull: true, references: 'assets', onDelete: 'CASCADE' },
    object_key: { type: 'varchar(700)', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('pre_edit_playback_grants', 'pre_edit_playback_grants_digest_valid', {
    check: "token_digest ~ '^[0-9a-f]{64}$'",
  });
  pgm.createIndex('pre_edit_playback_grants', ['expires_at']);

  pgm.sql(`
    CREATE FUNCTION reject_pre_edit_immutable_update() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'pre-edit evidence, events and releases are immutable';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER pre_edit_alignment_groups_immutable BEFORE UPDATE ON pre_edit_alignment_groups
      FOR EACH ROW EXECUTE FUNCTION reject_pre_edit_immutable_update();
    CREATE TRIGGER pre_edit_decision_events_immutable BEFORE UPDATE ON pre_edit_decision_events
      FOR EACH ROW EXECUTE FUNCTION reject_pre_edit_immutable_update();
    CREATE TRIGGER pre_edit_policy_events_immutable BEFORE UPDATE ON pre_edit_policy_events
      FOR EACH ROW EXECUTE FUNCTION reject_pre_edit_immutable_update();
    CREATE TRIGGER pre_edit_releases_immutable BEFORE UPDATE ON pre_edit_releases
      FOR EACH ROW EXECUTE FUNCTION reject_pre_edit_immutable_update();
    CREATE TRIGGER pre_edit_release_files_immutable BEFORE UPDATE ON pre_edit_release_files
      FOR EACH ROW EXECUTE FUNCTION reject_pre_edit_immutable_update();
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER pre_edit_release_files_immutable ON pre_edit_release_files');
  pgm.sql('DROP TRIGGER pre_edit_releases_immutable ON pre_edit_releases');
  pgm.sql('DROP TRIGGER pre_edit_policy_events_immutable ON pre_edit_policy_events');
  pgm.sql('DROP TRIGGER pre_edit_decision_events_immutable ON pre_edit_decision_events');
  pgm.sql('DROP TRIGGER pre_edit_alignment_groups_immutable ON pre_edit_alignment_groups');
  pgm.sql('DROP FUNCTION reject_pre_edit_immutable_update()');
  pgm.dropTable('pre_edit_playback_grants');
  pgm.dropTable('pre_edit_commands');
  pgm.dropTable('pre_edit_release_files');
  pgm.dropTable('pre_edit_releases');
  pgm.dropTable('pre_edit_policy_events');
  pgm.dropConstraint('pre_edit_items', 'pre_edit_items_current_event_fk');
  pgm.dropTable('pre_edit_decision_events');
  pgm.dropTable('pre_edit_items');
  pgm.dropTable('pre_edit_alignment_groups');
  pgm.dropTable('pre_edit_prepare_jobs');
  pgm.dropTable('pre_edit_episodes');
  pgm.dropTable('pre_edit_sessions');
  pgm.dropType('pre_edit_prepare_status');
  pgm.dropType('pre_edit_decision_origin');
  pgm.dropType('pre_edit_decision_action');
  pgm.dropType('pre_edit_baseline_policy');
  pgm.dropType('pre_edit_alignment_kind');
  pgm.dropType('pre_edit_episode_status');
  pgm.dropType('pre_edit_session_status');
};
