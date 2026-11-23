import {
  ActiveCountryCode,
  CountryCode,
  validateCustomerEmail,
  validateWhatsAppPhone,
} from './platformLogic';
import {
  InteractiveEditionId,
  VerifiedTestimonial,
  formatConfiguredAmount,
  trackAnonymousFunnelEvent,
} from './interactiveSalesConfig';

export type BirthdayResultId =
  | 'stand-alone'
  | 'companion'
  | 'memories'
  | 'revisit'
  | 'deciding';

export type BirthdayBuildMode = 'self-build' | 'concierge';
export type BirthdayGiftRole = 'main-gift' | 'companion-gift' | 'explore-first';

export interface BirthdayQuestionOption {
  id: string;
  label: string;
  weights: Partial<Record<BirthdayResultId, number>>;
}

export interface BirthdayQuestion {
  id: 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6';
  number: 1 | 2 | 3 | 4 | 5 | 6;
  prompt: string;
  options: readonly BirthdayQuestionOption[];
}

export type BirthdayQuestionnaireAnswers = Partial<
  Record<BirthdayQuestion['id'], string>
>;

export interface BirthdayResultTemplate {
  id: BirthdayResultId;
  title: string;
  headline: string;
  persuasiveHook: string;
  baseReflection: string;
  defaultGiftRole: BirthdayGiftRole;
  recommendedEdition: InteractiveEditionId | 'either';
  recommendedEditionLabel: string;
  recommendations: readonly string[];
  whatTheyExperience: readonly string[];
  closingNudge: string;
}

export interface EvaluatedBirthdayResult {
  id: BirthdayResultId;
  title: string;
  headline: string;
  persuasiveHook: string;
  reflection: string;
  giftRole: BirthdayGiftRole;
  fitExplanation: string;
  recommendedEdition: InteractiveEditionId | 'either';
  recommendedEditionLabel: string;
  recommendations: readonly string[];
  whatTheyExperience: readonly string[];
  closingNudge: string;
  whyItFits: string;
  recommendedBuildMode: BirthdayBuildMode | 'compare';
  buildModeNote: string;
  prioritizeSampleBeforeCheckout: boolean;
}

export interface BirthdayMarketPricingConfig {
  enabled: boolean;
  currency: string;
  currencyPosition: 'prefix' | 'suffix';
  selfBuildPrice: number;
  previousPrice: number;
  conciergePrice: number;
  offerActive: boolean;
}

export interface CalculatedBirthdayMarketPricing {
  currency: string;
  selfBuildPrice: number;
  previousPrice: number;
  conciergePrice: number;
  showPreviousPrice: boolean;
  formattedSelfBuild: string;
  formattedPrevious: string;
  formattedConcierge: string;
}

export interface BirthdayEditionSpec {
  id: InteractiveEditionId;
  editionNumber: 'Edition 01' | 'Edition 02';
  name: string;
  tagline: string;
  features: readonly string[];
  sampleButtonLabel: string;
  sampleUrl?: string;
}

export interface BirthdayInteractiveCheckoutConfig {
  checkoutUrl: string;
  paymentProvider: string;
  postPaymentRedirectUrl: string;
  conciergeEnabled: boolean;
  conciergeDeliveryTiming: string;
  conciergeScope: string;
  hostingDurationLabel: string;
  autoSaveLabel: string;
}

export interface BirthdayInteractiveConfig {
  brandName: string;
  productName: string;
  markets: Record<ActiveCountryCode, BirthdayMarketPricingConfig>;
  checkout: BirthdayInteractiveCheckoutConfig;
  editions: readonly BirthdayEditionSpec[];
  verifiedTestimonials: VerifiedTestimonial[];
}

export const BIRTHDAY_INTERACTIVE_SETTING_KEY =
  'interactive_birthday_keepsake_config_v1';

// ============================================================================
// EDITABLE BIRTHDAY QUESTIONNAIRE (6 Questions, One Per Screen)
// ============================================================================

