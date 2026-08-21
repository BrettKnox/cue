/**
 * Local store. Everything Cue hears stays on the device unless the user asks for a summary.
 *
 * ponytail: plain LIKE search, no FTS5 table. Swap in FTS when a transcript search is
 * actually slow — at one conversation per meeting that is a long way off.
 */
import * as SQLite from 'expo-sqlite';

import { likePattern } from '@/searchTerm';
import { SCHEMA, SEARCH_SQL } from '@/sql';

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
      await d.execAsync(`PRAGMA journal_mode = WAL;` + SCHEMA);
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

export type Hit = Utterance & { title: string; started_at: number };

/** Find utterances containing [q], newest first, with the conversation they came from. */
export async function search(q: string): Promise<Hit[]> {
  if (!q.trim()) return [];
  const d = await db();
  return d.getAllAsync<Hit>(SEARCH_SQL, likePattern(q));
}

/** Delete every conversation. Wired to the Settings wipe; also the test reset. */
export async function wipe(): Promise<void> {
  const d = await db();
  await d.execAsync('DELETE FROM utterances; DELETE FROM conversations;');  // settings survive on purpose
}
