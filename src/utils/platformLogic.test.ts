import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COUNTRIES,
  ACTIVE_COUNTRIES,
  SALES_PAGE_DIRECTORY,
  APP_PORTAL_DIRECTORY,
  normalizeActiveCountry,
  resolveCountryFromLocation,
  resolveSalesCampaignFromLocation,
  resolveAppRouteFromLocation,
  buildAppRoutePath,
  stripBasePath,
  validateCustomerEmail,
  validateWhatsAppPhone,
  resolveCountrySettings,
  buildFirebaseStorageUrl,
  validateFirebaseStorageConfig,
  buildHeartMosaicLayout,
  computeChasingHerProgress,
  computeMemoriesProgress,
  SLIDESHOW_EFFECTS,
  MAX_BUILD_STORAGE_BYTES,
  computeProjectStorageUsage,
  canAddFileToBuild,
  commitProjectSavedMedia,
  LOCKED_FLOWER_WALL_ASSETS,
  getLockedFlowerWallUrls,
  DEFAULT_SITE_EXPERIENCES,
  mergeSiteExperiences,
  serializeSiteExperiences,
  PUBLIC_SHOWCASE_SLUGS,
  deriveCleanAudioTitle,
  isPublicShowcaseProject,
  canCustomerAccessProjectSlug,
  canBypassPreviewPin,
  summarizeDatabaseConnectionChecks,
} from './platformLogic';
import {
  buildChasingHerStandaloneHtml,
  buildMemoriesStandaloneHtml,
} from './htmlExporter';
import { SALES_PAGE_ASSETS } from './salesPageAssets';

test('Multi-country definitions include Ghana, Kenya, and Nigeria with distinct prefixes and currencies', () => {
  assert.equal(COUNTRIES.gh.currencySymbol, 'GH₵');
  assert.equal(COUNTRIES.gh.settingsPrefix, '');
  assert.equal(COUNTRIES.ke.currencySymbol, 'KSh');
  assert.equal(COUNTRIES.ke.settingsPrefix, 'ke_');
  assert.equal(COUNTRIES.ng.currencySymbol, '₦');
  assert.equal(COUNTRIES.ng.settingsPrefix, 'ng_');
});

test('Active storefront markets focus exclusively on Ghana and Kenya with direct campaign routing', () => {
  assert.deepEqual(ACTIVE_COUNTRIES, ['gh', 'ke']);
  assert.equal(normalizeActiveCountry('ke'), 'ke');
  assert.equal(normalizeActiveCountry('gh'), 'gh');
  assert.equal(normalizeActiveCountry('ng'), 'gh');
  assert.equal(resolveCountryFromLocation('?country=ke', '/'), 'ke');
  assert.equal(resolveCountryFromLocation('', '/ke/birthday'), 'ke');
  assert.equal(resolveCountryFromLocation('', '/gh/win-her-back'), 'gh');
  assert.equal(resolveSalesCampaignFromLocation('?campaign=birthday', '/'), 'birthday');
  assert.equal(resolveSalesCampaignFromLocation('', '/birthday'), 'birthday');
  assert.equal(resolveSalesCampaignFromLocation('?campaign=reconcile', '/'), 'reconcile');
  assert.equal(resolveSalesCampaignFromLocation('', '/win-her-back'), 'reconcile');
});