export const BIRTHDAY_INTERACTIVE_QUESTIONS: readonly BirthdayQuestion[] = [
  {
    id: 'q1',
    number: 1,
    prompt: 'Who are you planning to celebrate?',
    options: [
      { id: 'bq1_partner', label: 'My partner', weights: {} },
      {
        id: 'bq1_dating',
        label: 'Someone I’m dating or getting to know',
        weights: { companion: 1, revisit: 1 },
      },
      { id: 'bq1_spouse', label: 'My spouse', weights: { memories: 1 } },
      {
        id: 'bq1_special',
        label: 'Someone else special to me',
        weights: { revisit: 1 },
      },
    ],
  },
  {
    id: 'q2',
    number: 2,
    prompt:
      'What would you most like them to feel when they receive your gift?',
    options: [
      {
        id: 'bq2_loved',
        label: 'Loved and appreciated',
        weights: { 'stand-alone': 3, revisit: 2 },
      },
      {
        id: 'bq2_memories',
        label: 'Remembered through our special moments',
        weights: { memories: 4, 'stand-alone': 1 },
      },
      {
        id: 'bq2_surprised',
        label: 'Surprised by something personal and unexpected',
        weights: { 'stand-alone': 3, companion: 2 },
      },
      {
        id: 'bq2_celebrated',
        label:
          'Celebrated in a way that feels different from the usual birthday wishes',
        weights: { 'stand-alone': 2, revisit: 3 },
      },
      {
        id: 'bq2_unsure',
        label: 'I’m not completely sure yet',
        weights: { deciding: 4 },
      },
    ],
  },
  {
    id: 'q3',
    number: 3,
    prompt: 'What kind of birthday gift are you planning?',
    options: [
      {
        id: 'bq3_main',
        label: 'I want one meaningful gift that can stand on its own',
        weights: { 'stand-alone': 5 },
      },
      {
        id: 'bq3_pair',
        label: 'I’m planning to pair it with another gift',
        weights: { companion: 6 },
      },
      {
        id: 'bq3_celebration',
        label: 'I want a personal surprise to add to a birthday celebration',
        weights: { companion: 5, memories: 1 },
      },
      {
        id: 'bq3_deciding',
        label: 'I’m still deciding what the main gift will be',
        weights: { deciding: 5 },
      },
    ],
  },
  {
    id: 'q4',
    number: 4,
    prompt: 'Which sounds most like the person you’re celebrating?',
    options: [
      {
        id: 'bq4_messages',
        label: 'They love personal messages and thoughtful details',
        weights: { 'stand-alone': 3, revisit: 4 },
      },
      {
        id: 'bq4_photos',
        label: 'They enjoy photos, memories, and looking back on special moments',
        weights: { memories: 5 },
      },
      {
        id: 'bq4_music',
        label: 'They love music and meaningful songs',
        weights: { memories: 2, 'stand-alone': 2, revisit: 2 },
      },
      {
        id: 'bq4_voice',
        label:
          'They would appreciate hearing my voice or reading something written just for them',
        weights: { memories: 3, revisit: 3 },
      },
      {
        id: 'bq4_mix',
        label: 'They enjoy a mix of these things',
        weights: { 'stand-alone': 2, memories: 2, companion: 1 },
      },
      {
        id: 'bq4_unsure',
        label: 'I’m not sure',
        weights: { deciding: 4 },
      },
    ],
  },
  {
    id: 'q5',
    number: 5,
    prompt: 'How would you like to give the gift?',
    options: [
      {
        id: 'bq5_link',
        label: 'Send a private link they can open on their phone',
        weights: { revisit: 3, 'stand-alone': 2 },
      },
      {
        id: 'bq5_alongside',
        label: 'Give it alongside flowers, a physical gift, or another surprise',
        weights: { companion: 4 },
      },
      {
        id: 'bq5_moment',
        label: 'Share it during a birthday moment or celebration',
        weights: { companion: 2, memories: 2 },
      },
      {
        id: 'bq5_see_first',
        label: 'I want to see how it works before deciding',
        weights: { deciding: 3 },
      },
    ],
  },
  {
    id: 'q6',
    number: 6,
    prompt: 'How much time do you want to spend putting the gift together?',
    options: [
      {
        id: 'bq6_self',
        label: 'I want to personalize it myself with guided steps',
        weights: {},
      },
      {
        id: 'bq6_help',
        label: 'I want help putting it together',
        weights: {},
      },
      {
        id: 'bq6_simple',
        label:
          'I’m happy to add photos and messages, but I want the process to be simple',
        weights: {},
      },
      {
        id: 'bq6_options',
        label: 'I’d like to see the options before deciding',
        weights: { deciding: 1 },
      },
    ],
  },
] as const;

// ============================================================================
// EDITABLE RESULT TEMPLATES (Result Types A–E)
// ============================================================================

export const BIRTHDAY_RESULT_TEMPLATES: Record<
  BirthdayResultId,
  BirthdayResultTemplate
