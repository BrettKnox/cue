/** Past conversations, and a way to find the thing that was said. */
import { useCallback, useState } from 'react';
import {
  Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
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
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<db.Hit[]>([]);

  const load = useCallback(() => { void db.conversations().then(setRows); }, []);
  useFocusEffect(load);   // re-read on every visit; a recording may have just ended

  const onQuery = (q: string) => {
    setQuery(q);
    // ponytail: query on every keystroke. The table is small and SQLite is local; add
    // debouncing when a transcript archive actually makes typing feel slow.
    void db.search(q).then(setHits);
  };

  const confirmDelete = (row: db.Conversation) => {
    Alert.alert('Delete this conversation?', 'The transcript and summary are removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await db.removeConversation(row.id);
          load();
          if (query) void db.search(query).then(setHits);   // the hits may have referenced it
        },
      },
    ]);
  };

  const searching = query.trim().length > 0;
  const s = styles(c);

  return (
    <View style={[s.screen, { paddingTop: insets.top + space.md }]}>
      <Text style={s.h1} accessibilityRole="header">History</Text>

      <TextInput
        value={query}
        onChangeText={onQuery}
        placeholder="Search what was said"
        placeholderTextColor={c.muted}
        style={s.search}
        clearButtonMode="while-editing"
        autoCorrect={false}
        accessibilityLabel="Search everything you have recorded"
      />

      {searching ? (
        <FlatList
          data={hits}
          keyExtractor={(h) => String(h.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + space.lg, gap: space.sm }}
          ListEmptyComponent={<Text style={s.empty}>{`Nothing recorded matches “${query.trim()}”.`}</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.when}>{`${item.title || 'Untitled'} · ${when(item.at)}`}</Text>
              <Text style={s.body}>{item.text}</Text>
            </View>
          )}
        />
      ) : (
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
      )}
    </View>
  );
}

const styles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: space.md },
  h1: { fontSize: type.title, fontWeight: '700', color: c.text, marginBottom: space.sm },
  search: {
    minHeight: TAP, borderRadius: 10, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surface, color: c.text, fontSize: type.body,
    paddingHorizontal: space.md, marginBottom: space.md,
  },
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
