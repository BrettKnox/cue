/**
 * Keeping the widget honest about what Cue heard last.
 *
 * Called from inside the app wherever a conversation appears, is renamed, or disappears.
 * `task.tsx` covers what the app is not running for: being added, resized, or refreshed by
 * the system.
 *
 * Every call is best-effort. A widget that fails to redraw must never break a recording or
 * take down the screen that triggered it — hence the lazy import and the swallowed error.
 */
import { Platform } from 'react-native';

import * as db from '@/db';
import { relative } from '@/textUtils';

export type WidgetData = { id: number; title: string; when: string } | null;

/** The newest conversation, shaped for the widget's single line. */
export async function latest(): Promise<WidgetData> {
  const rows = await db.conversations();
  const c = rows[0];
  if (!c) return null;
  return { id: c.id, title: c.title || 'Untitled conversation', when: relative(c.started_at) };
}

export async function refreshWidget(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const { requestWidgetUpdate } = await import('react-native-android-widget');
    const { CueWidget, WIDGET_NAME } = await import('@/widget/CueWidget');
    const last = await latest();
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => <CueWidget last={last} />,
      widgetNotFound: () => {},   // nobody has added it; nothing to do
    });
  } catch {
    // best effort by design
  }
}
