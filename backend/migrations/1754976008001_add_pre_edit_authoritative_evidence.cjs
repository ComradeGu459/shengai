exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('pre_edit_episodes', {
    video_duration_ms: { type: 'bigint' },
  });
  pgm.addConstraint('pre_edit_episodes', 'pre_edit_episodes_video_duration_valid', {
    check: 'video_duration_ms IS NULL OR video_duration_ms > 0',
  });
  pgm.addColumns('pre_edit_items', {
    term_evidence: { type: 'jsonb', notNull: true, default: '[]' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('pre_edit_items', ['term_evidence']);
  pgm.dropConstraint('pre_edit_episodes', 'pre_edit_episodes_video_duration_valid');
  pgm.dropColumns('pre_edit_episodes', ['video_duration_ms']);
};
