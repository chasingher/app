export type CountryCode = 'gh' | 'ke' | 'ng';
export type ProductType = 'chasing-her' | 'memories' | 'custom';
export type OrderProgressStage = 'received' | 'building' | 'review' | 'hosted';
export type RouteTarget = 'payment' | 'builder' | 'brief';

export interface CountryConfig {
  code: CountryCode;
  name: string;
  flag: string;
  settingsPrefix: '' | 'ke_' | 'ng_';
  dialCode: string;
  currencySymbol: string;
  currencyCode: string;
  paymentMethodsLabel: string;
  cityTagline: string;
  heroBadge: string;
  heroHeadline: string;
  heroSubheadline: string;
  defaultPricePage: string;
  defaultPriceWas: string;
  defaultPriceCustom: string;
  phonePlaceholder: string;
  localDigitsLength: number[];
}

export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  gh: {
    code: 'gh',
    name: 'Ghana',
    flag: '🇬🇭',
    settingsPrefix: '',
    dialCode: '+233',
    currencySymbol: 'GH₵',
    currencyCode: 'GHS',
    paymentMethodsLabel: 'MTN MoMo · Telecel Cash · AirtelTigo · Card',
    cityTagline: 'Loved across Accra, Kumasi, Takoradi & Tema',
    heroBadge: 'Ghana Edition · Instant Mobile Money & Card Delivery',
    heroHeadline: 'Give her a private love website she will replay forever.',
    heroSubheadline:
      'Your favorite photos, your own words, a flower reveal, and the song that reminds you of her — wrapped behind a secret PIN only she knows.',
    defaultPricePage: '50 GHC',
    defaultPriceWas: '200 GHC',
    defaultPriceCustom: '80 GHC',
    phonePlaceholder: '024 123 4567',
    localDigitsLength: [9],
  },
  ke: {
    code: 'ke',
    name: 'Kenya',
    flag: '🇰🇪',
    settingsPrefix: 'ke_',
    dialCode: '+254',
    currencySymbol: 'KSh',
    currencyCode: 'KES',
    paymentMethodsLabel: 'M-PESA · Airtel Money · Visa / Mastercard',
    cityTagline: 'Loved across Nairobi, Mombasa, Kisumu & Nakuru',
    heroBadge: 'Kenya Edition · Instant M-PESA & Card Checkout',
    heroHeadline: 'A romantic digital keepsake made from your memories together.',
    heroSubheadline:
      'Turn your camera roll, voice note, and heartfelt letter into an interactive website she unlocks with a personal 6-digit PIN.',
    defaultPricePage: 'KSh 650',
    defaultPriceWas: 'KSh 2,500',
    defaultPriceCustom: 'KSh 1,200',
    phonePlaceholder: '0712 345 678',
    localDigitsLength: [9],
  },
  ng: {
    code: 'ng',
    name: 'Nigeria',
    flag: '🇳🇬',
    settingsPrefix: 'ng_',
    dialCode: '+234',
    currencySymbol: '₦',
    currencyCode: 'NGN',
    paymentMethodsLabel: 'Bank Transfer · Paystack · USSD · Card',
    cityTagline: 'Loved across Lagos, Abuja, Port Harcourt & Ibadan',
    heroBadge: 'Nigeria Edition · Fast Transfer & Card Checkout',
    heroHeadline: 'More than a text. A private website built just for her.',
    heroSubheadline:
      'Combine your best photos, a sealed love letter, your soundtrack, and a blooming flower reveal into one unforgettable link.',
    defaultPricePage: '₦5,000',
    defaultPriceWas: '₦20,000',
    defaultPriceCustom: '₦7,500',
    phonePlaceholder: '0803 123 4567',
    localDigitsLength: [10],
  },
};

export type ActiveCountryCode = 'gh' | 'ke';
export type AppView = 'order' | 'builder' | 'my-site' | 'admin' | 'preview';
export type SalesCampaignId = 'reconcile' | 'birthday';

export interface ResolvedAppRoute {
  view: AppView;
  campaign: SalesCampaignId;
  country: ActiveCountryCode;
}

export interface SalesPageDirectoryEntry {
  id: string;
  campaign: SalesCampaignId;
  country: ActiveCountryCode;
  campaignName: string;
  countryName: string;
  headlinePreview: string;
  audienceSummary: string;
  directoryPath: string;
}

export const ACTIVE_COUNTRIES: readonly ActiveCountryCode[] = ['gh', 'ke'] as const;

export const SALES_PAGE_DIRECTORY: readonly SalesPageDirectoryEntry[] = [
  {
    id: 'reconcile-gh',
    campaign: 'reconcile',
    country: 'gh',
    campaignName: 'Win Her Back',
    countryName: 'Ghana',
    headlinePreview: 'Are you about to lose her?',
    audienceSummary: 'Reconciliation & heartfelt apology love website campaign',
    directoryPath: '/win-her-back/gh/',
  },
  {
    id: 'reconcile-ke',
    campaign: 'reconcile',
    country: 'ke',
    campaignName: 'Win Her Back',
    countryName: 'Kenya',
    headlinePreview: 'Are you about to lose her?',
    audienceSummary: 'Reconciliation & heartfelt apology love website campaign',
    directoryPath: '/win-her-back/ke/',
  },
  {
    id: 'birthday-gh',
    campaign: 'birthday',
    country: 'gh',
    campaignName: 'Birthday Gift',
    countryName: 'Ghana',
    headlinePreview: "Give them a birthday gift they'll never forget.",
    audienceSummary: 'Private birthday keepsake love letter website campaign',
    directoryPath: '/birthday/gh/',
  },
  {
    id: 'birthday-ke',
    campaign: 'birthday',
    country: 'ke',
    campaignName: 'Birthday Gift',
    countryName: 'Kenya',
    headlinePreview: "Give them a birthday gift they'll never forget.",
    audienceSummary: 'Private birthday keepsake love letter website campaign',
    directoryPath: '/birthday/ke/',
  },
] as const;

