import { validateCustomerEmail, validateWhatsAppPhone, CountryCode } from './platformLogic';

export type QuestionnaireResultId =
  | 'apology'
  | 'memories'
  | 'space'
  | 'voice'
  | 'appreciation';

export type InteractiveEditionId = 'chasing-her' | 'memories';

export interface QuestionnaireOption {
  id: string;
  label: string;
  weights: Partial<Record<QuestionnaireResultId, number>>;
}

export interface QuestionnaireQuestion {
  id: 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6';
  number: 1 | 2 | 3 | 4 | 5 | 6;
  prompt: string;
  options: readonly QuestionnaireOption[];
}

export type QuestionnaireAnswers = Partial<Record<QuestionnaireQuestion['id'], string>>;

export interface QuestionnaireResultTemplate {
  id: QuestionnaireResultId;
  title: string;
  headline: string;
  persuasiveHook: string;
  baseReflection: string;
  approach: string;
  recommendedEdition: InteractiveEditionId;
  recommendedEditionLabel: string;
  recommendations: readonly string[];
  whatSheExperiences: readonly string[];
  closingNudge: string;
}

export interface EvaluatedQuestionnaireResult {
  id: QuestionnaireResultId;
  title: string;
  headline: string;
  persuasiveHook: string;
  reflection: string;
  approach: string;
  recommendedEdition: InteractiveEditionId;
  recommendedEditionLabel: string;
  recommendations: readonly string[];
  whatSheExperiences: readonly string[];
  closingNudge: string;
  whyItFits: string;
  prioritizeSampleBeforeCheckout: boolean;
}

export interface VerifiedTestimonial {
  id: string;
  customerName: string;
  location?: string;
  createdWhat: string;
  feedback: string;
  sampleUrl?: string;
  verifiedPermission: boolean;
  badge?: string;
  headline?: string;
  whatsappSent?: string;
  whatsappReply?: string;
  previewTarget?: InteractiveEditionId;
}

export interface InteractiveEditionSpec {
  id: InteractiveEditionId;
  name: string;
  tagline: string;
  features: readonly string[];
  sampleButtonLabel: string;
  sampleUrl?: string;
}

export interface InteractivePricingConfig {
  regularPrice: number;
  discountPercent: number;
  currency: string;
  offerActive: boolean;
}

export interface CalculatedOfferPricing {
  regularPrice: number;
  salePrice: number;
  discountPercent: number;
  currency: string;
  showDiscount: boolean;
  formattedRegular: string;
  formattedFinal: string;
}

export interface InteractiveCheckoutConfig {
  checkoutUrl: string;
  paymentProvider: string;
  postPaymentRedirectUrl: string;
  conciergeEnabled: boolean;
  conciergePrice?: number;
  conciergeScope?: string;
  conciergeDeliveryTime?: string;
}

export interface InteractiveSalesConfig {
  brandName: string;
  productName: string;
  deliverySummary: string;
  pricing: InteractivePricingConfig;
  checkout: InteractiveCheckoutConfig;
  editions: readonly InteractiveEditionSpec[];
  verifiedTestimonials: VerifiedTestimonial[];
}

export const INTERACTIVE_CONFIG_SETTING_KEY = 'interactive_win_her_back_config_v1';

// ============================================================================
// EDITABLE QUESTIONNAIRE CONTENT (6 Questions, One Per Screen)
// ============================================================================

