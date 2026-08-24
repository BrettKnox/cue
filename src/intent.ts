/**
 * The pending launcher intent, held in a module store and **consumed exactly once**.
 *
 * Navigation itself is handled by React Navigation's `linking` config; this only carries the
 * side effect it cannot express — "and start recording". Consuming it once is the point: a
 * screen that re-focuses, or a tab the user taps normally, must never re-trigger the mic.
 */
import { useSyncExternalStore } from 'react';

import { type Intent, parseIntent } from '@/intentUrl';

export { type Intent, parseIntent };

let pending: Intent = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

/** Called for the cold-start URL and every warm `url` event. */
export function noteUrl(url: string | null | undefined): void {
  const next = parseIntent(url);
  if (!next || next === pending) return;
  pending = next;
  notify();
}

/** Take the intent if it is the one you own. Returns false otherwise, and never twice. */
export function takeIntent(want: Exclude<Intent, null>): boolean {
  if (pending !== want) return false;
  pending = null;
  notify();
  return true;
}

export function usePendingIntent(): Intent {
  return useSyncExternalStore(subscribe, () => pending, () => pending);
}
