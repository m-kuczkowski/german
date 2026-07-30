import { toFlashcard, withLearningDefaults } from "./cards";
import { withMetaDefaults } from "./meta";
import { mergeChallengeStats } from "./challenges";
import type { CardContent, Flashcard, LearningMeta } from "../types";

const DEVICE_KEY = "wortschatz-device";

interface DeviceIdentity {
  id: string;
  token: string;
}

export interface RemoteState {
  device?: DeviceIdentity;
  profile?: { name: string; created?: boolean };
  cards: CardContent[];
  progress: Array<Partial<Flashcard> & Pick<Flashcard, "id">>;
  meta: Partial<LearningMeta>;
}

export function isNewRemoteProfile(remote: RemoteState | null): boolean {
  return remote?.profile?.created === true;
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

function headers(
  identity: DeviceIdentity | null,
  profileName: string,
  contentType = false,
): HeadersInit {
  return {
    ...(contentType ? { "content-type": "application/json" } : {}),
    "x-learning-profile-name": encodeURIComponent(profileName),
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
    const remoteProgress = progressById.get(content.id);
    const localReviewedAt = local.lastReviewedAt
      ? new Date(local.lastReviewedAt).getTime()
      : 0;
    const remoteReviewedAt = remoteProgress?.lastReviewedAt
      ? new Date(remoteProgress.lastReviewedAt).getTime()
      : 0;
    const remoteIsNewer = remoteReviewedAt > localReviewedAt ||
      (
        remoteReviewedAt === 0 &&
        localReviewedAt === 0 &&
        (remoteProgress?.repetitions ?? 0) > local.repetitions
      );
    const newestProgress = remoteIsNewer ? remoteProgress : local;
    const challengeStats = mergeChallengeStats(
      local.challengeStats,
      remoteProgress?.challengeStats ?? {},
    );
    return withLearningDefaults({
      ...local,
      ...content,
      ...newestProgress,
      challengeStats,
    } as Flashcard);
  });
  const personalCards = localCards.filter((card) => card.source !== "anki");
  const remoteMeta = withMetaDefaults(remote.meta);
  const localChallengeTime = new Date(
    localMeta.challengeUpdatedAt ?? localMeta.activeChallenge?.updatedAt ?? 0,
  ).getTime();
  const remoteChallengeTime = new Date(
    remoteMeta.challengeUpdatedAt ?? remoteMeta.activeChallenge?.updatedAt ?? 0,
  ).getTime();
  const newestChallengeMeta = remoteChallengeTime > localChallengeTime
    ? remoteMeta
    : localMeta;
  const meta = withMetaDefaults({
    ...remoteMeta,
    ...localMeta,
    streak: Math.max(localMeta.streak, remoteMeta.streak),
    completedToday: Math.max(localMeta.completedToday, remoteMeta.completedToday),
    totalReviews: Math.max(localMeta.totalReviews, remoteMeta.totalReviews),
    lastStudyDate: [localMeta.lastStudyDate, remoteMeta.lastStudyDate]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null,
    activeSession: localMeta.activeSession ?? remoteMeta.activeSession,
    activeChallenge: newestChallengeMeta.activeChallenge,
    challengeUpdatedAt: newestChallengeMeta.challengeUpdatedAt,
  });
  return {
    cards: [...catalogCards, ...personalCards],
    meta,
  };
}

export async function loadRemoteState(profileName: string): Promise<RemoteState | null> {
  const identity = deviceIdentity();
  const response = await fetch("/api/learning", { headers: headers(identity, profileName) });
  if (response.status === 404 || response.status === 503) return null;
  if (!response.ok) throw new Error("Nie udało się pobrać postępów z bazy.");
  const remote = await response.json() as RemoteState;
  if (remote.device) localStorage.setItem(DEVICE_KEY, JSON.stringify(remote.device));
  return remote;
}

export async function saveRemoteState(
  cards: Flashcard[],
  meta: LearningMeta,
  profileName: string,
): Promise<void> {
  const identity = deviceIdentity();
  const progress = cards
    .filter((card) => card.source === "anki")
    .filter((card) => card.stage !== "new" || card.lapses > 0)
    .map(({
      id,
      repetitions,
      intervalDays,
      ease,
      dueAt,
      learned,
      lapses,
      stage,
      correctStreak,
      successfulModes,
      firstActiveRecallAt,
      lastActiveRecallAt,
      lastReviewedAt,
      typedAttempts,
      typedSuccesses,
      leitnerBox,
      reviewHistory,
      lastSchedulingReason,
      successfulReviewDays,
      learningStats,
      challengeStats,
    }) => ({
      id,
      repetitions,
      intervalDays,
      ease,
      dueAt,
      learned,
      lapses,
      stage,
      correctStreak,
      successfulModes,
      firstActiveRecallAt,
      lastActiveRecallAt,
      lastReviewedAt,
      typedAttempts,
      typedSuccesses,
      leitnerBox,
      reviewHistory,
      lastSchedulingReason,
      successfulReviewDays,
      learningStats,
      challengeStats,
    }));
  const response = await fetch("/api/learning", {
    method: "PUT",
    headers: headers(identity, profileName, true),
    body: JSON.stringify({ progress, meta }),
  });
  if (!response.ok) throw new Error("Nie udało się zapisać postępów w bazie.");
}
