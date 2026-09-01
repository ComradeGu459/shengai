exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE system_control_commands
      ADD COLUMN IF NOT EXISTS stable_command_key varchar(200) DEFAULT gen_random_uuid()::text;
    UPDATE system_control_commands
      SET stable_command_key = gen_random_uuid()::text
      WHERE stable_command_key IS NULL;
    ALTER TABLE system_control_commands
      ALTER COLUMN stable_command_key SET DEFAULT gen_random_uuid()::text,
      ALTER COLUMN stable_command_key SET NOT NULL;
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'system_control_commands'::regclass
          AND conname = 'system_control_commands_stable_key_unique'
      ) THEN
        ALTER TABLE system_control_commands
          ADD CONSTRAINT system_control_commands_stable_key_unique UNIQUE (stable_command_key);
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  // 该增量用于修复已应用旧版本；保留稳定列可让回滚后的旧代码仍与现有命令事实兼容。
  pgm.sql('SELECT 1');
};
