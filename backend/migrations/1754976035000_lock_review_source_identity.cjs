exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('pre_edit_sessions', {
    screen_text_release_id: {
      type: 'uuid',
      references: 'screen_text_releases',
      onDelete: 'RESTRICT',
    },
  });
  pgm.sql(`
    UPDATE pre_edit_sessions session
       SET screen_text_release_id = release.id
      FROM screen_text_releases release
     WHERE session.screen_text_release_id IS NULL
       AND session.source_snapshot #>> '{screenTextRelease,id}' = release.id::text;
  `);
  pgm.addConstraint('pre_edit_sessions', 'pre_edit_sessions_screen_text_source_consistent', {
    check: `screen_text_release_id IS NULL
      OR source_snapshot #>> '{screenTextRelease,id}' = screen_text_release_id::text`,
  });
  pgm.createIndex('pre_edit_sessions', ['screen_text_release_id']);

  pgm.sql(`
    CREATE FUNCTION reject_pre_edit_source_identity_update() RETURNS trigger AS $$
    BEGIN
      IF NEW.project_id IS DISTINCT FROM OLD.project_id
        OR NEW.project_version IS DISTINCT FROM OLD.project_version
        OR NEW.source_srt_set_digest IS DISTINCT FROM OLD.source_srt_set_digest
        OR NEW.term_version_id IS DISTINCT FROM OLD.term_version_id
        OR NEW.manifest_id IS DISTINCT FROM OLD.manifest_id
        OR NEW.manifest_version IS DISTINCT FROM OLD.manifest_version
        OR NEW.source_digest IS DISTINCT FROM OLD.source_digest
        OR NEW.source_snapshot IS DISTINCT FROM OLD.source_snapshot
        OR NEW.strategy_version_id IS DISTINCT FROM OLD.strategy_version_id
        OR NEW.strategy_content_digest IS DISTINCT FROM OLD.strategy_content_digest
        OR NEW.algorithm_version IS DISTINCT FROM OLD.algorithm_version
        OR NEW.format_policy_version IS DISTINCT FROM OLD.format_policy_version
        OR NEW.screen_text_release_id IS DISTINCT FROM OLD.screen_text_release_id
      THEN
        RAISE EXCEPTION 'pre-edit source identity is immutable';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER pre_edit_sessions_source_identity_immutable
      BEFORE UPDATE ON pre_edit_sessions
      FOR EACH ROW EXECUTE FUNCTION reject_pre_edit_source_identity_update();

    CREATE FUNCTION reject_pre_edit_episode_source_identity_update() RETURNS trigger AS $$
    BEGIN
      IF NEW.session_id IS DISTINCT FROM OLD.session_id
        OR NEW.episode_number IS DISTINCT FROM OLD.episode_number
        OR NEW.company_asset_id IS DISTINCT FROM OLD.company_asset_id
        OR NEW.asr_result_id IS DISTINCT FROM OLD.asr_result_id
        OR NEW.asr_result_digest IS DISTINCT FROM OLD.asr_result_digest
        OR NEW.asr_asset_id IS DISTINCT FROM OLD.asr_asset_id
        OR NEW.asr_term_version_id IS DISTINCT FROM OLD.asr_term_version_id
        OR NEW.asr_provider IS DISTINCT FROM OLD.asr_provider
        OR NEW.asr_adapter IS DISTINCT FROM OLD.asr_adapter
        OR NEW.asr_model IS DISTINCT FROM OLD.asr_model
        OR NEW.asr_language IS DISTINCT FROM OLD.asr_language
        OR NEW.asr_config_digest IS DISTINCT FROM OLD.asr_config_digest
        OR NEW.asr_hotword_digest IS DISTINCT FROM OLD.asr_hotword_digest
        OR NEW.asr_quality_status IS DISTINCT FROM OLD.asr_quality_status
        OR NEW.video_asset_id IS DISTINCT FROM OLD.video_asset_id
        OR NEW.video_checksum_value IS DISTINCT FROM OLD.video_checksum_value
        OR NEW.video_duration_ms IS DISTINCT FROM OLD.video_duration_ms
      THEN
        RAISE EXCEPTION 'pre-edit episode source identity is immutable';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER pre_edit_episodes_source_identity_immutable
      BEFORE UPDATE ON pre_edit_episodes
      FOR EACH ROW EXECUTE FUNCTION reject_pre_edit_episode_source_identity_update();

    CREATE FUNCTION reject_acceptance_source_identity_update() RETURNS trigger AS $$
    BEGIN
      IF NEW.project_id IS DISTINCT FROM OLD.project_id
        OR NEW.project_version IS DISTINCT FROM OLD.project_version
        OR NEW.pre_edit_release_id IS DISTINCT FROM OLD.pre_edit_release_id
        OR NEW.pre_edit_head_release_id IS DISTINCT FROM OLD.pre_edit_head_release_id
        OR NEW.screen_text_release_id IS DISTINCT FROM OLD.screen_text_release_id
        OR NEW.screen_text_head_release_id IS DISTINCT FROM OLD.screen_text_head_release_id
        OR NEW.manifest_id IS DISTINCT FROM OLD.manifest_id
        OR NEW.manifest_version IS DISTINCT FROM OLD.manifest_version
        OR NEW.term_version_id IS DISTINCT FROM OLD.term_version_id
        OR NEW.rule_version IS DISTINCT FROM OLD.rule_version
        OR NEW.source_digest IS DISTINCT FROM OLD.source_digest
        OR NEW.source_snapshot IS DISTINCT FROM OLD.source_snapshot
      THEN
        RAISE EXCEPTION 'acceptance source identity is immutable';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER acceptance_sessions_source_identity_immutable
      BEFORE UPDATE ON acceptance_sessions
      FOR EACH ROW EXECUTE FUNCTION reject_acceptance_source_identity_update();
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER acceptance_sessions_source_identity_immutable ON acceptance_sessions');
  pgm.sql('DROP FUNCTION reject_acceptance_source_identity_update()');
  pgm.sql('DROP TRIGGER pre_edit_episodes_source_identity_immutable ON pre_edit_episodes');
  pgm.sql('DROP FUNCTION reject_pre_edit_episode_source_identity_update()');
  pgm.sql('DROP TRIGGER pre_edit_sessions_source_identity_immutable ON pre_edit_sessions');
  pgm.sql('DROP FUNCTION reject_pre_edit_source_identity_update()');
  pgm.dropConstraint('pre_edit_sessions', 'pre_edit_sessions_screen_text_source_consistent');
  pgm.dropColumns('pre_edit_sessions', ['screen_text_release_id']);
};
