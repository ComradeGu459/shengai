exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('screen_text_releases', {
    partial: { type: 'boolean', notNull: true, default: false },
    excluded_episodes: { type: 'jsonb', notNull: true, default: '[]' },
  });
  pgm.addConstraint('screen_text_releases', 'screen_text_releases_partial_snapshot_valid', {
    check: "jsonb_typeof(excluded_episodes) = 'array' AND ((partial = false AND excluded_episodes = '[]'::jsonb) OR (partial = true AND jsonb_array_length(excluded_episodes) > 0))",
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('screen_text_releases', 'screen_text_releases_partial_snapshot_valid');
  pgm.dropColumns('screen_text_releases', ['partial', 'excluded_episodes']);
};
