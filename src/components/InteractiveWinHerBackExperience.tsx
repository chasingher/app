import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Info,
  Lock,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  COUNTRIES,
  CountryCode,
  ChasingHerProjectData,
  MemoriesProjectData,
  getLockedFlowerWallUrls,
  validateCustomerEmail,
} from '../utils/platformLogic';
import { SALES_PAGE_ASSETS } from '../utils/salesPageAssets';
import {
  CHECKOUT_DIAL_COUNTRIES,
  DialCountryOption,
} from '../utils/checkoutFlow';
import {
  INTERACTIVE_QUESTIONS,
  InteractiveEditionId,
  InteractiveSalesConfig,
  InteractiveCheckoutFormErrors,
  QuestionnaireAnswers,
  calculateOfferPricing,
  evaluateQuestionnaireResult,
  isCheckoutConfigured,
  trackAnonymousFunnelEvent,
  validateInteractiveCheckoutForm,
} from '../utils/interactiveSalesConfig';
import {
  FunnelQuestionKey,
  FunnelSessionRecord,
  FunnelStepId,
  createFunnelSession,
  recordFunnelStep,
  upsertLocalFunnelSession,
} from '../utils/funnelTracking';
import { upsertFunnelSessionToFirestore } from '../utils/firebaseClient';
import { RecipientSitePreview } from './RecipientSitePreview';

interface InteractiveWinHerBackExperienceProps {
  country: CountryCode;
  config: InteractiveSalesConfig;
  chasingHerDemo: ChasingHerProjectData;
  memoriesDemo: MemoriesProjectData;
  isPreviewMode?: boolean;
}

type ExperienceStage = 'intro' | 'questionnaire' | 'result';

export const InteractiveWinHerBackExperience: React.FC<
  InteractiveWinHerBackExperienceProps
