import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Sparkles,
  Lock,
  Music,
  Camera,
  CheckCircle2,
  ArrowRight,
  Play,
  ShieldCheck,
  Globe,
  MessageSquareHeart,
  Wand2,
  Smartphone,
  Star,
  Sliders,
  ChevronDown,
  Copy,
  Check,
  Film,
  Volume2,
  CreditCard,
  X,
  ShoppingBag,
  Gift,
  Calendar,
  Eye,
  Send,
} from 'lucide-react';
import {
  COUNTRIES,
  CountryCode,
  ProductType,
  validateCustomerEmail,
  validateWhatsAppPhone,
  resolveCountrySettings,
  resolveSalesCampaignFromLocation,
  buildAppRoutePath,
  ChasingHerProjectData,
  MemoriesProjectData,
  ShowcaseMediaMap,
  SiteExperienceShowcaseMap,
  DEFAULT_SITE_EXPERIENCES,
} from '../utils/platformLogic';
import {
  SubmissionOrder,
  TestimonialItem,
  INITIAL_SHOWCASE_MEDIA,
} from '../utils/supabaseAndOci';
import { saveOrderToFirestore } from '../utils/firebaseClient';
import { SALES_PAGE_ASSETS } from '../utils/salesPageAssets';
import { RecipientSitePreview } from './RecipientSitePreview';
import {
  ReconcileSalesCampaignContent,
  RECONCILE_OPENING_PRESETS,
} from './ReconcileSalesCampaignContent';
import {
  BirthdaySalesCampaignContent,
  BIRTHDAY_OPENING_PRESETS,
} from './BirthdaySalesCampaignContent';

export type SalesCampaignId = 'reconcile' | 'birthday';

interface OrderLandingViewProps {
  country: CountryCode;
  campaign?: SalesCampaignId;
  onChangeCountry: (country: CountryCode) => void;
  settingsMap: Record<string, string>;
  testimonials: TestimonialItem[];
  showcaseMedia?: ShowcaseMediaMap;
  siteExperiences?: SiteExperienceShowcaseMap;
  chasingHerDemo: ChasingHerProjectData;
  memoriesDemo: MemoriesProjectData;
  onOrderCreated: (newOrder: SubmissionOrder, destination: 'builder' | 'brief' | 'my-site') => void;
  onOpenMySite?: () => void;
  onOpenAdmin?: () => void;
}

interface DialCountryOption {
  iso: string;
  name: string;
  dial: string;
  flag: string;
  linkedCountry?: CountryCode;
}

