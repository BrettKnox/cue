// Self-check for the recap parser: `npm run check` (node strips the types natively).
import assert from 'node:assert/strict';

import { parseRecap } from './recap.ts';

// clean JSON, the happy path
const a = parseRecap('{"title":"Roof quote","summary":"Dan quoted 4k.","commitments":["send the photos"]}');
assert.equal(a.title, 'Roof quote');
assert.deepEqual(a.commitments, ['send the photos']);

// provider ignored response_format and wrapped it in prose + a fence
const b = parseRecap('Sure! Here you go:\n```json\n{"title":"Standup","summary":"Blocked on auth.","commitments":[]}\n```');
assert.equal(b.title, 'Standup');
assert.deepEqual(b.commitments, []);

// missing/blank fields must not produce an untitled empty card
const c = parseRecap('{"summary":"  spoke briefly  ","title":"   "}');
assert.equal(c.title, 'Conversation');
assert.equal(c.summary, 'spoke briefly');
assert.deepEqual(c.commitments, []);

// commitments of the wrong shape are dropped, not rendered as "undefined"
const d = parseRecap('{"title":"X","summary":"y","commitments":["real",null,42,"  ","also real"]}');
assert.deepEqual(d.commitments, ['real', 'also real']);

// people[]: same tolerance, plus dedupe so one name does not become three chips
const e = parseRecap('{"title":"X","summary":"y","people":["Dan","dan"," Sarah ",null,"","Dan"]}');
assert.deepEqual(e.people, ['Dan', 'Sarah']);
assert.deepEqual(parseRecap('{"title":"X","summary":"y"}').people, []);   // absent is not a crash

// genuinely unparseable input has to raise, not silently return an empty recap
assert.throws(() => parseRecap('the model refused'), /did not return a summary/);

console.log('recap parser ok');

// --- search terms: a typed "%" must not match everything ---
import { LIKE_ESCAPE, escapeLike, likePattern } from './searchTerm.ts';

assert.equal(escapeLike('deposit'), 'deposit');                    // ordinary text untouched
assert.equal(escapeLike('100%'), '100\\%');                        // wildcard neutralised
assert.equal(escapeLike('a_b'), 'a\\_b');
assert.equal(escapeLike('C:\\Users'), 'C:\\\\Users');                  // escape char escaped first
assert.equal(escapeLike('50%_off'), '50\\%\\_off');               // all together
assert.equal(likePattern('  roof  '), '%roof%');                   // trimmed and wrapped

console.log('search terms ok');

// --- the real search query against real SQLite (node:sqlite, no deps) ---
import { DatabaseSync } from 'node:sqlite';

import {
  CONVERSATION_PEOPLE_SQL, PEOPLE_SQL, PERSON_CONVERSATIONS_SQL, SCHEMA, SEARCH_SQL,
} from './sql.ts';

// the two files must agree on the escape character or every wildcard silently leaks
assert.ok(SEARCH_SQL.includes(`ESCAPE '${LIKE_ESCAPE}'`), 'SEARCH_SQL escape char drifted from searchTerm');

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(SCHEMA);
sqlite.exec("INSERT INTO conversations (id, started_at, title) VALUES (1, 1000, 'Roof quote')");
const rows: [number, number, number, string][] = [
  [1, 1, 1001, 'the deposit is 100% refundable'],
  [2, 1, 1002, 'we agreed on a_b testing'],
  [3, 1, 1003, 'nothing relevant here'],
];
const ins = sqlite.prepare('INSERT INTO utterances (id, conversation_id, at, text) VALUES (?, ?, ?, ?)');
for (const r of rows) ins.run(r[0], r[1], r[2], r[3]);

const find = (q: string) => sqlite.prepare(SEARCH_SQL).all(likePattern(q)) as { id: number; title: string }[];

// a literal % must match ONLY the row containing it, not every row
const pct = find('100%');
assert.equal(pct.length, 1, `literal % matched ${pct.length} rows — the ESCAPE clause is not working`);
assert.equal(pct[0]!.id, 1);
assert.equal(pct[0]!.title, 'Roof quote');        // the join actually carries the title

// a literal _ must not act as a single-character wildcard
assert.equal(find('a_b').length, 1);
assert.equal(find('a%b').length, 0);              // wildcard typed by the user finds nothing real