test('Directory routing builds and resolves clean GitHub Pages folder paths without ?view= query params', () => {
  assert.equal(SALES_PAGE_DIRECTORY.length, 4);
  assert.equal(APP_PORTAL_DIRECTORY.length, 4);

  // Root domain clean directories
  assert.equal(
    buildAppRoutePath({ view: 'order', campaign: 'reconcile', country: 'gh' }, '/'),
    '/win-her-back/gh/'
  );
  assert.equal(
    buildAppRoutePath({ view: 'order', campaign: 'reconcile', country: 'ke' }, '/'),
    '/win-her-back/ke/'
  );
  assert.equal(
    buildAppRoutePath({ view: 'order', campaign: 'birthday', country: 'gh' }, '/'),
    '/birthday/gh/'
  );
  assert.equal(
    buildAppRoutePath({ view: 'order', campaign: 'birthday', country: 'ke' }, '/'),
    '/birthday/ke/'
  );
  assert.equal(buildAppRoutePath({ view: 'admin' }, '/'), '/admin/');
  assert.equal(buildAppRoutePath({ view: 'my-site' }, '/'), '/my-site/');
  assert.equal(buildAppRoutePath({ view: 'builder' }, '/'), '/builder/');
  assert.equal(buildAppRoutePath({ view: 'preview' }, '/'), '/preview/');

  // GitHub Pages repository subpath (e.g. /chasing-her/)
  assert.equal(
    buildAppRoutePath({ view: 'order', campaign: 'birthday', country: 'ke' }, '/chasing-her/'),
    '/chasing-her/birthday/ke/'
  );
  assert.equal(stripBasePath('/chasing-her/birthday/ke/', '/chasing-her/'), '/birthday/ke/');

  // Resolving clean directory paths (root and GitHub Pages subpath)
  assert.deepEqual(resolveAppRouteFromLocation('/birthday/ke/', '', '/'), {
    view: 'order',
    campaign: 'birthday',
    country: 'ke',
  });
  assert.deepEqual(
    resolveAppRouteFromLocation('/chasing-her/win-her-back/gh/', '', '/chasing-her/'),
    {
      view: 'order',
      campaign: 'reconcile',
      country: 'gh',
    }
  );
  assert.deepEqual(resolveAppRouteFromLocation('/chasing-her/admin/', '', '/chasing-her/'), {
    view: 'admin',
    campaign: 'reconcile',
    country: 'gh',
  });
  assert.deepEqual(resolveAppRouteFromLocation('/my-site/', '', '/'), {
    view: 'my-site',
    campaign: 'reconcile',
    country: 'gh',
  });

  // Backward compatibility for legacy ?view= links
  assert.deepEqual(
    resolveAppRouteFromLocation('/', '?view=order&campaign=birthday&country=ke', '/'),
    {
      view: 'order',
      campaign: 'birthday',
      country: 'ke',
    }
  );
  assert.deepEqual(resolveAppRouteFromLocation('/', '?view=admin', '/'), {
    view: 'admin',
    campaign: 'reconcile',
    country: 'gh',
  });
});

test('WhatsApp phone validation normalizes Ghana, Kenya, and Nigeria local numbers to E.164', () => {
  const gh = validateWhatsAppPhone('024 123 4567', 'gh');
  assert.equal(gh.valid, true);
  assert.equal(gh.e164, '+233241234567');

  const ke = validateWhatsAppPhone('0712-345-678', 'ke');
  assert.equal(ke.valid, true);
  assert.equal(ke.e164, '+254712345678');

  const ng = validateWhatsAppPhone('08031234567', 'ng');
  assert.equal(ng.valid, true);
  assert.equal(ng.e164, '+2348031234567');

  const invalidKe = validateWhatsAppPhone('07123', 'ke');
  assert.equal(invalidKe.valid, false);
  assert.ok(invalidKe.error?.includes('Kenya'));
});

test('Email validation catches empty strings, invalid format, and suggests typo corrections', () => {
  const empty = validateCustomerEmail('   ');
  assert.equal(empty.valid, false);

  const typo = validateCustomerEmail('kwame@gmial.com');
  assert.equal(typo.valid, true);
  assert.equal(typo.suggestion, 'kwame@gmail.com');

  const clean = validateCustomerEmail('amara@gmail.com');
  assert.equal(clean.valid, true);
  assert.equal(clean.suggestion, undefined);
});

test('resolveCountrySettings prioritizes country-prefixed settings and falls back cleanly', () => {
  const settingsMap = {
    price_page: '55 GHC',
    ke_price_page: 'KSh 750',
    ng_price_page: '₦6,000',
    'ke_route_chasing-her': 'payment',
  };

  const ghResolved = resolveCountrySettings('gh', settingsMap);
  assert.equal(ghResolved.pricePage, '55 GHC');
  assert.equal(ghResolved.routeChasingHer, 'builder');

  const keResolved = resolveCountrySettings('ke', settingsMap);
  assert.equal(keResolved.pricePage, 'KSh 750');
  assert.equal(keResolved.routeChasingHer, 'payment');

  const ngResolved = resolveCountrySettings('ng', settingsMap);
  assert.equal(ngResolved.pricePage, '₦6,000');
});

