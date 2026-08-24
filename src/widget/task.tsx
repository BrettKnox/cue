/**
 * The headless handler the launcher calls when the app is not running — widget added,
 * resized, or refreshed on the system's schedule.
 *
 * It tries to read the newest conversation from SQLite. That may not be available in a
 * headless JS context, so a failure is not an error here: the widget simply renders its
 * static form (which still has a working Listen button), and the in-app `refreshWidget()`
 * fills in real data the next time Cue runs. The button working is what matters; the recent
 * line is a bonus.
 */
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { CueWidget } from '@/widget/CueWidget';
import { type WidgetData, latest } from '@/widget/refresh';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, renderWidget, widgetInfo } = props;
  if (widgetAction === 'WIDGET_DELETED') return;

  let last: WidgetData = null;
  try {
    last = await latest();
  } catch {
    // no database in this context — render without the recent line
  }

  // Narrow widgets have no room for the recent conversation.
  const compact = (widgetInfo?.width ?? 0) > 0 && (widgetInfo?.width ?? 0) < 180;
  renderWidget(<CueWidget last={last} compact={compact} />);
}