export const INTERACTIVE_QUESTIONS: readonly QuestionnaireQuestion[] = [
  {
    id: 'q1',
    number: 1,
    prompt: 'What’s happening between you two right now?',
    options: [
      {
        id: 'q1_unanswered',
        label: 'She’s upset, and my messages are going unanswered.',
        weights: { space: 2, apology: 1 },
      },
      {
        id: 'q1_argued',
        label: 'We’ve argued, and I haven’t found the right way to apologize.',
        weights: { apology: 2, voice: 1 },
      },
      {
        id: 'q1_distant',
        label: 'I’ve apologized, but things still feel distant.',
        weights: { memories: 2, space: 1 },
      },
      {
        id: 'q1_appreciate',
        label: 'Nothing serious happened—I just want to show her how much she means to me.',
        weights: { appreciation: 4, memories: 1 },
      },
    ],
  },
  {
    id: 'q2',
    number: 2,
    prompt: 'What have you tried so far?',
    options: [
      {
        id: 'q2_messages',
        label: 'I’ve sent apology messages.',
        weights: { voice: 1, memories: 1 },
      },
      {
        id: 'q2_calling',
        label: 'I’ve tried calling or asking to talk.',
        weights: { space: 2 },
      },
      {
        id: 'q2_space',
        label: 'I’ve given her space.',
        weights: { space: 2 },
      },
      {
        id: 'q2_not_yet',
        label: 'I haven’t reached out yet.',
        weights: { apology: 2 },
      },
      {
        id: 'q2_few',
        label: 'I’ve tried a few of these.',
        weights: { space: 1, memories: 1 },
      },
    ],
  },
  {
    id: 'q3',
    number: 3,
    prompt: 'What do you most want her to understand?',
    options: [
      {
        id: 'q3_sorry',
        label: 'That I’m genuinely sorry.',
        weights: { apology: 4, voice: 1 },
      },
      {
        id: 'q3_understand_hurt',
        label: 'That I understand why she was hurt.',
        weights: { apology: 4, space: 1 },
      },
      {
        id: 'q3_memories',
        label: 'That I still value our relationship and the memories we share.',
        weights: { memories: 4, appreciation: 1 },
      },
      {
        id: 'q3_love_appreciate',
        label: 'That I love and appreciate her.',
        weights: { appreciation: 4, memories: 1 },
      },
      {
        id: 'q3_no_pressure',
        label: 'That I want to make an effort without pressuring her to respond.',
        weights: { space: 4 },
      },
    ],
  },
  {
    id: 'q4',
    number: 4,
    prompt: 'What feels hardest to express?',
    options: [
      {
        id: 'q4_non_defensive',
        label: 'Saying what I’m sorry for without sounding defensive.',
        weights: { apology: 4 },
      },
      {
        id: 'q4_means_to_me',
        label: 'Explaining how much she means to me.',
        weights: { appreciation: 3, voice: 2 },
      },
      {
        id: 'q4_good_memories',
        label: 'Reminding her of the good memories we share.',
        weights: { memories: 4 },
      },
      {
        id: 'q4_sound_like_me',
        label: 'Finding words that sound like me, not copied lines.',
        weights: { voice: 4 },
      },
      {
        id: 'q4_respect_space',
        label: 'Knowing how to reach out while respecting her space.',
        weights: { space: 4 },
      },
    ],
  },
  {
    id: 'q5',
    number: 5,
    prompt: 'What would feel most personal to her?',
    options: [
      {
        id: 'q5_letter',
        label: 'A heartfelt letter in my own words.',
        weights: { apology: 3, voice: 2 },
      },
      {
        id: 'q5_photos',
        label: 'Photos and memories from our relationship.',
        weights: { memories: 4 },
      },
      {
        id: 'q5_song',
        label: 'A song that means something to us.',
        weights: { appreciation: 2, memories: 2 },
      },
      {
        id: 'q5_voice',
        label: 'A voice note from me.',
        weights: { voice: 4 },
      },
      {
        id: 'q5_combination',
        label: 'A combination of these.',
        weights: { appreciation: 2, memories: 2, space: 1 },
      },
    ],
  },
  {
    id: 'q6',
    number: 6,
    prompt: 'What kind of gesture feels right for your situation?',
    options: [
      {
        id: 'q6_simple',
        label: 'Something simple and sincere.',
        weights: { apology: 2, voice: 1 },
      },
      {
        id: 'q6_thoughtful',
        label: 'Something personal that takes time and thought.',
        weights: { memories: 2, appreciation: 2 },
      },
      {
        id: 'q6_private',
        label: 'A private experience she can explore when she’s ready.',
        weights: { space: 3 },
      },
      {
        id: 'q6_unsure',
        label: 'I’m not sure yet—I want to see an example first.',
        weights: {},
      },
    ],
  },
] as const;

// ============================================================================
// EDITABLE RESULT TEMPLATES (Types A – E)
// ============================================================================