test('Firebase 5 GB Cloud Storage URL builder supports native bucket endpoints and custom CDN URLs', () => {
  const nativeUrl = buildFirebaseStorageUrl(
    {
      storageBucket: 'gen-lang-client-0322444571.firebasestorage.app',
    },
    'projects/ama-kofi/hero photo.webp'
  );
  assert.equal(
    nativeUrl,
    'https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0322444571.firebasestorage.app/o/projects%2Fama-kofi%2Fhero%20photo.webp?alt=media'
  );

  const cdnUrl = buildFirebaseStorageUrl(
    {
      storageBucket: 'gen-lang-client-0322444571.firebasestorage.app',
      publicBaseUrl: 'https://cdn.chasingher.love',
    },
    'videos/clip.mp4'
  );
  assert.equal(cdnUrl, 'https://cdn.chasingher.love/videos/clip.mp4');

  const status = validateFirebaseStorageConfig({
    projectId: 'gen-lang-client-0322444571',
    databaseId: 'ai-studio-chasingher-f7a61704-2cdd-4e3c-af0b-e387f983103a',
    storageBucket: 'gen-lang-client-0322444571.firebasestorage.app',
  });
  assert.equal(status.valid, true);
  assert.equal(status.mode, 'firebase_live');
});

test('Heart mosaic layout generates 34 deterministic heart slots ordered from center outward with larger center tiles', () => {
  const slots = buildHeartMosaicLayout(9, 7);
  assert.equal(slots.length, 34);
  const centerSlot = slots.find((s) => s.order === 0);
  const rimSlot = slots.find((s) => s.order === slots.length - 1);
  assert.ok(centerSlot);
  assert.ok(rimSlot);
  assert.ok(centerSlot.xPct > 0.35 && centerSlot.xPct < 0.65);

  const centerArea = centerSlot.widthPct * centerSlot.heightPct;
  const rimArea = rimSlot.widthPct * rimSlot.heightPct;
  assert.ok(
    centerArea > rimArea,
    `Expected center tile area (${centerArea}) to exceed rim tile area (${rimArea})`
  );
});

test('Builder progress calculators accurately score Chasing Her and Memories projects', () => {
  const chProgress = computeChasingHerProgress({
    slug: 'ama-love',
    pin: '140226',
    intro_message: 'I love you endlessly, Ama',
    letter_title: 'My Dearest Ama,',
    letter_body: 'Every single day with you feels like a gift I never want to stop unwrapping.',
    final_message: 'Forever yours, Kofi',
    photos: [{ url: 'a.jpg' }, { url: 'b.jpg' }, { url: 'c.jpg' }],
    flower_images: ['flower-1.svg'],
    songs: [{ title: 'Essence', artist: 'Wizkid' }],
  });
  assert.equal(chProgress.completed, 5);
  assert.equal(chProgress.percent, 100);

  const memProgress = computeMemoriesProgress({
    slug: 'wanjiku-brian',
    pin: '123456',
    hero_title: 'For Wanjiku',
    hero_subtitle: 'Tap to begin',
    collage_names: 'Wanjiku & Brian',
    collage_day: '14',
    collage_month: '02',
    collage_year: '2026',
    collage_quote: 'Our story is my favorite',
    mosaic_images: ['1.jpg', '2.jpg', '3.jpg', '4.jpg'],
    letter_title: 'My Love,',
    letter_body: 'Every picture holds a moment and every moment holds our story together.',
    final_message: 'Yours always',
    memories: [{ url: '1.jpg' }, { url: '2.jpg' }],
    flower_images: ['flower-1.svg'],
  });
  assert.equal(memProgress.completed, 5);
  assert.equal(memProgress.percent, 100);
});

