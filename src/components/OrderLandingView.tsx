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
  ChasingHerProjectData,
  MemoriesProjectData,
  ShowcaseMediaMap,
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
  InteractiveProductDemoReel,
  HoverToPlayEditionCards,
} from './InteractiveProductDemoReel';
import {
  ReconcileSalesCampaignContent,
  RECONCILE_OPENING_PRESETS,
} from './ReconcileSalesCampaignContent';

export type SalesCampaignId = 'reconcile' | 'birthday';

interface OrderLandingViewProps {
  country: CountryCode;
  onChangeCountry: (country: CountryCode) => void;
  settingsMap: Record<string, string>;
  testimonials: TestimonialItem[];
  showcaseMedia?: ShowcaseMediaMap;
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
  { iso: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', linkedCountry: 'ng' },
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

const OPENING_LINE_PRESETS = [
  'Happy Birthday to the woman who makes every ordinary day feel unforgettable.',
  'Out of all the gifts in the world, I wanted to build something that holds our story.',
  'To my favorite person, my safe place, and my greatest adventure — Happy Birthday.',
] as const;

const OCCASION_CARDS = [
  {
    roman: 'I',
    tag: 'MOST POPULAR CAMPAIGN',
    title: 'THEIR BIRTHDAY',
    description:
      'Make their special day feel truly personal with a gift created around them, your memories, and everything you love about them.',
    accent: '🎂 Midnight or Birthday Morning Reveal',
  },
  {
    roman: 'II',
    tag: 'RELATIONSHIP MILESTONE',
    title: 'YOUR ANNIVERSARY',
    description:
      "Celebrate how far you've come, the moments you've shared, and the story you're still writing together.",
    accent: '🥂 Every Chapter of Your Story Together',
  },
  {
    roman: 'III',
    tag: 'ROMANTIC TRADITION',
    title: "VALENTINE'S DAY",
    description:
      'Stand out from the usual routine and give them something deeply romantic, thoughtful, and personal.',
    accent: '🌹 More Unforgettable Than Flowers Alone',
  },
  {
    roman: 'IV',
    tag: 'SPONTANEOUS SURPRISE',
    title: 'JUST BECAUSE',
    description:
      'Because sometimes the best romantic gestures are the ones they never saw coming.',
    accent: '💌 A Random Tuesday They Will Never Forget',
  },
] as const;

const BIRTHDAY_FAQS = [
  {
    q: 'Do I need to know how to code?',
    a: 'No. Chasing Her was built so anyone can create a beautiful romantic experience without needing any technical or design skills.',
  },
  {
    q: 'Do I need to be a good writer?',
    a: "Not at all. Your message doesn't have to sound like poetry. It just has to be honest and come from your heart. The builder helps you bring everything together beautifully.",
  },
  {
    q: 'Do I create it myself?',
    a: 'Yes — you can create and customize it yourself inside the Chasing Her builder. And if you would rather have our team create it for you, you can also choose our custom-build service for an additional fee.',
  },
  {
    q: 'How does my lover receive it?',
    a: 'Once your creation is ready, you get a unique shareable link that you can send directly to them on WhatsApp, iMessage, Instagram DM, or anywhere else.',
  },
  {
    q: 'When do I get access to the My Site Customer App?',
    a: 'Immediately after payment! As soon as you complete checkout, you are automatically redirected to your standalone My Site Customer App where your builder, live order tracker, and shareable links are unlocked.',
  },
  {
    q: 'Is Chasing Her only for birthdays?',
    a: "No. While it makes an unforgettable birthday gift, you can also use it for anniversaries, Valentine's Day, apologies, long-distance surprises, or any moment you want to do something romantic for the person you love.",
  },
] as const;

export const OrderLandingView: React.FC<OrderLandingViewProps> = ({
  country,
  onChangeCountry,
  settingsMap,
  testimonials,
  showcaseMedia = INITIAL_SHOWCASE_MEDIA,
  chasingHerDemo,
  memoriesDemo,
  onOrderCreated,
}) => {
  const countryConfig = COUNTRIES[country] || COUNTRIES.gh;
  const funnel = resolveCountrySettings(country, settingsMap);

  // Active Sales Page Campaign ('reconcile' = "Are You About To Lose Her?", 'birthday' = "Birthday Gift Campaign")
  const [activeCampaign, setActiveCampaign] = useState<SalesCampaignId>(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('campaign');
    if (c === 'birthday') return 'birthday';
    return 'reconcile';
  });

  // Shared Checkout & Personalizer State
  const [selectedProduct, setSelectedProduct] = useState<ProductType>('chasing-her');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [partnerName, setPartnerName] = useState('Amara');
  const [customPin, setCustomPin] = useState('140826');
  const [selectedFlowerTheme, setSelectedFlowerTheme] = useState<number>(0);
  const [customOpeningLine, setCustomOpeningLine] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('campaign') === 'birthday'
      ? OPENING_LINE_PRESETS[0]
      : RECONCILE_OPENING_PRESETS[0];
  });
  const [occasionNote, setOccasionNote] = useState('');

  const handleSelectCampaign = (nextCampaign: SalesCampaignId) => {
    setActiveCampaign(nextCampaign);
    setCustomOpeningLine(
      nextCampaign === 'birthday' ? OPENING_LINE_PRESETS[0] : RECONCILE_OPENING_PRESETS[0]
    );
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('campaign', nextCampaign);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore URL update issues
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [copiedDemoLink, setCopiedDemoLink] = useState(false);

  // Subtle social proof toast
  const [bumpToast, setBumpToast] = useState<{ city: string; template: string; visible: boolean }>({
    city: 'Accra',
    template: 'Chasing Her',
    visible: false,
  });

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

  // Social proof toast rotation
  useEffect(() => {
    const citiesByCountry: Record<CountryCode, string[]> = {
      gh: ['Accra', 'Kumasi', 'Tema', 'Takoradi', 'East Legon'],
      ke: ['Nairobi', 'Mombasa', 'Westlands', 'Kilimani', 'Kisumu'],
      ng: ['Lagos', 'Abuja', 'Lekki', 'Port Harcourt', 'Ibadan'],
    };
    const templates = ['Chasing Her', 'Memories', 'a Birthday Surprise'];
    const cities = citiesByCountry[country] || citiesByCountry.gh;

    const showRandomBump = () => {
      const city = cities[Math.floor(Math.random() * cities.length)];
      const template = templates[Math.floor(Math.random() * templates.length)];
      setBumpToast({ city, template, visible: true });
      setTimeout(() => {
        setBumpToast((prev) => ({ ...prev, visible: false }));
      }, 4500);
    };

    const initialTimer = setTimeout(showRandomBump, 7000);
    const interval = setInterval(showRandomBump, 26000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [country]);

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
      hosted_url: `/?view=preview&product=${selectedProduct === 'memories' ? 'memories' : 'chasing-her'}&slug=${slug}`,
      brief: {
        design: selectedProduct === 'memories' ? 'memories' : 'chasing-her',
        for: partnerName.trim() || 'My Partner',
        feel: customOpeningLine || 'Birthday Surprise',
        links: FLOWER_THEMES[selectedFlowerTheme]?.name || '',
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

  const reviewShowcaseCards = [
    {
      badge: 'STORY 01 · CREATING THE SURPRISE',
      roleLabel: 'How they created their experience',
      whatsappSent: 'Babe, happy birthday ❤️ Open this when you wake up: chasingher.love/for-ama (PIN: 140826)',
      whatsappReply: 'Wait how did you make a whole website just for me?! The Polaroids and our song 😭❤️❤️',
      headline: '"I built her entire birthday website on my phone in 20 minutes — and it looked like I hired a designer."',
      body:
        testimonials[0]?.quote ||
        'I wanted something for her birthday that she could show off to all her friends. The builder guided me step by step: I added 12 of our favorite photos, picked her favorite songs, and wrote why I love her. Having the flowers bloom when she typed her birthday PIN was pure magic.',
      author: testimonials[0]?.customer_name || 'Kwame & Ama',
      location: testimonials[0]?.location || 'Accra, Ghana 🇬🇭',
      product: 'Chasing Her · Birthday Surprise',
      previewTarget: 'chasing-her' as const,
    },
    {
      badge: 'STORY 02 · THE RECIPIENT REACTION',
      roleLabel: 'Their lover’s reaction when unlocking it',
      whatsappSent: 'Happy birthday my queen 🎂 Tap the heart & enter the date we first met: chasingher.love/wanjiku',
      whatsappReply: 'Brian I am literally in tears right now 😭 Hearing your voice note over our 34 photos broke me ❤️',
      headline: '"She literally started crying before she even finished opening the wax-sealed envelope."',
      body:
        testimonials[1]?.quote ||
        'At midnight on her birthday, I sent her the private link on WhatsApp and told her the passcode was the date we first met. She screen-recorded her reaction—when the flowers parted and my voice note started playing over our photos, she called me in tears saying nobody had ever done anything this thoughtful for her.',
      author: testimonials[1]?.customer_name || 'Brian & Wanjiku',
      location: testimonials[1]?.location || 'Nairobi, Kenya 🇰🇪',
      product: 'Memories · 34-Photo Heart Mosaic',
      previewTarget: 'memories' as const,
    },
    {
      badge: 'STORY 03 · FINISHED CREATION + FEEDBACK',
      roleLabel: 'Finished creation alongside their feedback',
      whatsappSent: 'Made something special for your birthday, open with headphones on 🎧❤️ chasingher.love/zainab',
      whatsappReply: 'I just posted a screen recording on my story and all my girls are asking who built this!! 😍🔥',
      headline: '"She posted a screen-recording on her story and every single one of her friends asked how I did it."',
      body:
        testimonials[2]?.quote ||
        'Flowers fade in a week and perfume runs out, but she still opens her Chasing Her link whenever she misses me. The Polaroid wall with my little captions underneath each photo made her feel truly seen. Worth every single penny and 100% within budget.',
      author: testimonials[2]?.customer_name || 'Tunde & Zainab',
      location: testimonials[2]?.location || 'Lagos, Nigeria 🇳🇬',
      product: 'Chasing Her · Polaroid & Soundtrack',
      previewTarget: 'chasing-her' as const,
    },
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
          STICKY CAMPAIGN & INSTANT CHECKOUT TOP BAR (No Premature App Links)
         ===================================================================== */}
      <div className="sticky top-0 z-40 bg-[#280913]/95 backdrop-blur-md text-[#FBF3EA] border-b border-[#B98A4E]/35 shadow-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Campaign Switcher (Page 02: Lose Her? vs Page 01: Birthday Gift) */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex items-center bg-[#18040A] border border-[#B98A4E]/40 rounded-lg p-0.5"
              role="group"
              aria-label="Select sales campaign page"
            >
              <button
                type="button"
                onClick={() => handleSelectCampaign('reconcile')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  activeCampaign === 'reconcile'
                    ? 'bg-[#DCC397] text-[#2B1710] shadow-xs'
                    : 'text-[#FBF3EA]/75 hover:text-white'
                }`}
              >
                Page 02 · Win Her Back
              </button>
              <button
                type="button"
                onClick={() => handleSelectCampaign('birthday')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition whitespace-nowrap cursor-pointer ${
                  activeCampaign === 'birthday'
                    ? 'bg-[#DCC397] text-[#2B1710] shadow-xs'
                    : 'text-[#FBF3EA]/75 hover:text-white'
                }`}
              >
                Page 01 · Birthday Gift
              </button>
            </div>

            <span className="hidden lg:inline font-medium tracking-wide text-[#F5DAD5]/90">
              {activeCampaign === 'reconcile'
                ? 'Some feelings deserve more than a message:'
                : 'Personalized Love Letter Experience:'}{' '}
              <strong className="text-[#DCC397] font-bold">{funnel.pricePage}</strong>{' '}
              <span className="line-through opacity-60">{funnel.priceWas}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Country Edition Selector */}
            <div
              className="inline-flex items-center bg-[#5A1A2C]/90 border border-[#B98A4E]/35 rounded-lg p-0.5"
              role="group"
              aria-label="Select country edition"
            >
              {(Object.keys(COUNTRIES) as CountryCode[]).map((code) => {
                const cfg = COUNTRIES[code];
                const active = country === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onChangeCountry(code)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#FBF3EA] text-[#33101B] shadow-xs'
                        : 'text-[#FBF3EA]/80 hover:text-white'
                    }`}
                  >
                    <span>{cfg.flag}</span>
                    <span className="hidden sm:inline">{cfg.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Instant Checkout Trigger right in the top bar */}
            <button
              type="button"
              onClick={() => openInstantCheckout()}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#DCC397] to-[#B98A4E] text-[#2B1710] font-extrabold text-[11px] sm:text-xs shadow-xs hover:brightness-105 transition flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Instant Checkout →</span>
            </button>
          </div>
        </div>
      </div>

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
          demoSectionRef={demoSectionRef}
          onScrollToDemonstration={scrollToDemonstration}
          onOpenInstantCheckout={openInstantCheckout}
          onLockInAndScrollToForm={lockInAndScrollToForm}
          onOpenLivePreviewModal={(prod) => setLivePreviewModal(prod)}
        />
      ) : (
        <>
          {/* =====================================================================
              OPENING — THE THOUGHTFUL LOVER (Heirloom Stationery Love Letter)
             ===================================================================== */}
          <header className="relative pt-8 pb-16 md:pt-14 md:pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Original Floating Blossom & Butterfly Assets */}
        <img
          src={SALES_PAGE_ASSETS.heroBlossom}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute -top-3 -left-7 sm:-top-2 sm:left-2 md:left-8 w-20 sm:w-36 md:w-44 opacity-90 ch-float-blossom z-0"
          style={{ filter: 'drop-shadow(0 12px 22px rgba(90,26,44,0.18))' }}
        />
        <img
          src={SALES_PAGE_ASSETS.heroButterfly}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute top-1 -right-5 sm:top-4 sm:right-4 md:right-10 w-18 sm:w-32 md:w-40 opacity-90 ch-flutter-butterfly z-0"
          style={{ filter: 'drop-shadow(0 12px 22px rgba(90,26,44,0.18))' }}
        />

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Brand Crest */}
          <div className="text-center mb-6 px-12 sm:px-0">
            <div className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-[#7A5A47] font-semibold">
              <span>Chasing Her</span>
              <span className="text-[#B98A4E]">♥</span>
              <span>The Birthday Gift Experience · {countryConfig.name} Edition</span>
            </div>
          </div>

          {/* Heirloom Stationery Letter Card */}
          <div className="bg-[#FFFDF9] border-2 border-[#B98A4E]/35 rounded-[32px] p-5 sm:p-10 md:p-12 shadow-[0_30px_80px_-25px_rgba(43,23,16,0.24)] relative">
            {/* Inner Gold Hairline Frame */}
            <div className="pointer-events-none absolute inset-2.5 sm:inset-4 rounded-[24px] border border-[#5A1A2C]/10" />

            {/* Top Wax Seal & Dispatch Header */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 mb-7 border-b border-[#5A1A2C]/12">
              <div className="flex items-center gap-3.5">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[#FBF3EA] font-serif font-bold text-sm shadow-md shrink-0"
                  style={{
                    background: 'radial-gradient(circle at 35% 30%, #C2185B, #5A1A2C)',
                    boxShadow: '0 6px 14px rgba(90,26,44,0.35), inset 0 1px 2px rgba(255,255,255,0.3)',
                  }}
                >
                  ♥ CH
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold">
                    Personal Dispatch · Private Edition
                  </div>
                  <div className="font-serif italic text-xl sm:text-2xl text-[#5A1A2C] font-medium">
                    To: The Thoughtful Lover
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#5A1A2C] text-[#FBF3EA] text-xs font-bold tracking-wider uppercase shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#DCC397]" />
                  All Within Budget · {funnel.pricePage}
                </span>
              </div>
            </div>

            {/* Main Campaign Headline */}
            <div className="relative z-10 max-w-4xl">
              <h1 className="font-serif text-2xl sm:text-4xl md:text-[44px] leading-[1.14] text-[#2B1710] tracking-tight mb-5">
                Searching for a gift that would not only make your lover happy, but also tell them{' '}
                <em className="italic text-[#5A1A2C] font-medium">how much you love them</em> on their special day{' '}
                <span className="underline decoration-[#B98A4E] decoration-2 underline-offset-4 text-[#5A1A2C]">
                  [ALL WITHIN BUDGET]
                </span>
                ...
              </h1>

              <div className="inline-flex items-center gap-2 bg-[#F5DAD5] border border-[#5A1A2C]/20 text-[#5A1A2C] px-4 py-1.5 rounded-md font-extrabold text-xs sm:text-sm tracking-[0.16em] uppercase mb-8">
                <span>READ THIS NOW!</span>
                <span className="font-script text-lg capitalize tracking-normal text-[#7A1C33] font-normal">
                  — before their birthday arrives
                </span>
              </div>
            </div>

            {/* Two-Column Editorial Letter + Interactive Experience Showcase */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              {/* Left Column: The Emotional Story Letter */}
              <div className="lg:col-span-7 space-y-4 text-[16px] sm:text-[17px] leading-[1.78] text-[#2B1710]">
                <p className="font-serif text-2xl sm:text-[26px] text-[#5A1A2C] font-medium leading-snug">
                  Their birthday is coming up...
                </p>
                <p>You need a gift.</p>
                <p>But not just any random gift.</p>
                <p className="font-semibold text-[#5A1A2C] text-lg">
                  You need one that feels like it was built specially for them.
                </p>
                <p>You need one that can communicate your love for them.</p>
                <p>
                  And most of all, you need one they can{' '}
                  <strong className="text-[#5A1A2C] bg-[#F5DAD5]/60 px-1.5 py-0.5 rounded">
                    brag to their friends about...
                  </strong>
                </p>
                <p className="text-[#7A5A47]">
                  Something new that most likely no one has ever done for them and would make their friends not see you as cheap.
                </p>

                <div className="pl-5 border-l-2 border-[#B98A4E] py-2 my-6 space-y-2 text-[#5A1A2C] bg-[#FBF3EA]/80 rounded-r-2xl pr-4">
                  <p>Because the truth is... anyone can buy a regular gift.</p>
                  <p>Anyone can send a short birthday message.</p>
                  <p>Anyone can post a picture and write &ldquo;Happy Birthday My Love.&rdquo;</p>
                </div>

                <p>
                  When you deeply care about someone, you want their gift to say more than just{' '}
                  <em>&ldquo;Happy Birthday.&rdquo;</em>
                </p>
                <p>You want it to say:</p>

                {/* Luxury Pull-Quote Box */}
                <blockquote className="my-6 p-6 sm:p-7 rounded-[24px] bg-gradient-to-br from-[#5A1A2C] via-[#431220] to-[#280913] text-[#FBF3EA] shadow-xl border border-[#B98A4E]/40 relative overflow-hidden">
                  <div className="text-[#DCC397]/25 font-serif text-7xl leading-none absolute -top-2 left-3 select-none">
                    &ldquo;
                  </div>
                  <p className="relative z-10 font-serif italic text-lg sm:text-[21px] leading-relaxed text-[#FBF3EA]">
                    &ldquo;Out of all the gifts I could give you, I wanted to give you something that reminds you just how special you are to me.&rdquo;
                  </p>
                  <footer className="relative z-10 mt-3 text-xs uppercase tracking-widest text-[#DCC397]">
                    — The feeling they will never forget
                  </footer>
                </blockquote>

                <p>Something thoughtful. Something romantic.</p>
                <p>
                  Something that makes them smile the moment they open it... and maybe even get a little emotional while going through it.
                </p>
                <p>
                  Something so personal that when they show their friends, their friends immediately know:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
                  <div className="p-3.5 rounded-2xl bg-[#F5E9DC] border border-[#5A1A2C]/12 text-xs sm:text-sm font-bold text-[#5A1A2C]">
                    ✦ You didn&apos;t just rush and buy something.
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#F5E9DC] border border-[#5A1A2C]/12 text-xs sm:text-sm font-bold text-[#5A1A2C]">
                    ✦ You actually put thought into it.
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#5A1A2C] text-[#FBF3EA] text-xs sm:text-sm font-bold shadow-sm">
                    ✦ You gave them a memory.
                  </div>
                </div>

                <p>
                  And if that is the kind of birthday gift you want to give your lover...
                </p>
                <p>Then don&apos;t just send them a message they&apos;ll scroll past.</p>
                <p>Don&apos;t just get them something they&apos;ll forget in a few weeks.</p>
                <p>
                  Give them an experience made around your love, your memories, and the things that make your relationship special.
                </p>
                <div className="pt-3 flex flex-wrap items-center justify-between gap-4">
                  <p className="font-serif italic text-2xl sm:text-3xl text-[#5A1A2C] font-semibold">
                    Give them Chasing Her.
                  </p>
                  <span className="font-script text-2xl text-[#B98A4E]">
                    Yours truly ♥
                  </span>
                </div>
              </div>

              {/* Right Column: Sticky Experience Card + Instant Checkout & Walkthrough Triggers */}
              <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
                <div className="rounded-[24px] overflow-hidden border-2 border-[#B98A4E]/40 shadow-[0_24px_60px_-20px_rgba(43,23,16,0.4)] bg-[#280913] text-[#FBF3EA] relative">
                  <div className="px-4 py-2.5 bg-[#1B050C] border-b border-[#B98A4E]/25 flex items-center justify-between text-[11px]">
                    <span className="text-[#DCC397] font-semibold tracking-wider uppercase">
                      ✦ The Digital Keepsake Experience
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#5A1A2C] text-[#FBF3EA] font-mono">
                      PIN Protected
                    </span>
                  </div>

                  <img
                    src={SALES_PAGE_ASSETS.heroShot}
                    alt="Preview of a Chasing Her love letter website shown on laptop and phone, with photos, a song, and a personal message"
                    className="w-full h-auto block"
                  />

                  <div className="p-5 bg-gradient-to-b from-[#33101B] to-[#220810] space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-widest text-[#DCC397] font-bold">
                          What They Unwrap On Their Phone
                        </div>
                        <div className="text-sm font-serif italic text-[#FBF3EA]">
                          Secret PIN + Blooming Flowers + Polaroids + Wax Letter + Song
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setLivePreviewModal('chasing-her')}
                        className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-[#DCC397]/30 text-[#FBF3EA] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-[#DCC397] text-[#DCC397]" />
                        <span>Live Sample 01</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLivePreviewModal('memories')}
                        className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-[#DCC397]/30 text-[#FBF3EA] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Heart className="w-3.5 h-3.5 fill-[#E1A6A3] text-[#E1A6A3]" />
                        <span>Live Sample 02</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Instant Action Box */}
                <div className="p-5 rounded-[24px] bg-[#F5E9DC] border border-[#5A1A2C]/15 shadow-sm space-y-3">
                  <button
                    type="button"
                    onClick={() => openInstantCheckout('chasing-her')}
                    className="w-full py-4 px-6 rounded-full bg-gradient-to-b from-[#6E2236] to-[#5A1A2C] text-[#FBF3EA] font-bold text-base shadow-[0_14px_30px_-10px_rgba(90,26,44,0.55),inset_0_1px_0_rgba(255,255,255,0.22)] hover:-translate-y-0.5 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Create My Love Letter Now</span>
                    <ArrowRight className="w-4 h-4 text-[#DCC397]" />
                  </button>

                  <button
                    type="button"
                    onClick={scrollToDemonstration}
                    className="w-full py-3 px-5 rounded-full bg-[#FFFBF6] border border-[#5A1A2C]/25 text-[#5A1A2C] font-bold text-xs sm:text-sm hover:bg-[#F5DAD5]/40 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-[#5A1A2C]" />
                    <span>[WATCH THE DEMONSTRATION]</span>
                  </button>

                  <div className="flex items-center justify-between text-[11px] text-[#7A5A47] pt-1 px-1">
                    <span>
                      Access: <strong className="text-[#5A1A2C]">{funnel.pricePage}</strong>{' '}
                      <span className="line-through opacity-65">{funnel.priceWas}</span>
                    </span>
                    <span>Redirects to My Site after payment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          SECTION 1 — THE REVEAL (With Original Polaroid Stack & Floating Art)
         ===================================================================== */}
      <section className="relative py-16 md:py-24 px-5 bg-[#F5E9DC]/85 border-y border-[#5A1A2C]/10 overflow-hidden">
        {/* Original Story Floating Butterfly & Flower */}
        <img
          src={SALES_PAGE_ASSETS.storyButterfly}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute top-2 -right-4 sm:top-4 sm:right-10 w-18 sm:w-32 opacity-90 ch-flutter-butterfly"
          style={{ filter: 'drop-shadow(0 10px 20px rgba(90,26,44,0.16))' }}
        />
        <img
          src={SALES_PAGE_ASSETS.storyFlower}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute bottom-2 -left-4 sm:bottom-4 sm:left-10 w-18 sm:w-32 opacity-90 ch-float-blossom"
          style={{ filter: 'drop-shadow(0 10px 20px rgba(90,26,44,0.16))' }}
        />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12 px-8 sm:px-0">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              Section 01 · The Reveal
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#2B1710]">
              Meet <em className="italic text-[#5A1A2C]">Chasing Her</em> — where you become the creator of your own romantic surprise.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: The Original 3-Polaroid Stack from First Sales Page */}
            <div className="lg:col-span-5">
              <div className="relative h-[300px] sm:h-[340px] max-w-[390px] mx-auto">
                <div
                  className="absolute top-3 left-1 sm:left-2 w-[45%] bg-[#FFFDF9] p-2.5 pb-6 rounded-sm shadow-[0_18px_35px_-12px_rgba(43,23,16,0.32)] border border-[#2B1710]/5"
                  style={{ transform: 'rotate(-7deg)' }}
                >
                  <div className="aspect-square rounded-[2px] overflow-hidden bg-[#E8D5C4]">
                    <img
                      src={SALES_PAGE_ASSETS.polaroid1}
                      alt="Close-up of two hands holding hands"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="font-serif italic text-xs text-[#5A1A2C] text-center mt-2">
                    &ldquo;remember this?&rdquo;
                  </div>
                </div>

                <div
                  className="absolute top-0 left-[27%] w-[47%] bg-[#FFFDF9] p-2.5 pb-6 rounded-sm shadow-[0_22px_42px_-12px_rgba(43,23,16,0.38)] border border-[#2B1710]/5 z-10"
                  style={{ transform: 'rotate(4deg)' }}
                >
                  <div className="aspect-square rounded-[2px] overflow-hidden bg-[#E8D5C4]">
                    <img
                      src={SALES_PAGE_ASSETS.polaroid2}
                      alt="Couple taking a sunlit selfie together"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="font-serif italic text-xs text-[#5A1A2C] text-center mt-2">
                    &ldquo;us, always&rdquo;
                  </div>
                </div>

                <div
                  className="absolute top-7 right-1 sm:right-2 w-[45%] bg-[#FFFDF9] p-2.5 pb-6 rounded-sm shadow-[0_18px_35px_-12px_rgba(43,23,16,0.32)] border border-[#2B1710]/5 z-20"
                  style={{ transform: 'rotate(-2deg)' }}
                >
                  <div className="aspect-square rounded-[2px] overflow-hidden bg-[#E8D5C4]">
                    <img
                      src={SALES_PAGE_ASSETS.polaroid3}
                      alt="Couple standing together at night with a city skyline"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="font-serif italic text-xs text-[#5A1A2C] text-center mt-2">
                    &ldquo;every little thing&rdquo;
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Section 1 Narrative Copy */}
            <div className="lg:col-span-7 bg-[#FFFBF6] border border-[#5A1A2C]/12 rounded-[28px] p-6 sm:p-9 shadow-md space-y-4 text-[16px] sm:text-[17px] leading-[1.75] text-[#2B1710]">
              <p>
                <strong className="text-[#5A1A2C]">Chasing Her</strong> gives you access to a simple, guided builder that lets you create a personalized digital love letter for the person you love.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                <div className="p-3.5 rounded-2xl bg-[#FBF3EA] border border-[#5A1A2C]/10 text-center">
                  <div className="text-xs uppercase tracking-wider text-[#B98A4E] font-bold mb-1">Zero Design</div>
                  <div className="text-sm font-semibold text-[#5A1A2C]">No designer needed</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FBF3EA] border border-[#5A1A2C]/10 text-center">
                  <div className="text-xs uppercase tracking-wider text-[#B98A4E] font-bold mb-1">Zero Coding</div>
                  <div className="text-sm font-semibold text-[#5A1A2C]">No programmer needed</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FBF3EA] border border-[#5A1A2C]/10 text-center">
                  <div className="text-xs uppercase tracking-wider text-[#B98A4E] font-bold mb-1">From The Heart</div>
                  <div className="text-sm font-semibold text-[#5A1A2C]">No pro writer needed</div>
                </div>
              </div>

              <p>
                Everything has already been designed to help you turn your feelings, your memories, and your favorite moments together into a romantic experience you can send directly to them.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#5A1A2C]/10">
                <p className="font-serif italic text-xl text-[#5A1A2C]">
                  You bring the love. Chasing Her turns it into something unforgettable.
                </p>
                <button
                  type="button"
                  onClick={() => openInstantCheckout()}
                  className="px-4 py-2 rounded-full bg-[#5A1A2C] text-[#FBF3EA] text-xs font-bold hover:bg-[#33101B] transition cursor-pointer shrink-0"
                >
                  Start Checkout →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2 — SEE IT FOR YOURSELF (Interactive Creator & Unboxing Reel)
          Replaces static placeholders with an interactive 5-scene motion reel
          + direct embedded live playable experiences for Chasing Her & Memories
         ===================================================================== */}
      <section
        ref={demoSectionRef}
        id="demonstration"
        className="py-16 md:py-24 px-4 sm:px-6 text-[#FBF3EA] relative overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, #1E060E 0%, #33101B 50%, #1F0710 100%)',
        }}
      >
        <div className="max-w-5xl mx-auto relative z-10">
          <InteractiveProductDemoReel
            partnerName={partnerName}
            customPin={customPin}
            customOpeningLine={customOpeningLine}
            pricePage={funnel.pricePage}
            chasingHerDemo={chasingHerDemo}
            memoriesDemo={memoriesDemo}
            showcaseMedia={showcaseMedia}
            onSelectProductAndCheckout={(prod) => openInstantCheckout(prod)}
            onOpenFullModal={(prod) => setLivePreviewModal(prod)}
          />
        </div>
      </section>

      {/* =====================================================================
          SECTION 3 — YOU'RE IN CONTROL OF YOUR CREATION
          Live Personalizer Sandbox + Hover-to-Play Interactive Edition Cards
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-[#F5E9DC]/85 border-b border-[#5A1A2C]/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              Section 03 · You&apos;re In Control Of Your Creation
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#2B1710] mb-4">
              Their gift doesn&apos;t have to look like everybody else&apos;s.
            </h2>
            <p className="text-[#7A5A47] text-base sm:text-lg leading-relaxed">
              Inside the <strong className="text-[#5A1A2C]">Chasing Her</strong> builder, you shape the message in your own words and add the personal touches that matter.{' '}
              <strong className="text-[#5A1A2C]">Try personalizing hers right now below:</strong>
            </p>
          </div>

          {/* Interactive Live Personalizer Sandbox */}
          <div className="bg-[#FFFBF6] rounded-[30px] border-2 border-[#B98A4E]/35 p-6 sm:p-8 md:p-10 shadow-[0_24px_60px_-20px_rgba(43,23,16,0.18)] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-12">
            {/* Left: Interactive Controls */}
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5DAD5] text-[#5A1A2C] text-xs font-bold uppercase tracking-wider">
                <Sliders className="w-3.5 h-3.5" />
                <span>Live Personalizer Preview</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B1710] mb-1">
                    1. Their First Name
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="e.g. Amara"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF3EA] border border-[#5A1A2C]/20 text-sm font-semibold text-[#5A1A2C] focus:outline-none focus:border-[#5A1A2C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1710] mb-1">
                    2. Secret Birthday PIN
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={customPin}
                    onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="140826"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF3EA] border border-[#5A1A2C]/20 font-mono text-sm font-bold text-[#5A1A2C] focus:outline-none focus:border-[#5A1A2C]"
                  />
                </div>
              </div>

              {/* 3. Flower Curtain Theme */}
              <div>
                <label className="block text-xs font-bold text-[#2B1710] mb-1.5">
                  3. Opening Flower Curtain Palette
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {FLOWER_THEMES.map((theme, idx) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedFlowerTheme(idx)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        selectedFlowerTheme === idx
                          ? 'border-[#5A1A2C] bg-[#F5DAD5]/50 shadow-2xs'
                          : 'border-[#2B1710]/12 bg-[#FBF3EA] hover:border-[#5A1A2C]/35'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {theme.colors.map((hex) => (
                          <span
                            key={hex}
                            className="w-3.5 h-3.5 rounded-full border border-black/10"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                      <div className="text-[11px] font-bold text-[#2B1710] line-clamp-1">
                        {theme.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Opening Line Preset */}
              <div>
                <label className="block text-xs font-bold text-[#2B1710] mb-1.5">
                  4. Choose or Type Their Opening Birthday Line
                </label>
                <div className="space-y-1.5">
                  {OPENING_LINE_PRESETS.map((line, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCustomOpeningLine(line)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition border cursor-pointer ${
                        customOpeningLine === line
                          ? 'bg-[#5A1A2C] text-[#FBF3EA] border-[#5A1A2C] font-semibold'
                          : 'bg-[#FBF3EA] text-[#2B1710] border-[#2B1710]/10 hover:bg-[#F5DAD5]/35'
                      }`}
                    >
                      &ldquo;{line}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Live Updating Gift Preview Card + Shareable Link */}
            <div className="lg:col-span-6">
              <div className="rounded-[24px] bg-gradient-to-b from-[#2A0812] via-[#3B0D1B] to-[#1D050C] text-[#FBF3EA] p-6 sm:p-7 border border-[#B98A4E]/45 shadow-2xl space-y-5">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#DCC397]" />
                    <span className="font-mono text-xs text-[#DCC397]">
                      chasingher.love/for-{sanitizedPartnerSlug}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDemoLink}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#DCC397] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedDemoLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDemoLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>

                <div className="text-center py-4 space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B98A4E]/20 border border-[#B98A4E]/40 text-[#DCC397] text-[11px] font-bold">
                    <span>🔒 Protected by PIN: {customPin || '140826'}</span>
                  </div>

                  <h3 className="font-serif text-2xl sm:text-3xl text-[#FBF3EA]">
                    Happy Birthday, <em className="italic text-[#DCC397]">{partnerName || 'My Love'}</em>
                  </h3>

                  <p className="font-serif italic text-sm sm:text-base text-[#F5DAD5]/90 max-w-md mx-auto">
                    &ldquo;{customOpeningLine}&rdquo;
                  </p>

                  <div className="flex items-center justify-center gap-2 pt-2">
                    <span className="text-[11px] text-[#DCC397]">
                      Opening Bloom: <strong>{FLOWER_THEMES[selectedFlowerTheme].name}</strong>
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-[#F5DAD5]/80">
                    Your creation gets its own <strong className="text-white">shareable link</strong> ready to send.
                  </div>
                  <button
                    type="button"
                    onClick={() => openInstantCheckout()}
                    className="w-full sm:w-auto px-5 py-3 rounded-full bg-gradient-to-r from-[#DCC397] to-[#B98A4E] text-[#2B1710] font-extrabold text-xs uppercase tracking-wider shadow-md hover:brightness-105 transition cursor-pointer shrink-0"
                  >
                    Lock In For {partnerName || 'Them'} ({funnel.pricePage}) →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Hover-to-Play Interactive Edition Cards (Replacing static bullet cards) */}
          <HoverToPlayEditionCards
            pricePage={funnel.pricePage}
            showcaseMedia={showcaseMedia}
            onPreviewLive={(prod) => setLivePreviewModal(prod)}
            onChooseEdition={(prod) => lockInAndScrollToForm(prod)}
          />
        </div>
      </section>

      {/* =====================================================================
          SECTION 4 — MORE THAN JUST A ONE-TIME GIFT
          Clearly shows how completing payment automatically redirects them
          into the standalone My Site Customer App + optional Custom Build.
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              Section 04 · More Than Just A One-Time Gift
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#2B1710] mb-4">
              Your creations. Accessible whenever you need them.
            </h2>
            <p className="text-[#7A5A47] text-base sm:text-lg leading-relaxed">
              The moment your payment is confirmed, you are automatically redirected to your standalone{' '}
              <strong className="text-[#5A1A2C]">My Site Customer App</strong> — your private portal to launch the builder, track your live link, and create future surprises.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Standalone Customer App Post-Payment Journey */}
            <div className="lg:col-span-7 bg-[#FFFBF6] rounded-[28px] border border-[#5A1A2C]/15 p-6 sm:p-8 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5DAD5] text-[#5A1A2C] text-xs font-bold uppercase tracking-wider">
                    <Smartphone className="w-3.5 h-3.5" />
                    Unlocked Immediately After Payment
                  </span>
                  <span className="text-xs font-semibold text-[#7A5A47]">
                    Installable Mobile &amp; Desktop App
                  </span>
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl text-[#2B1710] mb-3">
                  How your standalone <em className="italic text-[#5A1A2C]">My Site</em> App works after checkout:
                </h3>

                {/* 3-Step Post-Payment Visual Flow */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
                  <div className="p-3.5 rounded-2xl bg-[#FBF3EA] border border-[#5A1A2C]/12">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#B98A4E] mb-1">
                      01 · Checkout
                    </div>
                    <div className="text-xs font-bold text-[#2B1710] mb-1">
                      Lock in for {funnel.pricePage}
                    </div>
                    <p className="text-[11px] text-[#7A5A47]">
                      Pay securely via Mobile Money, M-PESA, Transfer, or Card.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FBF3EA] border border-[#5A1A2C]/12">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#B98A4E] mb-1">
                      02 · Auto-Redirect
                    </div>
                    <div className="text-xs font-bold text-[#2B1710] mb-1">
                      Enter My Site App
                    </div>
                    <p className="text-[11px] text-[#7A5A47]">
                      You are redirected straight into your standalone customer portal.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#5A1A2C] text-[#FBF3EA]">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#DCC397] mb-1">
                      03 · Build &amp; Share
                    </div>
                    <div className="text-xs font-bold text-white mb-1">
                      Customize &amp; Send Link
                    </div>
                    <p className="text-[11px] text-[#F5DAD5]/85">
                      Build at your pace (48h auto-save) and copy their private link.
                    </p>
                  </div>
                </div>

                {/* Visual Mockup of the Standalone My Site Dashboard */}
                <div className="rounded-2xl bg-[#1E070E] text-[#FBF3EA] p-4 sm:p-5 border border-[#B98A4E]/35 space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2.5">
                    <span className="font-serif italic text-[#DCC397] text-sm">
                      My Site · Standalone Customer App Preview
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[11px] font-bold">
                      ● Unlocked Post-Payment
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-[10px] text-center">
                    <div className="p-1.5 rounded bg-[#5A1A2C] text-[#DCC397] font-bold">1. Paid ✓</div>
                    <div className="p-1.5 rounded bg-[#5A1A2C] text-[#DCC397] font-bold">2. Builder ✓</div>
                    <div className="p-1.5 rounded bg-[#5A1A2C] text-[#DCC397] font-bold">3. Review ✓</div>
                    <div className="p-1.5 rounded bg-[#B98A4E] text-[#2B1710] font-extrabold">4. Live Link</div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <div>
                      <span className="text-[#F5DAD5]/70">Your Shareable Link: </span>
                      <span className="font-mono text-[#DCC397]">
                        chasingher.love/for-{sanitizedPartnerSlug}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-white/10 text-[#FBF3EA] font-mono text-[11px]">
                      PIN: {customPin || '140826'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#5A1A2C]/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#7A5A47]">
                <span>Keep track of all your creations &amp; come back anytime</span>
                <button
                  type="button"
                  onClick={() => openInstantCheckout('chasing-her')}
                  className="font-bold text-[#5A1A2C] underline cursor-pointer"
                >
                  Unlock My Site Access Now →
                </button>
              </div>
            </div>

            {/* Optional Custom-Build Service Card */}
            <div className="lg:col-span-5 bg-gradient-to-b from-[#5A1A2C] to-[#2B0A14] text-[#FBF3EA] rounded-[28px] p-6 sm:p-8 border border-[#B98A4E]/45 shadow-xl flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B98A4E]/25 border border-[#B98A4E]/40 text-[#DCC397] text-xs font-bold uppercase tracking-wider mb-4">
                  <Wand2 className="w-3.5 h-3.5" />
                  Concierge Custom-Build Option
                </span>

                <h3 className="font-serif text-2xl sm:text-3xl text-[#FBF3EA] mb-3">
                  Don&apos;t have the time to build it yourself? Let our team create it for you.
                </h3>

                <p className="text-sm sm:text-base text-[#F5DAD5]/90 leading-relaxed mb-5">
                  And if you don&apos;t have the time to build it yourself, or you want our team to create something even more custom for your lover, you can also request our{' '}
                  <strong className="text-[#DCC397]">custom-build service</strong> for an additional fee.
                </p>

                <ul className="space-y-2.5 text-xs sm:text-sm text-[#FBF3EA]/90 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DCC397] shrink-0 mt-0.5" />
                    <span>Complete checkout &amp; submit your photos + notes inside My Site</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DCC397] shrink-0 mt-0.5" />
                    <span>Our writers &amp; designers polish your letter and assemble the entire page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#DCC397] shrink-0 mt-0.5" />
                    <span>Track live build stages in My Site — delivered within 24 hours</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-white/15 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs uppercase tracking-wider text-[#DCC397]">Done-For-You Concierge</span>
                  <span className="font-serif text-2xl font-bold text-[#DCC397]">{funnel.priceCustom}</span>
                </div>
                <button
                  type="button"
                  data-pick="custom"
                  onClick={() => openInstantCheckout('custom')}
                  className="w-full py-3.5 px-5 rounded-full bg-[#DCC397] hover:bg-[#B98A4E] text-[#2B1710] font-extrabold text-sm transition cursor-pointer"
                >
                  Choose &ldquo;Build it for me&rdquo; ({funnel.priceCustom}) →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 5 — WHAT YOU CAN USE CHASING HER FOR
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-[#F5E9DC]/80 border-y border-[#5A1A2C]/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              Section 05 · Every Romantic Moment
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#2B1710] mb-3">
              A birthday is just the beginning.
            </h2>
            <p className="text-[#7A5A47] text-base sm:text-lg">
              You can use <strong className="text-[#5A1A2C]">Chasing Her</strong> whenever you want to create a deeply personal romantic surprise:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {OCCASION_CARDS.map((card) => (
              <div
                key={card.title}
                className="bg-[#FFFBF6] rounded-[26px] p-6 sm:p-8 border border-[#5A1A2C]/15 shadow-sm hover:shadow-md transition flex flex-col justify-between relative overflow-hidden"
              >
                <div className="font-serif text-5xl text-[#B98A4E]/15 absolute top-4 right-6 select-none">
                  {card.roman}
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B98A4E] block mb-2">
                    {card.tag}
                  </span>
                  <h3 className="font-serif text-2xl text-[#5A1A2C] mb-2.5">{card.title}</h3>
                  <p className="text-sm sm:text-base text-[#2B1710] leading-relaxed mb-5">
                    {card.description}
                  </p>
                </div>
                <div className="pt-3.5 border-t border-[#5A1A2C]/10 flex items-center justify-between text-xs font-semibold text-[#7A5A47]">
                  <span>{card.accent}</span>
                  <button
                    type="button"
                    onClick={() => openInstantCheckout('chasing-her')}
                    className="text-[#5A1A2C] font-bold hover:underline cursor-pointer"
                  >
                    Create for this →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 6 — HEAR FROM PEOPLE WHO HAVE EXPERIENCED IT
          Includes real WhatsApp Midnight Reaction threads + Story Cards
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              Section 06 · Hear From People Who Have Experienced It
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#2B1710] mb-3">
              What did they think of <em className="italic text-[#5A1A2C]">Chasing Her</em>?
            </h2>
            <p className="text-[#7A5A47] text-base sm:text-lg">
              See how thoughtful lovers created their surprise, the exact messages they got back at midnight, and what the finished creations looked like.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {reviewShowcaseCards.map((item, idx) => (
              <div
                key={idx}
                className="bg-[#FFFBF6] rounded-[26px] border border-[#5A1A2C]/15 shadow-md overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="bg-gradient-to-br from-[#5A1A2C] to-[#2B0A14] p-5 text-[#FBF3EA] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#DCC397]">
                        {item.badge}
                      </span>
                      <span className="text-[#DCC397] text-xs">★★★★★</span>
                    </div>

                    {/* Simulated Midnight WhatsApp Reaction Bubble */}
                    <div className="space-y-1.5 pt-1">
                      <div className="ml-6 p-2.5 rounded-2xl rounded-tr-xs bg-[#005C4B] text-[11px] text-white leading-snug">
                        {item.whatsappSent}
                      </div>
                      <div className="mr-6 p-2.5 rounded-2xl rounded-tl-xs bg-[#1F2C34] text-[11px] text-emerald-100 leading-snug border border-white/10">
                        {item.whatsappReply}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#B98A4E]">
                      {item.roleLabel}
                    </div>
                    <h3 className="font-serif italic text-lg sm:text-xl text-[#5A1A2C] leading-snug">
                      {item.headline}
                    </h3>
                    <p className="text-sm text-[#2B1710] leading-relaxed">{item.body}</p>
                  </div>
                </div>

                <div className="px-6 pb-6 pt-3 border-t border-[#5A1A2C]/10 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-[#2B1710]">{item.author}</div>
                    <div className="text-xs text-[#7A5A47]">
                      {item.location}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLivePreviewModal(item.previewTarget)}
                    className="px-3 py-1.5 rounded-full bg-[#F5DAD5] hover:bg-[#E1A6A3] text-[#5A1A2C] font-bold text-xs transition shrink-0 cursor-pointer"
                  >
                    Inspect Creation
                  </button>
                </div>
              </div>
            ))}
          </div>

          {showAllReviews && testimonials.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-[#FFFBF6] border border-[#5A1A2C]/12 shadow-xs space-y-2"
                >
                  <div className="text-xs text-[#B98A4E]">★★★★★</div>
                  <p className="text-sm text-[#2B1710] italic">&ldquo;{t.quote}&rdquo;</p>
                  <div className="text-xs font-bold text-[#5A1A2C]">
                    — {t.customer_name} ({t.location})
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowAllReviews((prev) => !prev)}
              className="px-6 py-3 rounded-full bg-[#FFFBF6] border border-[#5A1A2C]/25 text-[#5A1A2C] font-bold text-xs sm:text-sm hover:bg-[#F5DAD5]/45 transition cursor-pointer"
            >
              {showAllReviews ? 'HIDE EXTRA CUSTOMER EXPERIENCES' : '[SEE MORE CUSTOMER EXPERIENCES]'}
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 7 — YOUR CHASING HER ACCESS (Luxury Wine & Gold Vault Pass)
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-[#F5E9DC]/70 border-t border-[#5A1A2C]/10">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              Section 07 · Your Chasing Her Access
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#2B1710]">
              Everything you need to start creating your romantic surprise.
            </h2>
          </div>

          <div
            className="rounded-[32px] p-7 sm:p-10 md:p-12 text-[#FBF3EA] border-2 border-[#B98A4E]/45 shadow-[0_28px_65px_-20px_rgba(51,16,27,0.55)] relative overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #5A1A2C 0%, #280913 100%)',
            }}
          >
            <div
              className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(220,195,151,0.22), transparent 65%)',
              }}
            />

            <span className="inline-block px-3.5 py-1 rounded-full bg-[#DCC397]/15 border border-[#DCC397]/40 text-[#DCC397] text-[11px] font-bold uppercase tracking-widest mb-5">
              Birthday Campaign Access Pass · {countryConfig.flag} {countryConfig.name}
            </span>

            <p className="text-base sm:text-lg text-[#F5DAD5] mb-5">
              When you get access to <strong className="text-white">Chasing Her</strong>, you get:
            </p>

            <ul className="space-y-3.5 text-sm sm:text-base mb-7">
              <li className="flex items-start gap-3">
                <span className="text-[#DCC397] font-bold text-lg leading-none mt-0.5">✓</span>
                <span>
                  <strong className="text-white">The Chasing Her Builder</strong> — to design and customize your love letter (choose <em>Chasing Her</em> or <em>Memories</em>)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#DCC397] font-bold text-lg leading-none mt-0.5">✓</span>
                <span>
                  <strong className="text-white">Your Standalone Customer App (My Site)</strong> — automatically unlocked &amp; redirected to right after payment
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#DCC397] font-bold text-lg leading-none mt-0.5">✓</span>
                <span>
                  <strong className="text-white">Your Personalized Experience</strong> — built with your words, memories, opening flowers, and romantic touches
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#DCC397] font-bold text-lg leading-none mt-0.5">✓</span>
                <span>
                  <strong className="text-white">A Shareable Link</strong> — protected by a secret PIN so you can easily send it to your lover
                </span>
              </li>
              <li className="flex items-start gap-3 pt-2 border-t border-white/10">
                <span className="text-[#DCC397] font-bold text-lg leading-none mt-0.5">★</span>
                <span>
                  <strong className="text-[#DCC397]">48 hours</strong> to build at your own pace (auto-saved) +{' '}
                  <strong className="text-[#DCC397]">30 days</strong> of live hosting +{' '}
                  <strong className="text-[#DCC397]">Free edits</strong> until you love it
                </span>
              </li>
            </ul>

            <div className="p-4 rounded-2xl bg-white/8 border border-white/15 text-xs sm:text-sm text-[#F5DAD5] mb-7">
              Prefer our team to build the entire experience for you? Select our{' '}
              <strong className="text-[#DCC397]">Custom-Build Service ({funnel.priceCustom})</strong> during checkout.
            </div>

            <div className="flex flex-wrap items-baseline gap-3 mb-2">
              <span className="font-serif text-4xl sm:text-5xl font-bold text-[#DCC397]">
                {funnel.pricePage}
              </span>
              <span className="text-lg line-through text-[#FBF3EA]/45">{funnel.priceWas}</span>
              <span className="px-2.5 py-1 rounded-full bg-[#DCC397] text-[#33101B] text-[11px] font-extrabold uppercase tracking-wider">
                75% Off Campaign Price
              </span>
            </div>
            <p className="text-xs text-[#FBF3EA]/75 mb-7">
              One-time payment · Instant redirect to My Site · {countryConfig.paymentMethodsLabel}
            </p>

            <button
              type="button"
              onClick={() => openInstantCheckout('chasing-her')}
              className="w-full py-4 px-6 rounded-full bg-gradient-to-b from-[#DCC397] to-[#B98A4E] text-[#2B1710] font-extrabold text-base shadow-lg hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>[CREATE MY LOVE LETTER]</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 8 — BEFORE YOU GET STARTED (FAQ)
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              Section 08 · Before You Get Started
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#2B1710]">
              Quick answers before you start
            </h2>
          </div>

          <div className="space-y-3">
            {BIRTHDAY_FAQS.map((item, idx) => (
              <details
                key={idx}
                open={idx === 0}
                className="group bg-[#FFFBF6] border border-[#5A1A2C]/14 rounded-2xl px-5 py-4 shadow-2xs"
              >
                <summary className="font-serif text-base sm:text-lg font-medium text-[#2B1710] cursor-pointer list-none flex items-center justify-between gap-3">
                  <span>{item.q}</span>
                  <span className="text-[#B98A4E] text-xl font-normal transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-2.5 text-sm sm:text-[15px] text-[#7A5A47] leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
      </>
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
              <span>[CREATE YOUR LOVE LETTER NOW]</span>
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
              Section 09 · The Final Push
            </span>

            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#2B1710] mb-4">
              Their birthday is coming. And the question is...{' '}
              <em className="italic text-[#5A1A2C]">What are you going to give them?</em>
            </h2>

            <div className="space-y-3 text-base sm:text-lg text-[#7A5A47] max-w-xl mx-auto mb-7 leading-relaxed">
              <p>Something ordinary?</p>
              <p>Or something thoughtful, romantic, and unforgettable?</p>
              <p className="text-[#2B1710] font-medium">
                Something that makes them feel deeply loved... and proud to show the people around them what you did for them?
              </p>
              <p className="font-serif italic text-2xl text-[#5A1A2C] font-semibold pt-1">
                Create it with Chasing Her.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openInstantCheckout()}
              className="inline-flex items-center justify-center gap-2 py-4 px-7 rounded-full bg-gradient-to-b from-[#6E2236] to-[#5A1A2C] text-[#FBF3EA] font-bold text-sm sm:text-base shadow-[0_14px_30px_-10px_rgba(90,26,44,0.55)] hover:-translate-y-0.5 transition cursor-pointer"
            >
              <span>[CREATE YOUR PERSONALIZED LOVE LETTER NOW]</span>
            </button>
            <p className="font-serif italic text-sm text-[#5A1A2C] mt-2.5">
              Make it personal. Make it romantic. Make it yours.
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
          CLEAN ROMANTIC FOOTER (No Premature App Portal Links)
         ===================================================================== */}
      <footer className="py-10 px-5 bg-[#F5E9DC] border-t border-[#5A1A2C]/10 text-center text-xs text-[#7A5A47]">
        <div className="max-w-4xl mx-auto space-y-2">
          <div className="font-serif italic text-base text-[#5A1A2C]">
            Chasing Her ♥ Made with love for thoughtful lovers in Ghana, Kenya &amp; Nigeria
          </div>
          <p className="text-[11px] text-[#7A5A47]">
            © {new Date().getFullYear()} Chasing Her · Private Digital Love Letters &amp; Keepsakes
          </p>
        </div>
      </footer>

      {/* =====================================================================
          PERSISTENT FLOATING CHECKOUT DOCK (Desktop & Mobile)
          Allows moving to checkout from ANY scroll position on the long page!
         ===================================================================== */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-[#1F060E]/95 backdrop-blur-md border-t border-[#B98A4E]/40 px-4 py-2.5 shadow-[0_-12px_35px_rgba(27,6,13,0.45)]">
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
          SUBTLE ACTIVITY BUMP TOAST
         ===================================================================== */}
      <div
        aria-live="polite"
        className={`fixed left-4 bottom-20 z-20 bg-[#FFFBF6] border border-[#5A1A2C]/15 rounded-full px-3.5 py-2 shadow-lg flex items-center gap-2 text-xs text-[#2B1710] transition-all duration-300 pointer-events-none ${
          bumpToast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
        <span>
          Someone in <strong>{bumpToast.city}</strong> just unlocked <strong>{bumpToast.template}</strong>
        </span>
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
                    Express Birthday Checkout · {countryConfig.flag} {countryConfig.name}
                  </span>
                  <h2 className="font-serif text-2xl text-[#5A1A2C]">
                    Lock In Their Romantic Surprise
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
