exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('term_candidate_type', [
    '人名', '地名', '特定物品', '朝代', '组织名', '等级', '物种/种族名', '特殊概念/事件',
  ]);
  pgm.createType('term_candidate_status', ['pending', 'approved', 'edited', 'rejected']);
  pgm.createType('term_gender', ['male', 'female', 'unknown']);
  pgm.createType('term_extraction_status', ['running', 'completed', 'failed']);
  pgm.createType('term_draft_status', ['active', 'confirmed', 'superseded']);
  pgm.createType('term_candidate_origin', ['extracted', 'manual']);
  pgm.createType('term_decision_action', ['approved', 'edited', 'rejected', 'restored', 'added']);

  pgm.createTable('term_extraction_runs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    draft_id: { type: 'uuid' },
    source_srt_set_digest: { type: 'varchar(64)', notNull: true },
    prompt_version: { type: 'varchar(80)', notNull: true },
    adapter: { type: 'varchar(120)', notNull: true },
    adapter_config: { type: 'jsonb', notNull: true, default: '{}' },
    usage_summary: { type: 'jsonb', notNull: true, default: '{}' },
    status: { type: 'term_extraction_status', notNull: true, default: 'running' },
    request_id: { type: 'varchar(200)', notNull: true },
    cue_count: { type: 'integer', notNull: true, default: 0 },
    candidate_count: { type: 'integer', notNull: true, default: 0 },
    diagnostics: { type: 'jsonb', notNull: true, default: '[]' },
    error_code: { type: 'varchar(100)' },
    error_detail: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    completed_at: { type: 'timestamptz' },
  });
  pgm.addConstraint('term_extraction_runs', 'term_extraction_counts_valid', {
    check: 'cue_count >= 0 AND candidate_count >= 0',
  });
  pgm.createIndex('term_extraction_runs', ['project_id', 'created_at']);

  pgm.createTable('term_drafts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    source_srt_set_digest: { type: 'varchar(64)', notNull: true },
    prompt_version: { type: 'varchar(80)', notNull: true },
    base_term_version_id: { type: 'uuid' },
    status: { type: 'term_draft_status', notNull: true, default: 'active' },
    revision: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('term_drafts', 'term_drafts_revision_positive', { check: 'revision >= 1' });
  pgm.createIndex('term_drafts', ['project_id', 'created_at']);
  pgm.createIndex('term_drafts', ['project_id'], {
    unique: true,
    name: 'term_drafts_one_active_per_project',
    where: "status = 'active'",
  });

  pgm.createTable('term_cues', {
    id: { type: 'varchar(64)', primaryKey: true },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    source_srt_set_digest: { type: 'varchar(64)', notNull: true },
    asset_id: { type: 'uuid', notNull: true, references: 'assets', onDelete: 'RESTRICT' },
    episode_number: { type: 'integer', notNull: true },
    cue_index: { type: 'integer', notNull: true },
    start_ms: { type: 'integer', notNull: true },
    end_ms: { type: 'integer', notNull: true },
    text: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('term_cues', 'term_cues_values_valid', {
    check: 'episode_number BETWEEN 1 AND 100 AND cue_index >= 1 AND start_ms >= 0 AND end_ms > start_ms AND length(text) > 0',
  });
  pgm.addConstraint('term_cues', 'term_cues_source_axis_unique', {
    unique: ['source_srt_set_digest', 'asset_id', 'cue_index'],
  });
  pgm.createIndex('term_cues', ['project_id', 'source_srt_set_digest', 'episode_number', 'cue_index']);

  pgm.createTable('term_candidates', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    draft_id: { type: 'uuid', notNull: true, references: 'term_drafts', onDelete: 'CASCADE' },
    type: { type: 'term_candidate_type', notNull: true },
    name: { type: 'varchar(120)', notNull: true },
    aliases: { type: 'jsonb', notNull: true, default: '[]' },
    gender: { type: 'term_gender', notNull: true, default: 'unknown' },
    note: { type: 'varchar(500)', notNull: true, default: '' },
    origin: { type: 'term_candidate_origin', notNull: true },
    confidence: { type: 'numeric(5,4)' },
    status: { type: 'term_candidate_status', notNull: true, default: 'pending' },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('term_candidates', 'term_candidates_values_valid', {
    check: "length(btrim(name)) > 0 AND version >= 1 AND (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))",
  });
  pgm.addConstraint('term_candidates', 'term_candidates_draft_identity_unique', {
    unique: ['draft_id', 'type', 'name'],
  });
  pgm.createIndex('term_candidates', ['draft_id', 'status', 'type']);

  pgm.createTable('term_evidence', {
    candidate_id: { type: 'uuid', notNull: true, references: 'term_candidates', onDelete: 'CASCADE' },
    cue_id: { type: 'varchar(64)', notNull: true, references: 'term_cues', onDelete: 'RESTRICT' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('term_evidence', 'term_evidence_primary', { primaryKey: ['candidate_id', 'cue_id'] });

  pgm.createTable('term_decision_events', {
    id: { type: 'bigserial', primaryKey: true },
    candidate_id: { type: 'uuid', notNull: true, references: 'term_candidates', onDelete: 'RESTRICT' },
    draft_id: { type: 'uuid', notNull: true, references: 'term_drafts', onDelete: 'RESTRICT' },
    action: { type: 'term_decision_action', notNull: true },
    before_state: { type: 'jsonb' },
    after_state: { type: 'jsonb', notNull: true },
    actor: { type: 'varchar(120)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createIndex('term_decision_events', ['candidate_id', 'created_at']);
  pgm.sql(`
    CREATE FUNCTION reject_term_decision_event_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'term decision events are immutable';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER term_decision_events_immutable
      BEFORE UPDATE OR DELETE ON term_decision_events
      FOR EACH ROW EXECUTE FUNCTION reject_term_decision_event_mutation();
  `);

  pgm.createTable('term_versions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    version: { type: 'integer', notNull: true },
    draft_id: { type: 'uuid', notNull: true, unique: true, references: 'term_drafts', onDelete: 'RESTRICT' },
    source_srt_set_digest: { type: 'varchar(64)', notNull: true },
    prompt_version: { type: 'varchar(80)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('term_versions', 'term_versions_project_version_unique', {
    unique: ['project_id', 'version'],
  });
  pgm.addConstraint('term_versions', 'term_versions_version_positive', { check: 'version >= 1' });

  pgm.createTable('term_version_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    term_version_id: { type: 'uuid', notNull: true, references: 'term_versions', onDelete: 'CASCADE' },
    source_candidate_id: { type: 'uuid', notNull: true, references: 'term_candidates', onDelete: 'RESTRICT' },
    sort_order: { type: 'integer', notNull: true },
    type: { type: 'term_candidate_type', notNull: true },
    name: { type: 'varchar(120)', notNull: true },
    aliases: { type: 'jsonb', notNull: true },
    gender: { type: 'term_gender', notNull: true },
    note: { type: 'varchar(500)', notNull: true },
    first_episode_number: { type: 'integer', notNull: true },
    first_cue_index: { type: 'integer', notNull: true },
  });
  pgm.addConstraint('term_version_items', 'term_version_items_order_unique', {
    unique: ['term_version_id', 'sort_order'],
  });
  pgm.createIndex('term_version_items', ['term_version_id', 'type', 'first_episode_number', 'first_cue_index']);
  pgm.sql(`
    CREATE FUNCTION reject_term_snapshot_update() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'confirmed term snapshots are immutable';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER term_versions_immutable
      BEFORE UPDATE ON term_versions
      FOR EACH ROW EXECUTE FUNCTION reject_term_snapshot_update();
    CREATE TRIGGER term_version_items_immutable
      BEFORE UPDATE ON term_version_items
      FOR EACH ROW EXECUTE FUNCTION reject_term_snapshot_update();
  `);

  pgm.addConstraint('term_drafts', 'term_drafts_base_version_fk', {
    foreignKeys: {
      columns: 'base_term_version_id',
      references: 'term_versions(id)',
      onDelete: 'RESTRICT',
    },
  });
  pgm.addConstraint('term_extraction_runs', 'term_extraction_runs_draft_fk', {
    foreignKeys: {
      columns: 'draft_id',
      references: 'term_drafts(id)',
      onDelete: 'SET NULL',
    },
  });

  pgm.createTable('term_extraction_commands', {
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    idempotency_key: { type: 'varchar(200)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    run_id: { type: 'uuid', notNull: true, references: 'term_extraction_runs', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('term_extraction_commands', 'term_extraction_commands_primary', {
    primaryKey: ['project_id', 'idempotency_key'],
  });

  pgm.createTable('term_draft_commands', {
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    idempotency_key: { type: 'varchar(200)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    draft_id: { type: 'uuid', notNull: true, references: 'term_drafts', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('term_draft_commands', 'term_draft_commands_primary', {
    primaryKey: ['project_id', 'idempotency_key'],
  });

  pgm.createTable('term_version_commands', {
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    idempotency_key: { type: 'varchar(200)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    term_version_id: { type: 'uuid', notNull: true, references: 'term_versions', onDelete: 'RESTRICT' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('term_version_commands', 'term_version_commands_primary', {
    primaryKey: ['project_id', 'idempotency_key'],
  });
};

exports.down = (pgm) => {
  pgm.dropTable('term_version_commands');
  pgm.dropTable('term_draft_commands');
  pgm.dropTable('term_extraction_commands');
  pgm.dropConstraint('term_extraction_runs', 'term_extraction_runs_draft_fk');
  pgm.dropConstraint('term_drafts', 'term_drafts_base_version_fk');
  pgm.sql('DROP TRIGGER term_version_items_immutable ON term_version_items');
  pgm.sql('DROP TRIGGER term_versions_immutable ON term_versions');
  pgm.sql('DROP FUNCTION reject_term_snapshot_update()');
  pgm.dropTable('term_version_items');
  pgm.dropTable('term_versions');
  pgm.sql('DROP TRIGGER term_decision_events_immutable ON term_decision_events');
  pgm.sql('DROP FUNCTION reject_term_decision_event_mutation()');
  pgm.dropTable('term_decision_events');
  pgm.dropTable('term_evidence');
  pgm.dropTable('term_candidates');
  pgm.dropTable('term_cues');
  pgm.dropTable('term_drafts');
  pgm.dropTable('term_extraction_runs');
  pgm.dropType('term_decision_action');
  pgm.dropType('term_candidate_origin');
  pgm.dropType('term_draft_status');
  pgm.dropType('term_extraction_status');
  pgm.dropType('term_gender');
  pgm.dropType('term_candidate_status');
  pgm.dropType('term_candidate_type');
};