> = ({
  country,
  config,
  chasingHerDemo,
  memoriesDemo,
  isPreviewMode = false,
}) => {
  const countryConfig = COUNTRIES[country] || COUNTRIES.gh;

  // Primary stage state: Intro -> Questionnaire (1 question per screen) -> Result Journey
  const [stage, setStage] = useState<ExperienceStage>('intro');
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});

  // Post-result progressive journey state
  const [activeSampleEdition, setActiveSampleEdition] =
    useState<InteractiveEditionId>('chasing-her');
  const [sampleExplored, setSampleExplored] = useState<boolean>(false);
  const [offerUnlocked, setOfferUnlocked] = useState<boolean>(false);

  // Final checkout form state (never shown before questionnaire + result + sample/offer)
  const [selectedEdition, setSelectedEdition] =
    useState<InteractiveEditionId>('chasing-her');
  const [recipientFirstName, setRecipientFirstName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [optionalPin, setOptionalPin] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [selectedDial, setSelectedDial] = useState<DialCountryOption>(
    () =>
      CHECKOUT_DIAL_COUNTRIES.find((d) => d.linkedCountry === country) ||
      CHECKOUT_DIAL_COUNTRIES[0]
  );
  const [checkoutErrors, setCheckoutErrors] =
    useState<InteractiveCheckoutFormErrors>({});
  const [emailSuggestion, setEmailSuggestion] = useState<string | undefined>(
    undefined
  );
  const [submittingCheckout, setSubmittingCheckout] = useState(false);
  const [checkoutStatusMessage, setCheckoutStatusMessage] = useState<string | null>(
    null
  );

  const sampleSectionRef = useRef<HTMLElement>(null);
  const offerCheckoutSectionRef = useRef<HTMLElement>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);

  // Live anonymous session tracker (tracks Q1-Q6 answers & exact drop-off step locally + in Firestore)
  const funnelSessionRef = useRef<FunnelSessionRecord | null>(null);
  const firestoreCreatedRef = useRef<boolean>(false);

  const persistFunnelProgress = (
    step: FunnelStepId,
    patch?: {
      questionId?: FunnelQuestionKey;
      optionId?: string;
      optionLabel?: string;
      resultId?: string;
      resultTitle?: string;
      recommendedEdition?: 'chasing-her' | 'memories' | 'either';
    }
  ) => {
    const base =
      funnelSessionRef.current ||
      createFunnelSession('reconcile-interactive', country);
    const updated = recordFunnelStep(base, step, patch);
    funnelSessionRef.current = updated;
    upsertLocalFunnelSession(updated);
    const createdFlag = firestoreCreatedRef.current;
    void upsertFunnelSessionToFirestore(updated, createdFlag).then((ok) => {
      if (ok) firestoreCreatedRef.current = true;
    });
  };

  useEffect(() => {
    if (!funnelSessionRef.current) {
      const initial = createFunnelSession('reconcile-interactive', country);
      funnelSessionRef.current = initial;
      upsertLocalFunnelSession(initial);
      void upsertFunnelSessionToFirestore(initial, false).then((ok) => {
        if (ok) firestoreCreatedRef.current = true;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const matched = CHECKOUT_DIAL_COUNTRIES.find((d) => d.linkedCountry === country);
    if (matched) {
      setSelectedDial(matched);
    }
  }, [country]);

  const currentQuestion = INTERACTIVE_QUESTIONS[questionIndex];
  const currentAnswerId = currentQuestion ? answers[currentQuestion.id] : undefined;

  const evaluatedResult = useMemo(
    () => evaluateQuestionnaireResult(answers),
    [answers]
  );

  const pricing = useMemo(
    () => calculateOfferPricing(config.pricing),
    [config.pricing]
  );

  const checkoutReady = useMemo(
    () => isCheckoutConfigured(config.checkout),
    [config.checkout]
  );

  const verifiedTestimonials = useMemo(
    () => config.verifiedTestimonials.filter((t) => t.verifiedPermission),
    [config.verifiedTestimonials]
  );

  const selectedEditionSpec =
    config.editions.find((e) => e.id === selectedEdition) || config.editions[0];

  const handleStartQuestionnaire = () => {
    trackAnonymousFunnelEvent('questionnaire_started');
    persistFunnelProgress('q1');
    setStage('questionnaire');
    setQuestionIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectOption = (optionId: string) => {
    if (!currentQuestion) return;
    const chosenOpt = currentQuestion.options.find((o) => o.id === optionId);
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
    persistFunnelProgress(currentQuestion.id, {
      questionId: currentQuestion.id,
      optionId,
      optionLabel: chosenOpt?.label,
    });
  };

  const handleContinueQuestion = () => {
    if (!currentQuestion || !currentAnswerId) return;
    trackAnonymousFunnelEvent('question_completed', {
      stepNumber: currentQuestion.number,
    });

    if (questionIndex < INTERACTIVE_QUESTIONS.length - 1) {
      const nextQuestion = INTERACTIVE_QUESTIONS[questionIndex + 1];
      if (nextQuestion) {
        persistFunnelProgress(nextQuestion.id);
      }
      setQuestionIndex((idx) => idx + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        questionHeadingRef.current?.focus();
      }, 80);
    } else {
      const nextResult = evaluateQuestionnaireResult(answers);
      setActiveSampleEdition(nextResult.recommendedEdition);
      setSelectedEdition(nextResult.recommendedEdition);
      setStage('result');
      persistFunnelProgress('result', {
        resultId: nextResult.id,
        resultTitle: nextResult.title,
        recommendedEdition: nextResult.recommendedEdition,
      });
      trackAnonymousFunnelEvent('result_viewed', {
        edition: nextResult.recommendedEdition,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackQuestion = () => {
    if (questionIndex > 0) {
      const prevQuestion = INTERACTIVE_QUESTIONS[questionIndex - 1];
      if (prevQuestion) {
        persistFunnelProgress(prevQuestion.id);
      }
      setQuestionIndex((idx) => idx - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleReviewAnswers = () => {
    setStage('questionnaire');
    setQuestionIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExperienceForYourself = () => {
    setSampleExplored(true);
    persistFunnelProgress('sample');
    trackAnonymousFunnelEvent('sample_opened', {
      edition: activeSampleEdition,
    });
    sampleSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleSwitchSampleEdition = (edition: InteractiveEditionId) => {
    setActiveSampleEdition(edition);
    setSampleExplored(true);
    persistFunnelProgress('sample');
    trackAnonymousFunnelEvent('sample_opened', { edition });
  };

  const handleOpenOfferAndCheckout = () => {
    setOfferUnlocked(true);
    setSampleExplored(true);
    setSelectedEdition(activeSampleEdition);
    persistFunnelProgress('offer');
    setTimeout(() => {
      offerCheckoutSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 60);
  };

  const handleEmailChange = (val: string) => {
    setCustomerEmail(val);
    if (checkoutErrors.email) {
      setCheckoutErrors((prev) => ({ ...prev, email: undefined }));
    }
    if (val.includes('@') && val.includes('.')) {
      const check = validateCustomerEmail(val);
      setEmailSuggestion(check.suggestion);
    } else {
      setEmailSuggestion(undefined);
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingCheckout || !checkoutReady) return;

    setCheckoutStatusMessage(null);
    const validation = validateInteractiveCheckoutForm({
      edition: selectedEdition,
      recipientFirstName,
      customerName,
      whatsapp: customerPhone,
      email: customerEmail,
      pin: optionalPin,
      consentAccepted,
      country: selectedDial.linkedCountry || country,
      dialPrefix: selectedDial.dial,
    });

    if (!validation.valid) {
      setCheckoutErrors(validation.errors);
      return;
    }

    setCheckoutErrors({});
    setSubmittingCheckout(true);
    persistFunnelProgress('checkout_started');
    trackAnonymousFunnelEvent('checkout_started', { edition: selectedEdition });

    try {
      const orderRef = `CH-${Date.now()}`;
      const returnUrl = new URL(
        config.checkout.postPaymentRedirectUrl || '/my-site/',
        window.location.origin
      ).toString();

      // Store minimal checkout draft locally for post-payment lookup (excludes anonymous quiz answers)
      try {
        sessionStorage.setItem(
          'ch_pending_checkout_draft',
          JSON.stringify({
            orderRef,
            edition: selectedEdition,
            recipientFirstName: recipientFirstName.trim(),
            customerName: customerName.trim(),
            email: validation.normalizedEmail,
            whatsapp: validation.normalizedPhone,
            pin: optionalPin.trim() || undefined,
            currency: pricing.currency,
            amount: pricing.salePrice,
          })
        );
      } catch {
        // Ignore private browsing storage restrictions
      }

      const targetCheckout = new URL(config.checkout.checkoutUrl);
      targetCheckout.searchParams.set('edition', selectedEdition);
      targetCheckout.searchParams.set('reference', orderRef);
      targetCheckout.searchParams.set('email', validation.normalizedEmail);
      targetCheckout.searchParams.set('return_url', returnUrl);

      setCheckoutStatusMessage(
        `Redirecting you to ${config.checkout.paymentProvider} to complete payment securely...`
      );
      window.location.assign(targetCheckout.toString());
    } catch {
      setSubmittingCheckout(false);
      setCheckoutStatusMessage(
        'Unable to open the configured checkout URL. Please verify the payment link in settings.'
      );
    }
  };

  const progressPercent =
    stage === 'questionnaire' && currentQuestion
      ? Math.round((currentQuestion.number / INTERACTIVE_QUESTIONS.length) * 100)
      : 100;

  const flowerUrls = useMemo(
    () => getLockedFlowerWallUrls(import.meta.env.BASE_URL || '/'),
    []
  );
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div
      className="relative min-h-screen overflow-x-clip bg-[#FBF3EA] text-[#271612] selection:bg-[#5A1A2C] selection:text-[#FAF5F0]"
      data-testid="interactive-sales-experience"
    >
      {/* Subtle Ambient Warmth & Signature Botanical Framing */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full opacity-45 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(212,163,142,0.45) 0%, rgba(251,243,234,0) 70%)',
          }}
        />
        <div
          className="absolute -bottom-32 -left-24 w-[460px] h-[460px] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(185,138,78,0.28) 0%, rgba(251,243,234,0) 70%)',
          }}
        />
        {flowerUrls[1] && (
          <img
            src={flowerUrls[1]}
            alt=""
            className="hidden sm:block absolute -top-10 -right-12 w-48 md:w-64 opacity-[0.22] rotate-12 select-none"
          />
        )}
        {flowerUrls[0] && (
          <img
            src={flowerUrls[0]}
            alt=""
            className="hidden sm:block absolute -bottom-14 -left-14 w-52 md:w-64 opacity-[0.20] -rotate-12 select-none"
          />
        )}
      </div>

      {/* Calm, Minimal Top Bar (Single Row, Clean Editorial Wordmark) */}
      <header className="sticky top-0 z-30 h-14 bg-[#FBF3EA]/90 backdrop-blur-md border-b border-[#B98A4E]/20">
        <div className="max-w-4xl h-full mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <span className="font-serif text-lg sm:text-xl font-medium tracking-tight text-[#271612] whitespace-nowrap shrink-0">
            {config.brandName}
          </span>

          {stage === 'questionnaire' && currentQuestion && (
            <span className="text-xs sm:text-sm font-medium text-[#7A5248] whitespace-nowrap shrink-0">
              Private &amp; Anonymous
            </span>
          )}

          {stage === 'result' && (
            <button
              type="button"
              onClick={handleReviewAnswers}
              className="text-xs sm:text-sm font-medium text-[#5A1A2C] hover:underline inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Review answers</span>
            </button>
          )}
        </div>
      </header>

      {/* =====================================================================
          SCREEN 1 · OPENING HEADLINE & START (Rich Editorial Stationery, No Prices/Inputs)
         ===================================================================== */}
      {stage === 'intro' && (
        <section
          aria-label="Introduction"
          className="relative z-10 min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-14"
          data-testid="interactive-intro-screen"
        >
          <div className="w-full max-w-2xl mx-auto">
            <div className="relative rounded-[30px] bg-[#FFFDF9]/96 border border-[#B98A4E]/30 shadow-[0_32px_80px_-34px_rgba(90,26,44,0.28)] overflow-hidden">
              {/* Top Champagne-Burgundy Stationery Trim */}
              <div
                aria-hidden="true"
                className="h-1.5 w-full bg-gradient-to-r from-[#5A1A2C] via-[#C99B62] to-[#5A1A2C]"
              />

              {/* Subtle Corner Botanical Watermark Inside Card */}
              {flowerUrls[2] && (
                <img
                  src={flowerUrls[2]}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none select-none absolute -top-8 -right-8 w-28 sm:w-36 opacity-[0.18] rotate-12"
                />
              )}

              <div className="relative px-6 py-9 sm:px-12 sm:py-12 space-y-7 text-center">
                {/* Editorial Brand Line + Gold Hairline Monogram */}
                <div className="space-y-3">
                  <p className="text-xs sm:text-sm font-medium tracking-wide text-[#8C5A46]">
                    {config.brandName} · {config.productName}
                  </p>
                  <div
                    aria-hidden="true"
                    className="flex items-center justify-center gap-3 text-[#B98A4E]"
                  >
                    <span className="h-px w-10 bg-[#B98A4E]/45" />
                    <span className="font-serif text-sm">♥</span>
                    <span className="h-px w-10 bg-[#B98A4E]/45" />
                  </div>
                </div>

                {/* Editorial Headline with Deep Burgundy Italic Emphasis */}
                <h1 className="font-serif text-[27px] sm:text-[38px] leading-[1.18] tracking-tight text-[#271612] text-balance">
                  Your sorries are no longer enough&#8288;—{' '}
                  <em className="italic text-[#5A1A2C] font-normal">
                    and you know that.
                  </em>{' '}
                  Or maybe you haven’t apologized yet, but you’re looking for
                  the best way to do so.
                </h1>

                <p className="max-w-xl mx-auto text-[15px] sm:text-[17px] leading-relaxed text-[#5A423A]">
                  Answer this quick, anonymous questionnaire in under 5 minutes.
                  Based on your answers, we’ll suggest a personal way to express
                  what you feel—and show you how to create it.
                </p>

                {/* Tactile Keepsake Polaroid Preview Strip (Visual Warmth, Zero Clutter) */}
                <div className="pt-1 pb-1 flex flex-col items-center gap-3">
                  <div
                    aria-hidden="true"
                    className="flex items-center justify-center -space-x-3"
                  >
                    <div className="w-16 sm:w-20 bg-white p-1 pb-3 rounded-[4px] shadow-md border border-[#271612]/8 -rotate-6">
                      <img
                        src={SALES_PAGE_ASSETS.polaroid1}
                        alt=""
                        className="w-full aspect-square object-cover rounded-[2px]"
                      />
                    </div>
                    <div className="relative z-10 w-[72px] sm:w-[88px] bg-white p-1.5 pb-3.5 rounded-[4px] shadow-lg border border-[#B98A4E]/30 -translate-y-1">
                      <img
                        src={SALES_PAGE_ASSETS.polaroid2}
                        alt=""
                        className="w-full aspect-square object-cover rounded-[2px]"
                      />
                    </div>
                    <div className="w-16 sm:w-20 bg-white p-1 pb-3 rounded-[4px] shadow-md border border-[#271612]/8 rotate-6">
                      <img
                        src={SALES_PAGE_ASSETS.polaroid3}
                        alt=""
                        className="w-full aspect-square object-cover rounded-[2px]"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[#7A5A47]">
                    6 quiet questions · Personalized result · Live keepsake sample
                  </p>
                </div>

                {/* Single Dominant Primary CTA + Privacy Note */}
                <div className="pt-1 space-y-4">
                  <button
                    type="button"
                    onClick={handleStartQuestionnaire}
                    className="w-full sm:w-auto min-h-[56px] px-5 sm:px-9 py-4 rounded-full bg-gradient-to-r from-[#5A1A2C] via-[#6B1F34] to-[#4A1322] hover:from-[#471322] hover:to-[#3A0E1B] text-[#FAF5F0] font-semibold text-[15px] sm:text-base shadow-[0_18px_36px_-14px_rgba(90,26,44,0.55)] ring-1 ring-[#E2B96F]/30 transition motion-reduce:transition-none inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
                  >
                    <span>Start the Anonymous Questionnaire</span>
                    <ArrowRight
                      className="w-4 h-4 text-[#E8C589] shrink-0"
                      aria-hidden="true"
                    />
                  </button>

                  <p className="inline-flex items-start sm:items-center justify-center gap-1.5 text-xs sm:text-sm text-[#6B5047] max-w-[310px] sm:max-w-none mx-auto text-left sm:text-center">
                    <Lock
                      className="w-3.5 h-3.5 text-[#9B7245] mt-0.5 sm:mt-0 shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      No name, phone number, or email required to take the
                      questionnaire.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SCREEN 2 · ONE QUESTION PER SCREEN (Framed Luxury Stationery Card)
         ===================================================================== */}
      {stage === 'questionnaire' && currentQuestion && (
        <section
          aria-label={`Question ${currentQuestion.number} of ${INTERACTIVE_QUESTIONS.length}`}
          className="relative z-10 min-h-[calc(100vh-3.5rem)] flex flex-col justify-center px-4 sm:px-6 py-7 sm:py-12"
          data-testid="interactive-questionnaire-screen"
        >
          <div className="w-full max-w-2xl mx-auto">
            <div className="relative rounded-[28px] bg-[#FFFDF9]/96 border border-[#B98A4E]/30 shadow-[0_28px_70px_-30px_rgba(90,26,44,0.24)] overflow-hidden">
              {/* Top Trim */}
              <div
                aria-hidden="true"
                className="h-1 w-full bg-gradient-to-r from-[#5A1A2C] via-[#C99B62] to-[#5A1A2C]/65"
              />

              {/* Subtle Floral Accent */}
              {flowerUrls[0] && (
                <img
                  src={flowerUrls[0]}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none select-none absolute -top-12 -right-12 w-28 sm:w-36 opacity-[0.09] sm:opacity-[0.13] rotate-12"
                />
              )}

              <div className="relative p-6 sm:p-10 space-y-7">
                {/* 6-Step Segmented Progress Header */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-[#5A1A2C] tabular-nums">
                      Question {currentQuestion.number} of{' '}
                      {INTERACTIVE_QUESTIONS.length}
                    </span>
                    <span className="text-[#8C654C] tabular-nums">
                      {progressPercent}%
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-6 gap-1.5"
                    role="progressbar"
                    aria-valuenow={currentQuestion.number}
                    aria-valuemin={1}
                    aria-valuemax={INTERACTIVE_QUESTIONS.length}
                    aria-label="Questionnaire progress"
                  >
                    {INTERACTIVE_QUESTIONS.map((q, idx) => (
                      <div
                        key={q.id}
                        className={`h-1.5 rounded-full transition-colors duration-200 ${
                          idx < questionIndex
                            ? 'bg-[#5A1A2C]'
                            : idx === questionIndex
                            ? 'bg-[#B98A4E]'
                            : 'bg-[#5A1A2C]/12'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Single Question Prompt */}
                <div className="space-y-2">
                  <h2
                    ref={questionHeadingRef}
                    tabIndex={-1}
                    className="font-serif text-[25px] sm:text-[32px] leading-[1.22] text-[#271612] text-balance focus:outline-none"
                  >
                    {currentQuestion.prompt}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#7A5A47]">
                    Choose the answer that feels closest to where things stand.
                  </p>
                </div>

                {/* Tactile Answer Cards with Serif Letter Medallions (Manual Continue) */}
                <div
                  role="radiogroup"
                  aria-label={currentQuestion.prompt}
                  className="space-y-3"
                >
                  {currentQuestion.options.map((option, optIdx) => {
                    const isSelected = currentAnswerId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleSelectOption(option.id)}
                        className={`group w-full min-h-[60px] px-4 sm:px-5 py-3.5 rounded-2xl border text-left transition duration-150 motion-reduce:transition-none flex items-center justify-between gap-3.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C] ${
                          isSelected
                            ? 'border-[#5A1A2C] bg-[#F6E6E1] text-[#271612] shadow-[0_12px_26px_-16px_rgba(90,26,44,0.45)] ring-1 ring-[#5A1A2C]/25'
                            : 'border-[#B98A4E]/25 bg-[#FFFBF6] hover:border-[#B98A4E]/70 hover:bg-white text-[#271612]'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            aria-hidden="true"
                            className={`w-8 h-8 rounded-full font-serif text-sm font-semibold flex items-center justify-center shrink-0 transition-colors duration-150 ${
                              isSelected
                                ? 'bg-[#5A1A2C] text-[#FBF3EA]'
                                : 'bg-[#F3E5D8] text-[#6B4837] group-hover:bg-[#EBD6C3]'
                            }`}
                          >
                            {optionLetters[optIdx] || optIdx + 1}
                          </span>
                          <span className="text-[15px] sm:text-base leading-snug font-medium">
                            {option.label}
                          </span>
                        </div>
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition duration-150 motion-reduce:transition-none ${
                            isSelected
                              ? 'bg-[#5A1A2C] border-[#5A1A2C] text-[#FAF5F0]'
                              : 'border-[#B98A4E]/45 bg-white/80'
                          }`}
                          aria-hidden="true"
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[2.75]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Back + Continue / Show My Result Controls */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#B98A4E]/20">
                  {questionIndex > 0 ? (
                    <button
                      type="button"
                      onClick={handleBackQuestion}
                      className="min-h-[50px] px-5 py-3 rounded-full border border-[#B98A4E]/35 bg-[#FFFBF6] hover:bg-[#F5E8DC] text-[#271612] font-semibold text-sm sm:text-base transition motion-reduce:transition-none inline-flex items-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
                    >
                      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                      <span>Back</span>
                    </button>
                  ) : (
                    <span className="text-xs text-[#8C654C]">
                      Take your time
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={!currentAnswerId}
                    onClick={handleContinueQuestion}
                    className="min-h-[50px] px-7 py-3 rounded-full bg-gradient-to-r from-[#5A1A2C] to-[#461120] hover:from-[#471322] hover:to-[#350B17] disabled:opacity-40 disabled:cursor-not-allowed text-[#FAF5F0] font-semibold text-sm sm:text-base shadow-[0_14px_28px_-12px_rgba(90,26,44,0.5)] transition motion-reduce:transition-none inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
                  >
                    <span>
                      {questionIndex === INTERACTIVE_QUESTIONS.length - 1
                        ? 'Show My Result'
                        : 'Continue'}
                    </span>
                    <ArrowRight
                      className="w-4 h-4 text-[#E8C589]"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          SCREEN 3 · PERSONALIZED RESULT, TESTIMONIALS, SAMPLE & FINAL CHECKOUT
         ===================================================================== */}
      {stage === 'result' && (
        <div
          className="relative z-10 divide-y divide-[#B98A4E]/18"
          data-testid="interactive-result-journey"
        >
          {/* 1. PERSONALIZED RESULT SECTION (Editorial Luxury Hero + 2-Column Persuasive Blueprint) */}
          <section
            aria-label="Your personalized result"
            className="px-4 sm:px-6 py-10 sm:py-16"
          >
            <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
              {/* Signature Burgundy & Champagne Result Hero Card */}
              <div className="relative rounded-[30px] bg-gradient-to-br from-[#4C1222] via-[#3A0C19] to-[#240710] border border-[#E2B96F]/30 shadow-[0_34px_80px_-30px_rgba(39,10,19,0.65)] overflow-hidden text-[#FBF3EA]">
                <div
                  aria-hidden="true"
                  className="h-1.5 w-full bg-gradient-to-r from-[#C99B62] via-[#F2D59B] to-[#C99B62]"
                />
                {flowerUrls[1] && (
                  <img
                    src={flowerUrls[1]}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none select-none absolute -top-12 -right-12 w-40 sm:w-56 opacity-[0.14] rotate-12"
                  />
                )}
                {flowerUrls[0] && (
                  <img
                    src={flowerUrls[0]}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none select-none absolute -bottom-16 -left-12 w-44 sm:w-56 opacity-[0.12] -rotate-12"
                  />
                )}

                <div className="relative p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                  {/* Left: High-Conviction Editorial Result Copy */}
                  <div className="lg:col-span-7 space-y-5">
                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#E8C589]">
                        Your Personalized Match · {config.brandName}
                      </p>
                      <h1 className="font-serif text-[30px] sm:text-[42px] leading-[1.12] tracking-tight text-[#FBF3EA] text-balance">
                        {evaluatedResult.title}
                      </h1>
                      <p className="font-serif italic text-xl sm:text-[23px] text-[#E8C589] leading-snug">
                        {evaluatedResult.headline}
                      </p>
                    </div>

                    <p className="text-[15px] sm:text-base leading-relaxed text-[#FBF3EA]/88">
                      {evaluatedResult.persuasiveHook}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 pt-2">
                      <button
                        type="button"
                        onClick={handleExperienceForYourself}
                        className="min-h-[54px] px-7 py-3.5 rounded-full bg-gradient-to-r from-[#E6C07B] via-[#F1D59B] to-[#D8AC62] hover:from-[#F2D59B] hover:to-[#E2B76D] text-[#240710] font-semibold text-[15px] sm:text-base shadow-[0_18px_36px_-14px_rgba(232,197,137,0.55)] transition motion-reduce:transition-none inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2D59B]"
                      >
                        <span>
                          {evaluatedResult.prioritizeSampleBeforeCheckout
                            ? 'Experience the Live Demo First'
                            : 'Experience This for Yourself'}
                        </span>
                        <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenOfferAndCheckout}
                        className="min-h-[54px] px-6 py-3.5 rounded-full border border-[#E8C589]/40 bg-[#FBF3EA]/8 hover:bg-[#FBF3EA]/16 text-[#FBF3EA] font-semibold text-sm sm:text-[15px] transition motion-reduce:transition-none inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2D59B]"
                      >
                        <span>Create Hers Now</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: Keepsake Visual Preview + Edition Spotlight */}
                  <div className="lg:col-span-5">
                    <div className="rounded-[24px] bg-[#1D050C]/75 border border-[#E2B96F]/25 p-6 space-y-5 backdrop-blur-sm">
                      <div
                        aria-hidden="true"
                        className="flex items-center justify-center -space-x-3.5 pt-1"
                      >
                        <div className="w-20 sm:w-24 bg-white p-1.5 pb-4 rounded-[4px] shadow-xl -rotate-6">
                          <img
                            src={SALES_PAGE_ASSETS.polaroid1}
                            alt=""
                            className="w-full aspect-square object-cover rounded-[2px]"
                          />
                        </div>
                        <div className="relative z-10 w-24 sm:w-28 bg-white p-1.5 pb-4 rounded-[4px] shadow-2xl border border-[#E2B96F]/40 -translate-y-1.5">
                          <img
                            src={SALES_PAGE_ASSETS.polaroid2}
                            alt=""
                            className="w-full aspect-square object-cover rounded-[2px]"
                          />
                        </div>
                        <div className="w-20 sm:w-24 bg-white p-1.5 pb-4 rounded-[4px] shadow-xl rotate-6">
                          <img
                            src={SALES_PAGE_ASSETS.polaroid3}
                            alt=""
                            className="w-full aspect-square object-cover rounded-[2px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5 text-center pt-1 border-t border-[#E2B96F]/18">
                        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#E8C589]">
                          Recommended Edition
                        </p>
                        <p className="font-serif text-lg sm:text-xl text-[#FBF3EA] leading-snug">
                          {evaluatedResult.recommendedEditionLabel}
                        </p>
                        <p className="text-xs text-[#FBF3EA]/72 leading-relaxed">
                          Built on your phone in under 20 minutes · Private 6-digit PIN · Custom soundtrack
                        </p>
                      </div>

                      <div className="flex items-baseline justify-center gap-2.5 pt-2 border-t border-[#E2B96F]/18">
                        <span className="font-serif text-2xl sm:text-3xl font-semibold text-[#F2D59B] tabular-nums">
                          {pricing.formattedFinal}
                        </span>
                        {pricing.showDiscount && (
                          <span className="text-sm text-[#FBF3EA]/55 line-through tabular-nums">
                            {pricing.formattedRegular}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Column Editorial Persuasive Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left Column: Deep Personal Reflection & 3-Step Emotional Payoff */}
                <div className="lg:col-span-7 rounded-[26px] bg-[#FFFDF9] border border-[#B98A4E]/30 shadow-[0_22px_50px_-30px_rgba(90,26,44,0.2)] overflow-hidden flex flex-col justify-between">
                  <div
                    aria-hidden="true"
                    className="h-1 w-full bg-gradient-to-r from-[#5A1A2C] via-[#C99B62] to-[#5A1A2C]/60"
                  />
                  <div className="p-6 sm:p-8 space-y-6 flex-1">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#9A7042]">
                        Why This Fits Your Moment
                      </p>
                      <h2 className="font-serif text-2xl sm:text-[28px] leading-tight text-[#271612]">
                        Why a private experience reaches her where texts can’t
                      </h2>
                      <p className="text-[15px] sm:text-base leading-relaxed text-[#4F3933]">
                        {evaluatedResult.reflection}
                      </p>
                      <p className="text-sm sm:text-[15px] leading-relaxed text-[#6B5047]">
                        {evaluatedResult.whyItFits}
                      </p>
                    </div>

                    <div className="pt-5 border-t border-[#B98A4E]/20 space-y-4">
                      <h3 className="font-serif text-lg sm:text-xl text-[#271612]">
                        What happens the moment she taps your link
                      </h3>
                      <ol className="space-y-3.5">
                        {evaluatedResult.whatSheExperiences.map((moment, idx) => (
                          <li key={moment} className="flex items-start gap-3.5">
                            <span
                              aria-hidden="true"
                              className="w-7 h-7 rounded-full bg-[#F5E6DC] border border-[#B98A4E]/35 font-serif text-xs font-semibold text-[#5A1A2C] flex items-center justify-center shrink-0 mt-0.5 tabular-nums"
                            >
                              0{idx + 1}
                            </span>
                            <span className="text-sm sm:text-[15px] leading-relaxed text-[#3E2A25]">
                              {moment}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Right Column: Action Blueprint & Included Highlights */}
                <div className="lg:col-span-5 rounded-[26px] bg-[#FAF1E6] border border-[#B98A4E]/35 shadow-[0_22px_50px_-30px_rgba(90,26,44,0.2)] p-6 sm:p-8 flex flex-col justify-between gap-6">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#9A7042]">
                        Your Recommended Blueprint
                      </p>
                      <h2 className="font-serif text-2xl text-[#271612] leading-snug">
                        {evaluatedResult.recommendedEditionLabel}
                      </h2>
                      <p className="text-sm leading-relaxed text-[#5F453E]">
                        {evaluatedResult.approach}
                      </p>
                    </div>

                    <ul className="space-y-3 pt-2 border-t border-[#B98A4E]/20 text-sm sm:text-[15px] text-[#271612]">
                      {evaluatedResult.recommendations.map((rec) => (
                        <li key={rec} className="flex items-start gap-2.5">
                          <Check
                            className="w-4 h-4 text-[#5A1A2C] mt-1 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="leading-snug">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3.5 pt-4 border-t border-[#B98A4E]/22">
                    <p className="text-sm leading-relaxed text-[#4F3933] font-medium">
                      {evaluatedResult.closingNudge}
                    </p>
                    <button
                      type="button"
                      onClick={handleExperienceForYourself}
                      className="w-full min-h-[52px] px-6 py-3.5 rounded-full bg-gradient-to-r from-[#5A1A2C] to-[#42101E] hover:from-[#471322] hover:to-[#320A15] text-[#FAF5F0] font-semibold text-sm sm:text-[15px] shadow-[0_14px_28px_-12px_rgba(90,26,44,0.5)] transition motion-reduce:transition-none inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
                    >
                      <span>See the Live Experience Below</span>
                      <ArrowRight className="w-4 h-4 text-[#E8C589]" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={handleReviewAnswers}
                      className="w-full py-1.5 text-xs sm:text-sm font-semibold text-[#5A1A2C] hover:underline cursor-pointer text-center"
                    >
                      Review or change my answers
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. CUSTOMER STORIES & TESTIMONIALS (Ported from Win Her Back page + editable in Admin) */}
          {(verifiedTestimonials.length > 0 || isPreviewMode) && (
            <section
              aria-label="Customer stories and testimonials"
              className="px-4 sm:px-6 py-12 sm:py-16 bg-[#F3E5D8]/65"
              data-testid="interactive-testimonials-section"
            >
              <div className="max-w-5xl mx-auto space-y-8">
                <div className="max-w-2xl space-y-2">
                  <p className="text-xs sm:text-sm font-semibold text-[#9A7042]">
                    Customer stories
                  </p>
                  <h2 className="font-serif text-2xl sm:text-3xl text-[#271612] text-balance">
                    Real stories from people who created a Chasing Her experience
                  </h2>
                </div>

                {verifiedTestimonials.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {verifiedTestimonials.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[26px] bg-[#FFFDF9] border border-[#B98A4E]/28 shadow-[0_18px_40px_-24px_rgba(90,26,44,0.22)] overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          {(item.whatsappSent || item.whatsappReply) && (
                            <div className="bg-gradient-to-br from-[#5A1A2C] to-[#2B0A14] p-5 text-[#FBF3EA] space-y-3">
                              {item.badge && (
                                <p className="text-[11px] font-semibold tracking-wider text-[#E2C28E]">
                                  {item.badge}
                                </p>
                              )}
                              <div className="space-y-2">
                                {item.whatsappSent && (
                                  <div className="ml-4 p-2.5 rounded-2xl rounded-tr-xs bg-[#005C4B] text-[12px] text-white leading-snug">
                                    {item.whatsappSent}
                                  </div>
                                )}
                                {item.whatsappReply && (
                                  <div className="mr-4 p-2.5 rounded-2xl rounded-tl-xs bg-[#1F2C34] text-[12px] text-emerald-100 leading-snug border border-white/10">
                                    {item.whatsappReply}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="p-6 space-y-3">
                            {item.headline && (
                              <h3 className="font-serif text-lg leading-snug text-[#5A1A2C] font-medium">
                                {item.headline}
                              </h3>
                            )}
                            <p className="text-sm leading-relaxed text-[#4F3933]">
                              {item.headline ? item.feedback : `“${item.feedback}”`}
                            </p>
                          </div>
                        </div>

                        <div className="px-6 py-4 bg-[#FAF2E8]/75 border-t border-[#B98A4E]/18 space-y-1.5 text-xs text-[#6B5047]">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[#271612] truncate">
                              {item.customerName}
                              {item.location ? (
                                <span className="font-normal text-[#6B5047]">
                                  {' '}
                                  · {item.location}
                                </span>
                              ) : null}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-[#8C654C] truncate">
                              {item.createdWhat}
                            </span>
                            {item.sampleUrl ? (
                              <a
                                href={item.sampleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#5A1A2C] font-semibold hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                              >
                                <span>View sample</span>
                                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                              </a>
                            ) : item.previewTarget ? (
                              <button
                                type="button"
                                onClick={() => {
                                  handleSwitchSampleEdition(item.previewTarget!);
                                  sampleSectionRef.current?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start',
                                  });
                                }}
                                className="text-[#5A1A2C] font-semibold hover:underline cursor-pointer whitespace-nowrap shrink-0"
                              >
                                Try this edition ↓
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div
                    data-testid="testimonial-preview-placeholder"
                    className="rounded-2xl border border-dashed border-[#5A1A2C]/30 bg-white/80 p-6 text-sm text-[#6B5047]"
                  >
                    <p className="font-semibold text-[#5A1A2C]">
                      Testimonial placeholder — replace with verified customer
                      feedback.
                    </p>
                    <p className="mt-1">
                      This block is visible only in preview mode and stays hidden
                      from public visitors until verified testimonials are added
                      in Admin → Sales Pages.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 3. INTERACTIVE PRODUCT EXPERIENCE PREVIEW */}
          <section
            ref={sampleSectionRef}
            id="interactive-sample"
            aria-label="Product experience preview"
            className="px-5 py-12 sm:py-16"
            data-testid="interactive-sample-section"
          >
            <div className="max-w-2xl mx-auto space-y-7">
              <div className="space-y-2">
                <h2 className="font-serif text-2xl sm:text-3xl text-[#271612] text-balance">
                  See what she could experience
                </h2>
                <p className="text-sm sm:text-base text-[#5F453E] leading-relaxed">
                  Explore a sample digital love experience. This is a demo—not a
                  page created for your partner.
                </p>
              </div>

              {/* Dedicated Sample Switcher Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSwitchSampleEdition('chasing-her')}
                  aria-pressed={activeSampleEdition === 'chasing-her'}
                  className={`min-h-[46px] px-5 py-2.5 rounded-full text-sm font-semibold transition motion-reduce:transition-none cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C] ${
                    activeSampleEdition === 'chasing-her'
                      ? 'bg-[#5A1A2C] text-[#FAF5F0]'
                      : 'bg-white border border-[#271612]/16 text-[#271612] hover:border-[#5A1A2C]/45'
                  }`}
                >
                  Explore Chasing Her
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchSampleEdition('memories')}
                  aria-pressed={activeSampleEdition === 'memories'}
                  className={`min-h-[46px] px-5 py-2.5 rounded-full text-sm font-semibold transition motion-reduce:transition-none cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C] ${
                    activeSampleEdition === 'memories'
                      ? 'bg-[#5A1A2C] text-[#FAF5F0]'
                      : 'bg-white border border-[#271612]/16 text-[#271612] hover:border-[#5A1A2C]/45'
                  }`}
                >
                  Explore Memories
                </button>
              </div>

              {/* Live Interactive Demo Container (Clearly Labeled as Demo) */}
              <div className="rounded-3xl border border-[#5A1A2C]/16 bg-[#1A060C] overflow-hidden shadow-[0_24px_55px_-25px_rgba(39,22,18,0.35)]">
                <div className="px-4 sm:px-5 py-3 bg-[#FFFBF6] border-b border-[#5A1A2C]/12 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5F453E]">
                  <span className="font-semibold text-[#5A1A2C]">
                    Interactive Demo ·{' '}
                    {activeSampleEdition === 'chasing-her'
                      ? 'Chasing Her'
                      : 'Memories'}
                  </span>
                  <span className="font-mono tabular-nums">
                    Sample PIN:{' '}
                    <strong className="text-[#271612]">
                      {activeSampleEdition === 'chasing-her'
                        ? chasingHerDemo.pin
                        : memoriesDemo.pin}
                    </strong>{' '}
                    (or skip inside)
                  </span>
                </div>

                <div className="max-h-[640px] overflow-y-auto">
                  <RecipientSitePreview
                    product={activeSampleEdition}
                    chasingHerData={chasingHerDemo}
                    memoriesData={memoriesDemo}
                    isPublicShowcase={true}
                  />
                </div>
              </div>

              {/* Transition Into Product Offer & Final Checkout */}
              <div className="rounded-2xl bg-[#F4E6E2]/65 border border-[#5A1A2C]/12 p-6 sm:p-7 text-center space-y-4">
                <p className="font-serif text-xl sm:text-2xl text-[#271612] text-balance">
                  Now imagine creating one with your own words, photos, and
                  memories.
                </p>
                <button
                  type="button"
                  onClick={handleOpenOfferAndCheckout}
                  className="min-h-[54px] px-7 py-3.5 rounded-full bg-[#5A1A2C] hover:bg-[#42101E] text-[#FAF5F0] font-semibold text-base shadow-[0_14px_28px_-12px_rgba(90,26,44,0.45)] transition motion-reduce:transition-none inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
                >
                  <span>Create My Digital Love Experience</span>
                  <ArrowRight className="w-4 h-4 text-[#E3C6A4]" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>

          {/* 4 & 5. PRODUCT OFFER, EDITIONS & FINAL CHECKOUT (Shown ONLY after Result & Sample Step) */}
          {offerUnlocked && (
            <section
              ref={offerCheckoutSectionRef}
              id="interactive-offer-checkout"
              aria-label="Editions and checkout"
              className="px-5 py-12 sm:py-16 bg-white/60"
              data-testid="interactive-offer-checkout-section"
            >
              <div className="max-w-2xl mx-auto space-y-12">
                {/* Product Details & Editions */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-medium text-[#8C5A52]">
                      {config.brandName} · {config.productName}
                    </p>
                    <h2 className="font-serif text-2xl sm:text-3xl text-[#271612]">
                      Choose your edition
                    </h2>
                    <p className="text-sm sm:text-base text-[#5F453E]">
                      {config.deliverySummary}
                    </p>
                  </div>

                  {/* Configured Pricing Row (Zero Silent Currency Conversion) */}
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-4 border-b border-[#271612]/10">
                    <span className="font-serif text-3xl sm:text-4xl font-semibold text-[#5A1A2C] tabular-nums">
                      {pricing.formattedFinal}
                    </span>
                    {pricing.showDiscount && (
                      <>
                        <span className="text-base text-[#7A6158] line-through tabular-nums">
                          {pricing.formattedRegular}
                        </span>
                        <span className="text-sm font-semibold text-[#5A1A2C] tabular-nums">
                          · {pricing.discountPercent}% off
                        </span>
                      </>
                    )}
                  </div>

                  {/* Two Edition Cards (Concierge Hidden Unless Explicitly Configured) */}
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    role="radiogroup"
                    aria-label="Select edition"
                  >
                    {config.editions.map((edition) => {
                      const isSelected = selectedEdition === edition.id;
                      return (
                        <button
                          key={edition.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setSelectedEdition(edition.id)}
                          className={`text-left rounded-2xl border p-5 sm:p-6 transition motion-reduce:transition-none flex flex-col justify-between gap-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C] ${
                            isSelected
                              ? 'border-[#5A1A2C] bg-[#F4E6E2]/45 shadow-[0_0_0_1px_#5A1A2C]'
                              : 'border-[#271612]/14 bg-white hover:border-[#5A1A2C]/45'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="font-serif text-xl text-[#271612] leading-snug">
                                {edition.name}
                              </h3>
                              <span
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected
                                    ? 'bg-[#5A1A2C] border-[#5A1A2C] text-[#FAF5F0]'
                                    : 'border-[#271612]/25'
                                }`}
                                aria-hidden="true"
                              >
                                {isSelected && (
                                  <Check className="w-3 h-3 stroke-[2.75]" />
                                )}
                              </span>
                            </div>

                            <ul className="space-y-1.5 text-sm text-[#4F3933]">
                              {edition.features.map((feat) => (
                                <li
                                  key={feat}
                                  className="flex items-start gap-2"
                                >
                                  <span
                                    className="text-[#8C5A52] mt-0.5"
                                    aria-hidden="true"
                                  >
                                    ·
                                  </span>
                                  <span>{feat}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="pt-3 border-t border-[#271612]/10 flex items-baseline justify-between gap-2">
                            <span className="text-xs font-medium text-[#6B5047]">
                              {isSelected ? 'Selected' : 'Select edition'}
                            </span>
                            <span className="font-serif text-lg font-semibold text-[#5A1A2C] tabular-nums">
                              {pricing.formattedFinal}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* FINAL CHECKOUT FORM */}
                <div
                  className="rounded-3xl bg-[#FAF5F0] border border-[#5A1A2C]/14 p-6 sm:p-8 space-y-7"
                  data-testid="interactive-final-checkout-form"
                >
                  <div className="space-y-2">
                    <h2 className="font-serif text-2xl sm:text-3xl text-[#271612]">
                      Create Your Digital Love Experience
                    </h2>
                    <p className="text-sm sm:text-base text-[#5F453E] leading-relaxed">
                      You’ve seen what it can look like. Now create a personal
                      experience with your own words, photos, and memories.
                    </p>
                  </div>

                  {/* Order Summary */}
                  <div className="rounded-2xl bg-white border border-[#271612]/12 p-5 space-y-2.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[#6B5047]">Product &amp; edition</span>
                      <span className="font-semibold text-[#271612] text-right">
                        {selectedEditionSpec.name}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[#6B5047]">Regular price</span>
                      <span className="text-[#6B5047] tabular-nums">
                        {pricing.formattedRegular}
                      </span>
                    </div>
                    {pricing.showDiscount && (
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[#6B5047]">Discount</span>
                        <span className="font-medium text-[#5A1A2C] tabular-nums">
                          {pricing.discountPercent}% off
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-3 pt-2.5 border-t border-[#271612]/10">
                      <span className="font-semibold text-[#271612]">
                        Final price
                      </span>
                      <span className="font-serif text-xl font-semibold text-[#5A1A2C] tabular-nums">
                        {pricing.formattedFinal}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B5047] pt-1">
                      Delivery: Instant website access after successful payment
                      confirmation.
                    </p>
                  </div>

                  <form
                    onSubmit={handleCheckoutSubmit}
                    className="space-y-5"
                    noValidate
                  >
                    {/* Recipient's First Name */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="ix-recipient-name"
                        className="block text-sm font-semibold text-[#271612]"
                      >
                        Recipient’s first name
                      </label>
                      <input
                        id="ix-recipient-name"
                        type="text"
                        value={recipientFirstName}
                        onChange={(e) => {
                          setRecipientFirstName(e.target.value);
                          if (checkoutErrors.recipientFirstName) {
                            setCheckoutErrors((p) => ({
                              ...p,
                              recipientFirstName: undefined,
                            }));
                          }
                        }}
                        placeholder="e.g. Amara"
                        aria-invalid={Boolean(checkoutErrors.recipientFirstName)}
                        className={`w-full min-h-[48px] px-4 py-3 rounded-xl bg-white border text-base sm:text-sm text-[#271612] placeholder:text-[#9A7E6E] focus:outline-none focus:ring-2 focus:ring-[#5A1A2C]/20 ${
                          checkoutErrors.recipientFirstName
                            ? 'border-red-600'
                            : 'border-[#271612]/18 focus:border-[#5A1A2C]'
                        }`}
                      />
                      {checkoutErrors.recipientFirstName && (
                        <p role="alert" className="text-xs font-medium text-red-700">
                          {checkoutErrors.recipientFirstName}
                        </p>
                      )}
                    </div>

                    {/* Customer's Name */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="ix-customer-name"
                        className="block text-sm font-semibold text-[#271612]"
                      >
                        Your name
                      </label>
                      <input
                        id="ix-customer-name"
                        type="text"
                        autoComplete="name"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (checkoutErrors.customerName) {
                            setCheckoutErrors((p) => ({
                              ...p,
                              customerName: undefined,
                            }));
                          }
                        }}
                        placeholder="e.g. Kwame Mensah"
                        aria-invalid={Boolean(checkoutErrors.customerName)}
                        className={`w-full min-h-[48px] px-4 py-3 rounded-xl bg-white border text-base sm:text-sm text-[#271612] placeholder:text-[#9A7E6E] focus:outline-none focus:ring-2 focus:ring-[#5A1A2C]/20 ${
                          checkoutErrors.customerName
                            ? 'border-red-600'
                            : 'border-[#271612]/18 focus:border-[#5A1A2C]'
                        }`}
                      />
                      {checkoutErrors.customerName && (
                        <p role="alert" className="text-xs font-medium text-red-700">
                          {checkoutErrors.customerName}
                        </p>
                      )}
                    </div>

                    {/* WhatsApp Number */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="ix-whatsapp"
                        className="block text-sm font-semibold text-[#271612]"
                      >
                        WhatsApp number
                      </label>
                      <div
                        className={`flex items-stretch rounded-xl bg-white border focus-within:ring-2 focus-within:ring-[#5A1A2C]/20 overflow-hidden ${
                          checkoutErrors.whatsapp
                            ? 'border-red-600'
                            : 'border-[#271612]/18 focus-within:border-[#5A1A2C]'
                        }`}
                      >
                        <label htmlFor="ix-dial" className="sr-only">
                          Country dial code
                        </label>
                        <select
                          id="ix-dial"
                          value={selectedDial.iso}
                          onChange={(e) => {
                            const matched = CHECKOUT_DIAL_COUNTRIES.find(
                              (d) => d.iso === e.target.value
                            );
                            if (matched) setSelectedDial(matched);
                          }}
                          className="min-h-[48px] pl-3 pr-2 bg-[#F4E6E2]/60 border-r border-[#271612]/12 text-sm font-medium text-[#271612] focus:outline-none cursor-pointer shrink-0"
                        >
                          {CHECKOUT_DIAL_COUNTRIES.map((opt) => (
                            <option key={opt.iso} value={opt.iso}>
                              {opt.flag} {opt.dial}
                            </option>
                          ))}
                        </select>
                        <input
                          id="ix-whatsapp"
                          type="tel"
                          autoComplete="tel-national"
                          value={customerPhone}
                          onChange={(e) => {
                            setCustomerPhone(e.target.value);
                            if (checkoutErrors.whatsapp) {
                              setCheckoutErrors((p) => ({
                                ...p,
                                whatsapp: undefined,
                              }));
                            }
                          }}
                          placeholder={countryConfig.phonePlaceholder}
                          aria-invalid={Boolean(checkoutErrors.whatsapp)}
                          className="w-full min-h-[48px] px-3.5 py-3 bg-transparent text-base sm:text-sm text-[#271612] placeholder:text-[#9A7E6E] focus:outline-none"
                        />
                      </div>
                      {checkoutErrors.whatsapp && (
                        <p role="alert" className="text-xs font-medium text-red-700">
                          {checkoutErrors.whatsapp}
                        </p>
                      )}
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="ix-email"
                        className="block text-sm font-semibold text-[#271612]"
                      >
                        Email address
                      </label>
                      <input
                        id="ix-email"
                        type="email"
                        autoComplete="email"
                        value={customerEmail}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        placeholder="you@gmail.com"
                        aria-invalid={Boolean(checkoutErrors.email)}
                        className={`w-full min-h-[48px] px-4 py-3 rounded-xl bg-white border text-base sm:text-sm text-[#271612] placeholder:text-[#9A7E6E] focus:outline-none focus:ring-2 focus:ring-[#5A1A2C]/20 ${
                          checkoutErrors.email
                            ? 'border-red-600'
                            : 'border-[#271612]/18 focus:border-[#5A1A2C]'
                        }`}
                      />
                      {checkoutErrors.email && (
                        <p role="alert" className="text-xs font-medium text-red-700">
                          {checkoutErrors.email}
                        </p>
                      )}
                      {emailSuggestion && (
                        <p className="text-xs text-[#5F453E]">
                          Did you mean{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerEmail(emailSuggestion);
                              setEmailSuggestion(undefined);
                            }}
                            className="text-[#5A1A2C] font-semibold underline cursor-pointer"
                          >
                            {emailSuggestion}
                          </button>
                          ?
                        </p>
                      )}
                    </div>

                    {/* Optional 6-Digit PIN */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="ix-pin"
                        className="block text-sm font-semibold text-[#271612]"
                      >
                        Optional 6-digit PIN
                      </label>
                      <input
                        id="ix-pin"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={optionalPin}
                        onChange={(e) => {
                          setOptionalPin(
                            e.target.value.replace(/\D/g, '').slice(0, 6)
                          );
                          if (checkoutErrors.pin) {
                            setCheckoutErrors((p) => ({ ...p, pin: undefined }));
                          }
                        }}
                        placeholder="e.g. 140826 (optional)"
                        aria-invalid={Boolean(checkoutErrors.pin)}
                        className={`w-full min-h-[48px] px-4 py-3 rounded-xl bg-white border font-mono text-base sm:text-sm text-[#271612] placeholder:font-sans placeholder:text-[#9A7E6E] focus:outline-none focus:ring-2 focus:ring-[#5A1A2C]/20 ${
                          checkoutErrors.pin
                            ? 'border-red-600'
                            : 'border-[#271612]/18 focus:border-[#5A1A2C]'
                        }`}
                      />
                      {checkoutErrors.pin ? (
                        <p role="alert" className="text-xs font-medium text-red-700">
                          {checkoutErrors.pin}
                        </p>
                      ) : (
                        <p className="text-xs text-[#6B5047]">
                          A private 6-digit code she enters to open her page. You
                          can set or change this anytime later.
                        </p>
                      )}
                    </div>

                    {/* Terms & Privacy Consent */}
                    <div className="space-y-1.5 pt-1">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consentAccepted}
                          onChange={(e) => {
                            setConsentAccepted(e.target.checked);
                            if (checkoutErrors.consentAccepted) {
                              setCheckoutErrors((p) => ({
                                ...p,
                                consentAccepted: undefined,
                              }));
                            }
                          }}
                          className="mt-1 w-4 h-4 accent-[#5A1A2C] shrink-0 cursor-pointer"
                        />
                        <span className="text-xs sm:text-sm text-[#4F3933] leading-relaxed">
                          I agree to the terms and privacy policy. My contact
                          details are used only to create my private My Site
                          portal and deliver my order—never linked to my
                          anonymous questionnaire answers.
                        </span>
                      </label>
                      {checkoutErrors.consentAccepted && (
                        <p role="alert" className="text-xs font-medium text-red-700">
                          {checkoutErrors.consentAccepted}
                        </p>
                      )}
                    </div>

                    {/* Owner Setup Notice when Live Payment Provider / URL is Not Configured */}
                    {!checkoutReady && (
                      <div
                        data-testid="checkout-not-configured-notice"
                        className="rounded-2xl bg-[#FFF6EA] border border-[#C4965A]/45 p-4 text-xs sm:text-sm text-[#5A3A1A] flex items-start gap-3"
                      >
                        <Info
                          className="w-4 h-4 text-[#9A6826] mt-0.5 shrink-0"
                          aria-hidden="true"
                        />
                        <div className="space-y-1">
                          <p className="font-semibold">
                            Live payment checkout is not yet configured.
                          </p>
                          <p className="leading-relaxed">
                            Secure payment will activate here as soon as a live
                            payment provider and checkout URL are connected in
                            Admin → Sales Pages.
                            {isPreviewMode && (
                              <>
                                {' '}
                                (Or set{' '}
                                <code className="font-mono text-xs">
                                  VITE_INTERACTIVE_CHECKOUT_URL
                                </code>{' '}
                                and{' '}
                                <code className="font-mono text-xs">
                                  VITE_INTERACTIVE_PAYMENT_PROVIDER
                                </code>
                                .)
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {checkoutStatusMessage && (
                      <p
                        role="status"
                        className="rounded-xl bg-[#F4E6E2] border border-[#5A1A2C]/20 px-4 py-3 text-xs sm:text-sm font-medium text-[#5A1A2C]"
                      >
                        {checkoutStatusMessage}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={!checkoutReady || submittingCheckout}
                      className="w-full min-h-[54px] py-4 px-6 rounded-full bg-[#5A1A2C] hover:bg-[#42101E] disabled:opacity-45 disabled:cursor-not-allowed text-[#FAF5F0] font-semibold text-base shadow-[0_14px_28px_-12px_rgba(90,26,44,0.45)] transition motion-reduce:transition-none flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#E3C6A4]" aria-hidden="true" />
                      <span>
                        {submittingCheckout
                          ? 'Opening secure payment...'
                          : 'Continue to Secure Payment'}
                      </span>
                    </button>

                    <p className="text-center text-xs text-[#6B5047]">
                      {checkoutReady
                        ? `Processed securely via ${config.checkout.paymentProvider}. Redirects to My Site after payment confirmation.`
                        : 'Payment will open only after a live payment provider and checkout URL are connected.'}
                    </p>
                  </form>
                </div>
              </div>
            </section>
          )}

          {/* Quiet Footer */}
          <footer className="px-5 py-10 text-center text-xs text-[#6B5047] space-y-1.5">
            <p className="font-serif text-base text-[#5A1A2C]">
              {config.brandName} · {config.productName}
            </p>
            <p>Private digital love letters and keepsakes</p>
          </footer>
        </div>
      )}
    </div>
  );
};
