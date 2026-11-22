import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  Unlock,
  Package,
  Wand2,
  Cloud,
  Globe,
  Search,
  CheckCircle2,
  ExternalLink,
  Upload,
  Trash2,
  Plus,
  Heart,
  Sparkles,
  RefreshCw,
  Eye,
  ShieldCheck,
  Server,
  HardDrive,
  Music,
  Star,
  AlertTriangle,
  CopyPlus,
  Image as ImageIcon,
  Download,
  LayoutList,
  Columns3,
  ArrowRight,
  ChevronRight,
  LogOut,
  Store,
  UserCheck,
  Copy,
  Check,
  Edit3,
  X,
  Activity,
  Database,
} from 'lucide-react';
import {
  COUNTRIES,
  ACTIVE_COUNTRIES,
  ActiveCountryCode,
  AppView,
  CountryCode,
  OrderProgressStage,
  ChasingHerProjectData,
  MemoriesProjectData,
  MusicLibraryTrack,
  ShowcaseMediaMap,
  SalesCampaignId,
  SALES_PAGE_DIRECTORY,
  APP_PORTAL_DIRECTORY,
  buildAppRoutePath,
  resolveCountrySettings,
  validateFirebaseStorageConfig,
  formatStorageCompact,
  formatStorageMegabytes,
  RouteTarget,
  ProductType,
  SiteExperienceShowcaseMap,
  SiteExperienceKey,
  DEFAULT_SITE_EXPERIENCES,
  deriveCleanAudioTitle,
  DatabaseConnectionReport,
} from '../utils/platformLogic';
import type { User } from 'firebase/auth';
import {
  SubmissionOrder,
  TestimonialItem,
  uploadMediaToFirebase,
  ROMANTIC_GALLERY,
  DEFAULT_FLOWER_POOL,
  LOCKED_FLOWER_WALL_ITEMS,
} from '../utils/supabaseAndOci';
import {
  FIREBASE_PROJECT_ID,
  FIREBASE_DATABASE_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_ADMIN_EMAIL,
  isVerifiedAdminUser,
  savePlatformSettingsToFirestore,
  runDatabaseConnectionTest,
  signInWithGooglePopup,
  signOutFirebase,
  syncWorkspaceSnapshotToFirestore,
  cleanFirebaseStorageCatalog,
} from '../utils/firebaseClient';
import { PWAInstallButton } from './PWAInstallPrompt';
import { SiteBuilderStudio } from './SiteBuilderStudio';
import { RecipientSitePreview } from './RecipientSitePreview';
import { AdminOrderInspector, AdminCreateOrderModal } from './AdminOrderInspector';
import { AdminExperienceShowcaseEditor } from './AdminExperienceShowcaseEditor';

interface FirebaseMediaObject {
  id: string;
  objectKey: string;
  fileName: string;
  kind: 'images' | 'video' | 'voice' | 'music';
  contentType: string;
  sizeBytes: number;
  originalBytes?: number;
  savedBytes?: number;
  projectSlug: string;
  url: string;
  storageTier: string;
  createdAt: string;
}

interface FirebaseStatusPayload {
  config: {
    projectId: string;
    databaseId: string;
    storageBucket: string;
    publicBaseUrl: string;
    enabled: boolean;
  };
  connectionMode: string;
  endpoint: string;
  usedBytes: number;
  savedBytesByCompression: number;
  capacityBytes: number;
  objectCount: number;
  objects: FirebaseMediaObject[];
}

interface UnifiedAdminBackstageViewProps {
  orders: SubmissionOrder[];
  onUpdateOrder: (updatedOrder: SubmissionOrder) => void;
  onCreateOrder?: (newOrder: SubmissionOrder) => void;
  onDeleteOrder?: (orderId: string) => void;
  chasingHerProjects: Record<string, ChasingHerProjectData>;
  memoriesProjects: Record<string, MemoriesProjectData>;
  onSaveChasingHer: (slug: string, data: ChasingHerProjectData) => void;
  onSaveMemories: (slug: string, data: MemoriesProjectData) => void;
  onDeleteProject?: (product: 'chasing-her' | 'memories', slug: string) => void;
  settingsMap: Record<string, string>;
  onUpdateSettingsMap: (nextMap: Record<string, string>) => void;
  globalFlowerPool: string[];
  onUpdateFlowerPool: (flowers: string[]) => void;
  musicLibrary: MusicLibraryTrack[];
  onUpdateMusicLibrary: (tracks: MusicLibraryTrack[]) => void;
  showcaseMedia: ShowcaseMediaMap;
  onUpdateShowcaseMedia: (media: ShowcaseMediaMap) => void;
  siteExperiences?: SiteExperienceShowcaseMap;
  onUpdateSiteExperiences?: (next: SiteExperienceShowcaseMap) => Promise<void> | void;
  testimonials: TestimonialItem[];
  onUpdateTestimonials: (items: TestimonialItem[]) => void;
  onNavigateView?: (target: {
    view: AppView;
    campaign?: SalesCampaignId;
    country?: ActiveCountryCode;
  }) => void;
  firebaseUser?: User | null;
  autoUnlock?: boolean;
}

type AdminTab =
  | 'orders'
  | 'sales-pages'
  | 'studio'
  | 'experiences'
  | 'assets'
  | 'testimonials'
  | 'firebase'
  | 'countries';

const PROGRESS_STAGES: { id: OrderProgressStage; label: string; short: string }[] = [
  { id: 'received', label: 'Order Received', short: 'Received' },
  { id: 'building', label: 'Building Site', short: 'Building' },
  { id: 'review', label: 'Final Review', short: 'Review' },
  { id: 'hosted', label: 'Live & Hosted', short: 'Live' },
];

const TAB_TITLES: Record<AdminTab, { title: string; subtitle: string }> = {
  orders: {
    title: 'Orders & Fulfillment',
    subtitle: 'Verify payments, advance build stages, and deliver live links across Ghana & Kenya.',
  },
  'sales-pages': {
    title: 'Sales Pages Directory',
    subtitle: 'Every live Ghana & Kenya campaign landing page and standalone portal directory.',
  },
  studio: {
    title: 'Site Builder Studio',
    subtitle: 'Create, duplicate, and customize Chasing Her & Memories websites in real time.',
  },
  experiences: {
    title: 'Site Experiences & Example Features',
    subtitle: 'Edit the example feature lists, showcase descriptions, and live demo copy for Chasing Her and Memories.',
  },
  assets: {
    title: 'Assets & Music Library',
    subtitle: 'View the locked 5-blossom signature flower wall and manage shared builder soundtracks.',
  },
  testimonials: {
    title: 'Testimonials & Proof',
    subtitle: 'Publish customer reactions and review stories featured on your sales pages.',
  },
  firebase: {
    title: 'Firebase 5 GB Storage & Database',
    subtitle: 'Inspect your connected Firestore database, compressed WebP media objects, and storage headroom.',
  },
  countries: {
    title: 'Regional Markets (GH & KE)',
    subtitle: 'Direct sales page entry links, localized pricing, and checkout routing for Ghana & Kenya.',
  },
};