test('Standalone HTML exporters inject project snapshots, burgundy-gold PIN screen, flowers, and original animations', () => {
  assert.equal(SLIDESHOW_EFFECTS.length, 9);

  const chHtml = buildChasingHerStandaloneHtml(
    'ama-test',
    {
      slug: 'ama-test',
      pin: '140226',
      intro_message: 'Forever starts with you',
      letter_title: 'Dear Ama,',
      letter_body: 'Thank you for every moment we share.',
      final_message: 'All my love',
      photos: [{ url: 'https://cdn.example.com/p1.jpg', caption: 'Beach' }],
      flower_images: ['https://cdn.example.com/rose.png'],
      songs: [{ title: 'Essence', artist: 'Wizkid', spotify_url: 'https://open.spotify.com/track/5FG7Tl93LdH117jEKYl3Cm' }],
      music_url: 'https://cdn.example.com/song.mp3',
      music_start: 12,
      music_end: 58,
    },
    'https://chasingher.example.com'
  );

  assert.ok(chHtml.includes('#28060e'));
  assert.ok(chHtml.includes('#e2b96f'));
  assert.ok(chHtml.includes('FlowerReveal'));
  assert.ok(chHtml.includes('ChatGPT_Image_Aug_29__2026__09_17_27_PM_a36feab0.png'));
  assert.ok(chHtml.includes('ChatGPT_Image_Aug_29__2026__09_23_28_PM_d361cd42.png'));
  assert.ok(!chHtml.includes('https://cdn.example.com/rose.png'));
  assert.ok(chHtml.includes('bs-music-player'));
  assert.ok(chHtml.includes('"music_start": 12'));
  assert.ok(chHtml.includes('"music_end": 58'));
  assert.ok(chHtml.includes('polaroid-row-track'));

  const memHtml = buildMemoriesStandaloneHtml(
    'wanjiku-test',
    {
      slug: 'wanjiku-test',
      pin: '250824',
      hero_title: 'For Wanjiku',
      hero_subtitle: 'Tap the heart',
      collage_names: 'Wanjiku & Brian',
      collage_day: '25',
      collage_month: '08',
      collage_year: '2024',
      collage_quote: 'Always my favorite story',
      mosaic_images: ['https://cdn.example.com/m1.jpg'],
      letter_title: 'My Heart,',
      letter_body: 'Thirty-four moments and counting.',
      final_message: 'Forever yours',
      memories: [
        {
          url: 'https://cdn.example.com/s1.jpg',
          type: 'image',
          caption: 'Diani',
          transition: 'blur-focus',
          duration: 7,
        },
      ],
      flower_images: ['https://cdn.example.com/peony.png'],
      music_url: 'https://cdn.example.com/bg.mp3',
      music_start: 5,
      music_end: 45,
      voice_url: 'https://cdn.example.com/voice.webm',
    },
    'https://chasingher.example.com'
  );

  assert.ok(memHtml.includes('#28060e'));
  assert.ok(memHtml.includes('#e2b96f'));
  assert.ok(memHtml.includes('CollageScreen'));
  assert.ok(memHtml.includes('FlowerBurst'));
  assert.ok(memHtml.includes('ChatGPT_Image_Aug_29__2026__09_17_41_PM_f5c85e28.png'));
  assert.ok(!memHtml.includes('https://cdn.example.com/peony.png'));
  assert.ok(memHtml.includes('https://cdn.example.com/voice.webm'));
  assert.ok(memHtml.includes('fx-blur-focus-enter'));
  assert.ok(memHtml.includes('fx-circular-enter'));
  assert.ok(memHtml.includes('fx-heartbeat-enter'));
});

test('Original sales page assets include embedded WebP data URIs for blossoms, butterflies, polaroids, hero shot, and heart', () => {
  assert.ok(SALES_PAGE_ASSETS.heroBlossom.startsWith('data:image/webp;base64,'));
  assert.ok(SALES_PAGE_ASSETS.heroButterfly.startsWith('data:image/webp;base64,'));
  assert.ok(SALES_PAGE_ASSETS.heroShot.startsWith('data:image/webp;base64,'));
  assert.ok(SALES_PAGE_ASSETS.storyButterfly.startsWith('data:image/webp;base64,'));
  assert.ok(SALES_PAGE_ASSETS.storyFlower.startsWith('data:image/webp;base64,'));
  assert.ok(SALES_PAGE_ASSETS.polaroid1.startsWith('data:image/webp;base64,'));
  assert.ok(SALES_PAGE_ASSETS.polaroid2.startsWith('data:image/webp;base64,'));
  assert.ok(SALES_PAGE_ASSETS.polaroid3.startsWith('data:image/webp;base64,'));
  assert.ok(SALES_PAGE_ASSETS.finalHeart.startsWith('data:image/webp;base64,'));
});

