exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('delivery_products', {
    failure_reason: { type: 'text' },
    failure_request_id: { type: 'varchar(200)' },
  });

  pgm.createTable('delivery_jobs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    delivery_id: { type: 'uuid', notNull: true, unique: true, references: 'delivery_products', onDelete: 'CASCADE' },
    status: { type: 'delivery_product_status', notNull: true, default: 'preparing' },
    lease_owner: { type: 'varchar(200)' },
    lease_expires_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createIndex('delivery_jobs', ['status', 'lease_expires_at', 'created_at']);

  pgm.addColumns('delivery_attempts', {
    attempt_number: { type: 'integer', notNull: true, default: 1 },
    lease_owner: { type: 'varchar(200)' },
    lease_expires_at: { type: 'timestamptz' },
    started_at: { type: 'timestamptz' },
  });
  pgm.addConstraint('delivery_attempts', 'delivery_attempts_number_positive', { check: 'attempt_number >= 1' });
  pgm.addConstraint('delivery_attempts', 'delivery_attempts_delivery_number_unique', { unique: ['delivery_id', 'attempt_number'] });

  pgm.addColumns('delivery_files', {
    object_key: { type: 'varchar(700)' },
    metadata: { type: 'jsonb', notNull: true, default: '{}' },
  });
  pgm.dropConstraint('delivery_files', 'delivery_files_values_valid');
  pgm.sql("UPDATE delivery_files file SET object_key = 'deliveries/' || product.project_id::text || '/' || file.delivery_id::text || '/files/' || file.id::text FROM delivery_products product WHERE product.id = file.delivery_id AND file.object_key IS NULL");
  pgm.alterColumn('delivery_files', 'object_key', { notNull: true });
  pgm.dropColumns('delivery_files', ['bytes']);
  pgm.addConstraint('delivery_files', 'delivery_files_values_valid', {
    check: `length(btrim(file_name)) > 0 AND object_key ~ '^deliveries/[0-9a-f-]{36}/[0-9a-f-]{36}/files/[0-9a-f-]{36}$'
      AND content_digest ~ '^[0-9a-f]{64}$' AND size_bytes >= 0 AND cue_count >= 0
      AND ((kind = 'terms_xlsx' AND episode_number IS NULL) OR (kind <> 'terms_xlsx' AND episode_number BETWEEN 1 AND 100))`,
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('delivery_files', 'delivery_files_values_valid');
  pgm.addColumns('delivery_files', { bytes: { type: 'bytea', notNull: true, default: pgm.func("decode('', 'hex')") } });
  pgm.dropColumns('delivery_files', ['metadata', 'object_key']);
  pgm.addConstraint('delivery_files', 'delivery_files_values_valid', {
    check: `length(btrim(file_name)) > 0 AND content_digest ~ '^[0-9a-f]{64}$'
      AND size_bytes >= 0 AND cue_count >= 0 AND octet_length(bytes) >= 3
      AND ((kind = 'terms_xlsx' AND episode_number IS NULL) OR (kind <> 'terms_xlsx' AND episode_number BETWEEN 1 AND 100))`,
  });
  pgm.dropConstraint('delivery_attempts', 'delivery_attempts_delivery_number_unique');
  pgm.dropConstraint('delivery_attempts', 'delivery_attempts_number_positive');
  pgm.dropColumns('delivery_attempts', ['attempt_number', 'lease_owner', 'lease_expires_at', 'started_at']);
  pgm.dropTable('delivery_jobs');
  pgm.dropColumns('delivery_products', ['failure_reason', 'failure_request_id']);
};
