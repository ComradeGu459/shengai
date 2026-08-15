exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('asr_dispatch_cancel_commands', {
    idempotency_key: { type: 'varchar(200)', primaryKey: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    dispatch_group_id: {
      type: 'uuid',
      notNull: true,
      references: 'asr_dispatch_groups',
      onDelete: 'CASCADE',
    },
    status: { type: 'varchar(20)', notNull: true, default: 'processing' },
    cancelled_batch_count: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    completed_at: { type: 'timestamptz' },
  });
  pgm.addConstraint('asr_dispatch_cancel_commands', 'asr_dispatch_cancel_commands_values_valid', {
    check: "status IN ('processing','completed') AND cancelled_batch_count >= 0",
  });
  pgm.createIndex('asr_dispatch_cancel_commands', ['dispatch_group_id', 'created_at']);
};

exports.down = (pgm) => {
  pgm.dropTable('asr_dispatch_cancel_commands');
};