test('50 MB paid build storage quota tracks staged vs saved audio/media and purges unchosen audio on save', () => {
  const MB = 1024 * 1024;
  assert.equal(MAX_BUILD_STORAGE_BYTES, 50 * MB);

  // User uploads an initial 8 MB song (staged), then changes their mind and uploads a 12 MB song (staged),
  // plus two 5 MB photos (one saved, one staged).
  const draftProject = {
    slug: 'ama-kofi',
    pin: '140226',
    intro_message: 'Happy Birthday Ama',
    letter_title: 'My Love,',
    letter_body: 'You mean the world to me every day.',
    final_message: 'Yours forever',
    photos: [
      { url: 'https://cdn.example.com/p1.jpg', caption: 'Accra' },
      { url: 'blob:local-p2', caption: 'Kumasi' },
    ],
    flower_images: ['data:image/svg+xml;utf8,<svg></svg>'],
    songs: [],
    music_url: 'blob:chosen-song-12mb.mp3',
    media_meta: {
      'blob:discarded-song-8mb.mp3': {
        url: 'blob:discarded-song-8mb.mp3',
        name: 'first-draft-song.mp3',
        sizeBytes: 8 * MB,
        category: 'music' as const,
        status: 'staged' as const,
      },
      'blob:chosen-song-12mb.mp3': {
        url: 'blob:chosen-song-12mb.mp3',
        name: 'final-chosen-song.mp3',
        sizeBytes: 12 * MB,
        category: 'music' as const,
        status: 'staged' as const,
      },
      'https://cdn.example.com/p1.jpg': {
        url: 'https://cdn.example.com/p1.jpg',
        name: 'accra.jpg',
        sizeBytes: 5 * MB,
        category: 'photo' as const,
        status: 'saved' as const,
      },
      'blob:local-p2': {
        url: 'blob:local-p2',
        name: 'kumasi.jpg',
        sizeBytes: 5 * MB,
        category: 'photo' as const,
        status: 'staged' as const,
      },
    },
  };

  // Only active chosen files (12 MB chosen song + 5 MB photo 1 + 5 MB photo 2 = 22 MB) count against the 50 MB quota
  const usageBeforeCommit = computeProjectStorageUsage(draftProject, 'chasing-her');
  assert.equal(usageBeforeCommit.usedBytes, 22 * MB);
  assert.equal(usageBeforeCommit.remainingBytes, 28 * MB);
  assert.equal(usageBeforeCommit.breakdown.audioBytes, 12 * MB);
  assert.equal(usageBeforeCommit.breakdown.photoVideoBytes, 10 * MB);
  assert.equal(usageBeforeCommit.breakdown.stagedBytes, 17 * MB);
  assert.equal(usageBeforeCommit.breakdown.savedBytes, 5 * MB);

  // Attempting to upload a 30 MB video when 28 MB remains is blocked
  const blockedCheck = canAddFileToBuild(usageBeforeCommit.usedBytes, 30 * MB);
  assert.equal(blockedCheck.allowed, false);
  assert.ok(blockedCheck.error?.includes('50.0 MB'));

  // Replacing the 12 MB background song with a 15 MB background song is allowed (22 - 12 + 15 = 25 MB <= 50 MB)
  const replaceSongCheck = canAddFileToBuild(usageBeforeCommit.usedBytes, 15 * MB, 12 * MB);
  assert.equal(replaceSongCheck.allowed, true);
  assert.equal(replaceSongCheck.nextUsedBytes, 25 * MB);

  // Committing the build permanently stores only the active chosen files and purges the discarded 8 MB song
  const { committedProject, committedCount, purgedStagedUrls } = commitProjectSavedMedia(
    draftProject,
    'chasing-her'
  );
  assert.equal(committedCount, 2); // chosen song + local-p2
  assert.deepEqual(purgedStagedUrls, ['blob:discarded-song-8mb.mp3']);
  assert.equal(committedProject.media_meta?.['blob:discarded-song-8mb.mp3'], undefined);
  assert.equal(committedProject.media_meta?.['blob:chosen-song-12mb.mp3']?.status, 'saved');

  const usageAfterCommit = computeProjectStorageUsage(committedProject, 'chasing-her');
  assert.equal(usageAfterCommit.breakdown.stagedBytes, 0);
  assert.equal(usageAfterCommit.breakdown.savedBytes, 22 * MB);
});