> = {
  'stand-alone': {
    id: 'stand-alone',
    title: 'Your Centerpiece Birthday Gift — Deeply Personal & Unforgettable',
    headline: 'Give them one extraordinary birthday reveal that outshines every ordinary text and store-bought gift.',
    persuasiveHook:
      'Birthday texts vanish in a chat thread by afternoon and flowers wilt in three days. A private, PIN-locked Chasing Her birthday website makes them stop, smile, and replay your gift all week long.',
    baseReflection:
      'Your answers make this a clear match: you want one standout birthday gift that feels unmistakably made for them. Chasing Her weaves their name, favorite photos, a meaningful song, and a wax-sealed birthday letter into one private experience they will treasure.',
    defaultGiftRole: 'main-gift',
    recommendedEdition: 'chasing-her',
    recommendedEditionLabel: 'Chasing Her · Scrollable Birthday Story',
    recommendations: [
      'Private 6-digit PIN vault locked to their birthday or a date only you two share',
      'Signature five-blossom flower curtain reveal that opens straight into your birthday dedication',
      'Two moving Polaroid photo galleries with personal captions and inside jokes',
      'Interactive 3D gold wax-sealed birthday letter paired with their favorite song',
    ],
    whatTheyExperience: [
      'At midnight or first thing in the morning, they tap your link and enter their secret 6-digit birthday PIN.',
      'The floral curtain blooms open as their song begins playing and your Polaroid memories glide across the screen.',
      'They break the wax seal to read your personal birthday letter—the moment nobody else in their life can replicate.',
    ],
    closingNudge:
      'Build the entire birthday experience on your phone in under 20 minutes—no design skills needed. Preview the live demo below and lock in yours today.',
  },
  companion: {
    id: 'companion',
    title: 'The Secret Personal Upgrade That Makes Your Gift Unforgettable',
    headline: 'Your physical gift sets the stage—this is the personal moment that wins their heart.',
    persuasiveHook:
      'Dinner, perfume, and flowers are wonderful—but pairing them with a private PIN-protected birthday website turns a great birthday into a core memory they will show off and revisit long after the celebration ends.',
    baseReflection:
      'Because you already have a physical gift or celebration in mind, adding a Chasing Her birthday keepsake is the exact finishing touch that elevates everything. Tuck their 6-digit PIN inside a birthday card or send the link at midnight for an emotional surprise they never saw coming.',
    defaultGiftRole: 'companion-gift',
    recommendedEdition: 'either',
    recommendedEditionLabel:
      'Chasing Her or Memories — The Ultimate Companion Surprise',
    recommendations: [
      'Write their secret 6-digit PIN on a gift tag or send the link right as the celebration begins',
      'Pair your physical present with favorite photos, captions, and their favorite soundtrack',
      'Include a wax-sealed birthday letter or personal voice note they can keep in their pocket',
      'Ready to build in 20 minutes—for a fraction of what dinner or flowers cost',
    ],
    whatTheyExperience: [
      'Right alongside your flowers, dinner, or gift box, they receive a mysterious private link and 6-digit PIN.',
      'When they unlock it, the room lights up—their song plays while your favorite moments together unfold on screen.',
      'Days after the birthday ends, this is the part of your gift they keep opening and smiling at.',
    ],
    closingNudge:
      'Turn your planned birthday gift into a story they will never stop talking about. Experience the live sample right below and create yours in minutes.',
  },
  memories: {
    id: 'memories',
    title: 'A 34-Photo Birthday Keepsake Built Around Your Best Moments',
    headline: 'Let them relive 34 of your favorite memories shaped into a beating heart—with your voice playing softly.',
    persuasiveHook:
      'Nothing makes someone feel more celebrated on their birthday than seeing proof of how closely you’ve treasured every moment together. Memories transforms your camera roll into an emotional masterpiece they can open anytime.',
    baseReflection:
      'Your answers point straight to the Memories edition. Watching 34 of your happiest photos assemble tile-by-tile into a beating heart—layered with a personal voice note and their favorite song—delivers a level of birthday magic no greeting card can touch.',
    defaultGiftRole: 'main-gift',
    recommendedEdition: 'memories',
    recommendedEditionLabel: 'Memories · 34-Heart & Voice Duet',
    recommendations: [
      '34 of your favorite photos arranged tile-by-tile into an interactive beating heart mosaic',
      'Full-screen cinematic birthday slideshow with nine smooth transition effects',
      'Your recorded birthday voice note blended softly over their favorite song',
      'Private 6-digit PIN vault and five-blossom flower reveal built for their phone',
    ],
    whatTheyExperience: [
      'They unlock the PIN vault and watch the signature flowers bloom open to reveal their birthday dedication.',
      '34 cherished photos form a beating heart on screen—every tap opens a memory and caption.',
      'They hear your real voice wishing them happy birthday over a song that brings instant happy tears.',
    ],
    closingNudge:
      'Your photos are already sitting in your phone—turn them into the most memorable birthday gift they’ve ever received. Explore the interactive sample below and build yours today.',
  },
  revisit: {
    id: 'revisit',
    title: 'The Private Birthday Keepsake They’ll Open Again and Again',
    headline: 'Give them a birthday experience that stays alive long after the candles go out.',
    persuasiveHook:
      'Most birthday wishes are forgotten by the next morning. A private, PIN-protected Chasing Her keepsake becomes their personal sanctuary of photos, music, and heartfelt words they can revisit whenever they need a smile.',
    baseReflection:
      'Your answers show you want to celebrate them in a way that feels completely different from everyday birthday texts. Chasing Her brings your message, Polaroid memories, and handpicked music together in a luxury private page crafted exclusively for their phone.',
    defaultGiftRole: 'main-gift',
    recommendedEdition: 'chasing-her',
    recommendedEditionLabel: 'Chasing Her · Scrollable Birthday Story',
    recommendations: [
      'Private 6-digit PIN-protected link ready to send at 12:00 AM on their birthday',
      'Two moving Polaroid photo strips celebrating your favorite moments together',
      'Interactive 3D wax-sealed birthday letter written in your own heartfelt words',
      'Custom song chorus or Spotify soundtrack that plays as they explore every detail',
    ],
    whatTheyExperience: [
      'They tap your birthday link on their phone and unlock a private vault made just for them.',
      'Five signature blossoms open into a warm, intimate celebration filled with their name, song, and photos.',
      'They break the wax seal to read your birthday letter—and come back to replay it all month long.',
    ],
    closingNudge:
      'Stand out effortlessly from every "Happy Birthday!" text on their phone. Try the interactive demo below and start personalizing yours in minutes.',
  },
  deciding: {
    id: 'deciding',
    title: 'Your Instant Birthday Breakthrough — Ready in 20 Minutes',
    headline: 'Stop stressing over what to get them—this is the personal gift that delights every time.',
    persuasiveHook:
      'When you’re still figuring out the right birthday plan, the smartest move is choosing a gift that is 100% personal, impossible to duplicate, and looks like you hired a private designer—all built on your phone in 20 minutes.',
    baseReflection:
      'You don’t have to guess or settle for a last-minute gift. In one quick look at the interactive birthday demo below, you’ll see why thousands of people choose Chasing Her—it shines effortlessly as your main birthday surprise and pairs seamlessly with dinner, flowers, or any physical gift you add.',
    defaultGiftRole: 'explore-first',
    recommendedEdition: 'either',
    recommendedEditionLabel: 'Chasing Her or Memories — Both Ready to Personalize Today',
    recommendations: [
      'Opens with a dramatic 6-digit PIN vault and signature five-blossom flower curtain',
      'Turn your existing phone photos, their song, and your words into a luxury website in 20 minutes',
      'Shines as a complete standalone birthday gift OR elevates flowers, dinner, or a physical present',
      'Guided step-by-step builder with 48-hour auto-save—zero technical skills required',
    ],
    whatTheyExperience: [
      'They receive a private link with a 6-digit PIN and immediately realize you made something custom for them.',
      'Flowers bloom open into their song, scrolling Polaroids or a 34-photo heart, and a wax-sealed letter.',
      'They feel genuinely celebrated, remembered, and surprised in a way no store-bought item achieves alone.',
    ],
    closingNudge:
      'Tap into the live interactive demo right below—the second you unlock the PIN and see the flowers open, you’ll know this is the birthday gift that wins the day.',
  },
};

