exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('asr_dispatch_groups', {
    request_id: { type: 'varchar(200)' },
  });
  pgm.sql(`
    UPDATE asr_dispatch_groups
       SET request_id = 'legacy-dispatch:' || id::text
     WHERE request_id IS NULL
  `);
  pgm.alterColumn('asr_dispatch_groups', 'request_id', { notNull: true });
  pgm.addConstraint('asr_dispatch_groups', 'asr_dispatch_groups_request_id_valid', {
    check: "length(btrim(request_id)) BETWEEN 1 AND 200",
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('asr_dispatch_groups', 'asr_dispatch_groups_request_id_valid');
  pgm.dropColumn('asr_dispatch_groups', 'request_id');
};