export const APP_PORTAL_DIRECTORY = [
  {
    id: 'my-site',
    view: 'my-site' as AppView,
    label: 'Customer My Site Portal',
    description: 'Order tracking, PIN access, and self-serve builder launcher.',
    directoryPath: '/my-site/',
  },
  {
    id: 'builder',
    view: 'builder' as AppView,
    label: 'Live Site Builder Studio',
    description: 'Interactive Chasing Her & Memories website editor.',
    directoryPath: '/builder/',
  },
  {
    id: 'admin',
    view: 'admin' as AppView,
    label: 'Backstage Admin Operations',
    description: 'Orders, fulfillment studio, Firebase 5 GB storage, and markets.',
    directoryPath: '/admin/',
  },
  {
    id: 'preview',
    view: 'preview' as AppView,
    label: 'Recipient Live Preview',
    description: 'Full-screen recipient unboxing preview experience.',
    directoryPath: '/preview/',
  },
] as const;

export function normalizeBaseUrl(baseUrl = '/'): string {
  const trimmed = (baseUrl || '/').trim();
  if (!trimmed || trimmed === './' || trimmed === '.') return '/';
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export function resolvePublicAssetUrl(relativePath: string, baseUrl = '/'): string {
  const cleanRel = (relativePath || '').replace(/^\/+/, '');
  if (!cleanRel) return '/';
  if (/^(https?:|data:|blob:)/i.test(relativePath)) return relativePath;
  const base = normalizeBaseUrl(baseUrl);
  return `${base}${cleanRel}`;
}

export interface LockedFlowerAsset {
  id: string;
  name: string;
  relativePath: string;
}

export const LOCKED_FLOWER_WALL_ASSETS: readonly LockedFlowerAsset[] = [
  {
    id: 'golden-buttercup',
    name: 'Golden Buttercup',
    relativePath: 'assets/aistudio/ChatGPT_Image_Aug_29__2026__09_17_27_PM_a36feab0.png',
  },
  {
    id: 'rose-pink-hibiscus',
    name: 'Rose Pink Hibiscus',
    relativePath: 'assets/aistudio/ChatGPT_Image_Aug_29__2026__09_17_41_PM_f5c85e28.png',
  },
  {
    id: 'champagne-ivory-peony',
    name: 'Champagne Ivory Peony',
    relativePath: 'assets/aistudio/ChatGPT_Image_Aug_29__2026__09_25_26_PM_13bdae67.png',
  },
  {
    id: 'sage-botanical',
    name: 'Sage Botanical Blossom',
    relativePath: 'assets/aistudio/ChatGPT_Image_Aug_29__2026__09_17_34_PM_cbefb3c8.png',
  },
  {
    id: 'royal-cobalt-hibiscus',
    name: 'Royal Cobalt Hibiscus',
    relativePath: 'assets/aistudio/ChatGPT_Image_Aug_29__2026__09_23_28_PM_d361cd42.png',
  },
] as const;

export function getLockedFlowerWallUrls(baseUrl = '/'): string[] {
  return LOCKED_FLOWER_WALL_ASSETS.map((item) =>
    resolvePublicAssetUrl(item.relativePath, baseUrl)
  );
}

export function stripBasePath(pathname: string, baseUrl = '/'): string {
  const cleanPath = pathname || '/';
  const base = normalizeBaseUrl(baseUrl);
  if (base === '/') return cleanPath;
  const baseNoTrailing = base.slice(0, -1);
  if (cleanPath === baseNoTrailing) return '/';
  if (cleanPath.startsWith(base)) {
    return `/${cleanPath.slice(base.length)}`;
  }
  return cleanPath;
}

export function normalizeActiveCountry(raw?: string | null): ActiveCountryCode {
  const value = (raw || '').trim().toLowerCase();
  if (value === 'ke' || value === 'kenya') return 'ke';
  return 'gh';
}

export function resolveCountryFromLocation(
  search: string,
  pathname: string,
  baseUrl = '/'
): ActiveCountryCode {
  const stripped = stripBasePath(pathname, baseUrl).toLowerCase();
  const segments = stripped.split('/').filter(Boolean);
  if (segments.includes('ke') || segments.includes('kenya')) {
    return 'ke';
  }
  if (segments.includes('gh') || segments.includes('ghana')) {
    return 'gh';
  }
  const params = new URLSearchParams(search);
  const queryCountry = params.get('country');
  if (queryCountry) {
    return normalizeActiveCountry(queryCountry);
  }
  return 'gh';
}

export function resolveSalesCampaignFromLocation(
  search: string,
  pathname: string,
  baseUrl = '/'
): SalesCampaignId {
  const stripped = stripBasePath(pathname, baseUrl).toLowerCase();
  const segments = stripped.split('/').filter(Boolean);
  if (segments.some((seg) => seg === 'birthday' || seg === 'gift')) {
    return 'birthday';
  }
  if (segments.some((seg) => seg === 'win-her-back' || seg === 'reconcile')) {
    return 'reconcile';
  }
  const params = new URLSearchParams(search);
  const queryCampaign = (params.get('campaign') || params.get('page') || '').trim().toLowerCase();
  if (queryCampaign === 'birthday' || queryCampaign === 'gift' || queryCampaign === '1') {
    return 'birthday';
  }
  if (queryCampaign === 'reconcile' || queryCampaign === 'win-her-back' || queryCampaign === '2') {
    return 'reconcile';
  }
  return 'reconcile';
}

export function resolveAppRouteFromLocation(
  pathname: string,
  search: string,
  baseUrl = '/'
): ResolvedAppRoute {
  const stripped = stripBasePath(pathname, baseUrl).toLowerCase();
  const segments = stripped.split('/').filter(Boolean);
  const firstSegment = segments[0] || '';
  const country = resolveCountryFromLocation(search, pathname, baseUrl);
  const campaign = resolveSalesCampaignFromLocation(search, pathname, baseUrl);

  if (firstSegment === 'admin' || firstSegment === 'backstage') {
    return { view: 'admin', campaign, country };
  }
  if (firstSegment === 'my-site' || firstSegment === 'mysite') {
    return { view: 'my-site', campaign, country };
  }
  if (firstSegment === 'builder' || firstSegment === 'studio') {
    return { view: 'builder', campaign, country };
  }
  if (firstSegment === 'preview') {
    return { view: 'preview', campaign, country };
  }
  if (
    firstSegment === 'birthday' ||
    firstSegment === 'gift' ||
    firstSegment === 'win-her-back' ||
    firstSegment === 'reconcile' ||
    firstSegment === 'gh' ||
    firstSegment === 'ke'
  ) {
    return { view: 'order', campaign, country };
  }

  // Backward compatibility for legacy ?view= links
  const params = new URLSearchParams(search);
  const legacyView = (params.get('view') || '').trim().toLowerCase();
  if (
    legacyView === 'admin' ||
    legacyView === 'my-site' ||
    legacyView === 'builder' ||
    legacyView === 'preview'
  ) {
    return { view: legacyView, campaign, country };
  }

  return { view: 'order', campaign, country };
}

export function buildAppRoutePath(
  route: {
    view: AppView;
    campaign?: SalesCampaignId;
    country?: ActiveCountryCode;
  },
  baseUrl = '/'
): string {
  const prefix = normalizeBaseUrl(baseUrl);
  const join = (relative: string) => `${prefix}${relative.replace(/^\/+/, '')}`;

  if (route.view === 'admin') return join('admin/');
  if (route.view === 'my-site') return join('my-site/');
  if (route.view === 'builder') return join('builder/');
  if (route.view === 'preview') return join('preview/');

  const campaignSlug = route.campaign === 'birthday' ? 'birthday' : 'win-her-back';
  const countrySlug = route.country === 'ke' ? 'ke' : 'gh';
  return join(`${campaignSlug}/${countrySlug}/`);
}


const EMAIL_TYPO_MAP: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'iclod.com': 'icloud.com',
};