export const DEFAULT_BIRTHDAY_EDITIONS: readonly BirthdayEditionSpec[] = [
  {
    id: 'chasing-her',
    editionNumber: 'Edition 01',
    name: 'Chasing Her · Scrollable Story',
    tagline:
      'A private birthday page built around your message, Polaroid memories, music, and a wax-sealed letter.',
    features: [
      'Opens with a 6-digit PIN vault and a five-blossom flower curtain.',
      'Two moving rows of Polaroid-style photos with captions.',
      'Interactive 3D wax-sealed letter.',
      'Custom song chorus or Spotify playlist option.',
    ],
    sampleButtonLabel: 'Explore Chasing Her',
  },
  {
    id: 'memories',
    editionNumber: 'Edition 02',
    name: 'Memories · 34-Heart & Voice Duet',
    tagline:
      'A photo-centered birthday keepsake pairing a beating heart mosaic with a slideshow and voice note.',
    features: [
      '34 photos arranged tile-by-tile into a beating heart mosaic.',
      'Full-screen slideshow with nine transition effects.',
      'Recorded voice note with background music.',
      'PIN vault and flower-curtain reveal.',
    ],
    sampleButtonLabel: 'Explore Memories',
  },
] as const;

// Optional stories from the standard Birthday page that the admin can import if verified & approved
export const PORTABLE_BIRTHDAY_STORIES: readonly VerifiedTestimonial[] = [
  {
    id: 'bday-story-1',
    badge: 'STORY 01 · MIDNIGHT BIRTHDAY SURPRISE',
    customerName: 'Kwame O.',
    location: 'East Legon, Accra 🇬🇭',
    createdWhat: 'Chasing Her · Scrollable Story',
    headline:
      '"I built her entire birthday website on my phone in 20 minutes — and it looked like I hired a designer."',
    feedback:
      'I wanted something personal for her birthday. The builder guided me step by step: I added 12 of our favorite photos, picked her favorite song, and wrote why I love her. Watching the flowers bloom when she typed her birthday PIN was unforgettable.',
    whatsappSent:
      'Babe, happy birthday ❤️ Open this when you wake up: chasingher.love/for-ama (PIN: 140826)',
    whatsappReply:
      "WAIT STOP 😭❤️ How did you make a whole website for my birthday?! I'm literally showing all my friends right now!",
    previewTarget: 'chasing-her',
    verifiedPermission: true,
  },
  {
    id: 'bday-story-2',
    badge: 'STORY 02 · 34-HEART MEMORIES',
    customerName: 'Brian M.',
    location: 'Westlands, Nairobi 🇰🇪',
    createdWhat: 'Memories · 34-Heart & Voice Duet',
    headline:
      '"At midnight on her birthday, she screen-recorded her reaction and called me in tears."',
    feedback:
      'I told her the passcode was the date we first met. When the flowers parted and my voice note started playing softly over 34 of our favorite moments shaped into a beating heart, she said nobody had ever done anything this thoughtful for her.',
    whatsappSent:
      'Happy birthday my queen 🎂 Tap the heart & enter the date we first met: chasingher.love/wanjiku',
    whatsappReply:
      'Hearing your voice play over our 34 photos made me cry happy tears 😭 Best birthday gift anyone has ever given me.',
    previewTarget: 'memories',
    verifiedPermission: true,
  },
  {
    id: 'bday-story-3',
    badge: 'STORY 03 · LONG-DISTANCE BIRTHDAY',
    customerName: 'Daniel K.',
    location: 'Kilimani, Nairobi 🇰🇪',
    createdWhat: 'Chasing Her · Scrollable Story',
    headline:
      '"I couldn’t fly in for her birthday, so I built a private website she opened at 12:00 AM with headphones on."',
    feedback:
      'Flowers fade in three days and texts disappear in a chat thread. For less than the cost of dinner, I gave her a PIN-protected keepsake with our Polaroids, her favorite songs, and a wax-sealed letter she still opens every week.',
    whatsappSent:
      'Made something special for your birthday, open with headphones on 🎧❤️ chasingher.love/abena',
    whatsappReply:
      "You really sat down and built this from scratch for me?! I've replayed our soundtrack 6 times already ❤️✨",
    previewTarget: 'chasing-her',
    verifiedPermission: true,
  },
];

