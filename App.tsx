import Ionicons from '@expo/vector-icons/Ionicons';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ConversationScreen from '@/screens/ConversationScreen';
import HistoryScreen from '@/screens/HistoryScreen';
import LiveScreen from '@/screens/LiveScreen';
import OnboardingScreen from '@/screens/OnboardingScreen';
import PeopleScreen from '@/screens/PeopleScreen';
import PersonScreen from '@/screens/PersonScreen';
import SettingsScreen from '@/screens/SettingsScreen';
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

export default function App() {
  const scheme = useColorScheme();
  const c = useTheme();
  const hydrated = settings.useHydrated();
  const s = settings.useSettings();
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    void hydrateAccent();
    void settings.hydrate();
  }, []);

  // Wait for storage before deciding. Rendering onboarding first would flash it at
  // returning users every cold start.
  if (!hydrated) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {!s.onboarded ? (
        <OnboardingScreen />
      ) : (
        <NavigationContainer
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
              tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.border },
              tabBarLabelStyle: { fontSize: scale.caption },
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
      )}
    </SafeAreaProvider>
  );
}