export const RESULT_TEMPLATES: Record<QuestionnaireResultId, QuestionnaireResultTemplate> = {
  apology: {
    id: 'apology',
    title: 'The Apology That Finally Breaks Through',
    headline: 'Stop sending texts that get skimmed—give her an experience she actually feels.',
    persuasiveHook:
      'Another long WhatsApp paragraph feels rushed and easy to dismiss. A private, PIN-locked love website immediately shows her you slowed down, took real effort, and built something solely for her heart.',
    baseReflection:
      'Your answers make one thing clear: you don’t want a shallow sorry—you want her to feel the depth of your sincerity without triggering another tense back-and-forth. Chasing Her turns your honest words, favorite photos, and a meaningful song into a private keepsake she can’t ignore.',
    approach:
      'Step out of the noisy chat thread completely. Build a private, PIN-protected Chasing Her page in under 20 minutes—set the tone with an opening flower reveal, let your song play softly, and seal your heartfelt apology inside a wax-sealed letter.',
    recommendedEdition: 'chasing-her',
    recommendedEditionLabel: 'Chasing Her — Scrollable Love Story',
    recommendations: [
      'A private 6-digit PIN vault so she opens your apology in a calm, uninterrupted moment',
      'Signature five-blossom flower curtain that softens the mood before she reads a single word',
      'An interactive 3D wax-sealed letter written cleanly in your own honest words',
      'Handpicked Polaroid memories and a meaningful soundtrack playing softly in the background',
    ],
    whatSheExperiences: [
      'She taps your private link, enters a secret date only the two of you share, and watches flowers bloom open.',
      'Your chosen song begins playing as she scrolls through your favorite Polaroid moments together.',
      'She breaks the gold wax seal to read the sincere, calm letter she’s been waiting to hear from you.',
    ],
    closingNudge:
      'Men in your exact situation use Chasing Her because effort speaks louder than twenty texts. Preview the live demo below—then create hers in minutes.',
  },
  memories: {
    id: 'memories',
    title: 'The Memories That Remind Her Why She Chose You',
    headline: 'Bring back the warmth of your best moments—all in one unforgettable place.',
    persuasiveHook:
      'When distance creeps in, words alone can feel small. Watching 34 of your happiest photos assemble into a beating heart while your voice and song play softly reminds her instantly of what the two of you built together.',
    baseReflection:
      'Your answers point directly to the power of your shared story. Instead of trying to explain how much she matters over text, let her see it, hear it, and relive it inside a private Memories experience made exclusively for her.',
    approach:
      'Gather the photos and moments that capture the real warmth between you, pair them with short honest captions, and add a personal voice note over a song that brings her right back to your happiest days.',
    recommendedEdition: 'memories',
    recommendedEditionLabel: 'Memories — 34-Heart & Voice Duet',
    recommendations: [
      '34 of your favorite photos arranged tile-by-tile into a beating heart mosaic',
      'Full-screen cinematic slideshow with smooth transitions and personal captions',
      'Your real voice note layered gently over a meaningful background soundtrack',
      'Private PIN-protected link she can open on her phone and replay whenever she wants',
    ],
    whatSheExperiences: [
      'She unlocks the private PIN vault and watches the signature flowers part to reveal her name.',
      'She sees 34 of your shared memories come together into a beating heart she can tap and explore.',
      'Your calm voice plays softly over your song, saying what ten missed calls never could.',
    ],
    closingNudge:
      'No text message can compete with seeing your entire love story come alive on her screen. Experience the live demo below and start building yours today.',
  },
  space: {
    id: 'space',
    title: 'The High-Effort Gesture That Respects Her Space',
    headline: 'Make an unmistakable effort—without adding a shred of pressure.',
    persuasiveHook:
      'Calling repeatedly pushes her further away, while staying completely silent makes her wonder if you stopped caring. Sending one private, PIN-protected Chasing Her link strikes the rare balance: extraordinary thoughtfulness with zero pressure.',
    baseReflection:
      'Your answers show real emotional maturity: you want her to know how deeply she matters while letting her open your message on her own terms. A private digital love experience does what texts can’t—it waits patiently until she’s ready, and rewards her with genuine warmth the second she taps in.',
    approach:
      'Build her private page today and send the link with one brief, calm line. She opens it in private, takes in your photos, song, and wax-sealed letter at her own pace, and feels the care you put into every detail.',
    recommendedEdition: 'chasing-her',
    recommendedEditionLabel: 'Chasing Her — Scrollable Love Story',
    recommendations: [
      'One private, PIN-protected link she can open quietly whenever she’s ready',
      'Calm scrollable story with Polaroid memories that lower tension immediately',
      'Wax-sealed personal letter that lets you say everything cleanly in one place',
      'A meaningful soundtrack that sets a warm, sincere atmosphere on her phone',
    ],
    whatSheExperiences: [
      'Instead of another demanding notification, she receives one thoughtful, private link.',
      'When she’s ready, she enters your shared PIN and steps into a serene floral reveal built just for her.',
      'She reads your heartfelt letter with zero defensiveness, feeling the quiet effort you poured into it.',
    ],
    closingNudge:
      'This is how you show up with class, patience, and unmistakable sincerity. Tap below to experience how it feels on her phone, then personalize yours in minutes.',
  },
  voice: {
    id: 'voice',
    title: 'The Heartfelt Message That Sounds Unmistakably Like You',
    headline: 'You don’t need to be a poet—just let her hear the real you.',
    persuasiveHook:
      'Copied quotes feel hollow and long typed paragraphs lose all your warmth. Pairing your own straightforward words with a 60-second voice note and your favorite photos delivers raw sincerity she feels immediately.',
    baseReflection:
      'Your answers show you want something deeply genuine—never scripted, never cliché. Our guided builder makes it effortless: in 20 minutes on your phone, you record a short voice note, drop in your real photos, and create a private keepsake that sounds and feels 100% like you.',
    approach:
      'Keep your words simple and real. Record a calm voice note directly in the studio, blend it softly with a song she loves, and surround it with your favorite photos so she feels your heart without you struggling for poetic lines.',
    recommendedEdition: 'memories',
    recommendedEditionLabel: 'Memories — 34-Heart & Voice Duet',
    recommendations: [
      'Direct voice-note recorder layered smoothly over your chosen background song',
      'Guided step-by-step studio prompts so you never stare at a blank screen',
      '34-photo beating heart mosaic and slideshow showcasing your real moments together',
      'Private 6-digit PIN vault ready to share on WhatsApp in minutes',
    ],
    whatSheExperiences: [
      'She enters your secret 6-digit PIN and sees a custom experience created solely by you.',
      'She taps play and hears the real warmth and sincerity in your voice—not cold text on a screen.',
      'Your shared memories glide across her screen while your letter seals the moment.',
    ],
    closingNudge:
      'Hearing your real voice over your favorite moments changes the entire tone immediately. Preview the live interactive sample right below and build yours now.',
  },
  appreciation: {
    id: 'appreciation',
    title: 'The Private Romantic Surprise She’ll Never Forget',
    headline: 'Show her she’s treasured in a way she’ll keep replaying and smiling at.',
    persuasiveHook:
      'Anyone can send a sweet text or buy flowers that wilt in three days. Surprising her with a private, PIN-protected love website crafted with your photos, her favorite song, and a wax-sealed letter puts you in a league of your own.',
    baseReflection:
      'Your answers show you want to go above and beyond—to make her pause, smile, and feel truly seen. Chasing Her brings together every little detail that makes your relationship yours in one luxury digital keepsake she can carry in her pocket.',
    approach:
      'Build her surprise in under 20 minutes on your phone: lock it with a meaningful 6-digit date, add your best Polaroid captions and favorite song, and send the link when she least expects it.',
    recommendedEdition: 'chasing-her',
    recommendedEditionLabel: 'Chasing Her — Scrollable Love Story',
    recommendations: [
      'Chasing Her Scrollable Love Story with blooming five-blossom flower curtain',
      'Dual moving Polaroid galleries with your personal captions and inside jokes',
      'Interactive 3D gold wax-sealed love letter written specifically for her',
      'Custom soundtrack or Spotify playlist that plays as she explores every memory',
    ],
    whatSheExperiences: [
      'She receives an unexpected link with a mysterious 6-digit PIN—like the day you met.',
      'The flowers part to reveal your opening message, your favorite song, and scrolling Polaroids of you two.',
      'She breaks the wax seal on your letter and keeps coming back to re-read it all week.',
    ],
    closingNudge:
      'Give her the kind of thoughtful surprise she immediately wants to treasure forever. Try the interactive demo below and personalize yours in minutes.',
  },
};