const ENV_BIRTHDAY_CHECKOUT_URL =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_BIRTHDAY_INTERACTIVE_CHECKOUT_URL
    ? String(import.meta.env.VITE_BIRTHDAY_INTERACTIVE_CHECKOUT_URL).trim()
    : '';

const ENV_BIRTHDAY_PAYMENT_PROVIDER =
  typeof import.meta !== 'undefined' &&
  import.meta.env?.VITE_BIRTHDAY_INTERACTIVE_PAYMENT_PROVIDER
    ? String(import.meta.env.VITE_BIRTHDAY_INTERACTIVE_PAYMENT_PROVIDER).trim()
    : '';

export const DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG: BirthdayInteractiveConfig = {
  brandName: 'Chasing Her ♥',
  productName: 'Digital Birthday Keepsake',
  markets: {
    gh: {
      enabled: true,
      currency: 'GHC',
      currencyPosition: 'suffix',
      selfBuildPrice: 50,
      previousPrice: 200,
      conciergePrice: 80,
      offerActive: true,
    },
    ke: {
      enabled: true,
      currency: 'KSh',
      currencyPosition: 'prefix',
      selfBuildPrice: 650,
      previousPrice: 2500,
      conciergePrice: 1200,
      offerActive: true,
    },
  },
  checkout: {
    checkoutUrl: ENV_BIRTHDAY_CHECKOUT_URL,
    paymentProvider: ENV_BIRTHDAY_PAYMENT_PROVIDER,
    postPaymentRedirectUrl: '/my-site/',
    conciergeEnabled: false,
    conciergeDeliveryTiming: 'within 24 hours',
    conciergeScope:
      'Upload your photos and notes in My Site and our team assembles the birthday page for you.',
    hostingDurationLabel: '30 days of private PIN-protected hosting',
    autoSaveLabel: '48-hour auto-saved editing',
  },
  editions: DEFAULT_BIRTHDAY_EDITIONS,
  // Brief §7 & §12: Keep hidden from public visitors until verified testimonials are supplied/enabled in Admin
  verifiedTestimonials: [],
};

// ============================================================================
// DETERMINISTIC BIRTHDAY GIFT MATCH ENGINE
// ============================================================================

const Q1_RECIPIENT_PHRASE: Record<string, string> = {
  bq1_partner: 'your partner',
  bq1_dating: 'someone you’re dating or getting to know',
  bq1_spouse: 'your spouse',
  bq1_special: 'someone special in your life',
};

const Q2_FEELING_PHRASE: Record<string, string> = {
  bq2_loved: 'help them feel genuinely loved and appreciated',
  bq2_memories: 'celebrate the special moments you share',
  bq2_surprised: 'surprise them with something personal and unexpected',
  bq2_celebrated:
    'celebrate them in a way that feels different from everyday birthday texts',
  bq2_unsure: 'keep your options open while exploring what feels right',
};

