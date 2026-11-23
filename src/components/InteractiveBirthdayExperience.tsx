import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  Gift,
  Info,
  Lock,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  ActiveCountryCode,
  COUNTRIES,
  CountryCode,
  ChasingHerProjectData,
  MemoriesProjectData,
  getLockedFlowerWallUrls,
  normalizeActiveCountry,
  validateCustomerEmail,
} from '../utils/platformLogic';
import { SALES_PAGE_ASSETS } from '../utils/salesPageAssets';
import {
  CHECKOUT_DIAL_COUNTRIES,
  DialCountryOption,
} from '../utils/checkoutFlow';
import { InteractiveEditionId } from '../utils/interactiveSalesConfig';
import {
  BIRTHDAY_INTERACTIVE_QUESTIONS,
  BirthdayBuildMode,
  BirthdayCheckoutFormErrors,
  BirthdayInteractiveConfig,
  BirthdayQuestionnaireAnswers,
  calculateBirthdayOfferPricing,
  evaluateBirthdayQuestionnaire,
  isBirthdayCheckoutConfigured,
  trackAnonymousFunnelEvent,
  validateBirthdayCheckoutForm,
} from '../utils/birthdayInteractiveConfig';
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

interface InteractiveBirthdayExperienceProps {
  country: CountryCode;
  config: BirthdayInteractiveConfig;
  chasingHerDemo: ChasingHerProjectData;
  memoriesDemo: MemoriesProjectData;
  isPreviewMode?: boolean;
}

type BirthdayStage = 'intro' | 'questionnaire' | 'result';

export const InteractiveBirthdayExperience: React.FC<
  InteractiveBirthdayExperienceProps
