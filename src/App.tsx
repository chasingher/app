import React, { useState, useEffect } from 'react';
import {
  Heart,
  Sparkles,
  UserCheck,
  Wand2,
} from 'lucide-react';
import {
  ACTIVE_COUNTRIES,
  CountryCode,
  resolveCountryFromLocation,
  ChasingHerProjectData,
  MemoriesProjectData,
  MusicLibraryTrack,
  ShowcaseMediaMap,
} from './utils/platformLogic';
import {
  INITIAL_ORDERS,
  INITIAL_CHASING_HER_PROJECTS,
  INITIAL_MEMORIES_PROJECTS,
  INITIAL_TESTIMONIALS,
  DEFAULT_FLOWER_POOL,
  INITIAL_MUSIC_LIBRARY,
  INITIAL_SHOWCASE_MEDIA,
  SubmissionOrder,
  TestimonialItem,
} from './utils/supabaseAndOci';
import {
  fetchPlatformSettingsFromFirestore,
  saveOrderToFirestore,
} from './utils/firebaseClient';
import { OrderLandingView } from './components/OrderLandingView';
import { CustomerMySiteView } from './components/CustomerMySiteView';
import { SiteBuilderStudio } from './components/SiteBuilderStudio';
import { UnifiedAdminBackstageView } from './components/UnifiedAdminBackstageView';
import { RecipientSitePreview } from './components/RecipientSitePreview';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallPrompt';

type AppView = 'order' | 'builder' | 'my-site' | 'admin' | 'preview';

