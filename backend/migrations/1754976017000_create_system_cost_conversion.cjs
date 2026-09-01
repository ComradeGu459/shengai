exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE cost_conversion_snapshots (
      id uuid PRIMARY KEY,
      source_currency varchar(12) NOT NULL CHECK (source_currency ~ '^[A-Z0-9_-]{3,12}$'),
      target_currency varchar(3) NOT NULL CHECK (target_currency = 'CNY'),
      rate numeric(30,18) NOT NULL CHECK (rate > 0),
      rate_digest char(64) NOT NULL CHECK (rate_digest ~ '^[0-9a-f]{64}$'),
      effective_at timestamptz NOT NULL,
      expires_at timestamptz NOT NULL CHECK (expires_at > effective_at),
      status varchar(20) NOT NULL CHECK (status IN ('available','unknown')),
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX cost_conversion_snapshots_lookup_idx
      ON cost_conversion_snapshots (source_currency, status, effective_at DESC, id DESC);
    CREATE TRIGGER cost_conversion_snapshots_immutable
      BEFORE UPDATE OR DELETE ON cost_conversion_snapshots
      FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();

    ALTER TABLE budget_reservations
      ADD COLUMN conversion_snapshot_id uuid REFERENCES cost_conversion_snapshots(id) ON DELETE RESTRICT,
      ADD COLUMN rate_digest char(64) CHECK (rate_digest IS NULL OR rate_digest ~ '^[0-9a-f]{64}$'),
      ADD COLUMN conversion_effective_at timestamptz,
      ADD COLUMN source_currency varchar(12) CHECK (source_currency IS NULL OR source_currency ~ '^[A-Z0-9_-]{3,12}$'),
      ADD COLUMN original_maximum_amount numeric(30,12) CHECK (original_maximum_amount IS NULL OR original_maximum_amount >= 0),
      ADD COLUMN original_final_amount numeric(30,12) CHECK (original_final_amount IS NULL OR original_final_amount >= 0),
      ADD COLUMN maximum_amount_cny numeric(30,6) CHECK (maximum_amount_cny IS NULL OR maximum_amount_cny >= 0),
      ADD COLUMN final_amount_cny numeric(30,6) CHECK (final_amount_cny IS NULL OR final_amount_cny >= 0);
    CREATE INDEX budget_reservations_cny_usage_idx
      ON budget_reservations (resource_pool, status, created_at) WHERE currency = 'CNY';

    ALTER TABLE asr_attempts
      ADD COLUMN budget_conversion_snapshot_id uuid REFERENCES cost_conversion_snapshots(id) ON DELETE RESTRICT,
      ADD COLUMN budget_rate_digest char(64),
      ADD COLUMN budget_conversion_effective_at timestamptz,
      ADD COLUMN budget_maximum_amount_cny numeric(30,6) CHECK (budget_maximum_amount_cny IS NULL OR budget_maximum_amount_cny >= 0),
      ADD COLUMN budget_final_amount_cny numeric(30,6) CHECK (budget_final_amount_cny IS NULL OR budget_final_amount_cny >= 0);
    ALTER TABLE screen_text_attempts
      ADD COLUMN budget_conversion_snapshot_id uuid REFERENCES cost_conversion_snapshots(id) ON DELETE RESTRICT,
      ADD COLUMN budget_rate_digest char(64),
      ADD COLUMN budget_conversion_effective_at timestamptz,
      ADD COLUMN budget_maximum_amount_cny numeric(30,6) CHECK (budget_maximum_amount_cny IS NULL OR budget_maximum_amount_cny >= 0),
      ADD COLUMN budget_final_amount_cny numeric(30,6) CHECK (budget_final_amount_cny IS NULL OR budget_final_amount_cny >= 0);

    ALTER TABLE asr_usage
      ADD COLUMN conversion_snapshot_id uuid REFERENCES cost_conversion_snapshots(id) ON DELETE RESTRICT,
      ADD COLUMN rate_digest char(64),
      ADD COLUMN conversion_effective_at timestamptz,
      ADD COLUMN original_currency varchar(12),
      ADD COLUMN original_estimated_amount numeric(30,12),
      ADD COLUMN original_final_amount numeric(30,12),
      ADD COLUMN estimated_amount_cny numeric(30,6),
      ADD COLUMN final_amount_cny numeric(30,6);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE asr_usage
      DROP COLUMN final_amount_cny, DROP COLUMN estimated_amount_cny,
      DROP COLUMN original_final_amount, DROP COLUMN original_estimated_amount,
      DROP COLUMN original_currency, DROP COLUMN conversion_effective_at,
      DROP COLUMN rate_digest, DROP COLUMN conversion_snapshot_id;
    ALTER TABLE screen_text_attempts
      DROP COLUMN budget_final_amount_cny, DROP COLUMN budget_maximum_amount_cny,
      DROP COLUMN budget_conversion_effective_at, DROP COLUMN budget_rate_digest,
      DROP COLUMN budget_conversion_snapshot_id;
    ALTER TABLE asr_attempts
      DROP COLUMN budget_final_amount_cny, DROP COLUMN budget_maximum_amount_cny,
      DROP COLUMN budget_conversion_effective_at, DROP COLUMN budget_rate_digest,
      DROP COLUMN budget_conversion_snapshot_id;
    DROP INDEX IF EXISTS budget_reservations_cny_usage_idx;
    ALTER TABLE budget_reservations
      DROP COLUMN final_amount_cny, DROP COLUMN maximum_amount_cny,
      DROP COLUMN original_final_amount, DROP COLUMN original_maximum_amount,
      DROP COLUMN source_currency, DROP COLUMN conversion_effective_at,
      DROP COLUMN rate_digest, DROP COLUMN conversion_snapshot_id;
    DROP TRIGGER cost_conversion_snapshots_immutable ON cost_conversion_snapshots;
    DROP INDEX cost_conversion_snapshots_lookup_idx;
    DROP TABLE cost_conversion_snapshots;
  `);
};
