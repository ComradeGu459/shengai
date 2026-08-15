exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql("ALTER TYPE asr_batch_status ADD VALUE IF NOT EXISTS 'cancel_requested' AFTER 'running'");
  pgm.sql("ALTER TYPE asr_batch_status ADD VALUE IF NOT EXISTS 'reconciliation_required' BEFORE 'failed'");

  pgm.addColumns('asr_batches', {
    hotword_projection_version: {
      type: 'varchar(80)',
      notNull: true,
      default: 'term-version-hotwords-v1',
    },
    hotword_max_entries: { type: 'integer', default: 100 },
    hotword_max_characters: { type: 'integer', default: 2000 },
    hotword_supported: { type: 'boolean', notNull: true, default: true },
  });
  pgm.addConstraint('asr_batches', 'asr_batches_hotword_capabilities_valid', {
    check: '(hotword_max_entries IS NULL OR hotword_max_entries > 0) AND (hotword_max_characters IS NULL OR hotword_max_characters > 0)',
  });

  pgm.addColumns('asr_attempts', {
    hotword_projection_version: { type: 'varchar(80)' },
    hotword_payload_digest: { type: 'varchar(64)' },
    hotword_payload_count: { type: 'integer' },
    hotword_payload_character_count: { type: 'integer' },
    hotword_receipt_status: { type: 'varchar(32)' },
  });
  pgm.addConstraint('asr_attempts', 'asr_attempts_hotword_payload_valid', {
    check: `(
      hotword_projection_version IS NULL
      AND hotword_payload_digest IS NULL
      AND hotword_payload_count IS NULL
      AND hotword_payload_character_count IS NULL
      AND hotword_receipt_status IS NULL
    ) OR (
      hotword_projection_version IS NOT NULL
      AND hotword_payload_digest ~ '^[0-9a-f]{64}$'
      AND hotword_payload_count >= 0
      AND hotword_payload_character_count >= 0
      AND hotword_receipt_status IN (
        'simulated', 'submitted', 'partially_submitted', 'unsupported', 'unknown'
      )
    )`,
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('asr_attempts', 'asr_attempts_hotword_payload_valid');
  pgm.dropColumns('asr_attempts', [
    'hotword_projection_version',
    'hotword_payload_digest',
    'hotword_payload_count',
    'hotword_payload_character_count',
    'hotword_receipt_status',
  ]);
  pgm.dropConstraint('asr_batches', 'asr_batches_hotword_capabilities_valid');
  pgm.dropColumns('asr_batches', [
    'hotword_projection_version',
    'hotword_max_entries',
    'hotword_max_characters',
    'hotword_supported',
  ]);
};