// ============================================================================
// DEFAULT CONFIGURATION (Pricing, Editions, Testimonials, Checkout)
// ============================================================================

export const DEFAULT_INTERACTIVE_EDITIONS: readonly InteractiveEditionSpec[] = [
  {
    id: 'chasing-her',
    name: 'Chasing Her — Scrollable Love Story',
    tagline: 'A calm, intimate page built around your words, memories, and music.',
    features: [
      'Scrollable story',
      'Polaroid-style memories and captions',
      'Wax-sealed letter',
      'Song or soundtrack',
    ],
    sampleButtonLabel: 'Explore Chasing Her',
  },
  {
    id: 'memories',
    name: 'Memories — Photo Heart & Voice Note',
    tagline: 'A photo-led keepsake pairing your shared moments with your voice and song.',
    features: [
      'Photo-heart experience',
      'Slideshow effects',
      'Personal voice note with a song',
    ],
    sampleButtonLabel: 'Explore Memories',
  },
] as const;

const ENV_CHECKOUT_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_INTERACTIVE_CHECKOUT_URL
    ? String(import.meta.env.VITE_INTERACTIVE_CHECKOUT_URL).trim()
    : '';

const ENV_PAYMENT_PROVIDER =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_INTERACTIVE_PAYMENT_PROVIDER
    ? String(import.meta.env.VITE_INTERACTIVE_PAYMENT_PROVIDER).trim()
    : '';

const ENV_CONFIGURED_CURRENCY =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_INTERACTIVE_CURRENCY
    ? String(import.meta.env.VITE_INTERACTIVE_CURRENCY).trim()
    : 'KES';

