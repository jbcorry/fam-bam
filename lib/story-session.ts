import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';

import { getDb } from './firebase';

export type StorySessionState = {
  players: Player[];
  storyWords: string[];
  activePlayerIndex: number;
};

export type Player = {
  id: string;
  name: string;
};

type StorySessionDoc = StorySessionState & {
  updatedAt?: unknown;
};

const collectionName = 'sessions';

const emptySession: StorySessionState = { players: [], storyWords: [], activePlayerIndex: 0 };

function getSessionRef(sessionId: string) {
  const db = getDb();
  return doc(db, collectionName, sessionId);
}

function normalizePlayers(players: Player[], activeIndex: number): { players: Player[]; activeIndex: number } {
  const cleaned = players
    .filter((player) => Boolean(player.id) && Boolean(player.name?.trim()))
    .map((player) => ({ ...player, name: player.name.trim() }));

  const clampedIndex = cleaned.length ? Math.min(activeIndex, cleaned.length - 1) : 0;
  return { players: cleaned, activeIndex: clampedIndex };
}

export async function ensureSessionExists(sessionId: string, seed?: Partial<StorySessionState>) {
  const ref = getSessionRef(sessionId);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    return;
  }

  const defaults: StorySessionState = {
    ...emptySession,
    ...seed,
  };

  await setDoc(ref, { ...defaults, updatedAt: serverTimestamp() });
}

export function subscribeToSession(
  sessionId: string,
  onChange: (state: StorySessionState) => void,
  onError?: (error: FirestoreError) => void
): Unsubscribe {
  const ref = getSessionRef(sessionId);
  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      const data = snapshot.data() as StorySessionDoc;
      const { players, activeIndex } = normalizePlayers(data.players ?? [], data.activePlayerIndex ?? 0);
      onChange({
        players,
        storyWords: data.storyWords ?? [],
        activePlayerIndex: activeIndex,
      });
    },
    (error) => onError?.(error)
  );
}

export async function addPlayerToSession(sessionId: string, player: Player) {
  const ref = getSessionRef(sessionId);

  await runTransaction(getDb(), async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = (snapshot.data() as StorySessionDoc | undefined) ?? emptySession;
    const nextPlayers = [...(data.players ?? [])];
    const existingIndex = nextPlayers.findIndex((p) => p.id === player.id);
    if (existingIndex >= 0) {
      nextPlayers[existingIndex] = player;
    } else {
      nextPlayers.push(player);
    }

    const { players, activeIndex } = normalizePlayers(nextPlayers, data.activePlayerIndex ?? 0);

    transaction.set(
      ref,
      {
        ...data,
        players,
        activePlayerIndex: activeIndex,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function addWordToSession(sessionId: string, word: string) {
  const ref = getSessionRef(sessionId);

  await runTransaction(getDb(), async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = (snapshot.data() as StorySessionDoc | undefined) ?? emptySession;
    const { players, activeIndex } = normalizePlayers(data.players ?? [], data.activePlayerIndex ?? 0);
    const nextWords = [...(data.storyWords ?? []), word.trim()];
    const nextActiveIndex = players.length
      ? (activeIndex + 1) % players.length
      : 0;

    transaction.set(
      ref,
      {
        ...data,
        storyWords: nextWords,
        players,
        activePlayerIndex: nextActiveIndex,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function resetSessionStory(sessionId: string) {
  const ref = getSessionRef(sessionId);

  await setDoc(
    ref,
    {
      storyWords: [],
      activePlayerIndex: 0,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