> = ({
  country,
  config,
  chasingHerDemo,
  memoriesDemo,
  isPreviewMode = false,
}) => {
  const activeMarket: ActiveCountryCode = normalizeActiveCountry(country);
  const countryConfig = COUNTRIES[activeMarket] || COUNTRIES.gh;
  const marketConfig = config.markets[activeMarket] || config.markets.gh;

  // Stage state: Intro -> Questionnaire (1 question per screen) -> Result Journey
  const [stage, setStage] = useState<BirthdayStage>('intro');
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<BirthdayQuestionnaireAnswers>({});

  // Post-result progressive journey state
  const [activeSampleEdition, setActiveSampleEdition] =
    useState<InteractiveEditionId>('chasing-her');
  const [offerUnlocked, setOfferUnlocked] = useState<boolean>(false);

  // Final checkout form state (never shown before questionnaire + result + sample CTA)
  const [selectedEdition, setSelectedEdition] =
    useState<InteractiveEditionId>('chasing-her');
  const [buildMode, setBuildMode] = useState<BirthdayBuildMode>('self-build');
  const [recipientName, setRecipientName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [senderName, setSenderName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [selectedDial, setSelectedDial] = useState<DialCountryOption>(
    () =>
      CHECKOUT_DIAL_COUNTRIES.find((d) => d.linkedCountry === activeMarket) ||
      CHECKOUT_DIAL_COUNTRIES[0]
  );
  const [checkoutErrors, setCheckoutErrors] =
    useState<BirthdayCheckoutFormErrors>({});
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
      createFunnelSession('birthday-interactive', activeMarket);
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
      const initial = createFunnelSession('birthday-interactive', activeMarket);
      funnelSessionRef.current = initial;
      upsertLocalFunnelSession(initial);
      void upsertFunnelSessionToFirestore(initial, false).then((ok) => {
        if (ok) firestoreCreatedRef.current = true;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const matched = CHECKOUT_DIAL_COUNTRIES.find(
      (d) => d.linkedCountry === activeMarket
    );
    if (matched) {
      setSelectedDial(matched);
    }
  }, [activeMarket]);

  useEffect(() => {
    if (!config.checkout.conciergeEnabled && buildMode === 'concierge') {
      setBuildMode('self-build');
    }
  }, [config.checkout.conciergeEnabled, buildMode]);

  const currentQuestion = BIRTHDAY_INTERACTIVE_QUESTIONS[questionIndex];
  const currentAnswerId = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;

  const evaluatedResult = useMemo(
    () =>
      evaluateBirthdayQuestionnaire(answers, {
        conciergeEnabled: config.checkout.conciergeEnabled,
      }),
    [answers, config.checkout.conciergeEnabled]
  );

  const pricing = useMemo(
    () => calculateBirthdayOfferPricing(marketConfig),
    [marketConfig]
  );

  const checkoutReady = useMemo(
    () => isBirthdayCheckoutConfigured(config.checkout),
    [config.checkout]
  );

  const verifiedTestimonials = useMemo(
    () => config.verifiedTestimonials.filter((t) => t.verifiedPermission),
    [config.verifiedTestimonials]
  );

  const selectedEditionSpec =
    config.editions.find((e) => e.id === selectedEdition) || config.editions[0];

  // Birthday-themed interactive demo wrappers using real curated photos, music, and locked 5-blossom wall
  const birthdayChasingHerDemo = useMemo<ChasingHerProjectData>(
    () => ({
      ...chasingHerDemo,
      intro_message:
        'Happy Birthday — I gathered our favorite moments, your favorite song, and a quiet birthday letter into one private page made just for you.',
      letter_title: 'Happy Birthday, My Favorite Person,',
      letter_body:
        'Another year around the sun, and I wanted to give you something more personal than a passing birthday text.\n\nEvery photo on this page holds a moment I still smile about. Thank you for the warmth, laughter, and steadiness you bring into my life.\n\nMay this new year bring you deep peace, joy, and everything you have been hoping for.',
      final_message: 'Happy Birthday — always cheering for you.',
    }),
    [chasingHerDemo]
  );

  const birthdayMemoriesDemo = useMemo<MemoriesProjectData>(
    () => ({
      ...memoriesDemo,
      hero_title: 'Happy Birthday, My Love',
      hero_subtitle:
        '34 moments we have shared, arranged into one private birthday keepsake.',
      collage_quote:
        'Celebrating another year of you — and every memory still ahead of us.',
      letter_title: 'Happy Birthday,',
      letter_body:
        'Every tile in this heart holds a memory I never want to lose. Press play on the voice note whenever you want a reminder of how deeply you are appreciated today and every day after.',
      final_message: 'Wishing you the brightest year ahead.',
    }),
    [memoriesDemo]
  );

  const flowerUrls = useMemo(
    () => getLockedFlowerWallUrls(import.meta.env.BASE_URL || '/'),
    []
  );
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  const activePriceDisplay =
    buildMode === 'concierge' && config.checkout.conciergeEnabled
      ? pricing.formattedConcierge
      : pricing.formattedSelfBuild;

  const activePriceAmount =
    buildMode === 'concierge' && config.checkout.conciergeEnabled
      ? pricing.conciergePrice
      : pricing.selfBuildPrice;

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

    if (questionIndex < BIRTHDAY_INTERACTIVE_QUESTIONS.length - 1) {
      const nextQuestion = BIRTHDAY_INTERACTIVE_QUESTIONS[questionIndex + 1];
      if (nextQuestion) {
        persistFunnelProgress(nextQuestion.id);
      }
      setQuestionIndex((idx) => idx + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        questionHeadingRef.current?.focus();
      }, 80);
    } else {
      const nextResult = evaluateBirthdayQuestionnaire(answers, {
        conciergeEnabled: config.checkout.conciergeEnabled,
      });
      const defaultEdition: InteractiveEditionId =
        nextResult.recommendedEdition === 'memories'
          ? 'memories'
          : 'chasing-her';
      setActiveSampleEdition(defaultEdition);
      setSelectedEdition(defaultEdition);
      if (
        nextResult.recommendedBuildMode === 'concierge' &&
        config.checkout.conciergeEnabled
      ) {
        setBuildMode('concierge');
      } else {
        setBuildMode('self-build');
      }
      setStage('result');
      persistFunnelProgress('result', {
        resultId: nextResult.id,
        resultTitle: nextResult.title,
        recommendedEdition: nextResult.recommendedEdition,
      });
      trackAnonymousFunnelEvent('result_viewed', {
        edition: defaultEdition,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackQuestion = () => {
    if (questionIndex > 0) {
      const prevQuestion = BIRTHDAY_INTERACTIVE_QUESTIONS[questionIndex - 1];
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

  const handleExploreBirthdayExperience = () => {
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
    persistFunnelProgress('sample');
    trackAnonymousFunnelEvent('sample_opened', { edition });
  };

  const handleOpenOfferAndCheckout = () => {
    setOfferUnlocked(true);
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

  const handlePinBlur = () => {
    const digits = pinCode.replace(/\D/g, '');
    if (digits.length > 0 && digits.length !== 6) {
      setCheckoutErrors((prev) => ({
        ...prev,
        pin: 'Enter a 6-digit PIN (for example, their birthday like 140826).',
      }));
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingCheckout || !checkoutReady) return;

    setCheckoutStatusMessage(null);
    const effectiveBuildMode: BirthdayBuildMode =
      buildMode === 'concierge' && config.checkout.conciergeEnabled
        ? 'concierge'
        : 'self-build';

    const validation = validateBirthdayCheckoutForm({
      edition: selectedEdition,
      buildMode: effectiveBuildMode,
      recipientName,
      pin: pinCode,
      senderName,
      whatsapp: customerPhone,
      email: customerEmail,
      consentAccepted,
      country: selectedDial.linkedCountry || activeMarket,
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
      const orderRef = `CH-BDAY-${Date.now()}`;
      const returnUrl = new URL(
        config.checkout.postPaymentRedirectUrl || '/my-site/',
        window.location.origin
      ).toString();

      try {
        sessionStorage.setItem(
          'ch_pending_birthday_checkout_draft',
          JSON.stringify({
            orderRef,
            edition: selectedEdition,
            buildMode: effectiveBuildMode,
            recipientName: recipientName.trim(),
            pin: validation.normalizedPin,
            senderName: senderName.trim(),
            email: customerEmail.trim().toLowerCase(),
            whatsapp: validation.normalizedWhatsapp,
            currency: pricing.currency,
            amount: activePriceAmount,
          })
        );
      } catch {
        // Ignore private storage restrictions
      }

      const targetCheckout = new URL(config.checkout.checkoutUrl);
      targetCheckout.searchParams.set('edition', selectedEdition);
      targetCheckout.searchParams.set('build_mode', effectiveBuildMode);
      targetCheckout.searchParams.set('reference', orderRef);
      targetCheckout.searchParams.set(
        'email',
        customerEmail.trim().toLowerCase()
      );
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
      ? Math.round(
          (currentQuestion.number / BIRTHDAY_INTERACTIVE_QUESTIONS.length) * 100
        )
      : 100;

  return (
    <div
      className="relative min-h-screen overflow-x-clip bg-[#FBF3EA] text-[#271612] selection:bg-[#5A1A2C] selection:text-[#FAF5F0]"
      data-testid="interactive-birthday-experience"
    >
      {/* Warm Celebratory Ambient Glow & Signature Botanical Framing */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div
          className="absolute -top-32 -right-24 w-[440px] h-[440px] rounded-full opacity-45 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(212,163,142,0.48) 0%, rgba(251,243,234,0) 70%)',
          }}
        />
        <div
          className="absolute -bottom-32 -left-24 w-[460px] h-[460px] rounded-full opacity-45 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(201,155,98,0.34) 0%, rgba(251,243,234,0) 70%)',
          }}
        />
        {flowerUrls[0] && (
          <img
            src={flowerUrls[0]}
            alt=""
            className="hidden sm:block absolute -top-10 -right-12 w-48 md:w-64 opacity-[0.22] rotate-12 select-none"
          />
        )}
        {flowerUrls[1] && (
          <img
            src={flowerUrls[1]}
            alt=""
            className="hidden sm:block absolute -bottom-14 -left-14 w-52 md:w-64 opacity-[0.20] -rotate-12 select-none"
          />
        )}
      </div>

      {/* Calm, Minimal Top Bar */}
      <header className="sticky top-0 z-30 h-14 bg-[#FBF3EA]/90 backdrop-blur-md border-b border-[#B98A4E]/22">
        <div className="max-w-4xl h-full mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <span className="font-serif text-lg sm:text-xl font-medium tracking-tight text-[#271612] whitespace-nowrap shrink-0">
            {config.brandName}
          </span>

          {stage === 'questionnaire' && currentQuestion && (
            <span className="text-xs sm:text-sm font-medium text-[#7A5248] whitespace-nowrap shrink-0">
              Birthday Gift Match
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
          SCREEN 1 · OPENING HEADLINE & START (No Prices, No Checkout Inputs)
         ===================================================================== */}
      {stage === 'intro' && (
        <section
          aria-label="Birthday gift match introduction"
          className="relative z-10 min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-14"
          data-testid="birthday-intro-screen"
        >
          <div className="w-full max-w-2xl mx-auto">
            <div className="relative rounded-[30px] bg-[#FFFDF9]/96 border border-[#B98A4E]/32 shadow-[0_32px_80px_-34px_rgba(90,26,44,0.28)] overflow-hidden">
              {/* Top Champagne-Burgundy Stationery Trim */}
              <div
                aria-hidden="true"
                className="h-1.5 w-full bg-gradient-to-r from-[#5A1A2C] via-[#D2A366] to-[#5A1A2C]"
              />

              {/* Subtle Botanical Corner Watermark */}
              {flowerUrls[2] && (
                <img
                  src={flowerUrls[2]}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none select-none absolute -top-8 -right-8 w-28 sm:w-36 opacity-[0.18] rotate-12"
                />
              )}

              <div className="relative px-6 py-9 sm:px-12 sm:py-12 space-y-7 text-center">
                {/* Brand Subtitle & Monogram */}
                <div className="space-y-3">
                  <p className="text-xs sm:text-sm font-medium tracking-wide text-[#8C5A46]">
                    {config.brandName} · {config.productName}
                  </p>
                  <div
                    aria-hidden="true"
                    className="flex items-center justify-center gap-3 text-[#B98A4E]"
                  >
                    <span className="h-px w-10 bg-[#B98A4E]/45" />
                    <Gift className="w-4 h-4 text-[#B98A4E]" />
                    <span className="h-px w-10 bg-[#B98A4E]/45" />
                  </div>
                </div>

                {/* Exact Opening Headline with Burgundy Italic Emphasis */}
                <h1 className="font-serif text-[27px] sm:text-[38px] leading-[1.18] tracking-tight text-[#271612] text-balance">
                  Is Our Digital Love Letter the{' '}
                  <em className="italic text-[#5A1A2C] font-normal">
                    Best Birthday Gift
                  </em>{' '}
                  to Get Your Partner?
                </h1>

                <p className="max-w-xl mx-auto text-[15px] sm:text-[17px] leading-relaxed text-[#5A423A]">
                  Answer 6 quick questions about the birthday you’re planning.
                  We’ll match you with the exact Chasing Her keepsake—whether as
                  their centerpiece birthday surprise or the personal upgrade
                  that makes your gift unforgettable.
                </p>

                {/* Tactile Keepsake Polaroid Preview Strip (Warmth, Zero Prices/Inputs) */}
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
                    <div className="relative z-10 w-[72px] sm:w-[88px] bg-white p-1.5 pb-3.5 rounded-[4px] shadow-lg border border-[#B98A4E]/35 -translate-y-1">
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
                    Under 2 minutes · Honest gift match · Interactive birthday sample
                  </p>
                </div>

                {/* Single Primary CTA + Privacy Note */}
                <div className="pt-1 space-y-4">
                  <button
                    type="button"
                    onClick={handleStartQuestionnaire}
                    className="w-full sm:w-auto min-h-[56px] px-6 sm:px-9 py-4 rounded-full bg-gradient-to-r from-[#5A1A2C] via-[#6B1F34] to-[#4A1322] hover:from-[#471322] hover:to-[#3A0E1B] text-[#FAF5F0] font-semibold text-[15px] sm:text-base shadow-[0_18px_36px_-14px_rgba(90,26,44,0.55)] ring-1 ring-[#E2B96F]/30 transition motion-reduce:transition-none inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
                  >
                    <span>Find My Birthday Gift Match</span>
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
          aria-label={`Question ${currentQuestion.number} of ${BIRTHDAY_INTERACTIVE_QUESTIONS.length}`}
          className="relative z-10 min-h-[calc(100vh-3.5rem)] flex flex-col justify-center px-4 sm:px-6 py-7 sm:py-12"
          data-testid="birthday-questionnaire-screen"
        >
          <div className="w-full max-w-2xl mx-auto">
            <div className="relative rounded-[28px] bg-[#FFFDF9]/96 border border-[#B98A4E]/32 shadow-[0_28px_70px_-30px_rgba(90,26,44,0.24)] overflow-hidden">
              <div
                aria-hidden="true"
                className="h-1 w-full bg-gradient-to-r from-[#5A1A2C] via-[#D2A366] to-[#5A1A2C]/65"
              />

              {flowerUrls[0] && (
                <img
                  src={flowerUrls[0]}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none select-none absolute -top-12 -right-12 w-28 sm:w-36 opacity-[0.09] sm:opacity-[0.13] rotate-12"
                />
              )}

              <div className="relative p-6 sm:p-10 space-y-7">
                {/* 6-Step Segmented Progress Track */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-[#5A1A2C] tabular-nums">
                      Question {currentQuestion.number} of{' '}
                      {BIRTHDAY_INTERACTIVE_QUESTIONS.length}
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
                    aria-valuemax={BIRTHDAY_INTERACTIVE_QUESTIONS.length}
                    aria-label="Birthday questionnaire progress"
                  >
                    {BIRTHDAY_INTERACTIVE_QUESTIONS.map((q, idx) => (
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
                    Choose the option that fits your birthday plans best.
                  </p>
                </div>

                {/* Large Tappable Answer Cards with A–F Serif Letter Medallions */}
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
                          {isSelected && (
                            <Check className="w-3 h-3 stroke-[2.75]" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Back + Manual Continue / Show My Gift Match */}
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
                      No right or wrong answers
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={!currentAnswerId}
                    onClick={handleContinueQuestion}
                    className="min-h-[50px] px-7 py-3 rounded-full bg-gradient-to-r from-[#5A1A2C] to-[#461120] hover:from-[#471322] hover:to-[#350B17] disabled:opacity-40 disabled:cursor-not-allowed text-[#FAF5F0] font-semibold text-sm sm:text-base shadow-[0_14px_28px_-12px_rgba(90,26,44,0.5)] transition motion-reduce:transition-none inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
                  >
                    <span>
                      {questionIndex ===
                      BIRTHDAY_INTERACTIVE_QUESTIONS.length - 1
                        ? 'Show My Gift Match'
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
          SCREEN 3 · PERSONALIZED GIFT MATCH, TESTIMONIALS, SAMPLE & CHECKOUT
         ===================================================================== */}
      {stage === 'result' && (
        <div
          className="relative z-10 divide-y divide-[#B98A4E]/18"
          data-testid="birthday-result-journey"
        >
          {/* 1. PERSONALIZED BIRTHDAY GIFT MATCH RESULT (Luxury Burgundy-Champagne Hero + 2-Column Blueprint) */}
          <section
            aria-label="Your Gift Match"
            className="px-4 sm:px-6 py-10 sm:py-16"
          >
            <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
              {/* Signature Celebratory Burgundy & Gold Result Hero Card */}
              <div className="relative rounded-[30px] bg-gradient-to-br from-[#4C1222] via-[#3A0C19] to-[#240710] border border-[#E2B96F]/32 shadow-[0_34px_80px_-30px_rgba(39,10,19,0.65)] overflow-hidden text-[#FBF3EA]">
                <div
                  aria-hidden="true"
                  className="h-1.5 w-full bg-gradient-to-r from-[#C99B62] via-[#F2D59B] to-[#C99B62]"
                />
                {flowerUrls[0] && (
                  <img
                    src={flowerUrls[0]}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none select-none absolute -top-12 -right-12 w-40 sm:w-56 opacity-[0.14] rotate-12"
                  />
                )}
                {flowerUrls[1] && (
                  <img
                    src={flowerUrls[1]}
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none select-none absolute -bottom-16 -left-12 w-44 sm:w-56 opacity-[0.12] -rotate-12"
                  />
                )}

                <div className="relative p-6 sm:p-10 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                  {/* Left: High-Conviction Celebratory Match Copy */}
                  <div className="lg:col-span-7 space-y-5">
                    <div className="space-y-2.5">
                      <p className="text-xs font-semibold tracking-[0.16em] uppercase text-[#E8C589]">
                        Your Birthday Gift Match · {config.brandName}
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
                        onClick={handleExploreBirthdayExperience}
                        className="min-h-[54px] px-7 py-3.5 rounded-full bg-gradient-to-r from-[#E6C07B] via-[#F1D59B] to-[#D8AC62] hover:from-[#F2D59B] hover:to-[#E2B76D] text-[#240710] font-semibold text-[15px] sm:text-base shadow-[0_18px_36px_-14px_rgba(232,197,137,0.55)] transition motion-reduce:transition-none inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2D59B]"
                      >
                        <span>
                          {evaluatedResult.prioritizeSampleBeforeCheckout
                            ? 'Experience the Birthday Demo First'
                            : 'Explore the Birthday Experience'}
                        </span>
                        <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenOfferAndCheckout}
                        className="min-h-[54px] px-6 py-3.5 rounded-full border border-[#E8C589]/40 bg-[#FBF3EA]/8 hover:bg-[#FBF3EA]/16 text-[#FBF3EA] font-semibold text-sm sm:text-[15px] transition motion-reduce:transition-none inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2D59B]"
                      >
                        <span>Create Their Gift Now</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: Keepsake Polaroid Showcase + Market Price Anchor */}
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
                          Matched Birthday Edition
                        </p>
                        <p className="font-serif text-lg sm:text-xl text-[#FBF3EA] leading-snug">
                          {evaluatedResult.recommendedEditionLabel}
                        </p>
                        <p className="text-xs text-[#FBF3EA]/72 leading-relaxed">
                          Ready in 20 minutes on your phone · {config.checkout.hostingDurationLabel}
                        </p>
                      </div>

                      <div className="flex items-baseline justify-center gap-2.5 pt-2 border-t border-[#E2B96F]/18">
                        <span className="font-serif text-2xl sm:text-3xl font-semibold text-[#F2D59B] tabular-nums">
                          {pricing.formattedSelfBuild}
                        </span>
                        {pricing.showPreviousPrice && (
                          <span className="text-sm text-[#FBF3EA]/55 line-through tabular-nums">
                            {pricing.formattedPrevious}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Column Persuasive Birthday Blueprint */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Left Column: Why This Makes Their Birthday Unforgettable */}
                <div className="lg:col-span-7 rounded-[26px] bg-[#FFFDF9] border border-[#B98A4E]/30 shadow-[0_22px_50px_-30px_rgba(90,26,44,0.2)] overflow-hidden flex flex-col justify-between">
                  <div
                    aria-hidden="true"
                    className="h-1 w-full bg-gradient-to-r from-[#5A1A2C] via-[#D2A366] to-[#5A1A2C]/60"
                  />
                  <div className="p-6 sm:p-8 space-y-6 flex-1">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#9A7042]">
                        Why This Wins Their Birthday
                      </p>
                      <h2 className="font-serif text-2xl sm:text-[28px] leading-tight text-[#271612]">
                        How Chasing Her turns their birthday into a lasting memory
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
                        What happens when they unlock their birthday PIN
                      </h3>
                      <ol className="space-y-3.5">
                        {evaluatedResult.whatTheyExperience.map((moment, idx) => (
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

                {/* Right Column: Recommended Birthday Plan & Instant Conversion CTA */}
                <div className="lg:col-span-5 rounded-[26px] bg-[#FAF1E6] border border-[#B98A4E]/35 shadow-[0_22px_50px_-30px_rgba(90,26,44,0.2)] p-6 sm:p-8 flex flex-col justify-between gap-6">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#9A7042]">
                        Your Recommended Gift Plan
                      </p>
                      <h2 className="font-serif text-2xl text-[#271612] leading-snug">
                        {evaluatedResult.recommendedEditionLabel}
                      </h2>
                      <p className="text-sm leading-relaxed text-[#5F453E]">
                        {evaluatedResult.fitExplanation}
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

                    <p className="text-xs sm:text-sm leading-relaxed text-[#6B5047] pt-2 border-t border-[#B98A4E]/18">
                      {evaluatedResult.buildModeNote}
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-4 border-t border-[#B98A4E]/22">
                    <p className="text-sm leading-relaxed text-[#4F3933] font-medium">
                      {evaluatedResult.closingNudge}
                    </p>
                    <button
                      type="button"
                      onClick={handleExploreBirthdayExperience}
                      className="w-full min-h-[52px] px-6 py-3.5 rounded-full bg-gradient-to-r from-[#5A1A2C] to-[#42101E] hover:from-[#471322] hover:to-[#320A15] text-[#FAF5F0] font-semibold text-sm sm:text-[15px] shadow-[0_14px_28px_-12px_rgba(90,26,44,0.5)] transition motion-reduce:transition-none inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
                    >
                      <span>See the Live Birthday Demo</span>
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

          {/* 2. TESTIMONIALS (Hidden from public visitors until verified content is added; placeholder in ?preview=1) */}
          {(verifiedTestimonials.length > 0 || isPreviewMode) && (
            <section
              aria-label="Birthday gifts made personal"
              className="px-4 sm:px-6 py-12 sm:py-16 bg-[#F3E5D8]/65"
              data-testid="birthday-testimonials-section"
            >
              <div className="max-w-5xl mx-auto space-y-8">
                <div className="max-w-2xl space-y-2">
                  <p className="text-xs sm:text-sm font-semibold text-[#9A7042]">
                    Verified customer stories
                  </p>
                  <h2 className="font-serif text-2xl sm:text-3xl text-[#271612] text-balance">
                    Birthday gifts made personal
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
                              {item.headline
                                ? item.feedback
                                : `“${item.feedback}”`}
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
                                <ExternalLink
                                  className="w-3.5 h-3.5"
                                  aria-hidden="true"
                                />
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
                    data-testid="birthday-testimonial-preview-placeholder"
                    className="rounded-2xl border border-dashed border-[#5A1A2C]/30 bg-white/85 p-6 text-sm text-[#6B5047]"
                  >
                    <p className="font-semibold text-[#5A1A2C]">
                      Testimonial placeholder — replace with verified customer
                      feedback.
                    </p>
                    <p className="mt-1">
                      Visible only in preview mode. Public visitors will not see
                      this section until verified customer feedback is added in
                      Admin → Sales Pages.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 3. INTERACTIVE BIRTHDAY PRODUCT EXPERIENCE PREVIEW */}
          <section
            ref={sampleSectionRef}
            id="birthday-interactive-sample"
            aria-label="Birthday experience preview"
            className="px-4 sm:px-6 py-12 sm:py-16"
            data-testid="birthday-sample-section"
          >
            <div className="max-w-3xl mx-auto space-y-7">
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-semibold text-[#9A7042]">
                  Interactive sample
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#271612] text-balance">
                  See what their birthday experience could look like
                </h2>
                <p className="text-sm sm:text-base text-[#5F453E] leading-relaxed">
                  Explore a sample digital birthday keepsake. This is a demo—not
                  a personalized page created for your recipient.
                </p>
              </div>

              {/* Separate Dedicated Buttons for Both Editions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSwitchSampleEdition('chasing-her')}
                  aria-pressed={activeSampleEdition === 'chasing-her'}
                  className={`min-h-[46px] px-5 py-2.5 rounded-full text-sm font-semibold transition motion-reduce:transition-none cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C] ${
                    activeSampleEdition === 'chasing-her'
                      ? 'bg-[#5A1A2C] text-[#FAF5F0] shadow-sm'
                      : 'bg-[#FFFDF9] border border-[#B98A4E]/35 text-[#271612] hover:border-[#5A1A2C]/50'
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
                      ? 'bg-[#5A1A2C] text-[#FAF5F0] shadow-sm'
                      : 'bg-[#FFFDF9] border border-[#B98A4E]/35 text-[#271612] hover:border-[#5A1A2C]/50'
                  }`}
                >
                  Explore Memories
                </button>
              </div>

              {/* Live Interactive Demo Container */}
              <div className="rounded-3xl border border-[#B98A4E]/30 bg-[#1A060C] overflow-hidden shadow-[0_24px_55px_-25px_rgba(39,22,18,0.35)]">
                <div className="px-4 sm:px-5 py-3 bg-[#FFFDF9] border-b border-[#B98A4E]/22 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5F453E]">
                  <span className="font-semibold text-[#5A1A2C]">
                    Birthday Demo ·{' '}
                    {activeSampleEdition === 'chasing-her'
                      ? 'Chasing Her'
                      : 'Memories'}
                  </span>
                  <span className="font-mono tabular-nums">
                    Sample PIN:{' '}
                    <strong className="text-[#271612]">
                      {activeSampleEdition === 'chasing-her'
                        ? birthdayChasingHerDemo.pin
                        : birthdayMemoriesDemo.pin}
                    </strong>{' '}
                    (or skip inside)
                  </span>
                </div>

                <div className="max-h-[640px] overflow-y-auto">
                  <RecipientSitePreview
                    product={activeSampleEdition}
                    chasingHerData={birthdayChasingHerDemo}
                    memoriesData={birthdayMemoriesDemo}
                    isPublicShowcase={true}
                  />
                </div>
              </div>

              {/* Transition Into Product Offer & Final Checkout */}
              <div className="rounded-[26px] bg-[#FFFDF9] border border-[#B98A4E]/32 p-6 sm:p-8 text-center space-y-4 shadow-[0_18px_40px_-28px_rgba(90,26,44,0.22)]">
                <p className="font-serif text-xl sm:text-2xl text-[#271612] text-balance">
                  Now imagine making one with their name, your photos, and a
                  message written just for them.
                </p>
                <button
                  type="button"
                  onClick={handleOpenOfferAndCheckout}
                  className="min-h-[54px] px-7 py-3.5 rounded-full bg-gradient-to-r from-[#5A1A2C] to-[#451120] hover:from-[#471322] hover:to-[#350B17] text-[#FAF5F0] font-semibold text-base shadow-[0_16px_32px_-12px_rgba(90,26,44,0.5)] transition motion-reduce:transition-none inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
                >
                  <span>Create Their Birthday Keepsake</span>
                  <ArrowRight
                    className="w-4 h-4 text-[#E8C589]"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </section>

          {/* 4 & 5. PRODUCT OFFER, EDITIONS, SELF-BUILD/CONCIERGE & FINAL CHECKOUT */}
          {offerUnlocked && (
            <section
              ref={offerCheckoutSectionRef}
              id="birthday-offer-checkout"
              aria-label="Editions, pricing, and checkout"
              className="px-4 sm:px-6 py-12 sm:py-16 bg-[#F6ECE1]/70"
              data-testid="birthday-offer-checkout-section"
            >
              <div className="max-w-3xl mx-auto space-y-12">
                {/* Editions & Configured Market Pricing */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs sm:text-sm font-semibold text-[#9A7042]">
                      {config.brandName} · {config.productName} ({countryConfig.name})
                    </p>
                    <h2 className="font-serif text-2xl sm:text-3xl text-[#271612]">
                      Choose the birthday edition &amp; how you want to build it
                    </h2>
                    <p className="text-sm sm:text-base text-[#5F453E]">
                      Includes {config.checkout.hostingDurationLabel} and{' '}
                      {config.checkout.autoSaveLabel} inside My Site.
                    </p>
                  </div>

                  {/* Configured Market Pricing Summary Row (Zero Silent Conversion) */}
                  <div
                    className="rounded-2xl bg-[#FFFDF9] border border-[#B98A4E]/28 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    data-testid="birthday-market-pricing-banner"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-[#8C654C]">
                        Self-Build Keepsake ({countryConfig.name})
                      </p>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-serif text-3xl sm:text-4xl font-semibold text-[#5A1A2C] tabular-nums">
                          {pricing.formattedSelfBuild}
                        </span>
                        {pricing.showPreviousPrice && (
                          <span className="text-base text-[#7A6158] line-through tabular-nums">
                            {pricing.formattedPrevious}
                          </span>
                        )}
                      </div>
                    </div>

                    <ul className="text-xs sm:text-sm text-[#4F3933] space-y-1">
                      <li className="flex items-center gap-2">
                        <Check
                          className="w-3.5 h-3.5 text-[#5A1A2C] shrink-0"
                          aria-hidden="true"
                        />
                        <span>{config.checkout.hostingDurationLabel}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check
                          className="w-3.5 h-3.5 text-[#5A1A2C] shrink-0"
                          aria-hidden="true"
                        />
                        <span>{config.checkout.autoSaveLabel}</span>
                      </li>
                    </ul>
                  </div>

                  {/* Edition 01 & Edition 02 Cards */}
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    role="radiogroup"
                    aria-label="Select birthday edition"
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
                              ? 'border-[#5A1A2C] bg-[#F6E6E1]/75 shadow-[0_0_0_1px_#5A1A2C]'
                              : 'border-[#B98A4E]/28 bg-[#FFFDF9] hover:border-[#5A1A2C]/45'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-semibold text-[#9A7042]">
                                  {edition.editionNumber}
                                </p>
                                <h3 className="font-serif text-xl text-[#271612] leading-snug mt-0.5">
                                  {edition.name}
                                </h3>
                              </div>
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

                            <p className="text-xs sm:text-sm text-[#5F453E] leading-relaxed">
                              {edition.tagline}
                            </p>

                            <ul className="space-y-1.5 text-xs sm:text-sm text-[#4F3933]">
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

                          <div className="pt-3 border-t border-[#B98A4E]/20 flex items-baseline justify-between gap-2">
                            <span className="text-xs font-medium text-[#6B5047]">
                              {isSelected ? 'Selected' : 'Select edition'}
                            </span>
                            <span className="font-serif text-lg font-semibold text-[#5A1A2C] tabular-nums">
                              {pricing.formattedSelfBuild}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Build Mode Selector (Concierge Shown ONLY When Explicitly Enabled in Config) */}
                  {config.checkout.conciergeEnabled && (
                    <div
                      className="space-y-3 pt-2"
                      data-testid="birthday-concierge-selector"
                    >
                      <h3 className="font-serif text-xl text-[#271612]">
                        How would you like to build it?
                      </h3>
                      <div
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                        role="radiogroup"
                        aria-label="Select build option"
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={buildMode === 'self-build'}
                          onClick={() => setBuildMode('self-build')}
                          className={`text-left rounded-2xl border p-5 transition cursor-pointer ${
                            buildMode === 'self-build'
                              ? 'border-[#5A1A2C] bg-[#F6E6E1]/75 shadow-[0_0_0_1px_#5A1A2C]'
                              : 'border-[#B98A4E]/28 bg-[#FFFDF9] hover:border-[#5A1A2C]/45'
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-serif text-lg text-[#271612]">
                              Self-Build
                            </span>
                            <span className="font-serif text-lg font-semibold text-[#5A1A2C] tabular-nums">
                              {pricing.formattedSelfBuild}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-[#5F453E] mt-1.5 leading-relaxed">
                            Guided step-by-step builder in My Site with{' '}
                            {config.checkout.autoSaveLabel} and{' '}
                            {config.checkout.hostingDurationLabel}.
                          </p>
                        </button>

                        <button
                          type="button"
                          role="radio"
                          aria-checked={buildMode === 'concierge'}
                          onClick={() => setBuildMode('concierge')}
                          className={`text-left rounded-2xl border p-5 transition cursor-pointer ${
                            buildMode === 'concierge'
                              ? 'border-[#5A1A2C] bg-[#F6E6E1]/75 shadow-[0_0_0_1px_#5A1A2C]'
                              : 'border-[#B98A4E]/28 bg-[#FFFDF9] hover:border-[#5A1A2C]/45'
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-serif text-lg text-[#271612] inline-flex items-center gap-1.5">
                              <Sparkles
                                className="w-4 h-4 text-[#B98A4E]"
                                aria-hidden="true"
                              />
                              <span>Done-for-You Concierge</span>
                            </span>
                            <span className="font-serif text-lg font-semibold text-[#5A1A2C] tabular-nums">
                              {pricing.formattedConcierge}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-[#5F453E] mt-1.5 leading-relaxed">
                            {config.checkout.conciergeScope} Delivered{' '}
                            {config.checkout.conciergeDeliveryTiming}.
                          </p>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* FINAL CHECKOUT FORM */}
                <div
                  className="rounded-[28px] bg-[#FFFDF9] border border-[#B98A4E]/32 p-6 sm:p-8 shadow-[0_24px_60px_-30px_rgba(90,26,44,0.22)] space-y-7"
                  data-testid="birthday-final-checkout-form"
                >
                  <div className="space-y-2">
                    <h2 className="font-serif text-2xl sm:text-3xl text-[#271612]">
                      Create Their Birthday Keepsake
                    </h2>
                    <p className="text-sm sm:text-base text-[#5F453E] leading-relaxed">
                      Enter the details needed to set up your private My Site
                      workspace and recipient PIN.
                    </p>
                  </div>

                  {/* Itemized Order Summary */}
                  <div className="rounded-2xl bg-[#FAF2E8]/75 border border-[#B98A4E]/24 p-5 space-y-2.5 text-sm">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[#6B5047]">Edition</span>
                      <span className="font-semibold text-[#271612] text-right">
                        {selectedEditionSpec.name}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[#6B5047]">Build option</span>
                      <span className="font-medium text-[#271612] text-right">
                        {buildMode === 'concierge' &&
                        config.checkout.conciergeEnabled
                          ? `Done-for-You Concierge (${config.checkout.conciergeDeliveryTiming})`
                          : 'Guided Self-Build'}
                      </span>
                    </div>
                    {buildMode === 'self-build' && pricing.showPreviousPrice && (
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[#6B5047]">Previous listed price</span>
                        <span className="text-[#7A6158] line-through tabular-nums">
                          {pricing.formattedPrevious}
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-3 pt-2.5 border-t border-[#B98A4E]/22">
                      <span className="font-semibold text-[#271612]">
                        Total ({countryConfig.name})
                      </span>
                      <span className="font-serif text-xl font-semibold text-[#5A1A2C] tabular-nums">
                        {activePriceDisplay}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B5047] pt-1">
                      Includes {config.checkout.hostingDurationLabel}.{' '}
                      {buildMode === 'concierge' &&
                      config.checkout.conciergeEnabled
                        ? `Our team assembles your page ${config.checkout.conciergeDeliveryTiming} after you upload your materials.`
                        : `Instant access to My Site with ${config.checkout.autoSaveLabel} after payment confirmation.`}
                    </p>
                  </div>

                  <form
                    onSubmit={handleCheckoutSubmit}
                    className="space-y-5"
                    noValidate
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Recipient Name */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="bday-recipient-name"
                          className="block text-sm font-semibold text-[#271612]"
                        >
                          Recipient’s name
                        </label>
                        <input
                          id="bday-recipient-name"
                          type="text"
                          value={recipientName}
                          onChange={(e) => {
                            setRecipientName(e.target.value);
                            if (checkoutErrors.recipientName) {
                              setCheckoutErrors((p) => ({
                                ...p,
                                recipientName: undefined,
                              }));
                            }
                          }}
                          placeholder="e.g. Ama"
                          aria-invalid={Boolean(checkoutErrors.recipientName)}
                          className={`w-full min-h-[48px] px-4 py-3 rounded-xl bg-white border text-base sm:text-sm text-[#271612] placeholder:text-[#9A7E6E] focus:outline-none focus:ring-2 focus:ring-[#5A1A2C]/20 ${
                            checkoutErrors.recipientName
                              ? 'border-red-600'
                              : 'border-[#B98A4E]/35 focus:border-[#5A1A2C]'
                          }`}
                        />
                        {checkoutErrors.recipientName && (
                          <p
                            role="alert"
                            className="text-xs font-medium text-red-700"
                          >
                            {checkoutErrors.recipientName}
                          </p>
                        )}
                      </div>

                      {/* Required 6-Digit Private PIN */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="bday-pin"
                          className="block text-sm font-semibold text-[#271612]"
                        >
                          6-digit private PIN
                        </label>
                        <input
                          id="bday-pin"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          required
                          value={pinCode}
                          onBlur={handlePinBlur}
                          onChange={(e) => {
                            setPinCode(
                              e.target.value.replace(/\D/g, '').slice(0, 6)
                            );
                            if (checkoutErrors.pin) {
                              setCheckoutErrors((p) => ({
                                ...p,
                                pin: undefined,
                              }));
                            }
                          }}
                          placeholder="e.g. 140826"
                          aria-invalid={Boolean(checkoutErrors.pin)}
                          className={`w-full min-h-[48px] px-4 py-3 rounded-xl bg-white border font-mono text-base sm:text-sm text-[#271612] placeholder:font-sans placeholder:text-[#9A7E6E] focus:outline-none focus:ring-2 focus:ring-[#5A1A2C]/20 ${
                            checkoutErrors.pin
                              ? 'border-red-600'
                              : 'border-[#B98A4E]/35 focus:border-[#5A1A2C]'
                          }`}
                        />
                        {checkoutErrors.pin ? (
                          <p
                            role="alert"
                            className="text-xs font-medium text-red-700"
                          >
                            {checkoutErrors.pin}
                          </p>
                        ) : (
                          <p className="text-xs text-[#6B5047]">
                            The 6-digit code they enter to unlock their birthday
                            page (e.g. their birth date).
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Sender Name */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="bday-sender-name"
                        className="block text-sm font-semibold text-[#271612]"
                      >
                        Your name
                      </label>
                      <input
                        id="bday-sender-name"
                        type="text"
                        autoComplete="name"
                        value={senderName}
                        onChange={(e) => {
                          setSenderName(e.target.value);
                          if (checkoutErrors.senderName) {
                            setCheckoutErrors((p) => ({
                              ...p,
                              senderName: undefined,
                            }));
                          }
                        }}
                        placeholder="e.g. Kwame Boateng"
                        aria-invalid={Boolean(checkoutErrors.senderName)}
                        className={`w-full min-h-[48px] px-4 py-3 rounded-xl bg-white border text-base sm:text-sm text-[#271612] placeholder:text-[#9A7E6E] focus:outline-none focus:ring-2 focus:ring-[#5A1A2C]/20 ${
                          checkoutErrors.senderName
                            ? 'border-red-600'
                            : 'border-[#B98A4E]/35 focus:border-[#5A1A2C]'
                        }`}
                      />
                      {checkoutErrors.senderName && (
                        <p
                          role="alert"
                          className="text-xs font-medium text-red-700"
                        >
                          {checkoutErrors.senderName}
                        </p>
                      )}
                    </div>

                    {/* WhatsApp Number */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="bday-whatsapp"
                        className="block text-sm font-semibold text-[#271612]"
                      >
                        WhatsApp number
                      </label>
                      <div
                        className={`flex items-stretch rounded-xl bg-white border focus-within:ring-2 focus-within:ring-[#5A1A2C]/20 overflow-hidden ${
                          checkoutErrors.whatsapp
                            ? 'border-red-600'
                            : 'border-[#B98A4E]/35 focus-within:border-[#5A1A2C]'
                        }`}
                      >
                        <label htmlFor="bday-dial" className="sr-only">
                          Country dial code
                        </label>
                        <select
                          id="bday-dial"
                          value={selectedDial.iso}
                          onChange={(e) => {
                            const matched = CHECKOUT_DIAL_COUNTRIES.find(
                              (d) => d.iso === e.target.value
                            );
                            if (matched) setSelectedDial(matched);
                          }}
                          className="min-h-[48px] pl-3 pr-2 bg-[#FAF2E8] border-r border-[#B98A4E]/25 text-sm font-medium text-[#271612] focus:outline-none cursor-pointer shrink-0"
                        >
                          {CHECKOUT_DIAL_COUNTRIES.map((opt) => (
                            <option key={opt.iso} value={opt.iso}>
                              {opt.flag} {opt.dial}
                            </option>
                          ))}
                        </select>
                        <input
                          id="bday-whatsapp"
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
                        <p
                          role="alert"
                          className="text-xs font-medium text-red-700"
                        >
                          {checkoutErrors.whatsapp}
                        </p>
                      )}
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="bday-email"
                        className="block text-sm font-semibold text-[#271612]"
                      >
                        Email address
                      </label>
                      <input
                        id="bday-email"
                        type="email"
                        autoComplete="email"
                        value={customerEmail}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        placeholder="you@gmail.com"
                        aria-invalid={Boolean(checkoutErrors.email)}
                        className={`w-full min-h-[48px] px-4 py-3 rounded-xl bg-white border text-base sm:text-sm text-[#271612] placeholder:text-[#9A7E6E] focus:outline-none focus:ring-2 focus:ring-[#5A1A2C]/20 ${
                          checkoutErrors.email
                            ? 'border-red-600'
                            : 'border-[#B98A4E]/35 focus:border-[#5A1A2C]'
                        }`}
                      />
                      {checkoutErrors.email && (
                        <p
                          role="alert"
                          className="text-xs font-medium text-red-700"
                        >
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
                          I agree to the terms and privacy policy. My details
                          are used only to create my private My Site portal and
                          birthday keepsake—never linked to my anonymous
                          questionnaire answers.
                        </span>
                      </label>
                      {checkoutErrors.consentAccepted && (
                        <p
                          role="alert"
                          className="text-xs font-medium text-red-700"
                        >
                          {checkoutErrors.consentAccepted}
                        </p>
                      )}
                    </div>

                    {/* Clear Owner Setup Notice When Live Checkout Is Unconfigured */}
                    {!checkoutReady && (
                      <div
                        data-testid="birthday-checkout-not-configured-notice"
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
                            Secure payment will activate here once a live
                            payment provider and checkout URL are connected in
                            Admin → Sales Pages.
                            {isPreviewMode && (
                              <>
                                {' '}
                                (Or set{' '}
                                <code className="font-mono text-xs">
                                  VITE_BIRTHDAY_INTERACTIVE_CHECKOUT_URL
                                </code>{' '}
                                and{' '}
                                <code className="font-mono text-xs">
                                  VITE_BIRTHDAY_INTERACTIVE_PAYMENT_PROVIDER
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
                      className="w-full min-h-[54px] py-4 px-6 rounded-full bg-gradient-to-r from-[#5A1A2C] to-[#451120] hover:from-[#471322] hover:to-[#350B17] disabled:opacity-45 disabled:cursor-not-allowed text-[#FAF5F0] font-semibold text-base shadow-[0_14px_28px_-12px_rgba(90,26,44,0.45)] transition motion-reduce:transition-none flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
                    >
                      <ShieldCheck
                        className="w-4 h-4 text-[#E8C589]"
                        aria-hidden="true"
                      />
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
            <p>Private digital birthday keepsakes</p>
          </footer>
        </div>
      )}
    </div>
  );
};