export const DEFAULT_WIN_HER_BACK_TESTIMONIALS: VerifiedTestimonial[] = [
  {
    id: 'whb-story-1',
    badge: 'STORY 01 · WHEN SHE STOPPED REPLYING',
    customerName: 'Kofi M.',
    location: 'East Legon, Accra 🇬🇭',
    createdWhat: 'Chasing Her — Scrollable Love Story',
    headline:
      '"She hadn\'t replied to my texts in five days. Fifteen minutes after I sent her link, she called me in tears."',
    feedback:
      'Every text I sent only made things feel more tense. Putting our favorite photos, the song from our first trip, and a sincere letter into Chasing Her made her pause and remember why we fell in love in the first place.',
    whatsappSent:
      "I know you need space and I respect that. I made something for you when you're ready: chasingher.love/for-efua (PIN: 041124)",
    whatsappReply:
      'I just finished going through the whole thing... how did you even make this? Seeing our old pictures and your letter made me cry 😭❤️',
    previewTarget: 'chasing-her',
    verifiedPermission: true,
  },
  {
    id: 'whb-story-2',
    badge: 'STORY 02 · REMINDING HER OF US',
    customerName: 'David K.',
    location: 'Kilimani, Nairobi 🇰🇪',
    createdWhat: 'Memories — Photo Heart & Voice Note',
    headline:
      '"My voice note playing softly over 34 of our happiest moments said what a hundred WhatsApp paragraphs never could."',
    feedback:
      'When emotions are high, texts sound defensive. Hearing my calm voice reading my letter while 34 of our memories formed a beating heart reminded her that what we have is worth fighting for.',
    whatsappSent:
      'Not another long text. Just something from my heart whenever you have 2 minutes: chasingher.love/njeri',
    whatsappReply:
      'Hearing your voice over our 34 photos broke all my defenses. Can we meet for coffee tomorrow evening?',
    previewTarget: 'memories',
    verifiedPermission: true,
  },
  {
    id: 'whb-story-3',
    badge: 'STORY 03 · SINCERE EFFORT',
    customerName: 'Samuel O.',
    location: 'Nyali, Mombasa 🇰🇪',
    createdWhat: 'Chasing Her — Scrollable Love Story',
    headline:
      '"She told me it was the first time she truly felt how much she meant to me without me trying to argue my point."',
    feedback:
      "I'm not a programmer or a poet, so I used the guided builder. In 25 minutes I had a private, PIN-protected love letter with our Polaroids and songs that showed genuine care.",
    whatsappSent:
      'I took some time to build this for you. The passcode is the day we first met: chasingher.love/amina',
    whatsappReply:
      "You actually took the time to make all of this for me? I didn't expect this at all... thank you ❤️",
    previewTarget: 'chasing-her',
    verifiedPermission: true,
  },
];

export const DEFAULT_INTERACTIVE_SALES_CONFIG: InteractiveSalesConfig = {
  brandName: 'Chasing Her ♥',
  productName: 'Digital Love Experience',
  deliverySummary: 'Instant access through a website after successful payment confirmation.',
  pricing: {
    regularPrice: 5000,
    discountPercent: 85,
    currency: ENV_CONFIGURED_CURRENCY,
    offerActive: true,
  },
  checkout: {
    checkoutUrl: ENV_CHECKOUT_URL,
    paymentProvider: ENV_PAYMENT_PROVIDER,
    postPaymentRedirectUrl: '/my-site/',
    conciergeEnabled: false,
  },
  editions: DEFAULT_INTERACTIVE_EDITIONS,
  verifiedTestimonials: DEFAULT_WIN_HER_BACK_TESTIMONIALS,
};

// ============================================================================
// DETERMINISTIC RESULT MATCHING ENGINE
// ============================================================================

const Q1_REFLECTION_CONTEXT: Record<string, string> = {
  q1_unanswered:
    'When messages go unanswered, sending another text only blends into the noise—what breaks the silence is a gesture she never expected.',
  q1_argued:
    'After an argument, words in a chat thread get misread fast—a calm, private keepsake lets your sincerity land without defensiveness.',
  q1_distant:
    'When distance lingers even after an apology, ordinary texts feel too small—you need a deeply personal experience that brings back the warmth.',
  q1_appreciate:
    'Taking the time to build something custom just to celebrate her is the kind of rare, unforgettable effort she will talk about for months.',
};

const Q2_REFLECTION_CONTEXT: Record<string, string> = {
  q2_messages:
    'You’ve already tried apology texts, which is why stepping into a private, visual experience immediately changes how she receives your message.',
  q2_calling:
    'Since calling hasn’t opened the door yet, giving her a private PIN-protected keepsake lets her lower her guard and take in your effort on her own terms.',
  q2_space:
    'Because you’ve respected her space, arriving with one thoughtfully crafted keepsake shows patience, maturity, and genuine care.',
  q2_not_yet:
    'Because you haven’t reached out yet, your very first move can be unforgettable—calm, sincere, and impossible to confuse with a lazy text.',
  q2_few:
    'Since you’ve already tried the usual approaches, stepping back to deliver one extraordinary, deeply personal keepsake is the clearest way to stand out.',
};

