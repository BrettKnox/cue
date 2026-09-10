/**
 * The shape of user preferences, their defaults, and the tolerant reader for stored JSON.
 * **Import-free on purpose** so `checks.ts` can exercise `merge` under plain node — the
 * same reason `sql.ts` and `searchTerm.ts` have no imports.
 */

export type TextSize = 'normal' | 'large' | 'huge';

export type Settings = {
  /** Refuse cloud speech recognition. Audio never leaves the device. */
  onDeviceOnly: boolean;
  /** Allow transcript TEXT to reach the summary service when the user asks for it. */
  summaries: boolean;
  /** Buzz when recording starts and stops. Separate from on-screen press feedback. */
  vibrate: boolean;
  /** Multiplies the transcript type scale. */
  textSize: TextSize;
  /** Recognition locale. */
  lang: string;
  /** Onboarding has been seen. */
  onboarded: boolean;
};

/**
 * Audio is private by default: `onDeviceOnly` opts IN to the cloud, never out of it.
 * `summaries` is the deliberate exception and ships ON, because a recall app with no
 * recap is not the product. It means stopping a recording sends that transcript TEXT
 * once (LiveScreen `end`). Off makes the app fully offline and is one tap away.
 */
export const _defaults: Settings = {
  onDeviceOnly: true,
  summaries: true,
  vibrate: true,
  textSize: 'normal',
  lang: 'en-US',
  onboarded: false,
};

export const TEXT_SCALE: Record<TextSize, number> = { normal: 1, large: 1.2, huge: 1.45 };

/** Only known keys, only the right types, defaults for everything else. Never throws. */
export function merge(raw: string): Settings {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { ..._defaults }; }
  const o = (parsed ?? {}) as Record<string, unknown>;

  const bool = (k: 'onDeviceOnly' | 'summaries' | 'vibrate' | 'onboarded'): boolean =>
    typeof o[k] === 'boolean' ? (o[k] as boolean) : _defaults[k];

  const size = o.textSize;
  const lang = o.lang;

  return {
    onDeviceOnly: bool('onDeviceOnly'),
    summaries: bool('summaries'),
    vibrate: bool('vibrate'),
    onboarded: bool('onboarded'),
    textSize: size === 'normal' || size === 'large' || size === 'huge' ? size : _defaults.textSize,
    lang: typeof lang === 'string' && lang.trim() ? lang : _defaults.lang,
  };
}
