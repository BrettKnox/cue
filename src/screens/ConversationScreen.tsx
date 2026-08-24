/**
 * One conversation, after the fact: what it was about, who was there, what you agreed to,
 * the full transcript, and a box to ask it a question.
 */
import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as db from '@/db';
import * as llm from '@/llm';
import { useSettings } from '@/settings';
import { refreshWidget } from '@/widget/refresh';
import { TEXT_SCALE } from '@/settingsShape';
import * as Clipboard from 'expo-clipboard';

import { Avatar, Button, Note, row } from '@/ui';
import { TAP, space, type, useTheme } from '@/theme';

const when = (ms: number) =>
  new Date(ms).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

export default function ConversationScreen() {
  const c = useTheme();
  const settings = useSettings();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<{ goBack: () => void }>();
  const { id } = (useRoute().params ?? {}) as { id: number };

  const [conv, setConv] = useState<db.Conversation | null>(null);
  const [lines, setLines] = useState<db.Utterance[]>([]);
  const [people, setPeople] = useState<db.Person[]>([]);
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const load = useCallback(() => {
    void db.conversation(id).then((r) => { setConv(r); setTitle(r?.title ?? ''); });
    void db.utterances(id).then(setLines);
    void db.peopleFor(id).then(setPeople);
  }, [id]);
  useFocusEffect(load);

  const transcript = lines.map((l) => l.text).join(' ');
  const scale = TEXT_SCALE[settings.textSize];

  const saveTitle = async () => {
    if (!conv || title === conv.title) return;
    await db.setSummary(id, conv.summary ?? '', title.trim());
    void refreshWidget();
    load();
  };

  const addPerson = async () => {
    const name = newName.trim();
    if (!name) return;
    const pid = await db.personByName(name);
    if (pid != null) await db.linkPerson(id, pid);
    setNewName('');
    load();
  };

  const onAsk = async () => {
    setErr(null);
    setAnswer(null);
    if (!settings.summaries) {
      setErr('Summaries are turned off in Settings, so nothing can be sent.');
      return;
    }
    setAsking(true);
    try {
      setAnswer(await llm.ask(transcript, question));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setAsking(false);
    }
  };

  /** Everything worth pasting elsewhere, in one press. */
  const asText = () => [conv?.title, conv?.summary, '', transcript].filter(Boolean).join('\n\n');

  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await Clipboard.setStringAsync(asText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);   // reverts the label, no toast needed
  };

  const onShare = () => {
    void Share.share({
      title: conv?.title || 'Conversation',
      message: asText(),
    });
  };

  const onDelete = () => {
    Alert.alert('Delete this conversation?', 'The transcript and summary are removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await db.removeConversation(id);
          void refreshWidget();
          nav.goBack();
        },
      },
    ]);
  };

  const s = styles(c);
  if (!conv) return <View style={s.screen}><Note>Loading…</Note></View>;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + space.xl, gap: space.md }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.when}>{when(conv.started_at)}</Text>

      <TextInput
        value={title}
        onChangeText={setTitle}
        onBlur={saveTitle}
        placeholder="Untitled conversation"
        placeholderTextColor={c.muted}
        style={s.title}
        accessibilityLabel="Conversation title, editable"
      />

      {!!conv.summary && (
        <View style={s.summaryCard}>
          <Text style={s.head}>Summary</Text>
          <Text style={[s.body, { fontSize: type.body * scale }]}>{conv.summary}</Text>
        </View>
      )}

      <View>
        <Text style={s.head}>Who was this with</Text>
        <View style={row.wrap}>
          {people.map((p) => (
            <Pressable
              key={p.id}
              onPress={async () => { await db.unlinkPerson(id, p.id); load(); }}
              accessibilityRole="button"
              accessibilityLabel={`${p.name}. Tap to remove from this conversation.`}
              style={({ pressed }) => [s.personChip, pressed && { opacity: 0.75 }]}
            >
              <Avatar name={p.name} size={26} />
              <Text style={s.personName}>{p.name}</Text>
            </Pressable>
          ))}
          {people.length === 0 && <Note>Nobody linked yet.</Note>}
        </View>
        <View style={s.addRow}>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={addPerson}
            placeholder="Add someone"
            placeholderTextColor={c.muted}
            style={[s.input, { flex: 1 }]}
            accessibilityLabel="Add a person to this conversation"
          />
          <Button label="Add" onPress={addPerson} tone="quiet" />
        </View>
      </View>

      <View>
        <Text style={s.head}>Ask about this conversation</Text>
        <View style={s.addRow}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            onSubmitEditing={onAsk}
            placeholder="What did they say about the deposit?"
            placeholderTextColor={c.muted}
            style={[s.input, { flex: 1 }]}
            accessibilityLabel="Ask a question about this conversation"
          />
          <Button label="Ask" onPress={onAsk} tone="quiet" disabled={asking || !question.trim()} />
        </View>
        {asking && (
          <View style={s.busy}>
            <ActivityIndicator color={c.accent} />
            <Note>Reading the transcript…</Note>
          </View>
        )}
        {!!answer && (
          <View style={s.answerCard}>
            <Text style={[s.body, { fontSize: type.body * scale }]}>{answer}</Text>
            <Text style={s.caveat}>Answered from this transcript only.</Text>
          </View>
        )}
        {!!err && <Note tone="danger">{err}</Note>}
      </View>

      <View>
        <Text style={s.head}>Transcript</Text>
        {lines.length === 0
          ? <Note>Nothing was recorded in this conversation.</Note>
          : lines.map((l) => (
              <Text
                key={l.id}
                style={[s.body, { fontSize: type.bodyLarge * scale, marginBottom: space.sm }]}
              >
                {l.text}
              </Text>
            ))}
      </View>

      <View style={s.actions}>
        <Button label="Share" onPress={onShare} tone="quiet" />
        <Button label={copied ? 'Copied' : 'Copy'} onPress={onCopy} tone="quiet" />
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete this conversation"
          style={({ pressed }) => [s.delete, pressed && { opacity: 0.75 }]}
        >
          <Text style={s.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: space.md, paddingTop: space.md },
  when: { fontSize: type.caption, color: c.muted },
  summaryCard: {
    padding: space.md, borderRadius: 12, backgroundColor: c.surface,
    borderWidth: 1, borderColor: c.border,
    borderLeftWidth: 3, borderLeftColor: c.accent,   // the thing worth reading first
    gap: space.xs,
  },
  answerCard: {
    padding: space.md, borderRadius: 12, backgroundColor: c.surface,
    borderWidth: 1, borderColor: c.border, gap: space.xs, marginTop: space.sm,
  },
  personChip: {
    minHeight: TAP, flexDirection: 'row', alignItems: 'center', gap: space.sm,
    paddingLeft: space.xs, paddingRight: space.md,
    borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
  },
  personName: { fontSize: type.body, color: c.text },
  title: {
    fontSize: type.title, fontWeight: '700', color: c.text, minHeight: TAP,
    borderBottomWidth: 1, borderColor: c.border,
  },
  head: { fontSize: type.caption, fontWeight: '700', color: c.muted, marginBottom: space.xs },
  body: { lineHeight: type.body * 1.5, color: c.text },
  caveat: { fontSize: type.caption, color: c.muted, marginTop: space.xs },
  input: {
    minHeight: TAP, borderRadius: 10, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surface, color: c.text, fontSize: type.body, paddingHorizontal: space.md,
  },
  addRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center', marginTop: space.sm },
  busy: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: TAP },
  actions: { flexDirection: 'row', gap: space.md, alignItems: 'center', marginTop: space.md },
  delete: { minHeight: TAP, justifyContent: 'center', paddingHorizontal: space.md },
  deleteText: { fontSize: type.body, fontWeight: '600', color: c.danger },
});
