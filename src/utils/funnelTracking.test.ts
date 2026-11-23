import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFunnelSessionsCsv,
  computeFunnelAnalytics,
  computeQuestionBreakdown,
  createFunnelSession,
  getSessionOutcomeLabel,
  mergeFunnelSessions,
  recordFunnelStep,
  sanitizeFunnelSessionForFirestore,
} from './funnelTracking';

test('session tracks monotonic furthest step and exact Q1-Q6 answers even when visitor goes back', () => {
  let s = createFunnelSession('birthday-interactive', 'gh', '2026-08-01T10:00:00.000Z');
  assert.equal(s.furthestStep, 'intro');
  assert.equal(s.answeredCount, 0);

  s = recordFunnelStep(s, 'q1', { questionId: 'q1', optionId: 'bq1_partner' });
  s = recordFunnelStep(s, 'q2', { questionId: 'q2', optionId: 'bq2_loved' });
  s = recordFunnelStep(s, 'q3', { questionId: 'q3', optionId: 'bq3_main' });
  assert.equal(s.furthestStep, 'q3');
  assert.equal(s.furthestStepIndex, 3);
  assert.equal(s.answeredCount, 3);
  assert.equal(s.answerLabels.q1, 'My partner');

  // Visitor clicks Back to Q2 — furthestStep must stay at Q3 while currentStep updates
  s = recordFunnelStep(s, 'q2');
  assert.equal(s.currentStep, 'q2');
  assert.equal(s.furthestStep, 'q3');
  assert.equal(s.completedQuiz, false);
  assert.equal(getSessionOutcomeLabel(s).label, 'Stopped at Q3');
});

test('computeFunnelAnalytics accurately measures drop-off step, completion rate, and funnel progression', () => {
  // Session 1: Stopped at Q2
  let s1 = createFunnelSession('reconcile-interactive', 'gh', '2026-08-01T10:00:00.000Z');
  s1 = recordFunnelStep(s1, 'q1', { questionId: 'q1', optionId: 'q1_argued' });
  s1 = recordFunnelStep(s1, 'q2', { questionId: 'q2', optionId: 'q2_messages' });

  // Session 2: Stopped at Q2
  let s2 = createFunnelSession('reconcile-interactive', 'ke', '2026-08-01T10:05:00.000Z');
  s2 = recordFunnelStep(s2, 'q1', { questionId: 'q1', optionId: 'q1_unanswered' });
  s2 = recordFunnelStep(s2, 'q2', { questionId: 'q2', optionId: 'q2_space' });

  // Session 3: Completed quiz -> sample -> offer -> checkout_started
  let s3 = createFunnelSession('reconcile-interactive', 'gh', '2026-08-01T10:10:00.000Z');
  s3 = recordFunnelStep(s3, 'q1', { questionId: 'q1', optionId: 'q1_argued' });
  s3 = recordFunnelStep(s3, 'q2', { questionId: 'q2', optionId: 'q2_not_yet' });
  s3 = recordFunnelStep(s3, 'q3', { questionId: 'q3', optionId: 'q3_sorry' });
  s3 = recordFunnelStep(s3, 'q4', { questionId: 'q4', optionId: 'q4_non_defensive' });
  s3 = recordFunnelStep(s3, 'q5', { questionId: 'q5', optionId: 'q5_letter' });
  s3 = recordFunnelStep(s3, 'q6', { questionId: 'q6', optionId: 'q6_simple' });
  s3 = recordFunnelStep(s3, 'result', {
    resultId: 'apology',
    resultTitle: 'The Apology You Haven’t Found the Words For',
    recommendedEdition: 'chasing-her',
  });
  s3 = recordFunnelStep(s3, 'sample');
  s3 = recordFunnelStep(s3, 'offer');
  s3 = recordFunnelStep(s3, 'checkout_started');

  const analytics = computeFunnelAnalytics([s1, s2, s3], {
    funnel: 'reconcile-interactive',
  });

  assert.equal(analytics.totalSessions, 3);
  assert.equal(analytics.completedQuizCount, 1);
  assert.equal(analytics.completedQuizRate, 33);
  assert.equal(analytics.startedCheckoutCount, 1);
  assert.equal(analytics.droppedBeforeResultCount, 2);
  assert.equal(analytics.topDropOffStep?.step, 'q2');
  assert.equal(analytics.topDropOffStep?.stoppedCount, 2);

  const q2Metric = analytics.steps.find((st) => st.step === 'q2');
  assert.equal(q2Metric?.reachedCount, 3);
  assert.equal(q2Metric?.stoppedHereCount, 2);

  const q3Metric = analytics.steps.find((st) => st.step === 'q3');
  assert.equal(q3Metric?.reachedCount, 1);
  assert.equal(q3Metric?.dropOffFromPreviousPercent, 67);
});

