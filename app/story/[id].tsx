import { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useLocalSearchParams } from 'expo-router';

import {
  addPlayerToSession,
  addWordToSession,
  ensureSessionExists,
  resetSessionStory,
  subscribeToSession,
  type Player,
  type StorySessionState,
} from '@/lib/story-session';
import { getFirebaseAuth } from '@/lib/firebase';

export default function StoryDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const sessionIdParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const sessionId = sessionIdParam ?? '';

  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [storyWords, setStoryWords] = useState<string[]>([]);
  const [wordInput, setWordInput] = useState('');
  const [newPlayerInput, setNewPlayerInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const auth = getFirebaseAuth();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (!sessionId) {
      setError('No story id provided.');
      return;
    }

    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    const bootstrap = async () => {
      try {
        await ensureSessionExists(sessionId, { players: [], storyWords: [], activePlayerIndex: 0 });

        if (!isMounted) return;

        unsubscribe = subscribeToSession(
          sessionId,
          (session: StorySessionState) => {
            setPlayers(session.players);
            setStoryWords(session.storyWords);
            setActivePlayerIndex(session.activePlayerIndex);
          },
          (firebaseError) => {
            setError(firebaseError.message);
          }
        );
      } catch (firebaseError) {
        if (firebaseError instanceof Error) {
          setError(firebaseError.message);
        } else {
          setError('Could not connect to Firebase. Check your config.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [sessionId]);

  const hasPlayers = players.length > 0;
  const activePlayer = hasPlayers ? players[activePlayerIndex] : null;
  const isActivePlayer = user && activePlayer && activePlayer.id === user.uid;
  const sanitizedWord = wordInput.trim();
  const isSingleWord = Boolean(sanitizedWord) && !/\s/.test(sanitizedWord);
  const wordValidationMessage =
    wordInput.length && !isSingleWord ? 'Please enter only one word (no spaces).' : null;
  const canSubmitWord = hasPlayers && isSingleWord && Boolean(isActivePlayer);
  const canAddPlayer = Boolean(user);

  const storyText = useMemo(
    () => (storyWords.length ? `${storyWords.join(' ')}.` : 'No story yet. Add the first word!'),
    [storyWords]
  );

  const handleAddWord = () => {
    if (!canSubmitWord) return;

    const nextWord = sanitizedWord;
    setWordInput('');
    addWordToSession(sessionId, nextWord).catch((firebaseError) =>
      setError(firebaseError instanceof Error ? firebaseError.message : 'Could not add word.')
    );
  };

  const handleAddPlayer = () => {
    if (!user || !canAddPlayer) return;
    const name = newPlayerInput.trim() || user.displayName || user.email || 'Player';
    setNewPlayerInput('');

    addPlayerToSession(sessionId, { id: user.uid, name }).catch((firebaseError) =>
      setError(firebaseError instanceof Error ? firebaseError.message : 'Could not add player.')
    );
  };

  const handleResetStory = () => {
    resetSessionStory(sessionId).catch((firebaseError) =>
      setError(firebaseError instanceof Error ? firebaseError.message : 'Could not reset story.')
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centered]}>
          <Text style={styles.title}>Loading story...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.title}>Story: {sessionId}</Text>
        <Text style={styles.subtitle}>Contribute words and manage players for this story.</Text>

        <Card title="Story so far">
          <Text style={styles.story}>{storyText}</Text>
          <Text style={styles.hint}>Hint: short, unexpected words keep the tale ridiculous.</Text>
          <ActionButton label="Reset story" onPress={handleResetStory} disabled={!storyWords.length} />
        </Card>

        <Card title="Current turn">
          <Text style={styles.activePlayer}>{activePlayer?.name ?? 'Waiting for players'}</Text>
          {!isActivePlayer && (
            <Text style={styles.hint}>
              Only the active player can add a word. Sign in as {activePlayer?.name ?? 'a player'} to continue.
            </Text>
          )}
          <TextInput
            value={wordInput}
            onChangeText={setWordInput}
            placeholder="Type a single word"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleAddWord}
            editable={hasPlayers}
          />
          {wordValidationMessage && <Text style={styles.validationError}>{wordValidationMessage}</Text>}
          <ActionButton label="Add word" onPress={handleAddWord} disabled={!canSubmitWord} />
        </Card>

        <Card title="Players">
          <View style={styles.badgeRow}>
            {players.map((player, index) => (
              <View
                key={`${player.id}-${index}`}
                style={[styles.badge, index === activePlayerIndex && styles.badgeActive]}>
                <Text style={styles.badgeText}>{player.name}</Text>
              </View>
            ))}
            {!players.length && <Text>No players yet. Add a name below.</Text>}
          </View>
          <TextInput
            value={newPlayerInput}
            onChangeText={setNewPlayerInput}
            placeholder="Add new player"
            style={styles.input}
            onSubmitEditing={handleAddPlayer}
          />
          <ActionButton label="Add player" onPress={handleAddPlayer} disabled={!canAddPlayer} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

type CardProps = {
  title: string;
  children: React.ReactNode;
};

function Card({ title, children }: CardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
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
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
  subtitle: {
    color: '#555',
    marginBottom: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  error: {
    color: '#b00020',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  story: {
    lineHeight: 20,
  },
  hint: {
    fontSize: 12,
    color: '#777',
  },
  activePlayer: {
    fontSize: 26,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d7d7d7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fdfdfd',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d7d7d7',
  },
  badgeActive: {
    backgroundColor: '#e6f9ff',
    borderColor: '#00a8c7',
  },
  badgeText: {
    fontWeight: '600',
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
  validationError: {
    color: '#b00020',
    fontSize: 12,
  },
});