const Q4_TRAIT_PHRASE: Record<string, string> = {
  bq4_messages: 'personal messages and thoughtful details',
  bq4_photos: 'photos, memories, and looking back on special moments',
  bq4_music: 'music and meaningful songs',
  bq4_voice: 'hearing your voice or reading words written just for them',
  bq4_mix: 'a mix of messages, photos, and music',
  bq4_unsure: 'thoughtful details once you see how the experience works',
};

export function evaluateBirthdayQuestionnaire(
  answers: BirthdayQuestionnaireAnswers,
  options?: { conciergeEnabled?: boolean }
): EvaluatedBirthdayResult {
  const conciergeEnabled = Boolean(options?.conciergeEnabled);

  const scores: Record<BirthdayResultId, number> = {
    'stand-alone': 0,
    companion: 0,
    memories: 0,
    revisit: 0,
    deciding: 0,
  };

  for (const question of BIRTHDAY_INTERACTIVE_QUESTIONS) {
    const selectedId = answers[question.id];
    if (!selectedId) continue;
    const opt = question.options.find((o) => o.id === selectedId);
    if (!opt) continue;
    for (const [resId, weight] of Object.entries(opt.weights)) {
      scores[resId as BirthdayResultId] += weight || 0;
    }
  }

  // Consistency guards so results NEVER contradict visitor selections
  const wantsCompanion =
    answers.q3 === 'bq3_pair' ||
    answers.q3 === 'bq3_celebration' ||
    answers.q5 === 'bq5_alongside';
  const wantsMainGift = answers.q3 === 'bq3_main';
  const isUndecided =
    answers.q3 === 'bq3_deciding' ||
    (answers.q2 === 'bq2_unsure' && answers.q4 === 'bq4_unsure') ||
    (answers.q5 === 'bq5_see_first' && answers.q4 === 'bq4_unsure');

  if (wantsCompanion) {
    scores['stand-alone'] = Math.min(scores['stand-alone'], 2);
    scores.companion += 3;
  }

  if (wantsMainGift && answers.q5 !== 'bq5_alongside') {
    scores.companion = Math.min(scores.companion, 2);
  }

  if (isUndecided) {
    scores.deciding += 4;
  }

  const allIds: BirthdayResultId[] = [
    'stand-alone',
    'companion',
    'memories',
    'revisit',
    'deciding',
  ];
  const maxScore = Math.max(...allIds.map((id) => scores[id]));
  const winner: BirthdayResultId =
    allIds.find((id) => scores[id] === maxScore) || 'stand-alone';

  const template = BIRTHDAY_RESULT_TEMPLATES[winner];
  const recipientPhrase =
    (answers.q1 && Q1_RECIPIENT_PHRASE[answers.q1]) || 'the person you’re celebrating';

  // Gift role must reflect Q3 & Q5 honestly
  let giftRole: BirthdayGiftRole = template.defaultGiftRole;
  if (wantsCompanion) {
    giftRole = 'companion-gift';
  } else if (isUndecided || answers.q5 === 'bq5_see_first') {
    giftRole = 'explore-first';
  } else if (wantsMainGift) {
    giftRole = 'main-gift';
  }

  const reflectionPrefix =
    answers.q1 === 'bq1_dating'
      ? `When you’re celebrating ${recipientPhrase}, a custom, tasteful gesture makes an unforgettable impression without trying too hard.`
      : `Celebrating ${recipientPhrase} deserves more than a generic birthday text—it deserves a private moment built exclusively around them.`;

  const reflection = `${reflectionPrefix} ${template.baseReflection}`;

  // Persuasive, confident gift-role positioning tailored cleanly to Q3 & Q5 (zero self-undermining disclaimers)
  let fitExplanation = '';
  if (giftRole === 'companion-gift') {
    fitExplanation =
      'Built to elevate your main gift: Tuck their 6-digit PIN inside a birthday card or send the private link right alongside flowers, dinner, or a physical present—so they experience an unforgettable emotional reveal they can open and treasure long after the party ends.';
  } else if (giftRole === 'explore-first') {
    fitExplanation =
      'One effortless gift that works every way you celebrate: Experience the interactive birthday demo below to feel the PIN unlock, blooming flower curtain, music, and wax-sealed letter firsthand—whether you give it as your centerpiece surprise or pair it with dinner and flowers, it turns their birthday into a lasting keepsake.';
  } else {
    fitExplanation =
      'Complete, personal, and ready to shine as your main birthday gift: Bringing their name, cherished photos, a meaningful song, and a wax-sealed birthday letter into one private PIN-protected website delivers the kind of emotional impact ordinary gifts simply cannot match.';
  }

  // Why it matches their answers (natural second-person wording, persuasive and confident)
  const feelingPhrase = answers.q2 ? Q2_FEELING_PHRASE[answers.q2] : undefined;
  const traitPhrase = answers.q4 ? Q4_TRAIT_PHRASE[answers.q4] : undefined;
  let whyItFits =
    'Your answers align directly with what Chasing Her does best—turning your personal memories and words into an unforgettable birthday reveal.';
  if (feelingPhrase && traitPhrase) {
    whyItFits = `Because you want to ${feelingPhrase}—and they light up over ${traitPhrase}—${template.recommendedEditionLabel} gives you everything needed to deliver that exact birthday moment in under 20 minutes.`;
  } else if (feelingPhrase) {
    whyItFits = `Because you want to ${feelingPhrase}, ${template.recommendedEditionLabel} gives you the fastest, most personal way to create a birthday reveal they will replay all week.`;
  }

  // Q6 guides self-build vs concierge confidently
  let recommendedBuildMode: BirthdayBuildMode | 'compare' = 'self-build';
  let buildModeNote =
    'Our guided self-build studio walks you through adding photos, your birthday letter, and music step by step on your phone—complete with 48-hour auto-save so you finish effortlessly.';

  if (answers.q6 === 'bq6_help') {
    if (conciergeEnabled) {
      recommendedBuildMode = 'concierge';
      buildModeNote =
        'Since you’d love a helping hand, select our Done-for-You Concierge option below—just drop your photos and notes into My Site and our studio team builds the entire birthday experience for you.';
    } else {
      recommendedBuildMode = 'self-build';
      buildModeNote =
        'Even if you want help putting it together, our guided self-build studio does the heavy lifting for you—just pick photos, type your note, and choose a song in minutes (done-for-you concierge is currently unavailable).';
    }
  } else if (answers.q6 === 'bq6_options') {
    recommendedBuildMode = 'compare';
    buildModeNote = conciergeEnabled
      ? 'Choose between instant guided self-build (ready in 20 minutes) or our Done-for-You Concierge studio right below.'
      : 'Everything you need is included in our guided self-build studio below—ready to personalize on your phone in 20 minutes.';
  }

  const prioritizeSampleBeforeCheckout =
    answers.q5 === 'bq5_see_first' || winner === 'deciding';

  return {
    id: template.id,
    title: template.title,
    headline: template.headline,
    persuasiveHook: template.persuasiveHook,
    reflection,
    giftRole,
    fitExplanation,
    recommendedEdition: template.recommendedEdition,
    recommendedEditionLabel: template.recommendedEditionLabel,
    recommendations: template.recommendations,
    whatTheyExperience: template.whatTheyExperience,
    closingNudge: template.closingNudge,
    whyItFits,
    recommendedBuildMode,
    buildModeNote,
    prioritizeSampleBeforeCheckout,
  };
}

