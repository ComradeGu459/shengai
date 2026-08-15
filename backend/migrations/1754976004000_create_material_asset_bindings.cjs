exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropConstraint('material_manifest_bindings', 'material_bindings_path_unique');

  pgm.createTable('material_asset_bindings', {
    manifest_id: {
      type: 'uuid',
      notNull: true,
      references: 'material_manifests',
      onDelete: 'CASCADE',
    },
    episode_number: { type: 'integer', notNull: true },
    role: { type: 'material_role', notNull: true },
    asset_id: {
      type: 'uuid',
      notNull: true,
      references: 'assets',
      onDelete: 'CASCADE',
    },
    source_fingerprint: { type: 'varchar(700)', notNull: true },
    bound_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });
  pgm.addConstraint('material_asset_bindings', 'material_asset_bindings_primary', {
    primaryKey: ['manifest_id', 'episode_number', 'role'],
  });
  pgm.sql(`
    ALTER TABLE material_asset_bindings
      ADD CONSTRAINT material_asset_bindings_slot_fk
      FOREIGN KEY (manifest_id, episode_number, role)
      REFERENCES material_manifest_bindings (manifest_id, episode_number, role)
      ON DELETE CASCADE
  `);
  pgm.createIndex('material_asset_bindings', ['asset_id', 'manifest_id']);

  pgm.createTable('upload_session_material_targets', {
    upload_session_id: {
      type: 'uuid',
      notNull: true,
      references: 'upload_sessions',
      onDelete: 'CASCADE',
    },
    manifest_id: {
      type: 'uuid',
      notNull: true,
      references: 'material_manifests',
      onDelete: 'CASCADE',
    },
    episode_number: { type: 'integer', notNull: true },
    role: { type: 'material_role', notNull: true },
    source_fingerprint: { type: 'varchar(700)', notNull: true },
  });
  pgm.addConstraint('upload_session_material_targets', 'upload_session_material_targets_primary', {
    primaryKey: ['upload_session_id', 'episode_number', 'role'],
  });
  pgm.sql(`
    ALTER TABLE upload_session_material_targets
      ADD CONSTRAINT upload_session_material_targets_slot_fk
      FOREIGN KEY (manifest_id, episode_number, role)
      REFERENCES material_manifest_bindings (manifest_id, episode_number, role)
      ON DELETE CASCADE
  `);
  pgm.createIndex('upload_session_material_targets', ['manifest_id', 'episode_number', 'role']);
};

exports.down = (pgm) => {
  pgm.dropTable('upload_session_material_targets');
  pgm.dropTable('material_asset_bindings');
  pgm.addConstraint('material_manifest_bindings', 'material_bindings_path_unique', {
    unique: ['manifest_id', 'relative_path'],
  });
};
