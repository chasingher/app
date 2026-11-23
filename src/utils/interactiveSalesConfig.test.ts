import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERACTIVE_QUESTIONS,
  DEFAULT_INTERACTIVE_SALES_CONFIG,
  evaluateQuestionnaireResult,
  calculateOfferPricing,
  isCheckoutConfigured,
  validateInteractiveCheckoutForm,
  mergeInteractiveSalesConfig,
  serializeInteractiveSalesConfig,
} from './interactiveSalesConfig';

test('questionnaire has exactly 6 questions with all specified answer choices', () => {
  assert.equal(INTERACTIVE_QUESTIONS.length, 6);
  assert.equal(INTERACTIVE_QUESTIONS[0].options.length, 4);
  assert.equal(INTERACTIVE_QUESTIONS[1].options.length, 5);
  assert.equal(INTERACTIVE_QUESTIONS[2].options.length, 5);
  assert.equal(INTERACTIVE_QUESTIONS[3].options.length, 5);
  assert.equal(INTERACTIVE_QUESTIONS[4].options.length, 5);
  assert.equal(INTERACTIVE_QUESTIONS[5].options.length, 4);
});

test('deterministic scoring matches all 5 result types based on answer combinations', () => {
  // Result A: The Apology You Haven't Found the Words For
  const resA = evaluateQuestionnaireResult({
    q1: 'q1_argued',
    q2: 'q2_not_yet',
    q3: 'q3_sorry',
    q4: 'q4_non_defensive',
    q5: 'q5_letter',
    q6: 'q6_simple',
  });
  assert.equal(resA.id, 'apology');
  assert.equal(resA.title, 'The Apology That Finally Breaks Through');
  assert.ok(resA.persuasiveHook.length > 20);
  assert.equal(resA.whatSheExperiences.length, 3);
  assert.ok(resA.closingNudge.length > 20);

  // Result B: The Memories You Want Her to Remember
  const resB = evaluateQuestionnaireResult({
    q1: 'q1_distant',
    q2: 'q2_messages',
    q3: 'q3_memories',
    q4: 'q4_good_memories',
    q5: 'q5_photos',
    q6: 'q6_thoughtful',
  });
  assert.equal(resB.id, 'memories');
  assert.equal(resB.recommendedEdition, 'memories');

  // Result C: A Thoughtful Gesture, Without Pressure
  const resC = evaluateQuestionnaireResult({
    q1: 'q1_unanswered',
    q2: 'q2_space',
    q3: 'q3_no_pressure',
    q4: 'q4_respect_space',
    q5: 'q5_combination',
    q6: 'q6_private',
  });
  assert.equal(resC.id, 'space');

  // Result D: The Message That Sounds Like You
  const resD = evaluateQuestionnaireResult({
    q1: 'q1_argued',
    q2: 'q2_messages',
    q3: 'q3_sorry',
    q4: 'q4_sound_like_me',
    q5: 'q5_voice',
    q6: 'q6_simple',
  });
  assert.equal(resD.id, 'voice');
  assert.equal(resD.recommendedEdition, 'memories');

  // Result E: A Personal Surprise (no conflict)
  const resE = evaluateQuestionnaireResult({
    q1: 'q1_appreciate',
    q2: 'q2_not_yet',
    q3: 'q3_love_appreciate',
    q4: 'q4_means_to_me',
    q5: 'q5_combination',
    q6: 'q6_thoughtful',
  });
  assert.equal(resE.id, 'appreciation');
});

test('Q6 "not sure yet" prioritizes sample before checkout without overriding weighted result', () => {
  const res = evaluateQuestionnaireResult({
    q1: 'q1_distant',
    q2: 'q2_messages',
    q3: 'q3_memories',
    q4: 'q4_good_memories',
    q5: 'q5_photos',
    q6: 'q6_unsure',
  });
  assert.equal(res.id, 'memories');
  assert.equal(res.prioritizeSampleBeforeCheckout, true);
});

test('reflection copy never promises forgiveness, a reply, or winning her back and uses consistent second-person phrasing', () => {
  const sampleSets = [
    { q1: 'q1_unanswered', q2: 'q2_space', q3: 'q3_no_pressure', q4: 'q4_respect_space', q5: 'q5_letter', q6: 'q6_private' },
    { q1: 'q1_argued', q2: 'q2_not_yet', q3: 'q3_sorry', q4: 'q4_non_defensive', q5: 'q5_letter', q6: 'q6_simple' },
    { q1: 'q1_distant', q2: 'q2_messages', q3: 'q3_memories', q4: 'q4_good_memories', q5: 'q5_photos', q6: 'q6_thoughtful' },
  ];
  for (const answers of sampleSets) {
    const res = evaluateQuestionnaireResult(answers);
    const combined = `${res.title} ${res.headline} ${res.persuasiveHook} ${res.reflection} ${res.approach} ${res.whyItFits} ${res.closingNudge}`.toLowerCase();
    assert.equal(combined.includes('win her back'), false);
    assert.equal(combined.includes('make her accept'), false);
    assert.equal(combined.includes('guarantee'), false);
    assert.equal(combined.includes('not automatically the best fit'), false);
    assert.equal(combined.includes('not the right choice'), false);
    assert.equal(combined.includes('no obligation'), false);
    assert.equal(res.whyItFits.includes('that I '), false);
    assert.equal(/\bour relationship\b/.test(res.whyItFits), false);
  }
});

