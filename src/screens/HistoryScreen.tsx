/** Past conversations, and a way to find the thing that was said. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as db from '@/db';
import { takeIntent, usePendingIntent } from '@/intent';
import { H1, Note, cardStyle } from '@/ui';
import { TAP, space, type, useTheme } from '@/theme';

const when = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function HistoryScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<{ navigate: (s: string, p: object) => void }>();
  const [rows, setRows] = useState<db.Conversation[] | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<db.Hit[]>([]);

  const searchRef = useRef<TextInput>(null);
  const intent = usePendingIntent();
  useEffect(() => {
    if (intent === 'search' && takeIntent('search')) searchRef.current?.focus();
  }, [intent]);

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
      <H1>History</H1>

      <TextInput
        ref={searchRef}
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
          ListEmptyComponent={<Note>{`Nothing recorded matches “${query.trim()}”.`}</Note>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => nav.navigate('Conversation', { id: item.conversation_id })}
              accessibilityRole="button"
              accessibilityLabel={`${item.text}. From ${item.title || 'untitled conversation'}. Tap to open.`}
              style={({ pressed }) => [cardStyle(c), pressed && { opacity: 0.75 }]}
            >
              <Text style={s.when}>{`${item.title || 'Untitled'} · ${when(item.at)}`}</Text>
              <Text style={s.body}>{item.text}</Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={rows ?? []}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.lg, gap: space.sm }}
          ListEmptyComponent={
            rows === null
              ? <View style={s.skeletonWrap}>
                  {[0, 1, 2].map((i) => <View key={i} style={s.skeleton} />)}
                </View>
              : <Note>Nothing recorded yet. Conversations you transcribe show up here.</Note>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => nav.navigate('Conversation', { id: item.id })}
              onLongPress={() => confirmDelete(item)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title || 'Untitled conversation'}, ${when(item.started_at)}`}
              accessibilityHint="Opens the transcript. Long press to delete."
              style={({ pressed }) => [cardStyle(c), pressed && { opacity: 0.75 }]}
            >
              <Text style={s.when}>{when(item.started_at)}</Text>
              <Text style={s.title}>{item.title || 'Untitled conversation'}</Text>
              {!!item.summary && <Text style={s.body} numberOfLines={3}>{item.summary}</Text>}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: space.md },
  search: {
    minHeight: TAP, borderRadius: 10, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surface, color: c.text, fontSize: type.body,
    paddingHorizontal: space.md, marginBottom: space.md,
  },
  skeletonWrap: { gap: space.sm },
  skeleton: { height: 92, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  when: { fontSize: type.caption, color: c.muted },
  title: { fontSize: type.bodyLarge, fontWeight: '700', color: c.text },
  body: { fontSize: type.body, lineHeight: type.body * 1.5, color: c.text },
});
