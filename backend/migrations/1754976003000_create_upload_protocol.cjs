exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('upload_session_status', [
    'created', 'uploading', 'completing', 'verifying',
    'completed', 'failed', 'aborted', 'expired',
  ]);
  pgm.createType('upload_media_kind', ['srt', 'video']);

  pgm.createTable('assets', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    object_key: { type: 'varchar(700)', notNull: true, unique: true },
    original_filename: { type: 'varchar(255)', notNull: true },
    media_kind: { type: 'upload_media_kind', notNull: true },
    size_bytes: { type: 'bigint', notNull: true },
    checksum_algorithm: { type: 'varchar(20)', notNull: true },
    checksum_value: { type: 'varchar(128)', notNull: true },
    verified_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('assets', 'assets_size_positive', { check: 'size_bytes > 0' });
  pgm.createIndex('assets', ['project_id', 'created_at']);

  pgm.createTable('upload_sessions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    object_key: { type: 'varchar(700)', notNull: true, unique: true },
    original_filename: { type: 'varchar(255)', notNull: true },
    media_kind: { type: 'upload_media_kind', notNull: true },
    size_bytes: { type: 'bigint', notNull: true },
    part_size_bytes: { type: 'bigint', notNull: true },
    total_parts: { type: 'integer', notNull: true },
    storage_upload_id: { type: 'varchar(255)', notNull: true },
    file_fingerprint: { type: 'varchar(700)', notNull: true },
    checksum_algorithm: { type: 'varchar(20)', notNull: true },
    checksum_value: { type: 'varchar(128)', notNull: true },
    status: { type: 'upload_session_status', notNull: true, default: 'created' },
    expires_at: { type: 'timestamptz', notNull: true },
    error_code: { type: 'varchar(100)' },
    error_detail: { type: 'text' },
    version: { type: 'integer', notNull: true, default: 1 },
    asset_id: { type: 'uuid', references: 'assets', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('upload_sessions', 'upload_sessions_sizes_positive', {
    check: 'size_bytes > 0 AND part_size_bytes > 0 AND total_parts BETWEEN 1 AND 10000',
  });
  pgm.addConstraint('upload_sessions', 'upload_sessions_version_positive', { check: 'version >= 1' });
  pgm.createIndex('upload_sessions', ['project_id', 'status']);
  pgm.createIndex('upload_sessions', ['status', 'expires_at']);

  pgm.createTable('upload_parts', {
    upload_session_id: { type: 'uuid', notNull: true, references: 'upload_sessions', onDelete: 'CASCADE' },
    part_number: { type: 'integer', notNull: true },
    size_bytes: { type: 'bigint', notNull: true },
    etag: { type: 'varchar(200)', notNull: true },
    checksum_value: { type: 'varchar(128)', notNull: true },
    confirmed_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('upload_parts', 'upload_parts_primary', {
    primaryKey: ['upload_session_id', 'part_number'],
  });
  pgm.addConstraint('upload_parts', 'upload_parts_values_valid', {
    check: 'part_number BETWEEN 1 AND 10000 AND size_bytes > 0',
  });

  pgm.createTable('upload_commands', {
    idempotency_key: { type: 'varchar(200)', primaryKey: true },
    command_kind: { type: 'varchar(80)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    upload_session_id: { type: 'uuid', notNull: true, references: 'upload_sessions', onDelete: 'CASCADE' },
    asset_id: { type: 'uuid', references: 'assets', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('upload_commands');
  pgm.dropTable('upload_parts');
  pgm.dropTable('upload_sessions');
  pgm.dropTable('assets');
  pgm.dropType('upload_media_kind');
  pgm.dropType('upload_session_status');
};
