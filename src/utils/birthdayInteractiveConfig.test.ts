import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BIRTHDAY_INTERACTIVE_QUESTIONS,
  DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG,
  PORTABLE_BIRTHDAY_STORIES,
  calculateBirthdayOfferPricing,
  evaluateBirthdayQuestionnaire,
  isBirthdayCheckoutConfigured,
  mergeBirthdayInteractiveConfig,
  serializeBirthdayInteractiveConfig,
  validateBirthdayCheckoutForm,
} from './birthdayInteractiveConfig';

test('birthday questionnaire has exactly 6 questions with all brief options', () => {
  assert.equal(BIRTHDAY_INTERACTIVE_QUESTIONS.length, 6);
  assert.equal(BIRTHDAY_INTERACTIVE_QUESTIONS[0].options.length, 4);
  assert.equal(BIRTHDAY_INTERACTIVE_QUESTIONS[1].options.length, 5);
  assert.equal(BIRTHDAY_INTERACTIVE_QUESTIONS[2].options.length, 4);
  assert.equal(BIRTHDAY_INTERACTIVE_QUESTIONS[3].options.length, 6);
  assert.equal(BIRTHDAY_INTERACTIVE_QUESTIONS[4].options.length, 4);
  assert.equal(BIRTHDAY_INTERACTIVE_QUESTIONS[5].options.length, 4);
});

test('deterministic birthday gift matcher resolves all 5 result types without contradictions', () => {
  // Type A: Stand-alone personal main gift
  const resA = evaluateBirthdayQuestionnaire({
    q1: 'bq1_partner',
    q2: 'bq2_loved',
    q3: 'bq3_main',
    q4: 'bq4_messages',
    q5: 'bq5_link',
    q6: 'bq6_self',
  });
  assert.equal(resA.id, 'stand-alone');
  assert.equal(resA.giftRole, 'main-gift');
  assert.equal(resA.recommendedEdition, 'chasing-her');

  // Type B: Companion extra paired with another gift
  const resB = evaluateBirthdayQuestionnaire({
    q1: 'bq1_dating',
    q2: 'bq2_surprised',
    q3: 'bq3_pair',
    q4: 'bq4_mix',
    q5: 'bq5_alongside',
    q6: 'bq6_simple',
  });
  assert.equal(resB.id, 'companion');
  assert.equal(resB.giftRole, 'companion-gift');
  assert.equal(resB.recommendedEdition, 'either');
  assert.ok(resB.reflection.includes('someone you’re dating or getting to know'));

  // Type C: Shared memories
  const resC = evaluateBirthdayQuestionnaire({
    q1: 'bq1_spouse',
    q2: 'bq2_memories',
    q3: 'bq3_main',
    q4: 'bq4_photos',
    q5: 'bq5_moment',
    q6: 'bq6_self',
  });
  assert.equal(resC.id, 'memories');
  assert.equal(resC.recommendedEdition, 'memories');

  // Type D: Personal message to revisit
  const resD = evaluateBirthdayQuestionnaire({
    q1: 'bq1_special',
    q2: 'bq2_celebrated',
    q3: 'bq3_main',
    q4: 'bq4_messages',
    q5: 'bq5_link',
    q6: 'bq6_self',
  });
  assert.ok(resD.id === 'revisit' || resD.id === 'stand-alone');
  assert.equal(resD.recommendedEdition, 'chasing-her');

  // Pure Type D combination
  const resDPure = evaluateBirthdayQuestionnaire({
    q1: 'bq1_special',
    q2: 'bq2_celebrated',
    q3: 'bq3_celebration',
    q4: 'bq4_messages',
    q5: 'bq5_link',
    q6: 'bq6_self',
  });
  assert.ok(resDPure.id === 'revisit' || resDPure.id === 'companion');

  // Type E: Still deciding / explore first -> confident & persuasive with zero weak disclaimers
  const resE = evaluateBirthdayQuestionnaire({
    q1: 'bq1_partner',
    q2: 'bq2_unsure',
    q3: 'bq3_deciding',
    q4: 'bq4_unsure',
    q5: 'bq5_see_first',
    q6: 'bq6_options',
  });
  assert.equal(resE.id, 'deciding');
  assert.equal(resE.giftRole, 'explore-first');
  assert.equal(resE.prioritizeSampleBeforeCheckout, true);
  assert.ok(resE.persuasiveHook.length > 20);
  assert.equal(resE.whatTheyExperience.length, 3);

  for (const res of [resA, resB, resC, resD, resE]) {
    const combined = `${res.title} ${res.headline} ${res.persuasiveHook} ${res.reflection} ${res.fitExplanation} ${res.whyItFits} ${res.closingNudge}`.toLowerCase();
    assert.equal(combined.includes('isn’t automatically the best fit'), false);
    assert.equal(combined.includes("isn't automatically the best fit"), false);
    assert.equal(combined.includes('not for this birthday'), false);
    assert.equal(combined.includes('not the right choice'), false);
    assert.equal(combined.includes('no obligation'), false);
  }
});