test('Locked 5-blossom flower wall resolves exclusively to the 5 uploaded PNG assets across root and GitHub Pages subpaths', () => {
  assert.equal(LOCKED_FLOWER_WALL_ASSETS.length, 5);
  const rootUrls = getLockedFlowerWallUrls('/');
  assert.equal(rootUrls.length, 5);
  assert.equal(
    rootUrls[0],
    '/assets/aistudio/ChatGPT_Image_Aug_29__2026__09_17_27_PM_a36feab0.png'
  );
  assert.equal(
    rootUrls[4],
    '/assets/aistudio/ChatGPT_Image_Aug_29__2026__09_23_28_PM_d361cd42.png'
  );

  const ghPagesUrls = getLockedFlowerWallUrls('/chasing-her/');
  assert.equal(
    ghPagesUrls[0],
    '/chasing-her/assets/aistudio/ChatGPT_Image_Aug_29__2026__09_17_27_PM_a36feab0.png'
  );
  assert.equal(
    ghPagesUrls[2],
    '/chasing-her/assets/aistudio/ChatGPT_Image_Aug_29__2026__09_25_26_PM_13bdae67.png'
  );
});

test('Site experience showcase config safely merges partial admin overrides and preserves defaults', () => {
  const defaults = mergeSiteExperiences(null);
  assert.equal(defaults['chasing-her'].title, DEFAULT_SITE_EXPERIENCES['chasing-her'].title);
  assert.ok(defaults['chasing-her'].exampleFeatures.length >= 3);
  assert.ok(defaults.memories.exampleFeatures.length >= 3);

  const customMap = mergeSiteExperiences({
    'chasing-her': {
      title: 'Chasing Her · Bespoke Story',
      exampleFeatures: ['Custom handwritten Polaroid timeline', 'Wax-sealed midnight letter'],
    },
  });
  assert.equal(customMap['chasing-her'].title, 'Chasing Her · Bespoke Story');
  assert.deepEqual(customMap['chasing-her'].exampleFeatures, [
    'Custom handwritten Polaroid timeline',
    'Wax-sealed midnight letter',
  ]);
  assert.equal(customMap.memories.title, DEFAULT_SITE_EXPERIENCES.memories.title);

  const serialized = serializeSiteExperiences(customMap);
  const restored = mergeSiteExperiences(serialized);
  assert.deepEqual(restored['chasing-her'].exampleFeatures, [
    'Custom handwritten Polaroid timeline',
    'Wax-sealed midnight letter',
  ]);

  const malformed = mergeSiteExperiences('{bad-json');
  assert.equal(malformed.memories.title, DEFAULT_SITE_EXPERIENCES.memories.title);
});

test('Audio song naming prefers custom title, cleans filenames, and falls back gracefully', () => {
  assert.equal(
    deriveCleanAudioTitle('01_romantic-piano_final.mp3', 'Our Midnight Piano'),
    'Our Midnight Piano'
  );
  assert.equal(
    deriveCleanAudioTitle('C:\\Users\\kofi\\our_first-dance_mix.m4a'),
    'our first dance mix'
  );
  assert.equal(deriveCleanAudioTitle(''), 'Custom Soundtrack');
  assert.equal(deriveCleanAudioTitle('   ', '   '), 'Custom Soundtrack');
});

