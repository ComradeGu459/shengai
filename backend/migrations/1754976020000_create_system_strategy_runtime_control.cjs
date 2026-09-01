exports.shorthands = undefined;

// Wave C 只保存运行控制元数据；规则正文和 content_digest 永远归 strategy_artifact_versions 所有。
exports.up = (pgm) => {
  pgm.addColumn('strategy_artifacts', {
    origin: { type: 'varchar(40)', notNull: true, default: 'custom_draft' },
    protected: { type: 'boolean', notNull: true, default: false },
    runtime_module: { type: 'varchar(40)' },
  });
  pgm.addConstraint('strategy_artifacts', 'strategy_artifacts_runtime_values_valid', {
    check: "origin IN ('system_baseline','custom_draft') AND ((origin='system_baseline' AND protected=true AND runtime_module='pre_review') OR origin='custom_draft')",
  });
  pgm.addColumn('strategy_artifact_versions', {
    base_version_id: { type: 'uuid', references: 'strategy_artifact_versions(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    source: { type: 'varchar(30)', notNull: true, default: 'manual' },
    evaluation_run_id: { type: 'uuid' },
    candidate_digest: { type: 'char(64)' },
    runtime_status: { type: 'varchar(30)', notNull: true, default: 'draft' },
    runtime_updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('strategy_artifact_versions', 'strategy_artifact_versions_provenance_valid', {
    check: "source IN ('manual','system_baseline','candidate') AND runtime_status IN ('draft','testing','impact_checked','approved','active','retired') AND (source <> 'candidate' OR (evaluation_run_id IS NOT NULL AND candidate_digest ~ '^[0-9a-f]{64}$'))",
  });
  // 正文/身份/来源仍不可变；仅允许运行状态元数据由发布事务推进。
  pgm.sql(`DROP TRIGGER strategy_artifact_versions_immutable ON strategy_artifact_versions;
    CREATE FUNCTION reject_strategy_artifact_version_immutable() RETURNS trigger AS $$
    BEGIN
      IF NEW.id IS DISTINCT FROM OLD.id OR NEW.artifact_id IS DISTINCT FROM OLD.artifact_id
        OR NEW.version IS DISTINCT FROM OLD.version OR NEW.schema_version IS DISTINCT FROM OLD.schema_version
        OR NEW.payload IS DISTINCT FROM OLD.payload OR NEW.content_digest IS DISTINCT FROM OLD.content_digest
        OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at
        OR NEW.base_version_id IS DISTINCT FROM OLD.base_version_id OR NEW.source IS DISTINCT FROM OLD.source
        OR NEW.evaluation_run_id IS DISTINCT FROM OLD.evaluation_run_id OR NEW.candidate_digest IS DISTINCT FROM OLD.candidate_digest THEN
        RAISE EXCEPTION 'strategy artifact version identity and content are immutable';
      END IF;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql;
    CREATE TRIGGER strategy_artifact_versions_immutable BEFORE UPDATE OR DELETE ON strategy_artifact_versions FOR EACH ROW EXECUTE FUNCTION reject_strategy_artifact_version_immutable();`);
  pgm.createIndex('strategy_artifact_versions', ['source', 'created_at', 'id'], { name: 'strategy_artifact_versions_runtime_history_idx' });
  pgm.createTable('strategy_runtime_active_pointers', {
    module: { type: 'varchar(40)', primaryKey: true },
    strategy_version_id: { type: 'uuid', notNull: true, references: 'strategy_artifact_versions(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('strategy_runtime_active_pointers', 'strategy_runtime_active_pointers_module_valid', { check: "module = 'pre_review'" });

  pgm.createTable('strategy_runtime_impact_runs', {
    id: { type: 'uuid', primaryKey: true }, strategy_version_id: { type: 'uuid', notNull: true, references: 'strategy_artifact_versions(id)', onDelete: 'RESTRICT' },
    status: { type: 'varchar(20)', notNull: true }, snapshot_id: { type: 'uuid', notNull: true }, snapshot_digest: { type: 'char(64)', notNull: true }, content_digest: { type: 'char(64)', notNull: true },
    // 评测输入与候选/当前版本摘要在创建事务内一次冻结；Worker 永远只读这一列。
    snapshot_input: { type: 'jsonb', notNull: true },
    coverage: { type: 'jsonb', notNull: true, default: '{}' }, blockers: { type: 'jsonb', notNull: true, default: '[]' }, invariant_results: { type: 'jsonb', notNull: true, default: '{}' }, field_differences: { type: 'jsonb', notNull: true, default: '[]' },
    affected_session_count: { type: 'integer', notNull: true, default: 0 }, sample_count: { type: 'integer', notNull: true, default: 0 }, old_unbound_session_count: { type: 'integer', notNull: true, default: 0 },
    request_id: { type: 'varchar(255)', notNull: true }, created_by: { type: 'varchar(255)', notNull: true }, lease_owner: { type: 'varchar(255)' }, lease_expires_at: { type: 'timestamptz' }, started_at: { type: 'timestamptz' }, completed_at: { type: 'timestamptz' }, failure_reason: { type: 'varchar(240)' }, created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('strategy_runtime_impact_runs', 'strategy_runtime_impact_runs_values_valid', { check: "status IN ('queued','running','succeeded','failed','unknown') AND affected_session_count >= 0 AND sample_count >= 0 AND old_unbound_session_count >= 0 AND snapshot_digest ~ '^[0-9a-f]{64}$'" });
  pgm.createIndex('strategy_runtime_impact_runs', ['strategy_version_id', 'created_at', 'id']);
  pgm.sql(`CREATE FUNCTION reject_strategy_runtime_impact_snapshot_change() RETURNS trigger AS $$
    BEGIN
      IF TG_OP = 'DELETE' OR NEW.id IS DISTINCT FROM OLD.id
        OR NEW.strategy_version_id IS DISTINCT FROM OLD.strategy_version_id
        OR NEW.snapshot_id IS DISTINCT FROM OLD.snapshot_id
        OR NEW.snapshot_digest IS DISTINCT FROM OLD.snapshot_digest
        OR NEW.content_digest IS DISTINCT FROM OLD.content_digest
        OR NEW.snapshot_input IS DISTINCT FROM OLD.snapshot_input
        OR NEW.request_id IS DISTINCT FROM OLD.request_id
        OR NEW.created_by IS DISTINCT FROM OLD.created_by
        OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'strategy runtime impact snapshot is immutable';
      END IF;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql;
    CREATE TRIGGER strategy_runtime_impact_snapshot_immutable BEFORE UPDATE OR DELETE ON strategy_runtime_impact_runs FOR EACH ROW EXECUTE FUNCTION reject_strategy_runtime_impact_snapshot_change();`);
  pgm.createTable('strategy_runtime_impact_attempts', {
    id: { type: 'uuid', primaryKey: true }, impact_run_id: { type: 'uuid', notNull: true, references: 'strategy_runtime_impact_runs(id)', onDelete: 'RESTRICT' }, status: { type: 'varchar(20)', notNull: true }, lease_owner: { type: 'varchar(255)' }, lease_expires_at: { type: 'timestamptz' }, request_id: { type: 'varchar(255)', notNull: true }, created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }, started_at: { type: 'timestamptz' }, completed_at: { type: 'timestamptz' },
  });
  pgm.addConstraint('strategy_runtime_impact_attempts', 'strategy_runtime_impact_attempts_status_valid', { check: "status IN ('queued','running','succeeded','failed','unknown')" });

  pgm.createTable('strategy_runtime_approvals', {
    id: { type: 'uuid', primaryKey: true }, impact_run_id: { type: 'uuid', notNull: true, references: 'strategy_runtime_impact_runs(id)', onDelete: 'RESTRICT' }, strategy_version_id: { type: 'uuid', notNull: true, references: 'strategy_artifact_versions(id)', onDelete: 'RESTRICT' }, content_digest: { type: 'char(64)', notNull: true }, status: { type: 'varchar(20)', notNull: true, default: 'approved' }, request_id: { type: 'varchar(255)', notNull: true }, created_by: { type: 'varchar(255)', notNull: true }, created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('strategy_runtime_approvals', 'strategy_runtime_approvals_status_valid', { check: "status = 'approved' AND content_digest ~ '^[0-9a-f]{64}$'" });
  pgm.createIndex('strategy_runtime_approvals', ['strategy_version_id', 'created_at', 'id']);
  pgm.sql('CREATE TRIGGER strategy_runtime_approvals_immutable BEFORE UPDATE OR DELETE ON strategy_runtime_approvals FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();');

  pgm.createTable('strategy_runtime_release_commands', {
    id: { type: 'uuid', primaryKey: true }, action: { type: 'varchar(20)', notNull: true }, strategy_version_id: { type: 'uuid', notNull: true, references: 'strategy_artifact_versions(id)', onDelete: 'RESTRICT' }, previous_strategy_version_id: { type: 'uuid', references: 'strategy_artifact_versions(id)', onDelete: 'RESTRICT' }, expected_previous_strategy_version_id: { type: 'uuid' }, impact_run_id: { type: 'uuid', references: 'strategy_runtime_impact_runs(id)', onDelete: 'RESTRICT' }, approval_id: { type: 'uuid', references: 'strategy_runtime_approvals(id)', onDelete: 'RESTRICT' }, content_digest: { type: 'char(64)', notNull: true }, idempotency_key: { type: 'varchar(200)', notNull: true }, request_hash: { type: 'char(64)', notNull: true }, status: { type: 'varchar(20)', notNull: true }, response_snapshot: { type: 'jsonb', notNull: true }, request_id: { type: 'varchar(255)', notNull: true }, created_by: { type: 'varchar(255)', notNull: true }, created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('strategy_runtime_release_commands', 'strategy_runtime_release_commands_values_valid', { check: "action IN ('publish','rollback') AND status IN ('succeeded','failed','unknown') AND request_hash ~ '^[0-9a-f]{64}$' AND content_digest ~ '^[0-9a-f]{64}$'" });
  pgm.addConstraint('strategy_runtime_release_commands', 'strategy_runtime_release_commands_idempotency_unique', { unique: ['action', 'idempotency_key'] });
  pgm.createIndex('strategy_runtime_release_commands', ['strategy_version_id', 'created_at', 'id']);
  pgm.createTable('strategy_runtime_release_events', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') }, release_command_id: { type: 'uuid', notNull: true, references: 'strategy_runtime_release_commands(id)', onDelete: 'RESTRICT' }, action: { type: 'varchar(20)', notNull: true }, strategy_version_id: { type: 'uuid', notNull: true, references: 'strategy_artifact_versions(id)', onDelete: 'RESTRICT' }, previous_strategy_version_id: { type: 'uuid', references: 'strategy_artifact_versions(id)', onDelete: 'RESTRICT' }, actor_subject: { type: 'varchar(255)', notNull: true }, request_id: { type: 'varchar(255)', notNull: true }, created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.createIndex('strategy_runtime_release_events', ['created_at', 'id']);
  pgm.sql('CREATE TRIGGER strategy_runtime_release_events_immutable BEFORE UPDATE OR DELETE ON strategy_runtime_release_events FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();');
  pgm.addColumn('pre_edit_sessions', { strategy_version_id: { type: 'uuid', references: 'strategy_artifact_versions(id)', onDelete: 'RESTRICT' }, strategy_content_digest: { type: 'char(64)' } });
  pgm.addConstraint('pre_edit_sessions', 'pre_edit_sessions_strategy_binding_pair', { check: '(strategy_version_id IS NULL AND strategy_content_digest IS NULL) OR (strategy_version_id IS NOT NULL AND strategy_content_digest ~ \'^[0-9a-f]{64}$\')' });
  pgm.createIndex('pre_edit_sessions', ['strategy_version_id', 'created_at'], { name: 'pre_edit_sessions_strategy_runtime_idx' });
  pgm.sql(`CREATE FUNCTION reject_protected_strategy_artifact_change() RETURNS trigger AS $$ BEGIN IF TG_OP = 'DELETE' OR OLD.origin = 'system_baseline' AND (NEW.origin IS DISTINCT FROM OLD.origin OR NEW.protected IS DISTINCT FROM OLD.protected OR NEW.artifact_kind IS DISTINCT FROM OLD.artifact_kind OR NEW.display_name IS DISTINCT FROM OLD.display_name OR NEW.purpose IS DISTINCT FROM OLD.purpose OR NEW.applicable_modules IS DISTINCT FROM OLD.applicable_modules OR NEW.status IS DISTINCT FROM OLD.status) THEN RAISE EXCEPTION 'protected strategy baseline is immutable'; END IF; RETURN COALESCE(NEW, OLD); END; $$ LANGUAGE plpgsql; CREATE TRIGGER strategy_artifacts_protected_immutable BEFORE UPDATE OR DELETE ON strategy_artifacts FOR EACH ROW EXECUTE FUNCTION reject_protected_strategy_artifact_change();`);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER strategy_artifacts_protected_immutable ON strategy_artifacts'); pgm.sql('DROP FUNCTION reject_protected_strategy_artifact_change()');
  pgm.dropIndex('pre_edit_sessions', ['strategy_version_id', 'created_at'], { name: 'pre_edit_sessions_strategy_runtime_idx' }); pgm.dropConstraint('pre_edit_sessions', 'pre_edit_sessions_strategy_binding_pair'); pgm.dropColumn('pre_edit_sessions', 'strategy_content_digest'); pgm.dropColumn('pre_edit_sessions', 'strategy_version_id');
  pgm.sql('DROP TRIGGER strategy_runtime_release_events_immutable ON strategy_runtime_release_events'); pgm.dropTable('strategy_runtime_release_events'); pgm.dropTable('strategy_runtime_release_commands'); pgm.sql('DROP TRIGGER strategy_runtime_approvals_immutable ON strategy_runtime_approvals'); pgm.dropTable('strategy_runtime_approvals'); pgm.dropTable('strategy_runtime_impact_attempts'); pgm.sql('DROP TRIGGER strategy_runtime_impact_snapshot_immutable ON strategy_runtime_impact_runs'); pgm.dropTable('strategy_runtime_impact_runs'); pgm.sql('DROP FUNCTION reject_strategy_runtime_impact_snapshot_change()'); pgm.dropTable('strategy_runtime_active_pointers');
  pgm.dropIndex('strategy_artifact_versions', ['source', 'created_at', 'id'], { name: 'strategy_artifact_versions_runtime_history_idx' }); pgm.sql('DROP TRIGGER strategy_artifact_versions_immutable ON strategy_artifact_versions; DROP FUNCTION reject_strategy_artifact_version_immutable(); CREATE TRIGGER strategy_artifact_versions_immutable BEFORE UPDATE OR DELETE ON strategy_artifact_versions FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();'); pgm.dropConstraint('strategy_artifact_versions', 'strategy_artifact_versions_provenance_valid'); pgm.dropColumn('strategy_artifact_versions', 'runtime_updated_at'); pgm.dropColumn('strategy_artifact_versions', 'runtime_status'); pgm.dropColumn('strategy_artifact_versions', 'candidate_digest'); pgm.dropColumn('strategy_artifact_versions', 'evaluation_run_id'); pgm.dropColumn('strategy_artifact_versions', 'source'); pgm.dropColumn('strategy_artifact_versions', 'base_version_id'); pgm.dropConstraint('strategy_artifacts', 'strategy_artifacts_runtime_values_valid'); pgm.dropColumn('strategy_artifacts', 'runtime_module'); pgm.dropColumn('strategy_artifacts', 'protected'); pgm.dropColumn('strategy_artifacts', 'origin');
};
