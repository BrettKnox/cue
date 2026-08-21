/**
 * Turning what someone typed into a safe SQL LIKE pattern.
 *
 * Without escaping, a search for "100%" matches every utterance ever recorded, and "_"
 * matches any single character — the user types a literal and gets nonsense back. No
 * import here on purpose, so the check can run this under plain node.
 */

/** The escape character declared in the query's ESCAPE clause. */
export const LIKE_ESCAPE = '\\';

/** Escape the LIKE wildcards so the term is matched literally. */
export function escapeLike(term: string): string {
  // The escape char itself must go first, or it double-escapes what follows.
  return term
    .split(LIKE_ESCAPE).join(LIKE_ESCAPE + LIKE_ESCAPE)
    .split('%').join(LIKE_ESCAPE + '%')
    .split('_').join(LIKE_ESCAPE + '_');
}

/** Full "contains" pattern for a user-typed term. */
export function likePattern(term: string): string {
  return `%${escapeLike(term.trim())}%`;
}
