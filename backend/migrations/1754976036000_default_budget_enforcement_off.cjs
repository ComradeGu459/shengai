exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    -- 6033000 为上线前既有策略回填了 true；这些值并非管理员显式选择。
    -- 仅保留创建审计中明确记录 enforcementEnabled=true 的策略为强制模式。
    DROP TRIGGER budget_policy_versions_immutable ON budget_policy_versions;
    UPDATE budget_policy_versions policy
       SET enforcement_enabled = FALSE
     WHERE policy.enforcement_enabled = TRUE
       AND NOT EXISTS (
         SELECT 1
           FROM system_control_audit_events audit
          WHERE audit.resource_type = 'budget_policy_version'
            AND audit.resource_id = policy.id
            AND audit.action = 'budget_policy_created'
            AND audit.after_snapshot @> '{"enforcementEnabled":true}'::jsonb
       );
    CREATE TRIGGER budget_policy_versions_immutable
      BEFORE UPDATE OR DELETE ON budget_policy_versions
      FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();

    -- 无 active pointer 时仍需写入同一预算预留表，保留计量、结算与统计事实。
    ALTER TABLE budget_reservations
      ALTER COLUMN budget_policy_version_id DROP NOT NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE budget_reservations
      ALTER COLUMN budget_policy_version_id SET NOT NULL;
  `);
};
