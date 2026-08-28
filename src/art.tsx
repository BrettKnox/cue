/**
 * The illustration layer.
 *
 * Every drawing is **black ink on transparency**, tinted at runtime — one asset set serves
 * both colour schemes and both accents, and the audit's contrast rules keep applying because
 * the colour comes from `theme.ts` rather than from the file.
 *
 * The art is delivered by hand (see `store/art-prompts.md`), so **a missing file must never
 * break a screen**. `ART` is the single place that knows what exists; anything absent simply
 * renders nothing and the screen keeps its text-only layout.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, type ImageSourcePropType, View } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Static requires are mandatory — the bundler resolves these at build time, so a variable
 * path cannot work. Add a line here when a drawing is delivered; leave it out until then.
 *
 * ponytail: commented rather than deleted, so adding art is uncommenting one line.
 */
const ART: Partial<Record<ArtName, ImageSourcePropType[]>> = {
  mark: [require('../assets/art/mark.png')],
  onboardHears: [require('../assets/art/onboard-hears.png')],
  onboardDevice: [require('../assets/art/onboard-device.png')],
  onboardAsked: [require('../assets/art/onboard-asked.png')],
  onboardDelete: [require('../assets/art/onboard-delete.png')],
  liveEmpty: [require('../assets/art/live-empty.png')],
  historyEmpty: [require('../assets/art/history-empty.png')],
  peopleEmpty: [require('../assets/art/people-empty.png')],

  // Delivered as single frames. The three boil frames per drawing (-f2, -f3)
  // are not drawn yet, and `Art` treats one frame as a still, so listing a
  // file that does not exist is the only way to break this — the bundler
  // resolves requires at build time and a missing one fails the build, not the
  // screen. Add the frames to the array when they arrive; nothing else changes.
  // searchEmpty: [require('../assets/art/search-empty.png')],
  // flourish: [require('../assets/art/flourish.png')],
};

export type ArtName =
  | 'mark'
  | 'onboardHears' | 'onboardDevice' | 'onboardAsked' | 'onboardDelete'
  | 'liveEmpty' | 'historyEmpty' | 'peopleEmpty' | 'searchEmpty'
  | 'flourish';

export function hasArt(name: ArtName): boolean {
  return (ART[name]?.length ?? 0) > 0;
}

const BOIL_MS = 200;   // 5 fps — the hand-animation cadence, not a smooth one

type Props = {
  name: ArtName;
  /** Rendered height in dp; width follows the asset's aspect. */
  size: number;
  /** Defaults to the muted ink colour; pass an accent for emphasis. */
  tint?: string;
  /** Decorative by default — a screen reader should skip it. */
  label?: string;
};

/**
 * A drawing. If it has multiple frames it *boils*: the same picture redrawn by hand, cycled
 * slowly so the ink shimmers. Held on frame one whenever the OS asks for reduced motion —
 * reduce-motion means subtler, not broken, so the drawing still appears.
 */
export function Art({ name, size, tint, label }: Props) {
  const c = useTheme();
  const frames = ART[name];
  const [i, setI] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setStill);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setStill);
    return () => sub.remove();
  }, []);

  const boils = !!frames && frames.length > 1 && !still;
  useEffect(() => {
    if (!boils) { setI(0); return; }
    const t = setInterval(() => setI((n) => (n + 1) % (frames?.length ?? 1)), BOIL_MS);
    return () => clearInterval(t);
  }, [boils, frames]);

  if (!frames?.length) return null;          // not delivered yet — the screen copes

  return (
    <Image
      source={frames[Math.min(i, frames.length - 1)]!}
      style={{ height: size, width: size, resizeMode: 'contain' }}
      tintColor={tint ?? c.muted}
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    />
  );
}

/** Art above a block of text, with the spacing already right. Renders only the children
 *  when the drawing is missing. */
export function Illustrated({
  name, size = 140, tint, gap = 16, children,
}: Props & { gap?: number; children?: React.ReactNode }) {
  if (!hasArt(name)) return <>{children}</>;
  return (
    <View style={{ alignItems: 'center', gap }}>
      <Art name={name} size={size} tint={tint} />
      {children}
    </View>
  );
}
