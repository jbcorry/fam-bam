import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const initialPlayers = ['Avery', 'Jordan', 'Noor'];

export default function HomeScreen() {
  const [players, setPlayers] = useState<string[]>(initialPlayers);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [storyWords, setStoryWords] = useState<string[]>([]);
  const [wordInput, setWordInput] = useState('');
  const [newPlayerInput, setNewPlayerInput] = useState('');

  const hasPlayers = players.length > 0;
  const activePlayer = hasPlayers ? players[activePlayerIndex] : 'Waiting for players';
  const canSubmitWord = hasPlayers && Boolean(wordInput.trim());
  const canAddPlayer = Boolean(newPlayerInput.trim());

  const storyText = useMemo(
    () => (storyWords.length ? `${storyWords.join(' ')}.` : 'No story yet. Add the first word!'),
    [storyWords]
  );

  const handleAddWord = () => {
    if (!canSubmitWord) return;

    setStoryWords((prev) => [...prev, wordInput.trim()]);
    setWordInput('');
    setActivePlayerIndex((prev) => (players.length ? (prev + 1) % players.length : 0));
  };

  const handleAddPlayer = () => {
    if (!canAddPlayer) return;
    setPlayers((prev) => [...prev, newPlayerInput.trim()]);
    setNewPlayerInput('');
  };

  const handleResetStory = () => {
    setStoryWords([]);
    setActivePlayerIndex(0);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Pass-the-Word Story</Text>
        <Text style={styles.subtitle}>
          Keep the creativity flowing by letting only one friend add a word at a time.
        </Text>

        <Card title="Story so far">
          <Text style={styles.story}>{storyText}</Text>
          <Text style={styles.hint}>Hint: short, unexpected words keep the tale ridiculous.</Text>
          <ActionButton label="Reset story" onPress={handleResetStory} disabled={!storyWords.length} />
        </Card>

        <Card title="Current turn">
          <Text style={styles.activePlayer}>{activePlayer}</Text>
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
          <ActionButton label="Add word" onPress={handleAddWord} disabled={!canSubmitWord} />
        </Card>

        <Card title="Players">
          <View style={styles.badgeRow}>
            {players.map((player, index) => (
              <View
                key={`${player}-${index}`}
                style={[styles.badge, index === activePlayerIndex && styles.badgeActive]}>
                <Text style={styles.badgeText}>{player}</Text>
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
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
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
