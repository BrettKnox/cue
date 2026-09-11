// Does the model the proxy pins still have a Zero Data Retention endpoint to route to?
//
//   node proxy/check-zdr.mjs
//
// worker.js sends `provider: { zdr: true }`, which is what lets Cue's Play Data safety form
// claim ephemeral processing. If OpenRouter's ZDR list ever stops covering the pinned model,
// that flag stops being free: every recap starts failing instead of quietly downgrading,
// which is the correct behaviour and a terrible surprise. This is the thirty-second check.
//
// Deliberately NOT part of `npm run check`: it needs the network, and a flaky network test
// in the main suite trains people to ignore failures. Run it when MODEL changes, before
// filing the Data safety form, and if recaps start erroring.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, 'worker.js'), 'utf8');

const model = src.match(/const MODEL = '([^']+)'/)?.[1];
if (!model) { console.error('FAIL: could not read MODEL out of worker.js'); process.exit(1); }
const zdrOn = /provider:\s*\{\s*zdr:\s*true\s*\}/.test(src);

const res = await fetch('https://openrouter.ai/api/v1/endpoints/zdr');
if (!res.ok) { console.error(`FAIL: ZDR list returned ${res.status}`); process.exit(1); }
const rows = (await res.json()).data ?? [];
const hits = rows.filter((r) => r?.model_id === model);

console.log(`MODEL           ${model}`);
console.log(`provider.zdr    ${zdrOn ? 'true, worker.js enforces it' : 'MISSING from worker.js'}`);
console.log(`ZDR endpoints   ${hits.length}`);
for (const h of hits) {
  console.log(`  ${h.provider_name}  in ${h.pricing?.prompt}  out ${h.pricing?.completion}  uptime30m ${(h.uptime_last_30m ?? 0).toFixed(1)}%`);
}

if (!zdrOn) {
  console.error('\nFAIL: worker.js does not send provider.zdr, so the account default decides retention.');
  process.exit(1);
}
if (!hits.length) {
  console.error(`\nFAIL: no ZDR endpoint serves ${model}. With provider.zdr set, every recap will error.`);
  console.error('Pick a model that has one, or drop the flag and declare collection honestly on the Play form.');
  process.exit(1);
}
console.log(`\nok: ${hits.length} ZDR endpoint(s). The recap has somewhere to go and the form can say ephemeral.`);