export interface EmailValidationResult {
  valid: boolean;
  normalized: string;
  suggestion?: string;
  error?: string;
}

export function validateCustomerEmail(raw: string): EmailValidationResult {
  const trimmed = (raw || '').trim().toLowerCase();
  if (!trimmed) {
    return { valid: false, normalized: '', error: 'Please enter your email address so you can track your site.' };
  }
  const basicRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!basicRegex.test(trimmed)) {
    return { valid: false, normalized: trimmed, error: 'Please enter a valid email address (e.g. name@gmail.com).' };
  }
  const [localPart, domain] = trimmed.split('@');
  if (domain && EMAIL_TYPO_MAP[domain]) {
    const fixed = `${localPart}@${EMAIL_TYPO_MAP[domain]}`;
    return {
      valid: true,
      normalized: trimmed,
      suggestion: fixed,
    };
  }
  return { valid: true, normalized: trimmed };
}

export interface PhoneValidationResult {
  valid: boolean;
  e164: string;
  error?: string;
}

export function validateWhatsAppPhone(raw: string, country: CountryCode): PhoneValidationResult {
  const cfg = COUNTRIES[country] || COUNTRIES.gh;
  const cleaned = (raw || '').replace(/[\s\-().]/g, '');
  if (!cleaned) {
    return { valid: false, e164: '', error: 'Please enter your WhatsApp number so we can send your live link.' };
  }

  const dialDigits = cfg.dialCode.replace('+', '');
  let national = cleaned;
  if (national.startsWith('+')) {
    const withoutPlus = national.slice(1);
    if (withoutPlus.startsWith(dialDigits)) {
      national = withoutPlus.slice(dialDigits.length);
    } else if (/^\d{10,15}$/.test(withoutPlus)) {
      return { valid: true, e164: `+${withoutPlus}` };
    }
  } else if (national.startsWith(dialDigits) && national.length > 10) {
    national = national.slice(dialDigits.length);
  }

  if (national.startsWith('0')) {
    national = national.slice(1);
  }

  if (!/^\d+$/.test(national)) {
    return { valid: false, e164: '', error: 'Phone number should contain digits only.' };
  }

  if (!cfg.localDigitsLength.includes(national.length)) {
    const expected = cfg.localDigitsLength.join(' or ');
    return {
      valid: false,
      e164: '',
      error: `For ${cfg.name} (${cfg.dialCode}), enter ${expected} digits after the leading 0 (e.g. ${cfg.phonePlaceholder}).`,
    };
  }

  return {
    valid: true,
    e164: `${cfg.dialCode}${national}`,
  };
}

export interface CountryFunnelSettings {
  pricePage: string;
  priceWas: string;
  priceCustom: string;
  routeChasingHer: RouteTarget;
  routeMemories: RouteTarget;
  routeCustom: RouteTarget;
  paymentUrlChasingHer: string;
  paymentUrlMemories: string;
  paymentUrlCustom: string;
}

