import { useEffect, useState } from "react";
import { grammarLevels, grammarSourceNote, grammarTopicsById } from "../data/grammarCatalog";
import {
  dueGrammarTopics,
  evaluateGrammarAnswer,
  grammarProgressFor,
  grammarSessionComplete,
  grammarSessionExercise,
  recommendedGrammarTopic,
} from "../lib/grammar";
import type {
  GrammarExercise,
  GrammarSession,
  GrammarSessionAnswer,
  GrammarTopic,
  GrammarTopicProgress,
} from "../types";

type GrammarAnswerInput = Omit<GrammarSessionAnswer, "answeredAt">;

function statusLabel(progress: GrammarTopicProgress): string {
  if (progress.status === "mastered") return "Utrwalone";
  if (progress.status === "review") return "W powtórkach";
  if (progress.status === "learning") return "W nauce";
  return "Nowy temat";
}

function reviewLabel(value: string | null): string {
  if (!value) return "Po pierwszej lekcji";
  const date = new Date(value);
  if (date.getTime() <= Date.now()) return "Gotowe do powtórki";
  return `Powtórka: ${date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}`;
}

function exerciseAnswerValue(exercise: GrammarExercise, typed: string, ordered: string[]): string {
  return exercise.type === "word-order" ? ordered.join(" ") : typed;
}

function GrammarExerciseCard({
  session,
  onAnswer,
  onNext,
  onAbort,
  onTheory,
  onSpeak,
}: {
  session: GrammarSession;
  onAnswer: (answer: GrammarAnswerInput) => void;
  onNext: () => void;
  onAbort: () => void;
  onTheory: (topic: GrammarTopic) => void;
  onSpeak: (id: string, text: string) => void;
}) {
  const exercise = grammarSessionExercise(session);
  const item = session.queue[session.index];
  const [typed, setTyped] = useState("");
  const [ordered, setOrdered] = useState<string[]>([]);
  const [availableTokens, setAvailableTokens] = useState<string[]>([]);
  const pending = session.pendingAnswer;

  useEffect(() => {
    setTyped("");
    setOrdered([]);
    setAvailableTokens(exercise?.tokens ?? []);
  }, [exercise?.id]);

  if (!exercise || !item) {
    return <p>Nie udało się odnaleźć tego ćwiczenia. Wróć do listy tematów i spróbuj ponownie.</p>;
  }

  const value = exerciseAnswerValue(exercise, typed, ordered);
  const choice = exercise.type === "multiple-choice" || exercise.type === "case-choice";
  const canCheck = choice || (exercise.type === "word-order" ? ordered.length > 0 : typed.trim().length > 0);
  const topic = grammarTopicsById.get(item.topicId);

  function answer(answerValue: string) {
    if (pending || !exercise) return;
    const evaluation = evaluateGrammarAnswer(exercise, answerValue);
    onAnswer({
      topicId: item.topicId,
      exerciseId: item.exerciseId,
      answerValue,
      correct: evaluation.correct,
      score: evaluation.score,
    });
  }

  function addToken(token: string, index: number) {
    if (pending) return;
    setOrdered((current) => [...current, token]);
    setAvailableTokens((current) => current.filter((_, tokenIndex) => tokenIndex !== index));
  }

  function removeToken(token: string, index: number) {
    if (pending) return;
    setOrdered((current) => current.filter((_, tokenIndex) => tokenIndex !== index));
    setAvailableTokens((current) => [...current, token]);
  }

  return (
    <section className="grammar-session" aria-live="polite">
      <div className="lesson-progress-row">
        <span>{session.kind === "review" ? "Powtórka gramatyki" : "Lekcja gramatyki"}</span>
        <strong>{Math.min(session.index + 1, session.queue.length)} / {session.queue.length}</strong>
        {topic?.theory && <button className="session-theory-button" type="button" onClick={() => onTheory(topic)}>Teoria</button>}
        <button className="abort-lesson" type="button" onClick={onAbort}>× Przerwij</button>
      </div>
      <div className="progress-track" aria-label={`Ćwiczenie ${session.index + 1} z ${session.queue.length}`}>
        <span style={{ width: `${((session.index + 1) / session.queue.length) * 100}%` }} />
      </div>

      <article className="grammar-exercise-card">
        <div className="grammar-card-meta">
          <span>{topic?.level} · {topic?.titlePl}</span>
          <span>{exercise.type === "word-order" ? "Szyk" : "Ćwiczenie"}</span>
        </div>
        <p className="grammar-instruction">{exercise.instruction}</p>
        <h1 className="grammar-prompt">{exercise.prompt}</h1>
        {exercise.promptTranslation && <p className="grammar-prompt-translation">{exercise.promptTranslation}</p>}

        {choice && (
          <div className="grammar-options">
            {exercise.options?.map((option) => (
              <button
                key={option.id}
                className={`grammar-option ${pending && option.text === exercise.answer ? "correct-answer" : ""}`}
                type="button"
                disabled={Boolean(pending)}
                onClick={() => answer(option.text)}
              >
                {option.text}
              </button>
            ))}
          </div>
        )}

        {exercise.type === "word-order" && (
          <div className="word-order-area">
            <div className="word-order-answer" aria-label="Ułożone zdanie">
              {ordered.length ? ordered.map((token, index) => (
                <button type="button" key={`${token}-${index}`} disabled={Boolean(pending)} onClick={() => removeToken(token, index)}>{token}</button>
              )) : <span>Dotykaj wyrazów poniżej, aby ułożyć zdanie.</span>}
            </div>
            <div className="word-order-tokens" aria-label="Dostępne wyrazy">
              {availableTokens.map((token, index) => (
                <button type="button" key={`${token}-${index}`} disabled={Boolean(pending)} onClick={() => addToken(token, index)}>{token}</button>
              ))}
            </div>
          </div>
        )}

        {!choice && exercise.type !== "word-order" && (
          <div className="grammar-input-row">
            <input
              value={typed}
              disabled={Boolean(pending)}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.preventDefault();
              }}
              autoCapitalize="sentences"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="done"
              aria-label="Twoja odpowiedź po niemiecku"
              placeholder="Wpisz odpowiedź"
            />
            <button
              className="grammar-submit"
              type="button"
              disabled={!canCheck || Boolean(pending)}
              aria-label="Sprawdź odpowiedź"
              onClick={() => answer(value)}
            >
              →
            </button>
          </div>
        )}

        {!pending && !choice && (
          <div className="grammar-actions">
            {exercise.type === "word-order" && (
              <button className="primary-button" type="button" disabled={!canCheck} onClick={() => answer(value)}>Sprawdź</button>
            )}
            <button className="quiet-action" type="button" onClick={() => answer("")}>Nie wiem — pokaż rozwiązanie</button>
          </div>
        )}

        {pending && (
          <section className={`grammar-feedback ${pending.correct ? "is-correct" : "is-incorrect"}`}>
            <p className="eyebrow">{pending.correct ? "Dobra odpowiedź" : "Sprawdź to jeszcze"}</p>
            <h2>{pending.correct ? "Tak jest." : `Poprawnie: ${exercise.answer}`}</h2>
            <p>{exercise.explanation}</p>
            <div className="grammar-context">
              <span>W kontekście</span>
              <strong>{exercise.contextGerman}</strong>
              <small>{exercise.contextPolish}</small>
              <button className="listen-button" type="button" onClick={() => onSpeak(`grammar-${exercise.id}`, exercise.contextGerman)}>◖ Odsłuchaj</button>
            </div>
            <button className="primary-button wide" type="button" onClick={onNext}>
              {session.index + 1 >= session.queue.length ? "Zobacz wynik" : "Dalej →"}
            </button>
          </section>
        )}
      </article>
    </section>
  );
}

