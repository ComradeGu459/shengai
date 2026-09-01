exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('feedback_reports', {
    id: { type: 'uuid', primaryKey: true },
    kind: { type: 'varchar(40)', notNull: true },
    status: { type: 'varchar(30)', notNull: true, default: 'new' },
    description: { type: 'varchar(1000)', notNull: true },
    surface: { type: 'varchar(30)', notNull: true },
    created_by: { type: 'varchar(255)', notNull: true },
    project_id: { type: 'uuid', references: 'projects(id)', onDelete: 'SET NULL', onUpdate: 'RESTRICT' },
    task_type: { type: 'varchar(40)' },
    resource_id: { type: 'uuid' },
    route_template: { type: 'varchar(240)', notNull: true },
    build_version: { type: 'varchar(120)', notNull: true },
    request_ids: { type: 'varchar(255)[]', notNull: true, default: pgm.func("'{}'::varchar[]") },
    browser_summary: { type: 'jsonb', notNull: true },
    viewport: { type: 'jsonb', notNull: true },
    timezone: { type: 'varchar(80)', notNull: true },
    performance_summary: { type: 'jsonb' },
    screenshot_attachment_id: { type: 'uuid' },
    revision: { type: 'integer', notNull: true, default: 1 },
    request_id: { type: 'varchar(255)', notNull: true },
    idempotency_key: { type: 'varchar(200)', notNull: true, unique: true },
    request_hash: { type: 'char(64)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('feedback_reports', 'feedback_reports_values_valid', {
    check: "kind IN ('no_response','display_incorrect','state_incorrect','slow','unclear_next_step','suggestion') AND status IN ('new','confirmed','fixing','retest','closed') AND surface IN ('employee','system_control') AND length(btrim(description)) BETWEEN 1 AND 1000 AND length(btrim(created_by)) > 0 AND (task_type IS NULL OR task_type IN ('asr_dispatch','asr_batch','screen_text_batch','term_extraction','pre_review_preparation','delivery_generation')) AND (resource_id IS NULL OR task_type IS NOT NULL) AND route_template ~ '^/[A-Za-z0-9_./:{}-]+$' AND length(btrim(build_version)) > 0 AND cardinality(request_ids) <= 20 AND timezone !~ '[[:space:]]' AND revision >= 1 AND request_hash ~ '^[0-9a-f]{64}$'",
  });
  pgm.createIndex('feedback_reports', ['status', 'updated_at', 'id'], { name: 'feedback_reports_attention_idx' });
  pgm.createIndex('feedback_reports', ['surface', 'kind', 'project_id', 'updated_at', 'id'], { name: 'feedback_reports_filter_idx' });

  pgm.createTable('feedback_events', {
    id: { type: 'uuid', primaryKey: true },
    feedback_id: { type: 'uuid', notNull: true, references: 'feedback_reports(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    action: { type: 'varchar(40)', notNull: true },
    from_status: { type: 'varchar(30)' },
    to_status: { type: 'varchar(30)', notNull: true },
    note: { type: 'varchar(1000)' },
    actor_subject: { type: 'varchar(255)', notNull: true },
    request_id: { type: 'varchar(255)', notNull: true },
    idempotency_key: { type: 'varchar(200)', notNull: true, unique: true },
    request_hash: { type: 'char(64)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('feedback_events', 'feedback_events_values_valid', {
    check: "action IN ('created','confirmed','fixing_started','retest_requested','closed','reopened') AND to_status IN ('new','confirmed','fixing','retest','closed') AND (from_status IS NULL OR from_status IN ('new','confirmed','fixing','retest','closed')) AND length(btrim(actor_subject)) > 0 AND request_hash ~ '^[0-9a-f]{64}$'",
  });
  pgm.createIndex('feedback_events', ['feedback_id', 'created_at', 'id'], { name: 'feedback_events_history_idx' });
  pgm.sql('CREATE TRIGGER feedback_events_immutable BEFORE UPDATE OR DELETE ON feedback_events FOR EACH ROW EXECUTE FUNCTION reject_system_control_immutable_update();');

  pgm.createTable('feedback_screenshot_attachments', {
    id: { type: 'uuid', primaryKey: true },
    feedback_id: { type: 'uuid', notNull: true, references: 'feedback_reports(id)', onDelete: 'RESTRICT', onUpdate: 'RESTRICT' },
    status: { type: 'varchar(20)', notNull: true, default: 'authorized' },
    content_type: { type: 'varchar(30)', notNull: true },
    size_bytes: { type: 'integer', notNull: true },
    content_digest: { type: 'char(64)', notNull: true },
    request_id: { type: 'varchar(255)', notNull: true },
    idempotency_key: { type: 'varchar(200)', notNull: true, unique: true },
    request_hash: { type: 'char(64)', notNull: true },
    privacy_confirmed_at: { type: 'timestamptz', notNull: true },
    privacy_confirmed_by: { type: 'varchar(255)', notNull: true },
    upload_idempotency_key: { type: 'varchar(200)' },
    upload_request_hash: { type: 'char(64)' },
    upload_request_id: { type: 'varchar(255)' },
    complete_idempotency_key: { type: 'varchar(200)' },
    complete_request_hash: { type: 'char(64)' },
    complete_request_id: { type: 'varchar(255)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('feedback_screenshot_attachments', 'feedback_screenshot_attachments_values_valid', {
    check: "status IN ('authorized','uploaded','failed') AND content_type IN ('image/png','image/jpeg','image/webp') AND size_bytes BETWEEN 1 AND 5000000 AND content_digest ~ '^[0-9a-f]{64}$' AND request_hash ~ '^[0-9a-f]{64}$' AND length(btrim(privacy_confirmed_by)) > 0 AND (upload_request_hash IS NULL OR upload_request_hash ~ '^[0-9a-f]{64}$') AND (complete_request_hash IS NULL OR complete_request_hash ~ '^[0-9a-f]{64}$')",
  });
  pgm.createIndex('feedback_screenshot_attachments', ['feedback_id', 'created_at', 'id'], { name: 'feedback_screenshot_attachments_feedback_idx' });
  pgm.createIndex('feedback_screenshot_attachments', ['upload_idempotency_key'], { name: 'feedback_screenshot_attachments_upload_key_unique', unique: true, where: 'upload_idempotency_key IS NOT NULL' });
  pgm.createIndex('feedback_screenshot_attachments', ['complete_idempotency_key'], { name: 'feedback_screenshot_attachments_complete_key_unique', unique: true, where: 'complete_idempotency_key IS NOT NULL' });
  pgm.sql('ALTER TABLE feedback_reports ADD CONSTRAINT feedback_reports_screenshot_fk FOREIGN KEY (screenshot_attachment_id) REFERENCES feedback_screenshot_attachments(id) ON DELETE RESTRICT ON UPDATE RESTRICT;');
  pgm.sql(`CREATE FUNCTION reject_feedback_attachment_identity_change() RETURNS trigger AS $$
    BEGIN
      IF TG_OP = 'DELETE' OR NEW.id IS DISTINCT FROM OLD.id OR NEW.feedback_id IS DISTINCT FROM OLD.feedback_id
        OR NEW.content_type IS DISTINCT FROM OLD.content_type OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes
        OR NEW.content_digest IS DISTINCT FROM OLD.content_digest
        OR NEW.request_id IS DISTINCT FROM OLD.request_id OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
        OR NEW.request_hash IS DISTINCT FROM OLD.request_hash OR NEW.privacy_confirmed_at IS DISTINCT FROM OLD.privacy_confirmed_at
        OR NEW.privacy_confirmed_by IS DISTINCT FROM OLD.privacy_confirmed_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'feedback attachment identity is immutable';
      END IF;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql;
    CREATE TRIGGER feedback_screenshot_attachments_identity_immutable BEFORE UPDATE OR DELETE ON feedback_screenshot_attachments FOR EACH ROW EXECUTE FUNCTION reject_feedback_attachment_identity_change();`);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER feedback_screenshot_attachments_identity_immutable ON feedback_screenshot_attachments');
  pgm.sql('DROP FUNCTION reject_feedback_attachment_identity_change()');
  pgm.sql('ALTER TABLE feedback_reports DROP CONSTRAINT feedback_reports_screenshot_fk');
  pgm.dropTable('feedback_screenshot_attachments');
  pgm.sql('DROP TRIGGER feedback_events_immutable ON feedback_events');
  pgm.dropTable('feedback_events');
  pgm.dropTable('feedback_reports');
};
