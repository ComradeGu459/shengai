exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('delivery_product_status', ['preparing', 'ready', 'generation_failed', 'recycled']);
  pgm.createType('delivery_file_kind', ['dialogue_srt', 'screen_text_srt', 'terms_xlsx']);

  pgm.createTable('delivery_products', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    acceptance_session_id: { type: 'uuid', notNull: true, references: 'acceptance_sessions', onDelete: 'RESTRICT' },
    acceptance_release_id: { type: 'uuid', notNull: true, references: 'acceptance_releases', onDelete: 'RESTRICT' },
    version: { type: 'integer', notNull: true },
    name: { type: 'varchar(255)', notNull: true },
    status: { type: 'delivery_product_status', notNull: true, default: 'preparing' },
    owner: { type: 'varchar(120)', notNull: true, default: '' },
    note: { type: 'text', notNull: true, default: '' },
    request_id: { type: 'varchar(200)', notNull: true },
    source_snapshot: { type: 'jsonb', notNull: true },
    file_summary: { type: 'jsonb', notNull: true, default: '{}' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('delivery_products', 'delivery_products_version_unique', { unique: ['project_id', 'version'] });
  pgm.addConstraint('delivery_products', 'delivery_products_session_unique', { unique: ['project_id', 'acceptance_session_id'] });
  pgm.addConstraint('delivery_products', 'delivery_products_values_valid', {
    check: `version >= 1 AND length(btrim(name)) > 0 AND length(owner) <= 120`,
  });
  pgm.createIndex('delivery_products', ['project_id', 'created_at']);
  pgm.createIndex('delivery_products', ['status', 'updated_at']);

  pgm.createTable('delivery_manifests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    delivery_id: { type: 'uuid', notNull: true, unique: true, references: 'delivery_products', onDelete: 'CASCADE' },
    version: { type: 'integer', notNull: true, default: 1 },
    digest: { type: 'varchar(64)', notNull: true },
    file_count: { type: 'integer', notNull: true },
    dialogue_cue_count: { type: 'integer', notNull: true },
    screen_text_cue_count: { type: 'integer', notNull: true },
    term_count: { type: 'integer', notNull: true },
    source_snapshot: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('delivery_manifests', 'delivery_manifests_values_valid', {
    check: `version >= 1 AND digest ~ '^[0-9a-f]{64}$' AND file_count >= 0
      AND dialogue_cue_count >= 0 AND screen_text_cue_count >= 0 AND term_count >= 0`,
  });

  pgm.createTable('delivery_files', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    delivery_id: { type: 'uuid', notNull: true, references: 'delivery_products', onDelete: 'CASCADE' },
    manifest_id: { type: 'uuid', notNull: true, references: 'delivery_manifests', onDelete: 'CASCADE' },
    kind: { type: 'delivery_file_kind', notNull: true },
    episode_number: { type: 'integer' },
    file_name: { type: 'varchar(255)', notNull: true },
    content_type: { type: 'varchar(120)', notNull: true },
    content_digest: { type: 'varchar(64)', notNull: true },
    size_bytes: { type: 'integer', notNull: true },
    cue_count: { type: 'integer', notNull: true, default: 0 },
    empty_track: { type: 'boolean', notNull: true, default: false },
    bytes: { type: 'bytea', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('delivery_files', 'delivery_files_identity_unique', { unique: ['delivery_id', 'kind', 'episode_number'] });
  pgm.addConstraint('delivery_files', 'delivery_files_values_valid', {
    check: `length(btrim(file_name)) > 0 AND content_digest ~ '^[0-9a-f]{64}$'
      AND size_bytes >= 0 AND cue_count >= 0 AND octet_length(bytes) >= 3
      AND ((kind = 'terms_xlsx' AND episode_number IS NULL) OR (kind <> 'terms_xlsx' AND episode_number BETWEEN 1 AND 100))`,
  });
  pgm.createIndex('delivery_files', ['delivery_id', 'kind', 'episode_number']);

  pgm.createTable('delivery_manifest_files', {
    manifest_id: { type: 'uuid', notNull: true, references: 'delivery_manifests', onDelete: 'CASCADE' },
    file_id: { type: 'uuid', notNull: true, references: 'delivery_files', onDelete: 'RESTRICT' },
    episode_number: { type: 'integer' },
    kind: { type: 'delivery_file_kind', notNull: true },
    ordinal: { type: 'integer', notNull: true },
  });
  pgm.addConstraint('delivery_manifest_files', 'delivery_manifest_files_primary', { primaryKey: ['manifest_id', 'file_id'] });

  pgm.createTable('delivery_attempts', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    delivery_id: { type: 'uuid', notNull: true, references: 'delivery_products', onDelete: 'CASCADE' },
    status: { type: 'delivery_product_status', notNull: true },
    stage: { type: 'varchar(80)', notNull: true },
    request_id: { type: 'varchar(200)', notNull: true },
    error_code: { type: 'varchar(120)' },
    error_detail: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    completed_at: { type: 'timestamptz' },
  });
  pgm.createIndex('delivery_attempts', ['delivery_id', 'created_at']);

  pgm.createTable('delivery_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    delivery_id: { type: 'uuid', notNull: true, references: 'delivery_products', onDelete: 'CASCADE' },
    event_kind: { type: 'varchar(80)', notNull: true },
    request_id: { type: 'varchar(200)', notNull: true },
    detail: { type: 'jsonb', notNull: true, default: '{}' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createIndex('delivery_events', ['delivery_id', 'created_at', 'id']);

  pgm.createTable('delivery_commands', {
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    idempotency_key: { type: 'varchar(200)', notNull: true },
    command_kind: { type: 'varchar(80)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    delivery_id: { type: 'uuid', notNull: true, references: 'delivery_products', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('delivery_commands', 'delivery_commands_primary', { primaryKey: ['project_id', 'idempotency_key'] });

  pgm.sql(`
    CREATE FUNCTION reject_delivery_immutable_update() RETURNS trigger AS $$
    BEGIN RAISE EXCEPTION 'delivery manifests, files and events are immutable'; END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER delivery_manifests_immutable BEFORE UPDATE ON delivery_manifests FOR EACH ROW EXECUTE FUNCTION reject_delivery_immutable_update();
    CREATE TRIGGER delivery_files_immutable BEFORE UPDATE ON delivery_files FOR EACH ROW EXECUTE FUNCTION reject_delivery_immutable_update();
    CREATE TRIGGER delivery_manifest_files_immutable BEFORE UPDATE ON delivery_manifest_files FOR EACH ROW EXECUTE FUNCTION reject_delivery_immutable_update();
    CREATE TRIGGER delivery_events_immutable BEFORE UPDATE ON delivery_events FOR EACH ROW EXECUTE FUNCTION reject_delivery_immutable_update();
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER delivery_events_immutable ON delivery_events');
  pgm.sql('DROP TRIGGER delivery_manifest_files_immutable ON delivery_manifest_files');
  pgm.sql('DROP TRIGGER delivery_files_immutable ON delivery_files');
  pgm.sql('DROP TRIGGER delivery_manifests_immutable ON delivery_manifests');
  pgm.sql('DROP FUNCTION reject_delivery_immutable_update()');
  pgm.dropTable('delivery_commands'); pgm.dropTable('delivery_events'); pgm.dropTable('delivery_attempts');
  pgm.dropTable('delivery_manifest_files'); pgm.dropTable('delivery_files'); pgm.dropTable('delivery_manifests'); pgm.dropTable('delivery_products');
  pgm.dropType('delivery_file_kind'); pgm.dropType('delivery_product_status');
};
