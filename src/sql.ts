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
  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    notes TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS conversation_people (
    conversation_id INTEGER NOT NULL,
    person_id INTEGER NOT NULL,
    PRIMARY KEY (conversation_id, person_id)
  );
  CREATE INDEX IF NOT EXISTS conversation_people_by_person ON conversation_people(person_id);
`;

export const SEARCH_SQL = `
  SELECT u.*, c.title, c.started_at
    FROM utterances u JOIN conversations c ON c.id = u.conversation_id
   WHERE u.text LIKE ? ESCAPE '\\'
   ORDER BY u.at DESC LIMIT 100
`;

/**
 * Everyone, with how often they come up and when they were last heard. LEFT JOIN so a
 * person added by hand still appears before they are attached to anything.
 */
export const PEOPLE_SQL = `
  SELECT p.id, p.name, p.notes, p.created_at,
         COUNT(cp.conversation_id) AS conversations,
         COALESCE(MAX(c.started_at), 0) AS last_seen
    FROM people p
    LEFT JOIN conversation_people cp ON cp.person_id = p.id
    LEFT JOIN conversations c ON c.id = cp.conversation_id
   GROUP BY p.id
   ORDER BY last_seen DESC, p.name COLLATE NOCASE
`;

/** The people attached to one conversation. */
export const CONVERSATION_PEOPLE_SQL = `
  SELECT p.id, p.name, p.notes, p.created_at
    FROM people p JOIN conversation_people cp ON cp.person_id = p.id
   WHERE cp.conversation_id = ?
   ORDER BY p.name COLLATE NOCASE
`;

/** Every conversation one person was part of, newest first. */
export const PERSON_CONVERSATIONS_SQL = `
  SELECT c.*
    FROM conversations c JOIN conversation_people cp ON cp.conversation_id = c.id
   WHERE cp.person_id = ?
   ORDER BY c.started_at DESC
`;
