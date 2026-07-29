function present(value, fallback) {
  return value === null || value === undefined ? fallback : value;
}

export function mapCatalogRow(row) {
  return {
    id: row.id,
    german: row.german,
    polish: row.polish,
    article: row.article,
    plural: row.plural,
    exampleGerman: row.example_german,
    examplePolish: row.example_polish,
    category: row.category,
    curriculumTier: row.curriculum_tier,
    ...(row.word_family_id ? { wordFamilyId: row.word_family_id } : {}),
    ...(row.word_family_role ? { wordFamilyRole: row.word_family_role } : {}),
    ...(Array.isArray(row.prerequisite_ids) ? { prerequisiteIds: row.prerequisite_ids } : {}),
    ...(Array.isArray(row.word_parts) ? { wordParts: row.word_parts } : {}),
    level: row.level,
    sourceLabel: row.source_label,
    sourceUrl: row.source_url,
    sourceGloss: row.source_gloss,
    sourceLanguage: row.source_language,
  };
}

export function mapProgressRows(rows, historyRows) {
  const historyByCard = new Map();
  for (const event of historyRows) {
    const history = historyByCard.get(event.card_id) ?? [];
    history.push({
      id: event.event_id,
      reviewedAt: event.reviewed_at,
      mode: event.mode,
      rating: event.rating,
      correct: event.correct,
      score: event.score === null ? null : Number(event.score),
      fromBox: Number(event.from_box),
      toBox: Number(event.to_box),
      scheduledFor: event.scheduled_for,
      reason: event.reason,
    });
    historyByCard.set(event.card_id, history);
  }

  return rows.map((row) => {
    const legacy = row.data ?? {};
    return {
      id: row.card_id,
      repetitions: present(row.repetitions, legacy.repetitions),
      intervalDays: present(row.interval_days, legacy.intervalDays),
      ease: Number(present(row.ease, legacy.ease)),
      dueAt: present(row.due_at, legacy.dueAt),
      learned: present(row.learned, legacy.learned),
      lapses: present(row.lapses, legacy.lapses),
      stage: present(row.stage, legacy.stage),
      correctStreak: present(row.correct_streak, legacy.correctStreak),
      successfulModes: present(row.successful_modes, legacy.successfulModes ?? []),
      firstActiveRecallAt: present(row.first_active_recall_at, legacy.firstActiveRecallAt ?? null),
      lastActiveRecallAt: present(row.last_active_recall_at, legacy.lastActiveRecallAt ?? null),
      lastReviewedAt: present(row.last_reviewed_at, legacy.lastReviewedAt ?? null),
      typedAttempts: present(row.typed_attempts, legacy.typedAttempts),
      typedSuccesses: present(row.typed_successes, legacy.typedSuccesses),
      leitnerBox: present(row.leitner_box, legacy.leitnerBox),
      reviewHistory: historyByCard.has(row.card_id)
        ? historyByCard.get(row.card_id)
        : legacy.reviewHistory ?? [],
      lastSchedulingReason: present(row.last_scheduling_reason, legacy.lastSchedulingReason),
      successfulReviewDays: present(
        row.successful_review_days,
        legacy.successfulReviewDays ?? [],
      ),
      challengeStats: legacy.challengeStats ?? {},
    };
  });
}

export function mapProfileMeta(row) {
  const legacy = row.meta ?? {};
  return {
    ...legacy,
    streak: present(row.streak, legacy.streak),
    lastStudyDate: present(row.last_study_date, legacy.lastStudyDate),
    completedToday: present(row.completed_today, legacy.completedToday),
    totalReviews: present(row.total_reviews, legacy.totalReviews),
    theme: present(row.theme, legacy.theme),
    contentVersion: present(row.content_version, legacy.contentVersion),
    activeSession: present(row.active_session, legacy.activeSession),
  };
}
