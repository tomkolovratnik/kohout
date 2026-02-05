-- Add external_id and comments columns to FTS index
DROP TABLE IF EXISTS tickets_fts;

CREATE VIRTUAL TABLE tickets_fts USING fts5(
  external_id,
  title,
  description,
  notes,
  comments,
  tags,
  tokenize = 'unicode61 remove_diacritics 2'
);
