exports.up = (pgm) => {
  pgm.dropConstraint('asr_attempts', 'asr_attempts_hotword_payload_valid');
  pgm.addConstraint('asr_attempts', 'asr_attempts_hotword_payload_valid', {
    check: `(
      hotword_projection_version IS NULL AND hotword_payload_digest IS NULL
      AND hotword_payload_count IS NULL AND hotword_payload_character_count IS NULL
      AND hotword_receipt_status IS NULL
    ) OR (
      hotword_projection_version IS NOT NULL AND hotword_payload_digest ~ '^[0-9a-f]{64}$'
      AND hotword_payload_count >= 0 AND hotword_payload_character_count >= 0
      AND hotword_receipt_status IN ('simulated','submitted','partially_submitted','unsupported','unknown','unused')
    )`,
  });
  pgm.dropConstraint('asr_attempts', 'asr_attempts_hotword_receipt_facts_valid');
  pgm.addConstraint('asr_attempts', 'asr_attempts_hotword_receipt_facts_valid', {
    check: `
      (hotword_submitted_count IS NULL) = (hotword_omitted_count IS NULL)
      AND (hotword_submitted_count IS NULL OR hotword_submitted_count >= 0)
      AND (hotword_omitted_count IS NULL OR hotword_omitted_count >= 0)
      AND (hotword_receipt_reason_code IS NULL OR hotword_receipt_reason_code IN
        ('partial_submission','unsupported','unknown','no_confirmed_term_version'))`,
  });
  for (const table of ['asr_batches', 'asr_jobs', 'asr_results']) {
    pgm.alterColumn(table, 'term_version_id', { notNull: false });
  }
};

exports.down = (pgm) => {
  pgm.sql("DO $$ BEGIN IF EXISTS (SELECT 1 FROM asr_attempts WHERE hotword_receipt_status = 'unused') THEN RAISE EXCEPTION 'cannot restore hotword status constraint while unused rows exist'; END IF; END $$;");
  pgm.sql("DO $$ BEGIN IF EXISTS (SELECT 1 FROM asr_attempts WHERE hotword_receipt_reason_code = 'no_confirmed_term_version') THEN RAISE EXCEPTION 'cannot restore hotword reason constraint while no_confirmed_term_version rows exist'; END IF; END $$;");
  pgm.dropConstraint('asr_attempts', 'asr_attempts_hotword_payload_valid');
  pgm.addConstraint('asr_attempts', 'asr_attempts_hotword_payload_valid', {
    check: `(
      hotword_projection_version IS NULL AND hotword_payload_digest IS NULL
      AND hotword_payload_count IS NULL AND hotword_payload_character_count IS NULL
      AND hotword_receipt_status IS NULL
    ) OR (
      hotword_projection_version IS NOT NULL AND hotword_payload_digest ~ '^[0-9a-f]{64}$'
      AND hotword_payload_count >= 0 AND hotword_payload_character_count >= 0
      AND hotword_receipt_status IN ('simulated','submitted','partially_submitted','unsupported','unknown')
    )`,
  });
  pgm.dropConstraint('asr_attempts', 'asr_attempts_hotword_receipt_facts_valid');
  pgm.addConstraint('asr_attempts', 'asr_attempts_hotword_receipt_facts_valid', {
    check: `
      (hotword_submitted_count IS NULL) = (hotword_omitted_count IS NULL)
      AND (hotword_submitted_count IS NULL OR hotword_submitted_count >= 0)
      AND (hotword_omitted_count IS NULL OR hotword_omitted_count >= 0)
      AND (hotword_receipt_reason_code IS NULL OR hotword_receipt_reason_code IN
        ('partial_submission','unsupported','unknown'))`,
  });
  for (const table of ['asr_batches', 'asr_jobs', 'asr_results']) {
    pgm.sql(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM ${table} WHERE term_version_id IS NULL) THEN
        RAISE EXCEPTION 'cannot restore ${table}.term_version_id NOT NULL while NULL rows exist';
      END IF;
    END $$;`);
    pgm.alterColumn(table, 'term_version_id', { notNull: true });
  }
};
