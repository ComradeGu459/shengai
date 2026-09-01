exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('term_extraction_runs', {
    claimed_by: { type: 'varchar(120)' },
    claim_expires_at: { type: 'timestamptz' },
  });
  pgm.createIndex('term_extraction_runs', ['status', 'claim_expires_at', 'created_at'], {
    name: 'term_extraction_runs_worker_claim_idx',
    where: "status = 'running'",
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('term_extraction_runs', ['status', 'claim_expires_at', 'created_at'], {
    name: 'term_extraction_runs_worker_claim_idx',
  });
  pgm.dropColumns('term_extraction_runs', ['claimed_by', 'claim_expires_at']);
};
