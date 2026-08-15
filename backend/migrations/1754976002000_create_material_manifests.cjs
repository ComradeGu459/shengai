exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('material_role', ['company_srt', 'asr_video', 'screen_video']);
  pgm.createType('material_media_type', ['srt', 'video']);

  pgm.createTable('material_manifests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE',
    },
    version: { type: 'integer', notNull: true },
    root_name: { type: 'varchar(255)', notNull: true },
    confirmed_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_by: { type: 'varchar(120)', notNull: true },
  });
  pgm.addConstraint('material_manifests', 'material_manifests_version_positive', {
    check: 'version >= 1',
  });
  pgm.addConstraint('material_manifests', 'material_manifests_project_version_unique', {
    unique: ['project_id', 'version'],
  });
  pgm.createIndex('material_manifests', ['project_id', 'confirmed_at']);

  pgm.createTable('material_manifest_bindings', {
    manifest_id: {
      type: 'uuid',
      notNull: true,
      references: 'material_manifests',
      onDelete: 'CASCADE',
    },
    episode_number: { type: 'integer', notNull: true },
    role: { type: 'material_role', notNull: true },
    relative_path: { type: 'varchar(500)', notNull: true },
    file_name: { type: 'varchar(255)', notNull: true },
    size_bytes: { type: 'bigint', notNull: true },
    last_modified_ms: { type: 'bigint', notNull: true },
    fingerprint: { type: 'varchar(700)', notNull: true },
    media_type: { type: 'material_media_type', notNull: true },
  });
  pgm.addConstraint('material_manifest_bindings', 'material_bindings_episode_positive', {
    check: 'episode_number BETWEEN 1 AND 100',
  });
  pgm.addConstraint('material_manifest_bindings', 'material_bindings_size_positive', {
    check: 'size_bytes > 0 AND last_modified_ms > 0',
  });
  pgm.addConstraint('material_manifest_bindings', 'material_bindings_role_unique', {
    unique: ['manifest_id', 'episode_number', 'role'],
  });
  pgm.addConstraint('material_manifest_bindings', 'material_bindings_path_unique', {
    unique: ['manifest_id', 'relative_path'],
  });

  pgm.createTable('material_manifest_commands', {
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE',
    },
    idempotency_key: { type: 'varchar(200)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    manifest_id: {
      type: 'uuid',
      notNull: true,
      references: 'material_manifests',
      onDelete: 'CASCADE',
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('material_manifest_commands', 'material_manifest_commands_primary', {
    primaryKey: ['project_id', 'idempotency_key'],
  });
};

exports.down = (pgm) => {
  pgm.dropTable('material_manifest_commands');
  pgm.dropTable('material_manifest_bindings');
  pgm.dropTable('material_manifests');
  pgm.dropType('material_media_type');
  pgm.dropType('material_role');
};
