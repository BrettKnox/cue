/**
 * The core loop: listen → show the words as they land → store the final ones →
 * on stop, ask for a recap of what was said, what was agreed to, and who was there.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, ActivityIndicator, ScrollView, StyleSheet, Text, Vibration, View,
} from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as db from '@/db';
import * as llm from '@/llm';
import { takeIntent, usePendingIntent } from '@/intent';
import { titleFrom } from '@/textUtils';
import { refreshWidget } from '@/widget/refresh';
import { useSettings } from '@/settings';
import { TEXT_SCALE } from '@/settingsShape';
import { useTranscription } from '@/transcribe';
import { Art } from '@/art';
import { Button, Card, Note } from '@/ui';
import { TAP, space, type, useTheme } from '@/theme';

const KEEP_AWAKE_TAG = 'cue-recording';

const clock = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
};

export default function LiveScreen() {
  const c = useTheme();
  const settings = useSettings();
  const insets = useSafeAreaInsets();

  const [convId, setConvId] = useState<number | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [recap, setRecap] = useState<llm.Recap | null>(null);
  const [busy, setBusy] = useState<string | null>(null);   // the label, so it never lies
  const [note, setNote] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  const scroller = useRef<ScrollView>(null);
  const convRef = useRef<number | null>(null);
  convRef.current = convId;
  const startedAt = useRef(0);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  const onFinal = useCallback((text: string) => {
    setLines((prev) => [...prev, text]);
    const id = convRef.current;
    if (id != null) void db.addUtterance(id, text);
  }, []);

  const onLevel = useCallback((v: number) => setLevel(v), []);

  const { recording, partial, error, onDevice, start, stop, clearError } = useTranscription({
    lang: settings.lang,
    onDeviceOnly: settings.onDeviceOnly,
    onFinal,
    onLevel: reduceMotion ? undefined : onLevel,
  });

  useEffect(() => {
    if (lines.length || partial) scroller.current?.scrollToEnd({ animated: !reduceMotion });
  }, [lines.length, partial, reduceMotion]);

  // Elapsed timer, and keep the screen on: a sleeping screen ends the recognition session.
  useEffect(() => {
    if (!recording) return;
    startedAt.current = Date.now();
    setElapsed(0);
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    const t = setInterval(() => setElapsed(Date.now() - startedAt.current), 1000);
    return () => {
      clearInterval(t);
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [recording]);

  const buzz = (pattern: number | number[]) => {
    if (settings.vibrate) Vibration.vibrate(pattern);
  };

  const begin = async () => {
    setRecap(null);
    setNote(null);
    setLines([]);
    const id = await db.startConversation();
    setConvId(id);
    const ok = await start();
    if (!ok) {
      await db.removeConversation(id);   // refused or unavailable — don't leave an empty row
      setConvId(null);
      return;
    }
    buzz(40);
    AccessibilityInfo.announceForAccessibility('Listening');
  };

  const runRecap = async (id: number, text: string) => {
    setBusy('Writing the recap…');
    try {
      const r = await llm.recap(text);
      await db.setSummary(id, r.summary, r.title);
      if (r.people.length) await db.attachNames(id, r.people);
      setRecap(r);
      void refreshWidget();
      clearError();   // the recap landed; a mid-session recogniser hiccup is old news
      AccessibilityInfo.announceForAccessibility(`Summary ready. ${r.title}`);
    } catch (e) {
      // No summary, so give it a readable name from its own first words rather than
      // leaving another "Untitled conversation" behind.
      await db.setSummary(id, '', titleFrom(text));
      void refreshWidget();
      setNote(`Saved, but the summary failed. ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const end = async () => {
    buzz([0, 30, 60, 30]);
    AccessibilityInfo.announceForAccessibility('Stopped listening');
    setBusy('Finishing the last sentence…');   // truthful: not summarising yet
    await stop();                        // waits for the last phrase to be finalised and stored
    const id = convRef.current;
    if (id == null) { setBusy(null); return; }

    const text = await db.transcript(id);
    if (!text) {
      await db.removeConversation(id);
      setConvId(null);
      setBusy(null);
      setNote('Nothing was picked up. Check the microphone and try again.');
      return;
    }
    if (!settings.summaries) {
      await db.setSummary(id, '', titleFrom(text));
      void refreshWidget();
      setBusy(null);
      setNote('Saved. Summaries are off, so nothing was sent.');
      return;
    }
    if (!llm.configured()) {
      await db.setSummary(id, '', titleFrom(text));
      void refreshWidget();
      setBusy(null);
      setNote('Saved. No summary service is set up for this build.');
      return;
    }
    await runRecap(id, text);
  };

  const retry = async () => {
    const id = convRef.current;
    if (id == null) return;
    setNote(null);
    await runRecap(id, await db.transcript(id));
  };

  // A launcher shortcut or widget tap asked to record. Consume it once: the tap itself is
  // the consent, but a re-focus or a normal tab tap must never switch the mic on.
  const intent = usePendingIntent();
  useEffect(() => {
    if (intent !== 'listen' || recording || busy) return;
    if (takeIntent('listen')) void begin();
  }, [intent, recording, busy]);   // eslint-disable-line react-hooks/exhaustive-deps

  const scale = TEXT_SCALE[settings.textSize];
  const s = styles(c);
  // -2..10 from the recogniser; anything under 0 is silence.
  const meter = Math.max(0, Math.min(1, level / 8));

  return (
    <View style={[s.screen, { paddingTop: insets.top + space.md }]}>
      <View style={s.header}>
        <Text style={s.h1} accessibilityRole="header">Cue</Text>
        <Text
          style={[s.badge, { color: onDevice === false ? c.danger : c.muted }]}
          accessibilityLabel={onDevice === false
            ? 'Cloud recognition. Audio leaves this device.'
            : 'On-device recognition. Audio stays on this phone.'}
        >
          {onDevice === null ? '' : onDevice ? 'On-device' : 'Cloud'}
        </Text>
      </View>

      {recording && (
        <View style={s.statusRow} accessibilityLabel={`Recording, ${clock(elapsed)}`}>
          <Text style={s.timer}>{clock(elapsed)}</Text>
          <View style={s.meterTrack}>
            <View style={[s.meterFill, { width: `${meter * 100}%` }]} />
          </View>
        </View>
      )}

      <ScrollView ref={scroller} style={s.feed} contentContainerStyle={s.feedInner}>
        {lines.length === 0 && !partial && !recap && (
          <View style={s.emptyWrap}>
            <Art name="liveEmpty" size={140} />
            <Note>
              Tap Listen and Cue writes down the conversation as it happens. When you stop, it
              tells you what was said and what you agreed to.
            </Note>
          </View>
        )}
        {lines.map((line, i) => (
          <Text key={i} style={[s.line, { fontSize: type.bodyLarge * scale }]}>{line}</Text>
        ))}
        {!!partial && (
          <Text style={[s.line, s.partial, { fontSize: type.bodyLarge * scale }]}>{partial}</Text>
        )}

        {recap && (
          <View style={s.recapCard}>
            <Text style={s.cardTitle}>{recap.title}</Text>
            <Text style={[s.cardBody, { fontSize: type.body * scale }]}>{recap.summary}</Text>
            {recap.commitments.length > 0 && (
              <>
                <Text style={s.cardHead}>You agreed to</Text>
                {recap.commitments.map((cm, i) => (
                  <Text key={i} style={[s.cardBody, { fontSize: type.body * scale }]}>{`• ${cm}`}</Text>
                ))}
              </>
            )}
            {recap.people.length > 0 && (
              <Text style={s.cardMeta}>{`With ${recap.people.join(', ')} · saved to History`}</Text>
            )}
          </View>
        )}
      </ScrollView>

      {!!error && <Note tone="danger">{error}</Note>}
      {!!note && <Note>{note}</Note>}

      <View style={[s.bar, { paddingBottom: insets.bottom + space.md }]}>
        {busy ? (
          <View style={s.busy} accessibilityLiveRegion="polite">
            <ActivityIndicator color={c.accent} />
            <Note>{busy}</Note>
          </View>
        ) : (
          <View style={{ gap: space.sm }}>
            {!!note && note.includes('summary failed') && (
              <Button label="Try the summary again" onPress={retry} tone="quiet" />
            )}
            <Button
              label={recording ? 'Stop' : 'Listen'}
              tone={recording ? 'live' : 'accent'}
              onPress={recording ? end : begin}
              hint={recording
                ? 'Ends the conversation and writes a summary'
                : 'Begins transcribing what is said around you'}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: TAP },
  h1: { fontSize: type.title, fontWeight: '700', color: c.text },
  badge: { fontSize: type.caption, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  timer: { fontSize: type.body, fontWeight: '700', color: c.text, fontVariant: ['tabular-nums'] },
  meterTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: c.surface, overflow: 'hidden' },
  meterFill: { height: 6, borderRadius: 3, backgroundColor: c.accent },
  emptyWrap: { alignItems: 'center', gap: space.sm, marginTop: space.lg },
  recapCard: {
    marginTop: space.md, padding: space.md, borderRadius: 12,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    borderLeftWidth: 3, borderLeftColor: c.accent,
    gap: space.xs,
  },
  feed: { flex: 1 },
  feedInner: { paddingBottom: space.lg, gap: space.sm },
  line: { lineHeight: type.bodyLarge * 1.45, color: c.text },
  partial: { color: c.muted, fontStyle: 'italic' },
  cardTitle: { fontSize: type.title, fontWeight: '700', color: c.text },
  cardHead: { fontSize: type.caption, fontWeight: '700', color: c.muted, marginTop: space.sm },
  cardBody: { lineHeight: type.body * 1.5, color: c.text },
  cardMeta: { fontSize: type.caption, color: c.muted, marginTop: space.sm },
  bar: { paddingTop: space.sm },
  busy: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: space.sm, minHeight: TAP + space.md,
  },
});
