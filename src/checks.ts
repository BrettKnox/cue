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

import { SCHEMA, SEARCH_SQL } from './sql.ts';

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

sqlite.close();
console.log('search query ok');