function GrammarSummary({
  session,
  onFinish,
}: {
  session: GrammarSession;
  onFinish: () => void;
}) {
  const percentage = session.answers.length
    ? Math.round((session.correct / session.answers.length) * 100)
    : 0;
  return (
    <section className="grammar-summary">
      <div className="completion-icon" aria-hidden="true">✓</div>
      <p className="eyebrow">{session.kind === "review" ? "Powtórka skończona" : "Lekcja skończona"}</p>
      <h1>{percentage >= 80 ? "Dobra robota." : "Jeszcze jedna runda pomoże."}</h1>
      <div className="grammar-summary-stats">
        <span><strong>{session.answers.length}</strong> ćwiczeń</span>
        <span><strong>{percentage}%</strong> poprawnych</span>
        <span><strong>{session.mistakes}</strong> do utrwalenia</span>
      </div>
      <p>Błędy wrócą w tej sesji lub w następnej powtórce. Postęp gramatyki jest niezależny od Twoich fiszek.</p>
      <button className="primary-button wide" type="button" onClick={onFinish}>Wróć do gramatyki</button>
    </section>
  );
}

export function GrammarTheoryView({
  topic,
  onBack,
  onStart,
  onSpeak,
  mode = "before-lesson",
}: {
  topic: GrammarTopic;
  onBack: () => void;
  onStart: () => void;
  onSpeak: (id: string, text: string) => void;
  mode?: "before-lesson" | "during-lesson";
}) {
  const theory = topic.theory;
  if (!theory) return null;
  const duringLesson = mode === "during-lesson";
  return (
    <section className="grammar-theory-page">
      <button className="back-link" type="button" onClick={onBack}>← {duringLesson ? "Wróć do ćwiczenia" : "Gramatyka"}</button>
      <header className="grammar-theory-header">
        <div className="grammar-card-meta"><span>{topic.level} · Teoria</span><span>{topic.titleDe}</span></div>
        <h1>{topic.titlePl}</h1>
        <p>{topic.goalPl}</p>
      </header>

      <section className="theory-section">
        <p className="eyebrow">Najpierw zrozum</p>
        <h2>O co tutaj chodzi?</h2>
        <p>{topic.explanation}</p>
        {topic.pattern && (
          <div className="theory-pattern">
            <span>Wzór</span>
            <strong>{topic.pattern}</strong>
          </div>
        )}
      </section>

      <section className="theory-section">
        <p className="eyebrow">Najważniejsze zasady</p>
        <h2>Zapamiętaj te trzy rzeczy</h2>
        <ol className="theory-rules">
          {theory.rules.map((rule, index) => (
            <li key={rule}><span>{index + 1}</span><p>{rule}</p></li>
          ))}
        </ol>
      </section>

      <section className="theory-section">
        <p className="eyebrow">Przykłady</p>
        <h2>Zobacz regułę w zdaniu</h2>
        <div className="theory-examples">
          {topic.examples.map((example, index) => (
            <article key={example.german}>
              <div>
                <strong>{example.german}</strong>
                <small>{example.polish}</small>
              </div>
              <button type="button" aria-label={`Odsłuchaj przykład ${index + 1}`} onClick={() => onSpeak(`grammar-theory-${topic.id}-${index}`, example.german)}>◖</button>
            </article>
          ))}
        </div>
      </section>

      <section className="theory-memory-card">
        <span aria-hidden="true">✦</span>
        <div><strong>Jak to zapamiętać?</strong><p>{theory.memoryTip}</p></div>
      </section>

      <section className="theory-section theory-mistake">
        <p className="eyebrow">Typowy błąd</p>
        <div className="mistake-comparison">
          <p><span aria-hidden="true">×</span><del>{theory.commonMistake.incorrect}</del></p>
          <p><span aria-hidden="true">✓</span><strong>{theory.commonMistake.correct}</strong></p>
        </div>
        <p>{theory.commonMistake.explanation}</p>
      </section>

      <div className={`theory-footer-actions ${duringLesson ? "single-action" : ""}`}>
        {!duringLesson && <button className="secondary-button" type="button" onClick={onBack}>Wróć</button>}
        <button className="primary-button" type="button" onClick={onStart}>{duringLesson ? "Wróć do ćwiczenia" : "Przejdź do ćwiczeń →"}</button>
      </div>
    </section>
  );
}

