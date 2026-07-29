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

export const methodologyGuide = [
  {
    number: "01",
    title: "Przypominasz sobie",
    description: "Samodzielna odpowiedź utrwala pamięć lepiej niż samo ponowne czytanie.",
  },
  {
    number: "02",
    title: "Wracasz w odstępach",
    description: "Powtórki są rozłożone w czasie, zamiast skupione w jednej sesji.",
  },
  {
    number: "03",
    title: "Utrwalasz przez sesje",
    description: "Słowo musi być poprawnie odtworzone więcej niż raz i w różne dni.",
  },
] as const;

export const methodologySources = [
  {
    label: "Roediger i Karpicke, 2006",
    url: "https://pubmed.ncbi.nlm.nih.gov/16507066/",
  },
  {
    label: "Dunlosky i in., 2013",
    url: "https://pubmed.ncbi.nlm.nih.gov/26173288/",
  },
  {
    label: "Rawson i Dunlosky, 2013",
    url: "https://pubmed.ncbi.nlm.nih.gov/23088488/",
  },
] as const;

export const onboardingStepCount = 3;

export function GettingStarted({
  name,
  onFinish,
}: {
  name: string;
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const lastStep = step === onboardingStepCount - 1;

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

        <div
          className="onboarding-progress"
          aria-label={`Krok ${step + 1} z ${onboardingStepCount}`}
        >
          {Array.from({ length: onboardingStepCount }, (_, index) => (
            <span className={step === index ? "active" : ""} key={index} />
          ))}
          <small>{step + 1} z {onboardingStepCount}</small>
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
        ) : step === 1 ? (
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
        ) : (
          <div className="onboarding-content methodology-content">
            <p className="eyebrow">Dlaczego to działa</p>
            <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>
              Pamięć potrzebuje powrotów.
            </h1>
            <p className="onboarding-lead">
              Łączymy system przegródek Leitnera z trzema dobrze zbadanymi
              zasadami uczenia się.
            </p>
            <div className="leitner-method" aria-label="Pięć przegródek od częstych do rzadkich powtórek">
              <small>Częściej</small>
              <div aria-hidden="true">
                {[1, 2, 3, 4, 5].map((box) => <span key={box}>{box}</span>)}
              </div>
              <small>Rzadziej</small>
            </div>
            <p className="leitner-explanation">
              Poprawna aktywna odpowiedź przesuwa słowo dalej. Błąd przybliża
              je do przegródki 1. Samo kliknięcie „Znam” nie oznacza jeszcze
              opanowania.
            </p>
            <div className="methodology-guide">
              {methodologyGuide.map((item) => (
                <article key={item.number}>
                  <span aria-hidden="true">{item.number}</span>
                  <div><strong>{item.title}</strong><p>{item.description}</p></div>
                </article>
              ))}
            </div>
            <div className="methodology-sources">
              <strong>Podstawa naukowa</strong>
              <p>
                {methodologySources.map((source, index) => (
                  <span key={source.url}>
                    {index > 0 ? " · " : ""}
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.label}
                    </a>
                  </span>
                ))}
              </p>
            </div>
          </div>
        )}

        <footer className="onboarding-actions">
          {step > 0 ? (
            <button
              className="secondary-button"
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
              Wstecz
            </button>
          ) : null}
          <button
            className="primary-button"
            type="button"
            onClick={() => lastStep
              ? onFinish()
              : setStep((current) => Math.min(onboardingStepCount - 1, current + 1))}
          >
            {lastStep ? "Zaczynam naukę" : "Dalej"}
          </button>
        </footer>
      </section>
    </main>
  );
}
