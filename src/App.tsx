import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { starterCards } from "./data/starterCards";
import { isDuplicate, toFlashcard } from "./lib/cards";
import { createExercise, evaluateTypedAnswer, type TypedAnswerResult } from "./lib/exercises";
import {
  buildCategoryProgress,
  categoryTitle,
  difficultCards,
  sessionCardsForCategory,
  suggestedCategory,
  type CategoryProgress,
} from "./lib/learning";
import { defaultMeta, recordReview } from "./lib/meta";
import {
  boxDescription,
  isDue,
  localDateKey,
  nextReviewLabel,
  reviewCard,
} from "./lib/srs";
import {
  advanceSession,
  createLearningSession,
  recordSessionAnswer,
  sessionComplete,
} from "./lib/session";
import { speakGerman } from "./lib/speech";
import {
  clearDatabase,
  createBackup,
  loadOrSeed,
  parseBackup,
  saveCards,
  saveMeta,
} from "./lib/storage";
import { hydrateRemoteState, loadRemoteState, saveRemoteState } from "./lib/remote";
import type {
  CardContent,
  Flashcard,
  LearningMeta,
  LeitnerBox,
  ReviewEvidence,
  ReviewRating,
  SessionAnswer,
  SessionItem,
  TabId,
} from "./types";

const navItems: Array<{ id: TabId; icon: string; label: string }> = [
  { id: "learn", icon: "◇", label: "Nauka" },
  { id: "review", icon: "↻", label: "Powtórki" },
  { id: "leitner", icon: "▥", label: "Przegródki" },
  { id: "collection", icon: "▤", label: "Kolekcja" },
  { id: "settings", icon: "⚙", label: "Ustawienia" },
];

const emptyContent: Omit<CardContent, "id"> = {
  german: "",
  polish: "",
  article: null,
  plural: null,
  exampleGerman: "",
  examplePolish: "",
  category: "Własne",
};

