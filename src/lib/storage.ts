import type { BackupFile, Flashcard, LearningMeta } from "../types";
import { validateCardContent, withLearningDefaults } from "./cards";
import { withMetaDefaults } from "./meta";

const DB_NAME = "wortschatz-a2";
const DB_VERSION = 1;
const CARD_STORE = "cards";
const META_STORE = "meta";
const META_KEY = "learning";
const CURRENT_CONTENT_VERSION = 9;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CARD_STORE)) {
        const cards = db.createObjectStore(CARD_STORE, { keyPath: "id" });
        cards.createIndex("dueAt", "dueAt");
        cards.createIndex("category", "category");
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadCards(): Promise<Flashcard[]> {
  const db = await openDatabase();
  const transaction = db.transaction(CARD_STORE, "readonly");
  const result = await requestToPromise(transaction.objectStore(CARD_STORE).getAll());
  await transactionDone(transaction);
  db.close();
  return (result as Flashcard[]).map(withLearningDefaults);
}

export async function saveCards(cards: Flashcard[]): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(CARD_STORE, "readwrite");
  const store = transaction.objectStore(CARD_STORE);
  store.clear();
  cards.forEach((card) => store.put(card));
  await transactionDone(transaction);
  db.close();
}

export async function loadMeta(): Promise<LearningMeta> {
  const db = await openDatabase();
  const transaction = db.transaction(META_STORE, "readonly");
  const result = await requestToPromise(transaction.objectStore(META_STORE).get(META_KEY));
  await transactionDone(transaction);
  db.close();
  return withMetaDefaults(result as LearningMeta | undefined);
}

export async function saveMeta(meta: LearningMeta): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(META_STORE, "readwrite");
  transaction.objectStore(META_STORE).put(meta, META_KEY);
  await transactionDone(transaction);
  db.close();
}

export async function clearDatabase(): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction([CARD_STORE, META_STORE], "readwrite");
  transaction.objectStore(CARD_STORE).clear();
  transaction.objectStore(META_STORE).clear();
  await transactionDone(transaction);
  db.close();
}

export function createBackup(cards: Flashcard[], meta: LearningMeta): BackupFile {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    cards,
    meta,
  };
}

function isFlashcard(value: unknown): value is Flashcard {
  if (!validateCardContent(value)) return false;
  const card = value as unknown as Record<string, unknown>;
  return (
    typeof card.source === "string" &&
    typeof card.createdAt === "string" &&
    typeof card.repetitions === "number" &&
    typeof card.intervalDays === "number" &&
    typeof card.ease === "number" &&
    typeof card.dueAt === "string" &&
    typeof card.learned === "boolean" &&
    typeof card.lapses === "number"
  );
}

export function parseBackup(value: unknown): BackupFile {
  if (!value || typeof value !== "object") {
    throw new Error("Nieprawidłowy plik kopii zapasowej.");
  }
  const backup = value as Partial<BackupFile>;
  if (
    backup.version !== 1 ||
    !Array.isArray(backup.cards) ||
    !backup.cards.every(isFlashcard) ||
    !backup.meta ||
    typeof backup.meta !== "object"
  ) {
    throw new Error("Plik nie jest prawidłową kopią Wortschatz A2.");
  }
  return {
    ...backup,
    cards: backup.cards.map((card) => withLearningDefaults(card)),
    meta: { ...withMetaDefaults(backup.meta), activeSession: null },
  } as BackupFile;
}

export async function loadOrSeed(seed: Flashcard[]): Promise<{
  cards: Flashcard[];
  meta: LearningMeta;
}> {
  const [storedCards, meta] = await Promise.all([loadCards(), loadMeta()]);
  const normalizedStoredCards = storedCards.map(withLearningDefaults);
  const nextMeta = { ...withMetaDefaults(meta), contentVersion: CURRENT_CONTENT_VERSION };
  if (normalizedStoredCards.length === 0) {
    await Promise.all([saveCards(seed), saveMeta(nextMeta)]);
    return { cards: seed, meta: nextMeta };
  }
  if (meta.contentVersion < CURRENT_CONTENT_VERSION) {
    const storedIds = new Set(normalizedStoredCards.map((card) => card.id));
    const seedById = new Map(seed.map((card) => [card.id, card]));
    const updatedStoredCards = normalizedStoredCards.map((card) => {
      const replacement = seedById.get(card.id);
      if (!replacement || card.source !== "anki") return card;
      return {
        ...replacement,
        source: card.source,
        createdAt: card.createdAt,
        repetitions: card.repetitions,
        intervalDays: card.intervalDays,
        ease: card.ease,
        dueAt: card.dueAt,
        learned: card.learned,
        lapses: card.lapses,
        stage: card.stage,
        correctStreak: card.correctStreak,
        successfulModes: card.successfulModes,
        firstActiveRecallAt: card.firstActiveRecallAt,
        lastActiveRecallAt: card.lastActiveRecallAt,
        lastReviewedAt: card.lastReviewedAt,
        typedAttempts: card.typedAttempts,
        typedSuccesses: card.typedSuccesses,
        leitnerBox: card.leitnerBox,
        reviewHistory: card.reviewHistory,
        lastSchedulingReason: card.lastSchedulingReason,
        successfulReviewDays: card.successfulReviewDays,
      };
    });
    const merged = [...updatedStoredCards, ...seed.filter((card) => !storedIds.has(card.id))];
    await Promise.all([saveCards(merged), saveMeta(nextMeta)]);
    return { cards: merged, meta: nextMeta };
  }
  return { cards: normalizedStoredCards, meta: nextMeta };
}
