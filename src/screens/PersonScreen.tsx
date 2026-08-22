/** One person: what you want to remember about them, and every conversation they were in. */
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as db from '@/db';
import { Note, cardStyle } from '@/ui';
import { TAP, space, type, useTheme } from '@/theme';

const when = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function PersonScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<{ goBack: () => void; navigate: (s: string, p: object) => void }>();
  const { id } = (useRoute().params ?? {}) as { id: number };

  const [p, setP] = useState<db.Person | null>(null);
  const [notes, setNotes] = useState('');
  const [convs, setConvs] = useState<db.Conversation[]>([]);

  const load = useCallback(() => {
    void db.person(id).then((r) => { setP(r); setNotes(r?.notes ?? ''); });
    void db.conversationsFor(id).then(setConvs);
  }, [id]);
  useFocusEffect(load);

  const save = async () => {
    if (!p || notes === p.notes) return;
    await db.setPersonNotes(id, notes);
    load();
  };

  const remove = () => {
    Alert.alert(
      `Remove ${p?.name ?? 'this person'}?`,
      'Their notes are deleted. The conversations themselves are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => { await db.removePerson(id); nav.goBack(); },
        },
      ],
    );
  };

  const s = styles(c);
  if (!p) return <View style={s.screen}><Note>Loading…</Note></View>;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + space.xl, gap: space.md }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.name} accessibilityRole="header">{p.name}</Text>

      <View>
        <Text style={s.head}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          onBlur={save}
          multiline
          placeholder="Prefers texts over calls. Allergic to shellfish. Kids: Mia and Tom."
          placeholderTextColor={c.muted}
          style={s.notes}
          accessibilityLabel={`Notes about ${p.name}`}
        />
      </View>

      <View>
        <Text style={s.head}>{`Conversations (${convs.length})`}</Text>
        {convs.length === 0
          ? <Note>No conversations linked to them yet.</Note>
          : convs.map((cv) => (
              <Pressable
                key={cv.id}
                onPress={() => nav.navigate('Conversation', { id: cv.id })}
                accessibilityRole="button"
                accessibilityLabel={`${cv.title || 'Untitled conversation'}, ${when(cv.started_at)}`}
                style={({ pressed }) => [cardStyle(c), { marginBottom: space.sm }, pressed && { opacity: 0.75 }]}
              >
                <Text style={s.meta}>{when(cv.started_at)}</Text>
                <Text style={s.title}>{cv.title || 'Untitled conversation'}</Text>
                {!!cv.summary && <Text style={s.body} numberOfLines={2}>{cv.summary}</Text>}
              </Pressable>
            ))}
      </View>

      <Pressable
        onPress={remove}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${p.name}`}
        style={({ pressed }) => [s.remove, pressed && { opacity: 0.75 }]}
      >
        <Text style={s.removeText}>Remove person</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: space.md, paddingTop: space.md },
  name: { fontSize: type.display, fontWeight: '700', color: c.text },
  head: { fontSize: type.caption, fontWeight: '700', color: c.muted, marginBottom: space.xs },
  notes: {
    minHeight: TAP * 2, borderRadius: 10, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surface, color: c.text, fontSize: type.body, lineHeight: type.body * 1.5,
    padding: space.md, textAlignVertical: 'top',
  },
  meta: { fontSize: type.caption, color: c.muted },
  title: { fontSize: type.bodyLarge, fontWeight: '700', color: c.text },
  body: { fontSize: type.body, lineHeight: type.body * 1.5, color: c.text },
  remove: { minHeight: TAP, justifyContent: 'center' },
  removeText: { fontSize: type.body, fontWeight: '600', color: c.danger },
});
