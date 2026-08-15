exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('term_export_field', ['type', 'name', 'aliases', 'gender', 'note']);

  pgm.createTable('term_export_template_versions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    version: { type: 'integer', notNull: true, unique: true },
    name: { type: 'varchar(120)', notNull: true },
    field_order: { type: 'term_export_field[]', notNull: true },
    type_header: { type: 'varchar(120)', notNull: true },
    name_header: { type: 'varchar(120)', notNull: true },
    aliases_header: { type: 'varchar(120)', notNull: true },
    gender_header: { type: 'varchar(120)', notNull: true },
    note_header: { type: 'varchar(120)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('term_export_template_versions', 'term_export_template_values_valid', {
    check: `version >= 1 AND length(btrim(name)) > 0
      AND length(btrim(type_header)) > 0 AND length(btrim(name_header)) > 0
      AND length(btrim(aliases_header)) > 0 AND length(btrim(gender_header)) > 0
      AND length(btrim(note_header)) > 0 AND cardinality(field_order) = 5
      AND cardinality(array_positions(field_order, 'type'::term_export_field)) = 1
      AND cardinality(array_positions(field_order, 'name'::term_export_field)) = 1
      AND cardinality(array_positions(field_order, 'aliases'::term_export_field)) = 1
      AND cardinality(array_positions(field_order, 'gender'::term_export_field)) = 1
      AND cardinality(array_positions(field_order, 'note'::term_export_field)) = 1`,
  });

  pgm.sql(`
    CREATE FUNCTION reject_term_export_template_update() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'term export template versions are immutable';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER term_export_template_versions_immutable
      BEFORE UPDATE ON term_export_template_versions
      FOR EACH ROW EXECUTE FUNCTION reject_term_export_template_update();
  `);

  pgm.createTable('term_export_template_settings', {
    singleton: { type: 'boolean', primaryKey: true, default: true },
    active_template_version_id: {
      type: 'uuid', notNull: true, references: 'term_export_template_versions', onDelete: 'RESTRICT',
    },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('term_export_template_settings', 'term_export_template_settings_singleton', {
    check: 'singleton = TRUE',
  });

  pgm.createTable('term_export_template_commands', {
    idempotency_key: { type: 'varchar(200)', primaryKey: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    template_version_id: {
      type: 'uuid', notNull: true, references: 'term_export_template_versions', onDelete: 'RESTRICT',
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.createTable('term_exports', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    term_version_id: { type: 'uuid', notNull: true, references: 'term_versions', onDelete: 'CASCADE' },
    template_version_id: {
      type: 'uuid', notNull: true, references: 'term_export_template_versions', onDelete: 'RESTRICT',
    },
    structure_digest: { type: 'varchar(64)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('term_exports', 'term_exports_version_template_unique', {
    unique: ['term_version_id', 'template_version_id'],
  });
  pgm.addConstraint('term_exports', 'term_exports_digest_valid', {
    check: "structure_digest ~ '^[0-9a-f]{64}$'",
  });
  pgm.createIndex('term_exports', ['project_id', 'created_at']);
  pgm.sql(`
    CREATE TRIGGER term_exports_immutable
      BEFORE UPDATE ON term_exports
      FOR EACH ROW EXECUTE FUNCTION reject_term_export_template_update();
  `);

  pgm.createTable('term_export_commands', {
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'CASCADE' },
    idempotency_key: { type: 'varchar(200)', notNull: true },
    request_hash: { type: 'varchar(64)', notNull: true },
    export_id: { type: 'uuid', notNull: true, references: 'term_exports', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('term_export_commands', 'term_export_commands_primary', {
    primaryKey: ['project_id', 'idempotency_key'],
  });

  pgm.sql(`
    WITH default_template AS (
      INSERT INTO term_export_template_versions
        (version, name, field_order, type_header, name_header, aliases_header, gender_header, note_header)
      VALUES
        (1, '默认五字段模板', ARRAY['type','name','aliases','gender','note']::term_export_field[],
         '类型', '中文内容', '别称', '性别', '备注')
      RETURNING id
    )
    INSERT INTO term_export_template_settings (singleton, active_template_version_id)
    SELECT TRUE, id FROM default_template;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('term_export_commands');
  pgm.sql('DROP TRIGGER term_exports_immutable ON term_exports');
  pgm.dropTable('term_exports');
  pgm.dropTable('term_export_template_commands');
  pgm.dropTable('term_export_template_settings');
  pgm.sql('DROP TRIGGER term_export_template_versions_immutable ON term_export_template_versions');
  pgm.sql('DROP FUNCTION reject_term_export_template_update()');
  pgm.dropTable('term_export_template_versions');
  pgm.dropType('term_export_field');
};
