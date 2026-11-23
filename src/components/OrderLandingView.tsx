import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  X,
  ShoppingBag,
} from 'lucide-react';
import {
  COUNTRIES,
  CountryCode,
  ProductType,
  resolveCountrySettings,
  resolveSalesCampaignFromLocation,
  ChasingHerProjectData,
  MemoriesProjectData,
  ShowcaseMediaMap,
  SiteExperienceShowcaseMap,
  DEFAULT_SITE_EXPERIENCES,
} from '../utils/platformLogic';
import {
  CHECKOUT_DIAL_COUNTRIES,
  CheckoutStepId,
  DialCountryOption,
} from '../utils/checkoutFlow';
import { EasyCheckoutFlow } from './EasyCheckoutFlow';
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
  const resolvedFallbackCampaign = resolveSalesCampaignFromLocation(
    window.location.search,
    window.location.pathname,
    import.meta.env.BASE_URL
  );
  const activeCampaign: SalesCampaignId =
    campaign || (resolvedFallbackCampaign === 'birthday' ? 'birthday' : 'reconcile');

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

  useEffect(() => {
    setCustomOpeningLine(
      activeCampaign === 'birthday'
        ? BIRTHDAY_OPENING_PRESETS[0]
        : RECONCILE_OPENING_PRESETS[0]
    );
  }, [activeCampaign]);

  // Checkout Flow State (Supports both Slide-Over Instant Checkout Drawer & Inline Bottom Form)
  const [checkoutDrawerOpen, setCheckoutDrawerOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStepId>('plan');
  const [pendingOrder, setPendingOrder] = useState<SubmissionOrder | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('mobile_money');
  const [submitting, setSubmitting] = useState(false);
  const [formHighlightPulse, setFormHighlightPulse] = useState(false);
  const [focusNameSignal, setFocusNameSignal] = useState(0);

  // Country dial code for WhatsApp input
  const [selectedDialOption, setSelectedDialOption] = useState<DialCountryOption>(
    () =>
      CHECKOUT_DIAL_COUNTRIES.find((d) => d.linkedCountry === country) ||
      CHECKOUT_DIAL_COUNTRIES[0]
  );

  // Fullscreen Sample Modal
  const [livePreviewModal, setLivePreviewModal] = useState<'chasing-her' | 'memories' | null>(null);
  const [copiedDemoLink, setCopiedDemoLink] = useState(false);

  // Reveal bottom checkout dock only after scrolling past the hero
  const [showStickyDock, setShowStickyDock] = useState(false);

  const orderFormRef = useRef<HTMLDivElement>(null);
  const demoSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const matched = CHECKOUT_DIAL_COUNTRIES.find((d) => d.linkedCountry === country);
    if (matched) {
      setSelectedDialOption(matched);
    }
  }, [country]);

  useEffect(() => {
    const onScroll = () => {
      const passedHero = window.scrollY > 420;
      let formInView = false;
      if (orderFormRef.current) {
        const rect = orderFormRef.current.getBoundingClientRect();
        formInView = rect.top < window.innerHeight - 60 && rect.bottom > 80;
      }
      setShowStickyDock(passedHero && !formInView);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!checkoutDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCheckoutDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [checkoutDrawerOpen]);

  // Open the Instant Slide-Over Checkout Drawer from anywhere on the page
  const openInstantCheckout = (pick?: ProductType) => {
    if (pick) {
      setSelectedProduct(pick);
      setCheckoutStep('details');
      setFocusNameSignal((n) => n + 1);
    } else {
      setCheckoutStep('plan');
    }
    setCheckoutDrawerOpen(true);
  };

  // Or smoothly scroll to the bottom inline #order-form
  const lockInAndScrollToForm = (pick?: ProductType) => {
    if (pick) {
      setSelectedProduct(pick);
      setCheckoutStep('details');
      setFocusNameSignal((n) => n + 1);
    } else {
      setCheckoutStep('plan');
    }
    setFormHighlightPulse(true);
    setTimeout(() => setFormHighlightPulse(false), 1500);
    orderFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToDemonstration = () => {
    demoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const handleDialOptionSelect = (opt: DialCountryOption) => {
    setSelectedDialOption(opt);
    if (opt.linkedCountry) {
      onChangeCountry(opt.linkedCountry);
    }
  };

  // Final Step of Checkout: Complete Payment & Automatically Redirect to Standalone My Site App
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

  const activePriceDisplay =
    selectedProduct === 'custom' ? funnel.priceCustom : funnel.pricePage;

  const renderCheckoutFlow = (idPrefix: 'inline' | 'drawer') => (
    <EasyCheckoutFlow
      idPrefix={idPrefix}
      country={country}
      countryConfig={countryConfig}
      pricePage={funnel.pricePage}
      priceCustom={funnel.priceCustom}
      selectedProduct={selectedProduct}
      onSelectProduct={setSelectedProduct}
      step={checkoutStep}
      onStepChange={setCheckoutStep}
      customerName={customerName}
      onCustomerNameChange={setCustomerName}
      customerEmail={customerEmail}
      onCustomerEmailChange={setCustomerEmail}
      customerPhone={customerPhone}
      onCustomerPhoneChange={setCustomerPhone}
      selectedDialOption={selectedDialOption}
      onSelectDialOption={handleDialOptionSelect}
      partnerName={partnerName}
      customPin={customPin}
      openingLine={customOpeningLine}
      pendingOrder={pendingOrder}
      onDraftOrderReady={setPendingOrder}
      selectedPaymentMethod={selectedPaymentMethod}
      onSelectPaymentMethod={setSelectedPaymentMethod}
      submitting={submitting}
      onCompletePayment={handleCompletePaymentAndRedirect}
      focusNameSignal={focusNameSignal}
    />
  );

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

        {/* INLINE ORDER CHECKOUT CARD (#order-form) */}
        <div
          id="order-form"
          ref={orderFormRef}
          className="max-w-lg mx-auto scroll-mt-20"
        >
          <div
            className={`bg-[#FFFBF6] rounded-[28px] p-6 sm:p-10 border border-[#5A1A2C]/14 shadow-[0_24px_60px_-24px_rgba(43,23,16,0.2)] transition-all ${
              formHighlightPulse ? 'ch-form-locked-highlight' : ''
            }`}
          >
            <div className="text-center mb-7 space-y-1.5">
              <p className="text-xs font-medium text-[#B98A4E]">
                Quick 3-step checkout · {countryConfig.name}
              </p>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#2B1710] text-balance">
                {activeCampaign === 'reconcile'
                  ? 'Start her love letter'
                  : 'Start their birthday surprise'}
              </h3>
            </div>

            {renderCheckoutFlow('inline')}
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
          showStickyDock && !checkoutDrawerOpen
            ? 'translate-y-0'
            : 'translate-y-full pointer-events-none'
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
          className="fixed inset-0 z-50 bg-[#16040A]/70 backdrop-blur-xs flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Quick Checkout"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setCheckoutDrawerOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md bg-[#FFFBF6] text-[#2B1710] h-full overflow-y-auto shadow-2xl border-l border-[#5A1A2C]/15 flex flex-col justify-between">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#2B1710]/10">
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-[#B98A4E]">
                    Quick checkout · {countryConfig.name}
                  </p>
                  <h2 className="font-serif text-2xl text-[#2B1710]">
                    {activeCampaign === 'reconcile'
                      ? 'Start her love letter'
                      : 'Start their birthday site'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutDrawerOpen(false)}
                  className="w-10 h-10 rounded-full bg-[#2B1710]/6 hover:bg-[#2B1710]/12 text-[#2B1710] flex items-center justify-center transition cursor-pointer shrink-0"
                  aria-label="Close checkout"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {renderCheckoutFlow('drawer')}
            </div>

            <div className="px-6 py-4 bg-[#F5EDE4]/70 border-t border-[#2B1710]/8 text-center text-xs text-[#6B4E3D]">
              Need help? WhatsApp support is ready inside My Site right after checkout.
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
