/**
 * Recap shape + the tolerant parser for it. No imports on purpose: this is the only
 * piece of real branching in the app, so it stays runnable by plain node for its check.
 */
export type Recap = {
  title: string;
  summary: string;
  /** Things the user said they would do, or that were asked of them. */
  commitments: string[];
};

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
    commitments: Array.isArray(o.commitments)
      ? o.commitments.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      : [],
  };
}
