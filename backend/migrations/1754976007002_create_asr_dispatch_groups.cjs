exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('asr_dispatch_groups', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_ids: { type: 'uuid[]', notNull: true },
    allow_partial: { type: 'boolean', notNull: true, default: false },
    status: { type: 'varchar(20)', notNull: true, default: 'processing' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('asr_dispatch_groups', 'asr_dispatch_groups_values_valid', {
    check: "cardinality(project_ids) BETWEEN 1 AND 20 AND status IN ('processing','accepted','partial','blocked')",
  });
  pgm.createIndex('asr_dispatch_groups', ['created_at']);
  pgm.createIndex('asr_dispatch_groups', ['status', 'created_at']);

  pgm.createTable('asr_dispatch_project_results', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    dispatch_group_id: {
      type: 'uuid',
      notNull: true,
      references: 'asr_dispatch_groups',
      onDelete: 'CASCADE',
    },
    project_id: { type: 'uuid', notNull: true },
    selection_order: { type: 'integer', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    eligibility_snapshot: { type: 'jsonb' },
    dispatch_error: { type: 'jsonb' },
    batch_id: { type: 'uuid', references: 'asr_batches', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('asr_dispatch_project_results', 'asr_dispatch_project_results_unique', {
    unique: ['dispatch_group_id', 'project_id'],
  });
  pgm.addConstraint('asr_dispatch_project_results', 'asr_dispatch_project_results_values_valid', {
    check: "selection_order BETWEEN 1 AND 20 AND status IN ('pending','ready','accepted','blocked')",
  });
  pgm.createIndex('asr_dispatch_project_results', ['dispatch_group_id', 'selection_order']);
  pgm.createIndex('asr_dispatch_project_results', ['project_id', 'created_at']);

  pgm.createTable('asr_dispatch_commands', {
    idempotency_key: { type: 'varchar(200)', primaryKey: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    dispatch_group_id: {
      type: 'uuid',
      notNull: true,
      references: 'asr_dispatch_groups',
      onDelete: 'CASCADE',
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createSequence('asr_project_claim_sequence');
  pgm.createTable('asr_project_scheduling', {
    project_id: { type: 'uuid', primaryKey: true, references: 'projects', onDelete: 'CASCADE' },
    last_claim_sequence: { type: 'bigint', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('asr_project_scheduling');
  pgm.dropSequence('asr_project_claim_sequence');
  pgm.dropTable('asr_dispatch_commands');
  pgm.dropTable('asr_dispatch_project_results');
  pgm.dropTable('asr_dispatch_groups');
};
