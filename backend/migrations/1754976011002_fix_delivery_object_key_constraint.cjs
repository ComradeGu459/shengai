exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropConstraint('delivery_files', 'delivery_files_values_valid');
  pgm.addConstraint('delivery_files', 'delivery_files_values_valid', {
    check: `length(btrim(file_name)) > 0 AND object_key ~ '^deliveries/[0-9a-f-]{36}/[0-9a-f-]{36}/files/[0-9a-f-]{36}$'
      AND content_digest ~ '^[0-9a-f]{64}$' AND size_bytes >= 0 AND cue_count >= 0
      AND ((kind = 'terms_xlsx' AND episode_number IS NULL) OR (kind <> 'terms_xlsx' AND episode_number BETWEEN 1 AND 100))`,
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('delivery_files', 'delivery_files_values_valid');
  pgm.addConstraint('delivery_files', 'delivery_files_values_valid', {
    check: `length(btrim(file_name)) > 0 AND object_key ~ '^deliveries/[0-9a-f-]{36}/[0-9a-f-]{36}/files/[0-9a-f-]{36}$'
      AND content_digest ~ '^[0-9a-f]{64}$' AND size_bytes >= 0 AND cue_count >= 0
      AND ((kind = 'terms_xlsx' AND episode_number IS NULL) OR (kind <> 'terms_xlsx' AND episode_number BETWEEN 1 AND 100))`,
  });
};
