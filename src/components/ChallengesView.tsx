import { useState } from "react";
import {
  availableChallengeTypes,
  challengeComplete,
  type ChallengeEvaluation,
} from "../lib/challenges";
import type {
  ChallengeItem,
  ChallengeSession as ChallengeSessionState,
  ChallengeType,
  Flashcard,
} from "../types";
import { ChallengeDashboard } from "./ChallengeDashboard";
import { ChallengeSession } from "./ChallengeSession";
import { ChallengeSummary } from "./ChallengeSummary";

interface ChallengesViewProps {
  cards: Flashcard[];
  session: ChallengeSessionState | null;
  onStart: (type: ChallengeType, count: number) => void;
  onAnswer: (
    item: ChallengeItem,
    answerValue: string,
    evaluation: ChallengeEvaluation,
  ) => void;
  onNext: () => void;
  onRepeatMistakes: () => void;
  onFinish: () => void;
  onSpeak: (cardId: string, text: string) => void;
}

export function ChallengesView({
  cards,
  session,
  onStart,
  onAnswer,
  onNext,
  onRepeatMistakes,
  onFinish,
  onSpeak,
}: ChallengesViewProps) {
  const [selectedType, setSelectedType] = useState<ChallengeType | null>(null);

  if (!session) {
    return (
      <ChallengeDashboard
        available={availableChallengeTypes(cards)}
        selectedType={selectedType}
        onSelect={(type) => setSelectedType((current) => current === type ? null : type)}
        onStart={onStart}
      />
    );
  }

  if (challengeComplete(session)) {
    return (
      <ChallengeSummary
        cards={cards}
        session={session}
        onRepeatMistakes={onRepeatMistakes}
        onFinish={onFinish}
      />
    );
  }

  return (
    <ChallengeSession
      key={`${session.startedAt}:${session.index}`}
      cards={cards}
      session={session}
      onAnswer={onAnswer}
      onNext={onNext}
      onSpeak={onSpeak}
    />
  );
}