test('Personal letter privacy guards isolate customer creations from public showcases and other visitors', () => {
  assert.equal(PUBLIC_SHOWCASE_SLUGS['chasing-her'], 'ama-and-kofi');
  assert.equal(PUBLIC_SHOWCASE_SLUGS.memories, 'wanjiku-and-brian');

  // Official studio demos are public showcases; customer creations are strictly private
  assert.equal(isPublicShowcaseProject('ama-and-kofi', { is_public_showcase: true }), true);
  assert.equal(isPublicShowcaseProject('wanjiku-and-brian', { is_public_showcase: true }), true);
  assert.equal(isPublicShowcaseProject('abena-and-kwesi', { is_public_showcase: false }), false);
  assert.equal(isPublicShowcaseProject('for-amara-123'), false);
  assert.equal(isPublicShowcaseProject('ama-and-kofi', { is_public_showcase: false }), false);

  const sampleOrders = [
    { id: 'ord-1', slug: 'abena-and-kwesi', email: 'kwesi@example.com' },
    { id: 'ord-2', slug: 'for-amara', email: 'david@example.com' },
  ];

  // Unauthenticated visitor or wrong customer email cannot access private builder studio
  assert.equal(
    canCustomerAccessProjectSlug({
      slug: 'abena-and-kwesi',
      viewerEmail: '',
      orders: sampleOrders,
    }),
    false
  );
  assert.equal(
    canCustomerAccessProjectSlug({
      slug: 'abena-and-kwesi',
      viewerEmail: 'david@example.com',
      orders: sampleOrders,
    }),
    false
  );

  // Matching email owner, active checkout order, or admin can access
  assert.equal(
    canCustomerAccessProjectSlug({
      slug: 'abena-and-kwesi',
      viewerEmail: 'KWESI@example.com',
      orders: sampleOrders,
    }),
    true
  );
  assert.equal(
    canCustomerAccessProjectSlug({
      slug: 'abena-and-kwesi',
      viewerEmail: '',
      justPaidOrderId: 'ord-1',
      orders: sampleOrders,
    }),
    true
  );
  assert.equal(
    canCustomerAccessProjectSlug({
      slug: 'abena-and-kwesi',
      viewerEmail: '',
      orders: sampleOrders,
      isAdmin: true,
    }),
    true
  );

  // Private letters must NEVER bypass their PIN via ?autostart=1
  assert.equal(
    canBypassPreviewPin({ isPublicShowcase: false, autoStart: true }),
    false
  );
  assert.equal(
    canBypassPreviewPin({ isPublicShowcase: true, autoStart: true }),
    true
  );
  assert.equal(
    canBypassPreviewPin({ isAdmin: true, isPublicShowcase: false }),
    true
  );
  assert.equal(
    canBypassPreviewPin({ isBuilderPreview: true, isPublicShowcase: false }),
    true
  );
});

test('Database connection diagnostics accurately distinguish live read/write, read-only, and failure states', () => {
  const fullLive = summarizeDatabaseConnectionChecks({
    databaseId: 'ai-studio-chasingher-f7a61704-2cdd-4e3c-af0b-e387f983103a',
    totalLatencyMs: 142,
    isAdminSignedIn: true,
    checks: [
      { id: 'firestore_read', label: 'Firestore Live Server Read', status: 'pass', detail: 'OK', latencyMs: 65 },
      { id: 'security_rules', label: 'Security Rules Enforcement', status: 'pass', detail: 'OK', latencyMs: 32 },
      { id: 'admin_write', label: 'Admin Auth & Write Sync', status: 'pass', detail: 'OK', latencyMs: 40 },
      { id: 'storage_api', label: 'Storage Bucket & Upload API', status: 'pass', detail: 'OK', latencyMs: 5 },
    ],
  });
  assert.equal(fullLive.overallStatus, 'connected');
  assert.ok(fullLive.summary.includes('142 ms'));

  const readOnly = summarizeDatabaseConnectionChecks({
    databaseId: 'ai-studio-chasingher-f7a61704-2cdd-4e3c-af0b-e387f983103a',
    totalLatencyMs: 98,
    isAdminSignedIn: false,
    checks: [
      { id: 'firestore_read', label: 'Firestore Live Server Read', status: 'pass', detail: 'OK', latencyMs: 52 },
      { id: 'security_rules', label: 'Security Rules Enforcement', status: 'pass', detail: 'OK', latencyMs: 41 },
      { id: 'admin_write', label: 'Admin Auth & Write Sync', status: 'warn', detail: 'Sign in required' },
      { id: 'storage_api', label: 'Storage Bucket & Upload API', status: 'pass', detail: 'OK', latencyMs: 5 },
    ],
  });
  assert.equal(readOnly.overallStatus, 'read_only');
  assert.ok(readOnly.summary.includes('Sign in with Google'));

  const failed = summarizeDatabaseConnectionChecks({
    databaseId: 'ai-studio-chasingher-f7a61704-2cdd-4e3c-af0b-e387f983103a',
    totalLatencyMs: 4200,
    isAdminSignedIn: false,
    checks: [
      { id: 'firestore_read', label: 'Firestore Live Server Read', status: 'fail', detail: 'offline' },
      { id: 'security_rules', label: 'Security Rules Enforcement', status: 'fail', detail: 'offline' },
      { id: 'admin_write', label: 'Admin Auth & Write Sync', status: 'warn', detail: 'Sign in required' },
      { id: 'storage_api', label: 'Storage Bucket & Upload API', status: 'pass', detail: 'OK', latencyMs: 4 },
    ],
  });
  assert.equal(failed.overallStatus, 'error');
  assert.ok(failed.summary.includes('Firestore Live Server Read'));
});



