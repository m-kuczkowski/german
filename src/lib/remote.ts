import { toFlashcard } from "./cards";
import { defaultMeta } from "./meta";
import type { CardContent, Flashcard, LearningMeta } from "../types";

const DEVICE_KEY = "wortschatz-device";

interface DeviceIdentity {
  id: string;
  token: string;
}

interface RemoteState {
  device?: DeviceIdentity;
  cards: CardContent[];
  progress: Array<Partial<Flashcard> & Pick<Flashcard, "id">>;
  meta: Partial<LearningMeta>;
}

function deviceIdentity(): DeviceIdentity | null {
  try {
    const value = localStorage.getItem(DEVICE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as DeviceIdentity;
    return typeof parsed.id === "string" && typeof parsed.token === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function headers(identity: DeviceIdentity | null, contentType = false): HeadersInit {
  return {
    ...(contentType ? { "content-type": "application/json" } : {}),
    ...(identity ? {
      "x-learning-device-id": identity.id,
      "x-learning-device-token": identity.token,
    } : {}),
  };
}

export function hydrateRemoteState(
  localCards: Flashcard[],
  localMeta: LearningMeta,
  remote: RemoteState,
): { cards: Flashcard[]; meta: LearningMeta } {
  const localById = new Map(localCards.map((card) => [card.id, card]));
  const progressById = new Map(remote.progress.map((card) => [card.id, card]));
  const catalogCards = remote.cards.map((content) => {
    const local = localById.get(content.id) ?? toFlashcard(content, "anki");
    return { ...local, ...content, ...progressById.get(content.id) } as Flashcard;
  });
  const personalCards = localCards.filter((card) => card.source !== "anki");
  return {
    cards: [...catalogCards, ...personalCards],
    meta: { ...defaultMeta, ...localMeta, ...remote.meta },
  };
}

export async function loadRemoteState(): Promise<RemoteState | null> {
  const identity = deviceIdentity();
  const response = await fetch("/api/learning", { headers: headers(identity) });
  if (response.status === 404 || response.status === 503) return null;
  if (!response.ok) throw new Error("Nie udało się pobrać postępów z bazy.");
  const remote = await response.json() as RemoteState;
  if (remote.device) localStorage.setItem(DEVICE_KEY, JSON.stringify(remote.device));
  return remote;
}

export async function saveRemoteState(cards: Flashcard[], meta: LearningMeta): Promise<void> {
  const identity = deviceIdentity();
  if (!identity) return;
  const progress = cards
    .filter((card) => card.source === "anki")
    .filter((card) => card.repetitions > 0 || card.lapses > 0 || card.learned)
    .map(({ id, repetitions, intervalDays, ease, dueAt, learned, lapses }) => ({
      id,
      repetitions,
      intervalDays,
      ease,
      dueAt,
      learned,
      lapses,
    }));
  const response = await fetch("/api/learning", {
    method: "PUT",
    headers: headers(identity, true),
    body: JSON.stringify({ progress, meta }),
  });
  if (!response.ok) throw new Error("Nie udało się zapisać postępów w bazie.");
}