const Q3_WHY_PHRASES: Record<string, string> = {
  q3_sorry: 'how genuinely sorry you are',
  q3_understand_hurt: 'that you truly understand why she was hurt',
  q3_memories: 'how deeply you still value your relationship and the memories you share',
  q3_love_appreciate: 'how much you love and appreciate her',
  q3_no_pressure: 'that you want to make a sincere effort without pressuring her to respond',
};

const Q5_WHY_PHRASES: Record<string, string> = {
  q5_letter: 'a heartfelt letter in your own words',
  q5_photos: 'photos and memories from your relationship',
  q5_song: 'a song that means something to both of you',
  q5_voice: 'hearing your voice in a personal note',
  q5_combination: 'bringing your words, photos, and music together',
};

export function evaluateQuestionnaireResult(
  answers: QuestionnaireAnswers
): EvaluatedQuestionnaireResult {
  const scores: Record<QuestionnaireResultId, number> = {
    apology: 0,
    memories: 0,
    space: 0,
    voice: 0,
    appreciation: 0,
  };

  // Accumulate weighted scores across Q1-Q5 (Q3, Q4, Q5 carry highest weights)
  for (const question of INTERACTIVE_QUESTIONS) {
    if (question.id === 'q6') continue; // Q6 acts as tie-breaker and sample-priority signal
    const selectedId = answers[question.id];
    if (!selectedId) continue;
    const opt = question.options.find((o) => o.id === selectedId);
    if (!opt) continue;
    for (const [resId, weight] of Object.entries(opt.weights)) {
      scores[resId as QuestionnaireResultId] += weight || 0;
    }
  }

  // Consistency guards so results never contradict Q1 situation
  const isNoConflict = answers.q1 === 'q1_appreciate';
  const isActiveConflict =
    answers.q1 === 'q1_unanswered' ||
    answers.q1 === 'q1_argued' ||
    answers.q1 === 'q1_distant';

  if (isNoConflict && answers.q3 !== 'q3_sorry' && answers.q3 !== 'q3_understand_hurt') {
    scores.apology = Math.min(scores.apology, 1);
    scores.appreciation += 3;
  }

  if (isActiveConflict && answers.q3 !== 'q3_love_appreciate') {
    scores.appreciation = Math.min(scores.appreciation, 2);
  }

  // Find highest score
  const allIds: QuestionnaireResultId[] = [
    'apology',
    'memories',
    'space',
    'voice',
    'appreciation',
  ];
  const maxScore = Math.max(...allIds.map((id) => scores[id]));
  const tiedCandidates = allIds.filter((id) => scores[id] === maxScore);

  let winner: QuestionnaireResultId = tiedCandidates[0] || 'apology';

  // Use Q6 as deterministic tie-breaker when multiple results tie
  if (tiedCandidates.length > 1 && answers.q6) {
    const q6Opt = INTERACTIVE_QUESTIONS[5].options.find((o) => o.id === answers.q6);
    if (q6Opt) {
      let bestTieScore = -1;
      for (const candidate of tiedCandidates) {
        const tieBonus = q6Opt.weights[candidate] || 0;
        if (tieBonus > bestTieScore) {
          bestTieScore = tieBonus;
          winner = candidate;
        }
      }
    }
  } else if (answers.q6 === 'q6_private' && scores.space >= maxScore - 1 && !isNoConflict) {
    // Respect explicit desire for a private, no-pressure experience when scores are neck-and-neck
    if (answers.q2 === 'q2_space' || answers.q3 === 'q3_no_pressure' || answers.q4 === 'q4_respect_space') {
      winner = 'space';
    }
  }

  const template = RESULT_TEMPLATES[winner];
  const q1Context = answers.q1 ? Q1_REFLECTION_CONTEXT[answers.q1] : '';
  const q2Context = answers.q2 ? Q2_REFLECTION_CONTEXT[answers.q2] : '';

  const reflectionParts = [q1Context, q2Context, template.baseReflection].filter(Boolean);
  const reflection = reflectionParts.join(' ');

  // Tailor "why this fits" in natural second-person phrasing without raw scores
  const q3Phrase = answers.q3 ? Q3_WHY_PHRASES[answers.q3] : undefined;
  const q5Phrase = answers.q5 ? Q5_WHY_PHRASES[answers.q5] : undefined;
  let whyLead = '';
  if (q3Phrase && q5Phrase) {
    whyLead = `You told us what matters most is helping her feel ${q3Phrase}, and that ${q5Phrase} would mean the most to her.`;
  } else if (q3Phrase) {
    whyLead = `You told us what matters most is helping her feel ${q3Phrase}.`;
  } else if (q5Phrase) {
    whyLead = `You told us that ${q5Phrase} would mean the most to her.`;
  }

  const whyItFits = whyLead
    ? `${whyLead} ${template.recommendedEditionLabel} was built specifically to bring those exact moments to life in one private link—ready to personalize in under 20 minutes.`
    : `${template.recommendedEditionLabel} was crafted for moments like yours—bringing your words, memories, and music together in under 20 minutes.`;

  const prioritizeSampleBeforeCheckout = answers.q6 === 'q6_unsure';

  return {
    id: template.id,
    title: template.title,
    headline: template.headline,
    persuasiveHook: template.persuasiveHook,
    reflection,
    approach: template.approach,
    recommendedEdition: template.recommendedEdition,
    recommendedEditionLabel: template.recommendedEditionLabel,
    recommendations: template.recommendations,
    whatSheExperiences: template.whatSheExperiences,
    closingNudge: template.closingNudge,
    whyItFits,
    prioritizeSampleBeforeCheckout,
  };
}