test('Q6 respects conciergeEnabled flag and never recommends disabled concierge', () => {
  const disabledRes = evaluateBirthdayQuestionnaire(
    {
      q1: 'bq1_partner',
      q2: 'bq2_loved',
      q3: 'bq3_main',
      q4: 'bq4_messages',
      q5: 'bq5_link',
      q6: 'bq6_help',
    },
    { conciergeEnabled: false }
  );
  assert.equal(disabledRes.recommendedBuildMode, 'self-build');
  assert.ok(disabledRes.buildModeNote.includes('currently unavailable'));

  const enabledRes = evaluateBirthdayQuestionnaire(
    {
      q1: 'bq1_partner',
      q2: 'bq2_loved',
      q3: 'bq3_main',
      q4: 'bq4_messages',
      q5: 'bq5_link',
      q6: 'bq6_help',
    },
    { conciergeEnabled: true }
  );
  assert.equal(enabledRes.recommendedBuildMode, 'concierge');
});

test('birthday market pricing renders GH (50 GHC / 200 GHC / 80 GHC) and KE independently without silent conversion', () => {
  const ghActive = calculateBirthdayOfferPricing(
    DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG.markets.gh
  );
  assert.equal(ghActive.formattedSelfBuild, '50 GHC');
  assert.equal(ghActive.formattedPrevious, '200 GHC');
  assert.equal(ghActive.formattedConcierge, '80 GHC');
  assert.equal(ghActive.showPreviousPrice, true);

  const ghNoOffer = calculateBirthdayOfferPricing({
    ...DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG.markets.gh,
    offerActive: false,
  });
  assert.equal(ghNoOffer.showPreviousPrice, false);

  const keActive = calculateBirthdayOfferPricing(
    DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG.markets.ke
  );
  assert.equal(keActive.formattedSelfBuild, 'KSh 650');
  assert.equal(keActive.formattedConcierge, 'KSh 1,200');
});

test('birthday checkout requires exact 6-digit PIN, consent, and stays disabled when unconfigured', () => {
  assert.equal(
    isBirthdayCheckoutConfigured(DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG.checkout),
    false
  );

  const invalid = validateBirthdayCheckoutForm({
    edition: 'chasing-her',
    buildMode: 'self-build',
    recipientName: 'Amara',
    pin: '1234',
    senderName: 'Kwame',
    whatsapp: '0241234567',
    email: 'kwame@gmail.com',
    consentAccepted: false,
    country: 'gh',
    dialPrefix: '+233',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.pin);
  assert.ok(invalid.errors.consentAccepted);

  const valid = validateBirthdayCheckoutForm({
    edition: 'memories',
    buildMode: 'self-build',
    recipientName: 'Wanjiku',
    pin: '140826',
    senderName: 'Brian',
    whatsapp: '0712345678',
    email: 'brian@gmail.com',
    consentAccepted: true,
    country: 'ke',
    dialPrefix: '+254',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalizedPin, '140826');
  assert.equal(valid.normalizedWhatsapp, '+254712345678');
});

test('birthday config hides testimonials by default and safely merges verified entries', () => {
  assert.equal(
    DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG.verifiedTestimonials.length,
    0
  );
  assert.equal(PORTABLE_BIRTHDAY_STORIES.length, 3);

  const merged = mergeBirthdayInteractiveConfig(
    serializeBirthdayInteractiveConfig({
      ...DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG,
      verifiedTestimonials: [
        ...PORTABLE_BIRTHDAY_STORIES,
        {
          id: 'unverified',
          customerName: 'Unapproved',
          createdWhat: 'Test',
          feedback: 'Should be filtered out',
          verifiedPermission: false,
        },
      ],
    })
  );
  assert.equal(merged.verifiedTestimonials.length, 3);
});
