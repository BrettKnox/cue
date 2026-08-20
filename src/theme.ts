/**
 * One scale, one palette, resolved per colour scheme. Components read `useTheme()`
 * and never write a raw fontSize or hex — that is how sub-12sp text and 3:1 labels
 * metastasise across screens.
 *
 * Contrast (sRGB relative luminance) against each mode's own background:
 *   light  text #12161C on #FFFFFF 16.4:1 · muted #4A5560 on #FFFFFF 7.9:1
 *   dark   text #ECF0F4 on #10141A 15.1:1 · muted #A3AEBA on #10141A 8.3:1
 *   accent #1F6FEB with onAccent #FFFFFF 4.8:1 · dark accent #7FB2FF with ink #0A1020
 * Muted deliberately goes grey-DARK in light mode: the inactive-tab-label trap.
 */
import { useColorScheme } from 'react-native';

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

const light = {
  bg: '#FFFFFF',
  surface: '#F2F5F8',
  border: '#D6DDE5',
  text: '#12161C',
  muted: '#4A5560',
  accent: '#1F6FEB',
  onAccent: '#FFFFFF',
  danger: '#B3261E',
  live: '#B3261E',
};

const dark: typeof light = {
  bg: '#10141A',
  surface: '#1A2029',
  border: '#2C3540',
  text: '#ECF0F4',
  muted: '#A3AEBA',
  accent: '#7FB2FF',
  onAccent: '#0A1020',   // dark ink on a light accent — white would fail here
  danger: '#F2B8B5',
  live: '#F2B8B5',
};

export type Palette = typeof light;

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const palettes = { light, dark };
