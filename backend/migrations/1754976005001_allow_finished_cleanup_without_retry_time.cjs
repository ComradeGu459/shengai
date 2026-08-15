exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.alterColumn('cleanup_jobs', 'next_attempt_at', { notNull: false });
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE cleanup_jobs
       SET next_attempt_at = COALESCE(next_attempt_at, updated_at)
     WHERE next_attempt_at IS NULL
  `);
  pgm.alterColumn('cleanup_jobs', 'next_attempt_at', { notNull: true });
};
