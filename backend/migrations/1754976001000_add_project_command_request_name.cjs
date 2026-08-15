exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('project_commands', {
    request_name: { type: 'varchar(120)' },
  });
  pgm.sql(`
    UPDATE project_commands AS command
       SET request_name = project.name
      FROM projects AS project
     WHERE project.id = command.project_id
  `);
  pgm.alterColumn('project_commands', 'request_name', { notNull: true });
};

exports.down = (pgm) => {
  pgm.dropColumn('project_commands', 'request_name');
};