test('computeQuestionBreakdown aggregates option popularity per question', () => {
  let b1 = createFunnelSession('birthday-interactive', 'gh');
  b1 = recordFunnelStep(b1, 'q1', { questionId: 'q1', optionId: 'bq1_partner' });
  let b2 = createFunnelSession('birthday-interactive', 'ke');
  b2 = recordFunnelStep(b2, 'q1', { questionId: 'q1', optionId: 'bq1_partner' });
  let b3 = createFunnelSession('birthday-interactive', 'gh');
  b3 = recordFunnelStep(b3, 'q1', { questionId: 'q1', optionId: 'bq1_spouse' });

  const breakdown = computeQuestionBreakdown([b1, b2, b3], 'birthday-interactive');
  assert.equal(breakdown.length, 6);
  const q1 = breakdown[0];
  assert.equal(q1.totalResponses, 3);
  assert.equal(q1.options[0].optionId, 'bq1_partner');
  assert.equal(q1.options[0].count, 2);
  assert.equal(q1.options[0].percent, 67);
});

test('sanitizeFunnelSessionForFirestore enforces native maps, strict bounds, and zero PII', () => {
  let s = createFunnelSession('birthday-interactive', 'ke');
  s = recordFunnelStep(s, 'q1', {
    questionId: 'q1',
    optionId: 'bq1_partner',
    optionLabel: 'My partner',
  });
  s = recordFunnelStep(s, 'result', {
    resultId: 'stand-alone',
    resultTitle: 'A Personal Gift Built to Stand on Its Own',
    recommendedEdition: 'chasing-her',
  });

  const payload = sanitizeFunnelSessionForFirestore(s);
  assert.equal(payload.funnel, 'birthday-interactive');
  assert.equal(payload.country, 'ke');
  assert.equal(payload.answers.q1, 'bq1_partner');
  assert.equal(payload.answerLabels.q1, 'My partner');
  assert.equal(payload.completedQuiz, true);
  assert.equal('email' in payload, false);
  assert.equal('whatsapp' in payload, false);
});

test('mergeFunnelSessions deduplicates by id keeping furthest progress and exports valid CSV', () => {
  let earlier = createFunnelSession('reconcile-interactive', 'gh', '2026-08-01T10:00:00.000Z');
  earlier = recordFunnelStep(earlier, 'q1', {
    questionId: 'q1',
    optionId: 'q1_argued',
    nowIso: '2026-08-01T10:01:00.000Z',
  });

  const later = recordFunnelStep(earlier, 'q2', {
    questionId: 'q2',
    optionId: 'q2_messages',
    nowIso: '2026-08-01T10:02:00.000Z',
  });

  const merged = mergeFunnelSessions([earlier], [later]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].furthestStep, 'q2');
  assert.equal(merged[0].answeredCount, 2);

  const csv = buildFunnelSessionsCsv(merged);
  assert.ok(csv.includes('Win Her Back Interactive'));
  assert.ok(csv.includes('Question 2'));
});
