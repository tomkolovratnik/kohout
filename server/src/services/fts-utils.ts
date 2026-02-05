/**
 * Build an FTS5 MATCH query from raw user input.
 * Returns null if the input is too short or empty after sanitization.
 *
 * Single term  → "term"*          (prefix match)
 * Multi terms  → "t1"* OR "t2"*   (OR for better recall; BM25 rank naturally prefers multi-term matches)
 */
export function buildFtsQuery(raw: string): string | null {
  // Strip FTS5 special characters
  const cleaned = raw.replace(/["""(){}[\]^~:!@#$%&\\*]/g, '').trim();
  if (cleaned.length < 2) return null;

  const terms = cleaned.split(/\s+/).filter(t => t.length > 0);
  if (terms.length === 0) return null;

  return terms.map(t => `"${t}"*`).join(' OR ');
}
