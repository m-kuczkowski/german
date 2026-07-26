import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { starterCards, starterCategories } from "./data/starterCards";
import { generateCards } from "./lib/api";
import { isDuplicate, mergeUnique, toFlashcard } from "./lib/cards";
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
  const [online, setOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState<string | null>(null);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
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
    const setConnected = () => setOnline(true);
    const setDisconnected = () => setOnline(false);
    window.addEventListener("online", setConnected);
    window.addEventListener("offline", setDisconnected);
    return () => {
      window.removeEventListener("online", setConnected);
      window.removeEventListener("offline", setDisconnected);
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
    setRevealed(false);
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
    setRevealed(false);
  }

  function finishSession() {
    setSessionIds([]);
    setSessionIndex(0);
    setRevealed(false);
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
          Tryb offline · fiszki działają, generator AI poczeka na internet
        </div>
      )}

      <header className="topbar">
        <button className="brand" onClick={() => setTab("learn")} aria-label="Przejdź do nauki">
          <span className="brand-mark" aria-hidden="true">W</span>
          <span><strong>Wortschatz</strong><small>NIEMIECKI · A2</small></span>
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
            revealed={revealed}
            onReveal={() => setRevealed(true)}
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
            dueCards={dueCards}
            activeCard={sessionMode === "review" ? activeCard : undefined}
            sessionLength={sessionMode === "review" ? sessionIds.length : 0}
            sessionIndex={sessionIndex}
            complete={sessionMode === "review" && sessionComplete}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
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
            online={online}
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
  activeCard?: Flashcard;
  sessionLength: number;
  sessionIndex: number;
  complete: boolean;
  revealed: boolean;
  onReveal: () => void;
  onAnswer: (remembered: boolean) => void;
  onFinish: () => void;
  onSpeak: (text: string) => void;
}