// ============================================================================
// MARKET PRICING CALCULATOR (Zero Silent Currency Conversion)
// ============================================================================

export function formatBirthdayMarketAmount(
  amount: number,
  currency: string,
  position: 'prefix' | 'suffix'
): string {
  const cleanCurrency = (currency || '').trim();
  const formattedNumber = Math.round(amount).toLocaleString('en-US');
  if (!cleanCurrency) return formattedNumber;
  return position === 'suffix'
    ? `${formattedNumber} ${cleanCurrency}`
    : `${cleanCurrency} ${formattedNumber}`;
}

export function calculateBirthdayOfferPricing(
  market: BirthdayMarketPricingConfig
): CalculatedBirthdayMarketPricing {
  const selfBuildPrice = Math.max(0, Number(market.selfBuildPrice) || 0);
  const previousPrice = Math.max(0, Number(market.previousPrice) || 0);
  const conciergePrice = Math.max(0, Number(market.conciergePrice) || 0);
  const showPreviousPrice =
    Boolean(market.offerActive) &&
    previousPrice > selfBuildPrice &&
    selfBuildPrice > 0;

  return {
    currency: market.currency,
    selfBuildPrice,
    previousPrice,
    conciergePrice,
    showPreviousPrice,
    formattedSelfBuild: formatBirthdayMarketAmount(
      selfBuildPrice,
      market.currency,
      market.currencyPosition
    ),
    formattedPrevious: formatBirthdayMarketAmount(
      previousPrice,
      market.currency,
      market.currencyPosition
    ),
    formattedConcierge: formatBirthdayMarketAmount(
      conciergePrice,
      market.currency,
      market.currencyPosition
    ),
  };
}

