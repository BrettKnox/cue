/**
 * The handful of pieces every screen repeats. Shared so a fix lands once — the audit that
 * produced this project's numbers found 72 of 89 undersized targets came from one style.
 */
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { splitMatch } from '@/textUtils';
import { TAP, space, type, useTheme } from '@/theme';

type Palette = ReturnType<typeof useTheme>;

/** Screen heading. Always a real header for screen readers. */
export function H1({ children }: { children: ReactNode }) {
  const c = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{ fontSize: type.title, fontWeight: '700', color: c.text, marginBottom: space.sm }}
    >
      {children}
    </Text>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const c = useTheme();
  return <View style={cardStyle(c)}>{children}</View>;
}

export const cardStyle = (c: Palette) => ({
  padding: space.md,
  borderRadius: 12,
  backgroundColor: c.surface,
  borderWidth: 1,
  borderColor: c.border,
  gap: space.xs,
});

/** Empty / loading / error copy. Says what goes here, not just "nothing". */
export function Note({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'danger' }) {
  const c = useTheme();
  return (
    <Text style={{
      fontSize: type.body,
      lineHeight: type.body * 1.5,
      color: tone === 'danger' ? c.danger : c.muted,
      paddingVertical: space.sm,
    }}>
      {children}
    </Text>
  );
}

/** Full-width primary action. Never below the 48dp floor. */
export function Button({
  label, onPress, tone = 'accent', disabled, hint,
}: {
  label: string;
  onPress: () => void;
  tone?: 'accent' | 'live' | 'quiet';
  disabled?: boolean;
  hint?: string;
}) {
  const c = useTheme();
  const bg = tone === 'live' ? c.live : tone === 'quiet' ? c.surface : c.accent;
  const fg = tone === 'quiet' ? c.text : c.onAccent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [{
        minHeight: TAP,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: space.md,
        backgroundColor: bg,
        borderWidth: tone === 'quiet' ? 1 : 0,
        borderColor: c.border,
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,   // press feedback is not the haptic
      }]}
    >
      <Text style={{ fontSize: type.bodyLarge, fontWeight: '700', color: fg }}>{label}</Text>
    </Pressable>
  );
}

/** A tappable pill. Selection is announced, and never carried by colour alone. */
export function Chip({
  label, onPress, selected, accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  accessibilityLabel?: string;
}) {
  const c = useTheme();
  const body = (
    <Text style={{
      fontSize: type.body,
      fontWeight: selected ? '700' : '400',
      color: selected ? c.onAccent : c.text,
    }}>
      {selected ? `✓ ${label}` : label}
    </Text>
  );
  const style = {
    minHeight: TAP,
    justifyContent: 'center' as const,
    paddingHorizontal: space.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: selected ? c.accent : c.border,
    backgroundColor: selected ? c.accent : c.surface,
  };
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [style, pressed && { opacity: 0.75 }]}
    >
      {body}
    </Pressable>
  );
}

/** A settings row that toggles. Switch-like, but the state is also in the text. */
export function Toggle({
  label, description, value, onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value }}
      style={({ pressed }) => [{
        minHeight: TAP,
        paddingVertical: space.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        opacity: pressed ? 0.75 : 1,
      }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: type.body, color: c.text, fontWeight: '600' }}>{label}</Text>
        {!!description && (
          <Text style={{ fontSize: type.caption, color: c.muted, lineHeight: type.caption * 1.5 }}>
            {description}
          </Text>
        )}
      </View>
      <Text style={{
        fontSize: type.caption,
        fontWeight: '700',
        color: value ? c.accent : c.muted,
      }}>
        {value ? 'ON' : 'OFF'}
      </Text>
    </Pressable>
  );
}

export const row = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
});

/** Text with the search term picked out, so a hit is findable at a glance. */
export function Highlight({
  text, term, style, numberOfLines,
}: {
  text: string;
  term: string;
  style?: object;
  numberOfLines?: number;
}) {
  const c = useTheme();
  const parts = splitMatch(text, term);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((p, i) =>
        p.hit
          ? <Text key={i} style={{ color: c.accent, fontWeight: '700' }}>{p.text}</Text>
          : <Text key={i}>{p.text}</Text>)}
    </Text>
  );
}

/**
 * Initials in a circle. The hue comes from the name, so a person keeps the same colour
 * everywhere, and every swatch carries the same dark ink chosen to clear 4.5:1 against all
 * of them — the audit checks each one, so a new swatch has to earn its place.
 */
const AVATARS = ['#8FD3B6', '#9BC4F5', '#E7B7A1', '#C9B6E8', '#F2C879', '#A9D6E5'] as const;
const AVATAR_INK = '#12161C';

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const first = [...(words[0] ?? '')][0] ?? '?';
  const last = words.length > 1 ? [...(words[words.length - 1] ?? '')][0] ?? '' : '';
  return (first + last).toUpperCase();
}

export function swatch(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATARS[h % AVATARS.length]!;
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: swatch(name),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: AVATAR_INK }}>
        {initials(name)}
      </Text>
    </View>
  );
}

export { AVATARS, AVATAR_INK };
