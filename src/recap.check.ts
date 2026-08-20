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

// genuinely unparseable input has to raise, not silently return an empty recap
assert.throws(() => parseRecap('the model refused'), /did not return a summary/);

console.log('recap parser ok');
