exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('cleanup_job_status', [
    'scheduled', 'leased', 'retryable', 'failed', 'completed', 'cancelled',
  ]);
  pgm.createType('multipart_cleanup_status', ['pending', 'retryable', 'completed']);

  pgm.createTable('project_lifecycle_commands', {
    idempotency_key: { type: 'varchar(200)', primaryKey: true },
    command_kind: { type: 'varchar(40)', notNull: true },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    request_hash: { type: 'varchar(64)', notNull: true },
    result_project: { type: 'jsonb', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createIndex('project_lifecycle_commands', ['project_id', 'created_at']);

  pgm.createTable('cleanup_jobs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, unique: true, references: 'projects', onDelete: 'CASCADE' },
    status: { type: 'cleanup_job_status', notNull: true, default: 'scheduled' },
    attempt_count: { type: 'integer', notNull: true, default: 0 },
    lease_owner: { type: 'varchar(200)' },
    lease_expires_at: { type: 'timestamptz' },
    next_attempt_at: { type: 'timestamptz', notNull: true },
    last_error: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    completed_at: { type: 'timestamptz' },
  });
  pgm.addConstraint('cleanup_jobs', 'cleanup_jobs_attempt_count_valid', {
    check: 'attempt_count >= 0',
  });
  pgm.createIndex('cleanup_jobs', ['status', 'next_attempt_at']);
  pgm.createIndex('cleanup_jobs', ['status', 'lease_expires_at']);

  pgm.createTable('project_upload_cleanups', {
    upload_session_id: {
      type: 'uuid', primaryKey: true, references: 'upload_sessions', onDelete: 'CASCADE',
    },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    storage_upload_id: { type: 'varchar(255)', notNull: true },
    status: { type: 'multipart_cleanup_status', notNull: true, default: 'pending' },
    attempt_count: { type: 'integer', notNull: true, default: 0 },
    last_error: { type: 'text' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    completed_at: { type: 'timestamptz' },
  });
  pgm.addConstraint('project_upload_cleanups', 'project_upload_cleanups_attempt_count_valid', {
    check: 'attempt_count >= 0',
  });
  pgm.createIndex('project_upload_cleanups', ['project_id', 'status']);

  pgm.createTable('project_lifecycle_audit_events', {
    id: { type: 'bigserial', primaryKey: true },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    event_kind: { type: 'varchar(80)', notNull: true },
    details: { type: 'jsonb', notNull: true, default: '{}' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createIndex('project_lifecycle_audit_events', ['project_id', 'created_at']);

  pgm.createTable('project_purge_tombstones', {
    project_id: { type: 'uuid', primaryKey: true, references: 'projects', onDelete: 'CASCADE' },
    cleanup_job_id: { type: 'uuid', notNull: true },
    recycled_at: { type: 'timestamptz', notNull: true },
    purged_at: { type: 'timestamptz', notNull: true },
    asset_count: { type: 'integer', notNull: true },
    object_deleted_count: { type: 'integer', notNull: true },
    object_missing_count: { type: 'integer', notNull: true },
    terminated_upload_count: { type: 'integer', notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('project_purge_tombstones');
  pgm.dropTable('project_lifecycle_audit_events');
  pgm.dropTable('project_upload_cleanups');
  pgm.dropTable('cleanup_jobs');
  pgm.dropTable('project_lifecycle_commands');
  pgm.dropType('multipart_cleanup_status');
  pgm.dropType('cleanup_job_status');
};
