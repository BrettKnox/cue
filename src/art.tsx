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
  peopleEmpty: [require('../assets/art/people-empty.png')],

  // history-empty is DELIVERED but deliberately off. It arrived with the
  // transparency checkerboard baked into the pixels; keying that out left three
  // faint short strokes that render as a smudge in the corner of a 120dp box,
  // and on the real screen it reads as a rendering fault rather than a drawing.
  // A bad illustration is worse than none, and the text-only fallback is clean.
  // The file is in assets/art/ ready for a redraw; uncomment when it is redrawn.
  // historyEmpty: [require('../assets/art/history-empty.png')],

  // Delivered as single frames. The three boil frames per drawing (-f2, -f3)
  // are not drawn yet, and `Art` treats one frame as a still, so listing a
  // file that does not exist is the only way to break this — the bundler
  // resolves requires at build time and a missing one fails the build, not the
  // screen. Add the frames to the array when they arrive; nothing else changes.
  // searchEmpty: [require('../assets/art/search-empty.png')],
  // flourish: [require('../assets/art/flourish.png')],
};

/**
 * Width divided by height for each drawing. `tools/install_art.py` prints the
 * line to paste and warns when this table and the files disagree.
 *
 * `size` means HEIGHT, with the width following the aspect. The style used to
 * be `{ width: size, height: size }` — a square — so every landscape drawing
 * was letterboxed inside it and the 3:2 onboarding art rendered 96 wide by 64
 * tall, a third of its intended area, adrift in an empty box. Measured on the
 * web build rather than noticed by eye.
 *
 * Read from a table rather than the asset because neither runtime way works on
 * both platforms: `Image.resolveAssetSource` does not exist on
 * react-native-web and threw "resolveAssetSource is not a function", blanking
 * the whole app, and `onLoad`'s `nativeEvent.source` is empty there, which
 * would have made web silently disagree with the phone the app ships on.
 */
const ASPECT: Partial<Record<ArtName, number>> = {
  mark: 1,
  onboardHears: 1.5,
  onboardDevice: 1.5,
  onboardAsked: 1.5,
  onboardDelete: 1.5,
  liveEmpty: 1,
  // historyEmpty: kept for the redraw; the entry in ART is commented out.
  historyEmpty: 1,
  peopleEmpty: 1.5,
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

  const aspect = ASPECT[name] ?? 1;

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

  const src = frames[Math.min(i, frames.length - 1)]!;
  return (
    <Image
      source={src}
      style={{ height: size, width: size * aspect, resizeMode: 'contain' }}
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
