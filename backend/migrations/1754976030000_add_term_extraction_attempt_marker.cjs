exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('term_extraction_runs', {
    provider_started_at: { type: 'timestamptz' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('term_extraction_runs', 'provider_started_at');
};
