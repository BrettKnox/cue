/**
 * The home-screen widget: one tap to record, plus what Cue heard last.
 *
 * This renders through react-native-android-widget's own primitives, not React Native views —
 * it becomes an Android RemoteViews tree, so only FlexWidget/TextWidget/SvgWidget exist here
 * and only a small subset of styling works. Colours are duplicated from theme.ts as literals
 * on purpose: a widget is drawn by the launcher, outside the app's React tree, where hooks
 * and `useColorScheme` are unavailable.
 */
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';

// Mirrors theme.ts dark palette. Widgets sit on unknown wallpaper, so the surface is opaque.
const BG = '#10141A';
const SURFACE = '#1A2029';
const BORDER = '#2C3540';
const TEXT = '#ECF0F4';
const MUTED = '#A3AEBA';
const ACCENT = '#7FB2FF';
const ON_ACCENT = '#0A1020';

/** The waveform mark, inline because a widget cannot resolve the app's asset registry. */
const MARK = `<svg viewBox="0 0 120 48" xmlns="http://www.w3.org/2000/svg">
  <g fill="${ACCENT}">
    <rect x="6"   y="17" width="9" height="14" rx="4.5"/>
    <rect x="27"  y="9"  width="9" height="30" rx="4.5"/>
    <rect x="48"  y="3"  width="9" height="42" rx="4.5"/>
    <rect x="69"  y="9"  width="9" height="30" rx="4.5"/>
    <rect x="90"  y="17" width="9" height="14" rx="4.5"/>
  </g>
</svg>`;

export type CueWidgetProps = {
  /** The most recent conversation, if there is one. */
  last?: { id: number; title: string; when: string } | null;
  /** 2x1 hides the recent line; 4x1 shows it. */
  compact?: boolean;
};

export function CueWidget({ last, compact = false }: CueWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: BG,
        borderRadius: 20,
        padding: 12,
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget
        style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}
      >
        <SvgWidget svg={MARK} style={{ height: 18, width: 45 }} />
        <TextWidget
          text="Cue"
          style={{ fontSize: 13, fontWeight: 'bold', color: MUTED, marginLeft: 8 }}
        />
      </FlexWidget>

      {/* The whole point of the widget: one tap and it is already listening. */}
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'cue://listen' }}
        style={{
          height: 48,                    // the same 48dp floor the app holds itself to
          width: 'match_parent',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: ACCENT,
          borderRadius: 24,
          marginTop: 6,
        }}
      >
        <TextWidget
          text="Listen"
          style={{ fontSize: 16, fontWeight: 'bold', color: ON_ACCENT }}
        />
      </FlexWidget>

      {!compact && (
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: last ? `cue://conversation/${last.id}` : 'cue://search' }}
          style={{
            width: 'match_parent',
            flexDirection: 'column',
            backgroundColor: SURFACE,
            borderRadius: 12,
            padding: 10,
            marginTop: 8,
          }}
        >
          <TextWidget
            text={last ? last.when : 'Nothing recorded yet'}
            style={{ fontSize: 11, color: MUTED }}
          />
          <TextWidget
            text={last ? last.title : 'Tap Listen to start'}
            maxLines={1}
            style={{ fontSize: 14, fontWeight: 'bold', color: TEXT, marginTop: 2 }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

export const WIDGET_NAME = 'Cue';
export { BORDER };
