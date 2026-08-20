/** Past conversations: what it was about, and a way to delete it. */
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as db from '@/db';
import { TAP, space, type, useTheme } from '@/theme';

const when = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function HistoryScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<db.Conversation[] | null>(null);

  const load = useCallback(() => { void db.conversations().then(setRows); }, []);
  useFocusEffect(load);   // re-read on every visit; a recording may have just ended

  const confirmDelete = (row: db.Conversation) => {
    Alert.alert('Delete this conversation?', 'The transcript and summary are removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => { await db.removeConversation(row.id); load(); },
      },
    ]);
  };

  const s = styles(c);
  return (
    <View style={[s.screen, { paddingTop: insets.top + space.md }]}>
      <Text style={s.h1} accessibilityRole="header">History</Text>
      <FlatList
        data={rows ?? []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.lg, gap: space.sm }}
        ListEmptyComponent={
          <Text style={s.empty}>
            {rows === null ? 'Loading…' : 'Nothing recorded yet. Conversations you transcribe show up here.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.when}>{when(item.started_at)}</Text>
            <Text style={s.title}>{item.title || 'Untitled conversation'}</Text>
            {!!item.summary && <Text style={s.body}>{item.summary}</Text>}
            <Pressable
              onPress={() => confirmDelete(item)}
              style={({ pressed }) => [s.delete, pressed && { opacity: 0.75 }]}
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title || 'untitled conversation'}`}
            >
              <Text style={s.deleteText}>Delete</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: space.md },
  h1: { fontSize: type.title, fontWeight: '700', color: c.text, marginBottom: space.sm },
  empty: { fontSize: type.body, lineHeight: type.body * 1.5, color: c.muted, marginTop: space.lg },
  card: {
    padding: space.md, borderRadius: 12, backgroundColor: c.surface,
    borderWidth: 1, borderColor: c.border, gap: space.xs,
  },
  when: { fontSize: type.caption, color: c.muted },
  title: { fontSize: type.bodyLarge, fontWeight: '700', color: c.text },
  body: { fontSize: type.body, lineHeight: type.body * 1.5, color: c.text },
  delete: {
    minHeight: TAP, alignSelf: 'flex-start', justifyContent: 'center',
    paddingHorizontal: space.sm, marginTop: space.xs,
  },
  deleteText: { fontSize: type.body, fontWeight: '600', color: c.danger },
});
