import { ActiveCountryCode, normalizeActiveCountry } from './platformLogic';
import { INTERACTIVE_QUESTIONS } from './interactiveSalesConfig';
import { BIRTHDAY_INTERACTIVE_QUESTIONS } from './birthdayInteractiveConfig';

export type FunnelCampaignId = 'reconcile-interactive' | 'birthday-interactive';

export type FunnelQuestionKey = 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6';

export type FunnelStepId =
  | 'intro'
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'q5'
  | 'q6'
  | 'result'
  | 'sample'
  | 'offer'
  | 'checkout_started';

export interface FunnelStepDefinition {
  id: FunnelStepId;
  index: number;
  label: string;
  shortLabel: string;
}

export const FUNNEL_STEPS: readonly FunnelStepDefinition[] = [
  { id: 'intro', index: 0, label: 'Opening Screen', shortLabel: 'Intro' },
  { id: 'q1', index: 1, label: 'Question 1', shortLabel: 'Q1' },
  { id: 'q2', index: 2, label: 'Question 2', shortLabel: 'Q2' },
  { id: 'q3', index: 3, label: 'Question 3', shortLabel: 'Q3' },
  { id: 'q4', index: 4, label: 'Question 4', shortLabel: 'Q4' },
  { id: 'q5', index: 5, label: 'Question 5', shortLabel: 'Q5' },
  { id: 'q6', index: 6, label: 'Question 6', shortLabel: 'Q6' },
  { id: 'result', index: 7, label: 'Personalized Result', shortLabel: 'Result' },
  { id: 'sample', index: 8, label: 'Interactive Demo', shortLabel: 'Demo' },
  { id: 'offer', index: 9, label: 'Offer & Pricing', shortLabel: 'Offer' },
  { id: 'checkout_started', index: 10, label: 'Started Checkout', shortLabel: 'Checkout' },
] as const;

export const FUNNEL_STEP_INDEX: Record<FunnelStepId, number> = {
  intro: 0,
  q1: 1,
  q2: 2,
  q3: 3,
  q4: 4,
  q5: 5,
  q6: 6,
  result: 7,
  sample: 8,
  offer: 9,
  checkout_started: 10,
};

export const FUNNEL_SESSIONS_STORAGE_KEY = 'ch_funnel_sessions_v1';

export interface FunnelSessionRecord {
  id: string;
  funnel: FunnelCampaignId;
  country: ActiveCountryCode;
  currentStep: FunnelStepId;
  furthestStep: FunnelStepId;
  furthestStepIndex: number;
  answeredCount: number;
  completedQuiz: boolean;
  answers: Partial<Record<FunnelQuestionKey, string>>;
  answerLabels: Partial<Record<FunnelQuestionKey, string>>;
  resultId?: string;
  resultTitle?: string;
  recommendedEdition?: 'chasing-her' | 'memories' | 'either';
  startedAt: string;
  updatedAt: string;
}

export interface FunnelStepMetric {
  step: FunnelStepId;
  label: string;
  shortLabel: string;
  reachedCount: number;
  reachedPercent: number;
  stoppedHereCount: number;
  dropOffFromPreviousPercent: number;
}

export interface QuestionAnswerBreakdownItem {
  optionId: string;
  label: string;
  count: number;
  percent: number;
}

export interface QuestionAnalyticsBreakdown {
  questionId: FunnelQuestionKey;
  number: number;
  prompt: string;
  totalResponses: number;
  options: QuestionAnswerBreakdownItem[];
}

export interface FunnelAnalyticsSummary {
  totalSessions: number;
  startedQuizCount: number;
  completedQuizCount: number;
  completedQuizRate: number;
  reachedSampleCount: number;
  reachedSampleRate: number;
  reachedOfferCount: number;
  reachedOfferRate: number;
  startedCheckoutCount: number;
  startedCheckoutRate: number;
  droppedBeforeResultCount: number;
  topDropOffStep: {
    step: FunnelStepId;
    label: string;
    stoppedCount: number;
  } | null;
  steps: FunnelStepMetric[];
}

export interface FunnelAnalyticsFilters {
  funnel?: 'all' | FunnelCampaignId;
  country?: 'all' | ActiveCountryCode;
  status?: 'all' | 'dropped' | 'completed' | 'checkout';
}

