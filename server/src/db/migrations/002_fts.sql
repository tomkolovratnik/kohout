-- FTS5 virtual table for fulltext search with Czech diacritics support
CREATE VIRTUAL TABLE IF NOT EXISTS tickets_fts USING fts5(
  title,
  description,
  notes,
  tags,
  content='',
  tokenize = 'unicode61 remove_diacritics 2'
);