// ordinary search still works, newest first
assert.equal(find('the').length, 1);
assert.equal(find('e').length, 3);
assert.deepEqual(find('e').map((r) => r.id), [3, 2, 1]);
assert.equal(find('nonexistent').length, 0);

console.log('search query ok');

// --- people: the real queries against real SQLite ---
sqlite.exec("INSERT INTO conversations (id, started_at, title) VALUES (2, 2000, 'Standup')");
sqlite.exec("INSERT INTO people (id, name, notes, created_at) VALUES (1, 'Dan', '', 1)");
sqlite.exec("INSERT INTO people (id, name, notes, created_at) VALUES (2, 'Sarah', 'prefers texts', 1)");
sqlite.exec("INSERT INTO people (id, name, notes, created_at) VALUES (3, 'Unlinked', '', 1)");
sqlite.exec('INSERT INTO conversation_people VALUES (1, 1), (2, 1), (2, 2)');

type P = { id: number; name: string; conversations: number; last_seen: number };
const roster = sqlite.prepare(PEOPLE_SQL).all() as P[];

// Someone never attached still has to appear, or adding a person by hand looks broken.
assert.equal(roster.length, 3, 'a person with no conversations vanished from the roster');
const dan = roster.find((r) => r.name === 'Dan')!;
const alone = roster.find((r) => r.name === 'Unlinked')!;
assert.equal(dan.conversations, 2);
assert.equal(dan.last_seen, 2000, 'last_seen should be the NEWEST conversation, not the oldest');
assert.equal(alone.conversations, 0, 'LEFT JOIN must count 0, not 1, for an unattached person');
assert.equal(alone.last_seen, 0);
// ordered by who was heard from most recently
assert.deepEqual(roster.map((r) => r.name), ['Dan', 'Sarah', 'Unlinked']);

// the two directions of the link
assert.deepEqual((sqlite.prepare(CONVERSATION_PEOPLE_SQL).all(2) as P[]).map((r) => r.name),
  ['Dan', 'Sarah']);
assert.deepEqual((sqlite.prepare(PERSON_CONVERSATIONS_SQL).all(1) as { id: number }[]).map((r) => r.id),
  [2, 1]);
assert.equal((sqlite.prepare(PERSON_CONVERSATIONS_SQL).all(3) as unknown[]).length, 0);

// name is unique case-insensitively, so "dan" and "Dan" cannot become two people
assert.throws(() => sqlite.exec("INSERT INTO people (name, notes, created_at) VALUES ('dan', '', 1)"),
  /UNIQUE/i, 'people.name must be UNIQUE COLLATE NOCASE');

console.log('people query ok');

sqlite.close();

// --- settings: corrupt or partial storage must never break startup ---
import { merge, _defaults } from './settingsShape.ts';

assert.deepEqual(merge('not json'), _defaults, 'corrupt settings must fall back to defaults');
assert.deepEqual(merge('null'), _defaults);
assert.equal(merge('{"onDeviceOnly": false}').onDeviceOnly, false);
assert.equal(merge('{"onDeviceOnly": false}').summaries, true, 'unset keys keep their default');
// a wrong type must not poison the value
assert.equal(merge('{"onDeviceOnly": "yes"}').onDeviceOnly, true);
assert.equal(merge('{"textSize": "enormous"}').textSize, 'normal');
assert.equal(merge('{"textSize": "huge"}').textSize, 'huge');
assert.equal(merge('{"lang": "   "}').lang, 'en-US');
// privacy default is the safe one, and it is the default that ships
assert.equal(_defaults.onDeviceOnly, true, 'on-device must be the DEFAULT, not an opt-in');

console.log('settings ok');

// --- speech errors: never show a raw platform string to a user ---
import { humanError } from './speechError.ts';

// The two that are normal operation, not failures worth interrupting anyone over.
assert.equal(humanError('no-speech'), null, 'no-speech fires constantly in a quiet room');
assert.equal(humanError('aborted'), null);

// Every other code must produce something actionable, and never echo the platform text.
for (const code of ['not-allowed', 'service-not-allowed', 'audio-capture', 'network',
                    'language-not-supported', 'busy', 'client', 'error_2', 'total-nonsense']) {
  const msg = humanError(code, 'Other client side errors');
  assert.ok(msg, `${code} produced no message`);
  assert.ok(!msg.includes('Other client side errors'),
    `${code} leaked the raw platform string to the user`);
  assert.ok(/[.!]$/.test(msg), `${code} message is not a sentence: ${msg}`);
  assert.ok(msg.length > 20, `${code} message is too terse to act on: ${msg}`);
}

