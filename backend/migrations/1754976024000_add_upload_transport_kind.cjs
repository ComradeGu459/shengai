exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('upload_transport_kind', ['multipart', 'tus']);
  pgm.addColumn('upload_sessions', {
    transport_kind: { type: 'upload_transport_kind', notNull: true, default: 'multipart' },
  });
  pgm.createIndex('upload_sessions', ['storage_upload_id'], {
    name: 'upload_sessions_transport_storage_idx',
    unique: true,
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('upload_sessions', ['storage_upload_id'], {
    name: 'upload_sessions_transport_storage_idx',
  });
  pgm.dropColumn('upload_sessions', 'transport_kind');
  pgm.dropType('upload_transport_kind');
};
