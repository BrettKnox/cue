/**
 * Small pure text helpers. **Import-free on purpose** so `checks.ts` runs them under plain
 * node — same reason as `sql.ts`, `searchTerm.ts`, `recap.ts` and `intentUrl.ts`.
 */

/**
 * A readable fallback title when no summary was written — a failed recap, summaries turned
 * off, or no proxy configured. Without this, History is a wall of "Untitled conversation",
 * which is exactly the state that made the app look broken during testing.
 */
export function titleFrom(text: string, words = 6): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const parts = clean.split(' ');
  const head = parts.slice(0, words).join(' ');
  // Trailing punctuation before an ellipsis reads as a typo.
  const trimmed = head.replace(/[\s,.;:!?—-]+$/, '');
  return parts.length > words ? `${trimmed}…` : trimmed;
}

export type Span = { text: string; hit: boolean };

/**
 * Split [text] around every case-insensitive occurrence of [term], for highlighting search
 * results. The term is user input, so it is matched literally — a search for `a.b` must not
 * behave like a regex, the same trap `searchTerm.ts` guards in SQL.
 */
export function splitMatch(text: string, term: string): Span[] {
  const needle = term.trim().toLowerCase();
  if (!needle || !text) return [{ text, hit: false }];

  const hay = text.toLowerCase();
  const out: Span[] = [];
  let i = 0;
  for (;;) {
    const at = hay.indexOf(needle, i);
    if (at === -1) break;
    if (at > i) out.push({ text: text.slice(i, at), hit: false });
    out.push({ text: text.slice(at, at + needle.length), hit: true });
    i = at + needle.length;
  }
  if (i < text.length) out.push({ text: text.slice(i), hit: false });
  return out.length ? out : [{ text, hit: false }];
}

/** A short human "when". The widget and the People list each have one line for it. */
export function relative(ms: number, now = Date.now()): string {
  const mins = Math.floor((now - ms) / 60_000);
  // `< 1` also covers a negative age, so clock skew reads "just now" rather than
  // "-3 min ago". A separate negative guard would be dead code — the check proves it.
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
