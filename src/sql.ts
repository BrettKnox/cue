/**
 * The SQL, kept free of imports so the checks can run the REAL schema and the REAL query
 * against node:sqlite. A test that retypes the query only proves the copy works.
 *
 * The ESCAPE character is spelled out here rather than imported, so this file stays
 * import-free; checks.ts asserts it still agrees with searchTerm's LIKE_ESCAPE.
 */
export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY NOT NULL,
    started_at INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    summary TEXT
  );
  CREATE TABLE IF NOT EXISTS utterances (
    id INTEGER PRIMARY KEY NOT NULL,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    at INTEGER NOT NULL,
    text TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS utterances_by_conversation ON utterances(conversation_id, at);
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;

export const SEARCH_SQL = `
  SELECT u.*, c.title, c.started_at
    FROM utterances u JOIN conversations c ON c.id = u.conversation_id
   WHERE u.text LIKE ? ESCAPE '\\'
   ORDER BY u.at DESC LIMIT 100
`;
