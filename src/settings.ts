/**
 * The live settings store: a module-level value plus a listener Set, persisted to the
 * `settings` table so no storage dependency is added.
 *
 * Hydration REPLACES the value rather than mutating it — an object mutated in place leaves
 * anything holding a reference on the pre-hydration value, which is the classic
 * "the data is there but the screen is empty" bug.
 */
import { useSyncExternalStore } from 'react';

import { getSetting, setSetting } from '@/db';
import { type Settings, _defaults, merge } from '@/settingsShape';

export * from '@/settingsShape';

let current: Settings = { ..._defaults };
let hydrated = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

const KEY = 'settings';

export function get(): Settings {
  return current;
}

export async function set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  if (current[key] === value) return;
  current = { ...current, [key]: value };   // new object, never a mutation
  notify();
  await setSetting(KEY, JSON.stringify(current));
}

/** Read once at startup. Corrupt storage falls back to defaults and never throws. */
export async function hydrate(): Promise<void> {
  try {
    const raw = await getSetting(KEY);
    if (raw) current = merge(raw);
  } catch {
    // a broken settings row must not stop the app from opening
  }
  hydrated = true;
  notify();
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, () => current, () => current);
}

/** Gates that must not act before storage is read (onboarding flashing at returning users). */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => hydrated, () => hydrated);
}
