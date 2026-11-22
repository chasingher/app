import {
  CountryCode,
  ProductType,
  OrderProgressStage,
  ChasingHerProjectData,
  MemoriesProjectData,
  LOCKED_FLOWER_WALL_ASSETS,
  resolvePublicAssetUrl,
} from './platformLogic';

// Romantic SVG artwork data URIs so every template, polaroid, and heart mosaic renders instantaneously with zero external broken images
export function createRomanticIllustration(
  title: string,
  subtitle: string,
  c1 = '#6E182E',
  c2 = '#2A0811',
  accent = '#E2B96F'
): string {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
    <defs>
      <radialGradient id="g" cx="50%" cy="32%" r="75%">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="100%" stop-color="${c2}" />
      </radialGradient>
    </defs>
    <rect width="600" height="600" fill="url(#g)" />
    <circle cx="300" cy="255" r="190" fill="none" stroke="${accent}" stroke-opacity="0.24" stroke-width="2" />
    <path d="M300 375C246 332 174 272 174 198c0-42 32-74 72-74 25 0 46 13 54 33 8-20 29-33 54-33 40 0 72 32 72 74 0 74-72 134-126 177z" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="3" />
    <text x="300" y="458" text-anchor="middle" fill="#FBF3EA" font-family="Georgia, serif" font-size="30" font-style="italic">${esc(title)}</text>
    <text x="300" y="498" text-anchor="middle" fill="${accent}" font-family="sans-serif" font-size="16" letter-spacing="2">${esc(subtitle)}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const ROMANTIC_GALLERY = [
  createRomanticIllustration('Sunset in Labadi Beach', 'ACCRA · OUR FIRST DATE', '#7A1B34', '#24070F', '#E8C27A'),
  createRomanticIllustration('Dinner Under the Stars', 'NAIROBI · ANNIVERSARY', '#5C162C', '#1D060D', '#F0B67F'),
  createRomanticIllustration('Late Night Drive', 'VICTORIA ISLAND · LAGOS', '#84203B', '#2B0912', '#E2B96F'),
  createRomanticIllustration('Sunday Morning Coffee', 'ALWAYS & FOREVER', '#681A36', '#210711', '#F4C98E'),
  createRomanticIllustration('Dancing in the Rain', 'EVERY MOMENT WITH YOU', '#7D2338', '#260810', '#E8C27A'),
  createRomanticIllustration('Our Favorite Song', 'MIDNIGHT CONFESSIONS', '#521527', '#1B050B', '#DFB46B'),
];

const RUNTIME_BASE_URL =
  typeof import.meta !== 'undefined' &&
  (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL
    ? (import.meta as { env?: { BASE_URL?: string } }).env!.BASE_URL!
    : '/';

export const LOCKED_FLOWER_WALL_ITEMS = LOCKED_FLOWER_WALL_ASSETS.map((asset) => ({
  id: asset.id,
  name: asset.name,
  url: resolvePublicAssetUrl(asset.relativePath, RUNTIME_BASE_URL),
}));

// Exclusive 5-blossom botanical flower wall used across every site (customers cannot alter this pool)
export const DEFAULT_FLOWER_POOL: string[] = LOCKED_FLOWER_WALL_ITEMS.map((item) => item.url);

export const INITIAL_MUSIC_LIBRARY = [
  {
    id: 'mus-1',
    title: 'Golden Hour Piano Serenade',
    artist: 'Chasing Her Originals',
    file_url: '',
    display_order: 1,
    is_active: true,
  },
  {
    id: 'mus-2',
    title: 'Midnight Promise (Acoustic Strings)',
    artist: 'Studio Romance',
    file_url: '',
    display_order: 2,
    is_active: true,
  },
  {
    id: 'mus-3',
    title: 'Soft Guitar Forever',
    artist: 'Nairobi & Accra Sessions',
    file_url: '',
    display_order: 3,
    is_active: true,
  },
];

export const INITIAL_SHOWCASE_MEDIA = {
  'chasing-her': {
    media_url: ROMANTIC_GALLERY[0],
    media_type: 'image' as const,
  },
  memories: {
    media_url: ROMANTIC_GALLERY[1],
    media_type: 'image' as const,
  },
};

export interface SubmissionOrder {
  id: string;
  slug: string;
  product: ProductType;
  build_product?: 'chasing-her' | 'memories';
  full_name: string;
  whatsapp: string;
  email: string;
  country: CountryCode;
  status: 'pending_payment' | 'paid' | 'hosted' | 'expired';
  progress: OrderProgressStage;
  progress_note?: string;
  pin: string;
  hosted_url?: string;
  html_url?: string;
  returned_from_payment_at?: string | null;
  build_saved_at?: string | null;
  brief?: {
    design?: string;
    for?: string;
    feel?: string;
    links?: string;
    notes?: string;
  } | null;
  created_at: string;
}

export const INITIAL_ORDERS: SubmissionOrder[] = [
  {
    id: 'ord-gh-101',
    slug: 'ama-and-kofi',
    product: 'chasing-her',
    build_product: 'chasing-her',
    full_name: 'Kofi Mensah',
    whatsapp: '+233245819200',
    email: 'kofi@example.com',
    country: 'gh',
    status: 'hosted',
    progress: 'hosted',
    progress_note: 'Your Chasing Her site is live! Share the link & secret PIN with Ama whenever you are ready.',
    pin: '140226',
    hosted_url: '/preview/?product=chasing-her&slug=ama-and-kofi',
    build_saved_at: new Date(Date.now() - 1000 * 60 * 60 * 17).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
  },
  {
    id: 'ord-ke-102',
    slug: 'wanjiku-and-brian',
    product: 'memories',
    build_product: 'memories',
    full_name: 'Brian Ochieng',
    whatsapp: '+254712904321',
    email: 'brian@example.com',
    country: 'ke',
    status: 'paid',
    progress: 'building',
    progress_note: 'Our studio is arranging your 34-photo heart mosaic and syncing your voice note duet.',
    pin: '250824',
    hosted_url: '/preview/?product=memories&slug=wanjiku-and-brian',
    build_saved_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    id: 'ord-gh-103',
    slug: 'abena-and-kwesi',
    product: 'custom',
    build_product: 'memories',
    full_name: 'Kwesi Boateng',
    whatsapp: '+233248192837',
    email: 'kwesi@example.com',
    country: 'gh',
    status: 'pending_payment',
    progress: 'review',
    progress_note: 'Your custom Memories build for Abena is ready for your final review before anniversary night.',
    pin: '191125',
    returned_from_payment_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    brief: {
      design: 'memories',
      for: 'My fiancée Abena',
      feel: 'Warm, intimate, nostalgic — celebrating 3 years together in Kumasi',
      links: 'gs://gen-lang-client-0322444571.firebasestorage.app/projects/abena-and-kwesi',
      notes: 'Please highlight our engagement photo in the center of the heart mosaic.',
    },
    hosted_url: '/preview/?product=memories&slug=wanjiku-and-brian',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
];

export const INITIAL_CHASING_HER_PROJECTS: Record<string, ChasingHerProjectData> = {
  'ama-and-kofi': {
    slug: 'ama-and-kofi',
    pin: '140226',
    intro_message: 'Every ordinary day becomes unforgettable because you are in it, Ama.',
    letter_title: 'My Dearest Ama,',
    letter_body:
      'From the first evening we laughed for hours in Osu to every quiet call before sleep, you have been my peace, my joy, and my favorite person in this world.\n\nNo matter how busy life gets, I built this little corner of the internet so you always have a place that reminds you how deeply you are loved.\n\nForever yours,\nKofi',
    final_message: 'I love you to the moon and back, my queen.',
    photos: [
      { url: ROMANTIC_GALLERY[0], caption: 'Labadi Sunset' },
      { url: ROMANTIC_GALLERY[1], caption: 'Candlelight Dinner' },
      { url: ROMANTIC_GALLERY[2], caption: 'Midnight Laughs' },
      { url: ROMANTIC_GALLERY[3], caption: 'Sunday Coffee' },
      { url: ROMANTIC_GALLERY[4], caption: 'Dancing Together' },
      { url: ROMANTIC_GALLERY[5], caption: 'Our Forever' },
    ],
    flower_images: DEFAULT_FLOWER_POOL,
    songs: [
      {
        title: 'Love Nwantiti (Acoustic)',
        artist: 'CKay',
        duration: '2:26',
        spotify_url: 'https://open.spotify.com/track/2Xr1dTzJee307rmrkt8c0g',
      },
      {
        title: 'Essence',
        artist: 'Wizkid ft. Tems',
        duration: '4:08',
        spotify_url: 'https://open.spotify.com/track/5FG7Tl93LdH117jEKYl3Cm',
      },
      {
        title: 'Perfect',
        artist: 'Ed Sheeran',
        duration: '4:23',
        spotify_url: 'https://open.spotify.com/track/0tgVpDi06FyKpA1z0VMD4v',
      },
    ],
    music_url: '',
    music_start: 0,
    music_end: null,
  },
};

export const INITIAL_MEMORIES_PROJECTS: Record<string, MemoriesProjectData> = {
  'wanjiku-and-brian': {
    slug: 'wanjiku-and-brian',
    pin: '250824',
    hero_title: 'For Wanjiku',
    hero_subtitle: 'I gathered our favorite moments into one place… tap the heart to begin.',
    collage_names: 'Wanjiku & Brian',
    collage_day: '25',
    collage_month: '08',
    collage_year: '2024',
    collage_quote: 'Every love story is beautiful, but ours is my favorite.',
    mosaic_images: [
      ROMANTIC_GALLERY[0],
      ROMANTIC_GALLERY[1],
      ROMANTIC_GALLERY[2],
      ROMANTIC_GALLERY[3],
      ROMANTIC_GALLERY[4],
      ROMANTIC_GALLERY[5],
    ],
    letter_title: 'To My Heart, Wanjiku,',
    letter_body:
      'Every photo in that heart holds a piece of our story — from our spontaneous road trips out of Nairobi to the quiet evenings when just holding your hand says everything.\n\nThank you for loving me with so much warmth and grace. Here is to a lifetime of new memories together.\n\nWith all my love,\nBrian',
    final_message: 'Forever & Always, Brian',
    memories: [
      {
        url: ROMANTIC_GALLERY[1],
        type: 'image',
        caption: 'The night we couldn’t stop talking until 2 AM',
        date: 'August 2024',
        place: 'Westlands, Nairobi',
        transition: 'fade',
        duration: 6,
      },
      {
        url: ROMANTIC_GALLERY[0],
        type: 'image',
        caption: 'Golden hour by the ocean — your smile lit up the coast',
        date: 'December 2024',
        place: 'Diani Beach',
        transition: 'zoom-in',
        duration: 6,
      },
      {
        url: ROMANTIC_GALLERY[3],
        type: 'image',
        caption: 'Our quiet Sunday mornings together',
        date: 'February 2025',
        place: 'Kilimani',
        transition: 'polaroid',
        duration: 6,
      },
    ],
    flower_images: DEFAULT_FLOWER_POOL,
    music_url: '',
    music_start: 0,
    music_end: null,
    voice_url: '',
  },
};

export interface TestimonialItem {
  id: string;
  country: CountryCode;
  customer_name: string;
  location: string;
  product: 'Chasing Her' | 'Memories' | 'Build It For Me';
  quote: string;
  outcome: string;
  kind?: 'photo' | 'video';
  media_url?: string;
  video_url?: string;
  display_order?: number;
  is_published?: boolean;
}

export const INITIAL_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'test-gh-1',
    country: 'gh',
    customer_name: 'Kwame A.',
    location: 'East Legon, Accra',
    product: 'Chasing Her',
    quote:
      'She literally cried when the flowers parted and her PIN unlocked our polaroid wall. Best 50 GHC I have ever spent on an anniversary gift.',
    outcome: 'Delivered in 15 mins · Opened 14 times in 48 hours',
    kind: 'photo',
    media_url: ROMANTIC_GALLERY[0],
    display_order: 1,
    is_published: true,
  },
  {
    id: 'test-ke-1',
    country: 'ke',
    customer_name: 'Kevin M.',
    location: 'Kilimani, Nairobi',
    product: 'Memories',
    quote:
      'When our 34 photos flew into a beating heart with my voice note playing softly over our song, she called me immediately in tears of joy.',
    outcome: 'Paid via M-PESA · Shared across her close friends list',
    kind: 'photo',
    media_url: ROMANTIC_GALLERY[1],
    display_order: 2,
    is_published: true,
  },
  {
    id: 'test-ke-2',
    country: 'ke',
    customer_name: 'Daniel O.',
    location: 'Nyali, Mombasa',
    product: 'Build It For Me',
    quote:
      'I was swamped at work so I sent my photos to the Chasing Her team. Within 2 hours they sent back a masterpiece.',
    outcome: 'Concierge Custom Build · 100% stress-free',
    kind: 'photo',
    media_url: ROMANTIC_GALLERY[2],
    display_order: 3,
    is_published: true,
  },
];

export {
  uploadMediaToFirebase,
  deleteMediaFromFirebase,
  cleanFirebaseStorageCatalog,
  getFirebaseBucketEndpoint,
  buildFirebaseBucketObjectUrl,
} from './firebaseClient';