export function resolveCountrySettings(
  country: CountryCode,
  settingsMap: Record<string, string>
): CountryFunnelSettings {
  const cfg = COUNTRIES[country] || COUNTRIES.gh;
  const pre = cfg.settingsPrefix;
  const pick = (key: string, fallback: string) => {
    if (pre && settingsMap[`${pre}${key}`]) return settingsMap[`${pre}${key}`];
    if (settingsMap[key]) return settingsMap[key];
    return fallback;
  };
  const pickPay = (product: ProductType, fallback: string) => {
    if (pre && settingsMap[`payment_url_${pre}${product}`]) {
      return settingsMap[`payment_url_${pre}${product}`];
    }
    if (settingsMap[`payment_url_${product}`]) {
      return settingsMap[`payment_url_${product}`];
    }
    return fallback;
  };

  return {
    pricePage: pick('price_page', cfg.defaultPricePage),
    priceWas: pick('price_was', cfg.defaultPriceWas),
    priceCustom: pick('price_custom', cfg.defaultPriceCustom),
    routeChasingHer: (pick('route_chasing-her', 'builder') as RouteTarget) || 'builder',
    routeMemories: (pick('route_memories', 'builder') as RouteTarget) || 'builder',
    routeCustom: (pick('route_custom', 'brief') as RouteTarget) || 'brief',
    paymentUrlChasingHer: pickPay('chasing-her', '/?view=thank-you'),
    paymentUrlMemories: pickPay('memories', '/?view=thank-you'),
    paymentUrlCustom: pickPay('custom', '/?view=thankyou-custom'),
  };
}

export interface FirebaseStorageConfig {
  projectId: string;
  databaseId: string;
  storageBucket: string;
  publicBaseUrl?: string;
  enabled: boolean;
}

