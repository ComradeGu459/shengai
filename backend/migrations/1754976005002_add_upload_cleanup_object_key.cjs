exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('project_upload_cleanups', {
    object_key: { type: 'varchar(700)' },
  });
  pgm.sql(`
    UPDATE project_upload_cleanups cleanup
       SET object_key = session.object_key
      FROM upload_sessions session
     WHERE session.id = cleanup.upload_session_id
  `);
  pgm.alterColumn('project_upload_cleanups', 'object_key', { notNull: true });
};

exports.down = (pgm) => {
  pgm.dropColumn('project_upload_cleanups', 'object_key');
};
