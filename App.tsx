import Ionicons from '@expo/vector-icons/Ionicons';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HistoryScreen from '@/screens/HistoryScreen';
import LiveScreen from '@/screens/LiveScreen';
import { hydrateAccent, type as scale, useTheme } from '@/theme';

const Tabs = createBottomTabNavigator();

export default function App() {
  const scheme = useColorScheme();
  const c = useTheme();
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => { void hydrateAccent(); }, []);   // restore the saved accent once

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={{
          ...navTheme,
          colors: { ...navTheme.colors, background: c.bg, card: c.bg, border: c.border, text: c.text, primary: c.accent },
        }}
      >
        <StatusBar style="auto" />
        <Tabs.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: c.accent,
            tabBarInactiveTintColor: c.muted,   // grey-dark, not grey-light: stays over 4.5:1
            tabBarLabelStyle: { fontSize: scale.caption },
            tabBarIcon: ({ color, size }) => (
              <Ionicons
                name={route.name === 'Live' ? 'mic' : 'time-outline'}
                size={size}
                color={color}
              />
            ),
          })}
        >
          <Tabs.Screen name="Live" component={LiveScreen} />
          <Tabs.Screen name="History" component={HistoryScreen} />
        </Tabs.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