export function resolveFirebaseStorageEndpoint(
  config: Pick<FirebaseStorageConfig, 'storageBucket'>
): string {
  const bucket = (config.storageBucket || 'gen-lang-client-0322444571.firebasestorage.app').trim();
  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}`;
}

export function buildFirebaseStorageUrl(
  config: Pick<FirebaseStorageConfig, 'storageBucket' | 'publicBaseUrl'>,
  objectKey: string
): string {
  const cleanKey = objectKey.replace(/^\/+/, '');
  const encodedKey = cleanKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  if (config.publicBaseUrl && config.publicBaseUrl.trim()) {
    return `${config.publicBaseUrl.trim().replace(/\/+$/, '')}/${encodedKey}`;
  }
  return `${resolveFirebaseStorageEndpoint(config)}/o/${encodeURIComponent(cleanKey)}?alt=media`;
}

export function validateFirebaseStorageConfig(config: Partial<FirebaseStorageConfig>): {
  valid: boolean;
  mode: 'firebase_live' | 'custom_cdn' | 'unconfigured';
  message: string;
} {
  const projectId = (config.projectId || '').trim();
  const databaseId = (config.databaseId || '').trim();
  const storageBucket = (config.storageBucket || '').trim();

  if (projectId && storageBucket) {
    if (config.publicBaseUrl && config.publicBaseUrl.trim()) {
      return {
        valid: true,
        mode: 'custom_cdn',
        message: `Connected to Firebase Project "${projectId}" (${storageBucket}) with custom CDN delivery.`,
      };
    }
    return {
      valid: true,
      mode: 'firebase_live',
      message: `Connected to Firebase Firestore (${databaseId || 'default'}) & 5 GB Cloud Storage (${storageBucket}).`,
    };
  }

  return {
    valid: false,
    mode: 'unconfigured',
    message: 'Configure Firebase Project ID and Storage Bucket to enable Firebase 5 GB Cloud Storage.',
  };
}

export function insideHeartCurve(x: number, y: number): boolean {
  const v = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;
  return v <= 0;
}

export interface MosaicSlot {
  id: number;
  row: number;
  col: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  rotate: number;
  order: number;
}

function seededJitter(id: number): number {
  const s = Math.sin(id * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

function slotShape(id: number): { wMul: number; hMul: number } {
  const r = seededJitter(id * 7 + 3);
  if (r < 0.58) return { wMul: 1, hMul: 1 };
  if (r < 0.8) return { wMul: 1.42, hMul: 1 };
  return { wMul: 1, hMul: 1.42 };
}

const TILE_EDGE = 1.02;
const TILE_CENTER = 1.72;
const TILE_DEPTH_REF = 0.46;

function heartDepth(x: number, y: number): number {
  const maxd = 0.62;
  const steps = 22;
  const dirs = 16;
  let best = maxd;
  for (let k = 0; k < dirs; k++) {
    const a = (2 * Math.PI * k) / dirs;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let d = maxd;
    for (let s = 1; s <= steps; s++) {
      const t = (maxd * s) / steps;
      if (!insideHeartCurve(x + dx * t, y + dy * t)) {
        d = t;
        break;
      }
    }
    if (d < best) best = d;
  }
  return best;
}

export function buildHeartMosaicLayout(cols = 9, rows = 7): MosaicSlot[] {
  const xscale = 2.9;
  const xshift = 1.45;
  const yscale = 2.497;
  const yshift = 1.328;
  const rawSlots: Array<MosaicSlot & { dist: number }> = [];
  let id = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = ((c + 0.5) / cols) * xscale - xshift;
      const ny = yshift - ((r + 0.5) / rows) * yscale;
      if (!insideHeartCurve(nx, ny)) continue;
      const j1 = seededJitter(id * 2 + 1);
      const j2 = seededJitter(id * 2 + 2);
      const shape = slotShape(id);
      const dep = Math.min(1, heartDepth(nx, ny) / TILE_DEPTH_REF);
      const spread = TILE_EDGE + (TILE_CENTER - TILE_EDGE) * Math.pow(dep, 0.85);
      const base = (1 / cols) * (spread + j1 * 0.14);
      const xPct = (nx + xshift) / xscale;
      const yPct = (yshift - ny) / yscale;
      const dist = Math.sqrt(Math.pow(xPct - 0.5, 2) + Math.pow((yPct - 0.46) * 1.1, 2));

      rawSlots.push({
        id,
        row: r,
        col: c,
        xPct,
        yPct,
        widthPct: base * shape.wMul,
        heightPct: base * shape.hMul,
        rotate: (j2 - 0.5) * 15,
        order: 0,
        dist,
      });
      id++;
    }
  }

  const sorted = [...rawSlots].sort((a, b) => a.dist - b.dist);
  sorted.forEach((s, idx) => {
    s.order = idx;
  });

  return rawSlots.map(({ dist: _dist, ...slot }) => slot);
}

export const SLIDESHOW_EFFECTS = [
  { id: 'fade', label: 'Soft Fade' },
  { id: 'slide-left', label: 'Slide Left' },
  { id: 'slide-up', label: 'Rise Up' },
  { id: 'zoom-in', label: 'Zoom In' },
  { id: 'zoom-out', label: 'Zoom Out' },
  { id: 'blur-focus', label: 'Dreamy Blur Focus' },
  { id: 'polaroid', label: 'Polaroid Drop' },
  { id: 'circular', label: 'Circular Iris' },
  { id: 'heartbeat', label: 'Heartbeat Pulse' },
] as const;

export type SlideshowEffectId = (typeof SLIDESHOW_EFFECTS)[number]['id'];

export interface MusicLibraryTrack {
  id: string;
  title: string;
  artist?: string;
  file_url: string;
  display_order: number;
  is_active: boolean;
}

export interface ShowcaseMediaItem {
  media_url: string;
  media_type: 'image' | 'video';
}

export type ShowcaseMediaMap = Record<'chasing-her' | 'memories', ShowcaseMediaItem>;

export type SiteExperienceKey = 'chasing-her' | 'memories';

export interface SiteExperienceConfig {
  key: SiteExperienceKey;
  editionLabel: string;
  title: string;
  featureStrip: string;
  description: string;
  exampleFeatures: string[];
  demoSceneTitle: string;
  demoSceneSubtitle: string;
  demoSceneQuote: string;
  ctaLabel: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
}

export type SiteExperienceShowcaseMap = Record<SiteExperienceKey, SiteExperienceConfig>;

export const SITE_EXPERIENCES_SETTING_KEY = 'site_experiences_json';

export const DEFAULT_SITE_EXPERIENCES: SiteExperienceShowcaseMap = {
  'chasing-her': {
    key: 'chasing-her',
    editionLabel: 'Edition 01',
    title: 'Chasing Her · Scrollable Story',
    featureStrip: 'Polaroid Conveyor + 3D Wax Letter + Spotify Songs',
    description:
      'Designed for heartfelt storytelling: opens with your secret PIN and signature 5-blossom flower curtain, glides across a two-row Polaroid wall, and ends at a 3D wax-sealed love letter.',
    exampleFeatures: [
      'Secret 6-digit PIN vault + signature 5-blossom flower curtain',
      'Two drifting rows of Polaroid memories with handwritten captions',
      'Interactive 3D crimson wax-sealed typewriter love letter',
      'Custom soundtrack chorus or Spotify song playlist',
    ],
    demoSceneTitle: 'Two drifting rows of Polaroid memories lead to a crimson wax-sealed letter',
    demoSceneSubtitle:
      'Your photos drift past like vintage Polaroids with handwritten captions underneath, followed by an interactive 3D envelope they tap to reveal your typewriter love letter.',
    demoSceneQuote: '“She tapped the crimson wax seal and started crying before line three.”',
    ctaLabel: 'Choose Chasing Her',
    mediaUrl: '',
    mediaType: 'image',
  },
  memories: {
    key: 'memories',
    editionLabel: 'Edition 02',
    title: 'Memories · 34-Heart & Voice Duet',
    featureStrip: '34-Photo Heart + 9-Effect Slideshow + Voice Note Duet',
    description:
      'Built for couples with lots of photos and videos: assembles 34 moments into a beating heart mosaic, bursts into a full-screen slideshow, and plays your voice note over your song.',
    exampleFeatures: [
      '34 photos assemble tile-by-tile into a beating heart mosaic',
      'Full-screen cinematic slideshow with 9 romantic transitions',
      'Record your own voice note that plays gently over your song',
      'Private PIN vault + signature 5-blossom flower curtain reveal',
    ],
    demoSceneTitle: '34 of your photos fly into a beating heart mosaic with your voice reading to them',
    demoSceneSubtitle:
      'Watch 34 photos assemble tile-by-tile from the center outward into a beating heart, then burst into a 9-transition slideshow while your background music softens under your voice note.',
    demoSceneQuote: '“Hearing my voice reading the letter over our 34 photos broke her in the best way.”',
    ctaLabel: 'Choose Memories',
    mediaUrl: '',
    mediaType: 'image',
  },
};

export function mergeSiteExperiences(
  rawInput?: string | Partial<Record<SiteExperienceKey, Partial<SiteExperienceConfig>>> | null,
  fallback: SiteExperienceShowcaseMap = DEFAULT_SITE_EXPERIENCES
): SiteExperienceShowcaseMap {
  let parsed: Partial<Record<SiteExperienceKey, Partial<SiteExperienceConfig>>> | null = null;
  if (typeof rawInput === 'string' && rawInput.trim()) {
    try {
      const json = JSON.parse(rawInput);
      if (json && typeof json === 'object') {
        parsed = json as Partial<Record<SiteExperienceKey, Partial<SiteExperienceConfig>>>;
      }
    } catch {
      parsed = null;
    }
  } else if (rawInput && typeof rawInput === 'object') {
    parsed = rawInput;
  }

  const mergeOne = (key: SiteExperienceKey): SiteExperienceConfig => {
    const base = fallback[key];
    const incoming = parsed?.[key];
    if (!incoming || typeof incoming !== 'object') {
      return { ...base, exampleFeatures: [...base.exampleFeatures] };
    }
    const cleanedFeatures = Array.isArray(incoming.exampleFeatures)
      ? incoming.exampleFeatures
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
      : base.exampleFeatures;

    return {
      key,
      editionLabel:
        typeof incoming.editionLabel === 'string' && incoming.editionLabel.trim()
          ? incoming.editionLabel.trim()
          : base.editionLabel,
      title:
        typeof incoming.title === 'string' && incoming.title.trim()
          ? incoming.title.trim()
          : base.title,
      featureStrip:
        typeof incoming.featureStrip === 'string' && incoming.featureStrip.trim()
          ? incoming.featureStrip.trim()
          : base.featureStrip,
      description:
        typeof incoming.description === 'string' && incoming.description.trim()
          ? incoming.description.trim()
          : base.description,
      exampleFeatures: cleanedFeatures.length > 0 ? cleanedFeatures : [...base.exampleFeatures],
      demoSceneTitle:
        typeof incoming.demoSceneTitle === 'string' && incoming.demoSceneTitle.trim()
          ? incoming.demoSceneTitle.trim()
          : base.demoSceneTitle,
      demoSceneSubtitle:
        typeof incoming.demoSceneSubtitle === 'string' && incoming.demoSceneSubtitle.trim()
          ? incoming.demoSceneSubtitle.trim()
          : base.demoSceneSubtitle,
      demoSceneQuote:
        typeof incoming.demoSceneQuote === 'string' && incoming.demoSceneQuote.trim()
          ? incoming.demoSceneQuote.trim()
          : base.demoSceneQuote,
      ctaLabel:
        typeof incoming.ctaLabel === 'string' && incoming.ctaLabel.trim()
          ? incoming.ctaLabel.trim()
          : base.ctaLabel,
      mediaUrl: typeof incoming.mediaUrl === 'string' ? incoming.mediaUrl.trim() : base.mediaUrl,
      mediaType: incoming.mediaType === 'video' ? 'video' : 'image',
    };
  };

  return {
    'chasing-her': mergeOne('chasing-her'),
    memories: mergeOne('memories'),
  };
}

export function serializeSiteExperiences(map: SiteExperienceShowcaseMap): string {
  return JSON.stringify(map);
}

export interface ProjectMediaMeta {
  url: string;
  name: string;
  sizeBytes: number;
  originalSizeBytes?: number;
  savedBytes?: number;
  width?: number;
  height?: number;
  outputFormat?: string;
  category: 'music' | 'voice' | 'photo' | 'video' | 'flower';
  status: 'staged' | 'saved';
}

export interface ActiveBuildMediaItem extends ProjectMediaMeta {
  slotKey: string;
  label: string;
  targetType: 'music' | 'voice' | 'ch-photo' | 'mem-mosaic' | 'mem-slide' | 'flower';
  index?: number;
}

export const MAX_BUILD_STORAGE_BYTES = 50 * 1024 * 1024; // 50 MB per paid build

export interface ChasingHerProjectData {
  slug: string;
  pin: string;
  intro_message: string;
  letter_title: string;
  letter_body: string;
  final_message: string;
  photos: Array<{ url: string; caption?: string }>;
  flower_images: string[];
  songs: Array<{ title: string; artist: string; spotify_url?: string; duration?: string; explicit?: boolean }>;
  music_url?: string;
  music_start?: number;
  music_end?: number | null;
  media_meta?: Record<string, ProjectMediaMeta>;
}

export interface MemoriesProjectData {
  slug: string;
  pin: string;
  hero_title: string;
  hero_subtitle: string;
  collage_names: string;
  collage_day: string;
  collage_month: string;
  collage_year: string;
  collage_quote: string;
  mosaic_images: string[];
  letter_title: string;
  letter_body: string;
  final_message: string;
  memories: Array<{
    url: string;
    type?: 'image' | 'video';
    caption?: string;
    date?: string;
    place?: string;
    transition?: string;
    duration?: number;
    muted?: boolean;
  }>;
  flower_images: string[];
  music_url?: string;
  music_start?: number;
  music_end?: number | null;
  voice_url?: string;
  media_meta?: Record<string, ProjectMediaMeta>;
}

export interface BuildStorageUsageSummary {
  usedBytes: number;
  maxBytes: number;
  remainingBytes: number;
  usedMB: number;
  maxMB: number;
  remainingMB: number;
  percentUsed: number;
  isFull: boolean;
  totalOriginalBytes: number;
  totalCompressionSavedBytes: number;
  breakdown: {
    audioBytes: number;
    photoVideoBytes: number;
    stagedBytes: number;
    savedBytes: number;
  };
  activeFiles: ActiveBuildMediaItem[];
}

export function formatStorageMegabytes(bytes: number): string {
  const mb = Math.max(0, bytes) / (1024 * 1024);
  if (mb === 0) return '0.0 MB';
  if (mb < 0.1) return '< 0.1 MB';
  return `${mb.toFixed(1)} MB`;
}

export function formatStorageCompact(bytes: number): string {
  const safe = Math.max(0, bytes);
  if (safe === 0) return '0 KB';
  if (safe < 1024 * 1024) {
    return `${Math.max(1, Math.round(safe / 1024))} KB`;
  }
  return `${(safe / (1024 * 1024)).toFixed(2)} MB`;
}

function estimateDefaultMediaBytes(
  url: string,
  category: 'music' | 'voice' | 'photo' | 'video' | 'flower'
): number {
  if (!url) return 0;
  // Built-in SVG vector flower presets don't take user upload quota
  if (category === 'flower' && url.startsWith('data:image/svg+xml')) {
    return 0;
  }
  if (category === 'music') return Math.round(4.2 * 1024 * 1024); // 4.2 MB typical song
  if (category === 'voice') return Math.round(1.8 * 1024 * 1024); // 1.8 MB typical voice note
  if (category === 'video') return Math.round(6.5 * 1024 * 1024); // 6.5 MB short video clip
  if (category === 'flower') return Math.round(0.35 * 1024 * 1024); // 350 KB custom flower PNG
  return Math.round(0.32 * 1024 * 1024); // 320 KB optimized WebP photo
}

export function computeProjectStorageUsage(
  project: ChasingHerProjectData | MemoriesProjectData | undefined,
  product: 'chasing-her' | 'memories',
  maxBytes: number = MAX_BUILD_STORAGE_BYTES
): BuildStorageUsageSummary {
  if (!project) {
    return {
      usedBytes: 0,
      maxBytes,
      remainingBytes: maxBytes,
      usedMB: 0,
      maxMB: Number((maxBytes / (1024 * 1024)).toFixed(1)),
      remainingMB: Number((maxBytes / (1024 * 1024)).toFixed(1)),
      percentUsed: 0,
      isFull: false,
      totalOriginalBytes: 0,
      totalCompressionSavedBytes: 0,
      breakdown: {
        audioBytes: 0,
        photoVideoBytes: 0,
        stagedBytes: 0,
        savedBytes: 0,
      },
      activeFiles: [],
    };
  }

  const metaMap = project.media_meta || {};
  const activeFiles: ActiveBuildMediaItem[] = [];

  const registerItem = (
    url: string | undefined,
    category: 'music' | 'voice' | 'photo' | 'video' | 'flower',
    targetType: ActiveBuildMediaItem['targetType'],
    slotKey: string,
    defaultLabel: string,
    index?: number
  ) => {
    const cleanUrl = (url || '').trim();
    if (!cleanUrl) return;
    if (category === 'flower' && cleanUrl.startsWith('data:image/svg+xml')) return;

    const existing = metaMap[cleanUrl];
    const sizeBytes =
      existing && typeof existing.sizeBytes === 'number' && existing.sizeBytes >= 0
        ? existing.sizeBytes
        : estimateDefaultMediaBytes(cleanUrl, category);
    if (sizeBytes <= 0) return;

    const status: 'staged' | 'saved' = existing?.status || 'saved';
    const name = existing?.name || defaultLabel;
    const originalSizeBytes =
      existing?.originalSizeBytes && existing.originalSizeBytes >= sizeBytes
        ? existing.originalSizeBytes
        : sizeBytes;
    const savedBytes = Math.max(0, originalSizeBytes - sizeBytes);

    activeFiles.push({
      url: cleanUrl,
      name,
      sizeBytes,
      originalSizeBytes,
      savedBytes,
      width: existing?.width,
      height: existing?.height,
      outputFormat: existing?.outputFormat,
      category,
      status,
      slotKey,
      label: defaultLabel,
      targetType,
      index,
    });
  };

  // 1. Background music track (only the active selected music_url counts toward quota)
  if (project.music_url) {
    registerItem(
      project.music_url,
      'music',
      'music',
      'music-track',
      'Background Soundtrack Audio'
    );
  }

  // 2. Product-specific media
  if (product === 'chasing-her') {
    const ch = project as ChasingHerProjectData;
    (ch.photos || []).forEach((photo, idx) => {
      if (photo?.url) {
        registerItem(
          photo.url,
          'photo',
          'ch-photo',
          `ch-photo-${idx}`,
          photo.caption ? `Polaroid: ${photo.caption}` : `Polaroid Photo #${idx + 1}`,
          idx
        );
      }
    });
  } else {
    const mem = project as MemoriesProjectData;
    if (mem.voice_url) {
      registerItem(
        mem.voice_url,
        'voice',
        'voice',
        'voice-note',
        'Recorded Voice Note Duet'
      );
    }
    (mem.mosaic_images || []).forEach((url, idx) => {
      if (url) {
        registerItem(
          url,
          'photo',
          'mem-mosaic',
          `mem-mosaic-${idx}`,
          `Heart Mosaic Photo #${idx + 1}`,
          idx
        );
      }
    });
    (mem.memories || []).forEach((slide, idx) => {
      if (slide?.url) {
        const isVideo = slide.type === 'video';
        registerItem(
          slide.url,
          isVideo ? 'video' : 'photo',
          'mem-slide',
          `mem-slide-${idx}`,
          slide.caption
            ? `${isVideo ? 'Video' : 'Slide'}: ${slide.caption}`
            : `${isVideo ? 'Video Clip' : 'Slideshow Photo'} #${idx + 1}`,
          idx
        );
      }
    });
  }

  // 3. Signature opening flower wall is locked to the 5 built-in botanical assets
  // and therefore never consumes customer 50 MB build storage or exposes a Remove action.

  let usedBytes = 0;
  let audioBytes = 0;
  let photoVideoBytes = 0;
  let stagedBytes = 0;
  let savedBytes = 0;
  let totalOriginalBytes = 0;
  let totalCompressionSavedBytes = 0;

  for (const item of activeFiles) {
    usedBytes += item.sizeBytes;
    totalOriginalBytes += item.originalSizeBytes || item.sizeBytes;
    totalCompressionSavedBytes += item.savedBytes || 0;
    if (item.category === 'music' || item.category === 'voice') {
      audioBytes += item.sizeBytes;
    } else {
      photoVideoBytes += item.sizeBytes;
    }
    if (item.status === 'staged') {
      stagedBytes += item.sizeBytes;
    } else {
      savedBytes += item.sizeBytes;
    }
  }

  const remainingBytes = Math.max(0, maxBytes - usedBytes);
  const percentUsed = Math.min(100, Math.round((usedBytes / maxBytes) * 1000) / 10);
  // Consider build full if remaining space is 0 or usedBytes >= maxBytes
  const isFull = usedBytes >= maxBytes;

  return {
    usedBytes,
    maxBytes,
    remainingBytes,
    usedMB: Number((usedBytes / (1024 * 1024)).toFixed(2)),
    maxMB: Number((maxBytes / (1024 * 1024)).toFixed(1)),
    remainingMB: Number((remainingBytes / (1024 * 1024)).toFixed(2)),
    percentUsed,
    isFull,
    totalOriginalBytes,
    totalCompressionSavedBytes,
    breakdown: {
      audioBytes,
      photoVideoBytes,
      stagedBytes,
      savedBytes,
    },
    activeFiles,
  };
}

