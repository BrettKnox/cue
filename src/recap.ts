/**
 * Recap shape + the tolerant parser for it. No imports on purpose: this is the only
 * piece of real branching in the app, so it stays runnable by plain node for its check.
 */
export type Recap = {
  title: string;
  summary: string;
  /** Things the user said they would do, or that were asked of them. */
  commitments: string[];
  /** People named or addressed. Seeds the "who was this with?" chips. */
  people: string[];
};

/** Strings only, trimmed, blanks dropped, duplicates removed case-insensitively. */
function names(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== 'string') continue;
    const t = x.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export function parseRecap(content: string): Recap {
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    // Some providers ignore response_format and wrap the object in prose or a ```json fence.
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('The model did not return a summary.');
    raw = JSON.parse(m[0]);
  }
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    title: typeof o.title === 'string' && o.title.trim() ? o.title.trim() : 'Conversation',
    summary: typeof o.summary === 'string' ? o.summary.trim() : '',
    commitments: names(o.commitments),
    people: names(o.people),
  };
}
