/**
 * The core loop: listen → show the words as they land → store the final ones →
 * on stop, ask for a recap of what was said and what was agreed to.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as db from '@/db';
import * as llm from '@/llm';
import { useTranscription } from '@/transcribe';
import { TAP, space, type, useAccent, useCycleAccent, useTheme } from '@/theme';

export default function LiveScreen() {
  const c = useTheme();
  const [accent] = useAccent();
  const cycleAccent = useCycleAccent();
  const insets = useSafeAreaInsets();
  const [convId, setConvId] = useState<number | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [recap, setRecap] = useState<llm.Recap | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const scroller = useRef<ScrollView>(null);
  const convRef = useRef<number | null>(null);
  convRef.current = convId;

  const onFinal = useCallback((text: string) => {
    setLines((prev) => [...prev, text]);
    const id = convRef.current;
    if (id != null) void db.addUtterance(id, text);
  }, []);

  const { recording, partial, error, start, stop } = useTranscription({ onFinal });

  useEffect(() => {
    if (lines.length || partial) scroller.current?.scrollToEnd({ animated: true });
  }, [lines.length, partial]);

  const begin = async () => {
    setRecap(null);
    setNote(null);
    setLines([]);
    const id = await db.startConversation();
    setConvId(id);
    const ok = await start();
    if (!ok) {
      await db.removeConversation(id);   // permission refused — don't leave an empty row
      setConvId(null);
      return;
    }
    AccessibilityInfo.announceForAccessibility('Listening');
  };

  const end = async () => {
    stop();
    AccessibilityInfo.announceForAccessibility('Stopped listening');
    const id = convRef.current;
    if (id == null) return;
    const text = await db.transcript(id);
    if (!text) {
      await db.removeConversation(id);
      setConvId(null);
      setNote('Nothing was picked up. Check the microphone and try again.');
      return;
    }
    if (!llm.configured()) {
      setNote('Saved. Add an LLM key in app config to get summaries.');
      return;
    }
    setBusy(true);
    try {
      const r = await llm.recap(text);
      await db.setSummary(id, r.summary, r.title);
      setRecap(r);
    } catch (e) {
      setNote(`Saved, but the summary failed. ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const s = styles(c);
  return (
    <View style={[s.screen, { paddingTop: insets.top + space.md }]}>
      <View style={s.header}>
        <Text style={s.h1} accessibilityRole="header">Cue</Text>
        <Pressable
          onPress={cycleAccent}
          style={({ pressed }) => [s.accentBtn, pressed && s.pressed]}
          accessibilityRole="button"
          accessibilityLabel={`Colour: ${accent}. Tap to change.`}
        >
          <View style={s.accentDot} />
        </Pressable>
      </View>

      <ScrollView ref={scroller} style={s.feed} contentContainerStyle={s.feedInner}>
        {lines.length === 0 && !partial && !recap && (
          <Text style={s.empty}>
            Tap Listen and Cue writes down the conversation as it happens. When you stop,
            it tells you what was said and what you agreed to.
          </Text>
        )}
        {lines.map((line, i) => (
          <Text key={i} style={s.line}>{line}</Text>
        ))}
        {!!partial && <Text style={[s.line, s.partial]}>{partial}</Text>}

        {recap && (
          <View style={s.card} accessibilityRole="summary">
            <Text style={s.cardTitle}>{recap.title}</Text>
            <Text style={s.cardBody}>{recap.summary}</Text>
            {recap.commitments.length > 0 && (
              <>
                <Text style={s.cardHead}>You agreed to</Text>
                {recap.commitments.map((cm, i) => (
                  <Text key={i} style={s.cardBody}>{`• ${cm}`}</Text>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {!!error && <Text style={s.error}>{error}</Text>}
      {!!note && <Text style={s.note}>{note}</Text>}

      <View style={[s.bar, { paddingBottom: insets.bottom + space.md }]}>
        {busy ? (
          <View style={s.busy}>
            <ActivityIndicator color={c.accent} />
            <Text style={s.note}>Writing the recap…</Text>
          </View>
        ) : (
          <Pressable
            onPress={recording ? end : begin}
            style={({ pressed }) => [s.button, recording && s.buttonLive, pressed && s.pressed]}
            accessibilityRole="button"
            accessibilityLabel={recording ? 'Stop listening' : 'Start listening'}
            accessibilityHint={recording
              ? 'Ends the conversation and writes a summary'
              : 'Begins transcribing what is said around you'}
            accessibilityState={{ busy }}
          >
            <Text style={[s.buttonText, recording && s.buttonTextLive]}>
              {recording ? 'Stop' : 'Listen'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  h1: { fontSize: type.title, fontWeight: '700', color: c.text, marginBottom: space.sm },
  accentBtn: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  accentDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.accent,
               borderWidth: 1, borderColor: c.border },
  feed: { flex: 1 },
  feedInner: { paddingBottom: space.lg, gap: space.sm },
  empty: { fontSize: type.body, lineHeight: type.body * 1.5, color: c.muted, marginTop: space.lg },
  line: { fontSize: type.bodyLarge, lineHeight: type.bodyLarge * 1.45, color: c.text },
  partial: { color: c.muted, fontStyle: 'italic' },
  card: {
    marginTop: space.md, padding: space.md, borderRadius: 12,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, gap: space.xs,
  },
  cardTitle: { fontSize: type.title, fontWeight: '700', color: c.text },
  cardHead: { fontSize: type.caption, fontWeight: '700', color: c.muted, marginTop: space.sm },
  cardBody: { fontSize: type.body, lineHeight: type.body * 1.5, color: c.text },
  error: { fontSize: type.body, color: c.danger, paddingVertical: space.sm },
  note: { fontSize: type.body, color: c.muted, paddingVertical: space.sm },
  bar: { paddingTop: space.sm },
  busy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, minHeight: TAP + space.md },
  button: {
    minHeight: TAP + space.md, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.accent,
  },
  buttonLive: { backgroundColor: c.live },
  pressed: { opacity: 0.75 },   // press feedback stays even with haptics off
  buttonText: { fontSize: type.bodyLarge, fontWeight: '700', color: c.onAccent },
  buttonTextLive: { color: c.onAccent },
});