const DIAL_COUNTRIES: DialCountryOption[] = [
  { iso: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭', linkedCountry: 'gh' },
  { iso: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪', linkedCountry: 'ke' },
  { iso: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { iso: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { iso: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { iso: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬' },
  { iso: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
  { iso: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
  { iso: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮' },
  { iso: 'CM', name: 'Cameroon', dial: '+237', flag: '🇨🇲' },
  { iso: 'SN', name: 'Senegal', dial: '+221', flag: '🇸🇳' },
  { iso: 'ZM', name: 'Zambia', dial: '+260', flag: '🇿🇲' },
  { iso: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼' },
  { iso: 'BW', name: 'Botswana', dial: '+267', flag: '🇧🇼' },
  { iso: 'NA', name: 'Namibia', dial: '+264', flag: '🇳🇦' },
  { iso: 'ET', name: 'Ethiopia', dial: '+251', flag: '🇪🇹' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
];

const FLOWER_THEMES = [
  {
    id: 'blush-peony',
    name: 'Blush Peonies & Velvet Rose',
    colors: ['#E8879F', '#C2185B', '#F7D3DE'],
    tag: 'Romantic & Soft',
  },
  {
    id: 'royal-gold',
    name: 'Crimson Rose & Champagne Gold',
    colors: ['#96123F', '#E8C27A', '#5A1A2C'],
    tag: 'Luxury & Dramatic',
  },
  {
    id: 'sunlit-ivory',
    name: 'Sunlit Ivory & Botanical Bloom',
    colors: ['#FAF1E2', '#E8C27A', '#E8879F'],
    tag: 'Warm & Timeless',
  },
] as const;

export const OrderLandingView: React.FC<OrderLandingViewProps> = ({
  country,
  campaign,
  onChangeCountry,
  settingsMap,
  showcaseMedia = INITIAL_SHOWCASE_MEDIA,
  siteExperiences = DEFAULT_SITE_EXPERIENCES,
  chasingHerDemo,
  memoriesDemo,
  onOrderCreated,
}) => {
  const countryConfig = COUNTRIES[country] || COUNTRIES.gh;
  const funnel = resolveCountrySettings(country, settingsMap);

  // Direct entry campaign resolved from route prop or URL (/birthday/gh, /win-her-back/ke)
  const activeCampaign: SalesCampaignId =
    campaign ||
    resolveSalesCampaignFromLocation(window.location.search, window.location.pathname, import.meta.env.BASE_URL);

  // Shared Checkout & Personalizer State
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('chasing-her');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [partnerName, setPartnerName] = useState('Amara');
  const [customPin, setCustomPin] = useState('140826');
  const [selectedFlowerTheme, setSelectedFlowerTheme] = useState<number>(0);
  const [customOpeningLine, setCustomOpeningLine] = useState<string>(() =>
    activeCampaign === 'birthday'
      ? BIRTHDAY_OPENING_PRESETS[0]
      : RECONCILE_OPENING_PRESETS[0]
  );
  const [occasionNote, setOccasionNote] = useState('');

  useEffect(() => {
    setCustomOpeningLine(
      activeCampaign === 'birthday'
        ? BIRTHDAY_OPENING_PRESETS[0]
        : RECONCILE_OPENING_PRESETS[0]
    );
  }, [activeCampaign]);

  // Checkout Flow State (Supports both Slide-Over Instant Checkout Drawer & Inline Bottom Form)
  const [checkoutDrawerOpen, setCheckoutDrawerOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment' | 'redirecting'>('details');
  const [pendingOrder, setPendingOrder] = useState<SubmissionOrder | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('mobile_money');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailSuggestion, setEmailSuggestion] = useState<string | undefined>(undefined);
  const [formHighlightPulse, setFormHighlightPulse] = useState(false);

  // Country code picker inside the phone input
  const [dialDropdownOpen, setDialDropdownOpen] = useState(false);
  const [dialSearch, setDialSearch] = useState('');
  const [selectedDialOption, setSelectedDialOption] = useState<DialCountryOption>(
    () => DIAL_COUNTRIES.find((d) => d.linkedCountry === country) || DIAL_COUNTRIES[0]
  );

  // Fullscreen Sample Modal
  const [livePreviewModal, setLivePreviewModal] = useState<'chasing-her' | 'memories' | null>(null);
  const [copiedDemoLink, setCopiedDemoLink] = useState(false);

  // Reveal bottom checkout dock only after scrolling past the hero
  const [showStickyDock, setShowStickyDock] = useState(false);

  const orderFormRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const drawerNameInputRef = useRef<HTMLInputElement>(null);
  const demoSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const matched = DIAL_COUNTRIES.find((d) => d.linkedCountry === country);
    if (matched) {
      setSelectedDialOption(matched);
    }
  }, [country]);

  useEffect(() => {
    const onScroll = () => {
      setShowStickyDock(window.scrollY > 420);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Open the Instant Slide-Over Checkout Drawer from anywhere on the page!
  const openInstantCheckout = (pick?: ProductType) => {
    if (pick) {
      setSelectedProduct(pick);
    }
    setFormError(null);
    setCheckoutStep('details');
    setCheckoutDrawerOpen(true);
    setTimeout(() => {
      drawerNameInputRef.current?.focus({ preventScroll: true });
    }, 200);
  };

  // Or smoothly scroll to the bottom inline #order-form
  const lockInAndScrollToForm = (pick?: ProductType) => {
    if (pick) {
      setSelectedProduct(pick);
    }
    setFormError(null);
    setCheckoutStep('details');
    setFormHighlightPulse(true);
    setTimeout(() => setFormHighlightPulse(false), 1500);
    orderFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      nameInputRef.current?.focus({ preventScroll: true });
    }, 650);
  };

  const scrollToDemonstration = () => {
    demoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleEmailChange = (val: string) => {
    setCustomerEmail(val);
    if (val.includes('@') && val.includes('.')) {
      const check = validateCustomerEmail(val);
      setEmailSuggestion(check.suggestion);
    } else {
      setEmailSuggestion(undefined);
    }
  };

  const applyEmailSuggestion = () => {
    if (emailSuggestion) {
      setCustomerEmail(emailSuggestion);
      setEmailSuggestion(undefined);
    }
  };

  const sanitizedPartnerSlug =
    (partnerName || 'my-love')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'my-love';

  const handleCopyDemoLink = () => {
    navigator.clipboard
      ?.writeText(`https://chasingher.love/for-${sanitizedPartnerSlug}`)
      .catch(() => {});
    setCopiedDemoLink(true);
    setTimeout(() => setCopiedDemoLink(false), 2200);
  };

  // Step 1 of Checkout: Validate Customer Details & Proceed to Payment Confirmation
  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerName.trim() || customerName.trim().length < 2) {
      setFormError('Please enter your name so we can personalize your account.');
      return;
    }

    const targetCountry = selectedDialOption.linkedCountry || country;
    const phoneResult = validateWhatsAppPhone(customerPhone, targetCountry);
    let normalizedPhone = phoneResult.e164;

    if (!phoneResult.valid) {
      const digitsOnly = customerPhone.replace(/\D/g, '');
      if (!selectedDialOption.linkedCountry && digitsOnly.length >= 7 && digitsOnly.length <= 12) {
        normalizedPhone = `${selectedDialOption.dial}${digitsOnly.replace(/^0+/, '')}`;
      } else {
        setFormError(phoneResult.error || 'Please enter a valid WhatsApp phone number.');
        return;
      }
    }

    const emailResult = validateCustomerEmail(customerEmail);
    if (!emailResult.valid) {
      setFormError(emailResult.error || 'Please enter a valid email address.');
      return;
    }

    const baseSlug = (partnerName.trim() || customerName.trim())
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `for-${baseSlug || 'my-love'}-${Math.floor(100 + Math.random() * 900)}`;
    const cleanPin = /^\d{4,6}$/.test(customPin.trim()) ? customPin.trim() : '140826';

    const draftOrder: SubmissionOrder = {
      id: `ord-${country}-${Date.now()}`,
      slug,
      product: selectedProduct,
      build_product: selectedProduct === 'memories' ? 'memories' : 'chasing-her',
      full_name: customerName.trim(),
      whatsapp: normalizedPhone,
      email: emailResult.normalized,
      country,
      status: 'pending_payment',
      progress: 'received',
      progress_note:
        selectedProduct === 'custom'
          ? 'Payment confirmed! Our studio has received your custom-build brief and is crafting your page.'
          : 'Payment confirmed! Welcome to your My Site Customer App — tap "Open Builder" below to customize your love letter.',
      pin: cleanPin,
      hosted_url: `${buildAppRoutePath({ view: 'preview' }, import.meta.env.BASE_URL)}?product=${selectedProduct === 'memories' ? 'memories' : 'chasing-her'}&slug=${slug}`,
      brief: {
        design: selectedProduct === 'memories' ? 'memories' : 'chasing-her',
        for: partnerName.trim() || 'My Partner',
        feel: customOpeningLine || 'Birthday Surprise',
        links: 'Signature 5-Blossom Flower Wall',
        notes: occasionNote.trim(),
      },
      created_at: new Date().toISOString(),
    };

    setPendingOrder(draftOrder);
    setCheckoutStep('payment');
  };

  // Step 2 of Checkout: Complete Payment & Automatically Redirect to Standalone My Site App
  const handleCompletePaymentAndRedirect = () => {
    if (!pendingOrder) return;
    setSubmitting(true);

    const paidOrder: SubmissionOrder = {
      ...pendingOrder,
      status: 'paid',
      progress: selectedProduct === 'custom' ? 'building' : 'received',
      returned_from_payment_at: new Date().toISOString(),
    };

    // Non-blocking background sync to Firebase Firestore
    void saveOrderToFirestore(paidOrder).catch(() => {});

    setCheckoutStep('redirecting');

    setTimeout(() => {
      setSubmitting(false);
      setCheckoutDrawerOpen(false);
      // Redirect customer to the standalone My Site Customer App after payment!
      onOrderCreated(paidOrder, 'my-site');
    }, 900);
  };

  const filteredDialCountries = DIAL_COUNTRIES.filter((c) => {
    const q = dialSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.dial.includes(q) ||
      c.iso.toLowerCase().includes(q)
    );
  });

  const activePriceDisplay =
    selectedProduct === 'custom' ? funnel.priceCustom : funnel.pricePage;

  const paymentMethodsForCountry =
    country === 'gh'
      ? [
          { id: 'mobile_money', label: 'MTN MoMo / Telecel Cash / AirtelTigo', badge: 'Instant' },
          { id: 'card', label: 'Visa / Mastercard Debit or Credit', badge: 'Secure' },
        ]
      : country === 'ke'
      ? [
          { id: 'mobile_money', label: 'M-PESA Express / Airtel Money', badge: 'Instant' },
          { id: 'card', label: 'Visa / Mastercard', badge: 'Secure' },
        ]
      : [
          { id: 'mobile_money', label: 'Paystack Instant Bank Transfer / USSD', badge: 'Instant' },
          { id: 'card', label: 'Visa / Mastercard / Verve Card', badge: 'Secure' },
        ];

  // Shared Checkout Form Renderer (Used inside both the Slide-Over Drawer and the Bottom #order-form)
  const renderCheckoutFlow = (isDrawer: boolean) => {
    if (checkoutStep === 'redirecting') {
      return (
        <div className="text-center py-10 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="inline-block px-3 py-1 rounded-full bg-[#F5DAD5] text-[#5A1A2C] text-[11px] font-bold uppercase tracking-widest">
            Payment Confirmed · Order Unlocked
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl text-[#5A1A2C]">
            Redirecting you to your My Site Customer App...
          </h3>
          <p className="text-sm text-[#7A5A47] max-w-md mx-auto">
            Your workspace for <strong>{partnerName || 'your love'}</strong> (PIN:{' '}
            <span className="font-mono font-bold text-[#5A1A2C]">{customPin}</span>) is ready. Opening your standalone customer portal now...
          </p>
        </div>
      );
    }

    if (checkoutStep === 'payment' && pendingOrder) {
      return (
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-[#5A1A2C]/12 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#B98A4E] block">
                Step 2 of 2 · Instant Payment &amp; Access
              </span>
              <h3 className="font-serif text-xl sm:text-2xl text-[#2B1710]">
                Complete checkout to unlock My Site
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutStep('details')}
              className="text-xs font-bold text-[#5A1A2C] underline cursor-pointer"
            >
              ← Edit Details
            </button>
          </div>

          {/* Order Summary Card */}
          <div className="p-4 rounded-2xl bg-[#33101B] text-[#FBF3EA] border border-[#B98A4E]/40 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#DCC397]">
              <span className="uppercase tracking-wider font-bold">
                {pendingOrder.product === 'memories'
                  ? 'Memories · 34-Photo Heart Mosaic'
                  : pendingOrder.product === 'custom'
                  ? 'Concierge Custom-Build Service'
                  : 'Chasing Her · Scrollable Love Story'}
              </span>
              <span className="font-serif text-xl font-bold text-[#DCC397]">
                {activePriceDisplay}
              </span>
            </div>
            <div className="text-xs text-[#F5DAD5]/90 flex flex-wrap gap-x-4 gap-y-1">
              <span>
                For: <strong className="text-white">{partnerName || 'My Love'}</strong>
              </span>
              <span>
                PIN: <strong className="font-mono text-[#DCC397]">{pendingOrder.pin}</strong>
              </span>
              <span>
                Account: <strong className="text-white">{pendingOrder.email}</strong>
              </span>
            </div>
            <div className="pt-2 border-t border-white/10 text-[11px] text-[#DCC397] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>
                Redirects immediately to your standalone <strong>My Site Customer App</strong> after payment
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#2B1710]">
              Select {countryConfig.name} Payment Method
            </label>
            {paymentMethodsForCountry.map((pm) => (
              <label
                key={pm.id}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                  selectedPaymentMethod === pm.id
                    ? 'border-[#5A1A2C] bg-[#F5DAD5]/40'
                    : 'border-[#2B1710]/15 bg-[#FBF3EA]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name={`paymethod-${isDrawer ? 'drawer' : 'inline'}`}
                    checked={selectedPaymentMethod === pm.id}
                    onChange={() => setSelectedPaymentMethod(pm.id)}
                    className="accent-[#5A1A2C]"
                  />
                  <span className="text-xs sm:text-sm font-bold text-[#2B1710]">{pm.label}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#5A1A2C] text-[#DCC397] text-[10px] font-bold uppercase">
                  {pm.badge}
                </span>
              </label>
            ))}
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleCompletePaymentAndRedirect}
            className="w-full py-4 px-6 rounded-full bg-gradient-to-b from-[#6E2236] to-[#5A1A2C] text-[#FBF3EA] font-bold text-sm sm:text-base shadow-[0_14px_30px_-10px_rgba(90,26,44,0.55)] hover:-translate-y-0.5 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4 text-[#DCC397]" />
            <span>
              {submitting
                ? 'Confirming Payment...'
                : `Pay ${activePriceDisplay} & Unlock My Site App →`}
            </span>
          </button>

          <p className="text-center text-[11px] text-[#7A5A47]">
            🔒 100% Money-Back Promise · Instant redirect to your standalone My Site portal
          </p>
        </div>
      );
    }

    return (
      <form onSubmit={handleProceedToPayment} className="space-y-4" noValidate>
        {/* Step 1: Pick Your Experience Radio Cards */}
        <div>
          <label className="block text-xs font-bold text-[#2B1710] mb-2">
            1. Choose your romantic experience
          </label>
          <div className="space-y-2" role="radiogroup" aria-label="Pick your option">
            <label
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition cursor-pointer ${
                selectedProduct === 'chasing-her'
                  ? 'border-[#5A1A2C] bg-[#F5DAD5]/45 shadow-[0_0_0_2px_rgba(90,26,44,0.12)]'
                  : 'border-[#2B1710]/15 bg-[#FBF3EA] hover:border-[#5A1A2C]/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name={`product-${isDrawer ? 'drawer' : 'inline'}`}
                  value="chasing-her"
                  checked={selectedProduct === 'chasing-her'}
                  onChange={() => setSelectedProduct('chasing-her')}
                  className="accent-[#5A1A2C] w-4 h-4"
                />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-[#2B1710]">
                    Chasing Her · build it myself
                  </div>
                  <div className="text-[11px] text-[#7A5A47]">
                    Scrollable Polaroid love story, wax-sealed letter &amp; songs
                  </div>
                </div>
              </div>
              <span className="font-serif font-bold text-sm sm:text-base text-[#5A1A2C] shrink-0">
                {funnel.pricePage}
              </span>
            </label>

            <label
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition cursor-pointer ${
                selectedProduct === 'memories'
                  ? 'border-[#5A1A2C] bg-[#F5DAD5]/45 shadow-[0_0_0_2px_rgba(90,26,44,0.12)]'
                  : 'border-[#2B1710]/15 bg-[#FBF3EA] hover:border-[#5A1A2C]/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name={`product-${isDrawer ? 'drawer' : 'inline'}`}
                  value="memories"
                  checked={selectedProduct === 'memories'}
                  onChange={() => setSelectedProduct('memories')}
                  className="accent-[#5A1A2C] w-4 h-4"
                />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-[#2B1710]">
                    Memories · build it myself
                  </div>
                  <div className="text-[11px] text-[#7A5A47]">
                    34-photo heart mosaic, 9-effect slideshow &amp; voice note
                  </div>
                </div>
              </div>
              <span className="font-serif font-bold text-sm sm:text-base text-[#5A1A2C] shrink-0">
                {funnel.pricePage}
              </span>
            </label>

            <label
              className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition cursor-pointer ${
                selectedProduct === 'custom'
                  ? 'border-[#5A1A2C] bg-[#F5DAD5]/45 shadow-[0_0_0_2px_rgba(90,26,44,0.12)]'
                  : 'border-[#2B1710]/15 bg-[#FBF3EA] hover:border-[#5A1A2C]/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name={`product-${isDrawer ? 'drawer' : 'inline'}`}
                  value="custom"
                  checked={selectedProduct === 'custom'}
                  onChange={() => setSelectedProduct('custom')}
                  className="accent-[#5A1A2C] w-4 h-4"
                />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-[#2B1710]">
                    Build it for me · concierge service
                  </div>
                  <div className="text-[11px] text-[#7A5A47]">
                    Send your photos &amp; notes — our team builds it in 24 hours
                  </div>
                </div>
              </div>
              <span className="font-serif font-bold text-sm sm:text-base text-[#5A1A2C] shrink-0">
                {funnel.priceCustom}
              </span>
            </label>
          </div>
        </div>

        {/* Lover's First Name & Secret PIN (Synced with Interactive Studio) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#2B1710] mb-1">
              Their First Name (Recipient)
            </label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="e.g. Amara"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF3EA] border border-[#2B1710]/15 text-[#2B1710] text-sm focus:outline-none focus:border-[#5A1A2C] focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#2B1710] mb-1">
              Secret 6-Digit PIN
            </label>
            <input
              type="text"
              maxLength={6}
              value={customPin}
              onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="140826"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF3EA] border border-[#2B1710]/15 text-[#2B1710] font-mono text-sm focus:outline-none focus:border-[#5A1A2C] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Customer Full Name */}
        <div>
          <label
            htmlFor={isDrawer ? 'drawer-order-name' : 'order-name'}
            className="block text-xs font-bold text-[#2B1710] mb-1"
          >
            Your Name
          </label>
          <input
            id={isDrawer ? 'drawer-order-name' : 'order-name'}
            ref={isDrawer ? drawerNameInputRef : nameInputRef}
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Kwame Mensah"
            required
            className="w-full px-4 py-3 rounded-xl bg-[#FBF3EA] border border-[#2B1710]/15 text-[#2B1710] text-sm focus:outline-none focus:border-[#5A1A2C] focus:bg-white transition"
          />
        </div>

        {/* Joined Country Code + WhatsApp Number */}
        <div className="relative">
          <label
            htmlFor={isDrawer ? 'drawer-order-phone' : 'order-phone'}
            className="block text-xs font-bold text-[#2B1710] mb-1"
          >
            Your WhatsApp Number
          </label>
          <div className="flex items-stretch rounded-xl bg-[#FBF3EA] border border-[#2B1710]/15 focus-within:border-[#5A1A2C] focus-within:bg-white transition overflow-visible">
            <button
              type="button"
              onClick={() => setDialDropdownOpen((o) => !o)}
              className="px-3 py-3 border-r border-[#2B1710]/12 flex items-center gap-1.5 text-xs font-bold text-[#2B1710] hover:bg-[#5A1A2C]/5 rounded-l-xl shrink-0 cursor-pointer"
              aria-label="Select country dial code"
            >
              <span className="text-base leading-none">{selectedDialOption.flag}</span>
              <span>{selectedDialOption.dial}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#7A5A47]" />
            </button>
            <input
              id={isDrawer ? 'drawer-order-phone' : 'order-phone'}
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder={countryConfig.phonePlaceholder}
              required
              className="w-full px-3.5 py-3 bg-transparent text-[#2B1710] text-sm focus:outline-none"
            />
          </div>

          {dialDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#FFFBF6] border border-[#2B1710]/15 rounded-2xl shadow-xl z-30 max-h-56 flex flex-col overflow-hidden">
              <div className="p-2 border-b border-[#2B1710]/10">
                <input
                  type="search"
                  value={dialSearch}
                  onChange={(e) => setDialSearch(e.target.value)}
                  placeholder="Search country or code..."
                  className="w-full px-3 py-1.5 rounded-lg bg-[#FBF3EA] border border-[#2B1710]/15 text-xs text-[#2B1710] focus:outline-none"
                />
              </div>
              <div className="overflow-y-auto divide-y divide-[#2B1710]/5">
                {filteredDialCountries.map((opt) => (
                  <button
                    key={opt.iso}
                    type="button"
                    onClick={() => {
                      setSelectedDialOption(opt);
                      if (opt.linkedCountry) {
                        onChangeCountry(opt.linkedCountry);
                      }
                      setDialDropdownOpen(false);
                      setDialSearch('');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs flex items-center justify-between hover:bg-[#F5DAD5]/40 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2 font-medium text-[#2B1710]">
                      <span className="text-base">{opt.flag}</span>
                      <span>{opt.name}</span>
                    </span>
                    <span className="font-mono text-[#7A5A47] font-semibold">{opt.dial}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Email Address + One-Tap Typo Hint */}
        <div>
          <label
            htmlFor={isDrawer ? 'drawer-order-email' : 'order-email'}
            className="block text-xs font-bold text-[#2B1710] mb-1"
          >
            Your Email Address (Unlocks your My Site App after payment)
          </label>
          <input
            id={isDrawer ? 'drawer-order-email' : 'order-email'}
            type="email"
            value={customerEmail}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="you@gmail.com"
            required
            className="w-full px-4 py-3 rounded-xl bg-[#FBF3EA] border border-[#2B1710]/15 text-[#2B1710] text-sm focus:outline-none focus:border-[#5A1A2C] focus:bg-white transition"
          />
          {emailSuggestion && (
            <div className="mt-1.5 text-xs text-[#7A5A47]">
              Did you mean{' '}
              <button
                type="button"
                onClick={applyEmailSuggestion}
                className="text-[#5A1A2C] font-bold underline cursor-pointer"
              >
                {emailSuggestion}
              </button>
              ?
            </div>
          )}
        </div>

        {selectedProduct === 'custom' && (
          <div>
            <label className="block text-xs font-bold text-[#2B1710] mb-1">
              Special Birthday Note or Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={occasionNote}
              onChange={(e) => setOccasionNote(e.target.value)}
              placeholder="e.g. Her birthday is Friday! I will upload our photos inside My Site right after payment."
              className="w-full px-3.5 py-2 rounded-xl bg-[#FBF3EA] border border-[#2B1710]/15 text-sm text-[#2B1710]"
            />
          </div>
        )}

        {formError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-300 text-xs font-semibold text-red-900">
            {formError}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-4 px-6 rounded-full bg-gradient-to-b from-[#6E2236] to-[#5A1A2C] text-[#FBF3EA] font-bold text-sm sm:text-base shadow-[0_14px_30px_-10px_rgba(90,26,44,0.55)] hover:-translate-y-0.5 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continue to Instant Payment ({activePriceDisplay})</span>
          <ArrowRight className="w-4 h-4 text-[#DCC397]" />
        </button>

        <p className="text-center text-[11px] text-[#7A5A47]">
          🔒 After payment, you are redirected straight to your standalone <strong>My Site App</strong>.
        </p>
      </form>
    );
  };

  return (
    <div
      className="min-h-screen relative overflow-x-hidden pb-28 selection:bg-[#5A1A2C] selection:text-[#FBF3EA]"
      style={{
        background:
          'radial-gradient(1100px 600px at 85% -10%, #F5DAD5 0%, rgba(245,218,213,0) 60%), radial-gradient(900px 600px at -10% 30%, #F2DFCE 0%, rgba(242,223,206,0) 55%), #FBF3EA',
        color: '#2B1710',
      }}
    >
      {/* =====================================================================
          CLEAN MINIMAL TOP BAR (Brand Wordmark + Single Primary CTA Only)
         ===================================================================== */}
      <nav
        aria-label="Primary sales navigation"
        className="sticky top-0 z-40 h-14 bg-[#FBF3EA]/92 backdrop-blur-md border-b border-[#5A1A2C]/10"
      >
        <div className="max-w-5xl h-full mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-serif text-lg sm:text-xl text-[#2B1710] tracking-tight font-medium">
              Chasing Her
            </span>
            <span className="text-[#B98A4E] text-sm" aria-hidden="true">
              ♥
            </span>
          </div>

          <button
            type="button"
            onClick={() => openInstantCheckout()}
            className="px-4 sm:px-5 py-2 rounded-full bg-[#5A1A2C] hover:bg-[#3B0F1C] text-[#FBF3EA] font-semibold text-xs sm:text-sm transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-xs"
          >
            <span>Create Yours</span>
            <span className="text-[#DCC397] font-mono text-[11px] sm:text-xs">
              · {funnel.pricePage}
            </span>
          </button>
        </div>
      </nav>

      {activeCampaign === 'reconcile' ? (
        <ReconcileSalesCampaignContent
          countryConfig={countryConfig}
          funnel={funnel}
          partnerName={partnerName}
          setPartnerName={setPartnerName}
          customPin={customPin}
          setCustomPin={setCustomPin}
          selectedFlowerTheme={selectedFlowerTheme}
          setSelectedFlowerTheme={setSelectedFlowerTheme}
          flowerThemes={FLOWER_THEMES}
          customOpeningLine={customOpeningLine}
          setCustomOpeningLine={setCustomOpeningLine}
          sanitizedPartnerSlug={sanitizedPartnerSlug}
          copiedDemoLink={copiedDemoLink}
          onCopyDemoLink={handleCopyDemoLink}
          chasingHerDemo={chasingHerDemo}
          memoriesDemo={memoriesDemo}
          showcaseMedia={showcaseMedia}
          siteExperiences={siteExperiences}
          demoSectionRef={demoSectionRef}
          onScrollToDemonstration={scrollToDemonstration}
          onOpenInstantCheckout={openInstantCheckout}
          onLockInAndScrollToForm={lockInAndScrollToForm}
          onOpenLivePreviewModal={(prod) => setLivePreviewModal(prod)}
        />
      ) : (
        <BirthdaySalesCampaignContent
          countryConfig={countryConfig}
          funnel={funnel}
          partnerName={partnerName}
          setPartnerName={setPartnerName}
          customPin={customPin}
          setCustomPin={setCustomPin}
          selectedFlowerTheme={selectedFlowerTheme}
          setSelectedFlowerTheme={setSelectedFlowerTheme}
          flowerThemes={FLOWER_THEMES}
          customOpeningLine={customOpeningLine}
          setCustomOpeningLine={setCustomOpeningLine}
          sanitizedPartnerSlug={sanitizedPartnerSlug}
          copiedDemoLink={copiedDemoLink}
          onCopyDemoLink={handleCopyDemoLink}
          chasingHerDemo={chasingHerDemo}
          memoriesDemo={memoriesDemo}
          showcaseMedia={showcaseMedia}
          siteExperiences={siteExperiences}
          demoSectionRef={demoSectionRef}
          onScrollToDemonstration={scrollToDemonstration}
          onOpenInstantCheckout={openInstantCheckout}
          onLockInAndScrollToForm={lockInAndScrollToForm}
          onOpenLivePreviewModal={(prod) => setLivePreviewModal(prod)}
        />
      )}

      {/* =====================================================================
          FINAL PUSH + INLINE ORDER LOCK-IN FORM (#order-form)
         ===================================================================== */}
      <section className="pt-12 pb-24 px-4 sm:px-6 bg-gradient-to-b from-[#FBF3EA] via-[#F5DAD5]/45 to-[#F5E9DC] border-t border-[#5A1A2C]/10">
        {activeCampaign === 'reconcile' ? (
          <div className="max-w-2xl mx-auto text-center mb-12">
            <img
              src={SALES_PAGE_ASSETS.finalHeart}
              alt=""
              aria-hidden="true"
              className="w-24 sm:w-28 mx-auto mb-5 ch-final-heart-beat"
              style={{ filter: 'drop-shadow(0 16px 28px rgba(90,26,44,0.26))' }}
            />

            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              07 · Create Your Personal Love Letter
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#2B1710] mb-4">
              CREATE YOUR PERSONAL LOVE LETTER WITH{' '}
              <em className="italic text-[#5A1A2C]">CHASING HER</em>
            </h2>

            <div className="space-y-3 text-base sm:text-lg text-[#7A5A47] max-w-xl mx-auto mb-7 leading-relaxed">
              <p className="text-[#2B1710] font-medium">
                Give your words a different way to reach her.
              </p>
              <p>Create something personal.</p>
              <p>Something thoughtful.</p>
              <p>Something she won&apos;t expect you to send.</p>
              <p className="font-serif text-xl sm:text-2xl text-[#5A1A2C] font-semibold pt-2">
                You don&apos;t have to be a writer. You just have to know what you want her to know.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openInstantCheckout('chasing-her')}
              className="inline-flex items-center justify-center gap-2 py-4 px-8 rounded-full bg-gradient-to-b from-[#6E2236] to-[#5A1A2C] text-[#FBF3EA] font-bold text-sm sm:text-base shadow-[0_14px_30px_-10px_rgba(90,26,44,0.55)] hover:-translate-y-0.5 transition cursor-pointer"
            >
              <span>Create Your Love Letter Now</span>
              <ArrowRight className="w-4 h-4 text-[#DCC397]" />
            </button>
            <p className="font-serif italic text-base text-[#5A1A2C] mt-3">
              Chasing Her — Some feelings deserve more than a message.
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center mb-12">
            <img
              src={SALES_PAGE_ASSETS.finalHeart}
              alt=""
              aria-hidden="true"
              className="w-24 sm:w-28 mx-auto mb-5 ch-final-heart-beat"
              style={{ filter: 'drop-shadow(0 16px 28px rgba(90,26,44,0.26))' }}
            />

            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              07 · Create Their Birthday Love Letter
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#2B1710] mb-4">
              CREATE THEIR BIRTHDAY SURPRISE WITH{' '}
              <em className="italic text-[#5A1A2C]">CHASING HER</em>
            </h2>

            <div className="space-y-3 text-base sm:text-lg text-[#7A5A47] max-w-xl mx-auto mb-7 leading-relaxed">
              <p className="text-[#2B1710] font-medium">
                Their birthday is coming — give them something they&apos;ll never forget.
              </p>
              <p>Something personal.</p>
              <p>Something thoughtful.</p>
              <p>Something they&apos;ll proudly show the people around them.</p>
              <p className="font-serif text-xl sm:text-2xl text-[#5A1A2C] font-semibold pt-2">
                You don&apos;t have to be a designer or a poet. You just have to love them.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openInstantCheckout('chasing-her')}
              className="inline-flex items-center justify-center gap-2 py-4 px-8 rounded-full bg-gradient-to-b from-[#6E2236] to-[#5A1A2C] text-[#FBF3EA] font-bold text-sm sm:text-base shadow-[0_14px_30px_-10px_rgba(90,26,44,0.55)] hover:-translate-y-0.5 transition cursor-pointer"
            >
              <span>Create Their Birthday Site Now</span>
              <ArrowRight className="w-4 h-4 text-[#DCC397]" />
            </button>
            <p className="font-serif italic text-base text-[#5A1A2C] mt-3">
              Chasing Her — Make it personal. Make it romantic. Make it yours.
            </p>
          </div>
        )}

        {/* INLINE ORDER LOCK-IN & CHECKOUT CARD (#order-form) */}
        <div
          id="order-form"
          ref={orderFormRef}
          className="max-w-xl mx-auto scroll-mt-20"
        >
          <div
            className={`bg-[#FFFBF6] rounded-[28px] p-6 sm:p-9 border-2 border-[#B98A4E]/35 shadow-[0_24px_60px_-18px_rgba(43,23,16,0.22)] transition-all ${
              formHighlightPulse ? 'ch-form-locked-highlight' : ''
            }`}
          >
            <div className="text-center mb-6">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B98A4E] block mb-1">
                Instant Checkout · Unlocks Your My Site App
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#2B1710]">
                {activeCampaign === 'reconcile'
                  ? 'Start her personal love letter right here'
                  : 'Start their birthday surprise right here'}
              </h3>
              <p className="text-xs sm:text-sm text-[#7A5A47] mt-1">
                Complete checkout below and you&apos;ll be redirected immediately to your standalone My Site portal.
              </p>
            </div>

            <div className="flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#FBF3EA] border border-[#B98A4E]/45 mb-6">
              <div className="w-7 h-7 rounded-full bg-[#5A1A2C] text-[#DCC397] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-[13px] text-[#2B1710] leading-relaxed">
                <strong className="text-[#5A1A2C]">Our promise:</strong> We&apos;ll keep editing until you love it. If we can&apos;t get it right, you get your money back.
              </p>
            </div>

            {renderCheckoutFlow(false)}
          </div>
        </div>
      </section>

      {/* =====================================================================
          CLEAN ROMANTIC FOOTER (Ghana & Kenya)
         ===================================================================== */}
      <footer className="py-10 px-5 bg-[#F5E9DC] border-t border-[#5A1A2C]/10 text-center text-xs text-[#7A5A47]">
        <div className="max-w-4xl mx-auto space-y-2">
          <div className="font-serif italic text-base text-[#5A1A2C]">
            Chasing Her ♥ Made with love for thoughtful lovers in Ghana &amp; Kenya
          </div>
          <p className="text-[11px] text-[#7A5A47]">
            © {new Date().getFullYear()} Chasing Her · Private Digital Love Letters &amp; Keepsakes
          </p>
        </div>
      </footer>

      {/* =====================================================================
          SCROLL-TRIGGERED CHECKOUT DOCK (Appears only after scrolling past hero)
         ===================================================================== */}
      <div
        className={`fixed bottom-0 inset-x-0 z-30 bg-[#1F060E]/95 backdrop-blur-md border-t border-[#B98A4E]/40 px-4 py-2.5 shadow-[0_-12px_35px_rgba(27,6,13,0.45)] transition-transform duration-300 ${
          showStickyDock ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex w-9 h-9 rounded-full bg-[#5A1A2C] border border-[#DCC397]/40 items-center justify-center text-[#DCC397] font-serif font-bold text-sm">
              ♥
            </div>
            <div className="text-xs leading-tight text-[#FBF3EA]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#DCC397]">
                  {selectedProduct === 'memories'
                    ? 'Memories Edition'
                    : selectedProduct === 'custom'
                    ? 'Concierge Custom Build'
                    : 'Chasing Her Edition'}
                </span>
                <span className="font-serif text-sm sm:text-base font-bold text-white">
                  {activePriceDisplay}
                </span>
                <span className="line-through text-[11px] text-[#FBF3EA]/45 hidden sm:inline">
                  {funnel.priceWas}
                </span>
              </div>
              <span className="block text-[10px] sm:text-[11px] text-[#F5DAD5]/75">
                For <strong>{partnerName || 'Your Lover'}</strong> · Instant redirect to My Site after payment
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => lockInAndScrollToForm()}
              className="hidden md:inline-flex px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/15 text-[#DCC397] font-semibold text-xs transition cursor-pointer"
            >
              Order Form ↓
            </button>
            <button
              type="button"
              onClick={() => openInstantCheckout()}
              className="px-4 sm:px-5 py-2.5 rounded-full bg-gradient-to-r from-[#DCC397] to-[#B98A4E] text-[#2B1710] font-extrabold text-xs sm:text-sm shadow-md hover:brightness-105 transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Quick Checkout →</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SLIDE-OVER INSTANT CHECKOUT DRAWER (Accessible from anywhere on page)
         ===================================================================== */}
      {checkoutDrawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#16040A]/75 backdrop-blur-xs flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Instant Checkout Drawer"
        >
          <div className="w-full max-w-lg bg-[#FFFBF6] text-[#2B1710] h-full overflow-y-auto shadow-2xl border-l-2 border-[#B98A4E]/40 flex flex-col justify-between">
            <div className="p-5 sm:p-7 space-y-5">
              <div className="flex items-center justify-between border-b border-[#5A1A2C]/12 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B98A4E] block">
                    {activeCampaign === 'reconcile'
                      ? 'Express Love Letter Checkout'
                      : 'Express Birthday Checkout'}{' '}
                    · {countryConfig.flag} {countryConfig.name}
                  </span>
                  <h2 className="font-serif text-2xl text-[#5A1A2C]">
                    {activeCampaign === 'reconcile'
                      ? 'Start Her Personal Love Letter'
                      : 'Lock In Their Romantic Surprise'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-[#5A1A2C]/10 hover:bg-[#5A1A2C]/20 text-[#5A1A2C] flex items-center justify-center font-bold cursor-pointer"
                  aria-label="Close checkout drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {renderCheckoutFlow(true)}
            </div>

            <div className="p-4 bg-[#F5E9DC] border-t border-[#5A1A2C]/10 text-center text-[11px] text-[#7A5A47]">
              Need help? WhatsApp Support is available inside your My Site App immediately after checkout.
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          FULLSCREEN LIVE DEMO MODAL
         ===================================================================== */}
      {livePreviewModal && (
        <div
          className="fixed inset-0 z-50 bg-[#1B0A10]/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Live example preview"
        >
          <div className="w-full max-w-[440px] h-[88vh] max-h-[780px] bg-[#19050B] rounded-[26px] overflow-hidden shadow-2xl border border-[#B98A4E]/45 flex flex-col">
            <div className="px-4 py-3 bg-[#FFFBF6] text-[#2B1710] border-b border-[#5A1A2C]/15 flex items-center justify-between gap-2">
              <div>
                <div className="font-serif font-semibold text-sm text-[#5A1A2C]">
                  {livePreviewModal === 'chasing-her'
                    ? 'Chasing Her · Live Interactive Sample'
                    : 'Memories · Live Interactive Sample'}
                </div>
                <div className="text-[11px] text-[#7A5A47]">
                  Enter PIN{' '}
                  <strong className="text-[#5A1A2C] font-mono">
                    {livePreviewModal === 'chasing-her' ? chasingHerDemo.pin : memoriesDemo.pin}
                  </strong>{' '}
                  or tap Skip Passcode inside
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setLivePreviewModal(
                      livePreviewModal === 'chasing-her' ? 'memories' : 'chasing-her'
                    )
                  }
                  className="px-2.5 py-1 rounded-full bg-[#F5DAD5] text-[#5A1A2C] text-[11px] font-bold cursor-pointer"
                >
                  Switch to {livePreviewModal === 'chasing-her' ? 'Memories' : 'Chasing Her'}
                </button>
                <button
                  type="button"
                  onClick={() => setLivePreviewModal(null)}
                  className="w-7 h-7 rounded-full bg-[#5A1A2C]/10 text-[#5A1A2C] font-bold text-sm flex items-center justify-center cursor-pointer"
                  aria-label="Close preview"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <RecipientSitePreview
                product={livePreviewModal}
                chasingHerData={chasingHerDemo}
                memoriesData={memoriesDemo}
                isPublicShowcase={true}
              />
            </div>

            <div className="px-4 py-3 bg-[#FFFBF6] border-t border-[#5A1A2C]/15 flex items-center justify-between gap-2">
              <span className="text-xs text-[#7A5A47]">
                Love this design? Lock it in for <strong className="text-[#5A1A2C]">{funnel.pricePage}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  const pick = livePreviewModal;
                  setLivePreviewModal(null);
                  openInstantCheckout(pick);
                }}
                className="px-4 py-2 rounded-full bg-[#5A1A2C] text-[#FBF3EA] font-bold text-xs cursor-pointer"
              >
                Checkout With This Design →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