// the permission case has to point somewhere useful
assert.match(humanError('not-allowed')!, /permission/i);
// the on-device promise shows up in the network case
assert.match(humanError('network')!, /on-device/i);

console.log('speech errors ok');

// --- launcher intents: only an explicit cue://listen may switch the microphone on ---
import { parseIntent } from './intentUrl.ts';

assert.equal(parseIntent('cue://listen'), 'listen');
assert.equal(parseIntent('cue://search'), 'search');
assert.equal(parseIntent('cue://listen/'), 'listen');        // trailing slash
assert.equal(parseIntent('cue://LISTEN'), 'listen');         // case
assert.equal(parseIntent('cue://listen?from=widget'), 'listen');

// Anything that is not exactly that path must NOT start a recording.
assert.equal(parseIntent(null), null);
assert.equal(parseIntent(''), null);
assert.equal(parseIntent('cue://'), null);                   // a plain launch
assert.equal(parseIntent('cue://settings'), null);
assert.equal(parseIntent('cue://conversation/12'), null);
assert.equal(parseIntent('cue://conversation/12?q=listen'), null,
  'a query containing "listen" must not arm the microphone');
assert.equal(parseIntent('cue://listening'), null, 'a longer path must not match');
assert.equal(parseIntent('https://example.com/listen'), null, 'a web URL is not our intent');

console.log('launcher intents ok');

// --- text helpers ---
import { relative, splitMatch, titleFrom } from './textUtils.ts';

// titleFrom: the fallback that stops History being a wall of "Untitled conversation"
assert.equal(titleFrom(''), '');
assert.equal(titleFrom('   '), '');
assert.equal(titleFrom('short one'), 'short one');            // under the limit, no ellipsis
assert.equal(titleFrom('one two three four five six'), 'one two three four five six');
assert.equal(titleFrom('one two three four five six seven'), 'one two three four five six…');
assert.equal(titleFrom('  ragged   spacing   here  '), 'ragged spacing here');
// trailing punctuation immediately before an ellipsis reads as a typo
assert.equal(titleFrom('so about the roof, Dan said the quote'), 'so about the roof, Dan said…');
assert.ok(!titleFrom('a b c d e f g').includes(' …'), 'no space before the ellipsis');

// splitMatch: highlighting must treat the term literally, exactly as the SQL escaping does
assert.deepEqual(splitMatch('the deposit is due', 'deposit'), [
  { text: 'the ', hit: false }, { text: 'deposit', hit: true }, { text: ' is due', hit: false },
]);
assert.equal(splitMatch('Roof roof ROOF', 'roof').filter((x) => x.hit).length, 3);
assert.deepEqual(splitMatch('abc', ''), [{ text: 'abc', hit: false }]);   // empty term
assert.deepEqual(splitMatch('', 'x'), [{ text: '', hit: false }]);
assert.equal(splitMatch('start here', 'start')[0]!.hit, true);            // match at index 0
assert.equal(splitMatch('end here', 'here').at(-1)!.hit, true);           // match at the end
// a regex-special term must match literally, not throw and not match everything
assert.equal(splitMatch('a.b and axb', 'a.b').filter((x) => x.hit).length, 1);
assert.equal(splitMatch('100% sure', '100%').filter((x) => x.hit).length, 1);
// the pieces must always reassemble into the original text
for (const [text, term] of [['the deposit is due', 'e'], ['aaa', 'aa'], ['xyz', 'q']] as const) {
  assert.equal(splitMatch(text, term).map((p) => p.text).join(''), text,
    `splitMatch lost or duplicated text for "${term}"`);
}

// relative: clock skew must never print a negative age
const T = 1_700_000_000_000;
assert.equal(relative(T, T), 'just now');
assert.equal(relative(T + 60_000, T), 'just now', 'a future timestamp must not read "-1 min ago"');
assert.equal(relative(T - 5 * 60_000, T), '5 min ago');
assert.equal(relative(T - 60 * 60_000, T), '1 hour ago');
assert.equal(relative(T - 3 * 3600_000, T), '3 hours ago');
assert.equal(relative(T - 25 * 3600_000, T), 'yesterday');
assert.equal(relative(T - 3 * 86400_000, T), '3 days ago');

console.log('text helpers ok');
