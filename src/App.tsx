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
import { createExercise, isTypedAnswerCorrect } from "./lib/exercises";
import { defaultMeta, recordReview } from "./lib/meta";
import { isDue, reviewCard, sortForLearning } from "./lib/srs";
import { speakGerman } from "./lib/speech";
import {
  clearDatabase,
  createBackup,
  loadOrSeed,
  parseBackup,
  saveCards,
  saveMeta,
} from "./lib/storage";
import type { CardContent, Flashcard, LearningMeta, TabId } from "./types";

const navItems: Array<{ id: TabId; icon: string; label: string }> = [
  { id: "learn", icon: "◇", label: "Nauka" },
  { id: "review", icon: "↻", label: "Powtórki" },
  { id: "collection", icon: "▤", label: "Kolekcja" },
  { id: "progress", icon: "◔", label: "Postępy" },
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
  const [toast, setToast] = useState<string | null>(null);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionMode, setSessionMode] = useState<"learn" | "review">("learn");

  useEffect(() => {
    loadOrSeed(starterCards)
      .then(({ cards: savedCards, meta: savedMeta }) => {
        setCards(savedCards);
        setMeta(savedMeta);
      })
      .catch(() => {
        setCards(starterCards);
        setToast("Nie udało się otworzyć pamięci urządzenia. Postępy mogą nie zostać zapisane.");
      })
      .finally(() => setReady(true));
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
    document.documentElement.dataset.theme = meta.theme;
  }, [meta.theme]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const now = new Date();
  const dueCards = useMemo(() => cards.filter((card) => isDue(card, now)), [cards]);
  const learnedCount = cards.filter((card) => card.learned).length;
  const activeCard = sessionIds[sessionIndex]
    ? cards.find((card) => card.id === sessionIds[sessionIndex])
    : undefined;
  const sessionComplete = sessionIds.length > 0 && sessionIndex >= sessionIds.length;

  function startSession(mode: "learn" | "review") {
    const pool =
      mode === "review"
        ? sortForLearning(cards.filter((card) => isDue(card))).slice(0, 10)
        : sortForLearning(cards.filter((card) => !card.learned || isDue(card))).slice(0, 10);
    setSessionMode(mode);
    setSessionIds(pool.map((card) => card.id));
    setSessionIndex(0);
    setTab(mode);
    if (pool.length === 0) setToast("Świetnie — na teraz nie masz kart do powtórki.");
  }

  function answerCard(remembered: boolean) {
    if (!activeCard) return;
    setCards((current) =>
      current.map((card) => (card.id === activeCard.id ? reviewCard(card, remembered) : card)),
    );
    setMeta((current) => recordReview(current));
    setSessionIndex((index) => index + 1);
  }

  function finishSession() {
    setSessionIds([]);
    setSessionIndex(0);
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
      <header className="topbar">
        <button className="brand" onClick={() => setTab("learn")} aria-label="Przejdź do nauki">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span><strong>Wortschatz</strong><small>NIEMIECKI · A2 +</small></span>
        </button>
        <div className="streak-pill" aria-label={`${meta.streak} dni serii nauki`}>
          <span aria-hidden="true">✦</span> {meta.streak}
        </div>
      </header>

      <main className="content">
        {tab === "learn" && (
          <LearnView
            cards={cards}
            dueCount={dueCards.length}
            meta={meta}
            activeCard={sessionMode === "learn" ? activeCard : undefined}
            sessionLength={sessionMode === "learn" ? sessionIds.length : 0}
            sessionIndex={sessionIndex}
            complete={sessionMode === "learn" && sessionComplete}
            onAnswer={answerCard}
            onStart={() => startSession("learn")}
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
            activeCard={sessionMode === "review" ? activeCard : undefined}
            sessionLength={sessionMode === "review" ? sessionIds.length : 0}
            sessionIndex={sessionIndex}
            complete={sessionMode === "review" && sessionComplete}
            onAnswer={answerCard}
            onStart={() => startSession("review")}
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

        {tab === "progress" && (
          <ProgressView
            cards={cards}
            dueCount={dueCards.length}
            learnedCount={learnedCount}
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
  sessionLength: number;
  sessionIndex: number;
  complete: boolean;
  onAnswer: (remembered: boolean) => void;
  onFinish: () => void;
  onSpeak: (text: string) => void;
}

function FlashcardSession(props: SessionProps) {
  const card = props.activeCard ?? props.cards[0]!;
  const exercise = useMemo(
    () => createExercise(card, props.cards, props.sessionIndex),
    [card, props.cards, props.sessionIndex],
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typedResult, setTypedResult] = useState<boolean | null>(null);
  const isChoice = exercise.mode.startsWith("choice");
  const selectedOption = exercise.options.find((option) => option.cardId === selectedCardId);
  const answered = isChoice ? Boolean(selectedOption) : typedResult !== null;
  const correct = isChoice ? Boolean(selectedOption?.correct) : typedResult === true;

  function checkTypedAnswer(event: FormEvent) {
    event.preventDefault();
    if (!typedAnswer.trim() || typedResult !== null) return;
    setTypedResult(isTypedAnswerCorrect(typedAnswer, exercise.acceptedAnswers));
  }

  if (props.complete) {
    return (
      <section className="completion-card" aria-live="polite">
        <div className="completion-icon" aria-hidden="true">✓</div>
        <p className="eyebrow">Sesja ukończona</p>
        <h2>Sehr gut!</h2>
        <p>Każda krótka sesja utrwala niemiecki na dłużej.</p>
        <button className="primary-button" onClick={props.onFinish}>Wróć do podsumowania</button>
      </section>
    );
  }

  if (!props.activeCard) return null;

  return (
    <section className="session-wrap" aria-live="polite">
      <div className="session-progress">
        <span>Dzisiejsza sesja</span>
        <strong>{props.sessionIndex + 1} / {props.sessionLength}</strong>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${((props.sessionIndex + 1) / props.sessionLength) * 100}%` }} />
      </div>

      <article className="exercise-card">
        <div className="exercise-meta">
          <p className="category-chip">{card.level || "A2"}</p>
          <span>{isChoice ? "1 z 3" : "Wpisywanie"}</span>
        </div>
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
                  onClick={() => setSelectedCardId(option.cardId)}
                  disabled={Boolean(selectedOption)}
                >
                  <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                  <strong lang={exercise.answerLanguage}>{option.label}</strong>
                </button>
              );
            })}
          </div>
        ) : (
          <form className="typing-exercise" onSubmit={checkTypedAnswer}>
            <label>
              <span className="sr-only">{exercise.instruction}</span>
              <input
                lang={exercise.answerLanguage}
                value={typedAnswer}
                onChange={(event) => setTypedAnswer(event.target.value)}
                placeholder={exercise.answerLanguage === "de" ? "Wpisz po niemiecku…" : "Wpisz po polsku…"}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="done"
                readOnly={typedResult !== null}
                autoFocus
              />
            </label>
            {typedResult === null && (
              <button className="primary-button wide" disabled={!typedAnswer.trim()}>
                Sprawdź odpowiedź
              </button>
            )}
          </form>
        )}

        {answered && (
          <div className={`exercise-feedback ${correct ? "correct" : "incorrect"}`} role="status">
            <span className="feedback-icon" aria-hidden="true">{correct ? "✓" : "×"}</span>
            <div>
              <strong>{correct ? "Sehr gut!" : "Jeszcze raz następnym razem"}</strong>
              {!correct && <p>Poprawna odpowiedź: <b lang={exercise.answerLanguage}>{exercise.answerLabel}</b></p>}
              {card.plural && exercise.answerLanguage === "de" && <small>Liczba mnoga: die {card.plural}</small>}
              {card.exampleGerman && card.examplePolish && (
                <div className="context-example">
                  <small>W kontekście</small>
                  <p lang="de">{card.exampleGerman}</p>
                  <p>{card.examplePolish}</p>
                </div>
              )}
              {card.sourceLabel && card.sourceUrl && (
                <a href={card.sourceUrl} target="_blank" rel="noreferrer">{card.sourceLabel}</a>
              )}
            </div>
            {exercise.answerLanguage === "de" && (
              <button
                className="feedback-speak"
                onClick={() => props.onSpeak(exercise.answerLabel)}
                aria-label={`Odtwórz wymowę: ${exercise.answerLabel}`}
              >
                <span aria-hidden="true">◖))</span>
              </button>
            )}
          </div>
        )}
      </article>

      {answered && (
        <button className="primary-button wide continue-button" onClick={() => props.onAnswer(correct)}>
          Dalej <span aria-hidden="true">→</span>
        </button>
      )}
    </section>
  );
}

function LearnView(props: SessionProps & {
  cards: Flashcard[];
  dueCount: number;
  meta: LearningMeta;
  onStart: () => void;
  onGoToReviews: () => void;
}) {
  if (props.activeCard || props.complete) {
    return <FlashcardSession key={props.activeCard?.id ?? "complete"} {...props} />;
  }
  const newCount = props.cards.filter((card) => card.repetitions === 0).length;

  return (
    <>
      <section className="hero-copy">
        <p className="eyebrow">Guten Tag!</p>
        <h1>Mały krok.<br /><em>Großer Fortschritt.</em></h1>
        <p>Dziesięć krótkich ćwiczeń z kursem Nicos Weg wystarczy, by podtrzymać rytm.</p>
      </section>

      <section className="daily-card">
        <div className="daily-card-head">
          <div>
            <p className="eyebrow">Plan na dziś</p>
            <h2>Gotowy na rundę?</h2>
          </div>
          <div className="goal-ring" aria-label={`${Math.min(100, props.meta.completedToday * 10)} procent dziennego celu`}>
            <strong>{Math.min(10, props.meta.completedToday)}</strong><small>/10</small>
          </div>
        </div>
        <div className="today-stats">
          <span><strong>{props.dueCount}</strong> do powtórki</span>
          <span><strong>{newCount}</strong> nowych</span>
        </div>
        <button className="primary-button wide" onClick={props.onStart}>
          Zacznij sesję <span aria-hidden="true">→</span>
        </button>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div><p className="eyebrow">Powrót w dobrym momencie</p><h2>Powtórki</h2></div>
          <button className="text-button" onClick={props.onGoToReviews}>Zobacz</button>
        </div>
        <button className="review-row" onClick={props.onGoToReviews}>
          <span className="row-icon" aria-hidden="true">↻</span>
          <span><strong>{props.dueCount ? `${props.dueCount} kart czeka` : "Wszystko powtórzone"}</strong>
            <small>{props.dueCount ? "Najpierw te, które sprawiają trudność" : "Wróć jutro po kolejną porcję"}</small>
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

function ReviewView(props: SessionProps & { dueCards: Flashcard[]; onStart: () => void }) {
  if (props.activeCard || props.complete) {
    return <FlashcardSession key={props.activeCard?.id ?? "complete"} {...props} />;
  }
  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">W odpowiednim rytmie</p>
        <h1>Powtórki</h1>
        <p>Najpierw wracają trudne słowa, a opanowane czekają coraz dłużej.</p>
      </div>
      <div className="review-summary">
        <span className="big-number">{props.dueCards.length}</span>
        <div><strong>kart na dzisiaj</strong><small>maksymalnie 10 w jednej sesji</small></div>
      </div>
      <button
        className="primary-button wide"
        onClick={props.onStart}
        disabled={props.dueCards.length === 0}
      >
        {props.dueCards.length ? "Rozpocznij powtórkę" : "Na dziś gotowe ✓"}
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

  const categoryFor = (card: Flashcard) => card.level ? `Nicos Weg ${card.level}` : card.category;
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

function ProgressView({
  cards,
  dueCount,
  learnedCount,
  meta,
}: {
  cards: Flashcard[];
  dueCount: number;
  learnedCount: number;
  meta: LearningMeta;
}) {
  const categoryNames = [...new Set(cards.map((card) => card.level ? `Nicos Weg ${card.level}` : card.category))];
  const categories = categoryNames.map((category) => {
    const all = cards.filter((card) => (card.level ? `Nicos Weg ${card.level}` : card.category) === category);
    const learned = all.filter((card) => card.learned).length;
    return { category, all: all.length, learned, percent: all.length ? Math.round((learned / all.length) * 100) : 0 };
  });
  return (
    <section>
      <div className="page-heading">
        <p className="eyebrow">Twoja regularność</p>
        <h1>Postępy</h1>
        <p>Nie ścigaj perfekcji. Liczy się powrót do nauki.</p>
      </div>
      <div className="stat-grid">
        <article><span aria-hidden="true">✦</span><strong>{meta.streak}</strong><small>dni serii</small></article>
        <article><span aria-hidden="true">✓</span><strong>{learnedCount}</strong><small>opanowanych</small></article>
        <article><span aria-hidden="true">↻</span><strong>{dueCount}</strong><small>do powtórki</small></article>
        <article><span aria-hidden="true">◇</span><strong>{meta.totalReviews}</strong><small>odpowiedzi</small></article>
      </div>
      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">Opanowanie</p><h2>Kategorie</h2></div></div>
        <div className="category-progress-list">
          {categories.map((item) => (
            <div key={item.category}>
              <span><strong>{item.category}</strong><small>{item.learned}/{item.all}</small></span>
              <div className="progress-track"><i style={{ width: `${item.percent}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
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
            <small>{cards.length} kart · Nicos Weg A2 z rozszerzeniem B1 · dane tylko na tym urządzeniu</small>
          </span>
          <span>1.1</span>
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