export function canAddFileToBuild(
  currentUsedBytes: number,
  incomingFileSizeBytes: number,
  replacedFileSizeBytes: number = 0,
  maxBytes: number = MAX_BUILD_STORAGE_BYTES
): {
  allowed: boolean;
  nextUsedBytes: number;
  remainingBytesAfter: number;
  error?: string;
} {
  const baseBytes = Math.max(0, currentUsedBytes - Math.max(0, replacedFileSizeBytes));
  const nextUsedBytes = baseBytes + Math.max(0, incomingFileSizeBytes);

  if (nextUsedBytes > maxBytes) {
    const availableBytes = Math.max(0, maxBytes - baseBytes);
    return {
      allowed: false,
      nextUsedBytes: currentUsedBytes,
      remainingBytesAfter: availableBytes,
      error: `This file (${formatStorageMegabytes(incomingFileSizeBytes)}) exceeds your 50.0 MB paid build limit (${formatStorageMegabytes(availableBytes)} remaining). Remove unwanted audio, photos, or videos below to free up space.`,
    };
  }

  return {
    allowed: true,
    nextUsedBytes,
    remainingBytesAfter: Math.max(0, maxBytes - nextUsedBytes),
  };
}

/**
 * Commits only the currently active/chosen media files in the project to permanent 'saved' status
 * and purges any unselected or replaced staged audio/media files so they do not consume storage.
 */
