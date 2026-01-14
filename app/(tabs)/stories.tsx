import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'expo-router';

import { getFirebaseAuth } from '@/lib/firebase';
import { getSessionsForUser } from '@/lib/story-session';

type SessionListItem = {
  id: string;
  players: { id: string; name: string }[];
  storyWords: string[];
};

export default function StoriesScreen() {
  const auth = getFirebaseAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }
    refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const refreshSessions = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const results = await getSessionsForUser(user.uid);
      setSessions(results);
    } catch (firebaseError) {
      setError(firebaseError instanceof Error ? firebaseError.message : 'Could not load your stories.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: SessionListItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/story/${item.id}`)}
      accessibilityRole="button">
      <Text style={styles.cardTitle}>{item.id}</Text>
      <Text style={styles.cardHint}>Players: {item.players.length}</Text>
      <Text style={styles.cardHint}>Words: {item.storyWords.length}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>My stories</Text>
        {!user && <Text style={styles.subtitle}>Sign in on the Auth tab to see your stories.</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
        {user && (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={refreshSessions}
              disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Refreshing…' : 'Refresh list'}</Text>
            </TouchableOpacity>
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={
                <Text style={styles.subtitle}>No stories yet. Join one from the Discover tab.</Text>
              }
              contentContainerStyle={{ gap: 8, paddingVertical: 8 }}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#555',
  },
  error: {
    color: '#b00020',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardHint: {
    color: '#555',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#1d3d47',
  },
  buttonDisabled: {
    backgroundColor: '#9fb2b9',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
