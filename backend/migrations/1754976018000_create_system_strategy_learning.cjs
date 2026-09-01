exports.up = (pgm) => {
  pgm.createTable('strategy_artifacts', {
    id: { type: 'uuid', primaryKey: true },
    artifact_kind: { type: 'varchar(40)', notNull: true },
    display_name: { type: 'varchar(200)', notNull: true },
    purpose: { type: 'varchar(500)', notNull: true },
    applicable_modules: { type: 'varchar(40)[]', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'draft' },
    created_by: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('strategy_artifacts', 'strategy_artifacts_kind_valid', { check: "artifact_kind IN ('local_rule_pack','ai_filter_policy','prompt_template','hotword_projection','risk_lexicon') AND status = 'draft' AND length(btrim(display_name)) > 0 AND length(btrim(purpose)) > 0 AND cardinality(applicable_modules) BETWEEN 1 AND 4 AND applicable_modules <@ ARRAY['terms','pre_review','screen_text','subtitle_acceptance']::varchar[]" });
  pgm.createIndex('strategy_artifacts', ['artifact_kind', 'status', 'updated_at', 'id'], { name: 'strategy_artifacts_listing_idx' });
  pgm.createTable('strategy_artifact_versions', {
    id: { type: 'uuid', primaryKey: true },
    artifact_id: { type: 'uuid', notNull: true, references: 'strategy_artifacts(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    version: { type: 'integer', notNull: true },
    schema_version: { type: 'integer', notNull: true },
    payload: { type: 'jsonb', notNull: true },
    content_digest: { type: 'char(64)', notNull: true },
    created_by: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('strategy_artifact_versions', 'strategy_artifact_versions_valid', { check: "version >= 1 AND schema_version >= 1 AND content_digest ~ '^[0-9a-f]{64}$'" });
  pgm.addConstraint('strategy_artifact_versions', 'strategy_artifact_versions_artifact_version_unique', { unique: ['artifact_id', 'version'] });
  pgm.createIndex('strategy_artifact_versions', ['artifact_id', 'version', 'id'], { name: 'strategy_artifact_versions_listing_idx' });
  pgm.sql(`
    CREATE TRIGGER strategy_artifact_versions_immutable BEFORE UPDATE OR DELETE ON strategy_artifact_versions FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER strategy_artifact_versions_immutable ON strategy_artifact_versions');
  pgm.dropTable('strategy_artifact_versions');
  pgm.dropTable('strategy_artifacts');
};
