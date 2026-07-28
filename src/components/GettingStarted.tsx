import { useEffect, useRef, useState } from "react";

export const ratingGuide = [
  {
    label: "Nie znam",
    timing: "za 3–5 fiszek",
    description: "Ta sama fiszka wróci, aby spokojnie zobaczyć ją jeszcze raz.",
    tone: "again",
  },
  {
    label: "Niepewnie",
    timing: "za 6–8 fiszek",
    description: "Usłyszysz słowo i wpiszesz je po niemiecku.",
    tone: "hard",
  },
  {
    label: "Znam",
    timing: "za 8–11 fiszek",
    description: "Wpiszesz słowo z polskiego tłumaczenia.",
    tone: "good",
  },
] as const;

export const exerciseGuide = [
  { icon: "◖))", title: "Odsłuch", description: "Słuchasz bez podpowiedzi i zapisujesz słowo." },
  { icon: "Aa", title: "Pisanie", description: "Tłumaczysz na niemiecki lub polski." },
  { icon: "1/3", title: "Wybór", description: "Wskazujesz jedno z trzech znaczeń." },
  { icon: "der", title: "Rodzajniki", description: "Ćwiczysz der, die i das przy rzeczownikach." },
] as const;

export function GettingStarted({
  name,
  onFinish,
}: {
  name: string;
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastStep = step === 1;

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const skipOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFinish();
    };
    window.addEventListener("keydown", skipOnEscape);
    return () => window.removeEventListener("keydown", skipOnEscape);
  }, [onFinish]);

  return (
    <main className="onboarding-gate">
      <section
        className="onboarding-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <header className="onboarding-header">
          <span className="brand-mark" aria-hidden="true">W</span>
          <button className="text-button" type="button" onClick={onFinish}>
            Pomiń
          </button>
        </header>

        <div className="onboarding-progress" aria-label={`Krok ${step + 1} z 2`}>
          <span className={step === 0 ? "active" : ""} />
          <span className={step === 1 ? "active" : ""} />
          <small>{step + 1} z 2</small>
        </div>

        {step === 0 ? (
          <div className="onboarding-content">
            <p className="eyebrow">Cześć, {name}</p>
            <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>
              Tak działa nauka.
            </h1>
            <p className="onboarding-lead">
              Nowe słowo zaczyna jako zwykła fiszka. Potem wraca w zadaniach,
              a dobrze zapamiętane słowa pojawiają się coraz rzadziej.
            </p>
            <div className="method-flow" aria-label="Fiszka, zadanie, powtórka">
              <span>Fiszka</span><b aria-hidden="true">→</b>
              <span>Zadanie</span><b aria-hidden="true">→</b>
              <span>Powtórka</span>
            </div>
            <p className="method-note">
              <strong>Powtórki rozłożone w czasie:</strong> trudne słowa wracają
              szybciej, a łatwe trafiają do dalszych przegródek.
            </p>
            <div className="rating-guide">
              {ratingGuide.map((item) => (
                <article className={`rating-guide-item ${item.tone}`} key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <small>{item.timing}</small>
                  </div>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="onboarding-content">
            <p className="eyebrow">Aktywne przypominanie</p>
            <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>
              Ćwiczysz na kilka sposobów.
            </h1>
            <p className="onboarding-lead">
              Aplikacja sprawdza znaczenie, pisownię, słuch i rodzajniki —
              zależnie od tego, jak dobrze znasz słowo.
            </p>
            <div className="exercise-guide">
              {exerciseGuide.map((item) => (
                <article key={item.title}>
                  <span aria-hidden="true">{item.icon}</span>
                  <div><strong>{item.title}</strong><p>{item.description}</p></div>
                </article>
              ))}
            </div>
            <p className="method-note">
              Błąd nie kończy nauki. Słowo po prostu wróci wcześniej w formie,
              która pomoże Ci je przypomnieć.
            </p>
          </div>
        )}

        <footer className="onboarding-actions">
          {step > 0 ? (
            <button className="secondary-button" type="button" onClick={() => setStep(0)}>
              Wstecz
            </button>
          ) : null}
          <button
            className="primary-button"
            type="button"
            onClick={() => lastStep ? onFinish() : setStep(1)}
          >
            {lastStep ? "Zaczynam naukę" : "Dalej"}
          </button>
        </footer>
      </section>
    </main>
  );
}
