/**
 * Shown once. It exists so nobody is surprised by what a recording app does — the promise
 * has to be made in plain words before the microphone is ever asked for.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Art, type ArtName } from '@/art';
import * as settings from '@/settings';
import { Button } from '@/ui';
import { space, type, useTheme } from '@/theme';

const POINTS: { art: ArtName; title: string; body: string }[] = [
  {
    art: 'onboardHears',
    title: 'It writes down what it hears',
    body: 'Tap Listen and Cue turns the conversation into text as it happens, so you can read along and read it back later.',
  },
  {
    art: 'onboardDevice',
    title: 'The audio never leaves your phone',
    body: 'Cue uses your phone’s own offline speech recogniser. No recording is uploaded, and nothing is stored anywhere but here.',
  },
  {
    art: 'onboardAsked',
    title: 'Summaries send text, and only when you ask',
    body: 'If you want a recap or an answer, the transcript text is sent to Cue’s summary service for that one request. You can turn summaries off completely in Settings.',
  },
  {
    art: 'onboardDelete',
    title: 'You can delete any of it',
    body: 'Any conversation, or everything at once, from Settings.',
  },
];

export default function OnboardingScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const s = styles(c);

  return (
    <View style={[s.screen, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.md }]}>
      <ScrollView contentContainerStyle={{ gap: space.lg, paddingBottom: space.lg }}>
        <View>
          <Text style={s.h1} accessibilityRole="header">Cue</Text>
          <Text style={s.sub}>Live transcription and recall for conversations.</Text>
        </View>

        {POINTS.map((p) => (
          <View key={p.title} style={s.point}>
            <Art name={p.art} size={96} />
            <Text style={s.pointTitle}>{p.title}</Text>
            <Text style={s.pointBody}>{p.body}</Text>
          </View>
        ))}
      </ScrollView>

      <Button
        label="Get started"
        onPress={() => void settings.set('onboarded', true)}
        hint="Opens Cue. The microphone is only requested when you first tap Listen."
      />
    </View>
  );
}

const styles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: space.md },
  h1: { fontSize: type.display, fontWeight: '700', color: c.text },
  sub: { fontSize: type.bodyLarge, lineHeight: type.bodyLarge * 1.45, color: c.muted, marginTop: space.xs },
  point: { gap: space.xs },
  pointTitle: { fontSize: type.bodyLarge, fontWeight: '700', color: c.text },
  pointBody: { fontSize: type.body, lineHeight: type.body * 1.5, color: c.muted },
});