export function isBirthdayCheckoutConfigured(
  checkout: BirthdayInteractiveCheckoutConfig
): boolean {
  const url = (checkout.checkoutUrl || '').trim();
  const provider = (checkout.paymentProvider || '').trim();
  if (!url || !provider) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// ============================================================================
// CHECKOUT FORM VALIDATION (Requires Exact 6-Digit PIN per Birthday Brief §10)
// ============================================================================

export interface BirthdayCheckoutFormInput {
  edition: InteractiveEditionId;
  buildMode: BirthdayBuildMode;
  recipientName: string;
  pin: string;
  senderName: string;
  whatsapp: string;
  email: string;
  consentAccepted: boolean;
  country: CountryCode;
  dialPrefix?: string;
}

export interface BirthdayCheckoutFormErrors {
  recipientName?: string;
  pin?: string;
  senderName?: string;
  whatsapp?: string;
  email?: string;
  consentAccepted?: string;
}

export function validateBirthdayCheckoutForm(
  input: BirthdayCheckoutFormInput
): {
  valid: boolean;
  errors: BirthdayCheckoutFormErrors;
  normalizedWhatsapp?: string;
  normalizedPin: string;
  emailSuggestion?: string;
} {
  const errors: BirthdayCheckoutFormErrors = {};

  if (!input.recipientName.trim() || input.recipientName.trim().length < 2) {
    errors.recipientName = 'Enter the name of the person you’re celebrating.';
  }

  const pinDigits = input.pin.replace(/\D/g, '');
  if (pinDigits.length !== 6) {
    errors.pin = 'Enter a 6-digit PIN (for example, their birthday like 140826).';
  }

  if (!input.senderName.trim() || input.senderName.trim().length < 2) {
    errors.senderName = 'Enter your name.';
  }

  let normalizedWhatsapp: string | undefined;
  const rawPhone = input.whatsapp.trim();
  if (!rawPhone) {
    errors.whatsapp = 'Enter your WhatsApp number so we can send access updates.';
  } else if (input.dialPrefix && !rawPhone.startsWith('+')) {
    const localDigits = rawPhone.replace(/\D/g, '').replace(/^0+/, '');
    if (localDigits.length < 7 || localDigits.length > 12) {
      errors.whatsapp = 'Enter a valid WhatsApp number.';
    } else {
      normalizedWhatsapp = `${input.dialPrefix}${localDigits}`;
    }
  } else {
    const phoneCheck = validateWhatsAppPhone(rawPhone, input.country);
    if (!phoneCheck.valid) {
      errors.whatsapp = phoneCheck.error || 'Enter a valid WhatsApp number.';
    } else {
      normalizedWhatsapp = phoneCheck.e164;
    }
  }

  const emailCheck = validateCustomerEmail(input.email);
  if (!emailCheck.valid) {
    errors.email = emailCheck.error || 'Enter a valid email address.';
  }

  if (!input.consentAccepted) {
    errors.consentAccepted =
      'Please confirm the terms and privacy policy before continuing.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedWhatsapp,
    normalizedPin: pinDigits,
    emailSuggestion: emailCheck.suggestion,
  };
}

// ============================================================================
// SAFE MERGE & SERIALIZATION (Admin & Persistence)
// ============================================================================

export function mergeBirthdayInteractiveConfig(
  raw: string | Partial<BirthdayInteractiveConfig> | null | undefined
): BirthdayInteractiveConfig {
  if (!raw) return DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG;
  let parsed: Partial<BirthdayInteractiveConfig> | null = null;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as Partial<BirthdayInteractiveConfig>;
    } catch {
      return DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG;
    }
  } else {
    parsed = raw;
  }
  if (!parsed || typeof parsed !== 'object') {
    return DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG;
  }

  const verifiedTestimonials = Array.isArray(parsed.verifiedTestimonials)
    ? parsed.verifiedTestimonials.filter(
        (t): t is VerifiedTestimonial =>
          Boolean(t) &&
          typeof t.customerName === 'string' &&
          t.customerName.trim().length > 0 &&
          typeof t.feedback === 'string' &&
          t.feedback.trim().length > 0 &&
          t.verifiedPermission === true
      )
    : DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG.verifiedTestimonials;

  const ghMarket: BirthdayMarketPricingConfig = {
    ...DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG.markets.gh,
    ...(parsed.markets?.gh || {}),
  };
  const keMarket: BirthdayMarketPricingConfig = {
    ...DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG.markets.ke,
    ...(parsed.markets?.ke || {}),
  };

  return {
    brandName:
      parsed.brandName?.trim() || DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG.brandName,
    productName:
      parsed.productName?.trim() ||
      DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG.productName,
    markets: {
      gh: ghMarket,
      ke: keMarket,
    },
    checkout: {
      ...DEFAULT_BIRTHDAY_INTERACTIVE_CONFIG.checkout,
      ...(parsed.checkout || {}),
    },
    editions: DEFAULT_BIRTHDAY_EDITIONS,
    verifiedTestimonials,
  };
}

export function serializeBirthdayInteractiveConfig(
  config: BirthdayInteractiveConfig
): string {
  return JSON.stringify(config);
}

export { formatConfiguredAmount, trackAnonymousFunnelEvent };