// ============================================================================
// PRICING & CURRENCY CALCULATOR (Zero Silent Conversion)
// ============================================================================

export function formatConfiguredAmount(amount: number, currency: string): string {
  const cleanCurrency = (currency || '').trim();
  const formattedNumber = Math.round(amount).toLocaleString('en-US');
  if (!cleanCurrency) return formattedNumber;
  return `${cleanCurrency} ${formattedNumber}`;
}

export function calculateOfferPricing(
  pricing: InteractivePricingConfig
): CalculatedOfferPricing {
  const regularPrice =
    Number.isFinite(pricing.regularPrice) && pricing.regularPrice > 0
      ? pricing.regularPrice
      : 5000;
  const rawDiscount = Number.isFinite(pricing.discountPercent)
    ? pricing.discountPercent
    : 0;
  const currency = (pricing.currency || '').trim();

  const discountValid =
    Boolean(pricing.offerActive) && rawDiscount > 0 && rawDiscount < 100;

  const salePrice = discountValid
    ? Math.round(regularPrice * (1 - rawDiscount / 100))
    : regularPrice;

  const showDiscount = discountValid && salePrice > 0 && salePrice < regularPrice;

  return {
    regularPrice,
    salePrice: showDiscount ? salePrice : regularPrice,
    discountPercent: showDiscount ? rawDiscount : 0,
    currency,
    showDiscount,
    formattedRegular: formatConfiguredAmount(regularPrice, currency),
    formattedFinal: formatConfiguredAmount(
      showDiscount ? salePrice : regularPrice,
      currency
    ),
  };
}

// ============================================================================
// CHECKOUT CONFIGURATION & VALIDATION
// ============================================================================

export function isCheckoutConfigured(checkout: InteractiveCheckoutConfig): boolean {
  const url = (checkout.checkoutUrl || '').trim();
  const provider = (checkout.paymentProvider || '').trim();
  if (!url || !provider) return false;
  return /^https?:\/\/.+/i.test(url);
}

export interface InteractiveCheckoutFormInput {
  edition: InteractiveEditionId;
  recipientFirstName: string;
  customerName: string;
  whatsapp: string;
  email: string;
  pin: string;
  consentAccepted: boolean;
  country: CountryCode;
  dialPrefix?: string;
}

export interface InteractiveCheckoutFormErrors {
  recipientFirstName?: string;
  customerName?: string;
  whatsapp?: string;
  email?: string;
  pin?: string;
  consentAccepted?: string;
}

export function validateInteractiveCheckoutForm(
  input: InteractiveCheckoutFormInput
): {
  valid: boolean;
  errors: InteractiveCheckoutFormErrors;
  normalizedEmail: string;
  normalizedPhone: string;
  emailSuggestion?: string;
} {
  const errors: InteractiveCheckoutFormErrors = {};

  if (!input.recipientFirstName.trim() || input.recipientFirstName.trim().length < 2) {
    errors.recipientFirstName = 'Enter her first name so we can personalize your experience.';
  }

  if (!input.customerName.trim() || input.customerName.trim().length < 2) {
    errors.customerName = 'Enter your name for your private account.';
  }

  const emailCheck = validateCustomerEmail(input.email);
  if (!emailCheck.valid) {
    errors.email = emailCheck.error || 'Enter a valid email address.';
  }

  const phoneCheck = validateWhatsAppPhone(input.whatsapp, input.country);
  let normalizedPhone = phoneCheck.e164;
  if (!phoneCheck.valid) {
    const digits = input.whatsapp.replace(/\D/g, '');
    if (input.dialPrefix && digits.length >= 7 && digits.length <= 12) {
      normalizedPhone = `${input.dialPrefix}${digits.replace(/^0+/, '')}`;
    } else {
      errors.whatsapp = phoneCheck.error || 'Enter a valid WhatsApp number.';
    }
  }

  const cleanPin = (input.pin || '').trim();
  if (cleanPin.length > 0 && !/^\d{6}$/.test(cleanPin)) {
    errors.pin = 'Leave blank or enter exactly 6 numbers (e.g. 140826).';
  }

  if (!input.consentAccepted) {
    errors.consentAccepted =
      'Please confirm the terms and privacy policy before continuing.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedEmail: emailCheck.normalized,
    normalizedPhone,
    emailSuggestion: emailCheck.suggestion,
  };
}

