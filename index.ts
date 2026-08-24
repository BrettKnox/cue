import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { widgetTaskHandler } from './src/widget/task';

import App from './App';

registerRootComponent(App);

// The launcher calls this when the app is not running (added, resized, system refresh).
registerWidgetTaskHandler(widgetTaskHandler);
