import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

registerRootComponent(App);

// The launcher calls this when the app is not running (widget added, resized, system
// refresh). Android only: it registers a headless task, which does not exist on other
// platforms — calling it on web throws `registerHeadlessTask is not a function`.
if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widget/task');
  registerWidgetTaskHandler(widgetTaskHandler);
}
