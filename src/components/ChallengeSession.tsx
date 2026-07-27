import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  challengeExercise,
  cleanChallengeGerman,
  evaluateChallengeAnswer,
  type ChallengeEvaluation,
} from "../lib/challenges";
import { categoryTitle } from "../lib/learning";
import { preloadGermanAudio } from "../lib/speech";
import type {
  ChallengeAnswer,
  ChallengeItem,
  ChallengeSession as ChallengeSessionState,
  Flashcard,
} from "../types";

interface ChallengeSessionProps {
  cards: Flashcard[];
  session: ChallengeSessionState;
  onAnswer: (
    item: ChallengeItem,
    answerValue: string,
    evaluation: ChallengeEvaluation,
  ) => void;
  onNext: () => void;
  onSpeak: (cardId: string, text: string) => void;
}

export function ChallengeSession({
  cards,
  session,
  onAnswer,
  onNext,
  onSpeak,
}: ChallengeSessionProps) {
  const item = session.queue[session.index];
  const card = cards.find((candidate) => candidate.id === item?.cardId);
  const exercise = useMemo(
    () => item && card
      ? challengeExercise(card, cards, session.index, item.mode)
      : null,
    [card, cards, item, session.index],
  );
  const outcome: ChallengeAnswer | null = session.pendingAnswer;
  const [selectedValue, setSelectedValue] = useState(
    outcome && item?.mode.startsWith("choice") ? outcome.answerValue : "",
  );
  const [typedAnswer, setTypedAnswer] = useState(
    outcome && item && !item.mode.startsWith("choice") ? outcome.answerValue : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(Boolean(outcome));

  useEffect(() => {
    if (card) preloadGermanAudio(card.id);
  }, [card]);

  if (!item || !card || !exercise) return null;

  const currentItem = item;
  const currentCard = card;
  const currentExercise = exercise;
  const isArticle = item.mode === "choice-article";
  const isListening = item.mode === "type-listen-de";
  const isChoice = item.mode.startsWith("choice");
  const germanLabel = cleanChallengeGerman(
    card.article ? `${card.article} ${card.german}` : card.german,
  );
  const score = outcome ? Math.round(outcome.score * 100) : null;

  function submit(value: string) {
    if (!value.trim() || outcome || submittedRef.current) return;
    submittedRef.current = true;
    const evaluation = evaluateChallengeAnswer(
      currentItem,
      currentCard,
      cards,
      session.index,
      value,
    );
    onAnswer(currentItem, value, evaluation);
    inputRef.current?.blur();
  }

  function submitTyped(event: FormEvent) {
    event.preventDefault();
    submit(typedAnswer);
  }

  function choose(value: string) {
    if (outcome) return;
    setSelectedValue(value);
    submit(value);
  }

  function playListeningPrompt() {
    if (!currentExercise.speechPrompt) return;
    onSpeak(currentCard.id, currentExercise.speechPrompt);
    window.setTimeout(() => inputRef.current?.focus(), 220);
  }

  return (
    <section className={`session-wrap challenge-session ${outcome ? "has-outcome" : ""}`}>
      <div className="session-progress">
        <span>Wyzwanie</span>
        <strong>{session.index + 1} / {session.queue.length}</strong>
      </div>
      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${((session.index + 1) / session.queue.length) * 100}%` }} />
      </div>

      <article className={`exercise-card challenge-exercise-card ${isArticle ? "article-challenge" : ""}`}>
        <div className="exercise-meta">
          <p className="category-chip">
            {categoryTitle(card.category).replace(/\s*\([^)]*\)$/, "")}
          </p>
          <span>
            {isArticle
              ? "Rodzajnik"
              : isListening
                ? "Ze słuchu"
                : isChoice
                  ? "Wybór znaczenia"
                  : "Wpisywanie"}
          </span>
        </div>

        {!outcome && (
          <>
            {isArticle ? (
              <div className="article-prompt">
                <p>Wybierz właściwy rodzajnik</p>
                <div lang="de">
                  <span aria-hidden="true">___</span>
                  <strong className={card.german.length > 18 ? "long-word" : undefined}>
                    {cleanChallengeGerman(card.german)}
                  </strong>
                </div>
              </div>
            ) : (
              <>
                <p className="exercise-instruction">{exercise.instruction}</p>
                <div className={`exercise-prompt ${isListening ? "listening-exercise-prompt" : ""}`}>
                  {isListening ? (
                    <button
                      type="button"
                      className="listening-prompt"
                      onClick={playListeningPrompt}
                      aria-label="Odtwórz niemieckie słowo"
                    >
                      <span aria-hidden="true">◖))</span>
                      <strong>Odtwórz słowo</strong>
                      <small>Niemieckie słowo pozostaje ukryte</small>
                    </button>
                  ) : (
                    <h2 lang={exercise.promptLanguage}>{exercise.prompt}</h2>
                  )}
                </div>
              </>
            )}

            {isChoice ? (
              <div
                className={isArticle ? "article-answer-bar" : "choice-list"}
                role="group"
                aria-label={exercise.instruction}
              >
                {exercise.options.map((option, index) => (
                  <button
                    key={option.cardId}
                    type="button"
                    onClick={() => choose(option.cardId)}
                  >
                    {!isArticle && (
                      <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
                    )}
                    <strong lang={exercise.answerLanguage}>{option.label}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <form className="typing-exercise" onSubmit={submitTyped}>
                <div className="typing-row">
                  <label>
                    <span className="sr-only">{exercise.instruction}</span>
                    <input
                      lang="de"
                      ref={inputRef}
                      value={typedAnswer}
                      onChange={(event) => setTypedAnswer(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        submit(typedAnswer);
                      }}
                      placeholder={exercise.inputPlaceholder}
                      autoCapitalize="none"
                      autoComplete="off"
                      spellCheck={false}
                      enterKeyHint="done"
                      autoFocus={!isListening}
                    />
                  </label>
                  <button
                    className="typing-submit"
                    type="submit"
                    onPointerDown={(event) => event.preventDefault()}
                    disabled={!typedAnswer.trim()}
                    aria-label="Sprawdź odpowiedź"
                  >
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
                <small className="typing-hint">
                  Tekst w nawiasie jest opcjonalny. „Gotowe” sprawdza odpowiedź.
                </small>
              </form>
            )}
          </>
        )}

        {outcome && (
          <div className={`exercise-feedback challenge-feedback ${outcome.correct ? "correct" : "incorrect"}`} role="status">
            <span className="feedback-icon" aria-hidden="true">{outcome.correct ? "✓" : "×"}</span>
            <div>
              <strong>{outcome.correct ? "Poprawnie" : "Jeszcze do utrwalenia"}</strong>
              {score !== null && !isChoice && (
                <small className="similarity-score">Zgodność odpowiedzi: {score}%</small>
              )}
              <div className="result-word-pair">
                <p lang="de"><b>{germanLabel}</b>{card.plural ? ` · die ${card.plural}` : ""}</p>
                <p>{card.polish}</p>
              </div>
              <div className="context-example">
                <small>W kontekście</small>
                <p lang="de">{card.exampleGerman}</p>
                <p>{card.examplePolish}</p>
              </div>
              <p className="challenge-schedule-note">
                {outcome.correct
                  ? "Ta umiejętność została utrwalona."
                  : "Ta umiejętność trafiła do trudniejszych słów."}
                {" "}Termin zwykłej powtórki pozostaje bez zmian.
              </p>
            </div>
            <button
              className="feedback-speak"
              onClick={() => onSpeak(card.id, germanLabel)}
              aria-label={`Odtwórz wymowę: ${germanLabel}`}
            >
              <span aria-hidden="true">◖))</span>
            </button>
          </div>
        )}
      </article>

      {outcome && (
        <div className="next-action-bar">
          <button className="primary-button wide continue-button" onClick={onNext}>
            Dalej <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </section>
  );
}