export function App() {
  const [activeView, setActiveView] = useState<AppView>(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('view');
    if (v === 'my-site' || v === 'admin' || v === 'builder' || v === 'preview') {
      return v;
    }
    return 'order';
  });

  const [country, setCountry] = useState<CountryCode>(() =>
    resolveCountryFromLocation(window.location.search, window.location.pathname)
  );

  const [autoStart] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1';
  });

  const [orders, setOrders] = useState<SubmissionOrder[]>(INITIAL_ORDERS);
  const [chasingHerProjects, setChasingHerProjects] = useState<
    Record<string, ChasingHerProjectData>
  >(INITIAL_CHASING_HER_PROJECTS);
  const [memoriesProjects, setMemoriesProjects] = useState<
    Record<string, MemoriesProjectData>
  >(INITIAL_MEMORIES_PROJECTS);
  const [globalFlowerPool, setGlobalFlowerPool] = useState<string[]>(DEFAULT_FLOWER_POOL);
  const [musicLibrary, setMusicLibrary] = useState<MusicLibraryTrack[]>(INITIAL_MUSIC_LIBRARY);
  const [showcaseMedia, setShowcaseMedia] = useState<ShowcaseMediaMap>(INITIAL_SHOWCASE_MEDIA);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(INITIAL_TESTIMONIALS);
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({
    price_page: '50 GHC',
    price_was: '200 GHC',
    price_custom: '80 GHC',
    ke_price_page: 'KSh 650',
    ke_price_was: 'KSh 2,500',
    ke_price_custom: 'KSh 1,200',
    ng_price_page: '₦5,000',
    ng_price_was: '₦20,000',
    ng_price_custom: '₦7,500',
  });

  const [builderProduct, setBuilderProduct] = useState<'chasing-her' | 'memories'>('chasing-her');
  const [builderSlug, setBuilderSlug] = useState<string>('ama-and-kofi');
  const [justPaidOrderId, setJustPaidOrderId] = useState<string | null>(null);

  // Sync URL query params for deep links & PWA shortcuts
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', activeView);
    url.searchParams.set('country', country);
    window.history.replaceState({}, '', url.toString());
  }, [activeView, country]);

  // Background non-blocking hydration from Firebase Firestore
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const remoteSettings = await fetchPlatformSettingsFromFirestore();
        if (mounted && Object.keys(remoteSettings).length > 0) {
          setSettingsMap((prev) => ({ ...prev, ...remoteSettings }));
        }
      } catch {
        // Offline-first fallback already active
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleOrderCreated = (
    newOrder: SubmissionOrder,
    destination: 'builder' | 'brief' | 'my-site'
  ) => {
    try {
      if (newOrder.email) {
        localStorage.setItem('cust_email', newOrder.email.trim().toLowerCase());
      }
    } catch {
      // Ignore storage errors
    }

    setOrders((prev) => [newOrder, ...prev]);
    setJustPaidOrderId(newOrder.id);

    void saveOrderToFirestore(newOrder).catch(() => {});

    const targetBuildProduct: 'chasing-her' | 'memories' =
      newOrder.product === 'memories' || newOrder.build_product === 'memories'
        ? 'memories'
        : 'chasing-her';

    // Seed a personalized starter project for this customer's slug
    if (targetBuildProduct === 'chasing-her') {
      const template = chasingHerProjects['ama-and-kofi'] || Object.values(chasingHerProjects)[0];
      if (template && !chasingHerProjects[newOrder.slug]) {
        const partnerLabel = newOrder.brief?.for || 'My Love';
        setChasingHerProjects((prev) => ({
          ...prev,
          [newOrder.slug]: {
            ...template,
            slug: newOrder.slug,
            pin: newOrder.pin || template.pin,
            intro_message:
              newOrder.brief?.feel && newOrder.brief.feel.length > 6
                ? newOrder.brief.feel
                : `Happy Birthday, ${partnerLabel} — every ordinary day becomes unforgettable because you are in it.`,
            letter_title: `My Dearest ${partnerLabel},`,
          },
        }));
      }
    } else {
      const template = memoriesProjects['wanjiku-and-brian'] || Object.values(memoriesProjects)[0];
      if (template && !memoriesProjects[newOrder.slug]) {
        const partnerLabel = newOrder.brief?.for || 'My Love';
        setMemoriesProjects((prev) => ({
          ...prev,
          [newOrder.slug]: {
            ...template,
            slug: newOrder.slug,
            pin: newOrder.pin || template.pin,
            hero_title: `Happy Birthday, ${partnerLabel}`,
            collage_names: `${partnerLabel} & ${newOrder.full_name.split(' ')[0]}`,
            letter_title: `Happy Birthday, ${partnerLabel},`,
          },
        }));
      }
    }

    setBuilderProduct(targetBuildProduct);
    setBuilderSlug(newOrder.slug);

    if (destination === 'builder') {
      setActiveView('builder');
    } else {
      setActiveView('my-site');
    }
  };

  const handleSaveChasingHer = (slug: string, data: ChasingHerProjectData) => {
    setChasingHerProjects((prev) => ({
      ...prev,
      [slug]: data,
    }));
  };

  const handleSaveMemories = (slug: string, data: MemoriesProjectData) => {
    setMemoriesProjects((prev) => ({
      ...prev,
      [slug]: data,
    }));
  };

  const handleDeleteProject = (product: 'chasing-her' | 'memories', slug: string) => {
    if (product === 'chasing-her') {
      setChasingHerProjects((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
    } else {
      setMemoriesProjects((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
    }
  };

  const handleUpdateOrder = (updatedOrder: SubmissionOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    void saveOrderToFirestore(updatedOrder).catch(() => {});
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  const handleAdminCreateOrder = (newOrder: SubmissionOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
    void saveOrderToFirestore(newOrder).catch(() => {});
  };

  const handleMarkPaymentReturned = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const paid: SubmissionOrder = {
          ...o,
          status: 'paid',
          returned_from_payment_at: new Date().toISOString(),
        };
        void saveOrderToFirestore(paid).catch(() => {});
        return paid;
      })
    );
  };

  // Resolve the active customer order for builderSlug so the customer is strictly locked to the edition they paid for
  const activeCustomerOrder =
    orders.find((o) => o.slug === builderSlug) ||
    (justPaidOrderId ? orders.find((o) => o.id === justPaidOrderId) : undefined);

  const lockedCustomerProduct: 'chasing-her' | 'memories' = activeCustomerOrder
    ? activeCustomerOrder.product === 'memories' ||
      activeCustomerOrder.build_product === 'memories'
      ? 'memories'
      : 'chasing-her'
    : builderProduct;

  return (
    <div className="min-h-screen bg-[#120408] text-[#FBF3EA] flex flex-col">
      <OfflineIndicator />

      {/* Clean 3-Zone Top Bar (Shown on My Site, Builder, and Preview; Admin owns its full sidebar shell; Sales Page owns its editorial header) */}
      {activeView !== 'order' && activeView !== 'admin' && (
        <header className="sticky top-0 z-40 h-16 bg-[#16050A]/92 backdrop-blur-md border-b border-[#E2B96F]/15">
          <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
            {/* Zone 1: Single-element Brand Wordmark */}
            <button
              type="button"
              onClick={() => setActiveView('my-site')}
              className="font-serif text-xl sm:text-2xl text-[#FBF3EA] tracking-tight flex items-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0 hover:text-[#E2B96F] transition-colors"
            >
              <Heart className="w-5 h-5 text-[#E2B96F] fill-[#E2B96F]/25 shrink-0" />
              <span>Chasing Her</span>
            </button>

            {/* Zone 2: Concise Single-Line Navigation Links */}
            <nav
              aria-label="Primary application navigation"
              className="hidden md:flex items-center gap-7"
            >
              <button
                type="button"
                onClick={() => setActiveView('my-site')}
                className={`text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 py-1 border-b-2 ${
                  activeView === 'my-site'
                    ? 'border-[#E2B96F] text-[#E2B96F]'
                    : 'border-transparent text-[#FBF3EA]/70 hover:text-[#FBF3EA]'
                }`}
              >
                My Site
              </button>

              <button
                type="button"
                onClick={() => setActiveView('builder')}
                className={`text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 py-1 border-b-2 ${
                  activeView === 'builder'
                    ? 'border-[#E2B96F] text-[#E2B96F]'
                    : 'border-transparent text-[#FBF3EA]/70 hover:text-[#FBF3EA]'
                }`}
              >
                Website Builder
              </button>

              <button
                type="button"
                onClick={() => setActiveView('order')}
                className="text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent text-[#FBF3EA]/65 hover:text-[#E2B96F]"
              >
                Order a Gift
              </button>
            </nav>

            {/* Zone 3: Regional Switcher & Primary Install Action */}
            <div className="flex items-center gap-3 shrink-0">
              <div
                className="flex items-center bg-[#0D0205] rounded-lg p-1 border border-[#E2B96F]/20"
                role="group"
                aria-label="Select country market"
              >
                {ACTIVE_COUNTRIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCountry(c)}
                    className={`min-h-[32px] px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      country === c
                        ? 'bg-[#E2B96F] text-[#16050A]'
                        : 'text-[#FBF3EA]/65 hover:text-[#FBF3EA]'
                    }`}
                  >
                    {c === 'gh' ? 'GH' : 'KE'}
                  </button>
                ))}
              </div>

              <div className="hidden sm:block">
                <PWAInstallButton contextLabel="My Site" variant="compact" />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main View Viewport */}
      <main className="flex-1">
        {activeView === 'order' && (
          <OrderLandingView
            country={country}
            onChangeCountry={setCountry}
            settingsMap={settingsMap}
            testimonials={testimonials}
            showcaseMedia={showcaseMedia}
            chasingHerDemo={chasingHerProjects['ama-and-kofi'] || Object.values(chasingHerProjects)[0]}
            memoriesDemo={memoriesProjects['wanjiku-and-brian'] || Object.values(memoriesProjects)[0]}
            onOrderCreated={handleOrderCreated}
            onOpenMySite={() => setActiveView('my-site')}
            onOpenAdmin={() => setActiveView('admin')}
          />
        )}

        {activeView === 'builder' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24">
            <SiteBuilderStudio
              mode="customer"
              initialProduct={lockedCustomerProduct}
              activeSlug={builderSlug}
              chasingHerProjects={chasingHerProjects}
              memoriesProjects={memoriesProjects}
              onSaveChasingHer={handleSaveChasingHer}
              onSaveMemories={handleSaveMemories}
              onBackToAccount={() => setActiveView('my-site')}
              globalFlowerPool={globalFlowerPool}
              globalMusicLibrary={musicLibrary}
            />
          </div>
        )}

        {activeView === 'my-site' && (
          <div className="px-4 sm:px-6 py-8">
            <CustomerMySiteView
              orders={orders}
              justPaidOrderId={justPaidOrderId}
              settingsMap={settingsMap}
              chasingHerProjects={chasingHerProjects}
              memoriesProjects={memoriesProjects}
              onOpenBuilder={(order) => {
                const prod =
                  order.product === 'memories' || order.build_product === 'memories'
                    ? 'memories'
                    : 'chasing-her';
                setBuilderProduct(prod);
                setBuilderSlug(order.slug);
                setActiveView('builder');
              }}
              onMarkPaymentReturned={handleMarkPaymentReturned}
            />
          </div>
        )}

        {activeView === 'admin' && (
          <UnifiedAdminBackstageView
            orders={orders}
            onUpdateOrder={handleUpdateOrder}
            onCreateOrder={handleAdminCreateOrder}
            onDeleteOrder={handleDeleteOrder}
            chasingHerProjects={chasingHerProjects}
            memoriesProjects={memoriesProjects}
            onSaveChasingHer={handleSaveChasingHer}
            onSaveMemories={handleSaveMemories}
            onDeleteProject={handleDeleteProject}
            settingsMap={settingsMap}
            onUpdateSettingsMap={setSettingsMap}
            globalFlowerPool={globalFlowerPool}
            onUpdateFlowerPool={setGlobalFlowerPool}
            musicLibrary={musicLibrary}
            onUpdateMusicLibrary={setMusicLibrary}
            showcaseMedia={showcaseMedia}
            onUpdateShowcaseMedia={setShowcaseMedia}
            testimonials={testimonials}
            onUpdateTestimonials={setTestimonials}
            onNavigateView={(view) => setActiveView(view)}
            autoUnlock={autoStart}
          />
        )}

        {activeView === 'preview' && (
          <div className="max-w-5xl mx-auto px-4 py-8">
            <RecipientSitePreview
              product={builderProduct}
              chasingHerData={chasingHerProjects[builderSlug]}
              memoriesData={memoriesProjects[builderSlug]}
              bypassPinByDefault={autoStart}
              onClose={() => setActiveView('my-site')}
            />
          </div>
        )}
      </main>

      {/* Mobile Standalone Customer App Navigation (Shown inside My Site, Builder, and Preview) */}
      {activeView !== 'admin' && activeView !== 'order' && (
        <nav
          aria-label="Mobile customer app navigation"
          className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#1A060B]/95 backdrop-blur-md border-t border-[#E2B96F]/25 px-3 py-1.5 grid grid-cols-3 gap-2"
        >
          <button
            type="button"
            onClick={() => setActiveView('my-site')}
            className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition cursor-pointer ${
              activeView === 'my-site'
                ? 'bg-[#E2B96F]/20 text-[#E2B96F]'
                : 'text-[#FBF3EA]/70'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>My Site</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('builder')}
            className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition cursor-pointer ${
              activeView === 'builder'
                ? 'bg-[#E2B96F]/20 text-[#E2B96F]'
                : 'text-[#FBF3EA]/70'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>Builder Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('order')}
            className="min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition cursor-pointer text-[#FBF3EA]/70"
          >
            <Sparkles className="w-4 h-4" />
            <span>New Gift</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;
