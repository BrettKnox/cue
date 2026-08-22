/**
 * Local store. Everything Cue hears stays on the device unless the user asks for a summary.
 *
 * ponytail: plain LIKE search, no FTS5 table. Swap in FTS when a transcript search is
 * actually slow — at one conversation per meeting that is a long way off.
 */
import * as SQLite from 'expo-sqlite';

import { likePattern } from '@/searchTerm';
import {
  CONVERSATION_PEOPLE_SQL, PEOPLE_SQL, PERSON_CONVERSATIONS_SQL, SCHEMA, SEARCH_SQL,
} from '@/sql';

export type Conversation = {
  id: number;
  started_at: number;
  title: string;
  summary: string | null;
};

export type Person = {
  id: number;
  name: string;
  notes: string;
  created_at: number;
};

export type PersonSummary = Person & { conversations: number; last_seen: number };

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
  await d.runAsync('DELETE FROM conversation_people WHERE conversation_id = ?', conversationId);
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
  // settings survive on purpose; people go, since they are conversation data
  await d.execAsync(
    'DELETE FROM utterances; DELETE FROM conversation_people; DELETE FROM conversations; DELETE FROM people;');
}

// --- people -----------------------------------------------------------------
// A conversation is remembered by who it was with. Deleting a person never deletes a
// conversation; the link goes, the record stays.

/** Find or create by name, case-insensitively. Returns the id either way. */
export async function personByName(name: string): Promise<number | null> {
  const clean = name.trim();
  if (!clean) return null;
  const d = await db();
  const existing = await d.getFirstAsync<{ id: number }>(
    'SELECT id FROM people WHERE name = ? COLLATE NOCASE', clean);
  if (existing) return existing.id;
  const r = await d.runAsync(
    'INSERT INTO people (name, notes, created_at) VALUES (?, ?, ?)', clean, '', Date.now());
  return r.lastInsertRowId;
}

export async function people(): Promise<PersonSummary[]> {
  const d = await db();
  return d.getAllAsync<PersonSummary>(PEOPLE_SQL);
}

export async function person(id: number): Promise<Person | null> {
  const d = await db();
  return (await d.getFirstAsync<Person>('SELECT * FROM people WHERE id = ?', id)) ?? null;
}

export async function setPersonNotes(id: number, notes: string): Promise<void> {
  const d = await db();
  await d.runAsync('UPDATE people SET notes = ? WHERE id = ?', notes, id);
}

/** Idempotent: attaching the same person twice is not an error. */
export async function linkPerson(conversationId: number, personId: number): Promise<void> {
  const d = await db();
  await d.runAsync(
    'INSERT OR IGNORE INTO conversation_people (conversation_id, person_id) VALUES (?, ?)',
    conversationId, personId);
}

export async function unlinkPerson(conversationId: number, personId: number): Promise<void> {
  const d = await db();
  await d.runAsync(
    'DELETE FROM conversation_people WHERE conversation_id = ? AND person_id = ?',
    conversationId, personId);
}

export async function peopleFor(conversationId: number): Promise<Person[]> {
  const d = await db();
  return d.getAllAsync<Person>(CONVERSATION_PEOPLE_SQL, conversationId);
}

export async function conversationsFor(personId: number): Promise<Conversation[]> {
  const d = await db();
  return d.getAllAsync<Conversation>(PERSON_CONVERSATIONS_SQL, personId);
}

/** Remove the person and every link to them. Conversations are untouched. */
export async function removePerson(id: number): Promise<void> {
  const d = await db();
  await d.runAsync('DELETE FROM conversation_people WHERE person_id = ?', id);
  await d.runAsync('DELETE FROM people WHERE id = ?', id);
}

/** Attach the names a recap found, creating anyone new. Returns how many stuck. */
export async function attachNames(conversationId: number, names: string[]): Promise<number> {
  let n = 0;
  for (const name of names) {
    const id = await personByName(name);
    if (id != null) { await linkPerson(conversationId, id); n += 1; }
  }
  return n;
}