function FlashcardSession(props: SessionProps) {
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
  const card = props.activeCard;
  const displayGerman = card.article ? `${card.article} ${card.german}` : card.german;

  return (
    <section className="session-wrap" aria-live="polite">
      <div className="session-progress">
        <span>Dzisiejsza sesja</span>
        <strong>{props.sessionIndex + 1} / {props.sessionLength}</strong>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${((props.sessionIndex + 1) / props.sessionLength) * 100}%` }} />
      </div>

      <article
        className={`flashcard ${props.revealed ? "revealed" : ""}`}
        onClick={!props.revealed ? props.onReveal : undefined}
      >
        <p className="category-chip">{card.category}</p>
        <button
          className="speak-button"
          onClick={(event) => {
            event.stopPropagation();
            props.onSpeak(displayGerman);
          }}
          aria-label={`Odtwórz wymowę: ${displayGerman}`}
        >
          <span aria-hidden="true">◖))</span>
        </button>
        <div className="flashcard-main">
          <p className="article-label">{card.article || "WYRAŻENIE"}</p>
          <h2>{card.german}</h2>
          {card.plural && <p className="plural">Plural: die {card.plural}</p>}
        </div>
        {!props.revealed ? (
          <button className="reveal-hint" onClick={props.onReveal}>
            Dotknij, żeby odkryć znaczenie
          </button>
        ) : (
          <div className="answer-panel">
            <strong>{card.polish}</strong>
            <button
              className="example-speak"
              onClick={(event) => {
                event.stopPropagation();
                props.onSpeak(card.exampleGerman);
              }}
              aria-label="Odtwórz zdanie przykładowe"
            >
              <span aria-hidden="true">◖))</span>
            </button>
            <p lang="de">{card.exampleGerman}</p>
            <small>{card.examplePolish}</small>
          </div>
        )}
      </article>

      {props.revealed && (
        <div className="answer-actions">
          <button className="again-button" onClick={() => props.onAnswer(false)}>
            <span aria-hidden="true">↻</span>
            Powtórz
            <small>za 10 min</small>
          </button>
          <button className="know-button" onClick={() => props.onAnswer(true)}>
            <span aria-hidden="true">✓</span>
            Umiem
            <small>coraz później</small>
          </button>
        </div>
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
  if (props.activeCard || props.complete) return <FlashcardSession {...props} />;
  const newCount = props.cards.filter((card) => card.repetitions === 0).length;

  return (
    <>
      <section className="hero-copy">
        <p className="eyebrow">Guten Tag!</p>
        <h1>Mały krok.<br /><em>Großer Fortschritt.</em></h1>
        <p>Dziesięć kart wystarczy, by podtrzymać rytm.</p>
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
  if (props.activeCard || props.complete) return <FlashcardSession {...props} />;
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
        <div><strong>Jak działa plan?</strong><p>Po odpowiedzi „Umiem” karta wróci za 1, 3, 7 dni, a później coraz rzadziej.</p></div>
      </div>
    </section>
  );
}

function CollectionView({
  cards,
  online,
  onChange,
  onToast,
}: {
  cards: Flashcard[];
  online: boolean;
  onChange: (cards: Flashcard[]) => void;
  onToast: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Wszystkie");
  const [showGenerator, setShowGenerator] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<Flashcard | null>(null);
  const [draft, setDraft] = useState(emptyContent);

  const categories = ["Wszystkie", ...new Set(cards.map((card) => card.category))];
  const filtered = cards.filter((card) => {
    const phrase = `${card.german} ${card.polish}`.toLocaleLowerCase("pl-PL");
    return (
      (category === "Wszystkie" || card.category === category) &&
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

      <button className="ai-card" onClick={() => setShowGenerator(true)}>
        <span className="ai-spark" aria-hidden="true">✦</span>
        <span><strong>Ułóż nowy zestaw z AI</strong><small>{online ? "Wybierz temat i dodaj 5–20 kart" : "Dostępne po połączeniu z internetem"}</small></span>
        <span aria-hidden="true">›</span>
      </button>

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
              <span className="mini-category">{card.category}</span>
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

      {showGenerator && (
        <AiGenerator
          cards={cards}
          online={online}
          onClose={() => setShowGenerator(false)}
          onAccept={(generated) => {
            const incoming = generated.map((card) => toFlashcard(card, "ai"));
            const merged = mergeUnique(cards, incoming);
            onChange(merged.cards);
            setShowGenerator(false);
            onToast(
              merged.skipped
                ? `Dodano ${incoming.length - merged.skipped} kart, pominięto ${merged.skipped} duplikatów.`
                : `Dodano ${incoming.length} nowych fiszek.`,
            );
          }}
        />
      )}

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

function AiGenerator({
  cards,
  online,
  onClose,
  onAccept,
}: {
  cards: Flashcard[];
  online: boolean;
  onClose: () => void;
  onAccept: (cards: CardContent[]) => void;
}) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState<5 | 10 | 20>(10);
  const [generated, setGenerated] = useState<CardContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (topic.trim().length < 2) {
      setError("Wpisz temat składający się z co najmniej 2 znaków.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await generateCards(topic, count);
      setGenerated(result.filter((card) => !isDuplicate(card, cards)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się wygenerować fiszek.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="ai-title">
        <div className="modal-head">
          <div><p className="eyebrow">Generator A2</p><h2 id="ai-title">Nowy zestaw z AI</h2></div>
          <button className="close-button" onClick={onClose} aria-label="Zamknij">×</button>
        </div>
        {generated.length === 0 ? (
          <form onSubmit={submit}>
            <label className="field">
              <span>Temat fiszek</span>
              <input
                value={topic}
                maxLength={80}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="np. wizyta u dentysty"
                autoFocus
              />
              <small>{topic.length}/80</small>
            </label>
            <fieldset className="count-picker">
              <legend>Liczba kart</legend>
              {[5, 10, 20].map((value) => (
                <button
                  type="button"
                  key={value}
                  className={count === value ? "active" : ""}
                  onClick={() => setCount(value as 5 | 10 | 20)}
                >
                  {value}
                </button>
              ))}
            </fieldset>
            {!online && <p className="form-error">Połącz się z internetem, aby użyć generatora.</p>}
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button wide" disabled={!online || loading}>
              {loading ? "Tworzę fiszki…" : "Generuj zestaw ✦"}
            </button>
            <p className="privacy-note">Do AI wysyłamy wyłącznie wpisany temat i liczbę kart.</p>
          </form>
        ) : (
          <>
            <p className="preview-note">Sprawdź karty. Usuń te, których nie chcesz zapisywać.</p>
            <div className="generated-list">
              {generated.map((card) => (
                <article key={card.id}>
                  <span><strong>{card.article && `${card.article} `}{card.german}</strong><small>{card.polish}</small></span>
                  <button
                    aria-label={`Usuń ${card.german}`}
                    onClick={() => setGenerated((current) => current.filter((item) => item.id !== card.id))}
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
            <button
              className="primary-button wide"
              onClick={() => onAccept(generated)}
              disabled={generated.length === 0}
            >
              Dodaj {generated.length} {generated.length === 1 ? "kartę" : "kart"}
            </button>
          </>
        )}
      </section>
    </div>
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
  const categories = starterCategories.map((category) => {
    const all = cards.filter((card) => card.category === category);
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
          <span><strong>Wortschatz A2</strong><small>110 kart startowych · dane tylko na tym urządzeniu</small></span><span>1.0</span>
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
