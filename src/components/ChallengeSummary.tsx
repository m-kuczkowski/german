import {
  challengeMistakes,
  challengeTypeLabels,
  cleanChallengeGerman,
} from "../lib/challenges";
import type { ChallengeSession, Flashcard } from "../types";

interface ChallengeSummaryProps {
  cards: Flashcard[];
  session: ChallengeSession;
  onRepeatMistakes: () => void;
  onFinish: () => void;
}

export function ChallengeSummary({
  cards,
  session,
  onRepeatMistakes,
  onFinish,
}: ChallengeSummaryProps) {
  const mistakes = challengeMistakes(session);
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const accuracy = session.answers.length
    ? Math.round((session.correct / session.answers.length) * 100)
    : 0;

  return (
    <section className="challenge-summary" aria-live="polite">
      <div className="completion-icon" aria-hidden="true">✓</div>
      <p className="eyebrow">{challengeTypeLabels[session.type]}</p>
      <h1>Wyzwanie ukończone</h1>
      <p>Spokojna powtórka gotowa. Terminy Leitnera pozostały bez zmian.</p>

      <div className="challenge-summary-stats">
        <span><strong>{session.correct}</strong><small>poprawnych</small></span>
        <span><strong>{accuracy}%</strong><small>trafień</small></span>
        <span><strong>{session.answers.length}</strong><small>przećwiczonych</small></span>
      </div>

      {mistakes.length > 0 && (
        <div className="challenge-mistakes">
          <small>Do krótkiej poprawki</small>
          <ul>
            {mistakes.map((answer) => {
              const card = cardById.get(answer.cardId);
              if (!card) return null;
              const label = cleanChallengeGerman(
                card.article ? `${card.article} ${card.german}` : card.german,
              );
              return (
                <li key={`${answer.cardId}-${answer.mode}`}>
                  <strong lang="de">{label}</strong>
                  <span>{card.polish}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="challenge-summary-actions">
        {mistakes.length > 0 && (
          <button className="secondary-button wide" onClick={onRepeatMistakes}>
            Powtórz błędne · {mistakes.length}
          </button>
        )}
        <button className="primary-button wide" onClick={onFinish}>Zakończ</button>
      </div>
    </section>
  );
}
