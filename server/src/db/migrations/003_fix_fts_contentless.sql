-- Fix: contentless FTS5 table does not support DELETE.
-- Recreate as a regular FTS5 table so that DELETE FROM works.
DROP TABLE IF EXISTS tickets_fts;

CREATE VIRTUAL TABLE tickets_fts USING fts5(
  title,
  description,
  notes,
  tags,
  tokenize = 'unicode61 remove_diacritics 2'
);