function App() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [meta, setMeta] = useState<LearningMeta>(defaultMeta);
  const [tab, setTab] = useState<TabId>("learn");
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [reviewCategoryId, setReviewCategoryId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const local = await loadOrSeed(starterCards);
        let state = local;
        try {
          const remote = await loadRemoteState();
          if (remote) state = hydrateRemoteState(local.cards, local.meta, remote);
        } catch {
          // The offline cache remains fully usable when a connection is unavailable.
        }
        if (!active) return;
        setCards(state.cards);
        setMeta(state.meta);
      } catch {
        if (!active) return;
        setCards(starterCards);
        setToast("Nie udało się otworzyć pamięci urządzenia. Postępy mogą nie zostać zapisane.");
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void saveCards(cards).catch(() => setToast("Nie udało się zapisać zmian na urządzeniu."));
  }, [cards, ready]);

  useEffect(() => {
    if (!ready) return;
    void saveMeta(meta).catch(() => setToast("Nie udało się zapisać postępu."));
  }, [meta, ready]);

  useEffect(() => {
    if (!ready) return;
    void saveRemoteState(cards, meta).catch(() => {
      // Local persistence is the offline fallback; a later change retries syncing.
    });
  }, [cards, meta, online, ready]);

  useEffect(() => {
    const connect = () => setOnline(true);
    const disconnect = () => setOnline(false);
    window.addEventListener("online", connect);
    window.addEventListener("offline", disconnect);
    return () => {
      window.removeEventListener("online", connect);
      window.removeEventListener("offline", disconnect);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = meta.theme;
  }, [meta.theme]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const now = new Date();
  const dueCards = useMemo(
    () => cards.filter((card) => card.stage !== "new" && isDue(card, now)),
    [cards],
  );
  const categories = useMemo(() => buildCategoryProgress(cards, now), [cards]);
  const suggestedCategoryId = suggestedCategory(categories);
  const activeCategoryId = selectedCategoryId ?? suggestedCategoryId;
  const selectedCategory = categories.find((category) => category.id === activeCategoryId);
  const masteredCount = cards.filter((card) => card.stage === "mastered").length;
  const uncertainCount = cards.filter((card) => card.stage === "uncertain").length;
  const session = meta.activeSession;
  const activeItem = session?.queue[session.index];
  const activeCard = activeItem
    ? cards.find((card) => card.id === activeItem.id)
    : undefined;
  const complete = sessionComplete(session);

  useEffect(() => {
    const selected = categories.find((category) => category.id === selectedCategoryId);
    if (selected && selected.mastered === selected.total) {
      setSelectedCategoryId(null);
    }
  }, [categories, selectedCategoryId]);

  function startSession(mode: "learn" | "review" | "hard", categoryId: string | null) {
    if (mode !== "hard" && !categoryId) return;
    const pool = mode === "hard"
      ? difficultCards(cards)
      : sessionCardsForCategory(cards, categoryId!, mode);
    setMeta((current) => ({
      ...current,
      activeSession: createLearningSession(pool, mode, categoryId),
    }));
    setTab(mode === "learn" ? "learn" : "review");
    if (pool.length === 0) {
      setToast(
        mode === "hard"
          ? "Nie masz jeszcze słów wymagających dodatkowej pracy."
          : mode === "review"
            ? "W tej kategorii nie masz dziś kart do powtórki."
            : "Ta kategoria jest już opanowana.",
      );
    }
  }

  function answerCard(
    rating: ReviewRating,
    evidence: ReviewEvidence,
    answerValue: string | null,
    correctAnswer: string,
  ): Flashcard | null {
    if (!activeCard || !activeItem || !session || session.pendingAnswer) return null;
    const answeredAt = new Date();
    const updatedCard = reviewCard(activeCard, rating, evidence, answeredAt);
    setCards((current) =>
      current.map((card) => (card.id === activeCard.id ? updatedCard : card)),
    );
    setMeta((current) => {
      const recordedSession = current.activeSession
        ? recordSessionAnswer(
            current.activeSession,
            activeCard,
            updatedCard,
            activeItem,
            rating,
            evidence,
            answerValue,
            correctAnswer,
            answeredAt,
          )
        : null;
      return {
        ...recordReview(current),
        activeSession: recordedSession && evidence.mode === "introduction"
          ? advanceSession(recordedSession)
          : recordedSession,
      };
    });
    return updatedCard;
  }

  function advanceAnswer() {
    setMeta((current) => ({
      ...current,
      activeSession: current.activeSession
        ? advanceSession(current.activeSession)
        : null,
    }));
  }

  function finishSession() {
    setMeta((current) => ({ ...current, activeSession: null }));
  }

  if (!ready) {
    return (
      <main className="loading-screen" aria-live="polite">
        <div className="brand-mark" aria-hidden="true">W</div>
        <p>Układam Twoją dzisiejszą naukę…</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      {!online && (
        <div className="offline-banner" role="status">
          Offline · uczysz się lokalnie, synchronizacja wróci z internetem
        </div>
      )}
      <header className="topbar">
        <button className="brand" onClick={() => setTab("learn")} aria-label="Przejdź do nauki">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span><strong>Wortschatz</strong><small>NIEMIECKI · A2–B1</small></span>
        </button>
        <div className="streak-pill" aria-label={`${meta.streak} dni serii nauki`}>
          <span aria-hidden="true">✦</span> {meta.streak}
        </div>
      </header>

      <main className="content">
        {tab === "learn" && (
          <LearnView
            cards={cards}
            categories={categories}
            selectedCategory={selectedCategory}
            dueCount={dueCards.length}
            uncertainCount={uncertainCount}
            meta={meta}
            activeCard={session?.mode === "learn" ? activeCard : undefined}
            activeItem={session?.mode === "learn" ? activeItem : undefined}
            session={session?.mode === "learn" ? session : null}
            complete={session?.mode === "learn" && complete}
            onAnswer={answerCard}
            onNext={advanceAnswer}
            onStart={() => startSession("learn", activeCategoryId)}
            onStartHard={() => startSession("hard", null)}
            onSelectCategory={setSelectedCategoryId}
            onFinish={finishSession}
            onSpeak={(text) => {
              if (!speakGerman(text)) setToast("Ta przeglądarka nie obsługuje wymowy.");
            }}
            onGoToReviews={() => setTab("review")}
          />
        )}

        {tab === "review" && (
          <ReviewView
            cards={cards}
            dueCards={dueCards}
            categories={categories}
            selectedCategoryId={reviewCategoryId}
            activeCard={session?.mode !== "learn" ? activeCard : undefined}
            activeItem={session?.mode !== "learn" ? activeItem : undefined}
            session={session?.mode !== "learn" ? session : null}
            complete={session?.mode !== "learn" && complete}
            onAnswer={answerCard}
            onNext={advanceAnswer}
            onStart={(categoryId) => startSession("review", categoryId)}
            onStartHard={() => startSession("hard", null)}
            onSelectCategory={setReviewCategoryId}
            onFinish={finishSession}
            onSpeak={(text) => {
              if (!speakGerman(text)) setToast("Ta przeglądarka nie obsługuje wymowy.");
            }}
          />
        )}

        {tab === "collection" && (
          <CollectionView
            cards={cards}
            onChange={setCards}
            onToast={setToast}
          />
        )}

        {tab === "leitner" && (
          <LeitnerView
            cards={cards}
            dueCount={dueCards.length}
            masteredCount={masteredCount}
            meta={meta}
          />
        )}

        {tab === "settings" && (
          <SettingsView
            cards={cards}
            meta={meta}
            onCardsChange={setCards}
            onMetaChange={setMeta}
            onToast={setToast}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Główna nawigacja">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "active" : ""}
            aria-current={tab === item.id ? "page" : undefined}
            onClick={() => {
              setTab(item.id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

interface SessionProps {
  cards: Flashcard[];
  activeCard?: Flashcard;
  activeItem?: SessionItem;
  session: LearningMeta["activeSession"];
  complete: boolean;
  onAnswer: (
    rating: ReviewRating,
    evidence: ReviewEvidence,
    answerValue: string | null,
    correctAnswer: string,
  ) => Flashcard | null;
  onNext: () => void;
  onFinish: () => void;
  onSpeak: (text: string) => void;
}

function FlashcardSession(props: SessionProps) {
  const card = props.activeCard ?? props.cards[0]!;
  const isIntroduction = props.activeItem?.kind === "introduction";
  const sessionIndex = props.session?.index ?? 0;
  const sessionLength = props.session?.queue.length ?? 0;
  const [exercise] = useState(() =>
    createExercise(card, props.cards, sessionIndex, props.activeItem?.forcedMode));
  const persistedOutcome = props.session?.pendingAnswer ?? null;
  const [localOutcome, setLocalOutcome] = useState<SessionAnswer | null>(persistedOutcome);
  const outcome = persistedOutcome ?? localOutcome;
  const [selectedCardId, setSelectedCardId] = useState<string | null>(
    persistedOutcome && exercise.mode.startsWith("choice")
      ? persistedOutcome.answerValue
      : null,
  );
  const [typedAnswer, setTypedAnswer] = useState(
    persistedOutcome && exercise.mode.startsWith("type")
      ? persistedOutcome.answerValue ?? ""
      : "",
  );
  const [flipped, setFlipped] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(Boolean(persistedOutcome));
  const isChoice = exercise.mode.startsWith("choice");
  const selectedOption = exercise.options.find((option) => option.cardId === selectedCardId);
  const correct = outcome?.evidence.correct ?? false;
  const germanLabel = card.article ? `${card.article} ${card.german}` : card.german;

  function submitAnswer(
    rating: ReviewRating,
    evidence: ReviewEvidence,
    answerValue: string | null,
    correctAnswer: string,
  ) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const previousBox = card.leitnerBox;
    const updated = props.onAnswer(rating, evidence, answerValue, correctAnswer);
    if (!updated) {
      submittedRef.current = false;
      return;
    }
    setLocalOutcome({
      cardId: card.id,
      rating,
      evidence,
      answerValue,
      correctAnswer,
      fromBox: previousBox,
      toBox: updated.leitnerBox,
      dueAt: updated.dueAt,
      reason: updated.lastSchedulingReason,
      recordedAt: new Date().toISOString(),
    });
  }

  function checkTypedAnswer(event: FormEvent) {
    event.preventDefault();
    if (!typedAnswer.trim() || outcome) return;
    const result: TypedAnswerResult = evaluateTypedAnswer(
      typedAnswer,
      exercise.acceptedAnswers,
    );
    inputRef.current?.blur();
    submitAnswer(
      result.correct ? (result.score < 0.98 ? "hard" : "good") : "again",
      { mode: exercise.mode, correct: result.correct, score: result.score },
      typedAnswer,
      exercise.answerLabel,
    );
  }

  function chooseAnswer(cardId: string) {
    if (outcome) return;
    const option = exercise.options.find((item) => item.cardId === cardId);
    if (!option) return;
    setSelectedCardId(cardId);
    submitAnswer(
      option.correct ? "good" : "again",
      { mode: exercise.mode, correct: option.correct, score: option.correct ? 1 : 0 },
      cardId,
      exercise.answerLabel,
    );
  }

  function rateIntroduction(rating: ReviewRating) {
    submitAnswer(
      rating,
      { mode: "introduction", correct: rating !== "again" },
      rating,
      card.polish,
    );
  }

  if (props.complete) {
    const accuracy = props.session && props.session.correct + props.session.mistakes > 0
      ? Math.round(
          (props.session.correct / (props.session.correct + props.session.mistakes)) * 100,
        )
      : 0;
    return (
      <section className="completion-card" aria-live="polite">
        <div className="completion-icon" aria-hidden="true">✓</div>
        <p className="eyebrow">Lekcja ukończona</p>
        <h2>Dobra robota.</h2>
        <div className="lesson-summary">
          <span><strong>{props.session?.introduced ?? 0}</strong><small>nowych</small></span>
          <span><strong>{props.session?.mistakes ?? 0}</strong><small>do utrwalenia</small></span>
          <span><strong>{accuracy}%</strong><small>trafień</small></span>
        </div>
        <p>Trudniejsze słowa wrócą wcześniej. Nie musisz niczego planować.</p>
        <button className="primary-button" onClick={props.onFinish}>Gotowe</button>
      </section>
    );
  }

  if (!props.activeCard || !props.activeItem || !props.session) return null;

  return (
    <section className={`session-wrap ${outcome ? "has-outcome" : ""}`}>
      <div className="session-progress">
        <span>{props.session.mode === "hard" ? "Trudne słowa" : "Dzisiejsza lekcja"}</span>
        <strong>{sessionIndex + 1} / {sessionLength}</strong>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${((sessionIndex + 1) / sessionLength) * 100}%` }} />
      </div>

      <article className="exercise-card">
        <div className="exercise-meta">
          <p className="category-chip">
            {categoryTitle(card.category).replace(/\s*\([^)]*\)$/, "")}
          </p>
          <span>{isIntroduction ? "Nowe słowo" : isChoice ? "1 z 3" : "Wpisywanie"}</span>
        </div>

        {isIntroduction ? (
          <div className="introduction-card">
            <p className="exercise-instruction">Dotknij karty, aby ją odwrócić.</p>
            <div className="flip-card-shell">
              <button
                type="button"
                className={`flip-card-button ${flipped ? "flipped" : ""}`}
                onClick={() => setFlipped((current) => !current)}
                aria-label={flipped ? "Schowaj znaczenie" : "Pokaż znaczenie"}
                aria-pressed={flipped}
              >
                <span className="flip-card-inner">
                  <span className="flip-face flip-front">
                    <small>NIEMIECKI</small>
                    <strong lang="de">{germanLabel}</strong>
                    {card.plural && <span>Liczba mnoga: die {card.plural}</span>}
                  </span>
                  <span className="flip-face flip-back">
                    <small>POLSKI I KONTEKST</small>
                    <strong>{card.polish}</strong>
                    <span lang="de">{card.exampleGerman}</span>
                    <span>{card.examplePolish}</span>
                  </span>
                </span>
              </button>
              <button
                className="card-audio-button"
                onClick={() => props.onSpeak(germanLabel)}
                aria-label={`Odtwórz wymowę: ${card.german}`}
              >
                <span aria-hidden="true">◖))</span>
              </button>
            </div>
            <button className="flip-toggle" onClick={() => setFlipped((current) => !current)}>
              {flipped ? "Schowaj znaczenie" : "Pokaż znaczenie"}
            </button>
            <div className="rating-actions persistent-ratings" role="group" aria-label="Jak dobrze znasz to słowo?">
              <button className="rating-again" onClick={() => rateIntroduction("again")} disabled={Boolean(outcome)}>
                <strong>Nie znam</strong><small>przegródka 1</small>
              </button>
              <button className="rating-hard" onClick={() => rateIntroduction("hard")} disabled={Boolean(outcome)}>
                <strong>Niepewnie</strong><small>krótszy odstęp</small>
              </button>
              <button className="rating-good" onClick={() => rateIntroduction("good")} disabled={Boolean(outcome)}>
                <strong>Znam</strong><small>aktywne sprawdzenie</small>
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="exercise-instruction">{exercise.instruction}</p>
            <div className="exercise-prompt">
              <h2 lang={exercise.answerLanguage === "pl" ? "de" : "pl"}>{exercise.prompt}</h2>
              {exercise.answerLanguage === "pl" && (
                <button
                  className="speak-button inline"
                  onClick={() => props.onSpeak(exercise.prompt)}
                  aria-label={`Odtwórz wymowę: ${exercise.prompt}`}
                >
                  <span aria-hidden="true">◖))</span>
                </button>
              )}
            </div>

        {isChoice ? (
          <div className="choice-list" role="group" aria-label={exercise.instruction}>
            {exercise.options.map((option, index) => {
              const isSelected = selectedCardId === option.cardId;
              const stateClass = selectedOption
                ? option.correct
                  ? "correct"
                  : isSelected
                    ? "incorrect"
                    : ""
                : "";
              return (
                <button
                  key={option.cardId}
                  className={`${isSelected ? "selected" : ""} ${stateClass}`}
                  onClick={() => chooseAnswer(option.cardId)}
                  disabled={Boolean(outcome)}
                >
                  <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                  <strong lang={exercise.answerLanguage}>{option.label}</strong>
                </button>
              );
            })}
          </div>
        ) : (
          <form className="typing-exercise" onSubmit={checkTypedAnswer}>
            <div className="typing-row">
              <label>
                <span className="sr-only">{exercise.instruction}</span>
                <input
                  lang={exercise.answerLanguage}
                  ref={inputRef}
                  value={typedAnswer}
                  onChange={(event) => setTypedAnswer(event.target.value)}
                  placeholder={exercise.answerLanguage === "de" ? "Wpisz po niemiecku…" : "Wpisz po polsku…"}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  readOnly={Boolean(outcome)}
                  autoFocus
                />
              </label>
              {!outcome && (
                <button
                  className="typing-submit"
                  type="submit"
                  disabled={!typedAnswer.trim()}
                  aria-label="Sprawdź odpowiedź"
                >
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
            {!outcome && <small className="typing-hint">„Gotowe” na klawiaturze lub strzałka sprawdza odpowiedź.</small>}
          </form>
        )}
          </>
        )}

        {outcome && (
          <div className={`exercise-feedback ${correct ? "correct" : "incorrect"}`} role="status">
            <span className="feedback-icon" aria-hidden="true">{correct ? "✓" : "×"}</span>
            <div>
              <strong>{correct ? "Odpowiedź zapisana" : "Jeszcze do utrwalenia"}</strong>
              {outcome.evidence.score !== undefined && (
                <small className="similarity-score">
                  Zgodność odpowiedzi: {Math.round(outcome.evidence.score * 100)}%
                </small>
              )}
              {!isIntroduction && <p>Poprawna odpowiedź: <b lang={exercise.answerLanguage}>{outcome.correctAnswer}</b></p>}
              <div className="result-word-pair">
                <p lang="de"><b>{germanLabel}</b>{card.plural ? ` · die ${card.plural}` : ""}</p>
                <p>{card.polish}</p>
              </div>
              <div className="context-example">
                <small>W kontekście</small>
                <p lang="de">{card.exampleGerman}</p>
                <p>{card.examplePolish}</p>
              </div>
              <div className="schedule-result">
                <strong>Przegródka {outcome.fromBox} → {outcome.toBox}</strong>
                <small>Następna powtórka: {nextReviewLabel(outcome.dueAt)}</small>
                <p>{outcome.reason}</p>
              </div>
            </div>
            {(!isIntroduction && exercise.answerLanguage === "de") && (
              <button
                className="feedback-speak"
                onClick={() => props.onSpeak(germanLabel)}
                aria-label={`Odtwórz wymowę: ${germanLabel}`}
              >
                <span aria-hidden="true">◖))</span>
              </button>
            )}
          </div>
        )}
      </article>

      {outcome && (
        <div className="next-action-bar">
          <button className="primary-button wide continue-button" onClick={props.onNext}>
            Dalej <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </section>
  );
}

function CategoryPicker({
  categories,
  selectedId,
  onSelect,
}: {
  categories: CategoryProgress[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="learning-path" aria-label="Wybierz kategorię nauki">
      {categories.map((category, index) => {
        const complete = category.mastered === category.total;
        return (
          <button
            key={category.id}
            className={`learning-path-row ${selectedId === category.id ? "active" : ""} ${complete ? "complete" : ""}`}
            onClick={() => onSelect(category.id)}
            aria-pressed={selectedId === category.id}
          >
            <span className="category-number" aria-hidden="true">{complete ? "✓" : index + 1}</span>
            <span className="category-copy">
              <strong>{category.title}</strong>
              <small>{category.retained}/{category.total} znanych · {category.mastered} opanowanych</small>
              <span className="category-mini-progress"><i style={{ width: `${category.percent}%` }} /></span>
            </span>
            <span className="category-state">{complete ? "Gotowe" : category.due ? `${category.due} dziś` : "Kontynuuj"}</span>
          </button>
        );
      })}
    </div>
  );
}

function LearnView(props: SessionProps & {
  cards: Flashcard[];
  categories: CategoryProgress[];
  selectedCategory?: CategoryProgress;
  dueCount: number;
  uncertainCount: number;
  meta: LearningMeta;
  onStart: () => void;
  onStartHard: () => void;
  onSelectCategory: (id: string) => void;
  onGoToReviews: () => void;
}) {
  if (props.activeCard || props.complete) {
    return <FlashcardSession key={`${props.activeCard?.id ?? "complete"}:${props.session?.index ?? 0}`} {...props} />;
  }
  const category = props.selectedCategory;
  const newCount = category?.cards.filter((card) => card.stage === "new").length ?? 0;
  const categoryDue = category?.due ?? 0;
  const completedToday = props.meta.lastStudyDate === localDateKey()
    ? props.meta.completedToday
    : 0;
  const categoryParts = category?.title.match(/^(.+?) \((.+)\)$/);
  const categoryPolish = categoryParts?.[1] ?? category?.title ?? "Wybierz lekcję";
  const categoryGerman = categoryParts?.[2] ?? null;

  return (
    <>
      <section className="hero-copy">
        <p className="eyebrow">Twoja ścieżka</p>
        <h1>Jedna lekcja.<br /><em>Jeden krok naraz.</em></h1>
        <p>Krótka porcja nowych słów i powtórek. Trudniejsze wrócą jeszcze w tej lekcji.</p>
      </section>

      <section className="daily-card">
        <div className="daily-card-head">
          <div>
            <p className="eyebrow">Aktualna kategoria</p>
            <h2>{categoryPolish}</h2>
            {categoryGerman && <small className="daily-category-german" lang="de">{categoryGerman}</small>}
          </div>
          <div className="goal-ring" aria-label={`${Math.min(100, completedToday * 10)} procent dziennego celu`}>
            <strong>{Math.min(10, completedToday)}</strong><small>/10</small>
          </div>
        </div>
        <div className="today-stats">
          <span><strong>{categoryDue}</strong> do powtórki</span>
          <span><strong>{newCount}</strong> do poznania</span>
        </div>
        <button className="primary-button wide" onClick={props.onStart} disabled={!category || category.mastered === category.total}>
          {category?.mastered === category?.total ? "Kategoria opanowana ✓" : "Zacznij krótką lekcję"} <span aria-hidden="true">→</span>
        </button>
      </section>

      {props.uncertainCount > 0 && (
        <button className="focus-row" onClick={props.onStartHard}>
          <span className="row-icon" aria-hidden="true">≈</span>
          <span>
            <strong>Trudne słowa</strong>
            <small>{props.uncertainCount} słów wymaga spokojnej dogrywki</small>
          </span>
          <span aria-hidden="true">›</span>
        </button>
      )}

      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">Kolejność nauki</p><h2>Twoje lekcje</h2></div></div>
        <CategoryPicker categories={props.categories} selectedId={category?.id} onSelect={props.onSelectCategory} />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">Powrót w dobrym momencie</p><h2>Powtórki</h2></div>
          <button className="text-button" onClick={props.onGoToReviews}>Zobacz</button>
        </div>
        <button className="review-row" onClick={props.onGoToReviews}>
          <span className="row-icon" aria-hidden="true">↻</span>
          <span><strong>{props.dueCount ? `${props.dueCount} kart czeka` : "Wszystko powtórzone"}</strong>
            <small>{props.dueCount ? "Powtarzaj je w wybranej kategorii" : "Wróć jutro po kolejną porcję"}</small>
          </span>
          <span aria-hidden="true">›</span>
        </button>
      </section>

      <blockquote className="quote-card">
        <p>„Übung macht den Meister.”</p>
        <small>Ćwiczenie czyni mistrza.</small>
      </blockquote>
    </>
  );
}

function ReviewView(props: SessionProps & {
  dueCards: Flashcard[];
  categories: CategoryProgress[];
  selectedCategoryId: string | null;
  onStart: (categoryId: string) => void;
  onStartHard: () => void;
  onSelectCategory: (id: string) => void;
}) {
  if (props.activeCard || props.complete) {
    return <FlashcardSession key={`${props.activeCard?.id ?? "complete"}:${props.session?.index ?? 0}`} {...props} />;
  }
  const categoriesWithDue = props.categories.filter((category) => category.due > 0);
  const activeCategoryId = props.selectedCategoryId ?? categoriesWithDue[0]?.id;
  const activeCategory = categoriesWithDue.find((category) => category.id === activeCategoryId);
  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">W odpowiednim rytmie</p>
        <h1>Powtórki</h1>
        <p>Najpierw wracają trudne słowa, a opanowane czekają coraz dłużej.</p>
      </div>
      <div className="review-summary">
        <span className="big-number">{activeCategory?.due ?? 0}</span>
        <div><strong>w lekcji „{activeCategory?.title ?? "—"}”</strong><small>maksymalnie 10 w jednej sesji</small></div>
      </div>
      <button className="focus-row review-focus" onClick={props.onStartHard}>
        <span className="row-icon" aria-hidden="true">≈</span>
        <span><strong>Najpierw trudne słowa</strong><small>Błędy i niepewne odpowiedzi ze wszystkich kategorii</small></span>
        <span aria-hidden="true">›</span>
      </button>
      {categoriesWithDue.length > 0 && (
        <CategoryPicker categories={categoriesWithDue} selectedId={activeCategoryId} onSelect={props.onSelectCategory} />
      )}
      <button
        className="primary-button wide"
        onClick={() => activeCategoryId && props.onStart(activeCategoryId)}
        disabled={!activeCategoryId}
      >
        {activeCategoryId ? "Rozpocznij powtórkę" : "Na dziś gotowe ✓"}
      </button>
      <div className="info-card">
        <span aria-hidden="true">◷</span>
        <div><strong>Jak działa plan?</strong><p>Po poprawnej odpowiedzi karta wróci za 1, 3, 7 dni, a później coraz rzadziej. Błędna wróci szybciej.</p></div>
      </div>
    </section>
  );
}

function CollectionView({
  cards,
  onChange,
  onToast,
}: {
  cards: Flashcard[];
  onChange: (cards: Flashcard[]) => void;
  onToast: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Wszystkie");
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Flashcard | null>(null);
  const [draft, setDraft] = useState(emptyContent);

  const categoryFor = (card: Flashcard) => card.category;
  const categories = ["Wszystkie", ...new Set(cards.map(categoryFor))];
  const filtered = cards.filter((card) => {
    const phrase = `${card.german} ${card.polish}`.toLocaleLowerCase("pl-PL");
    return (
      (category === "Wszystkie" || categoryFor(card) === category) &&
      phrase.includes(search.toLocaleLowerCase("pl-PL"))
    );
  });

  function openNewCard() {
    setEditing(null);
    setDraft(emptyContent);
    setShowEditor(true);
  }

  function openEdit(card: Flashcard) {
    setEditing(card);
    setDraft({
      german: card.german,
      polish: card.polish,
      article: card.article,
      plural: card.plural,
      exampleGerman: card.exampleGerman,
      examplePolish: card.examplePolish,
      category: card.category,
    });
    setShowEditor(true);
  }

  function saveDraft(event: FormEvent) {
    event.preventDefault();
    const content: CardContent = {
      ...draft,
      id: editing?.id || crypto.randomUUID(),
      plural: draft.plural?.trim() || null,
    };
    const otherCards = editing ? cards.filter((card) => card.id !== editing.id) : cards;
    if (isDuplicate(content, otherCards)) {
      onToast("Taka niemiecka fiszka już istnieje.");
      return;
    }
    onChange(
      editing
        ? cards.map((card) => (card.id === editing.id ? { ...card, ...content } : card))
        : [...cards, toFlashcard(content, "manual")],
    );
    setShowEditor(false);
    onToast(editing ? "Fiszka została zapisana." : "Nowa fiszka trafiła do kolekcji.");
  }

  return (
    <section>
      <div className="page-heading inline-heading">
        <div><p className="eyebrow">Twój osobisty słownik</p><h1>Kolekcja</h1></div>
        <button className="round-button" onClick={openNewCard} aria-label="Dodaj fiszkę">＋</button>
      </div>

      <div className="source-note">
        <span aria-hidden="true">◎</span>
        <p>
          Główny zestaw: Nicos Weg Deutsche Welle —{" "}
          <a href="https://ankiweb.net/shared/info/458469586" target="_blank" rel="noreferrer">A2</a>
          {" "}oraz{" "}
          <a href="https://ankiweb.net/shared/info/492301569" target="_blank" rel="noreferrer">B1</a>.
          Poziom A2 ma pierwszeństwo w nauce.
        </p>
      </div>

      <label className="search-box">
        <span aria-hidden="true">⌕</span>
        <span className="sr-only">Szukaj w kolekcji</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szukaj po niemiecku lub polsku" />
      </label>

      <div className="category-scroll" aria-label="Filtr kategorii">
        {categories.map((item) => (
          <button
            key={item}
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="collection-count">{filtered.length} {filtered.length === 1 ? "fiszka" : "fiszek"}</div>
      <div className="card-list">
        {filtered.map((card) => (
          <article className="collection-row" key={card.id}>
            <button className="collection-main" onClick={() => openEdit(card)}>
              <span>
                <strong>{card.article && <i>{card.article} </i>}{card.german}</strong>
                <small>{card.polish}</small>
              </span>
              <span className="mini-category">{card.category.replace(/^Nicos Weg (A2|B1) · /, "")}</span>
            </button>
            <button
              className="delete-button"
              aria-label={`Usuń fiszkę ${card.german}`}
              onClick={() => {
                if (window.confirm(`Usunąć fiszkę „${card.german}”?`)) {
                  onChange(cards.filter((item) => item.id !== card.id));
                  onToast("Fiszka została usunięta.");
                }
              }}
            >
              ×
            </button>
          </article>
        ))}
      </div>

      {showEditor && (
        <CardEditor
          draft={draft}
          title={editing ? "Edytuj fiszkę" : "Nowa fiszka"}
          onChange={setDraft}
          onClose={() => setShowEditor(false)}
          onSubmit={saveDraft}
        />
      )}
    </section>
  );
}

function CardEditor({
  draft,
  title,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: Omit<CardContent, "id">;
  title: string;
  onChange: (value: Omit<CardContent, "id">) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  function update<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    onChange({ ...draft, [key]: value });
  }
  return (
    <div className="modal-backdrop">
      <section className="modal-sheet editor-sheet" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <div className="modal-head">
          <h2 id="editor-title">{title}</h2>
          <button className="close-button" onClick={onClose} aria-label="Zamknij">×</button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="field"><span>Niemiecki *</span><input required value={draft.german} onChange={(e) => update("german", e.target.value)} /></label>
            <label className="field"><span>Polski *</span><input required value={draft.polish} onChange={(e) => update("polish", e.target.value)} /></label>
            <label className="field"><span>Rodzajnik</span>
              <select value={draft.article || ""} onChange={(e) => update("article", (e.target.value || null) as CardContent["article"])}>
                <option value="">brak</option><option>der</option><option>die</option><option>das</option>
              </select>
            </label>
            <label className="field"><span>Liczba mnoga</span><input value={draft.plural || ""} onChange={(e) => update("plural", e.target.value || null)} /></label>
            <label className="field full"><span>Przykład po niemiecku *</span><input required value={draft.exampleGerman} onChange={(e) => update("exampleGerman", e.target.value)} /></label>
            <label className="field full"><span>Tłumaczenie przykładu *</span><input required value={draft.examplePolish} onChange={(e) => update("examplePolish", e.target.value)} /></label>
            <label className="field full"><span>Kategoria *</span><input required value={draft.category} onChange={(e) => update("category", e.target.value)} /></label>
          </div>
          <button className="primary-button wide">Zapisz fiszkę</button>
        </form>
      </section>
    </div>
  );
}

function LeitnerView({
  cards,
  dueCount,
  masteredCount,
  meta,
}: {
  cards: Flashcard[];
  dueCount: number;
  masteredCount: number;
  meta: LearningMeta;
}) {
  const [selectedBox, setSelectedBox] = useState<LeitnerBox | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Wszystkie");
  const [detail, setDetail] = useState<Flashcard | null>(null);
  const now = new Date();
  const boxes = ([1, 2, 3, 4, 5] as LeitnerBox[]).map((box) => {
    const boxCards = cards.filter((card) => card.leitnerBox === box);
    const due = boxCards.filter((card) => card.stage !== "new" && isDue(card, now));
    const future = boxCards
      .filter((card) => card.stage !== "new" && !isDue(card, now))
      .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
    return {
      box,
      cards: boxCards,
      due: due.length,
      newCards: boxCards.filter((card) => card.stage === "new").length,
      next: due.length ? "teraz" : future[0] ? nextReviewLabel(future[0].dueAt, now) : "—",
    };
  });
  const activeBox = boxes.find((item) => item.box === selectedBox);
  const categoryNames = ["Wszystkie", ...new Set(activeBox?.cards.map((card) => card.category) ?? [])];
  const filtered = (activeBox?.cards ?? []).filter((card) => {
    const phrase = `${card.article ?? ""} ${card.german} ${card.polish}`.toLocaleLowerCase("pl-PL");
    return (category === "Wszystkie" || card.category === category) &&
      phrase.includes(search.toLocaleLowerCase("pl-PL"));
  });

  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">Twój rytm pamięci</p>
        <h1>Przegródki</h1>
        <p>Im wyższa przegródka, tym rzadziej słowo wraca. Błąd przenosi je bliżej.</p>
      </div>
      <div className="stat-grid">
        <article><span aria-hidden="true">✦</span><strong>{meta.streak}</strong><small>dni serii</small></article>
        <article><span aria-hidden="true">✓</span><strong>{masteredCount}</strong><small>opanowanych</small></article>
        <article><span aria-hidden="true">↻</span><strong>{dueCount}</strong><small>do powtórki</small></article>
        <article><span aria-hidden="true">◇</span><strong>{meta.totalReviews}</strong><small>odpowiedzi</small></article>
      </div>

      <div className="leitner-boxes" aria-label="Pięć przegródek Leitnera">
        {boxes.map((item) => (
          <button
            key={item.box}
            className={selectedBox === item.box ? "active" : ""}
            onClick={() => {
              setSelectedBox(item.box);
              setCategory("Wszystkie");
              setSearch("");
            }}
          >
            <span className="box-number">{item.box}</span>
            <span>
              <strong>Przegródka {item.box}</strong>
              <small>{boxDescription(item.box)}</small>
            </span>
            <span className="box-count">
              <strong>{item.cards.length}</strong>
              <small>{item.due ? `${item.due} dziś` : item.newCards ? `${item.newCards} nowych` : `następna ${item.next}`}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="info-card leitner-explainer">
        <span aria-hidden="true">◷</span>
        <div>
          <strong>Jak karta awansuje?</strong>
          <p>Poprawne aktywne przypomnienie przesuwa ją o jedną przegródkę. „Niepewnie” skraca odstęp, a błąd wraca do przegródki 1. Samo „Znam” na odsłoniętej fiszce nie wystarcza do opanowania.</p>
        </div>
      </div>

      {activeBox && (
        <section className="section-block box-browser">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{boxDescription(activeBox.box)}</p>
              <h2>Przegródka {activeBox.box}</h2>
            </div>
            <button className="text-button" onClick={() => setSelectedBox(null)}>Zamknij</button>
          </div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Szukaj w przegródce</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Szukaj słowa" />
          </label>
          <div className="category-scroll" aria-label="Filtr kategorii">
            {categoryNames.map((item) => (
              <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>
                {item === "Wszystkie" ? item : categoryTitle(item)}
              </button>
            ))}
          </div>
          <p className="collection-count">{filtered.length} kart</p>
          <div className="box-card-list">
            {filtered.map((card) => (
              <button key={card.id} onClick={() => setDetail(card)}>
                <span>
                  <strong lang="de">{card.article && <i>{card.article} </i>}{card.german}</strong>
                  <small>{card.polish}</small>
                  <small>{categoryTitle(card.category)}</small>
                </span>
                <span>
                  <strong>{card.stage === "new" ? "Nowa" : nextReviewLabel(card.dueAt, now)}</strong>
                  <small>{card.reviewHistory.at(-1)?.correct === false ? "ostatnio: błąd" : card.lastReviewedAt ? "ostatnio: dobrze" : "bez powtórek"}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {detail && (
        <div className="modal-backdrop">
          <section className="modal-sheet card-history-sheet" role="dialog" aria-modal="true" aria-labelledby="history-title">
            <div className="modal-head">
              <div>
                <p className="eyebrow">Przegródka {detail.leitnerBox}</p>
                <h2 id="history-title" lang="de">{detail.article && <i>{detail.article} </i>}{detail.german}</h2>
              </div>
              <button className="close-button" onClick={() => setDetail(null)} aria-label="Zamknij">×</button>
            </div>
            <p className="history-translation">{detail.polish}</p>
            <div className="history-next">
              <strong>{detail.stage === "new" ? "Jeszcze niepoznana" : `Następna powtórka ${nextReviewLabel(detail.dueAt, now)}`}</strong>
              <small>{detail.lastSchedulingReason}</small>
            </div>
            <h3>Historia odpowiedzi</h3>
            {detail.reviewHistory.length ? (
              <div className="history-list">
                {[...detail.reviewHistory].reverse().map((entry) => (
                  <div key={entry.id}>
                    <span className={entry.correct ? "history-good" : "history-again"}>{entry.correct ? "✓" : "×"}</span>
                    <span>
                      <strong>{entry.fromBox} → {entry.toBox} · {entry.rating === "again" ? "Nie znam" : entry.rating === "hard" ? "Niepewnie" : "Znam"}</strong>
                      <small>{new Date(entry.reviewedAt).toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" })}</small>
                      <small>{entry.reason}</small>
                    </span>
                  </div>
                ))}
              </div>
            ) : <p className="empty-history">Historia pojawi się po pierwszej odpowiedzi.</p>}
          </section>
        </div>
      )}
    </section>
  );
}

function SettingsView({
  cards,
  meta,
  onCardsChange,
  onMetaChange,
  onToast,
}: {
  cards: Flashcard[];
  meta: LearningMeta;
  onCardsChange: (cards: Flashcard[]) => void;
  onMetaChange: (meta: LearningMeta) => void;
  onToast: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function exportData() {
    const blob = new Blob([JSON.stringify(createBackup(cards, meta), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wortschatz-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onToast("Kopia zapasowa została pobrana.");
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const backup = parseBackup(JSON.parse(await file.text()));
      onCardsChange(backup.cards);
      onMetaChange(backup.meta);
      onToast(`Przywrócono ${backup.cards.length} fiszek.`);
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Nie udało się odczytać pliku.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <section>
      <div className="page-heading"><p className="eyebrow">Dopasuj aplikację</p><h1>Ustawienia</h1></div>
      <section className="settings-group">
        <h2>Wygląd</h2>
        <label className="settings-row">
          <span><strong>Motyw</strong><small>Może podążać za ustawieniami telefonu</small></span>
          <select value={meta.theme} onChange={(event) => onMetaChange({ ...meta, theme: event.target.value as LearningMeta["theme"] })}>
            <option value="system">Systemowy</option>
            <option value="light">Jasny</option>
            <option value="dark">Ciemny</option>
          </select>
        </label>
      </section>
      <section className="settings-group">
        <h2>Dane</h2>
        <button className="settings-row" onClick={exportData}>
          <span><strong>Eksportuj kopię</strong><small>Zapisz fiszki i postępy jako JSON</small></span><span aria-hidden="true">↓</span>
        </button>
        <button className="settings-row" onClick={() => fileRef.current?.click()}>
          <span><strong>Importuj kopię</strong><small>Przywróć wcześniej zapisane dane</small></span><span aria-hidden="true">↑</span>
        </button>
        <input ref={fileRef} className="sr-only" type="file" accept="application/json" onChange={importData} />
      </section>
      <section className="settings-group">
        <h2>O aplikacji</h2>
        <div className="settings-row static">
          <span>
            <strong>Wortschatz A2</strong>
            <small>{cards.length} kart · Nicos Weg A2 z rozszerzeniem B1 · postęp synchronizowany z bazą</small>
          </span>
          <span>2.0</span>
        </div>
      </section>
      <button
        className="danger-button"
        onClick={async () => {
          if (!window.confirm("Usunąć postępy i przywrócić zestaw startowy? Tej operacji nie można cofnąć.")) return;
          await clearDatabase();
          onCardsChange(starterCards);
          onMetaChange(defaultMeta);
          onToast("Przywrócono zestaw startowy.");
        }}
      >
        Wyzeruj postępy
      </button>
    </section>
  );
}

export default App;
