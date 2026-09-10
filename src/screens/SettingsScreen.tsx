/** Everything the user gets to decide, including the two that are privacy decisions. */
import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as db from '@/db';
import { Art } from '@/art';
import * as settings from '@/settings';
import { refreshWidget } from '@/widget/refresh';
import { ON_DEVICE_PACKAGE } from '@/transcribe';
import { Button, Chip, H1, Note, Toggle, row } from '@/ui';
import { ACCENT_NAMES, useAccent } from '@/theme';
import type { TextSize } from '@/settingsShape';
import { space, type, useTheme } from '@/theme';

const PRIVACY_URL = 'https://brettknox.github.io/cue/privacy.html';
const SIZES: TextSize[] = ['normal', 'large', 'huge'];

export default function SettingsScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const s = settings.useSettings();
  const [accent, setAccent] = useAccent();
  const [locales, setLocales] = useState<string[]>([]);

  useEffect(() => {
    // Offer only languages actually installed offline — anything else silently means cloud.
    ExpoSpeechRecognitionModule.getSupportedLocales({ androidRecognitionServicePackage: ON_DEVICE_PACKAGE })
      .then((r) => setLocales(r.installedLocales.slice(0, 12)))
      .catch(() => setLocales([]));
  }, []);

  const wipe = () => {
    Alert.alert(
      'Delete everything?',
      'Every conversation, transcript and person is removed from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            await db.wipe();
            void refreshWidget();      // the widget must not still show a deleted conversation
            Alert.alert('Deleted', 'Everything Cue had recorded is gone.');
          },
        },
      ],
    );
  };

  const st = styles(c);
  return (
    <ScrollView
      style={st.screen}
      contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xl, gap: space.lg }}
    >
      <H1>Settings</H1>

      <View>
        <Text style={st.head}>Privacy</Text>
        <Toggle
          label="Keep audio on this device"
          description="Uses the offline recogniser only. Recording will refuse to start rather than send audio to a server."
          value={s.onDeviceOnly}
          onChange={(v) => void settings.set('onDeviceOnly', v)}
        />
        <Toggle
          label="Allow summaries"
          description="Sends the transcript TEXT to Cue's summary service when you stop a recording, and when you ask a question about a saved one. Audio is never sent."
          value={s.summaries}
          onChange={(v) => void settings.set('summaries', v)}
        />
        <Note>
          Nothing is uploaded in the background. With summaries off, Cue never makes a network
          request at all.
        </Note>
      </View>

      <View>
        <Text style={st.head}>Reading</Text>
        <Text style={st.label}>Transcript text size</Text>
        <View style={row.wrap}>
          {SIZES.map((size) => (
            <Chip
              key={size}
              label={size}
              selected={s.textSize === size}
              onPress={() => void settings.set('textSize', size)}
            />
          ))}
        </View>
        <Text style={[st.label, { marginTop: space.md }]}>Colour</Text>
        <View style={row.wrap}>
          {ACCENT_NAMES.map((a) => (
            <Chip key={a} label={a} selected={accent === a} onPress={() => setAccent(a)} />
          ))}
        </View>
      </View>

      <View>
        <Text style={st.head}>Recognition</Text>
        <Text style={st.label}>Language</Text>
        {locales.length === 0 ? (
          <Note>
            No offline language packs found. Android installs them from Settings, under
            Voice input.
          </Note>
        ) : (
          <View style={row.wrap}>
            {locales.map((l) => (
              <Chip key={l} label={l} selected={s.lang === l} onPress={() => void settings.set('lang', l)} />
            ))}
          </View>
        )}
      </View>

      <View>
        <Text style={st.head}>Feedback</Text>
        <Toggle
          label="Vibrate on start and stop"
          description="On-screen feedback stays either way."
          value={s.vibrate}
          onChange={(v) => void settings.set('vibrate', v)}
        />
      </View>

      <View style={{ gap: space.sm }}>
        <Text style={st.head}>Your data</Text>
        <Button label="Delete everything" onPress={wipe} tone="quiet" hint="Removes every conversation from this device" />
        <Button label="Privacy policy" onPress={() => void Linking.openURL(PRIVACY_URL)} tone="quiet" />
        <View style={{ alignItems: 'center', marginTop: space.md }}>
          <Art name="flourish" size={120} />
          <Text style={st.version}>{`Cue ${Constants.expoConfig?.version ?? ''}`}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: space.md },
  head: { fontSize: type.caption, fontWeight: '700', color: c.muted, marginBottom: space.sm },
  label: { fontSize: type.body, fontWeight: '600', color: c.text, marginBottom: space.sm },
  version: { fontSize: type.caption, color: c.muted, marginTop: space.sm },
});
