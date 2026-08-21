/**
 * One scale, two accents, resolved per colour scheme. Components read `useTheme()` and
 * never write a raw fontSize or hex — that is how sub-12sp text and 3:1 labels metastasise.
 *
 * Every colour below was chosen by COMPUTING contrast, not by eye, and all four
 * accent x scheme permutations are audited — a default that passes says nothing about
 * the others. Measured against each mode's own background:
 *   neutrals  light text #12161C 16.4:1 · muted #4A5560 7.9:1
 *             dark  text #ECF0F4 15.1:1 · muted #A3AEBA 8.3:1
 *   blue      light #1F6FEB 4.63:1, white label on it 4.63:1
 *             dark  #7FB2FF 8.54:1, #0A1020 ink on it
 *   green     light #0F7A3D 5.42:1, white label on it 5.42:1
 *             dark  #6FD39B 10.09:1, #0A1020 ink on it
 * Muted deliberately goes grey-DARK in light mode: the inactive-tab-label trap.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { useColorScheme } from 'react-native';

import { getSetting, setSetting } from '@/db';

export const type = {
  caption: 12,
  body: 15,
  bodyLarge: 17,
  title: 20,
  display: 28,
} as const;

/** 8 dp grid, 4 for tight internal padding. */
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

/** Satisfies Material 48 dp, HIG 44 pt and WCAG 2.5.8 at once. */
export const TAP = 48;

const neutralLight = {
  bg: '#FFFFFF',
  surface: '#F2F5F8',
  border: '#D6DDE5',
  text: '#12161C',
  muted: '#4A5560',
  danger: '#B3261E',
  live: '#B3261E',
};

const neutralDark = {
  bg: '#10141A',
  surface: '#1A2029',
  border: '#2C3540',
  text: '#ECF0F4',
  muted: '#A3AEBA',
  danger: '#F2B8B5',
  live: '#F2B8B5',
};

/**
 * `onAccent` is a real per-accent role, not a global white. White clears 4.5:1 on both
 * light accents here but fails on every lightened dark-mode accent, so dark ink is
 * correct there — that is what Material's onPrimary exists for.
 */
const accents = {
  blue: {
    light: { accent: '#1F6FEB', onAccent: '#FFFFFF' },
    dark: { accent: '#7FB2FF', onAccent: '#0A1020' },
  },
  green: {
    light: { accent: '#0F7A3D', onAccent: '#FFFFFF' },
    dark: { accent: '#6FD39B', onAccent: '#0A1020' },
  },
} as const;

export type AccentName = keyof typeof accents;
export const ACCENT_NAMES = Object.keys(accents) as AccentName[];
export type Palette = typeof neutralLight & { accent: string; onAccent: string };

// ponytail: module-level value + listener Set is a complete store. No Zustand, no context
// cascade. The value is a plain string, never an object mutated in place, so nothing can
// hold a stale reference across hydration.
let current: AccentName = 'blue';
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};

export function setAccent(name: AccentName): void {
  if (name === current) return;
  current = name;
  notify();
  void setSetting('accent', name);   // fire and forget; the UI already moved
}

/** Read the saved accent once at startup. Safe to call before the DB has anything in it. */
export async function hydrateAccent(): Promise<void> {
  const saved = await getSetting('accent');
  if (saved && (ACCENT_NAMES as string[]).includes(saved) && saved !== current) {
    current = saved as AccentName;
    notify();
  }
}

export function useAccent(): [AccentName, (n: AccentName) => void] {
  const name = useSyncExternalStore(subscribe, () => current, () => current);
  return [name, setAccent];
}

export function useTheme(): Palette {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const name = useSyncExternalStore(subscribe, () => current, () => current);
  const neutral = scheme === 'dark' ? neutralDark : neutralLight;
  return { ...neutral, ...accents[name][scheme] };
}

/** Cycle to the next accent. Used by the one toggle in the header. */
export function useCycleAccent(): () => void {
  const [name, set] = useAccent();
  return useCallback(() => {
    const i = ACCENT_NAMES.indexOf(name);
    set(ACCENT_NAMES[(i + 1) % ACCENT_NAMES.length] as AccentName);
  }, [name, set]);
}

export const palettes = { neutralLight, neutralDark, accents };
