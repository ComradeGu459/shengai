exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('asr_attempts', {
    hotword_submitted_count: { type: 'integer' },
    hotword_omitted_count: { type: 'integer' },
    hotword_receipt_reason_code: { type: 'varchar(80)' },
  });
  pgm.addConstraint('asr_attempts', 'asr_attempts_hotword_receipt_facts_valid', {
    check: `
      (hotword_submitted_count IS NULL) = (hotword_omitted_count IS NULL)
      AND (hotword_submitted_count IS NULL OR hotword_submitted_count >= 0)
      AND (hotword_omitted_count IS NULL OR hotword_omitted_count >= 0)
      AND (
        hotword_receipt_reason_code IS NULL
        OR hotword_receipt_reason_code IN ('partial_submission', 'unsupported', 'unknown')
      )
    `,
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('asr_attempts', 'asr_attempts_hotword_receipt_facts_valid');
  pgm.dropColumns('asr_attempts', [
    'hotword_submitted_count',
    'hotword_omitted_count',
    'hotword_receipt_reason_code',
  ]);
};
