import { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
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

import { getFirebaseAuth } from '@/lib/firebase';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const auth = getFirebaseAuth();
  const router = useRouter();
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (user) {
      router.replace('/stories');
    }
  }, [user, router]);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Authentication</Text>
        <Text style={styles.subtitle}>
          Sign in to save your player profile and join shared stories across devices.
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}

        {user ? (
          <>
            <Text style={styles.status}>Signed in as {user.displayName || user.email}</Text>
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

function ButtonRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.buttonRow}>{children}</View>;
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
  error: {
    color: '#b00020',
    textAlign: 'center',
  },
  status: {
    textAlign: 'center',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d7d7d7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fdfdfd',
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
});