export function getFunnelQuestions(funnel: FunnelCampaignId) {
  return funnel === 'birthday-interactive'
    ? BIRTHDAY_INTERACTIVE_QUESTIONS
    : INTERACTIVE_QUESTIONS;
}

export function getFunnelDisplayName(funnel: FunnelCampaignId): string {
  return funnel === 'birthday-interactive'
    ? 'Birthday Interactive'
    : 'Win Her Back Interactive';
}

export function getFunnelStepLabel(step: FunnelStepId): string {
  return FUNNEL_STEPS.find((s) => s.id === step)?.label || step;
}

export function getFunnelStepShortLabel(step: FunnelStepId): string {
  return FUNNEL_STEPS.find((s) => s.id === step)?.shortLabel || step;
}

export function resolveOptionLabel(
  funnel: FunnelCampaignId,
  questionId: FunnelQuestionKey,
  optionId: string
): string {
  const questions = getFunnelQuestions(funnel);
  const question = questions.find((q) => q.id === questionId);
  const option = question?.options.find((o) => o.id === optionId);
  return option?.label || optionId;
}

export function createFunnelSession(
  funnel: FunnelCampaignId,
  country: string,
  nowIso?: string
): FunnelSessionRecord {
  const ts = nowIso || new Date().toISOString();
  const rand = Math.random().toString(36).slice(2, 8);
  const id = `fs_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);

  return {
    id,
    funnel,
    country: normalizeActiveCountry(country),
    currentStep: 'intro',
    furthestStep: 'intro',
    furthestStepIndex: 0,
    answeredCount: 0,
    completedQuiz: false,
    answers: {},
    answerLabels: {},
    startedAt: ts,
    updatedAt: ts,
  };
}

export function recordFunnelStep(
  session: FunnelSessionRecord,
  step: FunnelStepId,
  patch?: {
    questionId?: FunnelQuestionKey;
    optionId?: string;
    optionLabel?: string;
    resultId?: string;
    resultTitle?: string;
    recommendedEdition?: 'chasing-her' | 'memories' | 'either';
    nowIso?: string;
  }
): FunnelSessionRecord {
  const nextAnswers: Partial<Record<FunnelQuestionKey, string>> = {
    ...session.answers,
  };
  const nextLabels: Partial<Record<FunnelQuestionKey, string>> = {
    ...session.answerLabels,
  };

  if (patch?.questionId && patch.optionId) {
    nextAnswers[patch.questionId] = patch.optionId.slice(0, 64);
    const resolvedLabel =
      patch.optionLabel ||
      resolveOptionLabel(session.funnel, patch.questionId, patch.optionId);
    nextLabels[patch.questionId] = resolvedLabel.slice(0, 240);
  }

  const incomingIndex = FUNNEL_STEP_INDEX[step] ?? 0;
  const furthestStepIndex = Math.max(session.furthestStepIndex, incomingIndex);
  const furthestStep =
    FUNNEL_STEPS.find((s) => s.index === furthestStepIndex)?.id ||
    session.furthestStep;

  const answeredCount = (
    ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as FunnelQuestionKey[]
  ).filter((key) => Boolean(nextAnswers[key])).length;

  const completedQuiz =
    session.completedQuiz || furthestStepIndex >= FUNNEL_STEP_INDEX.result;

  return {
    ...session,
    currentStep: step,
    furthestStep,
    furthestStepIndex,
    answeredCount,
    completedQuiz,
    answers: nextAnswers,
    answerLabels: nextLabels,
    resultId: patch?.resultId ?? session.resultId,
    resultTitle: patch?.resultTitle ?? session.resultTitle,
    recommendedEdition: patch?.recommendedEdition ?? session.recommendedEdition,
    updatedAt: patch?.nowIso || new Date().toISOString(),
  };
}

export function getSessionOutcomeLabel(session: FunnelSessionRecord): {
  label: string;
  tone: 'emerald' | 'gold' | 'amber' | 'rose';
} {
  if (session.furthestStep === 'checkout_started') {
    return { label: 'Started Checkout', tone: 'emerald' };
  }
  if (session.furthestStep === 'offer') {
    return { label: 'Stopped at Offer', tone: 'gold' };
  }
  if (session.furthestStep === 'sample') {
    return { label: 'Stopped at Demo', tone: 'gold' };
  }
  if (session.furthestStep === 'result') {
    return { label: 'Stopped at Result', tone: 'amber' };
  }
  return {
    label: `Stopped at ${getFunnelStepShortLabel(session.furthestStep)}`,
    tone: 'rose',
  };
}

export function filterFunnelSessions(
  sessions: readonly FunnelSessionRecord[],
  filters?: FunnelAnalyticsFilters
): FunnelSessionRecord[] {
  return sessions.filter((s) => {
    if (filters?.funnel && filters.funnel !== 'all' && s.funnel !== filters.funnel) {
      return false;
    }
    if (filters?.country && filters.country !== 'all' && s.country !== filters.country) {
      return false;
    }
    if (filters?.status && filters.status !== 'all') {
      if (filters.status === 'dropped' && s.completedQuiz) return false;
      if (filters.status === 'completed' && !s.completedQuiz) return false;
      if (filters.status === 'checkout' && s.furthestStep !== 'checkout_started') {
        return false;
      }
    }
    return true;
  });
}

export function computeFunnelAnalytics(
  sessions: readonly FunnelSessionRecord[],
  filters?: FunnelAnalyticsFilters
): FunnelAnalyticsSummary {
  const filtered = filterFunnelSessions(sessions, filters);
  const totalSessions = filtered.length;

  const reachedCounts: Record<FunnelStepId, number> = {
    intro: 0,
    q1: 0,
    q2: 0,
    q3: 0,
    q4: 0,
    q5: 0,
    q6: 0,
    result: 0,
    sample: 0,
    offer: 0,
    checkout_started: 0,
  };

  const stoppedCounts: Record<FunnelStepId, number> = {
    intro: 0,
    q1: 0,
    q2: 0,
    q3: 0,
    q4: 0,
    q5: 0,
    q6: 0,
    result: 0,
    sample: 0,
    offer: 0,
    checkout_started: 0,
  };

  for (const session of filtered) {
    const maxIdx = Math.max(0, Math.min(10, session.furthestStepIndex));
    for (const def of FUNNEL_STEPS) {
      if (def.index <= maxIdx) {
        reachedCounts[def.id] += 1;
      }
    }
    const stoppedId = FUNNEL_STEPS[maxIdx]?.id || 'intro';
    stoppedCounts[stoppedId] += 1;
  }

  const pct = (num: number, denom: number) =>
    denom > 0 ? Math.round((num / denom) * 100) : 0;

  const steps: FunnelStepMetric[] = FUNNEL_STEPS.map((def, i) => {
    const reached = reachedCounts[def.id];
    const prevReached = i === 0 ? totalSessions : reachedCounts[FUNNEL_STEPS[i - 1].id];
    const dropFromPrev =
      i === 0 || prevReached === 0
        ? 0
        : Math.max(0, Math.round(((prevReached - reached) / prevReached) * 100));

    return {
      step: def.id,
      label: def.label,
      shortLabel: def.shortLabel,
      reachedCount: reached,
      reachedPercent: pct(reached, totalSessions),
      stoppedHereCount: stoppedCounts[def.id],
      dropOffFromPreviousPercent: dropFromPrev,
    };
  });

  // Identify top drop-off step strictly among non-terminal steps (intro through offer)
  let topDropOffStep: FunnelAnalyticsSummary['topDropOffStep'] = null;
  for (const stepMetric of steps) {
    if (stepMetric.step === 'checkout_started') continue;
    if (stepMetric.stoppedHereCount <= 0) continue;
    if (
      !topDropOffStep ||
      stepMetric.stoppedHereCount > topDropOffStep.stoppedCount
    ) {
      topDropOffStep = {
        step: stepMetric.step,
        label: stepMetric.label,
        stoppedCount: stepMetric.stoppedHereCount,
      };
    }
  }

  const startedQuizCount = reachedCounts.q1;
  const completedQuizCount = reachedCounts.result;
  const reachedSampleCount = reachedCounts.sample;
  const reachedOfferCount = reachedCounts.offer;
  const startedCheckoutCount = reachedCounts.checkout_started;
  const droppedBeforeResultCount = Math.max(0, totalSessions - completedQuizCount);

  return {
    totalSessions,
    startedQuizCount,
    completedQuizCount,
    completedQuizRate: pct(completedQuizCount, totalSessions),
    reachedSampleCount,
    reachedSampleRate: pct(reachedSampleCount, totalSessions),
    reachedOfferCount,
    reachedOfferRate: pct(reachedOfferCount, totalSessions),
    startedCheckoutCount,
    startedCheckoutRate: pct(startedCheckoutCount, totalSessions),
    droppedBeforeResultCount,
    topDropOffStep,
    steps,
  };
}

export function computeQuestionBreakdown(
  sessions: readonly FunnelSessionRecord[],
  funnel: FunnelCampaignId
): QuestionAnalyticsBreakdown[] {
  const funnelSessions = sessions.filter((s) => s.funnel === funnel);
  const questions = getFunnelQuestions(funnel);

  return questions.map((question) => {
    const counts = new Map<string, number>();
    let totalResponses = 0;

    for (const session of funnelSessions) {
      const selected = session.answers[question.id];
      if (selected) {
        counts.set(selected, (counts.get(selected) || 0) + 1);
        totalResponses += 1;
      }
    }

    const options: QuestionAnswerBreakdownItem[] = question.options.map((opt) => {
      const count = counts.get(opt.id) || 0;
      return {
        optionId: opt.id,
        label: opt.label,
        count,
        percent: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
      };
    });

    options.sort((a, b) => b.count - a.count);

    return {
      questionId: question.id,
      number: question.number,
      prompt: question.prompt,
      totalResponses,
      options,
    };
  });
}

export interface SanitizedFirestoreFunnelPayload {
  id: string;
  funnel: FunnelCampaignId;
  country: ActiveCountryCode;
  currentStep: FunnelStepId;
  furthestStep: FunnelStepId;
  furthestStepIndex: number;
  answeredCount: number;
  completedQuiz: boolean;
  answers: Record<string, string>;
  answerLabels: Record<string, string>;
  resultId?: string;
  resultTitle?: string;
  recommendedEdition?: 'chasing-her' | 'memories' | 'either';
}

const ALLOWED_QUESTION_KEYS: readonly FunnelQuestionKey[] = [
  'q1',
  'q2',
  'q3',
  'q4',
  'q5',
  'q6',
];

/**
 * Produces a strictly schema-compliant, zero-PII Firestore payload using native maps
 * (no JSON.stringify, bounded field sizes, strict allowlist of keys).
 */
export function sanitizeFunnelSessionForFirestore(
  session: FunnelSessionRecord
): SanitizedFirestoreFunnelPayload {
  const safeId =
    session.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) ||
    `fs_${Date.now()}`;

  const cleanAnswers: Record<string, string> = {};
  const cleanLabels: Record<string, string> = {};

  for (const key of ALLOWED_QUESTION_KEYS) {
    const optId = session.answers[key];
    if (typeof optId === 'string' && optId.trim().length > 0) {
      cleanAnswers[key] = optId.trim().slice(0, 64);
      const label =
        session.answerLabels[key] ||
        resolveOptionLabel(session.funnel, key, optId);
      cleanLabels[key] = label.trim().slice(0, 240);
    }
  }

  const furthestStepIndex = Math.max(
    0,
    Math.min(10, Math.round(session.furthestStepIndex || 0))
  );
  const furthestStep =
    FUNNEL_STEPS[furthestStepIndex]?.id || session.furthestStep || 'intro';

  const payload: SanitizedFirestoreFunnelPayload = {
    id: safeId,
    funnel:
      session.funnel === 'birthday-interactive'
        ? 'birthday-interactive'
        : 'reconcile-interactive',
    country: normalizeActiveCountry(session.country),
    currentStep: session.currentStep in FUNNEL_STEP_INDEX ? session.currentStep : 'intro',
    furthestStep,
    furthestStepIndex,
    answeredCount: Object.keys(cleanAnswers).length,
    completedQuiz: Boolean(
      session.completedQuiz || furthestStepIndex >= FUNNEL_STEP_INDEX.result
    ),
    answers: cleanAnswers,
    answerLabels: cleanLabels,
  };

  if (session.resultId && session.resultId.trim()) {
    payload.resultId = session.resultId.trim().slice(0, 64);
  }
  if (session.resultTitle && session.resultTitle.trim()) {
    payload.resultTitle = session.resultTitle.trim().slice(0, 200);
  }
  if (
    session.recommendedEdition === 'chasing-her' ||
    session.recommendedEdition === 'memories' ||
    session.recommendedEdition === 'either'
  ) {
    payload.recommendedEdition = session.recommendedEdition;
  }

  return payload;
}

export function mergeFunnelSessions(
  localSessions: readonly FunnelSessionRecord[],
  remoteSessions: readonly FunnelSessionRecord[]
): FunnelSessionRecord[] {
  const byId = new Map<string, FunnelSessionRecord>();

  const ingest = (item: FunnelSessionRecord) => {
    if (!item || !item.id) return;
    const prev = byId.get(item.id);
    if (!prev) {
      byId.set(item.id, item);
      return;
    }
    const prevTime = Date.parse(prev.updatedAt || '') || 0;
    const nextTime = Date.parse(item.updatedAt || '') || 0;
    if (
      nextTime > prevTime ||
      item.furthestStepIndex > prev.furthestStepIndex ||
      item.answeredCount > prev.answeredCount
    ) {
      byId.set(item.id, {
        ...prev,
        ...item,
        furthestStepIndex: Math.max(prev.furthestStepIndex, item.furthestStepIndex),
        furthestStep:
          item.furthestStepIndex >= prev.furthestStepIndex
            ? item.furthestStep
            : prev.furthestStep,
        answers: { ...prev.answers, ...item.answers },
        answerLabels: { ...prev.answerLabels, ...item.answerLabels },
      });
    }
  };

  for (const s of localSessions) ingest(s);
  for (const s of remoteSessions) ingest(s);

  return Array.from(byId.values()).sort((a, b) =>
    (b.updatedAt || '').localeCompare(a.updatedAt || '')
  );
}

// ============================================================================
// BROWSER STORAGE HELPERS (Instant Admin Visibility + Offline Resilience)
// ============================================================================

export function loadLocalFunnelSessions(): FunnelSessionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FUNNEL_SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is FunnelSessionRecord => Boolean(s && typeof s.id === 'string'))
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  } catch {
    return [];
  }
}

export function upsertLocalFunnelSession(
  session: FunnelSessionRecord
): FunnelSessionRecord[] {
  if (typeof window === 'undefined') return [session];
  const existing = loadLocalFunnelSessions();
  const merged = mergeFunnelSessions(existing, [session]).slice(0, 250);
  try {
    window.localStorage.setItem(FUNNEL_SESSIONS_STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(
      new CustomEvent('chasingher:funnel-sessions-updated', { detail: merged })
    );
  } catch {
    // Ignore storage quota restrictions
  }
  return merged;
}

export function removeLocalFunnelSession(sessionId: string): FunnelSessionRecord[] {
  if (typeof window === 'undefined') return [];
  const next = loadLocalFunnelSessions().filter((s) => s.id !== sessionId);
  try {
    window.localStorage.setItem(FUNNEL_SESSIONS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent('chasingher:funnel-sessions-updated', { detail: next })
    );
  } catch {
    // Ignore
  }
  return next;
}

export function buildFunnelSessionsCsv(
  sessions: readonly FunnelSessionRecord[]
): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = [
    'Session ID',
    'Funnel',
    'Market',
    'Stopped At',
    'Completed Quiz',
    'Answered Count',
    'Matched Result',
    'Recommended Edition',
    'Q1 Answer',
    'Q2 Answer',
    'Q3 Answer',
    'Q4 Answer',
    'Q5 Answer',
    'Q6 Answer',
    'Started At',
    'Last Active',
  ];

  const rows = sessions.map((s) => [
    s.id,
    getFunnelDisplayName(s.funnel),
    s.country.toUpperCase(),
    getFunnelStepLabel(s.furthestStep),
    s.completedQuiz ? 'Yes' : 'No',
    `${s.answeredCount}/6`,
    s.resultTitle || '',
    s.recommendedEdition || '',
    s.answerLabels.q1 || '',
    s.answerLabels.q2 || '',
    s.answerLabels.q3 || '',
    s.answerLabels.q4 || '',
    s.answerLabels.q5 || '',
    s.answerLabels.q6 || '',
    s.startedAt,
    s.updatedAt,
  ]);

  return [headers, ...rows].map((row) => row.map(esc).join(',')).join('\n');
}