test('pricing calculator computes 750 from 5,000 at 85% off in configured currency without silent conversion', () => {
  const activeOffer = calculateOfferPricing({
    regularPrice: 5000,
    discountPercent: 85,
    currency: 'KES',
    offerActive: true,
  });
  assert.equal(activeOffer.salePrice, 750);
  assert.equal(activeOffer.showDiscount, true);
  assert.equal(activeOffer.formattedRegular, 'KES 5,000');
  assert.equal(activeOffer.formattedFinal, 'KES 750');

  const inactiveOffer = calculateOfferPricing({
    regularPrice: 5000,
    discountPercent: 85,
    currency: 'KES',
    offerActive: false,
  });
  assert.equal(inactiveOffer.salePrice, 5000);
  assert.equal(inactiveOffer.showDiscount, false);
  assert.equal(inactiveOffer.formattedFinal, 'KES 5,000');
});

test('checkout config guard prevents pretending checkout works when URL or provider is missing', () => {
  assert.equal(isCheckoutConfigured(DEFAULT_INTERACTIVE_SALES_CONFIG.checkout), false);
  assert.equal(
    isCheckoutConfigured({
      checkoutUrl: 'https://paystack.com/pay/chasingher',
      paymentProvider: '',
      postPaymentRedirectUrl: '/my-site/',
      conciergeEnabled: false,
    }),
    false
  );
  assert.equal(
    isCheckoutConfigured({
      checkoutUrl: 'https://paystack.com/pay/chasingher',
      paymentProvider: 'Paystack',
      postPaymentRedirectUrl: '/my-site/',
      conciergeEnabled: false,
    }),
    true
  );
});

test('checkout validation enforces required fields, optional 6-digit PIN, and consent checkbox', () => {
  const badPin = validateInteractiveCheckoutForm({
    edition: 'chasing-her',
    recipientFirstName: 'Amara',
    customerName: 'Kwame Mensah',
    whatsapp: '0241234567',
    email: 'kwame@gmail.com',
    pin: '123',
    consentAccepted: false,
    country: 'gh',
  });
  assert.equal(badPin.valid, false);
  assert.ok(badPin.errors.pin);
  assert.ok(badPin.errors.consentAccepted);

  const validEmptyPin = validateInteractiveCheckoutForm({
    edition: 'memories',
    recipientFirstName: 'Amara',
    customerName: 'Kwame Mensah',
    whatsapp: '0241234567',
    email: 'kwame@gmail.com',
    pin: '',
    consentAccepted: true,
    country: 'gh',
  });
  assert.equal(validEmptyPin.valid, true);

  const validSixDigitPin = validateInteractiveCheckoutForm({
    edition: 'chasing-her',
    recipientFirstName: 'Amara',
    customerName: 'Kwame Mensah',
    whatsapp: '0712345678',
    email: 'brian@gmail.com',
    pin: '140826',
    consentAccepted: true,
    country: 'ke',
  });
  assert.equal(validSixDigitPin.valid, true);
});

test('config merge filters out unverified testimonials and preserves valid admin overrides', () => {
  const serialized = serializeInteractiveSalesConfig({
    ...DEFAULT_INTERACTIVE_SALES_CONFIG,
    pricing: {
      regularPrice: 5000,
      discountPercent: 85,
      currency: 'GHS',
      offerActive: true,
    },
    verifiedTestimonials: [
      {
        id: 't1',
        customerName: 'K.M.',
        location: 'Accra',
        createdWhat: 'Chasing Her edition',
        feedback: 'Helped me organize what I wanted to say.',
        verifiedPermission: true,
      },
      {
        id: 't2',
        customerName: 'Unverified',
        createdWhat: 'Memories',
        feedback: 'Should be filtered',
        verifiedPermission: false,
      },
    ],
  });
  const merged = mergeInteractiveSalesConfig(serialized);
  assert.equal(merged.pricing.currency, 'GHS');
  assert.equal(merged.verifiedTestimonials.length, 1);
  assert.equal(merged.verifiedTestimonials[0].customerName, 'K.M.');
});
