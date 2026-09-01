exports.shorthands = undefined;

// OCR 抽帧策略复用既有 system-control engine version；批次与 Attempt 只保存创建时解析出的快照。
exports.up = (pgm) => {
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
          OR (
            jsonb_typeof(runtime_config) = 'object'
            AND (runtime_config - 'preset' - 'frameIntervalMs' - 'maxFramesPerEpisode') = '{}'::jsonb
            AND runtime_config->>'preset' = 'screen_text_openvino_ppocrv6_small'
            AND jsonb_typeof(runtime_config->'frameIntervalMs') = 'number'
            AND jsonb_typeof(runtime_config->'maxFramesPerEpisode') = 'number'
            AND CASE WHEN runtime_config->>'frameIntervalMs' ~ '^[0-9]+$' THEN (runtime_config->>'frameIntervalMs')::integer ELSE -1 END BETWEEN 250 AND 10000
            AND CASE WHEN runtime_config->>'maxFramesPerEpisode' ~ '^[0-9]+$' THEN (runtime_config->>'maxFramesPerEpisode')::integer ELSE -1 END BETWEEN 1 AND 600
          )
        )
      );
  `);

  pgm.addColumns('screen_text_batches', {
    runtime_config: { type: 'jsonb' },
    runtime_config_digest: { type: 'varchar(64)' },
  });
  pgm.addColumns('screen_text_attempts', {
    runtime_config: { type: 'jsonb' },
    runtime_config_digest: { type: 'varchar(64)' },
  });
  const validSnapshot = `(runtime_config IS NULL AND runtime_config_digest IS NULL) OR (runtime_config IS NOT NULL AND runtime_config_digest ~ '^[0-9a-f]{64}$' AND jsonb_typeof(runtime_config) = 'object' AND (runtime_config - 'preset' - 'frameIntervalMs' - 'maxFramesPerEpisode') = '{}'::jsonb AND runtime_config->>'preset' = 'screen_text_openvino_ppocrv6_small' AND jsonb_typeof(runtime_config->'frameIntervalMs') = 'number' AND jsonb_typeof(runtime_config->'maxFramesPerEpisode') = 'number' AND CASE WHEN runtime_config->>'frameIntervalMs' ~ '^[0-9]+$' THEN (runtime_config->>'frameIntervalMs')::integer ELSE -1 END BETWEEN 250 AND 10000 AND CASE WHEN runtime_config->>'maxFramesPerEpisode' ~ '^[0-9]+$' THEN (runtime_config->>'maxFramesPerEpisode')::integer ELSE -1 END BETWEEN 1 AND 600)`;
  pgm.addConstraint('screen_text_batches', 'screen_text_batches_runtime_config_valid', { check: validSnapshot });
  pgm.addConstraint('screen_text_attempts', 'screen_text_attempts_runtime_config_valid', { check: validSnapshot });
  pgm.sql(`
    CREATE FUNCTION reject_screen_text_runtime_config_update() RETURNS trigger AS $$
    BEGIN
      IF OLD.runtime_config IS DISTINCT FROM NEW.runtime_config
        OR OLD.runtime_config_digest IS DISTINCT FROM NEW.runtime_config_digest THEN
        RAISE EXCEPTION 'screen text runtime config snapshot is immutable';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER screen_text_batches_runtime_config_immutable
      BEFORE UPDATE ON screen_text_batches FOR EACH ROW EXECUTE FUNCTION reject_screen_text_runtime_config_update();
    CREATE TRIGGER screen_text_attempts_runtime_config_immutable
      BEFORE UPDATE ON screen_text_attempts FOR EACH ROW EXECUTE FUNCTION reject_screen_text_runtime_config_update();
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER IF EXISTS screen_text_attempts_runtime_config_immutable ON screen_text_attempts');
  pgm.sql('DROP TRIGGER IF EXISTS screen_text_batches_runtime_config_immutable ON screen_text_batches');
  pgm.sql('DROP FUNCTION IF EXISTS reject_screen_text_runtime_config_update()');
  pgm.dropConstraint('screen_text_attempts', 'screen_text_attempts_runtime_config_valid');
  pgm.dropConstraint('screen_text_batches', 'screen_text_batches_runtime_config_valid');
  pgm.dropColumns('screen_text_attempts', ['runtime_config', 'runtime_config_digest']);
  pgm.dropColumns('screen_text_batches', ['runtime_config', 'runtime_config_digest']);
  pgm.sql('ALTER TABLE engine_deployment_versions DROP CONSTRAINT IF EXISTS engine_deployment_versions_values_valid');
  pgm.addConstraint('engine_deployment_versions', 'engine_deployment_versions_values_valid', {
    check: "version >= 1 AND length(btrim(model)) > 0 AND length(btrim(language)) > 0 AND config_digest ~ '^[0-9a-f]{64}$' AND (endpoint_reference IS NULL OR (endpoint_reference !~ '://' AND endpoint_reference !~ '[?&#<>[:space:]]')) AND (region_hint IS NULL OR region_hint !~ '[?&#<>[:space:]]')",
  });
};
