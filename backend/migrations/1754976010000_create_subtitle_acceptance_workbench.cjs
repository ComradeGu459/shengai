exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('acceptance_session_status', [
    'draft', 'preflighting', 'ready_to_release', 'released', 'stale', 'blocked',
  ]);
  pgm.createType('acceptance_episode_status', [
    'not_started', 'in_review', 'changes_pending', 'blocked', 'rework_required', 'passed',
  ]);
  pgm.createType('acceptance_track', ['dialogue', 'screen_text']);
  pgm.createType('acceptance_issue_origin', ['automatic', 'manual']);
  pgm.createType('acceptance_issue_severity', ['error', 'warning']);
  pgm.createType('acceptance_issue_status', ['open', 'resolved', 'waived']);

  pgm.createTable('acceptance_sessions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    project_version: { type: 'integer', notNull: true },
    pre_edit_release_id: { type: 'uuid', notNull: true, references: 'pre_edit_releases', onDelete: 'RESTRICT' },
    pre_edit_head_release_id: { type: 'uuid', notNull: true, references: 'pre_edit_releases', onDelete: 'RESTRICT' },
    screen_text_release_id: { type: 'uuid', references: 'screen_text_releases', onDelete: 'RESTRICT' },
    screen_text_head_release_id: { type: 'uuid', references: 'screen_text_releases', onDelete: 'RESTRICT' },
    manifest_id: { type: 'uuid', notNull: true, references: 'material_manifests', onDelete: 'RESTRICT' },
    manifest_version: { type: 'integer', notNull: true },
    term_version_id: { type: 'uuid', notNull: true, references: 'term_versions', onDelete: 'RESTRICT' },
    rule_version: { type: 'varchar(80)', notNull: true },
    source_digest: { type: 'varchar(64)', notNull: true },
    source_snapshot: { type: 'jsonb', notNull: true },
    status: { type: 'acceptance_session_status', notNull: true, default: 'draft' },
    revision: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('acceptance_sessions', 'acceptance_sessions_values_valid', {
    check: `project_version >= 1 AND manifest_version >= 1 AND revision >= 1
      AND source_digest ~ '^[0-9a-f]{64}$'`,
  });
  pgm.createIndex('acceptance_sessions', ['project_id', 'created_at']);
  pgm.createIndex('acceptance_sessions', ['project_id'], {
    unique: true,
    name: 'acceptance_sessions_one_writable_per_project',
    where: "status IN ('draft', 'preflighting', 'ready_to_release', 'blocked')",
  });

  pgm.createTable('acceptance_episodes', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    session_id: { type: 'uuid', notNull: true, references: 'acceptance_sessions', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    available_videos: { type: 'jsonb', notNull: true, default: '[]' },
    selected_video_asset_id: { type: 'uuid', references: 'assets', onDelete: 'RESTRICT' },
    authoritative_duration_ms: { type: 'bigint' },
    status: { type: 'acceptance_episode_status', notNull: true, default: 'not_started' },
    pass_signature: { type: 'varchar(64)' },
    passed_at: { type: 'timestamptz' },
    revision: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('acceptance_episodes', 'acceptance_episodes_unique', { unique: ['session_id', 'episode_number'] });
  pgm.addConstraint('acceptance_episodes', 'acceptance_episodes_values_valid', {
    check: `episode_number BETWEEN 1 AND 100 AND revision >= 1
      AND (authoritative_duration_ms IS NULL OR authoritative_duration_ms > 0)
      AND (pass_signature IS NULL OR pass_signature ~ '^[0-9a-f]{64}$')`,
  });
  pgm.createIndex('acceptance_episodes', ['session_id', 'episode_number']);

  pgm.createTable('acceptance_cues', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    session_id: { type: 'uuid', notNull: true, references: 'acceptance_sessions', onDelete: 'CASCADE' },
    episode_id: { type: 'uuid', notNull: true, references: 'acceptance_episodes', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    track: { type: 'acceptance_track', notNull: true },
    ordinal: { type: 'integer', notNull: true },
    source_cue_id: { type: 'varchar(128)' },
    start_ms: { type: 'integer', notNull: true },
    end_ms: { type: 'integer', notNull: true },
    text: { type: 'text', notNull: true },
    source_metadata: { type: 'jsonb', notNull: true, default: '{}' },
    deleted: { type: 'boolean', notNull: true, default: false },
    revision: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('acceptance_cues', 'acceptance_cues_values_valid', {
    check: 'episode_number BETWEEN 1 AND 100 AND ordinal >= 1 AND start_ms >= 0 AND end_ms > start_ms AND revision >= 1',
  });
  pgm.createIndex('acceptance_cues', ['episode_id', 'track', 'start_ms', 'end_ms', 'id']);

  pgm.createTable('acceptance_edit_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    session_id: { type: 'uuid', notNull: true, references: 'acceptance_sessions', onDelete: 'CASCADE' },
    episode_id: { type: 'uuid', notNull: true, references: 'acceptance_episodes', onDelete: 'CASCADE' },
    event_kind: { type: 'varchar(40)', notNull: true },
    before_snapshot: { type: 'jsonb', notNull: true },
    after_snapshot: { type: 'jsonb', notNull: true },
    reverses_event_id: { type: 'uuid', references: 'acceptance_edit_events', onDelete: 'RESTRICT' },
    restores_event_id: { type: 'uuid', references: 'acceptance_edit_events', onDelete: 'RESTRICT' },
    actor: { type: 'varchar(120)', notNull: true, default: 'employee' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('acceptance_edit_events', 'acceptance_edit_events_kind_valid', {
    check: "event_kind IN ('edit', 'undo', 'redo', 'issue', 'video', 'pass', 'bulk_pass')",
  });
  pgm.createIndex('acceptance_edit_events', ['episode_id', 'created_at', 'id']);

  pgm.createTable('acceptance_issues', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    session_id: { type: 'uuid', notNull: true, references: 'acceptance_sessions', onDelete: 'CASCADE' },
    episode_id: { type: 'uuid', notNull: true, references: 'acceptance_episodes', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true },
    origin: { type: 'acceptance_issue_origin', notNull: true },
    code: { type: 'varchar(80)', notNull: true },
    severity: { type: 'acceptance_issue_severity', notNull: true },
    track: { type: 'acceptance_track' },
    cue_id: { type: 'uuid', references: 'acceptance_cues', onDelete: 'SET NULL' },
    time_ms: { type: 'integer' },
    note: { type: 'text', notNull: true },
    status: { type: 'acceptance_issue_status', notNull: true, default: 'open' },
    resolution_reason: { type: 'varchar(500)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('acceptance_issues', 'acceptance_issues_values_valid', {
    check: `episode_number BETWEEN 1 AND 100 AND (time_ms IS NULL OR time_ms >= 0)
      AND ((status = 'open' AND resolution_reason IS NULL) OR (status <> 'open' AND length(btrim(resolution_reason)) >= 8))`,
  });
  pgm.createIndex('acceptance_issues', ['episode_id', 'status', 'severity', 'created_at']);

  pgm.createTable('acceptance_rework_requests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    session_id: { type: 'uuid', notNull: true, references: 'acceptance_sessions', onDelete: 'RESTRICT' },
    episode_numbers: { type: 'integer[]', notNull: true },
    tracks: { type: 'acceptance_track[]', notNull: true },
    reason: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('acceptance_rework_requests', 'acceptance_rework_values_valid', {
    check: 'cardinality(episode_numbers) BETWEEN 1 AND 100 AND cardinality(tracks) BETWEEN 1 AND 2 AND length(btrim(reason)) >= 8',
  });

  pgm.createTable('acceptance_releases', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    session_id: { type: 'uuid', notNull: true, references: 'acceptance_sessions', onDelete: 'RESTRICT' },
    version: { type: 'integer', notNull: true },
    source_digest: { type: 'varchar(64)', notNull: true },
    acceptance_digest: { type: 'varchar(64)', notNull: true },
    cue_count: { type: 'integer', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('acceptance_releases', 'acceptance_releases_project_version_unique', { unique: ['project_id', 'version'] });
  pgm.addConstraint('acceptance_releases', 'acceptance_releases_values_valid', {
    check: "version >= 1 AND cue_count >= 0 AND source_digest ~ '^[0-9a-f]{64}$' AND acceptance_digest ~ '^[0-9a-f]{64}$'",
  });
  pgm.createTable('acceptance_release_cues', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    release_id: { type: 'uuid', notNull: true, references: 'acceptance_releases', onDelete: 'CASCADE' },
    episode_number: { type: 'integer', notNull: true }, track: { type: 'acceptance_track', notNull: true },
    ordinal: { type: 'integer', notNull: true }, source_working_cue_id: { type: 'uuid', notNull: true, references: 'acceptance_cues', onDelete: 'RESTRICT' },
    start_ms: { type: 'integer', notNull: true }, end_ms: { type: 'integer', notNull: true }, text: { type: 'text', notNull: true },
  });
  pgm.addConstraint('acceptance_release_cues', 'acceptance_release_cues_unique', { unique: ['release_id', 'episode_number', 'track', 'ordinal'] });

  pgm.createTable('acceptance_commands', {
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    idempotency_key: { type: 'varchar(200)', notNull: true }, command_kind: { type: 'varchar(80)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true }, resource_id: { type: 'uuid' }, response_payload: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('acceptance_commands', 'acceptance_commands_primary', { primaryKey: ['project_id', 'idempotency_key'] });

  pgm.createTable('acceptance_playback_grants', {
    token_digest: { type: 'varchar(64)', primaryKey: true }, session_id: { type: 'uuid', notNull: true, references: 'acceptance_sessions', onDelete: 'CASCADE' },
    episode_id: { type: 'uuid', notNull: true, references: 'acceptance_episodes', onDelete: 'CASCADE' }, asset_id: { type: 'uuid', notNull: true, references: 'assets', onDelete: 'CASCADE' },
    object_key: { type: 'varchar(700)', notNull: true }, expires_at: { type: 'timestamptz', notNull: true }, created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createIndex('acceptance_playback_grants', ['expires_at']);

  pgm.sql(`
    CREATE FUNCTION reject_acceptance_immutable_update() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'acceptance events and releases are immutable'; END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER acceptance_edit_events_immutable BEFORE UPDATE ON acceptance_edit_events FOR EACH ROW EXECUTE FUNCTION reject_acceptance_immutable_update();
    CREATE TRIGGER acceptance_rework_requests_immutable BEFORE UPDATE ON acceptance_rework_requests FOR EACH ROW EXECUTE FUNCTION reject_acceptance_immutable_update();
    CREATE TRIGGER acceptance_releases_immutable BEFORE UPDATE ON acceptance_releases FOR EACH ROW EXECUTE FUNCTION reject_acceptance_immutable_update();
    CREATE TRIGGER acceptance_release_cues_immutable BEFORE UPDATE ON acceptance_release_cues FOR EACH ROW EXECUTE FUNCTION reject_acceptance_immutable_update();
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER acceptance_release_cues_immutable ON acceptance_release_cues');
  pgm.sql('DROP TRIGGER acceptance_releases_immutable ON acceptance_releases');
  pgm.sql('DROP TRIGGER acceptance_rework_requests_immutable ON acceptance_rework_requests');
  pgm.sql('DROP TRIGGER acceptance_edit_events_immutable ON acceptance_edit_events');
  pgm.sql('DROP FUNCTION reject_acceptance_immutable_update()');
  pgm.dropTable('acceptance_playback_grants'); pgm.dropTable('acceptance_commands');
  pgm.dropTable('acceptance_release_cues'); pgm.dropTable('acceptance_releases');
  pgm.dropTable('acceptance_rework_requests'); pgm.dropTable('acceptance_issues');
  pgm.dropTable('acceptance_edit_events'); pgm.dropTable('acceptance_cues');
  pgm.dropTable('acceptance_episodes'); pgm.dropTable('acceptance_sessions');
  pgm.dropType('acceptance_issue_status'); pgm.dropType('acceptance_issue_severity');
  pgm.dropType('acceptance_issue_origin'); pgm.dropType('acceptance_track');
  pgm.dropType('acceptance_episode_status'); pgm.dropType('acceptance_session_status');
};
