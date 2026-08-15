exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropConstraint('term_candidates', 'term_candidates_draft_identity_unique');
  pgm.addConstraint('term_candidates', 'term_candidates_draft_name_unique', {
    unique: ['draft_id', 'name'],
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('term_candidates', 'term_candidates_draft_name_unique');
  pgm.addConstraint('term_candidates', 'term_candidates_draft_identity_unique', {
    unique: ['draft_id', 'type', 'name'],
  });
};
