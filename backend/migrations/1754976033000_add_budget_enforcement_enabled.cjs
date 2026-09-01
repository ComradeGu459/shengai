exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('budget_policy_versions', {
    // 历史策略已有线上保护语义，先以 true 回填；迁移后的新草稿再默认关闭。
    enforcement_enabled: { type: 'boolean', notNull: true, default: true },
  });
  pgm.alterColumn('budget_policy_versions', 'enforcement_enabled', { default: false });
};

exports.down = (pgm) => {
  pgm.dropColumn('budget_policy_versions', 'enforcement_enabled');
};
