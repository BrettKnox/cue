/**
 * One LLM call: turn a transcript into something worth reading afterwards.
 *
 * OpenAI-compatible, so the backend is one env var away from DeepSeek direct,
 * OpenRouter, or a local Ollama at http://<host>:11434/v1.
 *
 * ponytail: the key is read from app config, which means it ships inside the bundle.
 * Fine for dogfooding, NOT fine for release — put a proxy in front (a tiny worker that
 * holds the key and forwards) before this goes on a store. That is the known ceiling.
 */
import Constants from 'expo-constants';

import { type Recap, parseRecap } from '@/recap';

export { type Recap, parseRecap };

type Extra = { llmBaseUrl?: string; llmModel?: string; llmApiKey?: string };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

const BASE_URL = extra.llmBaseUrl ?? 'https://api.deepseek.com/v1';
const MODEL = extra.llmModel ?? 'deepseek-v4-flash';
const API_KEY = extra.llmApiKey ?? '';

const SYSTEM =
  'You summarise a conversation transcript for someone who was present but may not ' +
  'remember it. The transcript comes from live speech recognition, so it is unpunctuated ' +
  'in places and contains mishearings — infer intent, never invent facts. Reply with ' +
  'JSON only: {"title": "<4-6 words>", "summary": "<2-4 sentences, plain language>", ' +
  '"commitments": ["<something the user agreed to do>", ...]}. Use an empty array when ' +
  'nothing was agreed.';

export function configured(): boolean {
  return API_KEY.length > 0;
}

export async function recap(transcript: string, signal?: AbortSignal): Promise<Recap> {
  const text = transcript.trim();
  if (!text) throw new Error('Nothing was transcribed yet.');
  if (!API_KEY) throw new Error('No LLM key configured — set extra.llmApiKey in app config.');

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
    signal,
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: text.slice(0, 24000) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 700,
    }),
  });
  if (!res.ok) throw new Error(`Summary failed (${res.status}). ${(await res.text()).slice(0, 200)}`);

  const body = await res.json();
  const content: string = body?.choices?.[0]?.message?.content ?? '';
  return parseRecap(content);
}
