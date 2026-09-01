exports.up = (pgm) => {
  pgm.createTable('strategy_optimization_runs', {
    id: { type: 'uuid', primaryKey: true },
    artifact_id: { type: 'uuid', notNull: true, references: 'strategy_artifacts(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    base_version_id: { type: 'uuid', notNull: true, references: 'strategy_artifact_versions(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    module: { type: 'varchar(40)', notNull: true },
    project_id: { type: 'uuid' },
    from_at: { type: 'timestamptz' },
    to_at: { type: 'timestamptz', notNull: true },
    min_evidence_count: { type: 'integer', notNull: true },
    max_events: { type: 'integer', notNull: true },
    budget_cny: { type: 'numeric(18,6)', notNull: true },
    actual_cost_cny: { type: 'numeric(18,6)' },
    analyzer_key: { type: 'varchar(80)', notNull: true, default: 'deterministic_local_v1' },
    status: { type: 'varchar(30)', notNull: true, default: 'queued' },
    input_digest: { type: 'char(64)', notNull: true },
    event_snapshot_digest: { type: 'char(64)' },
    event_count: { type: 'integer', notNull: true, default: 0 },
    candidate_count: { type: 'integer', notNull: true, default: 0 },
    request_id: { type: 'varchar(255)', notNull: true },
    failure_reason: { type: 'varchar(240)' },
    lease_owner: { type: 'varchar(120)' },
    lease_expires_at: { type: 'timestamptz' },
    created_by: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    started_at: { type: 'timestamptz' },
    completed_at: { type: 'timestamptz' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('strategy_optimization_runs', 'strategy_optimization_runs_values_valid', { check: "module IN ('terms','pre_review','screen_text','subtitle_acceptance') AND min_evidence_count BETWEEN 0 AND 10000 AND max_events BETWEEN 1 AND 100 AND budget_cny >= 0 AND (actual_cost_cny IS NULL OR actual_cost_cny >= 0) AND analyzer_key='deterministic_local_v1' AND status IN ('queued','running','succeeded','failed','unknown') AND input_digest ~ '^[0-9a-f]{64}$' AND (event_snapshot_digest IS NULL OR event_snapshot_digest ~ '^[0-9a-f]{64}$') AND event_count >= 0 AND candidate_count >= 0" });
  pgm.createIndex('strategy_optimization_runs', ['status', 'lease_expires_at', 'created_at', 'id'], { name: 'strategy_optimization_runs_claim_idx' });
  pgm.createIndex('strategy_optimization_runs', ['artifact_id', 'created_at', 'id'], { name: 'strategy_optimization_runs_artifact_idx' });

  pgm.createTable('strategy_optimization_candidates', {
    id: { type: 'uuid', primaryKey: true },
    run_id: { type: 'uuid', notNull: true, references: 'strategy_optimization_runs(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    artifact_id: { type: 'uuid', notNull: true, references: 'strategy_artifacts(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    base_version_id: { type: 'uuid', notNull: true, references: 'strategy_artifact_versions(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    source_event_ref_id: { type: 'varchar(220)', notNull: true },
    candidate_kind: { type: 'varchar(40)', notNull: true },
    status: { type: 'varchar(30)', notNull: true, default: 'proposed' },
    revision: { type: 'integer', notNull: true, default: 1 },
    module: { type: 'varchar(40)', notNull: true },
    title: { type: 'varchar(200)', notNull: true },
    rationale: { type: 'varchar(500)', notNull: true },
    proposal: { type: 'jsonb', notNull: true },
    support_count: { type: 'integer', notNull: true },
    oppose_count: { type: 'integer', notNull: true },
    unknown_count: { type: 'integer', notNull: true },
    evidence_digest: { type: 'char(64)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('strategy_optimization_candidates', 'strategy_optimization_candidates_values_valid', { check: "candidate_kind IN ('rule_review','risk_review','prompt_review','test_case') AND status IN ('proposed','edited','rejected','evaluation_ready') AND revision >= 1 AND module IN ('terms','pre_review','screen_text','subtitle_acceptance') AND length(btrim(source_event_ref_id)) BETWEEN 3 AND 220 AND length(btrim(title)) > 0 AND length(btrim(rationale)) > 0 AND support_count >= 0 AND oppose_count >= 0 AND unknown_count >= 0 AND evidence_digest ~ '^[0-9a-f]{64}$'" });
  pgm.addConstraint('strategy_optimization_candidates', 'strategy_optimization_candidates_run_digest_unique', { unique: ['run_id', 'evidence_digest'] });
  pgm.createIndex('strategy_optimization_candidates', ['run_id', 'status', 'created_at', 'id'], { name: 'strategy_optimization_candidates_listing_idx' });

  pgm.createTable('strategy_candidate_decision_events', {
    id: { type: 'uuid', primaryKey: true },
    candidate_id: { type: 'uuid', notNull: true, references: 'strategy_optimization_candidates(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    action: { type: 'varchar(40)', notNull: true },
    before_snapshot: { type: 'jsonb', notNull: true },
    after_snapshot: { type: 'jsonb', notNull: true },
    request_id: { type: 'varchar(255)', notNull: true },
    actor_subject: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('strategy_candidate_decision_events', 'strategy_candidate_decision_events_action_valid', { check: "action IN ('edit','reject','restore','send_to_evaluation')" });
  pgm.sql('CREATE TRIGGER strategy_candidate_decision_events_immutable BEFORE UPDATE OR DELETE ON strategy_candidate_decision_events FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();');

  pgm.createTable('strategy_evaluation_runs', {
    id: { type: 'uuid', primaryKey: true },
    candidate_ids: { type: 'uuid[]', notNull: true },
    candidate_digest: { type: 'char(64)', notNull: true },
    budget_cny: { type: 'numeric(18,6)', notNull: true },
    actual_cost_cny: { type: 'numeric(18,6)' },
    status: { type: 'varchar(30)', notNull: true, default: 'queued' },
    metrics: { type: 'jsonb' },
    request_id: { type: 'varchar(255)', notNull: true },
    failure_reason: { type: 'varchar(240)' },
    lease_owner: { type: 'varchar(120)' },
    lease_expires_at: { type: 'timestamptz' },
    created_by: { type: 'varchar(255)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    started_at: { type: 'timestamptz' },
    completed_at: { type: 'timestamptz' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('strategy_evaluation_runs', 'strategy_evaluation_runs_values_valid', { check: "cardinality(candidate_ids) BETWEEN 1 AND 50 AND candidate_digest ~ '^[0-9a-f]{64}$' AND budget_cny >= 0 AND (actual_cost_cny IS NULL OR actual_cost_cny >= 0) AND status IN ('queued','running','succeeded','failed','unknown')" });
  pgm.createIndex('strategy_evaluation_runs', ['status', 'lease_expires_at', 'created_at', 'id'], { name: 'strategy_evaluation_runs_claim_idx' });
};

exports.down = (pgm) => {
  pgm.dropTable('strategy_evaluation_runs');
  pgm.sql('DROP TRIGGER strategy_candidate_decision_events_immutable ON strategy_candidate_decision_events');
  pgm.dropTable('strategy_candidate_decision_events');
  pgm.dropTable('strategy_optimization_candidates');
  pgm.dropTable('strategy_optimization_runs');
};