function TopicCard({
  topic,
  progress,
  onStart,
  onTheory,
}: {
  topic: GrammarTopic;
  progress: GrammarTopicProgress;
  onStart: () => void;
  onTheory: () => void;
}) {
  return (
    <article className={`grammar-topic-card ${topic.published ? "" : "is-planned"}`}>
      <div className="grammar-card-meta"><span>{topic.level} · {statusLabel(progress)}</span><span>{topic.published ? `${topic.exercises.length} ćwiczeń` : "W przygotowaniu"}</span></div>
      <h2>{topic.titlePl}</h2>
      <p className="topic-german-name">{topic.titleDe}</p>
      <p>{topic.goalPl}</p>
      {topic.published ? (
        <>
          <small>{reviewLabel(progress.nextReviewAt)}</small>
          <div className="grammar-topic-actions">
            <button className="secondary-button" type="button" onClick={onTheory}>Teoria</button>
            <button className="primary-button" type="button" onClick={onStart}>
              {progress.status === "new" ? "Rozpocznij" : "Ćwicz"}
            </button>
          </div>
        </>
      ) : <small>Publikujemy dopiero kompletne lekcje z wyjaśnieniem, przykładami i sprawdzonymi odpowiedziami.</small>}
    </article>
  );
}

function GrammarDashboard({
  topics,
  progress,
  onStartLesson,
  onStartReview,
  onOpenTheory,
}: {
  topics: GrammarTopic[];
  progress: GrammarTopicProgress[];
  onStartLesson: (topic: GrammarTopic) => void;
  onStartReview: () => void;
  onOpenTheory: (topic: GrammarTopic) => void;
}) {
  const due = dueGrammarTopics(topics, progress);
  const recommended = recommendedGrammarTopic(topics, progress);
  const mastered = progress.filter((item) => item.status === "mastered").length;
  const publishedCount = topics.filter((topic) => topic.published).length;

  return (
    <section className="grammar-dashboard">
      <div className="page-heading">
        <p className="eyebrow">Gramatyka A1–B1</p>
        <h1>Rozumiej regułę, a potem jej użyj.</h1>
        <p>Krótkie wyjaśnienie po polsku, przykłady i aktywne ćwiczenia po niemiecku.</p>
      </div>
      <section className="grammar-overview-card">
        <div><span>{due.length ? "Czekają powtórki" : "Dziś bez zaległości"}</span><strong>{due.length}</strong><small>{due.length === 1 ? "temat do powtórki" : "tematów do powtórki"}</small></div>
        <div><span>Utrwalone</span><strong>{mastered}</strong><small>z {publishedCount} dostępnych</small></div>
        {due.length > 0 && <button className="primary-button" type="button" onClick={onStartReview}>Zrób powtórkę</button>}
      </section>
      {recommended && (
        <section className="grammar-recommendation">
          <p className="eyebrow">Polecany następny krok</p>
          <h2>{recommended.titlePl}</h2>
          <p>{recommended.goalPl}</p>
          <div className="grammar-recommendation-actions">
            <button className="secondary-button" type="button" onClick={() => onOpenTheory(recommended)}>Teoria</button>
            <button className="primary-button" type="button" onClick={() => onStartLesson(recommended)}>Rozpocznij lekcję</button>
          </div>
        </section>
      )}
      <section className="grammar-method-note">
        <strong>Jak działają powtórki?</strong>
        <p>Po lekcji temat wraca po 1, 3, 7, 14, 30 i 60 dniach. Nieudana odpowiedź wraca szybciej w tej samej sesji.</p>
      </section>
      {grammarLevels().map((level) => {
        const levelTopics = topics.filter((topic) => topic.level === level);
        return (
          <section key={level} className="grammar-level-section">
            <div className="section-heading"><h2>{level}</h2><span>{level === "A2" ? "Pomost do B1" : level === "A1" ? "Fundamenty" : "Komunikacja B1"}</span></div>
            <div className="grammar-topic-grid">
              {levelTopics.map((topic) => <TopicCard key={topic.id} topic={topic} progress={grammarProgressFor(progress, topic.id)} onStart={() => onStartLesson(topic)} onTheory={() => onOpenTheory(topic)} />)}
            </div>
          </section>
        );
      })}
      <p className="grammar-source-note">{grammarSourceNote}</p>
    </section>
  );
}

