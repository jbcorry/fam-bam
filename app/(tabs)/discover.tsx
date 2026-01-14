import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { onAuthStateChanged, type User } from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase';
import { addPlayerToSession, ensureSessionExists, findSession, type StorySessionState } from '@/lib/story-session';

type FoundSession = StorySessionState & { id: string };

export default function DiscoverScreen() {
  const auth = getFirebaseAuth();
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<FoundSession | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, [auth]);

  const handleSearch = async () => {
    const trimmed = sessionId.trim();
    if (!trimmed) return;
    setSearching(true);
    setError(null);
    try {
      const found = await findSession(trimmed);
      if (found) {
        setSession(found);
      } else {
        setSession(null);
        setError('No story found with that ID.');
      }
    } catch (firebaseError) {
      setError(firebaseError instanceof Error ? firebaseError.message : 'Could not load story.');
    } finally {
      setSearching(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !session) return;
    setJoining(true);
    setError(null);
    const name = user.displayName || user.email || 'Player';
    try {
      await ensureSessionExists(session.id);
      await addPlayerToSession(session.id, { id: user.uid, name });
      setError('Request sent! You are now added to this story.');
    } catch (firebaseError) {
      setError(firebaseError instanceof Error ? firebaseError.message : 'Could not join story.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Discover stories</Text>
        <Text style={styles.subtitle}>Search by story ID and join to participate.</Text>
        {!user && <Text style={styles.warning}>Sign in on the Auth tab to join stories.</Text>}
        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          value={sessionId}
          onChangeText={setSessionId}
          placeholder="Enter story ID (e.g. shared-story)"
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleSearch}
        />
        <ActionButton label={searching ? 'Searching…' : 'Search'} onPress={handleSearch} disabled={!sessionId} />

        {session && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Story: {session.id}</Text>
            <Text style={styles.cardHint}>Players: {session.players.length}</Text>
            <Text style={styles.cardHint}>Words: {session.storyWords.length}</Text>
            <ActionButton
              label={joining ? 'Joining…' : 'Join story'}
              onPress={handleJoin}
              disabled={!user || joining}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

function ActionButton({ label, onPress, disabled }: ActionButtonProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={disabled ? undefined : onPress}
      style={[styles.button, disabled && styles.buttonDisabled]}
      activeOpacity={0.8}
      disabled={disabled}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  container: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#555',
    marginBottom: 4,
  },
  warning: {
    textAlign: 'center',
    color: '#b00020',
  },
  error: {
    color: '#b00020',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d7d7d7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fdfdfd',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
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
