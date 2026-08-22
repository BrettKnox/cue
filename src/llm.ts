/**
 * The two things Cue asks a model to do: recap a finished conversation, and answer a
 * question about one.
 *
 * **No provider key is ever in this app.** Requests go to Cue's own Cloudflare Worker
 * (`proxy/worker.js`), which holds the OpenRouter key as a secret and pins the model.
 * The app carries only a proxy token, which can be rotated without a new build. Anything
 * in the JS bundle is extractable from the APK, so a provider key here would be a leak.
 *
 * What leaves the device: transcript TEXT, and only when the user asks for a recap or an
 * answer. Audio never leaves. Summaries can be turned off entirely in Settings.
 */
import Constants from 'expo-constants';

import { type Recap, parseRecap } from '@/recap';

export { type Recap, parseRecap };

type Extra = { proxyUrl?: string; proxyToken?: string };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

const PROXY_URL = extra.proxyUrl ?? '';
const PROXY_TOKEN = extra.proxyToken ?? '';

const RECAP_SYSTEM =
  'You summarise a conversation transcript for someone who was present but may not ' +
  'remember it. The transcript comes from live speech recognition, so it is unpunctuated ' +
  'in places and contains mishearings — infer intent, never invent facts. Reply with ' +
  'JSON only: {"title": "<4-6 words>", "summary": "<2-4 sentences, plain language>", ' +
  '"commitments": ["<something the user agreed to do>", ...], ' +
  '"people": ["<name of anyone named or addressed>", ...]}. Use empty arrays when there ' +
  'is nothing to list. Never guess a name that was not said.';

const ASK_SYSTEM =
  'You answer questions about a conversation the user was present for, using only the ' +
  'transcript provided. The transcript is imperfect speech recognition. If the answer is ' +
  'not in it, say plainly that it was not said — never fill the gap. Answer in one short ' +
  'paragraph, no preamble, no bullet lists.';

/** Whether summaries and Ask can work at all. */
export function configured(): boolean {
  return PROXY_URL.length > 0 && PROXY_TOKEN.length > 0;
}

async function complete(
  messages: { role: string; content: string }[],
  opts: { json?: boolean; maxTokens?: number; signal?: AbortSignal } = {},
): Promise<string> {
  if (!configured()) throw new Error('No summary service configured for this build.');

  const res = await fetch(`${PROXY_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PROXY_TOKEN}` },
    signal: opts.signal,
    body: JSON.stringify({
      messages,
      response_format: opts.json ? { type: 'json_object' } : undefined,
      max_tokens: opts.maxTokens ?? 700,
    }),
  });

  if (res.status === 429) throw new Error('The summary service is busy. Try again in a moment.');
  if (!res.ok) throw new Error(`Summary failed (${res.status}).`);

  const body = await res.json();
  return body?.choices?.[0]?.message?.content ?? '';
}

/** Trim to the most recent text — the tail of a long meeting is what people ask about. */
function clip(transcript: string, limit = 24000): string {
  const t = transcript.trim();
  return t.length <= limit ? t : t.slice(t.length - limit);
}

export async function recap(transcript: string, signal?: AbortSignal): Promise<Recap> {
  if (!transcript.trim()) throw new Error('Nothing was transcribed yet.');
  return parseRecap(await complete(
    [{ role: 'system', content: RECAP_SYSTEM }, { role: 'user', content: clip(transcript) }],
    { json: true, maxTokens: 700, signal },
  ));
}

/** Answer one question about one conversation. */
export async function ask(transcript: string, question: string, signal?: AbortSignal): Promise<string> {
  const q = question.trim();
  if (!q) throw new Error('Ask a question first.');
  if (!transcript.trim()) throw new Error('There is no transcript to ask about.');

  const answer = await complete([
    { role: 'system', content: ASK_SYSTEM },
    { role: 'user', content: `Transcript:\n${clip(transcript)}\n\nQuestion: ${q}` },
  ], { maxTokens: 400, signal });

  return answer.trim() || 'The model returned nothing.';
}
