import React, { useState, useEffect } from 'react';
import {
  Heart,
  Lock,
  Sparkles,
  UserCheck,
  Wand2,
} from 'lucide-react';
import {
  ACTIVE_COUNTRIES,
  ActiveCountryCode,
  AppView,
  CountryCode,
  SalesCampaignId,
  resolveAppRouteFromLocation,
  buildAppRoutePath,
  normalizeActiveCountry,
  ChasingHerProjectData,
  MemoriesProjectData,
  MusicLibraryTrack,
  ShowcaseMediaMap,
  SiteExperienceShowcaseMap,
  SITE_EXPERIENCES_SETTING_KEY,
  mergeSiteExperiences,
  serializeSiteExperiences,
  PUBLIC_SHOWCASE_SLUGS,
  isPublicShowcaseProject,
  canCustomerAccessProjectSlug,
  canBypassPreviewPin,
} from './utils/platformLogic';
import {
  INITIAL_ORDERS,
  INITIAL_CHASING_HER_PROJECTS,
  INITIAL_MEMORIES_PROJECTS,
  OFFICIAL_CHASING_HER_SHOWCASE,
  OFFICIAL_MEMORIES_SHOWCASE,
  INITIAL_TESTIMONIALS,
  DEFAULT_FLOWER_POOL,
  INITIAL_MUSIC_LIBRARY,
  INITIAL_SHOWCASE_MEDIA,
  SubmissionOrder,
  TestimonialItem,
} from './utils/supabaseAndOci';
import type { User } from 'firebase/auth';
import {
  fetchPlatformSettingsFromFirestore,
  savePlatformSettingsToFirestore,
  saveOrderToFirestore,
  deleteOrderFromFirestore,
  saveChasingHerProjectToFirestore,
  saveMemoriesProjectToFirestore,
  deleteProjectFromFirestore,
  subscribeToFirebaseAuth,
  subscribeToFirestoreWorkspace,
  fetchFunnelSessionsFromFirestore,
  deleteFunnelSessionFromFirestore,
} from './utils/firebaseClient';
import {
  FunnelSessionRecord,
  FUNNEL_SESSIONS_STORAGE_KEY,
  loadLocalFunnelSessions,
  mergeFunnelSessions,
  removeLocalFunnelSession,
} from './utils/funnelTracking';
import { OrderLandingView } from './components/OrderLandingView';
import { InteractiveWinHerBackExperience } from './components/InteractiveWinHerBackExperience';
import { InteractiveBirthdayExperience } from './components/InteractiveBirthdayExperience';
import { CustomerMySiteView } from './components/CustomerMySiteView';
import { SiteBuilderStudio } from './components/SiteBuilderStudio';
import { UnifiedAdminBackstageView } from './components/UnifiedAdminBackstageView';
import { RecipientSitePreview } from './components/RecipientSitePreview';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallPrompt';
import {
  INTERACTIVE_CONFIG_SETTING_KEY,
  InteractiveSalesConfig,
  mergeInteractiveSalesConfig,
  serializeInteractiveSalesConfig,
} from './utils/interactiveSalesConfig';
import {
  BIRTHDAY_INTERACTIVE_SETTING_KEY,
  BirthdayInteractiveConfig,
  mergeBirthdayInteractiveConfig,
  serializeBirthdayInteractiveConfig,
} from './utils/birthdayInteractiveConfig';

const BASE_URL = import.meta.env.BASE_URL || '/';

