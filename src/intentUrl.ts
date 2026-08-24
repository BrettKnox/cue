/**
 * What a launcher shortcut, widget tap, or deep link is asking Cue to do.
 *
 * Import-free so `checks.ts` can run it under plain node — this decides whether the app
 * starts recording on its own, which is exactly the logic that must not be wrong.
 */

export type Intent = 'listen' | 'search' | null;

/**
 * Only an explicit `cue://listen` may start a recording. A bare launch, an unknown path, or
 * anything merely *containing* the word must not: `cue://conversation/12?q=listen` is a
 * search result about listening, not an instruction to switch the microphone on.
 */
export function parseIntent(url: string | null | undefined): Intent {
  if (!url) return null;

  // Strip the scheme, then any query or fragment, then surrounding slashes.
  const afterScheme = url.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  const path = (afterScheme.split(/[?#]/)[0] ?? '').replace(/^\/+|\/+$/g, '').toLowerCase();

  if (path === 'listen') return 'listen';
  if (path === 'search') return 'search';
  return null;
}
