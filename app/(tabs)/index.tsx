import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';

import {
  addPlayerToSession,
  addWordToSession,
  ensureSessionExists,
  Player,
  resetSessionStory,
  subscribeToSession,
  type StorySessionState,
} from '@/lib/story-session';
import { getFirebaseAuth } from '@/lib/firebase';

WebBrowser.maybeCompleteAuthSession();
const sessionId = 'shared-story';

export default function HomeScreen() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [storyWords, setStoryWords] = useState<string[]>([]);
  const [wordInput, setWordInput] = useState('');
  const [newPlayerInput, setNewPlayerInput] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const auth = getFirebaseAuth();
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
    });

    return () => unsubscribeAuth();
  }, [auth]);

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = googleResponse.params.id_token;
      if (!idToken) {
        setError('Google sign-in failed: missing token.');
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      const action = user ? linkWithCredential(user, credential) : signInWithCredential(auth, credential);
      action.catch((firebaseError) => {
        setError(firebaseError instanceof Error ? firebaseError.message : 'Google sign-in failed.');
      });
    }
  }, [googleResponse, auth, user]);

  useEffect(() => {
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
  }, []);

  const handleRegister = async () => {
    setError(null);
    const name = displayName.trim();
    if (!name) {
      setError('Display name is required to sign up.');
      return;
    }
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(result.user, { displayName: name });
    } catch (firebaseError) {
      setError(firebaseError instanceof Error ? firebaseError.message : 'Could not sign up.');
    }
  };

  const handleLogin = async () => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (firebaseError) {
      setError(firebaseError instanceof Error ? firebaseError.message : 'Could not sign in.');
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      await signOut(auth);
    } catch (firebaseError) {
      setError(firebaseError instanceof Error ? firebaseError.message : 'Could not sign out.');
    }
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
        <Text style={styles.title}>Pass-the-Word Story</Text>
        <Text style={styles.subtitle}>
          Keep the creativity flowing by letting only one friend add a word at a time.
        </Text>

        <Card title="Authentication">
          {user ? (
            <>
              <Text>Signed in as {user.displayName || user.email}</Text>
              <ButtonRow>
                <ActionButton label="Link Google" onPress={() => promptGoogle()} disabled={!googleRequest} />
                <ActionButton label="Sign out" onPress={handleLogout} />
              </ButtonRow>
            </>
          ) : (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                style={styles.input}
              />
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display name"
                style={styles.input}
              />
              <ButtonRow>
                <ActionButton
                  label="Sign up"
                  onPress={handleRegister}
                  disabled={!email || !password || !displayName.trim()}
                />
                <ActionButton label="Sign in" onPress={handleLogin} disabled={!email || !password} />
              </ButtonRow>
              <ActionButton
                label="Sign in with Google"
                onPress={() => promptGoogle()}
                disabled={!googleRequest}
              />
            </>
          )}
        </Card>

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
  children: ReactNode;
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

function ButtonRow({ children }: { children: ReactNode }) {
  return <View style={styles.buttonRow}>{children}</View>;
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
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
  subtitle: {
    textAlign: 'center',
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
    textAlign: 'center',
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
    fontSize: 32,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
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