export function App() {
  const initialRoute = resolveAppRouteFromLocation(
    window.location.pathname,
    window.location.search,
    BASE_URL
  );

  const [activeView, setActiveView] = useState<AppView>(initialRoute.view);
  const [salesCampaign, setSalesCampaign] = useState<SalesCampaignId>(initialRoute.campaign);
  const [country, setCountry] = useState<CountryCode>(initialRoute.country);

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
  const globalFlowerPool = DEFAULT_FLOWER_POOL;
  const [musicLibrary, setMusicLibrary] = useState<MusicLibraryTrack[]>(INITIAL_MUSIC_LIBRARY);
  const [showcaseMedia, setShowcaseMedia] = useState<ShowcaseMediaMap>(INITIAL_SHOWCASE_MEDIA);
  const [siteExperiences, setSiteExperiences] = useState<SiteExperienceShowcaseMap>(() => {
    try {
      return mergeSiteExperiences(localStorage.getItem(SITE_EXPERIENCES_SETTING_KEY));
    } catch {
      return mergeSiteExperiences(null);
    }
  });
  const [interactiveSalesConfig, setInteractiveSalesConfig] = useState<InteractiveSalesConfig>(() => {
    try {
      return mergeInteractiveSalesConfig(localStorage.getItem(INTERACTIVE_CONFIG_SETTING_KEY));
    } catch {
      return mergeInteractiveSalesConfig(null);
    }
  });
  const [birthdayInteractiveConfig, setBirthdayInteractiveConfig] =
    useState<BirthdayInteractiveConfig>(() => {
      try {
        return mergeBirthdayInteractiveConfig(
          localStorage.getItem(BIRTHDAY_INTERACTIVE_SETTING_KEY)
        );
      } catch {
        return mergeBirthdayInteractiveConfig(null);
      }
    });
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(INITIAL_TESTIMONIALS);
  const [funnelSessions, setFunnelSessions] = useState<FunnelSessionRecord[]>(() =>
    loadLocalFunnelSessions()
  );
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

  const [builderProduct, setBuilderProduct] = useState<'chasing-her' | 'memories'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('product') === 'memories' ? 'memories' : 'chasing-her';
  });
  const [builderSlug, setBuilderSlug] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const slugParam = params.get('slug');
    return slugParam && slugParam.trim() ? slugParam.trim() : '';
  });
  const [customerEmailSession, setCustomerEmailSession] = useState<string>(() => {
    try {
      return (localStorage.getItem('cust_email') || '').trim().toLowerCase();
    } catch {
      return '';
    }
  });
  const [justPaidOrderId, setJustPaidOrderId] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  const syncBrowserDirectoryUrl = (
    nextView: AppView,
    nextCampaign: SalesCampaignId,
    nextCountry: CountryCode,
    mode: 'push' | 'replace' = 'push',
    preservePreviewParams = false
  ) => {
    const nextPath = buildAppRoutePath(
      {
        view: nextView,
        campaign: nextCampaign,
        country: normalizeActiveCountry(nextCountry),
      },
      BASE_URL
    );

    const currentParams = new URLSearchParams(window.location.search);
    const preserved = new URLSearchParams();
    if (currentParams.get('autostart') === '1' && mode === 'replace') {
      preserved.set('autostart', '1');
    }
    if (preservePreviewParams && nextView === 'preview') {
      const prod = currentParams.get('product');
      const sl = currentParams.get('slug');
      if (prod) preserved.set('product', prod);
      if (sl) preserved.set('slug', sl);
    }

    const querySuffix = preserved.toString() ? `?${preserved.toString()}` : '';
    const targetUrl = `${nextPath}${querySuffix}`;

    if (`${window.location.pathname}${window.location.search}` !== targetUrl) {
      if (mode === 'push') {
        window.history.pushState({}, '', targetUrl);
      } else {
        window.history.replaceState({}, '', targetUrl);
      }
    }
  };

  const navigateToRoute = (
    target: {
      view?: AppView;
      campaign?: SalesCampaignId;
      country?: CountryCode;
    },
    options?: { replace?: boolean }
  ) => {
    const nextView = target.view ?? activeView;
    const nextCampaign = target.campaign ?? salesCampaign;
    const nextCountry = target.country ?? country;

    setActiveView(nextView);
    setSalesCampaign(nextCampaign);
    setCountry(nextCountry);

    syncBrowserDirectoryUrl(
      nextView,
      nextCampaign,
      nextCountry,
      options?.replace ? 'replace' : 'push'
    );
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  // Normalize legacy ?view= URLs into clean directory paths on initial mount & handle browser back/forward
  useEffect(() => {
    const currentParams = new URLSearchParams(window.location.search);
    if (
      currentParams.has('view') ||
      currentParams.has('campaign') ||
      currentParams.has('country')
    ) {
      syncBrowserDirectoryUrl(
        initialRoute.view,
        initialRoute.campaign,
        initialRoute.country,
        'replace',
        true
      );
    }

    const onPopState = () => {
      const resolved = resolveAppRouteFromLocation(
        window.location.pathname,
        window.location.search,
        BASE_URL
      );
      setActiveView(resolved.view);
      setSalesCampaign(resolved.campaign);
      setCountry(resolved.country);

      const params = new URLSearchParams(window.location.search);
      if (resolved.view === 'preview') {
        const prod = params.get('product');
        const slugParam = params.get('slug');
        if (prod === 'memories' || prod === 'chasing-her') setBuilderProduct(prod);
        if (slugParam) setBuilderSlug(slugParam);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Background non-blocking hydration from Firebase Firestore
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const remoteSettings = await fetchPlatformSettingsFromFirestore();
        if (mounted && Object.keys(remoteSettings).length > 0) {
          setSettingsMap((prev) => ({ ...prev, ...remoteSettings }));
          if (remoteSettings[SITE_EXPERIENCES_SETTING_KEY]) {
            const hydrated = mergeSiteExperiences(remoteSettings[SITE_EXPERIENCES_SETTING_KEY]);
            setSiteExperiences(hydrated);
            try {
              localStorage.setItem(
                SITE_EXPERIENCES_SETTING_KEY,
                serializeSiteExperiences(hydrated)
              );
            } catch {
              // ignore storage errors
            }
          }
          if (remoteSettings[INTERACTIVE_CONFIG_SETTING_KEY]) {
            const hydratedInteractive = mergeInteractiveSalesConfig(
              remoteSettings[INTERACTIVE_CONFIG_SETTING_KEY]
            );
            setInteractiveSalesConfig(hydratedInteractive);
            try {
              localStorage.setItem(
                INTERACTIVE_CONFIG_SETTING_KEY,
                serializeInteractiveSalesConfig(hydratedInteractive)
              );
            } catch {
              // ignore storage errors
            }
          }
          if (remoteSettings[BIRTHDAY_INTERACTIVE_SETTING_KEY]) {
            const hydratedBirthday = mergeBirthdayInteractiveConfig(
              remoteSettings[BIRTHDAY_INTERACTIVE_SETTING_KEY]
            );
            setBirthdayInteractiveConfig(hydratedBirthday);
            try {
              localStorage.setItem(
                BIRTHDAY_INTERACTIVE_SETTING_KEY,
                serializeBirthdayInteractiveConfig(hydratedBirthday)
              );
            } catch {
              // ignore storage errors
            }
          }
        }
      } catch {
        // Offline-first fallback already active
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Keep local funnel sessions live-synced across route transitions and tabs
  useEffect(() => {
    const syncLocalSessions = () => {
      const local = loadLocalFunnelSessions();
      setFunnelSessions((prev) => mergeFunnelSessions(prev, local));
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === FUNNEL_SESSIONS_STORAGE_KEY) {
        syncLocalSessions();
      }
    };
    window.addEventListener('chasingher:funnel-sessions-updated', syncLocalSessions);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('chasingher:funnel-sessions-updated', syncLocalSessions);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Track Firebase Google Auth state and subscribe to live Firestore collections once authenticated
  useEffect(() => {
    return subscribeToFirebaseAuth((user) => {
      setFirebaseUser(user);
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) return;
    return subscribeToFirestoreWorkspace(firebaseUser, {
      onOrders: (remoteOrders) => {
        if (remoteOrders.length === 0) return;
        setOrders((prev) => {
          const byId = new Map<string, SubmissionOrder>();
          for (const item of prev) byId.set(item.id, item);
          for (const item of remoteOrders) byId.set(item.id, item);
          return Array.from(byId.values()).sort((a, b) =>
            (b.created_at || '').localeCompare(a.created_at || '')
          );
        });
      },
      onChasingHerProjects: (remoteMap) => {
        if (Object.keys(remoteMap).length === 0) return;
        setChasingHerProjects((prev) => ({ ...prev, ...remoteMap }));
      },
      onMemoriesProjects: (remoteMap) => {
        if (Object.keys(remoteMap).length === 0) return;
        setMemoriesProjects((prev) => ({ ...prev, ...remoteMap }));
      },
      onPlatformSettings: (remoteSettings) => {
        if (Object.keys(remoteSettings).length === 0) return;
        setSettingsMap((prev) => ({ ...prev, ...remoteSettings }));
        if (remoteSettings[SITE_EXPERIENCES_SETTING_KEY]) {
          const hydrated = mergeSiteExperiences(remoteSettings[SITE_EXPERIENCES_SETTING_KEY]);
          setSiteExperiences(hydrated);
        }
        if (remoteSettings[INTERACTIVE_CONFIG_SETTING_KEY]) {
          const hydratedInteractive = mergeInteractiveSalesConfig(
            remoteSettings[INTERACTIVE_CONFIG_SETTING_KEY]
          );
          setInteractiveSalesConfig(hydratedInteractive);
        }
        if (remoteSettings[BIRTHDAY_INTERACTIVE_SETTING_KEY]) {
          const hydratedBirthday = mergeBirthdayInteractiveConfig(
            remoteSettings[BIRTHDAY_INTERACTIVE_SETTING_KEY]
          );
          setBirthdayInteractiveConfig(hydratedBirthday);
        }
      },
      onFunnelSessions: (remoteSessions) => {
        setFunnelSessions((prev) =>
          mergeFunnelSessions(
            mergeFunnelSessions(prev, loadLocalFunnelSessions()),
            remoteSessions
          )
        );
      },
    });
  }, [firebaseUser]);

  const handleUpdateSiteExperiences = async (next: SiteExperienceShowcaseMap) => {
    const normalized = mergeSiteExperiences(next);
    setSiteExperiences(normalized);

    const serialized = serializeSiteExperiences(normalized);
    try {
      localStorage.setItem(SITE_EXPERIENCES_SETTING_KEY, serialized);
    } catch {
      // ignore storage quota errors
    }

    setShowcaseMedia((prev) => ({
      'chasing-her': normalized['chasing-her'].mediaUrl
        ? {
            media_url: normalized['chasing-her'].mediaUrl,
            media_type: normalized['chasing-her'].mediaType || 'image',
          }
        : prev['chasing-her'],
      memories: normalized.memories.mediaUrl
        ? {
            media_url: normalized.memories.mediaUrl,
            media_type: normalized.memories.mediaType || 'image',
          }
        : prev.memories,
    }));

    const nextSettings = {
      ...settingsMap,
      [SITE_EXPERIENCES_SETTING_KEY]: serialized,
    };
    setSettingsMap(nextSettings);
    try {
      await savePlatformSettingsToFirestore({
        [SITE_EXPERIENCES_SETTING_KEY]: serialized,
      });
    } catch {
      // local persistence already saved
    }
  };

  const handleUpdateInteractiveSalesConfig = async (next: InteractiveSalesConfig) => {
    setInteractiveSalesConfig(next);
    const serialized = serializeInteractiveSalesConfig(next);
    try {
      localStorage.setItem(INTERACTIVE_CONFIG_SETTING_KEY, serialized);
    } catch {
      // ignore storage quota errors
    }
    setSettingsMap((prev) => ({
      ...prev,
      [INTERACTIVE_CONFIG_SETTING_KEY]: serialized,
    }));
    try {
      await savePlatformSettingsToFirestore({
        [INTERACTIVE_CONFIG_SETTING_KEY]: serialized,
      });
    } catch {
      // local persistence already saved
    }
  };

  const handleUpdateBirthdayInteractiveConfig = async (
    next: BirthdayInteractiveConfig
  ) => {
    setBirthdayInteractiveConfig(next);
    const serialized = serializeBirthdayInteractiveConfig(next);
    try {
      localStorage.setItem(BIRTHDAY_INTERACTIVE_SETTING_KEY, serialized);
    } catch {
      // ignore storage quota errors
    }
    setSettingsMap((prev) => ({
      ...prev,
      [BIRTHDAY_INTERACTIVE_SETTING_KEY]: serialized,
    }));
    try {
      await savePlatformSettingsToFirestore({
        [BIRTHDAY_INTERACTIVE_SETTING_KEY]: serialized,
      });
    } catch {
      // local persistence already saved
    }
  };

  const handleOrderCreated = (
    newOrder: SubmissionOrder,
    destination: 'builder' | 'brief' | 'my-site'
  ) => {
    const cleanEmail = (newOrder.email || '').trim().toLowerCase();
    if (cleanEmail) {
      setCustomerEmailSession(cleanEmail);
      try {
        localStorage.setItem('cust_email', cleanEmail);
      } catch {
        // Ignore storage errors
      }
    }

    setOrders((prev) => [newOrder, ...prev]);
    setJustPaidOrderId(newOrder.id);

    void saveOrderToFirestore(newOrder).catch(() => {});

    const targetBuildProduct: 'chasing-her' | 'memories' =
      newOrder.product === 'memories' || newOrder.build_product === 'memories'
        ? 'memories'
        : 'chasing-her';

    // Seed a strictly private starter project cloned only from our official studio template (never another customer's letter)
    if (targetBuildProduct === 'chasing-her') {
      if (!chasingHerProjects[newOrder.slug]) {
        const partnerLabel = newOrder.brief?.for || 'My Love';
        setChasingHerProjects((prev) => ({
          ...prev,
          [newOrder.slug]: {
            ...OFFICIAL_CHASING_HER_SHOWCASE,
            slug: newOrder.slug,
            pin: newOrder.pin || OFFICIAL_CHASING_HER_SHOWCASE.pin,
            is_public_showcase: false,
            intro_message:
              newOrder.brief?.feel && newOrder.brief.feel.length > 6
                ? newOrder.brief.feel
                : `For ${partnerLabel} — every ordinary day becomes unforgettable because you are in it.`,
            letter_title: `My Dearest ${partnerLabel},`,
          },
        }));
      }
    } else {
      if (!memoriesProjects[newOrder.slug]) {
        const partnerLabel = newOrder.brief?.for || 'My Love';
        setMemoriesProjects((prev) => ({
          ...prev,
          [newOrder.slug]: {
            ...OFFICIAL_MEMORIES_SHOWCASE,
            slug: newOrder.slug,
            pin: newOrder.pin || OFFICIAL_MEMORIES_SHOWCASE.pin,
            is_public_showcase: false,
            hero_title: `For ${partnerLabel}`,
            collage_names: `${partnerLabel} & ${newOrder.full_name.split(' ')[0]}`,
            letter_title: `To My Heart, ${partnerLabel},`,
          },
        }));
      }
    }

    setBuilderProduct(targetBuildProduct);
    setBuilderSlug(newOrder.slug);

    if (destination === 'builder') {
      navigateToRoute({ view: 'builder' });
    } else {
      navigateToRoute({ view: 'my-site' });
    }
  };

  const handleSaveChasingHer = (slug: string, data: ChasingHerProjectData) => {
    setChasingHerProjects((prev) => ({
      ...prev,
      [slug]: data,
    }));
    void saveChasingHerProjectToFirestore(slug, data).catch(() => {});
  };

  const handleSaveMemories = (slug: string, data: MemoriesProjectData) => {
    setMemoriesProjects((prev) => ({
      ...prev,
      [slug]: data,
    }));
    void saveMemoriesProjectToFirestore(slug, data).catch(() => {});
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
    void deleteProjectFromFirestore(product, slug).catch(() => {});
  };

  const handleUpdateOrder = (updatedOrder: SubmissionOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );
    void saveOrderToFirestore(updatedOrder).catch(() => {});
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    void deleteOrderFromFirestore(orderId).catch(() => {});
  };

  const handleAdminCreateOrder = (newOrder: SubmissionOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
    void saveOrderToFirestore(newOrder).catch(() => {});
  };

  const handleDeleteFunnelSession = (sessionId: string) => {
    removeLocalFunnelSession(sessionId);
    setFunnelSessions((prev) => prev.filter((s) => s.id !== sessionId));
    void deleteFunnelSessionFromFirestore(sessionId).catch(() => {});
  };

  const handleRefreshFunnelSessions = async () => {
    const local = loadLocalFunnelSessions();
    try {
      const remote = await fetchFunnelSessionsFromFirestore();
      setFunnelSessions(mergeFunnelSessions(local, remote));
    } catch {
      setFunnelSessions(local);
    }
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

  // Sales page curated showcases: ONLY official studio demos explicitly marked as public showcases are ever exposed on sales pages
  const curatedChasingHerDemo =
    chasingHerProjects[PUBLIC_SHOWCASE_SLUGS['chasing-her']]?.is_public_showcase === true
      ? chasingHerProjects[PUBLIC_SHOWCASE_SLUGS['chasing-her']]
      : OFFICIAL_CHASING_HER_SHOWCASE;

  const curatedMemoriesDemo =
    memoriesProjects[PUBLIC_SHOWCASE_SLUGS.memories]?.is_public_showcase === true
      ? memoriesProjects[PUBLIC_SHOWCASE_SLUGS.memories]
      : OFFICIAL_MEMORIES_SHOWCASE;

  // Strict privacy guard for /builder/: customer may ONLY open a slug that belongs to their own order
  const canOpenCurrentBuilder = canCustomerAccessProjectSlug({
    slug: builderSlug,
    viewerEmail: customerEmailSession,
    justPaidOrderId,
    orders,
    isAdmin: false,
  });

  // Resolve the active customer order for builderSlug so the customer is strictly locked to the edition they paid for
  const activeCustomerOrder = canOpenCurrentBuilder
    ? orders.find((o) => o.slug === builderSlug) ||
      (justPaidOrderId ? orders.find((o) => o.id === justPaidOrderId) : undefined)
    : undefined;

  const lockedCustomerProduct: 'chasing-her' | 'memories' = activeCustomerOrder
    ? activeCustomerOrder.product === 'memories' ||
      activeCustomerOrder.build_product === 'memories'
      ? 'memories'
      : 'chasing-her'
    : builderProduct;

  // Strict privacy resolution for /preview/: never fall back to another customer's letter, never bypass PIN on private creations
  const previewProjectRecord =
    builderProduct === 'memories'
      ? memoriesProjects[builderSlug]
      : chasingHerProjects[builderSlug];
  const previewIsPublicShowcase = isPublicShowcaseProject(builderSlug, previewProjectRecord);
  const previewBypassPin = canBypassPreviewPin({
    isAdmin: false,
    isBuilderPreview: false,
    isPublicShowcase: previewIsPublicShowcase,
    autoStart,
  });

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
              onClick={() => navigateToRoute({ view: 'my-site' })}
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
                onClick={() => navigateToRoute({ view: 'my-site' })}
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
                onClick={() => navigateToRoute({ view: 'builder' })}
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
                onClick={() => navigateToRoute({ view: 'order' })}
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
                {ACTIVE_COUNTRIES.map((c: ActiveCountryCode) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => navigateToRoute({ country: c }, { replace: true })}
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

              <PWAInstallButton contextLabel="My Site" variant="compact" />
            </div>
          </div>
        </header>
      )}

      {/* Main View Viewport */}
      <main className="flex-1">
        {activeView === 'order' && salesCampaign === 'reconcile-interactive' && (
          <InteractiveWinHerBackExperience
            country={country}
            config={interactiveSalesConfig}
            chasingHerDemo={curatedChasingHerDemo}
            memoriesDemo={curatedMemoriesDemo}
            isPreviewMode={
              typeof window !== 'undefined' &&
              new URLSearchParams(window.location.search).get('preview') === '1'
            }
          />
        )}

        {activeView === 'order' && salesCampaign === 'birthday-interactive' && (
          <InteractiveBirthdayExperience
            country={country}
            config={birthdayInteractiveConfig}
            chasingHerDemo={curatedChasingHerDemo}
            memoriesDemo={curatedMemoriesDemo}
            isPreviewMode={
              typeof window !== 'undefined' &&
              new URLSearchParams(window.location.search).get('preview') === '1'
            }
          />
        )}

        {activeView === 'order' &&
          salesCampaign !== 'reconcile-interactive' &&
          salesCampaign !== 'birthday-interactive' && (
          <OrderLandingView
            country={country}
            campaign={salesCampaign === 'birthday' ? 'birthday' : 'reconcile'}
            onChangeCountry={(nextCountry) =>
              navigateToRoute({ view: 'order', country: nextCountry })
            }
            settingsMap={settingsMap}
            testimonials={testimonials}
            showcaseMedia={showcaseMedia}
            siteExperiences={siteExperiences}
            chasingHerDemo={curatedChasingHerDemo}
            memoriesDemo={curatedMemoriesDemo}
            onOrderCreated={handleOrderCreated}
            onOpenMySite={() => navigateToRoute({ view: 'my-site' })}
            onOpenAdmin={() => navigateToRoute({ view: 'admin' })}
          />
        )}

        {activeView === 'builder' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24">
            {canOpenCurrentBuilder ? (
              <SiteBuilderStudio
                mode="customer"
                initialProduct={lockedCustomerProduct}
                activeSlug={builderSlug}
                chasingHerProjects={chasingHerProjects}
                memoriesProjects={memoriesProjects}
                onSaveChasingHer={handleSaveChasingHer}
                onSaveMemories={handleSaveMemories}
                onBackToAccount={() => navigateToRoute({ view: 'my-site' })}
                globalFlowerPool={globalFlowerPool}
                globalMusicLibrary={musicLibrary}
              />
            ) : (
              <div
                data-testid="builder-privacy-gate"
                className="max-w-xl mx-auto rounded-2xl bg-[#1A060C] border border-[#E2B96F]/25 p-8 sm:p-10 text-center space-y-5 mt-8"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#260912] border border-[#E2B96F]/30 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6 text-[#E2B96F]" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#E2B96F]">Private Personal Studio</p>
                  <h1 className="font-serif text-2xl sm:text-3xl text-[#FBF3EA]">
                    This Love Website Studio Is Private
                  </h1>
                  <p className="text-sm text-[#FBF3EA]/70 leading-relaxed">
                    Because every letter is deeply personal, customers can only view and edit their own creation. Sign in with your checkout email in My Site to open your private studio.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigateToRoute({ view: 'my-site' })}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Open My Site Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToRoute({ view: 'order' })}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl border border-[#E2B96F]/30 bg-[#120408] hover:border-[#E2B96F] text-[#FBF3EA] text-xs font-medium transition-colors cursor-pointer"
                  >
                    Create Your Own Gift
                  </button>
                </div>
              </div>
            )}
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
              onActiveEmailChange={(email) => setCustomerEmailSession(email)}
              onOrderGift={() => navigateToRoute({ view: 'order' })}
              onOpenBuilder={(order) => {
                const prod =
                  order.product === 'memories' || order.build_product === 'memories'
                    ? 'memories'
                    : 'chasing-her';
                setCustomerEmailSession(order.email.trim().toLowerCase());
                setBuilderProduct(prod);
                setBuilderSlug(order.slug);
                navigateToRoute({ view: 'builder' });
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
            onUpdateFlowerPool={() => {}}
            musicLibrary={musicLibrary}
            onUpdateMusicLibrary={setMusicLibrary}
            showcaseMedia={showcaseMedia}
            onUpdateShowcaseMedia={setShowcaseMedia}
            siteExperiences={siteExperiences}
            onUpdateSiteExperiences={handleUpdateSiteExperiences}
            interactiveSalesConfig={interactiveSalesConfig}
            onUpdateInteractiveSalesConfig={handleUpdateInteractiveSalesConfig}
            birthdayInteractiveConfig={birthdayInteractiveConfig}
            onUpdateBirthdayInteractiveConfig={handleUpdateBirthdayInteractiveConfig}
            testimonials={testimonials}
            onUpdateTestimonials={setTestimonials}
            funnelSessions={funnelSessions}
            onDeleteFunnelSession={handleDeleteFunnelSession}
            onRefreshFunnelSessions={handleRefreshFunnelSessions}
            onNavigateView={(target) => navigateToRoute(target)}
            firebaseUser={firebaseUser}
            autoUnlock={autoStart}
          />
        )}

        {activeView === 'preview' && (
          <div className="max-w-5xl mx-auto px-4 py-8">
            {previewProjectRecord ? (
              <RecipientSitePreview
                product={builderProduct}
                chasingHerData={
                  builderProduct === 'chasing-her'
                    ? (previewProjectRecord as ChasingHerProjectData)
                    : undefined
                }
                memoriesData={
                  builderProduct === 'memories'
                    ? (previewProjectRecord as MemoriesProjectData)
                    : undefined
                }
                isPublicShowcase={previewIsPublicShowcase}
                bypassPinByDefault={previewBypassPin}
                onClose={() => navigateToRoute({ view: 'my-site' })}
              />
            ) : (
              <div
                data-testid="preview-privacy-gate"
                className="max-w-xl mx-auto rounded-2xl bg-[#1A060C] border border-[#E2B96F]/25 p-8 sm:p-10 text-center space-y-5 mt-8"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#260912] border border-[#E2B96F]/30 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6 text-[#E2B96F]" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#E2B96F]">Private Keepsake Vault</p>
                  <h1 className="font-serif text-2xl sm:text-3xl text-[#FBF3EA]">
                    This Personal Letter Is Private
                  </h1>
                  <p className="text-sm text-[#FBF3EA]/70 leading-relaxed">
                    Only the recipient with their direct private link and secret 6-digit PIN can open a customer&apos;s letter. Public visitors can experience our official studio demos on the main page.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigateToRoute({ view: 'order' })}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Explore Official Demo Experience
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToRoute({ view: 'my-site' })}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl border border-[#E2B96F]/30 bg-[#120408] hover:border-[#E2B96F] text-[#FBF3EA] text-xs font-medium transition-colors cursor-pointer"
                  >
                    Find My Own Site
                  </button>
                </div>
              </div>
            )}
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
            onClick={() => navigateToRoute({ view: 'my-site' })}
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
            onClick={() => navigateToRoute({ view: 'builder' })}
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
            onClick={() => navigateToRoute({ view: 'order' })}
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
