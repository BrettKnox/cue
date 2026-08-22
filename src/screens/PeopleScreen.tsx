/** Everyone Cue has heard you talk to, and what you know about them. */
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as db from '@/db';
import { Button, H1, Note, cardStyle } from '@/ui';
import { TAP, space, type, useTheme } from '@/theme';

const ago = (ms: number) => {
  if (!ms) return 'not in a conversation yet';
  const days = Math.floor((Date.now() - ms) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

export default function PeopleScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<{ navigate: (s: string, p: object) => void }>();
  const [rows, setRows] = useState<db.PersonSummary[] | null>(null);
  const [name, setName] = useState('');

  const load = useCallback(() => { void db.people().then(setRows); }, []);
  useFocusEffect(load);

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    await db.personByName(n);
    setName('');
    load();
  };

  const s = styles(c);
  return (
    <View style={[s.screen, { paddingTop: insets.top + space.md }]}>
      <H1>People</H1>

      <View style={s.addRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={add}
          placeholder="Add someone"
          placeholderTextColor={c.muted}
          style={[s.input, { flex: 1 }]}
          accessibilityLabel="Add a person"
        />
        <Button label="Add" onPress={add} tone="quiet" />
      </View>

      <FlatList
        data={rows ?? []}
        keyExtractor={(r) => String(r.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: insets.bottom + space.lg, gap: space.sm, paddingTop: space.md,
        }}
        ListEmptyComponent={
          <Note>
            {rows === null
              ? 'Loading…'
              : 'Nobody yet. Cue adds people it hears named in a conversation, and you can add them here.'}
          </Note>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => nav.navigate('Person', { id: item.id })}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.conversations} conversations, last ${ago(item.last_seen)}`}
            style={({ pressed }) => [cardStyle(c), pressed && { opacity: 0.75 }]}
          >
            <Text style={s.name}>{item.name}</Text>
            <Text style={s.meta}>
              {`${item.conversations} conversation${item.conversations === 1 ? '' : 's'} · ${ago(item.last_seen)}`}
            </Text>
            {!!item.notes && <Text style={s.notes} numberOfLines={2}>{item.notes}</Text>}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = (c: ReturnType<typeof useTheme>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: space.md },
  addRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  input: {
    minHeight: TAP, borderRadius: 10, borderWidth: 1, borderColor: c.border,
    backgroundColor: c.surface, color: c.text, fontSize: type.body, paddingHorizontal: space.md,
  },
  name: { fontSize: type.bodyLarge, fontWeight: '700', color: c.text },
  meta: { fontSize: type.caption, color: c.muted },
  notes: { fontSize: type.body, lineHeight: type.body * 1.5, color: c.text },
});
