exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('upload_completion_job_status', [
    'scheduled', 'leased', 'retryable', 'failed', 'completed', 'cancelled',
  ]);
  pgm.createType('upload_completion_stage', [
    'queued', 'write_in_flight', 'verifying', 'reconciliation_required', 'binding',
  ]);
  pgm.createTable('upload_completion_jobs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    upload_session_id: {
      type: 'uuid', notNull: true, unique: true, references: 'upload_sessions', onDelete: 'CASCADE',
    },
    idempotency_key: { type: 'varchar(200)', notNull: true, unique: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    status: { type: 'upload_completion_job_status', notNull: true, default: 'scheduled' },
    stage: { type: 'upload_completion_stage', notNull: true, default: 'queued' },
    attempt_count: { type: 'integer', notNull: true, default: 0 },
    lease_owner: { type: 'varchar(200)' },
    lease_expires_at: { type: 'timestamptz' },
    next_attempt_at: { type: 'timestamptz', notNull: true },
    last_error_code: { type: 'varchar(100)' },
    last_error: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    completed_at: { type: 'timestamptz' },
  });
  pgm.addConstraint('upload_completion_jobs', 'upload_completion_jobs_attempt_count_valid', {
    check: 'attempt_count >= 0',
  });
  pgm.createIndex('upload_completion_jobs', ['status', 'next_attempt_at']);
  pgm.createIndex('upload_completion_jobs', ['status', 'lease_expires_at']);
};

exports.down = (pgm) => {
  pgm.dropTable('upload_completion_jobs');
  pgm.dropType('upload_completion_stage');
  pgm.dropType('upload_completion_job_status');
};
