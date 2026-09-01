exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.alterColumn('upload_sessions', 'checksum_value', { notNull: false });
  pgm.addConstraint('upload_sessions', 'upload_sessions_completed_checksum_present', {
    check: "status <> 'completed' OR checksum_value IS NOT NULL",
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('upload_sessions', 'upload_sessions_completed_checksum_present');
  pgm.alterColumn('upload_sessions', 'checksum_value', { notNull: true });
};
