/**
 * Local store. Everything Cue hears stays on the device unless the user asks for a summary.
 *
 * ponytail: plain LIKE search, no FTS5 table. Swap in FTS when a transcript search is
 * actually slow — at one conversation per meeting that is a long way off.
 */
import * as SQLite from 'expo-sqlite';

export type Conversation = {
  id: number;
  started_at: number;
  title: string;
  summary: string | null;
};

export type Utterance = {
  id: number;
  conversation_id: number;
  at: number;
  text: string;
};

let dbp: Promise<SQLite.SQLiteDatabase> | null = null;

function db(): Promise<SQLite.SQLiteDatabase> {
  if (!dbp) {
    dbp = SQLite.openDatabaseAsync('cue.db').then(async (d) => {
      await d.execAsync(`
        PRAGMA journal_mode = WAL;
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
      `);
      return d;
    });
  }
  return dbp;
}

/** Small key/value settings, so a preference needs no extra storage dependency. */
export async function getSetting(key: string): Promise<string | null> {
  const d = await db();
  const row = await d.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const d = await db();
  await d.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, value);
}

export async function startConversation(title = ''): Promise<number> {
  const d = await db();
  const r = await d.runAsync('INSERT INTO conversations (started_at, title) VALUES (?, ?)', Date.now(), title);
  return r.lastInsertRowId;
}

/** Append one finalised utterance. Interim results are never stored — they change under you. */
export async function addUtterance(conversationId: number, text: string): Promise<void> {
  const clean = text.trim();
  if (!clean) return;
  const d = await db();
  await d.runAsync('INSERT INTO utterances (conversation_id, at, text) VALUES (?, ?, ?)',
    conversationId, Date.now(), clean);
}

export async function utterances(conversationId: number): Promise<Utterance[]> {
  const d = await db();
  return d.getAllAsync<Utterance>(
    'SELECT * FROM utterances WHERE conversation_id = ? ORDER BY at', conversationId);
}

export async function transcript(conversationId: number): Promise<string> {
  return (await utterances(conversationId)).map((u) => u.text).join(' ');
}

export async function conversations(): Promise<Conversation[]> {
  const d = await db();
  return d.getAllAsync<Conversation>('SELECT * FROM conversations ORDER BY started_at DESC');
}

export async function setSummary(conversationId: number, summary: string, title?: string): Promise<void> {
  const d = await db();
  if (title !== undefined) {
    await d.runAsync('UPDATE conversations SET summary = ?, title = ? WHERE id = ?', summary, title, conversationId);
  } else {
    await d.runAsync('UPDATE conversations SET summary = ? WHERE id = ?', summary, conversationId);
  }
}

/** Drop a conversation and its utterances. The user must be able to delete what was recorded. */
export async function removeConversation(conversationId: number): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM utterances WHERE conversation_id = ?', conversationId);
  await d.runAsync('DELETE FROM conversations WHERE id = ?', conversationId);
}

export async function search(q: string): Promise<Utterance[]> {
  const term = q.trim();
  if (!term) return [];
  const d = await db();
  return d.getAllAsync<Utterance>(
    'SELECT * FROM utterances WHERE text LIKE ? ORDER BY at DESC LIMIT 100', `%${term}%`);
}

/** Delete every conversation. Wired to the Settings wipe; also the test reset. */
export async function wipe(): Promise<void> {
  const d = await db();
  await d.execAsync('DELETE FROM utterances; DELETE FROM conversations;');  // settings survive on purpose
}
