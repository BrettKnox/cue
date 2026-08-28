import Ionicons from '@expo/vector-icons/Ionicons';
import {
  DarkTheme, DefaultTheme, NavigationContainer,
  type LinkingOptions, type NavigatorScreenParams,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Linking, View, useColorScheme } from 'react-native';
import * as QuickActions from 'expo-quick-actions';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import ConversationScreen from '@/screens/ConversationScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import LiveScreen from '@/screens/LiveScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';
import PeopleScreen from '@/screens/PeopleScreen';
import PersonScreen from '@/screens/PersonScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import { demoRequested, seedDemo } from '@/demo';
import { noteUrl } from '@/intent';
import * as settings from '@/settings';
import { hydrateAccent, type as scale, useTheme } from '@/theme';

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ICONS: Record<string, string> = {
  Live: 'mic',
  History: 'time-outline',
  People: 'people-outline',
  Settings: 'settings-outline',
};

/** History and People both push detail screens, so each tab owns a stack. */
function stack(name: string, Root: React.ComponentType, c: ReturnType<typeof useTheme>) {
  return function TabStack() {
    return (
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.text,
          headerTitleStyle: { color: c.text },
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name={name} component={Root} options={{ headerShown: false }} />
        <Stack.Screen name="Conversation" component={ConversationScreen} options={{ title: '' }} />
        <Stack.Screen name="Person" component={PersonScreen} options={{ title: '' }} />
      </Stack.Navigator>
    );
  };
}

/**
 * 48dp is the touch FLOOR, not a comfortable bar, and the padding below comes out of the
 * touch target — a 58dp bar with 12dp of padding leaves a 46dp tab, which the audit
 * rightly fails. Base must be at least 48 + the padding.
 */
const TAB_PAD = 6;
const TAB_BAR_BASE = 48 + TAB_PAD * 2 + 8;   // 68: the floor, its padding, and room to breathe

/** Both detail screens are reachable from either tab's stack. */
type DetailStack = {
  Conversation: { id: number };
  Person: { id: number };
};
type RootTabs = {
  Live: undefined;
  History: NavigatorScreenParams<DetailStack & { HistoryHome: undefined }>;
  People: NavigatorScreenParams<DetailStack & { PeopleHome: undefined }>;
  Settings: undefined;
};

/**
 * Navigation for deep links. The side effect a URL cannot express — "and start recording" —
 * is carried separately by the intent store, consumed once by the screen that owns it.
 */
const linking: LinkingOptions<RootTabs> = {
  prefixes: ['cue://'],
  config: {
    screens: {
      Live: 'listen',
      History: {
        screens: { HistoryHome: 'search', Conversation: 'conversation/:id', Person: 'person/:id' },
      },
      People: { screens: { PeopleHome: 'people' } },
      Settings: 'settings',
    },
  },
};

function Shell() {
  const scheme = useColorScheme();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
        <NavigationContainer
          linking={linking}
          theme={{
            ...navTheme,
            colors: {
              ...navTheme.colors,
              background: c.bg, card: c.bg, border: c.border, text: c.text, primary: c.accent,
            },
          }}
        >
          <Tabs.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: c.accent,
              tabBarInactiveTintColor: c.muted,   // grey-dark, not grey-light: stays over 4.5:1
              tabBarStyle: {
                backgroundColor: c.bg,
                borderTopColor: c.border,
                height: TAB_BAR_BASE + insets.bottom,
                paddingTop: TAB_PAD,
                paddingBottom: insets.bottom + TAB_PAD,
              },
              tabBarLabelStyle: { fontSize: scale.caption, marginTop: 2 },
              tabBarIcon: ({ color, size }) => (
                <Ionicons name={(ICONS[route.name] ?? 'ellipse-outline') as never} size={size} color={color} />
              ),
            })}
          >
            <Tabs.Screen name="Live" component={LiveScreen} />
            <Tabs.Screen name="History" component={stack('HistoryHome', HistoryScreen, c)} />
            <Tabs.Screen name="People" component={stack('PeopleHome', PeopleScreen, c)} />
            <Tabs.Screen name="Settings" component={SettingsScreen} />
          </Tabs.Navigator>
        </NavigationContainer>
  );
}

export default function App() {
  const c = useTheme();
  const hydrated = settings.useHydrated();
  const s = settings.useSettings();

  useEffect(() => {
    // Capture build only (dev + ?demo=1 on web); a no-op everywhere else.
    void seedDemo().then(() => {
      if (demoRequested()) void settings.set('onboarded', true);
    });
    void hydrateAccent();
    void settings.hydrate();
    // Cold start (widget / deep link) and every warm tap while running.
    void Linking.getInitialURL().then(noteUrl);
    const urlSub = Linking.addEventListener('url', (e) => noteUrl(e.url));

    // Long-press the launcher icon. Both routes funnel into the same intent store, so
    // "start recording" has exactly one implementation.
    void QuickActions.setItems([
      { id: 'listen', title: 'Start listening', icon: 'listen_icon',
        params: { href: 'cue://listen' } },
      { id: 'search', title: 'Search', icon: 'search', params: { href: 'cue://search' } },
    ]).catch(() => {});                       // unsupported launchers must not crash startup
    noteUrl(QuickActions.initial?.params?.href as string | undefined);
    const actionSub = QuickActions.addListener((a) => noteUrl(a.params?.href as string | undefined));

    return () => { urlSub.remove(); actionSub.remove(); };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {/* Wait for storage before deciding, or onboarding flashes at returning users. */}
      {!hydrated
        ? <View style={{ flex: 1, backgroundColor: c.bg }} />
        : !s.onboarded
          ? <OnboardingScreen />
          : <Shell />}
    </SafeAreaProvider>
  );
}
