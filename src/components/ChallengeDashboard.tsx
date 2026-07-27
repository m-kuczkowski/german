import {
  challengeTypeDescriptions,
  challengeTypeLabels,
} from "../lib/challenges";
import type { ChallengeType } from "../types";

const challengeIcons: Record<ChallengeType, string> = {
  article: "der",
  listening: "◖))",
  writing: "Aa",
  meaning: "1·3",
  mixed: "⋯",
};

interface ChallengeDashboardProps {
  available: Array<{ type: ChallengeType; count: number }>;
  selectedType: ChallengeType | null;
  onSelect: (type: ChallengeType) => void;
  onStart: (type: ChallengeType, count: number) => void;
}

export function ChallengeDashboard({
  available,
  selectedType,
  onSelect,
  onStart,
}: ChallengeDashboardProps) {
  return (
    <section className="challenges-page">
      <header className="page-heading challenge-heading">
        <p className="eyebrow">Dobrowolne utrwalanie</p>
        <h1>Wyzwania</h1>
        <p>
          Krótkie ćwiczenia wyłącznie z poznanych słów. Nie zmieniają planu
          codziennych powtórek.
        </p>
      </header>

      {available.length === 0 ? (
        <div className="empty-state challenge-empty">
          <span aria-hidden="true">◇</span>
          <strong>Najpierw poznaj kilka słów</strong>
          <p>Wyzwania pojawią się tutaj, gdy słowa osiągną etap „Znam”.</p>
        </div>
      ) : (
        <div className="challenge-list" aria-label="Wybierz rodzaj wyzwania">
          {available.map(({ type, count }) => {
            const selected = selectedType === type;
            const fixedSizes = [5, 10, 20].filter((size) => size <= count);
            return (
              <article className={`challenge-option ${selected ? "selected" : ""}`} key={type}>
                <button
                  type="button"
                  className="challenge-option-main"
                  onClick={() => onSelect(type)}
                  aria-expanded={selected}
                  aria-controls={`challenge-sizes-${type}`}
                >
                  <span className="challenge-option-icon" aria-hidden="true">
                    {challengeIcons[type]}
                  </span>
                  <span className="challenge-option-copy">
                    <strong>{challengeTypeLabels[type]}</strong>
                    <small>{challengeTypeDescriptions[type]}</small>
                  </span>
                  <span className="challenge-option-count">
                    <strong>{count}</strong>
                    <small>{count === 1 ? "słowo" : "słów"}</small>
                  </span>
                </button>

                {selected && (
                  <div
                    className="challenge-size-picker"
                    id={`challenge-sizes-${type}`}
                    aria-label="Wybierz liczbę zadań"
                  >
                    <span>Ile zadań?</span>
                    <div>
                      {fixedSizes.map((size) => (
                        <button key={size} type="button" onClick={() => onStart(type, size)}>
                          {size}
                        </button>
                      ))}
                      <button
                        className="all"
                        type="button"
                        onClick={() => onStart(type, count)}
                      >
                        Wszystkie · {count}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
