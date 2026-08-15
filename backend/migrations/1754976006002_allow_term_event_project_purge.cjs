exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql('DROP TRIGGER term_decision_events_immutable ON term_decision_events');
  pgm.sql(`
    CREATE TRIGGER term_decision_events_immutable
      BEFORE UPDATE ON term_decision_events
      FOR EACH ROW EXECUTE FUNCTION reject_term_decision_event_mutation()
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER term_decision_events_immutable ON term_decision_events');
  pgm.sql(`
    CREATE TRIGGER term_decision_events_immutable
      BEFORE UPDATE OR DELETE ON term_decision_events
      FOR EACH ROW EXECUTE FUNCTION reject_term_decision_event_mutation()
  `);
};
