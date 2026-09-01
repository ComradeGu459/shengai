exports.shorthands = undefined;

// TERM-CONTROL-BACK-117：只扩展既有 system-control engine/routing 结构。
// 术语运行配置随不可变 engine_deployment_versions 保存，不建立新的 Provider 或 prompt 表。
exports.up = (pgm) => {
  pgm.sql("ALTER TYPE system_engine_capability ADD VALUE IF NOT EXISTS 'terms'");

  pgm.addColumn('engine_deployment_versions', {
    runtime_config: { type: 'jsonb' },
  });
  pgm.sql(`
    ALTER TABLE engine_deployment_versions
      DROP CONSTRAINT IF EXISTS engine_deployment_versions_values_valid;
    ALTER TABLE engine_deployment_versions
      ADD CONSTRAINT engine_deployment_versions_values_valid CHECK (
        version >= 1
        AND length(btrim(model)) > 0
        AND length(btrim(language)) > 0
        AND config_digest ~ '^[0-9a-f]{64}$'
        AND (endpoint_reference IS NULL OR (endpoint_reference !~ '://' AND endpoint_reference !~ '[?&#<>[:space:]]'))
        AND (region_hint IS NULL OR region_hint !~ '[?&#<>[:space:]]')
        AND (
          runtime_config IS NULL
          OR (
            jsonb_typeof(runtime_config) = 'object'
            AND runtime_config ?& ARRAY['preset','endpoint','prompt','categoryOrder']
            AND runtime_config->>'preset' IN ('deepseek-v4-flash','custom')
            AND length(runtime_config->>'endpoint') BETWEEN 1 AND 500
            AND runtime_config->>'endpoint' ~ '^https://[^[:space:]]+$'
            AND runtime_config->>'endpoint' !~ '[@?&#<>[:space:]]'
            AND length(runtime_config->>'prompt') BETWEEN 1 AND 20000
            AND jsonb_typeof(runtime_config->'categoryOrder') = 'array'
            AND jsonb_array_length(runtime_config->'categoryOrder') = 8
            AND runtime_config->'categoryOrder' @> '["人名"]'::jsonb
            AND runtime_config->'categoryOrder' @> '["地名"]'::jsonb
            AND runtime_config->'categoryOrder' @> '["特定物品"]'::jsonb
            AND runtime_config->'categoryOrder' @> '["朝代"]'::jsonb
            AND runtime_config->'categoryOrder' @> '["组织名"]'::jsonb
            AND runtime_config->'categoryOrder' @> '["等级"]'::jsonb
            AND runtime_config->'categoryOrder' @> '["物种/种族名"]'::jsonb
            AND runtime_config->'categoryOrder' @> '["特殊概念/事件"]'::jsonb
            AND NOT runtime_config ? 'bearerKey'
            AND (runtime_config - 'preset' - 'endpoint' - 'prompt' - 'categoryOrder') = '{}'::jsonb
          )
        )
      );
  `);

  pgm.sql("ALTER TABLE routing_policy_versions DROP CONSTRAINT IF EXISTS routing_policy_versions_stage_valid");
  pgm.addConstraint('routing_policy_versions', 'routing_policy_versions_stage_valid', {
    check: "environment = 'development' AND workflow_stage IN ('asr','screen_text','terms') AND version >= 1",
  });
  pgm.sql("ALTER TABLE active_control_plane_pointers DROP CONSTRAINT IF EXISTS active_control_plane_pointers_stage_valid");
  pgm.addConstraint('active_control_plane_pointers', 'active_control_plane_pointers_stage_valid', {
    check: "environment = 'development' AND workflow_stage IN ('asr','screen_text','terms')",
  });

  pgm.sql("ALTER TABLE routing_policy_pools DROP CONSTRAINT IF EXISTS routing_policy_pools_values_valid");
  pgm.addConstraint('routing_policy_pools', 'routing_policy_pools_values_valid', {
    check: "pool_id IN ('asr_api','ocr_api','ocr_self_hosted_worker','terms_api')",
  });
  pgm.sql("ALTER TABLE routing_policy_targets DROP CONSTRAINT IF EXISTS routing_policy_targets_values_valid");
  pgm.addConstraint('routing_policy_targets', 'routing_policy_targets_values_valid', {
    check: "pool_id IN ('asr_api','ocr_api','ocr_self_hosted_worker','terms_api') AND priority BETWEEN 1 AND 8 AND role IN ('preferred','standard','emergency') AND max_concurrent_jobs > 0 AND per_project_max > 0 AND queue_limit >= 0",
  });
};

// 版本、路由目标和审计事实均不可变；回滚前必须先人工清理 terms 事实，故保持与 ordered routing 迁移一致的不可逆迁移边界。
exports.down = () => {};