export const UnifiedAdminBackstageView: React.FC<UnifiedAdminBackstageViewProps> = ({
  orders,
  onUpdateOrder,
  onCreateOrder,
  onDeleteOrder,
  chasingHerProjects,
  memoriesProjects,
  onSaveChasingHer,
  onSaveMemories,
  onDeleteProject,
  settingsMap,
  onUpdateSettingsMap,
  globalFlowerPool,
  onUpdateFlowerPool,
  musicLibrary,
  onUpdateMusicLibrary,
  showcaseMedia,
  onUpdateShowcaseMedia,
  siteExperiences = DEFAULT_SITE_EXPERIENCES,
  onUpdateSiteExperiences,
  testimonials,
  onUpdateTestimonials,
  onNavigateView,
  firebaseUser = null,
  autoUnlock = false,
}) => {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (autoUnlock) return true;
    try {
      return sessionStorage.getItem('backstage_unlocked') === '1';
    } catch {
      return false;
    }
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [activeTab, setActiveTab] = useState<AdminTab>('orders');

  // Orders workspace state
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<'all' | CountryCode>('all');
  const [productFilter, setProductFilter] = useState<'all' | ProductType>('all');
  const [stageFilter, setStageFilter] = useState<'all' | 'needs_confirm' | OrderProgressStage>('all');
  const [orderViewMode, setOrderViewMode] = useState<'table' | 'board'>('table');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(() => orders[0]?.id || null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);

  // Studio state
  const [studioProduct, setStudioProduct] = useState<'chasing-her' | 'memories'>('chasing-her');
  const [activeSlug, setActiveSlug] = useState<string>('ama-and-kofi');
  const [previewOrderModal, setPreviewOrderModal] = useState<{
    product: 'chasing-her' | 'memories';
    slug: string;
  } | null>(null);

  // Assets & Music state
  const [assetStatusMsg, setAssetStatusMsg] = useState<string | null>(null);
  const [newTrackTitle, setNewTrackTitle] = useState('');
  const [newTrackArtist, setNewTrackArtist] = useState('');
  const [newTrackUrl, setNewTrackUrl] = useState('');
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);
  const [audioUploadProgress, setAudioUploadProgress] = useState<number | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingTrackTitle, setEditingTrackTitle] = useState('');
  const [editingTrackArtist, setEditingTrackArtist] = useState('');

  // Testimonials draft state
  const [newTestimonial, setNewTestimonial] = useState<Omit<TestimonialItem, 'id'>>({
    country: 'gh',
    customer_name: '',
    location: '',
    product: 'Chasing Her',
    quote: '',
    outcome: 'Delivered in 15 mins',
    kind: 'photo',
    media_url: ROMANTIC_GALLERY[0],
    video_url: '',
    display_order: testimonials.length + 1,
    is_published: true,
  });

  // Firebase 5GB Storage & Database state
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseStatusPayload | null>(null);
  const [firebaseFeedback, setFirebaseFeedback] = useState<string | null>(null);
  const [firebaseFeedbackTone, setFirebaseFeedbackTone] = useState<'success' | 'warning' | 'error'>('success');
  const [firebaseUploading, setFirebaseUploading] = useState(false);
  const [cleaningDb, setCleaningDb] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [dbReport, setDbReport] = useState<DatabaseConnectionReport | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [syncingWorkspace, setSyncingWorkspace] = useState(false);

  // Country settings state
  const [localSettings, setLocalSettings] = useState<Record<string, string>>(settingsMap);
  const [countrySaveFeedback, setCountrySaveFeedback] = useState<string | null>(null);
  const [copiedSalesUrlKey, setCopiedSalesUrlKey] = useState<string | null>(null);

  useEffect(() => {
    if (autoUnlock) setUnlocked(true);
  }, [autoUnlock]);

  useEffect(() => {
    setLocalSettings(settingsMap);
  }, [settingsMap]);

  const loadFirebaseState = async () => {
    try {
      const res = await fetch('/api/firebase/status');
      if (!res.ok) return;
      const data: FirebaseStatusPayload = await res.json();
      setFirebaseStatus(data);
    } catch {
      // ignore offline
    }
  };

  useEffect(() => {
    loadFirebaseState();
  }, []);

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pinInput.trim() === '150406') {
      setUnlocked(true);
      setPinError('');
      try {
        sessionStorage.setItem('backstage_unlocked', '1');
      } catch {
        // ignore
      }
    } else {
      setPinError('Incorrect PIN. Enter 150406 for Backstage access.');
    }
  };

  const handleQuickDemoUnlock = () => {
    setPinInput('150406');
    setUnlocked(true);
    setPinError('');
    try {
      sessionStorage.setItem('backstage_unlocked', '1');
    } catch {
      // ignore
    }
  };

  const handleLock = () => {
    setUnlocked(false);
    setPinInput('');
    try {
      sessionStorage.removeItem('backstage_unlocked');
    } catch {
      // ignore
    }
  };

  const needsConfirmCount = useMemo(
    () => orders.filter((o) => Boolean(o.returned_from_payment_at) && o.status === 'pending_payment').length,
    [orders]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (countryFilter !== 'all' && order.country !== countryFilter) return false;
      if (productFilter !== 'all' && order.product !== productFilter) return false;
      if (stageFilter === 'needs_confirm') {
        if (!(order.returned_from_payment_at && order.status === 'pending_payment')) return false;
      } else if (stageFilter !== 'all' && order.progress !== stageFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = order.full_name.toLowerCase().includes(q);
        const matchEmail = order.email.toLowerCase().includes(q);
        const matchSlug = order.slug.toLowerCase().includes(q);
        const matchPhone = order.whatsapp.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchSlug && !matchPhone) return false;
      }
      return true;
    });
  }, [orders, countryFilter, productFilter, stageFilter, searchQuery]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const missingPaymentAlerts = useMemo(() => {
    const warnings: string[] = [];
    ACTIVE_COUNTRIES.forEach((code) => {
      const cfg = COUNTRIES[code];
      const resolved = resolveCountrySettings(code, localSettings);
      const checkUrl = (route: RouteTarget, url: string, label: string) => {
        if (route === 'payment' && (!url || url.startsWith('/?'))) {
          warnings.push(`${cfg.name} (${label}) routes to payment but lacks a live checkout URL.`);
        }
      };
      checkUrl(resolved.routeChasingHer, resolved.paymentUrlChasingHer, 'Chasing Her');
      checkUrl(resolved.routeMemories, resolved.paymentUrlMemories, 'Memories');
      checkUrl(resolved.routeCustom, resolved.paymentUrlCustom, 'Concierge');
    });
    return warnings;
  }, [localSettings]);

  const handleOpenOrderInStudio = (order: SubmissionOrder) => {
    const targetProduct: 'chasing-her' | 'memories' =
      order.build_product === 'memories' || order.product === 'memories'
        ? 'memories'
        : 'chasing-her';

    setStudioProduct(targetProduct);
    setActiveSlug(order.slug);

    if (targetProduct === 'memories' && !memoriesProjects[order.slug]) {
      onSaveMemories(order.slug, {
        slug: order.slug,
        pin: order.pin || '250824',
        hero_title: `For ${order.brief?.for || order.full_name}`,
        hero_subtitle: 'Every moment we have shared, gathered into one beating heart.',
        collage_names: order.slug.replace(/-/g, ' '),
        collage_day: '14',
        collage_month: '02',
        collage_year: '2026',
        collage_quote: 'Every love story is beautiful, but ours is my favorite.',
        mosaic_images: ROMANTIC_GALLERY.slice(0, 6),
        letter_title: 'My Dearest Love,',
        letter_body:
          'Every photo in this heart holds a special memory of us. Thank you for filling my life with warmth and joy.',
        final_message: 'Forever & Always',
        memories: [
          {
            url: ROMANTIC_GALLERY[0],
            type: 'image',
            caption: 'Our favorite day together',
            date: '2026',
            place: COUNTRIES[order.country]?.name || 'Together',
            transition: 'fade',
            duration: 6,
          },
        ],
        flower_images: globalFlowerPool,
      });
    } else if (targetProduct === 'chasing-her' && !chasingHerProjects[order.slug]) {
      onSaveChasingHer(order.slug, {
        slug: order.slug,
        pin: order.pin || '140226',
        intro_message: 'Every ordinary day becomes unforgettable because you are in it.',
        letter_title: 'My Dearest,',
        letter_body:
          'I built this private corner of the internet so you always have a place that reminds you how deeply you are loved.',
        final_message: 'I love you to the moon and back.',
        photos: [
          { url: ROMANTIC_GALLERY[0], caption: 'First Date' },
          { url: ROMANTIC_GALLERY[1], caption: 'Golden Hour' },
          { url: ROMANTIC_GALLERY[2], caption: 'Always Us' },
        ],
        flower_images: globalFlowerPool,
        songs: [
          {
            title: 'Love Nwantiti (Acoustic)',
            artist: 'CKay',
            duration: '2:26',
          },
        ],
      });
    }

    setActiveTab('studio');
  };

  const handleExportOrdersCsv = () => {
    const header = ['Order ID', 'Customer', 'Email', 'WhatsApp', 'Country', 'Product', 'Slug', 'PIN', 'Payment Status', 'Stage', 'Hosted URL'];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.full_name,
      o.email,
      o.whatsapp,
      o.country.toUpperCase(),
      o.product,
      o.slug,
      o.pin,
      o.status,
      o.progress,
      o.hosted_url || '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chasing-her-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleAdvanceOrderStage = (order: SubmissionOrder) => {
    const idx = PROGRESS_STAGES.findIndex((s) => s.id === order.progress);
    const nextStage = PROGRESS_STAGES[Math.min(PROGRESS_STAGES.length - 1, idx + 1)].id;
    onUpdateOrder({
      ...order,
      progress: nextStage,
      status: nextStage === 'hosted' ? 'hosted' : order.status === 'pending_payment' ? 'paid' : order.status,
    });
  };

  const handleCreateNewProject = (type: 'chasing-her' | 'memories') => {
    const newSlug = `couple-${Date.now().toString().slice(-4)}`;
    if (type === 'chasing-her') {
      onSaveChasingHer(newSlug, {
        slug: newSlug,
        pin: '140226',
        intro_message: 'Every ordinary day becomes unforgettable because you are in it.',
        letter_title: 'My Dearest,',
        letter_body: 'Write your heartfelt love letter here...',
        final_message: 'Forever yours.',
        photos: [
          { url: ROMANTIC_GALLERY[0], caption: 'First Date' },
          { url: ROMANTIC_GALLERY[1], caption: 'Favorite Memory' },
          { url: ROMANTIC_GALLERY[2], caption: 'Us Forever' },
        ],
        flower_images: globalFlowerPool,
        songs: [{ title: 'Perfect', artist: 'Ed Sheeran', duration: '4:23' }],
      });
      setStudioProduct('chasing-her');
      setActiveSlug(newSlug);
    } else {
      onSaveMemories(newSlug, {
        slug: newSlug,
        pin: '250824',
        hero_title: 'For My Love',
        hero_subtitle: '34 Moments That Built Our Forever',
        collage_names: 'Our Love Story',
        collage_day: '14',
        collage_month: '02',
        collage_year: '2026',
        collage_quote: 'Every love story is beautiful, but ours is my favorite.',
        mosaic_images: ROMANTIC_GALLERY.slice(0, 6),
        letter_title: 'To The One Who Holds My Heart,',
        letter_body: 'Write your intimate wax-sealed note here...',
        final_message: 'Forever & Always',
        memories: [
          {
            url: ROMANTIC_GALLERY[0],
            type: 'image',
            caption: 'Our favorite memory',
            date: '2026',
            place: 'Together',
            transition: 'fade',
            duration: 6,
          },
        ],
        flower_images: globalFlowerPool,
      });
      setStudioProduct('memories');
      setActiveSlug(newSlug);
    }
  };

  const handleDuplicateCurrentProject = () => {
    const dupSlug = `${activeSlug}-copy-${Date.now().toString().slice(-3)}`;
    if (studioProduct === 'chasing-her') {
      const source = chasingHerProjects[activeSlug];
      if (!source) return;
      onSaveChasingHer(dupSlug, { ...source, slug: dupSlug });
    } else {
      const source = memoriesProjects[activeSlug];
      if (!source) return;
      onSaveMemories(dupSlug, { ...source, slug: dupSlug });
    }
    setActiveSlug(dupSlug);
  };

  const handleUploadAssetToFirebase = async (
    e: React.ChangeEvent<HTMLInputElement>,
    purpose: 'flower' | 'music' | 'showcase-ch' | 'showcase-mem' | 'testimonial'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAssetStatusMsg('Optimizing & uploading to Firebase 5 GB Storage…');
    try {
      const kind =
        purpose === 'music'
          ? 'music'
          : file.type.startsWith('video/')
          ? 'video'
          : 'images';
      const uploaded = await uploadMediaToFirebase({
        file,
        kind,
        projectSlug: 'global-assets',
        forcePreserveTransparency: purpose === 'flower',
      });

      if (purpose === 'flower') {
        onUpdateFlowerPool([...globalFlowerPool, uploaded.url]);
        setAssetStatusMsg('Added new flower overlay to Global Pool.');
      } else if (purpose === 'music') {
        setNewTrackUrl(uploaded.url);
        if (!newTrackTitle) setNewTrackTitle(deriveCleanAudioTitle(file.name));
        setAssetStatusMsg('Audio uploaded. Click Add Track to publish to Music Library.');
      } else if (purpose === 'showcase-ch') {
        onUpdateShowcaseMedia({
          ...showcaseMedia,
          'chasing-her': {
            media_url: uploaded.url,
            media_type: file.type.startsWith('video/') ? 'video' : 'image',
          },
        });
        setAssetStatusMsg('Updated Chasing Her landing showcase preview.');
      } else if (purpose === 'showcase-mem') {
        onUpdateShowcaseMedia({
          ...showcaseMedia,
          memories: {
            media_url: uploaded.url,
            media_type: file.type.startsWith('video/') ? 'video' : 'image',
          },
        });
        setAssetStatusMsg('Updated Memories landing showcase preview.');
      } else if (purpose === 'testimonial') {
        const isVid = file.type.startsWith('video/');
        setNewTestimonial((prev) => ({
          ...prev,
          kind: isVid ? 'video' : 'photo',
          media_url: isVid ? prev.media_url : uploaded.url,
          video_url: isVid ? uploaded.url : prev.video_url,
        }));
        setAssetStatusMsg('Uploaded testimonial media to Firebase Storage.');
      }
      await loadFirebaseState();
    } catch {
      setAssetStatusMsg('Upload failed — please try again.');
    }
    e.target.value = '';
    setTimeout(() => setAssetStatusMsg(null), 3500);
  };

  const handleSelectAdminAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAudioFile(file);
    setNewTrackTitle((prev) => (prev.trim() ? prev : deriveCleanAudioTitle(file.name)));
    setAssetStatusMsg(
      `Ready to upload "${file.name}" (${formatStorageCompact(file.size)}). Name your song below and click Upload & Add Song.`
    );
    e.target.value = '';
  };

  const handleUploadAndAddTrack = async () => {
    const finalTitle = pendingAudioFile
      ? deriveCleanAudioTitle(pendingAudioFile.name, newTrackTitle)
      : newTrackTitle.trim();
    if (!finalTitle) return;

    let finalUrl = newTrackUrl.trim();
    if (pendingAudioFile) {
      setIsUploadingAudio(true);
      setAudioUploadProgress(5);
      setAssetStatusMsg(`Streaming "${finalTitle}" to cloud storage…`);
      try {
        const uploaded = await uploadMediaToFirebase({
          file: pendingAudioFile,
          kind: 'music',
          projectSlug: 'global-assets',
          songTitle: finalTitle,
          onProgress: (pct) => setAudioUploadProgress(pct),
        });
        finalUrl = uploaded.url;
        void loadFirebaseState();
      } catch (err) {
        setAssetStatusMsg(
          err instanceof Error ? err.message : 'Audio upload failed — please try again.'
        );
        setIsUploadingAudio(false);
        setAudioUploadProgress(null);
        return;
      } finally {
        setIsUploadingAudio(false);
      }
    }

    onUpdateMusicLibrary([
      ...musicLibrary,
      {
        id: `mus-${Date.now()}`,
        title: finalTitle,
        artist: newTrackArtist.trim() || 'Chasing Her Studio',
        file_url: finalUrl,
        display_order: musicLibrary.length + 1,
        is_active: true,
      },
    ]);
    setPendingAudioFile(null);
    setAudioUploadProgress(null);
    setNewTrackTitle('');
    setNewTrackArtist('');
    setNewTrackUrl('');
    setAssetStatusMsg(`Saved "${finalTitle}" to the Shared Music Library.`);
    setTimeout(() => setAssetStatusMsg(null), 3500);
  };

  const handleTestDatabaseConnection = async () => {
    setTestingDb(true);
    setFirebaseFeedback(null);
    try {
      const report = await runDatabaseConnectionTest();
      setDbReport(report);
      await loadFirebaseState();
      setFirebaseFeedbackTone(
        report.overallStatus === 'connected'
          ? 'success'
          : report.overallStatus === 'read_only'
          ? 'warning'
          : 'error'
      );
      setFirebaseFeedback(report.summary);
    } catch (error) {
      setFirebaseFeedbackTone('error');
      setFirebaseFeedback(
        error instanceof Error
          ? `Connection test error: ${error.message}`
          : 'Could not reach Firebase Firestore right now.'
      );
    } finally {
      setTestingDb(false);
    }
  };

  const handleGoogleAdminSignIn = async () => {
    setAuthBusy(true);
    setFirebaseFeedback(null);
    try {
      const cred = await signInWithGooglePopup();
      const signedEmail = cred.user?.email || 'Google account';
      const report = await runDatabaseConnectionTest();
      setDbReport(report);
      setFirebaseFeedbackTone(
        report.overallStatus === 'connected' ? 'success' : 'warning'
      );
      setFirebaseFeedback(
        report.overallStatus === 'connected'
          ? `Signed in as ${signedEmail}. Live Firestore reads & writes verified (${report.totalLatencyMs} ms).`
          : `Signed in as ${signedEmail}. ${report.summary}`
      );
    } catch (error) {
      setFirebaseFeedbackTone('error');
      setFirebaseFeedback(
        error instanceof Error
          ? `Google sign-in was not completed: ${error.message}`
          : 'Google sign-in could not be completed.'
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleGoogleAdminSignOut = async () => {
    setAuthBusy(true);
    try {
      await signOutFirebase();
      setDbReport(null);
      setFirebaseFeedbackTone('warning');
      setFirebaseFeedback('Signed out of Firebase Google Auth. Live Admin writes paused until sign-in.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSyncWorkspaceToFirestore = async () => {
    setSyncingWorkspace(true);
    setFirebaseFeedback(null);
    try {
      const result = await syncWorkspaceSnapshotToFirestore({
        orders,
        chasingHerProjects,
        memoriesProjects,
        settingsMap: localSettings,
      });
      setFirebaseFeedbackTone('success');
      setFirebaseFeedback(
        `Synced ${result.syncedOrders} order(s), ${result.syncedProjects} project(s), and ${result.syncedSettings} setting(s) to Firestore (${FIREBASE_DATABASE_ID}).`
      );
    } catch (error) {
      setFirebaseFeedbackTone('error');
      setFirebaseFeedback(
        error instanceof Error ? error.message : 'Could not sync workspace to Firestore.'
      );
    } finally {
      setSyncingWorkspace(false);
    }
  };

  const handleCleanFirebaseStorage = async () => {
    setCleaningDb(true);
    setFirebaseFeedback(null);
    try {
      const result = await cleanFirebaseStorageCatalog();
      await loadFirebaseState();
      setFirebaseFeedbackTone('success');
      setFirebaseFeedback(
        `Storage catalog cleaned (${result.purgedObjectsCount} file${result.purgedObjectsCount === 1 ? '' : 's'} removed from ${result.storageBucket}). Firestore database records were left untouched.`
      );
    } catch {
      setFirebaseFeedbackTone('error');
      setFirebaseFeedback('Could not clean storage right now.');
    } finally {
      setCleaningDb(false);
    }
  };

  const handleTestFirebaseUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFirebaseUploading(true);
    setFirebaseFeedback(null);
    try {
      const kind = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
        ? 'music'
        : 'images';
      const uploaded = await uploadMediaToFirebase({
        file,
        kind,
        projectSlug: activeSlug || 'admin-pool',
      });
      await loadFirebaseState();
      setFirebaseFeedback(
        `Uploaded "${uploaded.objectKey.split('/').pop()}" (${Math.max(1, Math.round(uploaded.sizeBytes / 1024))} KB${
          uploaded.savedBytes > 0
            ? `, saved ${formatStorageCompact(uploaded.savedBytes)} via WebP compression`
            : ''
        }) to ${FIREBASE_STORAGE_BUCKET}.`
      );
    } catch {
      setFirebaseFeedback('Upload failed. Please try another file.');
    } finally {
      setFirebaseUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteFirebaseMedia = async (id: string) => {
    await fetch(`/api/firebase/objects/${id}`, { method: 'DELETE' });
    await loadFirebaseState();
  };

  const handleSaveCountries = async () => {
    onUpdateSettingsMap(localSettings);
    setCountrySaveFeedback(
      'Multi-country pricing, messaging, checkout URLs & post-order routes saved and synced to Firebase Firestore.'
    );
    try {
      await savePlatformSettingsToFirestore(localSettings);
    } catch {
      // ignore if user not signed in with Google
    }
    setTimeout(() => setCountrySaveFeedback(null), 3500);
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#120408] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-7 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#E2B96F]">Chasing Her Atelier</p>
              <h1 className="font-serif text-3xl text-[#FBF3EA] tracking-tight">
                Backstage Studio
              </h1>
            </div>
            <div className="w-11 h-11 rounded-xl bg-[#E2B96F]/12 border border-[#E2B96F]/25 flex items-center justify-center text-[#E2B96F] shrink-0">
              <Lock className="w-5 h-5" />
            </div>
          </div>

          <p className="text-sm text-[#FBF3EA]/70 leading-relaxed">
            Sign in to manage customer orders, craft Chasing Her &amp; Memories builds, inspect Firebase 5 GB storage, and configure regional markets.
          </p>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label htmlFor="backstage-pin" className="block text-xs font-medium text-[#FBF3EA]/75 mb-2">
                Admin Security PIN
              </label>
              <input
                id="backstage-pin"
                type="password"
                inputMode="numeric"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter 6-digit PIN"
                className="w-full min-h-[48px] px-4 rounded-xl bg-[#120408] border border-[#E2B96F]/25 text-[#FBF3EA] text-center tracking-[0.35em] font-mono text-lg focus:outline-none focus:border-[#E2B96F]"
              />
              {pinError && <p className="text-xs text-rose-400 mt-2">{pinError}</p>}
            </div>

            <button
              type="submit"
              className="w-full min-h-[46px] rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Backstage</span>
            </button>

            <button
              type="button"
              onClick={handleQuickDemoUnlock}
              className="w-full min-h-[44px] rounded-xl bg-[#120408] hover:bg-[#220911] border border-[#E2B96F]/20 text-[#FBF3EA]/85 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E2B96F]" />
              <span>Instant Demo Unlock (PIN: 150406)</span>
            </button>
          </form>

          <div className="pt-5 border-t border-[#FBF3EA]/10 flex items-center justify-between gap-3">
            {onNavigateView && (
              <button
                type="button"
                onClick={() => onNavigateView({ view: 'order' })}
                className="text-xs text-[#FBF3EA]/60 hover:text-[#E2B96F] transition-colors cursor-pointer"
              >
                ← Return to Storefront
              </button>
            )}
            <PWAInstallButton contextLabel="Backstage Admin" variant="compact" />
          </div>
        </div>
      </div>
    );
  }

  const firebaseValidation = validateFirebaseStorageConfig({
    projectId: FIREBASE_PROJECT_ID,
    databaseId: FIREBASE_DATABASE_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    enabled: true,
  });
  const totalProjectsCount =
    Object.keys(chasingHerProjects).length + Object.keys(memoriesProjects).length;
  const activeProjectKeys =
    studioProduct === 'chasing-her'
      ? Object.keys(chasingHerProjects)
      : Object.keys(memoriesProjects);

  const navGroups: Array<{
    groupLabel: string;
    items: Array<{
      id: AdminTab;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      count?: number;
      alert?: boolean;
    }>;
  }> = [
    {
      groupLabel: 'Operations',
      items: [
        {
          id: 'orders',
          label: 'Orders & Pipeline',
          icon: Package,
          count: orders.length,
          alert: needsConfirmCount > 0,
        },
        {
          id: 'sales-pages',
          label: 'Sales Pages',
          icon: Store,
          count: SALES_PAGE_DIRECTORY.length,
        },
        {
          id: 'studio',
          label: 'Site Studio',
          icon: Wand2,
          count: totalProjectsCount,
        },
      ],
    },
    {
      groupLabel: 'Brand & Media',
      items: [
        { id: 'experiences', label: 'Site Experiences', icon: Sparkles },
        { id: 'assets', label: 'Assets & Music', icon: Music },
        { id: 'testimonials', label: 'Testimonials', icon: Star, count: testimonials.length },
      ],
    },
    {
      groupLabel: 'Infrastructure',
      items: [
        { id: 'firebase', label: 'Firebase 5GB', icon: Cloud },
        { id: 'countries', label: 'Markets (GH & KE)', icon: Globe },
      ],
    },
  ];

  const activeMeta = TAB_TITLES[activeTab];

  return (
    <div className="min-h-screen bg-[#120408] text-[#FBF3EA] flex">
      {/* Desktop Left Sidebar Navigation (260px fixed rail) */}
      <aside
        aria-label="Backstage navigation sidebar"
        className="hidden lg:flex lg:w-[260px] lg:shrink-0 flex-col bg-[#16050A] border-r border-[#E2B96F]/15 sticky top-0 h-screen"
      >
        {/* Sidebar Brand Header */}
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-[#E2B96F]/15">
          <Heart className="w-5 h-5 text-[#E2B96F] fill-[#E2B96F]/25 shrink-0" />
          <div className="min-w-0">
            <span className="font-serif text-lg text-[#FBF3EA] block leading-none truncate">
              Chasing Her
            </span>
            <span className="text-[11px] text-[#E2B96F]/80 block mt-0.5 truncate">
              Backstage Operations
            </span>
          </div>
        </div>

        {/* Grouped Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {navGroups.map((group) => (
            <div key={group.groupLabel} className="space-y-1">
              <p className="px-3 text-[11px] font-medium text-[#FBF3EA]/45 mb-1.5">
                {group.groupLabel}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full min-h-[42px] px-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#E2B96F] text-[#16050A] font-semibold'
                        : 'text-[#FBF3EA]/75 hover:text-[#FBF3EA] hover:bg-[#220911]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.count !== undefined && (
                      <span
                        className={`font-mono text-[11px] tabular-nums shrink-0 ${
                          isActive
                            ? 'text-[#16050A]/80'
                            : item.alert
                            ? 'text-amber-300 font-semibold'
                            : 'text-[#FBF3EA]/45'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: Customer App Shortcut & Lock */}
        <div className="p-3 border-t border-[#E2B96F]/15 space-y-1">
          {onNavigateView && (
            <button
              type="button"
              onClick={() => onNavigateView({ view: 'my-site' })}
              className="w-full min-h-[38px] px-3 rounded-lg text-xs text-[#FBF3EA]/65 hover:text-[#FBF3EA] hover:bg-[#220911] flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#E2B96F]/80 shrink-0" />
              <span>Customer My Site</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleLock}
            className="w-full min-h-[38px] px-3 rounded-lg text-xs text-[#FBF3EA]/55 hover:text-rose-200 hover:bg-rose-950/35 flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Lock Backstage</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-12">
        {/* Contextual Workspace Top Bar (Single Row) */}
        <header className="sticky top-0 z-30 h-16 bg-[#16050A]/92 backdrop-blur-md border-b border-[#E2B96F]/15 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
            <span className="text-[#FBF3EA]/50 hidden sm:inline whitespace-nowrap">Backstage</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#FBF3EA]/35 hidden sm:inline shrink-0" />
            <span className="font-serif text-base sm:text-lg text-[#FBF3EA] truncate">
              {activeMeta.title}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {activeTab === 'orders' && (
              <>
                <button
                  type="button"
                  onClick={handleExportOrdersCsv}
                  className="hidden sm:inline-flex min-h-[38px] px-3.5 rounded-xl border border-[#E2B96F]/25 bg-[#120408] hover:border-[#E2B96F]/60 text-xs font-medium text-[#FBF3EA]/85 items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-[#E2B96F]" />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  data-testid="admin-new-order-btn"
                  onClick={() => setShowCreateOrderModal(true)}
                  className="min-h-[38px] px-4 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Order</span>
                </button>
              </>
            )}

            {activeTab === 'countries' && (
              <button
                type="button"
                onClick={handleSaveCountries}
                className="min-h-[38px] px-4 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Markets</span>
              </button>
            )}

            {activeTab !== 'orders' && activeTab !== 'countries' && (
              <div className="hidden sm:block">
                <PWAInstallButton contextLabel="Backstage Admin" variant="compact" />
              </div>
            )}
          </div>
        </header>

        {/* Main Content Viewport */}
        <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Section Subtitle Strip */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl text-[#FBF3EA] tracking-tight">
                {activeMeta.title}
              </h1>
              <p className="text-xs sm:text-sm text-[#FBF3EA]/65 mt-1">{activeMeta.subtitle}</p>
            </div>
            <div className="text-xs text-[#FBF3EA]/55 flex items-center gap-2 shrink-0">
              <span>Firebase: {FIREBASE_PROJECT_ID}</span>
              <span aria-hidden="true">·</span>
              {isVerifiedAdminUser(firebaseUser) ? (
                <span className="text-emerald-300 font-medium">Admin Sync Live</span>
              ) : dbReport?.overallStatus === 'error' ? (
                <span className="text-rose-300 font-medium">Connection Issue</span>
              ) : dbReport?.overallStatus === 'read_only' ? (
                <span className="text-amber-300 font-medium">Server Online · Sign In for Writes</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('firebase')}
                  className="text-[#E2B96F] hover:underline font-medium cursor-pointer"
                >
                  Check Database
                </button>
              )}
            </div>
          </div>

          {/* ================================================================
              TAB 1: ORDERS & FULFILLMENT (MASTER-DETAIL + PIPELINE BOARD)
              ================================================================ */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              {/* Clickable KPI Filter Strip (Single Elevation, Tabular Numerals) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setStageFilter('all')}
                  className={`text-left rounded-2xl p-4 sm:p-5 border transition-colors cursor-pointer ${
                    stageFilter === 'all'
                      ? 'bg-[#220911] border-[#E2B96F]/55'
                      : 'bg-[#1A060C] border-[#E2B96F]/15 hover:border-[#E2B96F]/35'
                  }`}
                >
                  <p className="text-xs text-[#FBF3EA]/60">Total Orders</p>
                  <p className="font-serif text-3xl text-[#FBF3EA] mt-1 font-mono tabular-nums">
                    {orders.length}
                  </p>
                  <p className="text-xs text-[#E2B96F]/85 mt-1">Ghana · Kenya</p>
                </button>

                <button
                  type="button"
                  onClick={() => setStageFilter('needs_confirm')}
                  className={`text-left rounded-2xl p-4 sm:p-5 border transition-colors cursor-pointer ${
                    stageFilter === 'needs_confirm'
                      ? 'bg-[#220911] border-amber-400/60'
                      : 'bg-[#1A060C] border-[#E2B96F]/15 hover:border-amber-400/40'
                  }`}
                >
                  <p className="text-xs text-[#FBF3EA]/60">Needs Payment Confirm</p>
                  <p className="font-serif text-3xl text-amber-300 mt-1 font-mono tabular-nums">
                    {needsConfirmCount}
                  </p>
                  <p className="text-xs text-amber-200/75 mt-1">Returned from checkout</p>
                </button>

                <button
                  type="button"
                  onClick={() => setStageFilter('building')}
                  className={`text-left rounded-2xl p-4 sm:p-5 border transition-colors cursor-pointer ${
                    stageFilter === 'building'
                      ? 'bg-[#220911] border-[#E2B96F]/55'
                      : 'bg-[#1A060C] border-[#E2B96F]/15 hover:border-[#E2B96F]/35'
                  }`}
                >
                  <p className="text-xs text-[#FBF3EA]/60">In Studio Build</p>
                  <p className="font-serif text-3xl text-[#E2B96F] mt-1 font-mono tabular-nums">
                    {orders.filter((o) => o.progress === 'building' || o.progress === 'review').length}
                  </p>
                  <p className="text-xs text-[#FBF3EA]/55 mt-1">Building &amp; final review</p>
                </button>

                <button
                  type="button"
                  onClick={() => setStageFilter('hosted')}
                  className={`text-left rounded-2xl p-4 sm:p-5 border transition-colors cursor-pointer ${
                    stageFilter === 'hosted'
                      ? 'bg-[#220911] border-emerald-400/50'
                      : 'bg-[#1A060C] border-[#E2B96F]/15 hover:border-emerald-400/35'
                  }`}
                >
                  <p className="text-xs text-[#FBF3EA]/60">Live &amp; Hosted</p>
                  <p className="font-serif text-3xl text-emerald-300 mt-1 font-mono tabular-nums">
                    {orders.filter((o) => o.progress === 'hosted').length}
                  </p>
                  <p className="text-xs text-[#FBF3EA]/55 mt-1">Delivered to customers</p>
                </button>
              </div>

              {/* Filter Toolbar + View Mode Switcher */}
              <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/15 p-3.5 flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-4 h-4 text-[#FBF3EA]/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search customer, /slug, email, or WhatsApp..."
                    className="w-full min-h-[42px] pl-10 pr-4 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-sm text-[#FBF3EA] placeholder:text-[#FBF3EA]/40 focus:outline-none focus:border-[#E2B96F]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Country Segmented Control */}
                  <div className="flex items-center bg-[#120408] p-1 rounded-xl border border-[#E2B96F]/15">
                    {(['all', ...ACTIVE_COUNTRIES] as const).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setCountryFilter(code)}
                        className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          countryFilter === code
                            ? 'bg-[#E2B96F] text-[#16050A]'
                            : 'text-[#FBF3EA]/65 hover:text-[#FBF3EA]'
                        }`}
                      >
                        {code === 'all' ? 'All' : code.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <select
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value as 'all' | ProductType)}
                    aria-label="Filter orders by product edition"
                    className="min-h-[42px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
                  >
                    <option value="all">All Editions</option>
                    <option value="chasing-her">Chasing Her</option>
                    <option value="memories">Memories 34-Heart</option>
                    <option value="custom">Concierge Build</option>
                  </select>

                  <select
                    value={stageFilter}
                    onChange={(e) =>
                      setStageFilter(e.target.value as 'all' | 'needs_confirm' | OrderProgressStage)
                    }
                    aria-label="Filter orders by stage"
                    className="min-h-[42px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
                  >
                    <option value="all">All Stages</option>
                    <option value="needs_confirm">Needs Payment Confirm</option>
                    <option value="received">Order Received</option>
                    <option value="building">Building Site</option>
                    <option value="review">Final Review</option>
                    <option value="hosted">Live &amp; Hosted</option>
                  </select>

                  {/* View Switcher: Table vs Pipeline Board */}
                  <div className="flex items-center bg-[#120408] p-1 rounded-xl border border-[#E2B96F]/15">
                    <button
                      type="button"
                      onClick={() => setOrderViewMode('table')}
                      aria-label="Table view"
                      className={`min-h-[34px] px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                        orderViewMode === 'table'
                          ? 'bg-[#E2B96F] text-[#16050A] font-semibold'
                          : 'text-[#FBF3EA]/65 hover:text-[#FBF3EA]'
                      }`}
                    >
                      <LayoutList className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderViewMode('board')}
                      aria-label="Pipeline board view"
                      className={`min-h-[34px] px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                        orderViewMode === 'board'
                          ? 'bg-[#E2B96F] text-[#16050A] font-semibold'
                          : 'text-[#FBF3EA]/65 hover:text-[#FBF3EA]'
                      }`}
                    >
                      <Columns3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Pipeline</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* TABLE VIEW WITH SPLIT ORDER INSPECTOR */}
              {orderViewMode === 'table' ? (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                  <div
                    className={`${
                      selectedOrder ? 'xl:col-span-7 2xl:col-span-8' : 'xl:col-span-12'
                    } rounded-2xl bg-[#1A060C] border border-[#E2B96F]/15 overflow-hidden`}
                  >
                    {filteredOrders.length === 0 ? (
                      <div className="p-12 text-center space-y-3">
                        <Package className="w-8 h-8 text-[#E2B96F]/70 mx-auto" />
                        <p className="font-serif text-xl text-[#FBF3EA]">No matching orders</p>
                        <p className="text-xs text-[#FBF3EA]/60 max-w-sm mx-auto">
                          Adjust your filters or log a new customer order manually.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setCountryFilter('all');
                            setProductFilter('all');
                            setStageFilter('all');
                          }}
                          className="min-h-[40px] px-4 rounded-xl border border-[#E2B96F]/30 text-xs font-medium text-[#E2B96F] hover:bg-[#E2B96F]/10 cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Mobile / Small Screen Order Card Stack (Zero Horizontal Scroll) */}
                        <div className="md:hidden divide-y divide-[#FBF3EA]/10">
                          {filteredOrders.map((order) => {
                            const countryCfg = COUNTRIES[order.country] || COUNTRIES.gh;
                            const pricing = resolveCountrySettings(order.country, localSettings);
                            const isSelected = selectedOrder?.id === order.id;
                            const awaitingConfirm =
                              Boolean(order.returned_from_payment_at) &&
                              order.status === 'pending_payment';
                            const stageMeta =
                              PROGRESS_STAGES.find((s) => s.id === order.progress) ||
                              PROGRESS_STAGES[0];

                            return (
                              <div
                                key={order.id}
                                onClick={() => setSelectedOrderId(order.id)}
                                className={`p-4 space-y-2.5 transition-colors cursor-pointer ${
                                  isSelected ? 'bg-[#280B14]' : 'hover:bg-[#210810]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-serif text-base text-[#FBF3EA] truncate">
                                      {order.full_name}
                                    </p>
                                    <p className="text-xs font-mono text-[#E2B96F] truncate">
                                      /{order.slug}
                                    </p>
                                  </div>
                                  <span
                                    className={`text-xs font-semibold shrink-0 ${
                                      order.status === 'paid' || order.status === 'hosted'
                                        ? 'text-emerald-300'
                                        : 'text-amber-300'
                                    }`}
                                  >
                                    {order.status === 'paid' || order.status === 'hosted'
                                      ? 'Verified'
                                      : awaitingConfirm
                                      ? 'Confirm Now'
                                      : 'Pending'}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#FBF3EA]/65">
                                  <span>
                                    {countryCfg.flag} {countryCfg.code.toUpperCase()}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    {order.product === 'chasing-her'
                                      ? 'Chasing Her'
                                      : order.product === 'memories'
                                      ? 'Memories'
                                      : 'Concierge'}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums text-[#E2B96F]">
                                    {order.product === 'custom'
                                      ? pricing.priceCustom
                                      : pricing.pricePage}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>{stageMeta.short}</span>
                                </div>

                                <div
                                  className="flex items-center gap-2 pt-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrderId(order.id)}
                                    className="flex-1 min-h-[38px] px-3 rounded-lg bg-[#E2B96F] text-[#16050A] font-semibold text-xs cursor-pointer"
                                  >
                                    Manage Order
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenOrderInStudio(order)}
                                    className="min-h-[38px] px-3.5 rounded-lg border border-[#E2B96F]/30 text-[#E2B96F] font-medium text-xs cursor-pointer"
                                  >
                                    Studio
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Desktop High-Density Scannable Table (Fits Cleanly Next to Inspector) */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left border-collapse table-fixed">
                            <thead>
                              <tr className="border-b border-[#E2B96F]/15 text-[11px] font-medium text-[#FBF3EA]/55 bg-[#16050A]">
                                <th className="py-3 px-4 w-[34%]">Customer &amp; Link</th>
                                <th className="py-3 px-3 w-[23%]">Edition &amp; Market</th>
                                <th className="py-3 px-3 w-[16%]">Payment</th>
                                <th className="py-3 px-3 w-[14%]">Stage</th>
                                <th className="py-3 px-4 w-[13%] text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#FBF3EA]/8 text-xs">
                              {filteredOrders.map((order) => {
                                const countryCfg = COUNTRIES[order.country] || COUNTRIES.gh;
                                const pricing = resolveCountrySettings(order.country, localSettings);
                                const isSelected = selectedOrder?.id === order.id;
                                const awaitingConfirm =
                                  Boolean(order.returned_from_payment_at) &&
                                  order.status === 'pending_payment';
                                const stageMeta =
                                  PROGRESS_STAGES.find((s) => s.id === order.progress) ||
                                  PROGRESS_STAGES[0];

                                return (
                                  <tr
                                    key={order.id}
                                    onClick={() => setSelectedOrderId(order.id)}
                                    className={`transition-colors cursor-pointer ${
                                      isSelected ? 'bg-[#280B14]' : 'hover:bg-[#210810]'
                                    }`}
                                  >
                                    <td className="py-3.5 px-4">
                                      <div className="font-medium text-[#FBF3EA] text-sm truncate">
                                        {order.full_name}
                                      </div>
                                      <div className="text-[11px] text-[#E2B96F] font-mono truncate mt-0.5">
                                        /{order.slug}
                                      </div>
                                      <div className="text-[11px] text-[#FBF3EA]/50 truncate">
                                        {order.email}
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-3">
                                      <div className="text-[#FBF3EA]/90 font-medium truncate">
                                        {order.product === 'chasing-her'
                                          ? 'Chasing Her'
                                          : order.product === 'memories'
                                          ? 'Memories 34-Heart'
                                          : 'Concierge Build'}
                                      </div>
                                      <div className="text-[11px] text-[#FBF3EA]/55 mt-0.5 font-mono tabular-nums truncate">
                                        {countryCfg.flag} {countryCfg.code.toUpperCase()} ·{' '}
                                        {order.product === 'custom'
                                          ? pricing.priceCustom
                                          : pricing.pricePage}
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-3 whitespace-nowrap">
                                      <span
                                        className={`font-semibold ${
                                          order.status === 'paid' || order.status === 'hosted'
                                            ? 'text-emerald-300'
                                            : 'text-amber-300'
                                        }`}
                                      >
                                        {order.status === 'paid' || order.status === 'hosted'
                                          ? 'Verified'
                                          : awaitingConfirm
                                          ? 'Confirm Now'
                                          : 'Pending'}
                                      </span>
                                      <div className="text-[11px] text-[#FBF3EA]/50 font-mono tabular-nums mt-0.5">
                                        PIN {order.pin}
                                      </div>
                                    </td>

                                    <td className="py-3.5 px-3 whitespace-nowrap">
                                      <span className="text-[#FBF3EA]/90 font-medium">
                                        {stageMeta.short}
                                      </span>
                                    </td>

                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                      <div
                                        className="inline-flex items-center justify-end gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleOpenOrderInStudio(order)}
                                          className="min-h-[32px] px-2.5 rounded-lg bg-[#E2B96F]/15 hover:bg-[#E2B96F] text-[#E2B96F] hover:text-[#16050A] font-semibold text-xs transition-colors cursor-pointer"
                                        >
                                          Studio
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Persistent Right-Hand Order Fulfillment Inspector on Desktop */}
                  {selectedOrder && (
                    <div className="hidden xl:block xl:col-span-5 2xl:col-span-4 xl:sticky xl:top-20">
                      <AdminOrderInspector
                        order={selectedOrder}
                        hasProject={Boolean(
                          chasingHerProjects[selectedOrder.slug] ||
                            memoriesProjects[selectedOrder.slug]
                        )}
                        localSettings={localSettings}
                        onUpdateOrder={onUpdateOrder}
                        onDeleteOrder={
                          onDeleteOrder
                            ? (id) => {
                                onDeleteOrder(id);
                                const next = orders.find((o) => o.id !== id);
                                setSelectedOrderId(next?.id || null);
                              }
                            : undefined
                        }
                        onOpenInStudio={handleOpenOrderInStudio}
                        onPreview={(order) =>
                          setPreviewOrderModal({
                            product:
                              order.build_product === 'memories' || order.product === 'memories'
                                ? 'memories'
                                : 'chasing-her',
                            slug: order.slug,
                          })
                        }
                        onClose={() => setSelectedOrderId(null)}
                      />
                    </div>
                  )}

                  {/* Mobile / Tablet Inline Inspector Card Below List When Selected */}
                  {selectedOrder && (
                    <div className="xl:hidden">
                      <AdminOrderInspector
                        order={selectedOrder}
                        hasProject={Boolean(
                          chasingHerProjects[selectedOrder.slug] ||
                            memoriesProjects[selectedOrder.slug]
                        )}
                        localSettings={localSettings}
                        onUpdateOrder={onUpdateOrder}
                        onDeleteOrder={
                          onDeleteOrder
                            ? (id) => {
                                onDeleteOrder(id);
                                const next = orders.find((o) => o.id !== id);
                                setSelectedOrderId(next?.id || null);
                              }
                            : undefined
                        }
                        onOpenInStudio={handleOpenOrderInStudio}
                        onPreview={(order) =>
                          setPreviewOrderModal({
                            product:
                              order.build_product === 'memories' || order.product === 'memories'
                                ? 'memories'
                                : 'chasing-her',
                            slug: order.slug,
                          })
                        }
                        onClose={() => setSelectedOrderId(null)}
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* PIPELINE BOARD VIEW (4 STAGES) */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
                  {PROGRESS_STAGES.map((stage, stageIndex) => {
                    const colOrders = filteredOrders.filter((o) => o.progress === stage.id);
                    return (
                      <div
                        key={stage.id}
                        className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/15 p-3.5 space-y-3"
                      >
                        <div className="flex items-center justify-between px-1 pb-2 border-b border-[#FBF3EA]/10">
                          <span className="text-xs font-semibold text-[#FBF3EA]">
                            0{stageIndex + 1}. {stage.label}
                          </span>
                          <span className="text-xs font-mono tabular-nums text-[#E2B96F]">
                            {colOrders.length}
                          </span>
                        </div>

                        {colOrders.length === 0 ? (
                          <div className="py-8 text-center text-xs text-[#FBF3EA]/40">
                            No orders in {stage.short}
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {colOrders.map((order) => {
                              const countryCfg = COUNTRIES[order.country] || COUNTRIES.gh;
                              return (
                                <div
                                  key={order.id}
                                  onClick={() => {
                                    setSelectedOrderId(order.id);
                                    setOrderViewMode('table');
                                  }}
                                  className="rounded-xl bg-[#120408] border border-[#E2B96F]/15 hover:border-[#E2B96F]/45 p-3.5 space-y-2.5 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center justify-between text-[11px] text-[#FBF3EA]/55">
                                    <span>
                                      {countryCfg.flag} {countryCfg.code.toUpperCase()} ·{' '}
                                      {order.product === 'memories'
                                        ? 'Memories'
                                        : order.product === 'custom'
                                        ? 'Concierge'
                                        : 'Chasing Her'}
                                    </span>
                                    <span
                                      className={
                                        order.status === 'paid' || order.status === 'hosted'
                                          ? 'text-emerald-300 font-medium'
                                          : 'text-amber-300 font-medium'
                                      }
                                    >
                                      {order.status === 'paid' || order.status === 'hosted'
                                        ? 'Paid'
                                        : 'Pending'}
                                    </span>
                                  </div>

                                  <div>
                                    <p className="font-serif text-base text-[#FBF3EA]">
                                      {order.full_name}
                                    </p>
                                    <p className="text-[11px] font-mono text-[#E2B96F]">
                                      /{order.slug}
                                    </p>
                                  </div>

                                  <div
                                    className="flex items-center justify-between gap-2 pt-2 border-t border-[#FBF3EA]/8"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleOpenOrderInStudio(order)}
                                      className="text-[11px] font-semibold text-[#E2B96F] hover:underline cursor-pointer"
                                    >
                                      Open Studio
                                    </button>
                                    {stageIndex < PROGRESS_STAGES.length - 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleAdvanceOrderStage(order)}
                                        className="min-h-[28px] px-2.5 rounded-lg bg-[#220911] border border-[#E2B96F]/25 hover:border-[#E2B96F] text-[11px] text-[#FBF3EA] inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <span>Next</span>
                                        <ArrowRight className="w-3 h-3 text-[#E2B96F]" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB 2: UNIFIED SITE STUDIO
              ================================================================ */}
          {activeTab === 'studio' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStudioProduct('chasing-her');
                      const firstSlug = Object.keys(chasingHerProjects)[0] || 'ama-and-kofi';
                      setActiveSlug(firstSlug);
                    }}
                    className={`min-h-[42px] px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                      studioProduct === 'chasing-her'
                        ? 'bg-[#E2B96F] text-[#16050A]'
                        : 'bg-[#120408] text-[#FBF3EA]/80 border border-[#E2B96F]/20 hover:border-[#E2B96F]/45'
                    }`}
                  >
                    <Heart className="w-4 h-4" />
                    <span>Chasing Her ({Object.keys(chasingHerProjects).length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStudioProduct('memories');
                      const firstSlug = Object.keys(memoriesProjects)[0] || 'wanjiku-and-brian';
                      setActiveSlug(firstSlug);
                    }}
                    className={`min-h-[42px] px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                      studioProduct === 'memories'
                        ? 'bg-[#E2B96F] text-[#16050A]'
                        : 'bg-[#120408] text-[#FBF3EA]/80 border border-[#E2B96F]/20 hover:border-[#E2B96F]/45'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Memories 34-Heart ({Object.keys(memoriesProjects).length})</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={activeSlug}
                    onChange={(e) => setActiveSlug(e.target.value)}
                    aria-label="Select project to edit"
                    className="min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/25 text-xs text-[#FBF3EA]"
                  >
                    {studioProduct === 'chasing-her'
                      ? Object.values(chasingHerProjects).map((p) => (
                          <option key={p.slug} value={p.slug}>
                            /{p.slug} — PIN {p.pin}
                          </option>
                        ))
                      : Object.values(memoriesProjects).map((p) => (
                          <option key={p.slug} value={p.slug}>
                            /{p.slug} ({p.collage_names}) — PIN {p.pin}
                          </option>
                        ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleCreateNewProject(studioProduct)}
                    className="min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/35 text-[#E2B96F] text-xs font-semibold flex items-center gap-1.5 hover:bg-[#E2B96F]/15 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDuplicateCurrentProject}
                    className="min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/30 text-[#FBF3EA] text-xs font-semibold flex items-center gap-1.5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <CopyPlus className="w-4 h-4 text-[#E2B96F]" />
                    <span>Duplicate</span>
                  </button>

                  {onDeleteProject && activeProjectKeys.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteProject(studioProduct, activeSlug);
                        const remaining = activeProjectKeys.filter((k) => k !== activeSlug);
                        if (remaining[0]) setActiveSlug(remaining[0]);
                      }}
                      className="min-h-[42px] px-3 rounded-xl bg-rose-950/60 border border-rose-500/35 text-rose-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-900/70 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              <SiteBuilderStudio
                mode="admin"
                initialProduct={studioProduct}
                activeSlug={activeSlug}
                chasingHerProjects={chasingHerProjects}
                memoriesProjects={memoriesProjects}
                onSaveChasingHer={onSaveChasingHer}
                onSaveMemories={onSaveMemories}
                globalFlowerPool={globalFlowerPool}
                globalMusicLibrary={musicLibrary}
              />
            </div>
          )}

          {/* ================================================================
              TAB 2.5: SITE EXPERIENCES & EXAMPLE FEATURES EDITOR
              ================================================================ */}
          {activeTab === 'experiences' && (
            <AdminExperienceShowcaseEditor
              siteExperiences={siteExperiences}
              onSaveSiteExperiences={async (next) => {
                await onUpdateSiteExperiences?.(next);
              }}
              onUploadExperienceMedia={async (key: SiteExperienceKey, file: File) => {
                try {
                  const isVid = file.type.startsWith('video/');
                  const uploaded = await uploadMediaToFirebase({
                    file,
                    kind: isVid ? 'video' : 'images',
                    projectSlug: `experience-${key}`,
                  });
                  await loadFirebaseState();
                  return {
                    url: uploaded.url,
                    mediaType: isVid ? 'video' : 'image',
                  };
                } catch {
                  return null;
                }
              }}
              onOpenSampleInStudio={(key: SiteExperienceKey) => {
                const sampleSlug =
                  key === 'chasing-her' ? 'ama-and-kofi' : 'wanjiku-and-brian';
                setStudioProduct(key);
                setActiveSlug(sampleSlug);
                setActiveTab('studio');
              }}
              onPreviewSample={(key: SiteExperienceKey) => {
                const sampleSlug =
                  key === 'chasing-her' ? 'ama-and-kofi' : 'wanjiku-and-brian';
                setPreviewOrderModal({ product: key, slug: sampleSlug });
              }}
            />
          )}

          {/* ================================================================
              TAB 3: GLOBAL ASSETS & MUSIC
              ================================================================ */}
          {activeTab === 'assets' && (
            <div className="space-y-6">
              {assetStatusMsg && (
                <div className="rounded-xl bg-emerald-950/70 border border-emerald-500/35 px-4 py-3 text-xs text-emerald-200">
                  {assetStatusMsg}
                </div>
              )}

              {/* 3A: Locked 5-Blossom Signature Flower Wall */}
              <div
                data-testid="admin-locked-flower-wall"
                className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#E2B96F] font-medium">
                      Exclusive Brand Signature · Locked Across All Sites
                    </p>
                    <h2 className="font-serif text-2xl text-[#FBF3EA] mt-0.5">
                      Signature 5-Blossom Flower Wall
                    </h2>
                    <p className="text-xs text-[#FBF3EA]/65 mt-1">
                      Only these 5 botanical blossoms are used for the opening flower curtain across Chasing Her, Memories, previews, and standalone exports. Customers cannot change or upload flowers.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-1.5 min-h-[34px] px-3 rounded-lg bg-[#120408] border border-[#E2B96F]/30 text-xs font-semibold text-[#E2B96F] whitespace-nowrap">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Fixed · 5 Blossoms</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {LOCKED_FLOWER_WALL_ITEMS.map((flower) => (
                    <div
                      key={flower.id}
                      className="rounded-xl bg-[#120408] border border-[#E2B96F]/20 p-3 flex flex-col items-center gap-2 text-center"
                    >
                      <div className="w-20 h-20 flex items-center justify-center">
                        <img
                          src={flower.url}
                          alt={flower.name}
                          className="w-full h-full object-contain drop-shadow-md"
                        />
                      </div>
                      <span className="text-xs font-medium text-[#FBF3EA]/90">{flower.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3B: Shared Music Library (Fast Binary Upload + Song Naming) */}
              <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#E2B96F] font-medium">
                      Soundtracks For Builders · High-Speed Direct Audio Upload
                    </p>
                    <h2 className="font-serif text-2xl text-[#FBF3EA] mt-0.5">
                      Shared Music Library ({musicLibrary.length} tracks)
                    </h2>
                  </div>
                  <label className="min-h-[42px] px-4 rounded-xl bg-[#120408] border border-[#E2B96F]/35 hover:border-[#E2B96F] text-[#E2B96F] text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap">
                    <Upload className="w-4 h-4" />
                    <span>{pendingAudioFile ? 'Change Audio File' : 'Select MP3 / Audio'}</span>
                    <input
                      data-testid="admin-audio-file-input"
                      type="file"
                      accept="audio/*"
                      onChange={handleSelectAdminAudioFile}
                      className="hidden"
                    />
                  </label>
                </div>

                {pendingAudioFile && (
                  <div className="rounded-xl bg-[#120408] border border-[#E2B96F]/35 p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Music className="w-4 h-4 text-[#E2B96F] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#FBF3EA] truncate">
                            Selected file: {pendingAudioFile.name}
                          </p>
                          <p className="text-[11px] text-[#FBF3EA]/55 font-mono tabular-nums">
                            {formatStorageCompact(pendingAudioFile.size)} · Ready to name &amp; stream
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isUploadingAudio}
                        onClick={() => {
                          setPendingAudioFile(null);
                          setAudioUploadProgress(null);
                        }}
                        className="min-h-[30px] px-2.5 rounded-lg border border-white/15 text-[11px] text-[#FBF3EA]/70 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Cancel</span>
                      </button>
                    </div>

                    {audioUploadProgress !== null && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-[#E2B96F] font-mono tabular-nums">
                          <span>Uploading audio…</span>
                          <span>{audioUploadProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#260A13] overflow-hidden">
                          <div
                            className="h-full bg-[#E2B96F] transition-all duration-150"
                            style={{ width: `${audioUploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <input
                    data-testid="admin-audio-song-name-input"
                    type="text"
                    value={newTrackTitle}
                    onChange={(e) => setNewTrackTitle(e.target.value)}
                    placeholder="Song name (e.g. Our Midnight Piano)"
                    className="sm:col-span-4 min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/30 text-xs text-[#FBF3EA] focus:outline-none focus:border-[#E2B96F]"
                  />
                  <input
                    data-testid="admin-audio-artist-input"
                    type="text"
                    value={newTrackArtist}
                    onChange={(e) => setNewTrackArtist(e.target.value)}
                    placeholder="Artist / Mood (optional)"
                    className="sm:col-span-3 min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA] focus:outline-none focus:border-[#E2B96F]"
                  />
                  <input
                    type="text"
                    value={pendingAudioFile ? `File: ${pendingAudioFile.name}` : newTrackUrl}
                    onChange={(e) => {
                      if (!pendingAudioFile) setNewTrackUrl(e.target.value);
                    }}
                    readOnly={Boolean(pendingAudioFile)}
                    placeholder="Direct audio URL (or select file above)"
                    className="sm:col-span-3 min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs font-mono text-[#FBF3EA]/85"
                  />
                  <button
                    type="button"
                    data-testid="admin-audio-upload-submit-btn"
                    disabled={isUploadingAudio || (!newTrackTitle.trim() && !pendingAudioFile)}
                    onClick={handleUploadAndAddTrack}
                    className="sm:col-span-2 min-h-[42px] px-3 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] disabled:opacity-50 text-[#16050A] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>
                      {isUploadingAudio
                        ? `${audioUploadProgress ?? 0}%`
                        : pendingAudioFile
                        ? 'Upload & Add'
                        : 'Add Track'}
                    </span>
                  </button>
                </div>

                <div className="divide-y divide-[#FBF3EA]/10 border-t border-[#FBF3EA]/10">
                  {musicLibrary.map((track) => {
                    const isEditing = editingTrackId === track.id;
                    return (
                      <div
                        key={track.id}
                        className="py-3 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-9 w-9 rounded-lg bg-[#E2B96F]/12 text-[#E2B96F] flex items-center justify-center shrink-0">
                            <Music className="w-4 h-4" />
                          </div>
                          {isEditing ? (
                            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                              <input
                                type="text"
                                value={editingTrackTitle}
                                onChange={(e) => setEditingTrackTitle(e.target.value)}
                                placeholder="Song name"
                                className="min-h-[34px] flex-1 min-w-[140px] px-2.5 rounded-lg bg-[#120408] border border-[#E2B96F]/45 text-xs text-[#FBF3EA]"
                              />
                              <input
                                type="text"
                                value={editingTrackArtist}
                                onChange={(e) => setEditingTrackArtist(e.target.value)}
                                placeholder="Artist / Mood"
                                className="min-h-[34px] w-40 px-2.5 rounded-lg bg-[#120408] border border-[#E2B96F]/25 text-xs text-[#FBF3EA]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editingTrackTitle.trim()) return;
                                  onUpdateMusicLibrary(
                                    musicLibrary.map((m) =>
                                      m.id === track.id
                                        ? {
                                            ...m,
                                            title: editingTrackTitle.trim(),
                                            artist: editingTrackArtist.trim() || m.artist,
                                          }
                                        : m
                                    )
                                  );
                                  setEditingTrackId(null);
                                }}
                                className="min-h-[34px] px-3 rounded-lg bg-[#E2B96F] text-[#16050A] font-semibold text-xs cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTrackId(null)}
                                className="min-h-[34px] px-2.5 rounded-lg border border-white/15 text-xs text-[#FBF3EA]/70 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#FBF3EA] truncate">
                                {track.title}
                              </p>
                              <p className="text-xs text-[#FBF3EA]/55">
                                {track.artist || 'Instrumental'}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {track.file_url && (
                            <audio controls src={track.file_url} className="h-8 w-44" />
                          )}
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTrackId(track.id);
                                setEditingTrackTitle(track.title);
                                setEditingTrackArtist(track.artist || '');
                              }}
                              aria-label={`Rename track ${track.title}`}
                              className="min-h-[34px] px-2.5 rounded-lg bg-[#120408] border border-[#E2B96F]/25 text-[#E2B96F] hover:border-[#E2B96F] text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Rename</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateMusicLibrary(
                                musicLibrary.map((m) =>
                                  m.id === track.id ? { ...m, is_active: !m.is_active } : m
                                )
                              )
                            }
                            className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                              track.is_active
                                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                                : 'bg-white/5 text-[#FBF3EA]/60 border border-white/10'
                            }`}
                          >
                            {track.is_active ? 'Active' : 'Hidden'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateMusicLibrary(musicLibrary.filter((m) => m.id !== track.id))
                            }
                            className="min-h-[34px] px-2.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-500/30 cursor-pointer"
                            aria-label={`Delete track ${track.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3C: Site Experiences & Example Features Shortcut */}
              <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-[#E2B96F] font-medium">Sales Page Experience Showcases</p>
                  <h2 className="font-serif text-2xl text-[#FBF3EA] mt-0.5">
                    Edit Example Features &amp; Preview Media
                  </h2>
                  <p className="text-xs text-[#FBF3EA]/65 mt-1">
                    Customize the feature checklists, descriptions, spotlight copy, and card media for Chasing Her and Memories in the dedicated Site Experiences editor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('experiences')}
                  className="min-h-[42px] px-4 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] font-semibold text-xs inline-flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Open Site Experiences Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 4: TESTIMONIALS MANAGER
              ================================================================ */}
          {activeTab === 'testimonials' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-5 sm:p-6 space-y-4">
                <div>
                  <p className="text-xs text-[#E2B96F] font-medium">Social Proof &amp; Reaction Videos</p>
                  <h2 className="font-serif text-2xl text-[#FBF3EA] mt-0.5">
                    Add Customer Testimonial
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={newTestimonial.customer_name}
                    onChange={(e) =>
                      setNewTestimonial((p) => ({ ...p, customer_name: e.target.value }))
                    }
                    placeholder="Customer name (e.g. Yaw K.)"
                    className="min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
                  />
                  <input
                    type="text"
                    value={newTestimonial.location}
                    onChange={(e) => setNewTestimonial((p) => ({ ...p, location: e.target.value }))}
                    placeholder="City (e.g. Westlands, Nairobi)"
                    className="min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
                  />
                  <select
                    value={newTestimonial.country}
                    onChange={(e) =>
                      setNewTestimonial((p) => ({ ...p, country: e.target.value as CountryCode }))
                    }
                    className="min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
                  >
                    <option value="gh">Ghana</option>
                    <option value="ke">Kenya</option>
                  </select>
                  <select
                    value={newTestimonial.product}
                    onChange={(e) =>
                      setNewTestimonial((p) => ({
                        ...p,
                        product: e.target.value as TestimonialItem['product'],
                      }))
                    }
                    className="min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
                  >
                    <option value="Chasing Her">Chasing Her</option>
                    <option value="Memories">Memories</option>
                    <option value="Build It For Me">Build It For Me</option>
                  </select>
                </div>

                <textarea
                  rows={2}
                  value={newTestimonial.quote}
                  onChange={(e) => setNewTestimonial((p) => ({ ...p, quote: e.target.value }))}
                  placeholder="Customer reaction quote..."
                  className="w-full rounded-xl bg-[#120408] border border-[#E2B96F]/20 p-3.5 text-xs text-[#FBF3EA]"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={newTestimonial.outcome}
                      onChange={(e) => setNewTestimonial((p) => ({ ...p, outcome: e.target.value }))}
                      placeholder="Outcome highlight (e.g. Paid via M-PESA)"
                      className="min-h-[40px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
                    />

                    <label className="min-h-[40px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/25 text-xs text-[#E2B96F] flex items-center gap-1.5 cursor-pointer">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Attach Photo/Video</span>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => handleUploadAssetToFirebase(e, 'testimonial')}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!newTestimonial.customer_name.trim() || !newTestimonial.quote.trim()) return;
                      onUpdateTestimonials([
                        {
                          ...newTestimonial,
                          id: `test-${Date.now()}`,
                        },
                        ...testimonials,
                      ]);
                      setNewTestimonial((p) => ({
                        ...p,
                        customer_name: '',
                        location: '',
                        quote: '',
                      }));
                    }}
                    className="min-h-[42px] px-5 rounded-xl bg-[#E2B96F] text-[#16050A] font-semibold text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Publish Testimonial</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testimonials.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/15 p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-[#E2B96F]">
                        <span>
                          {COUNTRIES[t.country]?.flag} {t.customer_name} · {t.product}
                        </span>
                        <span className="text-[11px] font-mono text-[#FBF3EA]/55">{t.location}</span>
                      </div>
                      {t.media_url && (
                        <img
                          src={t.media_url}
                          alt={t.customer_name}
                          className="w-full h-28 object-cover rounded-xl border border-white/10"
                        />
                      )}
                      <p className="font-serif italic text-sm text-[#FBF3EA]/90">“{t.quote}”</p>
                      <p className="text-xs text-[#E2B96F]/80">{t.outcome}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTestimonials(
                            testimonials.map((item) =>
                              item.id === t.id
                                ? { ...item, is_published: item.is_published === false }
                                : item
                            )
                          )
                        }
                        className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                          t.is_published !== false
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/5 text-[#FBF3EA]/55 border border-white/10'
                        }`}
                      >
                        {t.is_published !== false ? 'Published' : 'Hidden'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTestimonials(testimonials.filter((item) => item.id !== t.id))
                        }
                        aria-label={`Delete testimonial from ${t.customer_name}`}
                        className="min-h-[34px] px-3 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 5: FIREBASE 5 GB STORAGE & FIRESTORE DATABASE
              ================================================================ */}
          {activeTab === 'firebase' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-5 sm:p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-[#E2B96F] font-medium">
                      Firebase 5 GB Free Plan &amp; Firestore
                    </p>
                    <h2 className="font-serif text-2xl text-[#FBF3EA] mt-1">
                      Firebase Cloud Storage &amp; Database
                    </h2>
                    <p className="text-xs text-[#FBF3EA]/70 mt-1 leading-relaxed">
                      Customer photos are automatically compressed to crisp WebP on the customer&apos;s device before upload and stored inside your dedicated 5 GB Firebase bucket.
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#E2B96F]/12 border border-[#E2B96F]/25 flex items-center justify-center text-[#E2B96F] shrink-0">
                    <Server className="w-5 h-5" />
                  </div>
                </div>

                <div className="rounded-xl bg-[#120408] border border-[#E2B96F]/15 p-3.5 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {dbReport?.overallStatus === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : isVerifiedAdminUser(firebaseUser) || dbReport?.overallStatus === 'connected' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Database className="w-4 h-4 text-[#E2B96F] shrink-0" />
                    )}
                    <span className="text-[#FBF3EA]/85">
                      {dbReport
                        ? dbReport.summary
                        : firebaseValidation.message}
                    </span>
                  </div>
                  <span
                    data-testid="firebase-connection-badge"
                    className={`font-mono uppercase shrink-0 ${
                      dbReport?.overallStatus === 'error'
                        ? 'text-rose-300'
                        : isVerifiedAdminUser(firebaseUser) || dbReport?.overallStatus === 'connected'
                        ? 'text-emerald-300'
                        : dbReport?.overallStatus === 'read_only'
                        ? 'text-amber-300'
                        : 'text-[#E2B96F]'
                    }`}
                  >
                    {dbReport?.overallStatus === 'error'
                      ? 'Offline / Error'
                      : isVerifiedAdminUser(firebaseUser) || dbReport?.overallStatus === 'connected'
                      ? 'Live Read & Write'
                      : dbReport?.overallStatus === 'read_only'
                      ? 'Reachable (Read)'
                      : 'Not Tested Yet'}
                  </span>
                </div>

                {/* Google Admin Authentication & Live Sync Card */}
                <div className="rounded-xl bg-[#120408] border border-[#E2B96F]/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-semibold text-[#FBF3EA]">
                        Google Admin Database Sync
                      </p>
                      <p className="text-[11px] text-[#FBF3EA]/65 leading-relaxed">
                        {isVerifiedAdminUser(firebaseUser)
                          ? `Authenticated as ${firebaseUser?.email}. Orders, projects, and settings automatically sync to Firestore.`
                          : firebaseUser
                          ? `Signed in as ${firebaseUser.email}. Sign in with ${FIREBASE_ADMIN_EMAIL} to unlock full Admin Firestore writes.`
                          : `Firestore rules protect writes behind verified Google Auth (${FIREBASE_ADMIN_EMAIL}). Sign in to enable live database writes & cross-device sync.`}
                      </p>
                    </div>
                    {isVerifiedAdminUser(firebaseUser) && (
                      <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                        Verified Admin
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isVerifiedAdminUser(firebaseUser) ? (
                      <button
                        type="button"
                        data-testid="admin-google-signin-btn"
                        onClick={handleGoogleAdminSignIn}
                        disabled={authBusy}
                        className="min-h-[40px] px-4 rounded-xl bg-[#FBF3EA] hover:bg-white text-[#16050A] font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{authBusy ? 'Signing In...' : 'Sign In with Google (Admin Sync)'}</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          data-testid="sync-workspace-firestore-btn"
                          onClick={handleSyncWorkspaceToFirestore}
                          disabled={syncingWorkspace}
                          className="min-h-[40px] px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingWorkspace ? 'animate-spin' : ''}`} />
                          <span>
                            {syncingWorkspace ? 'Syncing to Firestore...' : 'Sync All Data to Firestore'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={handleGoogleAdminSignOut}
                          disabled={authBusy}
                          className="min-h-[40px] px-3.5 rounded-xl bg-[#1A060C] hover:bg-[#260912] border border-[#FBF3EA]/15 text-[#FBF3EA]/75 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-[#FBF3EA]/8 rounded-xl bg-[#120408] border border-[#E2B96F]/15 px-4 text-xs">
                  <div className="py-3 flex items-center justify-between gap-2">
                    <span className="text-[#FBF3EA]/60">Firebase Project ID</span>
                    <span className="font-mono text-[#E2B96F]">{FIREBASE_PROJECT_ID}</span>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-2">
                    <span className="text-[#FBF3EA]/60">Firestore Database</span>
                    <span className="font-mono text-[#FBF3EA]/90 truncate max-w-[260px]">
                      {FIREBASE_DATABASE_ID}
                    </span>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-2">
                    <span className="text-[#FBF3EA]/60">Storage Bucket</span>
                    <span className="font-mono text-[#E2B96F] truncate max-w-[260px]">
                      {FIREBASE_STORAGE_BUCKET}
                    </span>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-2">
                    <span className="text-[#FBF3EA]/60">Plan Capacity</span>
                    <span className="font-mono tabular-nums text-emerald-300 font-semibold">
                      5.00 GB (50.0 MB / paid build)
                    </span>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-2">
                    <span className="text-[#FBF3EA]/60">Active Media Used</span>
                    <span className="font-mono tabular-nums text-[#FBF3EA]">
                      {formatStorageMegabytes(firebaseStatus?.usedBytes || 0)} / 5,120.0 MB
                    </span>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-2">
                    <span className="text-[#FBF3EA]/60">Saved by WebP Compression</span>
                    <span className="font-mono tabular-nums text-emerald-300 font-semibold">
                      {formatStorageCompact(firebaseStatus?.savedBytesByCompression || 0)} saved
                    </span>
                  </div>
                </div>

                {firebaseFeedback && (
                  <div
                    data-testid="firebase-feedback-banner"
                    className={`rounded-xl px-3.5 py-2.5 text-xs border ${
                      firebaseFeedbackTone === 'error'
                        ? 'bg-rose-950/60 border-rose-500/35 text-rose-200'
                        : firebaseFeedbackTone === 'warning'
                        ? 'bg-amber-950/60 border-amber-500/35 text-amber-200'
                        : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-200'
                    }`}
                  >
                    {firebaseFeedback}
                  </div>
                )}

                {/* Dedicated Non-Destructive Database Connection Test Button */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    data-testid="test-firebase-db-btn"
                    onClick={handleTestDatabaseConnection}
                    disabled={testingDb}
                    className="w-full min-h-[46px] rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Activity className={`w-4 h-4 ${testingDb ? 'animate-pulse' : ''}`} />
                    <span>
                      {testingDb
                        ? 'Testing Live Firestore Connection...'
                        : 'Test Database Connection'}
                    </span>
                  </button>

                  {/* Live Diagnostic Checklist Output */}
                  {dbReport && (
                    <div
                      data-testid="db-connection-report"
                      className="rounded-xl bg-[#120408] border border-[#E2B96F]/20 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#E2B96F]">
                          Live Diagnostic Checks
                        </span>
                        <span className="font-mono tabular-nums text-[#FBF3EA]/55">
                          {dbReport.totalLatencyMs} ms · {new Date(dbReport.checkedAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {dbReport.checks.map((check) => (
                          <div
                            key={check.id}
                            data-testid={`db-check-${check.id}`}
                            className="rounded-lg bg-[#1A060C] border border-[#FBF3EA]/8 p-2.5 flex items-start gap-2.5"
                          >
                            {check.status === 'pass' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : check.status === 'warn' ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-[#FBF3EA]">
                                  {check.label}
                                </span>
                                <span
                                  className={`text-[10px] font-mono uppercase ${
                                    check.status === 'pass'
                                      ? 'text-emerald-300'
                                      : check.status === 'warn'
                                      ? 'text-amber-300'
                                      : 'text-rose-300'
                                  }`}
                                >
                                  {check.status === 'pass'
                                    ? check.latencyMs
                                      ? `OK · ${check.latencyMs}ms`
                                      : 'OK'
                                    : check.status === 'warn'
                                    ? 'Action Needed'
                                    : 'Failed'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#FBF3EA]/65 mt-0.5 leading-relaxed">
                                {check.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Separate Maintenance Action: Clean Uploaded Storage Catalog Only */}
                <div className="pt-3 border-t border-[#FBF3EA]/10 space-y-2">
                  <button
                    type="button"
                    data-testid="clean-firebase-db-btn"
                    onClick={handleCleanFirebaseStorage}
                    disabled={cleaningDb}
                    className="w-full min-h-[42px] rounded-xl bg-rose-950/40 hover:bg-rose-950/65 border border-rose-500/30 text-rose-200 font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>
                      {cleaningDb
                        ? 'Cleaning Storage Catalog...'
                        : 'Clean Storage Catalog (Purge Media Files)'}
                    </span>
                  </button>
                  <p className="text-[11px] text-[#FBF3EA]/50 text-center">
                    Separate from testing the database — removes uploaded media files from the catalog without erasing Firestore orders or settings.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-6 rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#E2B96F] font-medium">Live Firebase Media Objects</p>
                    <h3 className="font-serif text-2xl text-[#FBF3EA] mt-1 font-mono tabular-nums">
                      Uploaded Media ({firebaseStatus?.objects?.length || 0})
                    </h3>
                  </div>

                  <label className="min-h-[42px] px-4 rounded-xl bg-[#E2B96F] text-[#16050A] font-semibold text-xs flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <Upload className="w-4 h-4" />
                    <span>{firebaseUploading ? 'Uploading...' : 'Upload Media'}</span>
                    <input
                      type="file"
                      accept="image/*,video/*,audio/*"
                      onChange={handleTestFirebaseUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="rounded-xl bg-[#120408] border border-[#E2B96F]/15 p-3.5 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <HardDrive className="w-4 h-4 text-[#E2B96F] shrink-0" />
                    <span className="truncate font-mono text-[#E2B96F]">
                      {FIREBASE_STORAGE_BUCKET}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={loadFirebaseState}
                    className="text-xs text-[#E2B96F] flex items-center gap-1 hover:underline cursor-pointer shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {firebaseStatus?.objects && firebaseStatus.objects.length > 0 ? (
                    firebaseStatus.objects.map((obj) => (
                      <div
                        key={obj.id}
                        className="rounded-xl bg-[#120408] border border-[#FBF3EA]/10 p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-[#FBF3EA] truncate">
                            {obj.fileName}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#FBF3EA]/55 font-mono tabular-nums mt-0.5">
                            <span>{obj.kind.toUpperCase()}</span>
                            <span aria-hidden="true">·</span>
                            <span>{Math.max(1, Math.round(obj.sizeBytes / 1024))} KB</span>
                            {obj.savedBytes && obj.savedBytes > 0 ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-emerald-300">
                                  Saved {formatStorageCompact(obj.savedBytes)}
                                </span>
                              </>
                            ) : null}
                            <span aria-hidden="true">·</span>
                            <span className="text-[#E2B96F]">{obj.storageTier}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <a
                            href={obj.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[34px] px-2.5 rounded-lg bg-[#1A060C] border border-[#E2B96F]/25 text-xs text-[#E2B96F] flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteFirebaseMedia(obj.id)}
                            aria-label={`Delete ${obj.fileName}`}
                            className="min-h-[34px] px-2.5 rounded-lg bg-rose-950/50 border border-rose-500/30 text-rose-300 flex items-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl bg-[#120408] border border-dashed border-[#E2B96F]/20 p-10 text-center space-y-2">
                      <Cloud className="w-7 h-7 text-[#E2B96F] mx-auto opacity-80" />
                      <p className="text-sm text-[#FBF3EA]/85 font-medium">
                        Clean &amp; Ready for Optimized Customer Media
                      </p>
                      <p className="text-xs text-[#FBF3EA]/55">
                        0 legacy files stored. New customer uploads are automatically compressed to WebP before saving.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 6: MULTI-COUNTRY PRICING & CHECKOUT LINKS
              ================================================================ */}
          {activeTab === 'countries' && (
            <div className="space-y-5">
              {missingPaymentAlerts.length > 0 && (
                <div className="rounded-xl bg-amber-950/70 border border-amber-500/35 p-4 text-xs text-amber-200 space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-amber-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Missing Outbound Payment Link Warning</span>
                  </div>
                  {missingPaymentAlerts.map((msg, i) => (
                    <p key={i}>• {msg}</p>
                  ))}
                </div>
              )}

              {countrySaveFeedback && (
                <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/30 px-4 py-3 text-xs text-emerald-200">
                  {countrySaveFeedback}
                </div>
              )}

              {/* Direct Entry Sales Page Links (Ghana & Kenya — Clean Directory URLs) */}
              <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FBF3EA]/10 pb-3.5">
                  <div>
                    <h2 className="font-serif text-xl text-[#FBF3EA]">
                      Direct Sales Page Directories (Ghana &amp; Kenya)
                    </h2>
                    <p className="text-xs text-[#FBF3EA]/65 mt-0.5">
                      Each campaign has its own dedicated static directory for GitHub Pages and ad campaigns—no query parameters required.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SALES_PAGE_DIRECTORY.map((entry) => {
                    const routePath = buildAppRoutePath(
                      { view: 'order', campaign: entry.campaign, country: entry.country },
                      import.meta.env.BASE_URL
                    );
                    const fullUrl =
                      typeof window !== 'undefined'
                        ? `${window.location.origin}${routePath}`
                        : routePath;
                    const isCopied = copiedSalesUrlKey === entry.id;
                    const countryCfg = COUNTRIES[entry.country];

                    return (
                      <div
                        key={entry.id}
                        className="rounded-xl bg-[#120408] border border-[#E2B96F]/15 p-3.5 flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-[#FBF3EA] truncate">
                              {entry.campaignName} · {entry.countryName}
                            </span>
                            <span className="font-mono text-[#E2B96F] shrink-0">
                              {countryCfg.flag} {countryCfg.currencySymbol}
                            </span>
                          </div>
                          <p className="font-mono text-[11px] text-[#FBF3EA]/55 truncate">
                            {routePath}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(fullUrl).catch(() => {});
                              setCopiedSalesUrlKey(entry.id);
                              setTimeout(() => setCopiedSalesUrlKey(null), 2000);
                            }}
                            className="flex-1 min-h-[34px] px-3 rounded-lg bg-[#1A060C] hover:bg-[#240912] border border-[#E2B96F]/25 text-xs font-medium text-[#FBF3EA] flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-300" />
                                <span className="text-emerald-300">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#E2B96F]" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          {onNavigateView ? (
                            <button
                              type="button"
                              onClick={() =>
                                onNavigateView({
                                  view: 'order',
                                  campaign: entry.campaign,
                                  country: entry.country,
                                })
                              }
                              className="min-h-[34px] px-3.5 rounded-lg bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
                            >
                              <span>Open</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <a
                              href={routePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="min-h-[34px] px-3.5 rounded-lg bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] text-xs font-semibold flex items-center gap-1.5 shrink-0"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {ACTIVE_COUNTRIES.map((code) => {
                  const country = COUNTRIES[code];
                  const pre = country.settingsPrefix;
                  const resolved = resolveCountrySettings(code, localSettings);

                  const updateKey = (key: string, val: string) => {
                    setLocalSettings((prev) => ({
                      ...prev,
                      [key]: val,
                    }));
                  };

                  return (
                    <div
                      key={country.code}
                      className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between border-b border-[#FBF3EA]/10 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{country.flag}</span>
                          <div>
                            <h3 className="font-serif text-xl text-[#FBF3EA]">{country.name}</h3>
                            <p className="text-xs text-[#E2B96F] font-mono">
                              {country.currencyCode} ({country.currencySymbol})
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-[#FBF3EA]/55">{country.dialCode}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] text-[#FBF3EA]/65 mb-1">Standard</label>
                          <input
                            type="text"
                            value={resolved.pricePage}
                            onChange={(e) => updateKey(`${pre}price_page`, e.target.value)}
                            className="w-full min-h-[38px] px-2.5 rounded-lg bg-[#120408] border border-[#E2B96F]/20 text-xs font-mono text-[#FBF3EA]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#FBF3EA]/65 mb-1">Was</label>
                          <input
                            type="text"
                            value={resolved.priceWas}
                            onChange={(e) => updateKey(`${pre}price_was`, e.target.value)}
                            className="w-full min-h-[38px] px-2.5 rounded-lg bg-[#120408] border border-[#E2B96F]/20 text-xs font-mono text-[#FBF3EA]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#FBF3EA]/65 mb-1">Concierge</label>
                          <input
                            type="text"
                            value={resolved.priceCustom}
                            onChange={(e) => updateKey(`${pre}price_custom`, e.target.value)}
                            className="w-full min-h-[38px] px-2.5 rounded-lg bg-[#120408] border border-[#E2B96F]/20 text-xs font-mono text-[#FBF3EA]"
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <label className="block text-xs text-[#FBF3EA]/70">
                          Post-Order Route
                          <select
                            value={resolved.routeChasingHer}
                            onChange={(e) => {
                              const v = e.target.value as RouteTarget;
                              updateKey(`${pre}route_chasing-her`, v);
                              updateKey(`${pre}route_memories`, v);
                            }}
                            className="mt-1 w-full min-h-[38px] px-3 rounded-lg bg-[#120408] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
                          >
                            <option value="builder">Open Live Site Builder Immediately</option>
                            <option value="payment">Redirect to Payment Link First</option>
                            <option value="brief">Open Custom Concierge Brief</option>
                          </select>
                        </label>

                        <label className="block text-[11px] text-[#FBF3EA]/65">
                          Chasing Her Payment URL
                          <input
                            type="text"
                            value={resolved.paymentUrlChasingHer}
                            onChange={(e) =>
                              updateKey(`payment_url_${pre}chasing-her`, e.target.value)
                            }
                            className="mt-1 w-full min-h-[38px] px-3 rounded-lg bg-[#120408] border border-[#E2B96F]/20 text-xs font-mono text-[#FBF3EA]"
                          />
                        </label>

                        <label className="block text-[11px] text-[#FBF3EA]/65">
                          Memories Payment URL
                          <input
                            type="text"
                            value={resolved.paymentUrlMemories}
                            onChange={(e) => updateKey(`payment_url_${pre}memories`, e.target.value)}
                            className="mt-1 w-full min-h-[38px] px-3 rounded-lg bg-[#120408] border border-[#E2B96F]/20 text-xs font-mono text-[#FBF3EA]"
                          />
                        </label>

                        <label className="block text-[11px] text-[#FBF3EA]/65">
                          Concierge Payment URL
                          <input
                            type="text"
                            value={resolved.paymentUrlCustom}
                            onChange={(e) => updateKey(`payment_url_${pre}custom`, e.target.value)}
                            className="mt-1 w-full min-h-[38px] px-3 rounded-lg bg-[#120408] border border-[#E2B96F]/20 text-xs font-mono text-[#FBF3EA]"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================================================================
              TAB: SALES PAGES DIRECTORY (ALL LIVE CAMPAIGNS & PORTAL ROUTES)
          ================================================================ */}
          {activeTab === 'sales-pages' && (
            <div className="space-y-6" data-testid="admin-sales-pages-directory">
              {/* Primary Campaign Landing Pages */}
              <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E2B96F]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="font-serif text-xl text-[#FBF3EA]">
                      Campaign Sales Pages ({SALES_PAGE_DIRECTORY.length})
                    </h2>
                    <p className="text-xs text-[#FBF3EA]/65 mt-0.5">
                      Each page builds into its own physical directory on GitHub Pages so you can link straight to it with clean paths.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('countries')}
                    className="min-h-[36px] px-3.5 rounded-lg border border-[#E2B96F]/25 bg-[#120408] hover:border-[#E2B96F]/55 text-xs font-medium text-[#E2B96F] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Edit Market Pricing</span>
                  </button>
                </div>

                <div className="divide-y divide-[#E2B96F]/12">
                  {SALES_PAGE_DIRECTORY.map((entry) => {
                    const resolved = resolveCountrySettings(entry.country, localSettings);
                    const countryCfg = COUNTRIES[entry.country];
                    const routePath = buildAppRoutePath(
                      { view: 'order', campaign: entry.campaign, country: entry.country },
                      import.meta.env.BASE_URL
                    );
                    const fullUrl =
                      typeof window !== 'undefined'
                        ? `${window.location.origin}${routePath}`
                        : routePath;
                    const isCopied = copiedSalesUrlKey === entry.id;

                    return (
                      <div
                        key={entry.id}
                        data-testid={`sales-page-row-${entry.id}`}
                        className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#220911]/55 transition-colors"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <span className="font-serif text-lg text-[#FBF3EA]">
                              {entry.campaignName}
                            </span>
                            <span className="text-xs text-[#FBF3EA]/35" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-xs font-medium text-[#E2B96F]">
                              {countryCfg.flag} {entry.countryName} ({countryCfg.currencySymbol})
                            </span>
                          </div>
                          <p className="text-xs text-[#FBF3EA]/70">
                            <span className="italic text-[#FBF3EA]/85">“{entry.headlinePreview}”</span>{' '}
                            <span className="text-[#FBF3EA]/40">—</span> {entry.audienceSummary}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs">
                            <span className="font-mono text-[#E2B96F]/90">{routePath}</span>
                            <span className="font-mono tabular-nums text-[#FBF3EA]/75">
                              Page: <strong className="text-[#FBF3EA]">{resolved.pricePage}</strong>
                            </span>
                            <span className="font-mono tabular-nums text-[#FBF3EA]/55">
                              Concierge: {resolved.priceCustom}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(fullUrl).catch(() => {});
                              setCopiedSalesUrlKey(entry.id);
                              setTimeout(() => setCopiedSalesUrlKey(null), 2000);
                            }}
                            className="min-h-[38px] px-3.5 rounded-xl bg-[#120408] hover:bg-[#240912] border border-[#E2B96F]/25 text-xs font-medium text-[#FBF3EA] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-300" />
                                <span className="text-emerald-300">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#E2B96F]" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          {onNavigateView && (
                            <button
                              type="button"
                              data-testid={`open-sales-page-${entry.id}`}
                              onClick={() =>
                                onNavigateView({
                                  view: 'order',
                                  campaign: entry.campaign,
                                  country: entry.country,
                                })
                              }
                              className="min-h-[38px] px-4 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                            >
                              <span>Open Page</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <a
                            href={routePath}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${entry.campaignName} ${entry.countryName} in new tab`}
                            className="min-h-[38px] px-3 rounded-xl border border-[#E2B96F]/25 bg-[#120408] hover:border-[#E2B96F]/55 text-xs font-medium text-[#FBF3EA]/80 hover:text-[#FBF3EA] inline-flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-[#E2B96F]" />
                            <span className="hidden sm:inline">New Tab</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Standalone Portal Directories */}
              <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 overflow-hidden">
                <div className="px-5 py-4 border-b border-[#E2B96F]/15">
                  <h2 className="font-serif text-xl text-[#FBF3EA]">
                    App &amp; Portal Directories
                  </h2>
                  <p className="text-xs text-[#FBF3EA]/65 mt-0.5">
                    Clean directory endpoints for the Customer App, Builder Studio, Admin Backstage, and Recipient Preview.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-[#E2B96F]/12">
                  {APP_PORTAL_DIRECTORY.map((portal) => {
                    const routePath = buildAppRoutePath(
                      { view: portal.view },
                      import.meta.env.BASE_URL
                    );
                    const fullUrl =
                      typeof window !== 'undefined'
                        ? `${window.location.origin}${routePath}`
                        : routePath;
                    const isCopied = copiedSalesUrlKey === `portal-${portal.id}`;

                    return (
                      <div
                        key={portal.id}
                        className="bg-[#1A060C] p-5 flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-serif text-base text-[#FBF3EA]">
                              {portal.label}
                            </span>
                            <span className="font-mono text-xs text-[#E2B96F]">{routePath}</span>
                          </div>
                          <p className="text-xs text-[#FBF3EA]/65">{portal.description}</p>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(fullUrl).catch(() => {});
                              setCopiedSalesUrlKey(`portal-${portal.id}`);
                              setTimeout(() => setCopiedSalesUrlKey(null), 2000);
                            }}
                            className="flex-1 min-h-[34px] px-3 rounded-lg bg-[#120408] hover:bg-[#240912] border border-[#E2B96F]/25 text-xs font-medium text-[#FBF3EA] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-300" />
                                <span className="text-emerald-300">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#E2B96F]" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          {onNavigateView && portal.view !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => onNavigateView({ view: portal.view })}
                              className="min-h-[34px] px-3.5 rounded-lg border border-[#E2B96F]/30 bg-[#120408] hover:border-[#E2B96F] text-xs font-semibold text-[#E2B96F] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              <span>Open</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Manual Order Modal */}
      {showCreateOrderModal && (
        <AdminCreateOrderModal
          onCreate={(order) => {
            onCreateOrder?.(order);
            setSelectedOrderId(order.id);
          }}
          onClose={() => setShowCreateOrderModal(false)}
        />
      )}

      {/* Live Preview Modal */}
      {previewOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#E2B96F]/30 bg-[#18050B]">
            <RecipientSitePreview
              product={previewOrderModal.product}
              chasingHerData={chasingHerProjects[previewOrderModal.slug]}
              memoriesData={memoriesProjects[previewOrderModal.slug]}
              bypassPinByDefault={true}
              onClose={() => setPreviewOrderModal(null)}
            />
          </div>
        </div>
      )}

      {/* Mobile Bottom Thumb-Zone Navigation (Scrollable so all 8 sections fit cleanly on 390px) */}
      <nav
        aria-label="Admin Backstage mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#16050A]/96 backdrop-blur-md border-t border-[#E2B96F]/20 px-2 py-1.5 flex items-center gap-1 overflow-x-auto"
      >
        {(
          [
            { id: 'orders' as AdminTab, label: 'Orders', icon: Package },
            { id: 'sales-pages' as AdminTab, label: 'Pages', icon: Store },
            { id: 'studio' as AdminTab, label: 'Studio', icon: Wand2 },
            { id: 'experiences' as AdminTab, label: 'Features', icon: Sparkles },
            { id: 'assets' as AdminTab, label: 'Music', icon: Music },
            { id: 'testimonials' as AdminTab, label: 'Reviews', icon: Star },
            { id: 'firebase' as AdminTab, label: 'Cloud', icon: Cloud },
            { id: 'countries' as AdminTab, label: 'Markets', icon: Globe },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[46px] min-w-[54px] shrink-0 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors cursor-pointer ${
                active ? 'bg-[#E2B96F]/20 text-[#E2B96F]' : 'text-[#FBF3EA]/65'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
