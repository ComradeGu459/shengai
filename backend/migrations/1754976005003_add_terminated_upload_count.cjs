exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('project_lifecycle_commands', {
    terminated_upload_count: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.addConstraint(
    'project_lifecycle_commands',
    'project_lifecycle_commands_terminated_upload_count_valid',
    { check: 'terminated_upload_count >= 0' },
  );
  pgm.sql(`
    UPDATE project_lifecycle_commands command
       SET terminated_upload_count = COALESCE((
         SELECT (event.details->>'terminatedUploadCount')::integer
           FROM project_lifecycle_audit_events event
          WHERE event.project_id = command.project_id
            AND event.event_kind = 'project_recycled'
            AND event.created_at <= command.created_at
          ORDER BY event.created_at DESC, event.id DESC
          LIMIT 1
       ), 0)
     WHERE command.command_kind = 'recycle_project'
  `);
};

exports.down = (pgm) => {
  pgm.dropConstraint(
    'project_lifecycle_commands',
    'project_lifecycle_commands_terminated_upload_count_valid',
  );
  pgm.dropColumn('project_lifecycle_commands', 'terminated_upload_count');
};
