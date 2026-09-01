exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    -- 历史版本没有可证明的计费事实时保持 NULL；不得按 execution_kind 猜测报价。
    ALTER TABLE engine_deployment_versions
      ADD COLUMN billing_snapshot jsonb;
    CREATE TABLE budget_policy_versions (
      id uuid PRIMARY KEY,
      environment varchar(40) NOT NULL CHECK (environment = 'development'),
      version integer NOT NULL CHECK (version >= 1),
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (environment, version)
    );
    CREATE TABLE budget_policy_rules (
      budget_policy_version_id uuid NOT NULL REFERENCES budget_policy_versions(id) ON DELETE RESTRICT,
      resource_pool varchar(40) NOT NULL CHECK (resource_pool IN ('asr_api','ocr_api')),
      currency varchar(12) NOT NULL CHECK (currency ~ '^[A-Z0-9_-]{3,12}$'),
      period varchar(12) NOT NULL CHECK (period IN ('day','month')),
      warning_limit numeric(30,12) NOT NULL CHECK (warning_limit >= 0),
      hard_limit numeric(30,12) NOT NULL CHECK (hard_limit > warning_limit),
      PRIMARY KEY (budget_policy_version_id, resource_pool, currency, period)
    );
    CREATE TABLE budget_policy_status_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      budget_policy_version_id uuid NOT NULL REFERENCES budget_policy_versions(id) ON DELETE RESTRICT,
      status varchar(30) NOT NULL CHECK (status IN ('draft','testing','impact_checked','approved','active','retired')),
      request_id varchar(255) NOT NULL,
      actor_subject varchar(255) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX budget_policy_status_events_listing_idx ON budget_policy_status_events (budget_policy_version_id, created_at DESC, id DESC);
    CREATE TABLE budget_policy_impact_snapshots (
      budget_policy_version_id uuid PRIMARY KEY REFERENCES budget_policy_versions(id) ON DELETE RESTRICT,
      snapshot jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE active_budget_policy_pointers (
      environment varchar(40) PRIMARY KEY CHECK (environment = 'development'),
      budget_policy_version_id uuid NOT NULL REFERENCES budget_policy_versions(id) ON DELETE RESTRICT,
      updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE budget_reservations (
      id uuid PRIMARY KEY,
      attempt_id uuid NOT NULL,
      attempt_kind varchar(30) NOT NULL CHECK (attempt_kind IN ('asr','screen_text')),
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
      deployment_version_id uuid NOT NULL REFERENCES engine_deployment_versions(id) ON DELETE RESTRICT,
      resource_pool varchar(40) NOT NULL CHECK (resource_pool IN ('asr_api','ocr_api')),
      currency varchar(12) NOT NULL CHECK (currency ~ '^[A-Z0-9_-]{3,12}$'),
      billing_unit varchar(80) NOT NULL,
      maximum_quantity numeric(30,12) NOT NULL CHECK (maximum_quantity >= 0),
      maximum_amount numeric(30,12) NOT NULL CHECK (maximum_amount >= 0),
      budget_policy_version_id uuid NOT NULL REFERENCES budget_policy_versions(id) ON DELETE RESTRICT,
      quote_digest char(64) NOT NULL CHECK (quote_digest ~ '^[0-9a-f]{64}$'),
      status varchar(40) NOT NULL CHECK (status IN ('reserved','settled','released','unknown','reconciliation_required','overrun')),
      warning boolean NOT NULL DEFAULT false,
      provider_request_id varchar(255),
      final_quantity numeric(30,12),
      final_amount numeric(30,12),
      reconciliation_status varchar(30) NOT NULL CHECK (reconciliation_status IN ('pending','final','unknown')),
      request_id varchar(255) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      settled_at timestamptz,
      UNIQUE (attempt_kind, attempt_id)
    );
    CREATE INDEX budget_reservations_usage_idx ON budget_reservations (resource_pool, currency, status, created_at);
    CREATE INDEX budget_reservations_attempt_idx ON budget_reservations (attempt_id, attempt_kind);
    CREATE TABLE budget_test_runs (
      id uuid PRIMARY KEY,
      budget_policy_version_id uuid NOT NULL REFERENCES budget_policy_versions(id) ON DELETE RESTRICT,
      input_digest char(64) NOT NULL CHECK (input_digest ~ '^[0-9a-f]{64}$'),
      input_snapshot jsonb NOT NULL,
      status varchar(30) NOT NULL CHECK (status IN ('queued','running','succeeded','failed','unknown')),
      request_id varchar(255) NOT NULL,
      result jsonb,
      reason_code varchar(100),
      reason_message text,
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      started_at timestamptz,
      completed_at timestamptz
    );
    CREATE INDEX budget_test_runs_policy_idx ON budget_test_runs (budget_policy_version_id, created_at DESC, id DESC);
    ALTER TABLE asr_attempts
      ADD COLUMN budget_policy_version_id uuid REFERENCES budget_policy_versions(id) ON DELETE RESTRICT,
      ADD COLUMN budget_reservation_id uuid REFERENCES budget_reservations(id) ON DELETE RESTRICT,
      ADD COLUMN budget_quote_digest char(64);
    ALTER TABLE screen_text_attempts
      ADD COLUMN budget_policy_version_id uuid REFERENCES budget_policy_versions(id) ON DELETE RESTRICT,
      ADD COLUMN budget_reservation_id uuid REFERENCES budget_reservations(id) ON DELETE RESTRICT,
      ADD COLUMN budget_quote_digest char(64);
    CREATE INDEX asr_attempts_budget_idx ON asr_attempts (budget_policy_version_id, budget_reservation_id);
    CREATE INDEX screen_text_attempts_budget_idx ON screen_text_attempts (budget_policy_version_id, budget_reservation_id);
    CREATE TRIGGER budget_policy_versions_immutable BEFORE UPDATE OR DELETE ON budget_policy_versions FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
    CREATE TRIGGER budget_policy_rules_immutable BEFORE UPDATE OR DELETE ON budget_policy_rules FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
    CREATE TRIGGER budget_policy_status_events_immutable BEFORE UPDATE OR DELETE ON budget_policy_status_events FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
    CREATE TRIGGER budget_policy_impact_immutable BEFORE UPDATE OR DELETE ON budget_policy_impact_snapshots FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER budget_policy_impact_immutable ON budget_policy_impact_snapshots;
    DROP TRIGGER budget_policy_status_events_immutable ON budget_policy_status_events;
    DROP TRIGGER budget_policy_rules_immutable ON budget_policy_rules;
    DROP TRIGGER budget_policy_versions_immutable ON budget_policy_versions;
    DROP INDEX IF EXISTS screen_text_attempts_budget_idx;
    DROP INDEX IF EXISTS asr_attempts_budget_idx;
    ALTER TABLE screen_text_attempts DROP COLUMN budget_quote_digest, DROP COLUMN budget_reservation_id, DROP COLUMN budget_policy_version_id;
    ALTER TABLE asr_attempts DROP COLUMN budget_quote_digest, DROP COLUMN budget_reservation_id, DROP COLUMN budget_policy_version_id;
    DROP TABLE budget_reservations;
    DROP TABLE budget_test_runs;
    DROP TABLE active_budget_policy_pointers;
    DROP TABLE budget_policy_impact_snapshots;
    DROP TABLE budget_policy_status_events;
    DROP TABLE budget_policy_rules;
    DROP TABLE budget_policy_versions;
    ALTER TABLE engine_deployment_versions DROP COLUMN billing_snapshot;
  `);
};