export function commitProjectSavedMedia<T extends ChasingHerProjectData | MemoriesProjectData>(
  project: T,
  product: 'chasing-her' | 'memories'
): {
  committedProject: T;
  committedCount: number;
  purgedStagedUrls: string[];
} {
  const usage = computeProjectStorageUsage(project, product);
  const activeUrlSet = new Set(usage.activeFiles.map((f) => f.url));
  const prevMeta = project.media_meta || {};

  const purgedStagedUrls: string[] = [];
  for (const [url, meta] of Object.entries(prevMeta)) {
    if (!activeUrlSet.has(url)) {
      purgedStagedUrls.push(url);
    } else if (meta.status === 'staged') {
      // will be promoted to saved
    }
  }

  const nextMeta: Record<string, ProjectMediaMeta> = {};
  let committedCount = 0;

  for (const file of usage.activeFiles) {
    if (file.status === 'staged') {
      committedCount++;
    }
    nextMeta[file.url] = {
      url: file.url,
      name: file.name,
      sizeBytes: file.sizeBytes,
      originalSizeBytes: file.originalSizeBytes,
      savedBytes: file.savedBytes,
      width: file.width,
      height: file.height,
      outputFormat: file.outputFormat,
      category: file.category,
      status: 'saved',
    };
  }

  return {
    committedProject: {
      ...project,
      media_meta: nextMeta,
    },
    committedCount,
    purgedStagedUrls,
  };
}