// ============================================================================
// ADMIN SETTINGS SERIALIZATION / HYDRATION
// ============================================================================

export function mergeInteractiveSalesConfig(
  rawJson?: string | null
): InteractiveSalesConfig {
  if (!rawJson) return DEFAULT_INTERACTIVE_SALES_CONFIG;
  try {
    const parsed = JSON.parse(rawJson) as Partial<InteractiveSalesConfig>;
    return {
      brandName: parsed.brandName || DEFAULT_INTERACTIVE_SALES_CONFIG.brandName,
      productName: parsed.productName || DEFAULT_INTERACTIVE_SALES_CONFIG.productName,
      deliverySummary:
        parsed.deliverySummary || DEFAULT_INTERACTIVE_SALES_CONFIG.deliverySummary,
      pricing: {
        regularPrice:
          typeof parsed.pricing?.regularPrice === 'number' &&
          parsed.pricing.regularPrice > 0
            ? parsed.pricing.regularPrice
            : DEFAULT_INTERACTIVE_SALES_CONFIG.pricing.regularPrice,
        discountPercent:
          typeof parsed.pricing?.discountPercent === 'number'
            ? parsed.pricing.discountPercent
            : DEFAULT_INTERACTIVE_SALES_CONFIG.pricing.discountPercent,
        currency:
          typeof parsed.pricing?.currency === 'string' &&
          parsed.pricing.currency.trim().length > 0
            ? parsed.pricing.currency.trim()
            : DEFAULT_INTERACTIVE_SALES_CONFIG.pricing.currency,
        offerActive:
          typeof parsed.pricing?.offerActive === 'boolean'
            ? parsed.pricing.offerActive
            : DEFAULT_INTERACTIVE_SALES_CONFIG.pricing.offerActive,
      },
      checkout: {
        checkoutUrl:
          typeof parsed.checkout?.checkoutUrl === 'string'
            ? parsed.checkout.checkoutUrl.trim()
            : DEFAULT_INTERACTIVE_SALES_CONFIG.checkout.checkoutUrl,
        paymentProvider:
          typeof parsed.checkout?.paymentProvider === 'string'
            ? parsed.checkout.paymentProvider.trim()
            : DEFAULT_INTERACTIVE_SALES_CONFIG.checkout.paymentProvider,
        postPaymentRedirectUrl:
          typeof parsed.checkout?.postPaymentRedirectUrl === 'string' &&
          parsed.checkout.postPaymentRedirectUrl.trim().length > 0
            ? parsed.checkout.postPaymentRedirectUrl.trim()
            : DEFAULT_INTERACTIVE_SALES_CONFIG.checkout.postPaymentRedirectUrl,
        conciergeEnabled: Boolean(parsed.checkout?.conciergeEnabled),
        conciergePrice: parsed.checkout?.conciergePrice,
        conciergeScope: parsed.checkout?.conciergeScope,
        conciergeDeliveryTime: parsed.checkout?.conciergeDeliveryTime,
      },
      editions:
        Array.isArray(parsed.editions) && parsed.editions.length >= 2
          ? parsed.editions
          : DEFAULT_INTERACTIVE_EDITIONS,
      verifiedTestimonials: Array.isArray(parsed.verifiedTestimonials)
        ? parsed.verifiedTestimonials.filter(
            (t) =>
              t &&
              t.verifiedPermission === true &&
              typeof t.customerName === 'string' &&
              t.customerName.trim().length > 0 &&
              typeof t.feedback === 'string' &&
              t.feedback.trim().length > 0
          )
        : [],
    };
  } catch {
    return DEFAULT_INTERACTIVE_SALES_CONFIG;
  }
}

export function serializeInteractiveSalesConfig(
  config: InteractiveSalesConfig
): string {
  return JSON.stringify(config);
}

// ============================================================================
// ANONYMOUS FUNNEL EVENT TRACKER (Zero PII, Zero Questionnaire Answers)
// ============================================================================

export type AnonymousFunnelEventName =
  | 'questionnaire_started'
  | 'question_completed'
  | 'result_viewed'
  | 'sample_opened'
  | 'checkout_started'
  | 'payment_confirmed';

export function trackAnonymousFunnelEvent(
  eventName: AnonymousFunnelEventName,
  meta?: { stepNumber?: number; edition?: InteractiveEditionId }
): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('chasingher:funnel', {
        detail: {
          event: eventName,
          stepNumber: meta?.stepNumber,
          edition: meta?.edition,
          timestamp: Date.now(),
        },
      })
    );
  } catch {
    // Ignore environments without CustomEvent support
  }
}