export function GrammarView({
  topics,
  progress,
  session,
  onStartLesson,
  onStartReview,
  onAnswer,
  onNext,
  onFinish,
  onAbort,
  onSpeak,
}: {
  topics: GrammarTopic[];
  progress: GrammarTopicProgress[];
  session: GrammarSession | null;
  onStartLesson: (topic: GrammarTopic) => void;
  onStartReview: () => void;
  onAnswer: (answer: GrammarAnswerInput) => void;
  onNext: () => void;
  onFinish: () => void;
  onAbort: () => void;
  onSpeak: (id: string, text: string) => void;
}) {
  const [theoryTopic, setTheoryTopic] = useState<GrammarTopic | null>(null);
  if (session && grammarSessionComplete(session)) return <GrammarSummary session={session} onFinish={onFinish} />;
  if (session) {
    return (
      <>
        <div className={theoryTopic ? "grammar-session-suspended" : "grammar-session-container"} aria-hidden={theoryTopic ? true : undefined}>
          <GrammarExerciseCard session={session} onAnswer={onAnswer} onNext={onNext} onAbort={onAbort} onTheory={setTheoryTopic} onSpeak={onSpeak} />
        </div>
        {theoryTopic && (
          <div className="grammar-theory-during-session">
            <GrammarTheoryView
              topic={theoryTopic}
              mode="during-lesson"
              onBack={() => setTheoryTopic(null)}
              onStart={() => setTheoryTopic(null)}
              onSpeak={onSpeak}
            />
          </div>
        )}
      </>
    );
  }
  if (theoryTopic) {
    return (
      <GrammarTheoryView
        topic={theoryTopic}
        onBack={() => setTheoryTopic(null)}
        onStart={() => {
          setTheoryTopic(null);
          onStartLesson(theoryTopic);
        }}
        onSpeak={onSpeak}
      />
    );
  }
  return <GrammarDashboard topics={topics} progress={progress} onStartLesson={onStartLesson} onStartReview={onStartReview} onOpenTheory={setTheoryTopic} />;
}