export function computeChasingHerProgress(project: ChasingHerProjectData): {
  completed: number;
  total: number;
  percent: number;
  items: Array<{ label: string; done: boolean }>;
} {
  const items = [
    { label: 'Secret PIN (4–6 digits)', done: /^\d{4,6}$/.test(project.pin || '') },
    { label: 'Hero opening line', done: (project.intro_message || '').trim().length >= 4 },
    { label: 'Polaroid wall photos (3+)', done: (project.photos || []).filter((p) => p && p.url).length >= 3 },
    { label: 'Love letter title & body', done: (project.letter_body || '').trim().length >= 20 },
    { label: 'Soundtrack songs or background audio', done: (project.songs || []).length >= 1 || !!(project.music_url || '').trim() },
  ];
  const completed = items.filter((i) => i.done).length;
  return {
    completed,
    total: items.length,
    percent: Math.round((completed / items.length) * 100),
    items,
  };
}

export function computeMemoriesProgress(project: MemoriesProjectData): {
  completed: number;
  total: number;
  percent: number;
  items: Array<{ label: string; done: boolean }>;
} {
  const items = [
    { label: 'Secret PIN (4–6 digits)', done: /^\d{4,6}$/.test(project.pin || '') },
    { label: 'Couple names & anniversary date', done: (project.collage_names || '').trim().length >= 2 },
    { label: 'Heart mosaic photos (4+)', done: (project.mosaic_images || []).filter(Boolean).length >= 4 },
    { label: 'Slideshow memories (2+)', done: (project.memories || []).filter((m) => m && m.url).length >= 2 },
    { label: 'Sealed letter & audio duet', done: (project.letter_body || '').trim().length >= 20 },
  ];
  const completed = items.filter((i) => i.done).length;
  return {
    completed,
    total: items.length,
    percent: Math.round((completed / items.length) * 100),
    items,
  };
}

