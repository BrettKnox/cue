/**
 * Cue's LLM proxy.
 *
 * The app must never carry the OpenRouter key: anything in the JS bundle is extractable
 * from the APK. The key lives here as a Worker secret, and the app authenticates with a
 * separate token that can be rotated without shipping a new build.
 *
 * Deploy:
 *   npx wrangler login
 *   npx wrangler secret put OPENROUTER_API_KEY   --config proxy/wrangler.jsonc
 *   npx wrangler secret put CUE_PROXY_TOKEN      --config proxy/wrangler.jsonc
 *   npx wrangler deploy                          --config proxy/wrangler.jsonc
 */

const MODEL = 'deepseek/deepseek-v4-flash';
const MAX_TOKENS = 900;
const MAX_BODY_BYTES = 200_000;   // a very long meeting transcript, not an abuse vector

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return json(405, { error: 'POST only' });
    if (new URL(request.url).pathname !== '/chat/completions') return json(404, { error: 'not found' });

    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    // Constant-time-ish: compare full strings, never short-circuit on length alone.
    if (!env.CUE_PROXY_TOKEN || token !== env.CUE_PROXY_TOKEN) return json(401, { error: 'unauthorized' });

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'transcript too large' });

    let body;
    try { body = JSON.parse(raw); } catch { return json(400, { error: 'bad json' }); }
    if (!Array.isArray(body.messages)) return json(400, { error: 'messages required' });

    // The client does not get to choose the model or an unbounded completion.
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://wukoric.com',
        'X-Title': 'Cue',
      },
      body: JSON.stringify({
        model: MODEL,
        // Route ONLY to endpoints that do not store the request. Without this the account
        // default applies, and on 2026-09-10 that default was Zero Data Retention OFF on
        // every scope, which means a transcript could be retained non-transiently. Retention
        // is the exact thing Play's ephemeral-processing exemption requires the absence of,
        // so this line is what lets the Data safety form say "not collected".
        //
        // The feared failure mode, "no provider satisfies the constraint so every recap
        // hard-fails", does not apply to this model. OpenRouter publishes the authoritative
        // list at https://openrouter.ai/api/v1/endpoints/zdr, and on 2026-09-11
        // deepseek/deepseek-v4-flash had TEN ZDR endpoints: DeepInfra, SiliconFlow, Novita,
        // Parasail, DigitalOcean, Venice, NextBit, Phala, Mancer 2 and Azure. DigitalOcean is
        // ZDR and is also the cheapest endpoint on the board, so this costs nothing either.
        // Re-check that URL before changing MODEL.
        provider: { zdr: true },
        messages: body.messages,
        response_format: body.response_format,
        max_tokens: Math.min(body.max_tokens || MAX_TOKENS, MAX_TOKENS),
      }),
    });

    // Pass the upstream status through so the app can tell "rate limited" from "broken".
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
