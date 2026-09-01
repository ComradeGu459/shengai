exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.alterColumn('screen_text_attempts', 'model', { type: 'varchar(160)', notNull: true });
};

exports.down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM screen_text_attempts WHERE char_length(model) > 80
      ) THEN
        RAISE EXCEPTION 'screen_text_attempts.model contains values longer than 80 characters';
      END IF;
    END $$;
  `);
  pgm.alterColumn('screen_text_attempts', 'model', { type: 'varchar(80)', notNull: true });
};
