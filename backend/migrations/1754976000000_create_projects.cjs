exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('project_workflow_status', [
    'draft',
    'uploading',
    'verifying',
    'ready',
    'blocked',
  ]);
  pgm.createType('project_lifecycle_status', [
    'active',
    'recycled',
    'purging',
    'purged',
  ]);
  pgm.createTable('projects', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: { type: 'varchar(120)', notNull: true },
    workflow_status: {
      type: 'project_workflow_status',
      notNull: true,
      default: 'draft',
    },
    lifecycle_status: {
      type: 'project_lifecycle_status',
      notNull: true,
      default: 'active',
    },
    recycle_expires_at: { type: 'timestamptz' },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    created_by: { type: 'varchar(120)', notNull: true },
    updated_by: { type: 'varchar(120)', notNull: true },
  });
  pgm.addConstraint('projects', 'projects_version_positive', {
    check: 'version >= 1',
  });
  pgm.createIndex('projects', ['lifecycle_status', 'updated_at']);
  pgm.createIndex('projects', 'workflow_status');

  pgm.createTable('project_commands', {
    idempotency_key: { type: 'varchar(200)', primaryKey: true },
    command_kind: { type: 'varchar(80)', notNull: true },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('project_commands');
  pgm.dropTable('projects');
  pgm.dropType('project_lifecycle_status');
  pgm.dropType('project_workflow_status');
};
