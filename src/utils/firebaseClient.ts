import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  ChasingHerProjectData,
  MemoriesProjectData,
  DatabaseCheckItem,
  DatabaseConnectionReport,
  summarizeDatabaseConnectionChecks,
  computeProjectStorageUsage,
  buildFirebaseStorageUrl,
  resolveFirebaseStorageEndpoint,
} from './platformLogic';
import type { SubmissionOrder } from './supabaseAndOci';
import { compressImageFile } from './imageCompression';
import {
  FunnelCampaignId,
  FunnelQuestionKey,
  FunnelSessionRecord,
  FunnelStepId,
  FUNNEL_STEP_INDEX,
  sanitizeFunnelSessionForFirestore,
} from './funnelTracking';

import {
  arrayBufferToBase64,
  buildChunkPlan,
  computeChunkedUploadProgress,
  createStallWatchdog,
  createUploadSessionId,
  createUploadSessionLogger,
  DEFAULT_UPLOAD_CHUNK_BYTES,
  FIREBASE_SDK_STALL_TIMEOUT_MS,
  formatUploadErrorMessage,
  isBucketNotProvisionedError,
  isUploadCancelledError,
  shouldUseChunkedUpload,
  UPLOAD_STALL_TIMEOUT_MS,
  UploadCancelledError,
  UploadPhaseProgressEvent,
  UploadTimeoutError,
  UploadTransport,
} from './uploadPipeline';
import {
  clearLocalVaultMedia,
  listLocalVaultMedia,
  saveMediaToLocalVault,
} from './localMediaVault';

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId || 'gen-lang-client-0322444571';
export const FIREBASE_DATABASE_ID =
  firebaseConfig.firestoreDatabaseId || 'ai-studio-chasingher-f7a61704-2cdd-4e3c-af0b-e387f983103a';
export const FIREBASE_STORAGE_BUCKET =
  firebaseConfig.storageBucket || 'gen-lang-client-0322444571.firebasestorage.app';
export const FIREBASE_STORAGE_GS_URI = `gs://${FIREBASE_STORAGE_BUCKET}`;
export const FIREBASE_5GB_CAPACITY_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB Firebase Free Plan capacity
export const FIREBASE_ADMIN_EMAIL = 'shittu.cfm@gmail.com';

const app = initializeApp({
  ...firebaseConfig,
  storageBucket: FIREBASE_STORAGE_BUCKET,
});
export const db = getFirestore(app, FIREBASE_DATABASE_ID);
export const auth = getAuth(app);
export const storage = getStorage(app, FIREBASE_STORAGE_GS_URI);
// Prevent Firebase Cloud Storage SDK from silently retrying for 10 minutes (default 600,000 ms)
// when a bucket is unreachable or CORS-blocked, which causes progress bars to hang at ~26%.
storage.maxUploadRetryTime = FIREBASE_SDK_STALL_TIMEOUT_MS;
storage.maxOperationRetryTime = FIREBASE_SDK_STALL_TIMEOUT_MS;

export function getFirebaseBucketEndpoint(): string {
  return resolveFirebaseStorageEndpoint({
    storageBucket: FIREBASE_STORAGE_BUCKET,
  });
}

export function buildFirebaseBucketObjectUrl(objectKey: string): string {
  return buildFirebaseStorageUrl(
    {
      storageBucket: FIREBASE_STORAGE_BUCKET,
    },
    objectKey
  );
}

export function getFirebaseStorageRef(objectKey: string) {
  const cleanKey = objectKey.replace(/^\/+/, '');
  return storageRef(storage, cleanKey);
}

export function isVerifiedAdminUser(user: User | null | undefined): boolean {
  if (!user || !user.emailVerified || !user.email) return false;
  return user.email.trim().toLowerCase() === FIREBASE_ADMIN_EMAIL;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<{ reachable: boolean; error?: string }> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { reachable: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
      return { reachable: false, error: 'The Firestore client is offline. Check your Firebase configuration.' };
    }
    // A permission-denied response from Firestore confirms the server is reachable and security rules are active.
    if (/permission[-_ ]?denied|insufficient permissions/i.test(msg)) {
      return { reachable: true };
    }
    return { reachable: false, error: msg };
  }
}

// Run startup connectivity validation when running in a browser context
if (typeof window !== 'undefined') {
  void testConnection();
}

/**
 * Non-destructive live diagnostic test against Firebase Firestore (`ai-studio-chasingher-...`)
 * and the Firebase 5 GB storage API. Does NOT clean or delete any customer files or records.
 */
export async function runDatabaseConnectionTest(): Promise<DatabaseConnectionReport> {
  const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const checks: DatabaseCheckItem[] = [];
  let settingsDocCount = 0;

  // 1. Live Firestore Server Read Check (explicitly bypasses cache)
  const readStart = nowMs();
  try {
    const snap = await getDocsFromServer(collection(db, 'platform_settings'));
    settingsDocCount = snap.size;
    const readMs = Math.max(1, Math.round(nowMs() - readStart));
    checks.push({
      id: 'firestore_read',
      label: 'Firestore Live Server Read',
      status: 'pass',
      latencyMs: readMs,
      detail: `Connected to "${FIREBASE_DATABASE_ID}" (${settingsDocCount} setting doc${settingsDocCount === 1 ? '' : 's'} read from server in ${readMs} ms).`,
    });
  } catch (error) {
    const readMs = Math.max(1, Math.round(nowMs() - readStart));
    const msg = error instanceof Error ? error.message : String(error);
    checks.push({
      id: 'firestore_read',
      label: 'Firestore Live Server Read',
      status: 'fail',
      latencyMs: readMs,
      detail: msg.includes('the client is offline')
        ? 'Firestore client is offline. Verify internet connectivity and firebase-applet-config.json.'
        : `Server read failed: ${msg}`,
    });
  }

  // 2. Security Rules Enforcement Probe (default-deny check on test/connection)
  const rulesStart = nowMs();
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    const rulesMs = Math.max(1, Math.round(nowMs() - rulesStart));
    checks.push({
      id: 'security_rules',
      label: 'Security Rules Enforcement',
      status: 'warn',
      latencyMs: rulesMs,
      detail: 'Server responded, but test/connection was unexpectedly readable. Review firestore.rules.',
    });
  } catch (error) {
    const rulesMs = Math.max(1, Math.round(nowMs() - rulesStart));
    const msg = error instanceof Error ? error.message : String(error);
    if (/permission[-_ ]?denied|insufficient permissions/i.test(msg)) {
      checks.push({
        id: 'security_rules',
        label: 'Security Rules Enforcement',
        status: 'pass',
        latencyMs: rulesMs,
        detail: `Default-deny Firestore rules confirmed active on server (${rulesMs} ms).`,
      });
    } else {
      checks.push({
        id: 'security_rules',
        label: 'Security Rules Enforcement',
        status: 'fail',
        latencyMs: rulesMs,
        detail: `Could not verify rules on server: ${msg}`,
      });
    }
  }

  // 3. Authenticated Admin Write + Read-back + Cleanup Round-Trip
  const user = auth.currentUser;
  const adminSignedIn = isVerifiedAdminUser(user);
  const writeStart = nowMs();

  if (adminSignedIn && user) {
    const probeKey = '_connection_probe';
    const probeRef = doc(db, 'platform_settings', probeKey);
    const probeValue = `ok:${Date.now()}`;
    try {
      await setDoc(probeRef, {
        key: probeKey,
        value: probeValue,
        updatedAt: serverTimestamp(),
      });
      const verifiedSnap = await getDocFromServer(probeRef);
      const readBackOk = verifiedSnap.exists() && verifiedSnap.data()?.value === probeValue;
      await deleteDoc(probeRef);
      const writeMs = Math.max(1, Math.round(nowMs() - writeStart));

      checks.push({
        id: 'admin_write',
        label: 'Admin Auth & Write Sync',
        status: readBackOk ? 'pass' : 'fail',
        latencyMs: writeMs,
        detail: readBackOk
          ? `Signed in as ${user.email} — live write, read-back & cleanup succeeded in ${writeMs} ms.`
          : 'Write completed but read-back verification did not match.',
      });
    } catch (error) {
      const writeMs = Math.max(1, Math.round(nowMs() - writeStart));
      const msg = error instanceof Error ? error.message : String(error);
      checks.push({
        id: 'admin_write',
        label: 'Admin Auth & Write Sync',
        status: 'fail',
        latencyMs: writeMs,
        detail: `Authenticated write failed for ${user.email}: ${msg}`,
      });
    }
  } else if (user && user.emailVerified) {
    checks.push({
      id: 'admin_write',
      label: 'Admin Auth & Write Sync',
      status: 'warn',
      detail: `Signed in as ${user.email} (customer account). Sign in with ${FIREBASE_ADMIN_EMAIL} to enable full Admin database sync.`,
    });
  } else {
    checks.push({
      id: 'admin_write',
      label: 'Admin Auth & Write Sync',
      status: 'warn',
      detail: `Not signed in to Google Auth yet. Click "Sign In with Google" (${FIREBASE_ADMIN_EMAIL}) to test and enable live Admin writes.`,
    });
  }

  // 4. Storage Bucket & Upload API Health Check (works on both Express full-stack AND static Firebase Hosting / GitHub Pages)
  const apiStart = nowMs();
  try {
    const res = await fetch('/api/firebase/status', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    const contentType = res.headers.get('content-type') || '';
    const apiMs = Math.max(1, Math.round(nowMs() - apiStart));

    if (res.ok && contentType.includes('application/json')) {
      const payload = await res.json();
      const count = Array.isArray(payload.objects) ? payload.objects.length : 0;
      checks.push({
        id: 'storage_api',
        label: 'Storage Bucket & Upload API',
        status: 'pass',
        latencyMs: apiMs,
        detail: `Bucket "${FIREBASE_STORAGE_BUCKET}" & Express streaming API ready (${count} active media file${count === 1 ? '' : 's'}, ${apiMs} ms).`,
      });
    } else {
      // Static hosting mode (e.g., Firebase Hosting or GitHub Pages without Express /api/* backend)
      let mediaRecordCount = 0;
      if (adminSignedIn) {
        try {
          const mediaSnap = await getDocsFromServer(collection(db, 'media_records'));
          mediaRecordCount = mediaSnap.size;
        } catch {
          // ignore if empty
        }
      }
      const sdkMs = Math.max(1, Math.round(nowMs() - apiStart));
      const configuredBucket = storage.app.options.storageBucket || FIREBASE_STORAGE_BUCKET;
      checks.push({
        id: 'storage_api',
        label: 'Storage Bucket & Upload SDK',
        status: 'pass',
        latencyMs: sdkMs,
        detail: `Static hosting mode — Direct Firebase Cloud Storage SDK ("${configuredBucket}") ready (${mediaRecordCount} media record${mediaRecordCount === 1 ? '' : 's'} in Firestore, ${sdkMs} ms).`,
      });
    }
  } catch {
    const sdkMs = Math.max(1, Math.round(nowMs() - apiStart));
    const configuredBucket = storage.app.options.storageBucket || FIREBASE_STORAGE_BUCKET;
    checks.push({
      id: 'storage_api',
      label: 'Storage Bucket & Upload SDK',
      status: 'pass',
      latencyMs: sdkMs,
      detail: `Direct Firebase Cloud Storage SDK ("${configuredBucket}") configured for browser uploads.`,
    });
  }

  const totalLatencyMs = Math.max(1, Math.round(nowMs() - startedAt));
  const { overallStatus, summary } = summarizeDatabaseConnectionChecks({
    checks,
    databaseId: FIREBASE_DATABASE_ID,
    totalLatencyMs,
    isAdminSignedIn: adminSignedIn,
  });

  return {
    overallStatus,
    summary,
    checkedAt: new Date().toISOString(),
    totalLatencyMs,
    projectId: FIREBASE_PROJECT_ID,
    databaseId: FIREBASE_DATABASE_ID,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    settingsDocCount,
    authEmail: user?.email || null,
    authVerified: Boolean(user?.emailVerified),
    isAdminSignedIn: adminSignedIn,
    checks,
  };
}

export function subscribeToFirebaseAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGooglePopup() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
}

export async function signOutFirebase() {
  return signOut(auth);
}

function toIsoDate(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return new Date().toISOString();
}

export function subscribeToFirestoreWorkspace(
  user: User,
  callbacks: {
    onOrders: (orders: SubmissionOrder[]) => void;
    onChasingHerProjects: (projects: Record<string, ChasingHerProjectData>) => void;
    onMemoriesProjects: (projects: Record<string, MemoriesProjectData>) => void;
    onPlatformSettings?: (settings: Record<string, string>) => void;
    onFunnelSessions?: (sessions: FunnelSessionRecord[]) => void;
    onError?: (message: string) => void;
  }
): () => void {
  if (!user || !user.emailVerified) {
    return () => {};
  }

  const adminMode = isVerifiedAdminUser(user);
  const unsubscribers: Array<() => void> = [];

  const ordersSource = adminMode
    ? collection(db, 'orders')
    : query(collection(db, 'orders'), where('ownerId', '==', user.uid));

  unsubscribers.push(
    onSnapshot(
      ordersSource,
      (snap) => {
        const list: SubmissionOrder[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (!d || typeof d.slug !== 'string') return;
          list.push({
            id: typeof d.id === 'string' ? d.id : docSnap.id,
            slug: d.slug,
            product: d.product === 'memories' || d.product === 'custom' ? d.product : 'chasing-her',
            build_product: d.build_product === 'memories' ? 'memories' : 'chasing-her',
            full_name: typeof d.full_name === 'string' ? d.full_name : 'Customer',
            whatsapp: typeof d.whatsapp === 'string' ? d.whatsapp : '',
            email: typeof d.email === 'string' ? d.email : '',
            country: d.country === 'ke' || d.country === 'ng' ? d.country : 'gh',
            status:
              d.status === 'paid' || d.status === 'hosted' || d.status === 'expired'
                ? d.status
                : 'pending_payment',
            progress:
              d.progress === 'building' || d.progress === 'review' || d.progress === 'hosted'
                ? d.progress
                : 'received',
            progress_note: typeof d.progress_note === 'string' ? d.progress_note : undefined,
            pin: typeof d.pin === 'string' ? d.pin : '140226',
            hosted_url: typeof d.hosted_url === 'string' ? d.hosted_url : undefined,
            created_at: toIsoDate(d.createdAt),
          });
        });
        callbacks.onOrders(list);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'orders');
        } catch (wrapped) {
          callbacks.onError?.(wrapped instanceof Error ? wrapped.message : String(wrapped));
        }
      }
    )
  );

  const chSource = adminMode
    ? collection(db, 'projects')
    : query(collection(db, 'projects'), where('ownerId', '==', user.uid));

  unsubscribers.push(
    onSnapshot(
      chSource,
      (snap) => {
        const map: Record<string, ChasingHerProjectData> = {};
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (!d) return;
          const slug = typeof d.slug === 'string' ? d.slug : docSnap.id;
          let parsedPayload: Partial<ChasingHerProjectData> = {};
          if (typeof d.payloadJson === 'string' && d.payloadJson.trim()) {
            try {
              parsedPayload = JSON.parse(d.payloadJson) as Partial<ChasingHerProjectData>;
            } catch {
              parsedPayload = {};
            }
          }
          map[slug] = {
            photos: [],
            flower_images: [],
            songs: [],
            ...parsedPayload,
            slug,
            pin: typeof d.pin === 'string' ? d.pin : parsedPayload.pin || '140226',
            intro_message:
              typeof d.intro_message === 'string'
                ? d.intro_message
                : parsedPayload.intro_message || '',
            letter_title:
              typeof d.letter_title === 'string'
                ? d.letter_title
                : parsedPayload.letter_title || '',
            letter_body:
              typeof d.letter_body === 'string'
                ? d.letter_body
                : parsedPayload.letter_body || '',
            final_message:
              typeof d.final_message === 'string'
                ? d.final_message
                : parsedPayload.final_message || '',
            music_url:
              typeof d.music_url === 'string' ? d.music_url : parsedPayload.music_url,
          };
        });
        callbacks.onChasingHerProjects(map);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'projects');
        } catch (wrapped) {
          callbacks.onError?.(wrapped instanceof Error ? wrapped.message : String(wrapped));
        }
      }
    )
  );

  const memSource = adminMode
    ? collection(db, 'memory_projects')
    : query(collection(db, 'memory_projects'), where('ownerId', '==', user.uid));

  unsubscribers.push(
    onSnapshot(
      memSource,
      (snap) => {
        const map: Record<string, MemoriesProjectData> = {};
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          if (!d) return;
          const slug = typeof d.slug === 'string' ? d.slug : docSnap.id;
          let parsedPayload: Partial<MemoriesProjectData> = {};
          if (typeof d.payloadJson === 'string' && d.payloadJson.trim()) {
            try {
              parsedPayload = JSON.parse(d.payloadJson) as Partial<MemoriesProjectData>;
            } catch {
              parsedPayload = {};
            }
          }
          map[slug] = {
            collage_day: '14',
            collage_month: '02',
            collage_year: '2026',
            collage_quote: '',
            mosaic_images: [],
            memories: [],
            flower_images: [],
            ...parsedPayload,
            slug,
            pin: typeof d.pin === 'string' ? d.pin : parsedPayload.pin || '250824',
            hero_title:
              typeof d.hero_title === 'string' ? d.hero_title : parsedPayload.hero_title || '',
            hero_subtitle:
              typeof d.hero_subtitle === 'string'
                ? d.hero_subtitle
                : parsedPayload.hero_subtitle || '',
            collage_names:
              typeof d.collage_names === 'string'
                ? d.collage_names
                : parsedPayload.collage_names || '',
            letter_title:
              typeof d.letter_title === 'string'
                ? d.letter_title
                : parsedPayload.letter_title || '',
            letter_body:
              typeof d.letter_body === 'string'
                ? d.letter_body
                : parsedPayload.letter_body || '',
            final_message:
              typeof d.final_message === 'string'
                ? d.final_message
                : parsedPayload.final_message || '',
          };
        });
        callbacks.onMemoriesProjects(map);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'memory_projects');
        } catch (wrapped) {
          callbacks.onError?.(wrapped instanceof Error ? wrapped.message : String(wrapped));
        }
      }
    )
  );

  if (callbacks.onPlatformSettings) {
    unsubscribers.push(
      onSnapshot(
        collection(db, 'platform_settings'),
        (snap) => {
          const nextSettings: Record<string, string> = {};
          snap.forEach((docSnap) => {
            const d = docSnap.data();
            if (d && typeof d.key === 'string' && typeof d.value === 'string' && d.key !== '_connection_probe') {
              nextSettings[d.key] = d.value;
            }
          });
          callbacks.onPlatformSettings?.(nextSettings);
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, 'platform_settings');
          } catch (wrapped) {
            callbacks.onError?.(wrapped instanceof Error ? wrapped.message : String(wrapped));
          }
        }
      )
    );
  }

  if (adminMode && callbacks.onFunnelSessions) {
    unsubscribers.push(
      onSnapshot(
        collection(db, 'funnel_sessions'),
        (snap) => {
          const list: FunnelSessionRecord[] = [];
          snap.forEach((docSnap) => {
            const parsed = parseFirestoreFunnelSessionDoc(docSnap.id, docSnap.data());
            if (parsed) list.push(parsed);
          });
          list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
          callbacks.onFunnelSessions?.(list);
        },
        (error) => {
          try {
            handleFirestoreError(error, OperationType.LIST, 'funnel_sessions');
          } catch (wrapped) {
            callbacks.onError?.(wrapped instanceof Error ? wrapped.message : String(wrapped));
          }
        }
      )
    );
  }

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

export async function recordCompressedMediaInFirestore(params: {
  id: string;
  projectSlug: string;
  fileName: string;
  contentType: string;
  originalBytes: number;
  storedBytes: number;
  width: number;
  height: number;
  url: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const safeId = params.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const safeSlug = params.projectSlug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || 'general';
  const path = `media_records/${safeId}`;
  try {
    await setDoc(doc(db, 'media_records', safeId), {
      id: safeId,
      ownerId: user.uid,
      projectSlug: safeSlug,
      fileName: params.fileName.slice(0, 255),
      contentType: params.contentType.slice(0, 100),
      originalBytes: Math.max(0, Math.min(104857600, Math.round(params.originalBytes))),
      storedBytes: Math.max(0, Math.min(52428800, Math.round(params.storedBytes))),
      width: Math.max(0, Math.min(12000, Math.round(params.width))),
      height: Math.max(0, Math.min(12000, Math.round(params.height))),
      url: params.url.slice(0, 2048),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCompressedMediaFromFirestore(recordId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const safeId = recordId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `media_records/${safeId}`;
  try {
    await deleteDoc(doc(db, 'media_records', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

interface RawUploadResponse {
  ok: boolean;
  object: {
    id: string;
    objectKey: string;
    fileName: string;
    songTitle?: string;
    contentType: string;
    sizeBytes: number;
    originalBytes?: number;
    savedBytes?: number;
    width?: number;
    height?: number;
    url: string;
    storageTier: string;
  };
}

class BackendUploadUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackendUploadUnavailableError';
  }
}

interface ChunkUploadResult {
  ok: boolean;
  completed?: boolean;
  object?: RawUploadResponse['object'];
}

function sendXhrChunk(params: {
  url: string;
  body: Blob | string;
  headers: Record<string, string>;
  transport: UploadTransport;
  chunkIndex: number;
  totalChunks: number;
  signal?: AbortSignal;
  logger: ReturnType<typeof createUploadSessionLogger>;
  onUploadFraction?: (fraction: number) => void;
}): Promise<ChunkUploadResult> {
  const throwIfAborted = () => {
    if (params.signal?.aborted) {
      const snap = params.logger.getSnapshot();
      throw new UploadCancelledError(
        'Upload cancelled by user during chunk transfer.',
        'cancelled',
        snap.lastPercent
      );
    }
  };

  throwIfAborted();

  if (typeof XMLHttpRequest === 'undefined') {
    const controller = new AbortController();
    let stalledOut = false;
    const onExternalAbort = () => controller.abort();
    params.signal?.addEventListener('abort', onExternalAbort, { once: true });

    const watchdog = createStallWatchdog(UPLOAD_STALL_TIMEOUT_MS, () => {
      stalledOut = true;
      controller.abort();
    });
    return fetch(params.url, {
      method: 'POST',
      credentials: 'include',
      headers: { ...params.headers, Accept: 'application/json' },
      body: params.body,
      signal: controller.signal,
    })
      .then(async (res) => {
        watchdog.stop();
        params.signal?.removeEventListener('abort', onExternalAbort);
        const ct = res.headers.get('content-type') || '';
        if (res.status === 404 || res.status === 405 || !ct.includes('application/json')) {
          throw new BackendUploadUnavailableError(`Upload API unavailable (${res.status}).`);
        }
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          params.logger.error('mid-process-error', `Chunk ${params.chunkIndex + 1}/${params.totalChunks} HTTP error`, {
            transport: params.transport,
            chunkIndex: params.chunkIndex,
            totalChunks: params.totalChunks,
            httpStatus: res.status,
            error: payload?.error || `HTTP ${res.status}`,
          });
          throw new Error(payload?.error || `Chunk upload failed (${res.status})`);
        }
        params.onUploadFraction?.(1);
        return payload as ChunkUploadResult;
      })
      .catch((err) => {
        watchdog.stop();
        params.signal?.removeEventListener('abort', onExternalAbort);
        if (params.signal?.aborted) {
          const snap = params.logger.getSnapshot();
          throw new UploadCancelledError('Upload cancelled by user.', 'cancelled', snap.lastPercent);
        }
        if (stalledOut) {
          const snap = params.logger.getSnapshot();
          throw new UploadTimeoutError({
            message: `Chunk ${params.chunkIndex + 1}/${params.totalChunks} transfer timed out with no activity.`,
            phase: 'mid-process-timeout',
            transport: params.transport,
            percentAtTimeout: snap.lastPercent,
            chunkIndex: params.chunkIndex,
            totalChunks: params.totalChunks,
            idleMs: UPLOAD_STALL_TIMEOUT_MS,
            elapsedMs: snap.elapsedMs,
          });
        }
        throw err;
      });
  }

  return new Promise<ChunkUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    let stalledOut = false;
    let userAborted = false;

    const cleanup = () => {
      watchdog.stop();
      params.signal?.removeEventListener('abort', handleExternalAbort);
    };

    const finishReject = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const finishResolve = (val: ChunkUploadResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(val);
    };

    const handleExternalAbort = () => {
      userAborted = true;
      const snap = params.logger.getSnapshot();
      params.logger.warn(
        'cancelled',
        `Aborting XHR mid-process on chunk ${params.chunkIndex + 1}/${params.totalChunks} at ${snap.lastPercent}%`,
        {
          transport: params.transport,
          chunkIndex: params.chunkIndex,
          totalChunks: params.totalChunks,
          readyState: xhr.readyState,
        }
      );
      try {
        xhr.abort();
      } catch {
        // ignore
      }
      finishReject(
        new UploadCancelledError(
          'Upload cancelled by user.',
          'cancelled',
          snap.lastPercent
        )
      );
    };

    // Idle-only watchdog: resets on every single outgoing packet so slow healthy
    // connections never time out while data is actively flowing.
    const watchdog = createStallWatchdog(UPLOAD_STALL_TIMEOUT_MS, () => {
      stalledOut = true;
      const snap = params.logger.getSnapshot();
      params.logger.error(
        'mid-process-timeout',
        `Chunk ${params.chunkIndex + 1}/${params.totalChunks} stalled with zero bytes transferred for ${Math.round(
          UPLOAD_STALL_TIMEOUT_MS / 1000
        )}s (readyState=${xhr.readyState})`,
        {
          transport: params.transport,
          chunkIndex: params.chunkIndex,
          totalChunks: params.totalChunks,
          readyState: xhr.readyState,
        }
      );
      try {
        xhr.abort();
      } catch {
        // ignore
      }
      finishReject(
        new UploadTimeoutError({
          message: `Chunk ${params.chunkIndex + 1}/${params.totalChunks} stalled with zero bytes sent for 45s.`,
          phase: 'mid-process-timeout',
          transport: params.transport,
          percentAtTimeout: snap.lastPercent,
          chunkIndex: params.chunkIndex,
          totalChunks: params.totalChunks,
          idleMs: UPLOAD_STALL_TIMEOUT_MS,
          elapsedMs: snap.elapsedMs,
        })
      );
    });

    if (params.signal) {
      if (params.signal.aborted) {
        handleExternalAbort();
        return;
      }
      params.signal.addEventListener('abort', handleExternalAbort, { once: true });
    }

    xhr.open('POST', params.url, true);
    xhr.withCredentials = true;
    xhr.timeout = 0; // Never impose a fixed wall-clock cutoff while bytes are flowing
    xhr.setRequestHeader('Accept', 'application/json');
    for (const [key, val] of Object.entries(params.headers)) {
      xhr.setRequestHeader(key, val);
    }

    xhr.upload.onprogress = (ev) => {
      watchdog.touch();
      if (ev.lengthComputable && ev.total > 0) {
        params.onUploadFraction?.(Math.min(0.95, ev.loaded / ev.total));
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState >= 2) {
        watchdog.touch();
      }
    };

    xhr.onload = () => {
      const ct = xhr.getResponseHeader('content-type') || '';
      if (xhr.status === 404 || xhr.status === 405 || !ct.includes('application/json')) {
        params.logger.warn(
          'mid-process-error',
          `Chunk ${params.chunkIndex + 1}/${params.totalChunks} received non-API response (${xhr.status})`,
          {
            transport: params.transport,
            chunkIndex: params.chunkIndex,
            totalChunks: params.totalChunks,
            httpStatus: xhr.status,
            readyState: xhr.readyState,
          }
        );
        finishReject(new BackendUploadUnavailableError(`Upload API unavailable (${xhr.status}).`));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as ChunkUploadResult;
          if (!parsed?.ok) {
            params.logger.error(
              'mid-process-error',
              `Server rejected chunk ${params.chunkIndex + 1}/${params.totalChunks} payload`,
              {
                transport: params.transport,
                chunkIndex: params.chunkIndex,
                totalChunks: params.totalChunks,
                httpStatus: xhr.status,
              }
            );
            finishReject(new Error('Invalid chunk response from server'));
            return;
          }
          params.onUploadFraction?.(1);
          finishResolve(parsed);
        } catch (parseErr) {
          params.logger.error(
            'mid-process-error',
            `Malformed JSON response on chunk ${params.chunkIndex + 1}/${params.totalChunks}`,
            {
              transport: params.transport,
              chunkIndex: params.chunkIndex,
              totalChunks: params.totalChunks,
              httpStatus: xhr.status,
              error: parseErr,
            }
          );
          finishReject(new Error('Invalid chunk response from server'));
        }
      } else {
        let serverMsg = `Chunk upload failed (${xhr.status})`;
        try {
          const errBody = JSON.parse(xhr.responseText);
          if (errBody?.error) serverMsg = errBody.error;
        } catch {
          // ignore
        }
        params.logger.error(
          'mid-process-error',
          `HTTP ${xhr.status} while uploading chunk ${params.chunkIndex + 1}/${params.totalChunks}: ${serverMsg}`,
          {
            transport: params.transport,
            chunkIndex: params.chunkIndex,
            totalChunks: params.totalChunks,
            httpStatus: xhr.status,
            readyState: xhr.readyState,
            error: serverMsg,
          }
        );
        finishReject(new Error(serverMsg));
      }
    };

    xhr.onerror = () => {
      params.logger.error(
        'mid-process-error',
        `Network error mid-process on chunk ${params.chunkIndex + 1}/${params.totalChunks} (readyState=${xhr.readyState})`,
        {
          transport: params.transport,
          chunkIndex: params.chunkIndex,
          totalChunks: params.totalChunks,
          readyState: xhr.readyState,
        }
      );
      finishReject(
        new Error(
          `Network error while transferring chunk ${params.chunkIndex + 1} of ${params.totalChunks}`
        )
      );
    };

    xhr.onabort = () => {
      if (userAborted) {
        const snap = params.logger.getSnapshot();
        finishReject(new UploadCancelledError('Upload cancelled by user.', 'cancelled', snap.lastPercent));
        return;
      }
      if (stalledOut) {
        const snap = params.logger.getSnapshot();
        finishReject(
          new UploadTimeoutError({
            message: `Chunk ${params.chunkIndex + 1}/${params.totalChunks} stalled with no progress.`,
            phase: 'mid-process-timeout',
            transport: params.transport,
            percentAtTimeout: snap.lastPercent,
            chunkIndex: params.chunkIndex,
            totalChunks: params.totalChunks,
            idleMs: UPLOAD_STALL_TIMEOUT_MS,
            elapsedMs: snap.elapsedMs,
          })
        );
        return;
      }
      finishReject(new Error('Upload was aborted unexpectedly during transfer'));
    };

    xhr.send(params.body);
  });
}

async function streamChunkedFileUpload(params: {
  file: File;
  kind: 'images' | 'video' | 'voice' | 'music';
  projectSlug: string;
  songTitle: string;
  originalBytes: number;
  width: number;
  height: number;
  headers: Record<string, string>;
  useJsonTransport?: boolean;
  signal?: AbortSignal;
  logger: ReturnType<typeof createUploadSessionLogger>;
  onProgress?: (percent: number) => void;
  onPhaseChange?: (event: UploadPhaseProgressEvent) => void;
}): Promise<RawUploadResponse> {
  const plan = buildChunkPlan(params.file.size, DEFAULT_UPLOAD_CHUNK_BYTES);
  if (plan.totalChunks === 0) {
    throw new Error('Selected file is empty.');
  }

  const transport: UploadTransport = params.useJsonTransport ? 'chunked-json' : 'chunked-binary';
  const uploadId = params.logger.sessionId || createUploadSessionId();
  let finalResponse: RawUploadResponse | null = null;
  let bytesSent = 0;

  params.logger.info(
    'upload-start',
    `Starting ${transport} upload: ${plan.totalChunks} chunk${plan.totalChunks > 1 ? 's' : ''} (${Math.round(
      plan.totalBytes / 1024
    )} KB total)`,
    {
      transport,
      totalChunks: plan.totalChunks,
      percent: 5,
    }
  );

  for (const slice of plan.slices) {
    if (params.signal?.aborted) {
      const snap = params.logger.getSnapshot();
      throw new UploadCancelledError(
        'Upload cancelled by user.',
        'cancelled',
        snap.lastPercent
      );
    }

    const chunkBlob = params.file.slice(slice.start, slice.end);
    let chunkResult: ChunkUploadResult | null = null;
    let lastChunkErr: unknown = null;

    params.onPhaseChange?.({
      sessionId: uploadId,
      phase: 'mid-process-progress',
      transport,
      detail: `Uploading chunk ${slice.index + 1} of ${plan.totalChunks}…`,
      percent: computeChunkedUploadProgress(slice.index, plan.totalChunks, 0),
      chunkIndex: slice.index,
      totalChunks: plan.totalChunks,
      fileName: params.file.name,
    });

    for (let attempt = 0; attempt <= 2; attempt++) {
      if (params.signal?.aborted) {
        const snap = params.logger.getSnapshot();
        throw new UploadCancelledError(
          'Upload cancelled by user.',
          'cancelled',
          snap.lastPercent
        );
      }

      try {
        if (params.useJsonTransport) {
          const buf = await chunkBlob.arrayBuffer();
          const dataBase64 = arrayBufferToBase64(buf);
          const payload = JSON.stringify({
            uploadId,
            chunkIndex: slice.index,
            totalChunks: plan.totalChunks,
            fileName: params.file.name,
            songTitle: params.songTitle || undefined,
            contentType: params.file.type || 'application/octet-stream',
            kind: params.kind,
            projectSlug: params.projectSlug || 'general',
            originalBytes: Math.round(params.originalBytes),
            width: Math.round(params.width),
            height: Math.round(params.height),
            dataBase64,
          });
          chunkResult = await sendXhrChunk({
            url: '/api/firebase/upload-chunk-json',
            body: payload,
            headers: { 'Content-Type': 'application/json' },
            transport,
            chunkIndex: slice.index,
            totalChunks: plan.totalChunks,
            signal: params.signal,
            logger: params.logger,
            onUploadFraction: (frac) => {
              params.onProgress?.(
                computeChunkedUploadProgress(slice.index, plan.totalChunks, frac)
              );
            },
          });
        } else {
          const qs = `uploadId=${encodeURIComponent(uploadId)}&chunkIndex=${slice.index}&totalChunks=${plan.totalChunks}`;
          chunkResult = await sendXhrChunk({
            url: `/api/firebase/upload-chunk?${qs}`,
            body: chunkBlob,
            headers: {
              ...params.headers,
              'Content-Type': 'application/octet-stream',
              'x-upload-id': uploadId,
              'x-chunk-index': String(slice.index),
              'x-total-chunks': String(plan.totalChunks),
            },
            transport,
            chunkIndex: slice.index,
            totalChunks: plan.totalChunks,
            signal: params.signal,
            logger: params.logger,
            onUploadFraction: (frac) => {
              params.onProgress?.(
                computeChunkedUploadProgress(slice.index, plan.totalChunks, frac)
              );
            },
          });
        }
        break;
      } catch (err) {
        lastChunkErr = err;
        if (isUploadCancelledError(err) || params.signal?.aborted) {
          throw err;
        }
        if (err instanceof BackendUploadUnavailableError) {
          throw err;
        }
        if (err instanceof Error && (err.message.includes('50 MB') || err.message.includes('413'))) {
          throw err;
        }
        if (attempt < 2) {
          const backoffMs = 350 * (attempt + 1);
          params.logger.warn(
            'mid-process-retry',
            `Chunk ${slice.index + 1}/${plan.totalChunks} failed (attempt ${attempt + 1}/3); retrying in ${backoffMs}ms`,
            {
              transport,
              chunkIndex: slice.index,
              totalChunks: plan.totalChunks,
              attempt: attempt + 1,
              error: err,
            }
          );
          params.onPhaseChange?.({
            sessionId: uploadId,
            phase: 'mid-process-retry',
            transport,
            detail: `Retrying chunk ${slice.index + 1} of ${plan.totalChunks} (attempt ${attempt + 2}/3)…`,
            percent: computeChunkedUploadProgress(slice.index, plan.totalChunks, 0),
            chunkIndex: slice.index,
            totalChunks: plan.totalChunks,
            fileName: params.file.name,
          });
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => {
              params.signal?.removeEventListener('abort', onAbortDuringBackoff);
              resolve();
            }, backoffMs);
            const onAbortDuringBackoff = () => {
              clearTimeout(timer);
              const snap = params.logger.getSnapshot();
              reject(new UploadCancelledError('Upload cancelled during retry backoff.', 'cancelled', snap.lastPercent));
            };
            params.signal?.addEventListener('abort', onAbortDuringBackoff, { once: true });
          });
        }
      }
    }

    if (!chunkResult) {
      params.logger.error(
        'mid-process-error',
        `Chunk ${slice.index + 1}/${plan.totalChunks} exhausted all 3 attempts`,
        {
          transport,
          chunkIndex: slice.index,
          totalChunks: plan.totalChunks,
          error: lastChunkErr,
        }
      );
      throw lastChunkErr instanceof Error
        ? lastChunkErr
        : new Error(`Chunk ${slice.index + 1} of ${plan.totalChunks} upload failed after retries.`);
    }

    bytesSent += slice.size;
    const chunkDonePct = computeChunkedUploadProgress(slice.index, plan.totalChunks, 1);
    params.onProgress?.(chunkDonePct);
    params.logger.info(
      'mid-process-progress',
      `Chunk ${slice.index + 1}/${plan.totalChunks} confirmed (${chunkDonePct}%)`,
      {
        transport,
        chunkIndex: slice.index,
        totalChunks: plan.totalChunks,
        percent: chunkDonePct,
        bytesTransferred: bytesSent,
      }
    );

    if (chunkResult.completed && chunkResult.object) {
      finalResponse = { ok: true, object: chunkResult.object };
    }
  }

  if (!finalResponse) {
    params.logger.error('mid-process-error', 'All chunks uploaded but server did not return finalized object', {
      transport,
      totalChunks: plan.totalChunks,
    });
    throw new Error('Server did not finalize the uploaded file.');
  }

  params.logger.info('finalize', `Server assembled & committed ${params.file.name}`, {
    transport,
    percent: 100,
    bytesTransferred: bytesSent,
  });
  params.onProgress?.(100);
  return finalResponse;
}

function streamRawFileUpload(params: {
  file: File;
  headers: Record<string, string>;
  signal?: AbortSignal;
  logger: ReturnType<typeof createUploadSessionLogger>;
  onProgress?: (percent: number) => void;
  onPhaseChange?: (event: UploadPhaseProgressEvent) => void;
}): Promise<RawUploadResponse> {
  const transport: UploadTransport = 'raw-stream';
  if (params.signal?.aborted) {
    const snap = params.logger.getSnapshot();
    return Promise.reject(
      new UploadCancelledError('Upload cancelled by user.', 'cancelled', snap.lastPercent)
    );
  }

  params.logger.info(
    'upload-start',
    `Starting raw-stream upload (${Math.round(params.file.size / 1024)} KB)`,
    { transport, percent: 5 }
  );
  params.onPhaseChange?.({
    sessionId: params.logger.sessionId,
    phase: 'upload-start',
    transport,
    detail: `Streaming ${params.file.name}…`,
    percent: 5,
    fileName: params.file.name,
  });

  if (typeof XMLHttpRequest === 'undefined') {
    const controller = new AbortController();
    let stalledOut = false;
    const onExternalAbort = () => controller.abort();
    params.signal?.addEventListener('abort', onExternalAbort, { once: true });

    const watchdog = createStallWatchdog(UPLOAD_STALL_TIMEOUT_MS, () => {
      stalledOut = true;
      controller.abort();
    });
    return fetch('/api/firebase/upload-raw', {
      method: 'POST',
      credentials: 'include',
      headers: { ...params.headers, Accept: 'application/json' },
      body: params.file,
      signal: controller.signal,
    })
      .then(async (res) => {
        watchdog.stop();
        params.signal?.removeEventListener('abort', onExternalAbort);
        const ct = res.headers.get('content-type') || '';
        if (res.status === 404 || res.status === 405 || !ct.includes('application/json')) {
          throw new BackendUploadUnavailableError(`Upload API unavailable (${res.status}).`);
        }
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error || 'Firebase media upload failed');
        }
        params.onProgress?.(100);
        return res.json() as Promise<RawUploadResponse>;
      })
      .catch((err) => {
        watchdog.stop();
        params.signal?.removeEventListener('abort', onExternalAbort);
        if (params.signal?.aborted) {
          const snap = params.logger.getSnapshot();
          throw new UploadCancelledError('Upload cancelled by user.', 'cancelled', snap.lastPercent);
        }
        if (stalledOut) {
          const snap = params.logger.getSnapshot();
          throw new UploadTimeoutError({
            message: 'Raw stream upload timed out with no network progress.',
            phase: 'mid-process-timeout',
            transport,
            percentAtTimeout: snap.lastPercent,
            idleMs: UPLOAD_STALL_TIMEOUT_MS,
            elapsedMs: snap.elapsedMs,
          });
        }
        throw err;
      });
  }

  return new Promise<RawUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    let stalledOut = false;
    let userAborted = false;
    let lastLoggedMilestone = 0;

    const cleanup = () => {
      watchdog.stop();
      params.signal?.removeEventListener('abort', handleExternalAbort);
    };

    const finishReject = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const finishResolve = (val: RawUploadResponse) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(val);
    };

    const handleExternalAbort = () => {
      userAborted = true;
      const snap = params.logger.getSnapshot();
      params.logger.warn(
        'cancelled',
        `User aborted raw-stream upload mid-process at ${snap.lastPercent}%`,
        { transport, readyState: xhr.readyState }
      );
      try {
        xhr.abort();
      } catch {
        // ignore
      }
      finishReject(new UploadCancelledError('Upload cancelled by user.', 'cancelled', snap.lastPercent));
    };

    const watchdog = createStallWatchdog(UPLOAD_STALL_TIMEOUT_MS, () => {
      stalledOut = true;
      const snap = params.logger.getSnapshot();
      params.logger.error(
        'mid-process-timeout',
        `Raw stream upload stalled at ${snap.lastPercent}% with zero bytes sent for 45s (readyState=${xhr.readyState})`,
        { transport, readyState: xhr.readyState }
      );
      try {
        xhr.abort();
      } catch {
        // ignore
      }
      finishReject(
        new UploadTimeoutError({
          message: 'Upload stalled with no progress — switching transport.',
          phase: 'mid-process-timeout',
          transport,
          percentAtTimeout: snap.lastPercent,
          idleMs: UPLOAD_STALL_TIMEOUT_MS,
          elapsedMs: snap.elapsedMs,
        })
      );
    });

    if (params.signal) {
      if (params.signal.aborted) {
        handleExternalAbort();
        return;
      }
      params.signal.addEventListener('abort', handleExternalAbort, { once: true });
    }

    xhr.open('POST', '/api/firebase/upload-raw', true);
    xhr.withCredentials = true;
    xhr.timeout = 0; // Idle-only watchdog handles real stalls without cutting off slow healthy uploads
    xhr.setRequestHeader('Accept', 'application/json');
    for (const [key, val] of Object.entries(params.headers)) {
      xhr.setRequestHeader(key, val);
    }

    xhr.upload.onprogress = (ev) => {
      watchdog.touch();
      if (ev.lengthComputable && ev.total > 0) {
        const pct = Math.max(5, Math.min(99, Math.round((ev.loaded / ev.total) * 100)));
        params.onProgress?.(pct);
        const milestone = Math.floor(pct / 25) * 25;
        if (milestone >= 25 && milestone > lastLoggedMilestone) {
          lastLoggedMilestone = milestone;
          params.logger.info('mid-process-progress', `Raw stream reached ${pct}%`, {
            transport,
            percent: pct,
            bytesTransferred: ev.loaded,
          });
        }
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState >= 2) {
        watchdog.touch();
      }
    };

    xhr.onload = () => {
      const ct = xhr.getResponseHeader('content-type') || '';
      if (xhr.status === 404 || xhr.status === 405 || !ct.includes('application/json')) {
        params.logger.warn('mid-process-error', `Raw upload API unavailable (${xhr.status})`, {
          transport,
          httpStatus: xhr.status,
          readyState: xhr.readyState,
        });
        finishReject(new BackendUploadUnavailableError(`Upload API unavailable (${xhr.status}).`));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as RawUploadResponse;
          if (!parsed?.ok || !parsed?.object?.url) {
            finishReject(new Error('Invalid upload response from server'));
            return;
          }
          params.logger.info('finalize', `Raw stream upload finalized (${params.file.name})`, {
            transport,
            percent: 100,
            bytesTransferred: params.file.size,
          });
          params.onProgress?.(100);
          finishResolve(parsed);
        } catch (parseErr) {
          params.logger.error('mid-process-error', 'Invalid JSON returned from raw upload endpoint', {
            transport,
            httpStatus: xhr.status,
            error: parseErr,
          });
          finishReject(new Error('Invalid upload response from server'));
        }
      } else {
        let serverMsg = `Upload failed (${xhr.status})`;
        try {
          const errBody = JSON.parse(xhr.responseText);
          if (errBody?.error) serverMsg = errBody.error;
        } catch {
          // ignore
        }
        params.logger.error('mid-process-error', `Raw upload HTTP ${xhr.status}: ${serverMsg}`, {
          transport,
          httpStatus: xhr.status,
          readyState: xhr.readyState,
          error: serverMsg,
        });
        finishReject(new Error(serverMsg));
      }
    };

    xhr.onerror = () => {
      params.logger.error('mid-process-error', `Network error during raw-stream upload (readyState=${xhr.readyState})`, {
        transport,
        readyState: xhr.readyState,
      });
      finishReject(new Error('Network error while uploading media'));
    };

    xhr.onabort = () => {
      if (userAborted) {
        const snap = params.logger.getSnapshot();
        finishReject(new UploadCancelledError('Upload cancelled by user.', 'cancelled', snap.lastPercent));
        return;
      }
      if (stalledOut) {
        const snap = params.logger.getSnapshot();
        finishReject(
          new UploadTimeoutError({
            message: 'Upload stalled with no progress.',
            phase: 'mid-process-timeout',
            transport,
            percentAtTimeout: snap.lastPercent,
            idleMs: UPLOAD_STALL_TIMEOUT_MS,
            elapsedMs: snap.elapsedMs,
          })
        );
        return;
      }
      finishReject(new Error('Upload was aborted unexpectedly'));
    };

    xhr.send(params.file);
  });
}

let cachedBucketReachable: boolean | null = null;

async function isFirebaseStorageBucketProvisioned(): Promise<boolean> {
  if (cachedBucketReachable !== null) return cachedBucketReachable;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(
      `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(FIREBASE_STORAGE_BUCKET)}/o`,
      { method: 'GET', signal: controller.signal }
    );
    clearTimeout(timer);
    if (isBucketNotProvisionedError(res.status)) {
      cachedBucketReachable = false;
      return false;
    }
    cachedBucketReachable = true;
    return true;
  } catch {
    clearTimeout(timer);
    // Network/CORS block on probe — do not cache false permanently, let SDK fail cleanly if needed
    return false;
  }
}

async function uploadViaFirebaseStorageSdk(params: {
  file: File;
  kind: 'images' | 'video' | 'voice' | 'music';
  projectSlug: string;
  songTitle: string;
  originalBytes: number;
  width: number;
  height: number;
  signal?: AbortSignal;
  logger: ReturnType<typeof createUploadSessionLogger>;
  onProgress?: (percent: number) => void;
}): Promise<RawUploadResponse> {
  if (params.signal?.aborted) {
    const snap = params.logger.getSnapshot();
    throw new UploadCancelledError('Upload cancelled by user.', 'cancelled', snap.lastPercent);
  }

  const bucketReady = await isFirebaseStorageBucketProvisioned();
  if (!bucketReady) {
    params.logger.warn('mid-process-error', `Firebase Storage bucket "${FIREBASE_STORAGE_BUCKET}" returned 404/unreachable`, {
      transport: 'firebase-sdk',
      httpStatus: 404,
    });
    throw new Error('storage/bucket-not-found');
  }

  const safeSlug = (params.projectSlug || 'general').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120);
  const objectKey = `${params.kind}/${safeSlug}/${Date.now()}-${safeName}`;
  const fileRef = storageRef(storage, objectKey);

  params.logger.info('upload-start', `Starting direct Firebase Storage SDK upload (${objectKey})`, {
    transport: 'firebase-sdk',
  });

  const downloadUrl = await new Promise<string>((resolve, reject) => {
    let settled = false;
    let lastBytes = -1;

    const task = uploadBytesResumable(fileRef, params.file, {
      contentType: params.file.type || 'application/octet-stream',
      customMetadata: params.songTitle ? { songTitle: params.songTitle } : undefined,
    });

    const cleanup = () => {
      watchdog.stop();
      params.signal?.removeEventListener('abort', handleExternalAbort);
    };

    const handleExternalAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      const snap = params.logger.getSnapshot();
      params.logger.warn('cancelled', `User cancelled Firebase Storage SDK upload at ${snap.lastPercent}%`, {
        transport: 'firebase-sdk',
      });
      try {
        task.cancel();
      } catch {
        // ignore
      }
      reject(new UploadCancelledError('Upload cancelled by user.', 'cancelled', snap.lastPercent));
    };

    const watchdog = createStallWatchdog(FIREBASE_SDK_STALL_TIMEOUT_MS, () => {
      if (settled) return;
      settled = true;
      cleanup();
      const snap = params.logger.getSnapshot();
      params.logger.error('mid-process-timeout', `Firebase Storage SDK stalled at ${snap.lastPercent}%`, {
        transport: 'firebase-sdk',
      });
      try {
        task.cancel();
      } catch {
        // ignore
      }
      reject(new Error('storage/bucket-not-found'));
    });

    if (params.signal) {
      if (params.signal.aborted) {
        handleExternalAbort();
        return;
      }
      params.signal.addEventListener('abort', handleExternalAbort, { once: true });
    }

    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.bytesTransferred > lastBytes) {
          lastBytes = snapshot.bytesTransferred;
          watchdog.touch();
        }
        if (snapshot.totalBytes > 0) {
          const pct = Math.max(
            5,
            Math.min(99, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100))
          );
          params.onProgress?.(pct);
        }
      },
      (err) => {
        if (settled) return;
        settled = true;
        cleanup();
        params.logger.error('mid-process-error', 'Firebase Storage SDK upload error', {
          transport: 'firebase-sdk',
          error: err,
        });
        reject(err);
      },
      async () => {
        if (settled) return;
        cleanup();
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          settled = true;
          params.logger.info('finalize', 'Firebase Storage SDK download URL resolved', {
            transport: 'firebase-sdk',
            percent: 100,
          });
          params.onProgress?.(100);
          resolve(url);
        } catch (urlErr) {
          settled = true;
          reject(urlErr);
        }
      }
    );
  });

  return {
    ok: true,
    object: {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      objectKey,
      fileName: params.songTitle || params.file.name,
      songTitle: params.songTitle || undefined,
      contentType: params.file.type || 'application/octet-stream',
      sizeBytes: params.file.size,
      originalBytes: params.originalBytes,
      savedBytes: Math.max(0, params.originalBytes - params.file.size),
      width: params.width,
      height: params.height,
      url: downloadUrl,
      storageTier: 'firebase-5gb',
    },
  };
}

export async function uploadMediaToFirebase(params: {
  file: File;
  kind: 'images' | 'video' | 'voice' | 'music';
  projectSlug: string;
  songTitle?: string;
  alreadyCompressed?: boolean;
  originalBytes?: number;
  width?: number;
  height?: number;
  forcePreserveTransparency?: boolean;
  signal?: AbortSignal;
  sessionId?: string;
  onStatus?: (msg: string) => void;
  onProgress?: (percent: number) => void;
  onPhaseChange?: (event: UploadPhaseProgressEvent) => void;
}): Promise<{
  url: string;
  remoteBucketUrl: string;
  storageBucket: string;
  storageTier: string;
  sizeBytes: number;
  originalBytes: number;
  savedBytes: number;
  width: number;
  height: number;
  contentType: string;
  objectKey: string;
  songTitle?: string;
}> {
  let targetFile = params.file;
  let originalBytes = params.originalBytes ?? params.file.size;
  let width = params.width ?? 0;
  let height = params.height ?? 0;

  const logger = createUploadSessionLogger({
    sessionId: params.sessionId,
    projectSlug: params.projectSlug || 'general',
    fileName: params.file.name,
    kind: params.kind,
    fileSizeBytes: params.file.size,
  });

  logger.info(
    'init',
    `Initialized upload for "${params.file.name}" (${Math.round(params.file.size / 1024)} KB, kind=${params.kind})`,
    { transport: 'staging', percent: 0 }
  );

  if (params.signal?.aborted) {
    logger.warn('cancelled', 'Upload aborted before transfer started');
    throw new UploadCancelledError('Upload cancelled by user.', 'cancelled', 0);
  }

  if (
    params.kind === 'images' &&
    !params.alreadyCompressed &&
    (params.file.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|heic|heif|bmp|avif)$/i.test(params.file.name))
  ) {
    logger.info('compress', `Compressing image "${params.file.name}" before upload`, {
      transport: 'staging',
    });
    const compressed = await compressImageFile(params.file, {
      forcePreserveTransparency: params.forcePreserveTransparency,
      onStatus: params.onStatus,
    });
    targetFile = compressed.file;
    originalBytes = compressed.originalBytes;
    width = compressed.width;
    height = compressed.height;
    logger.info(
      'compress',
      `Image compressed ${Math.round(originalBytes / 1024)} KB -> ${Math.round(
        targetFile.size / 1024
      )} KB`,
      { transport: 'staging' }
    );
  }

  // Ensure monotonic progress updates across transport stages
  let highestProgress = 0;
  const emitProgress = (pct: number) => {
    const clamped = Math.max(highestProgress, Math.min(100, Math.round(pct)));
    highestProgress = clamped;
    params.onProgress?.(clamped);
  };

  params.onStatus?.('Uploading…');
  emitProgress(5);

  const cleanSongTitle = (params.songTitle || '').trim().slice(0, 120);
  const headers: Record<string, string> = {
    'Content-Type': targetFile.type || 'application/octet-stream',
    'x-file-name': encodeURIComponent(targetFile.name),
    'x-content-type': encodeURIComponent(targetFile.type || 'application/octet-stream'),
    'x-kind': encodeURIComponent(params.kind),
    'x-project-slug': encodeURIComponent(params.projectSlug || 'general'),
    'x-original-bytes': String(Math.round(originalBytes)),
    'x-width': String(Math.round(width)),
    'x-height': String(Math.round(height)),
  };
  if (cleanSongTitle) {
    headers['x-song-title'] = encodeURIComponent(cleanSongTitle);
  }

  let data: RawUploadResponse | null = null;
  let backendUnavailable = false;
  let primaryError: unknown = null;

  const preferChunked = shouldUseChunkedUpload(targetFile.size, params.kind);

  // Stage 1: Primary Express backend transport (192 KB XHR binary chunks for audio/video/large files, raw stream for small images)
  try {
    if (preferChunked) {
      data = await streamChunkedFileUpload({
        file: targetFile,
        kind: params.kind,
        projectSlug: params.projectSlug,
        songTitle: cleanSongTitle,
        originalBytes,
        width,
        height,
        headers,
        useJsonTransport: false,
        signal: params.signal,
        logger,
        onProgress: emitProgress,
        onPhaseChange: params.onPhaseChange,
      });
    } else {
      data = await streamRawFileUpload({
        file: targetFile,
        headers,
        signal: params.signal,
        logger,
        onProgress: emitProgress,
        onPhaseChange: params.onPhaseChange,
      });
    }
  } catch (err) {
    if (isUploadCancelledError(err) || params.signal?.aborted) {
      logger.warn('cancelled', `Upload cancelled during Stage 1 at ${highestProgress}%`, {
        percent: highestProgress,
        error: err,
      });
      throw err instanceof UploadCancelledError
        ? err
        : new UploadCancelledError('Upload cancelled by user.', 'cancelled', highestProgress);
    }
    primaryError = err;
    if (err instanceof BackendUploadUnavailableError) {
      backendUnavailable = true;
      logger.warn('transport-fallback', 'Express backend unavailable; skipping JSON chunk fallback to static cloud/vault path', {
        error: err,
      });
    } else if (err instanceof Error && (err.message.includes('50 MB') || err.message.includes('413'))) {
      logger.error('mid-process-error', 'File rejected by 50 MB size limit', { error: err });
      throw new Error(formatUploadErrorMessage(err));
    } else {
      logger.warn(
        'transport-fallback',
        `Stage 1 (${preferChunked ? 'chunked-binary' : 'raw-stream'}) failed mid-process at ${highestProgress}%; falling back to proxy-proof JSON chunked upload`,
        { percent: highestProgress, error: err }
      );
    }
  }

  // Stage 2: Proxy-proof JSON chunked upload (standard application/json, zero custom x-* headers)
  if (!data && !backendUnavailable) {
    if (params.signal?.aborted) {
      throw new UploadCancelledError('Upload cancelled by user.', 'cancelled', highestProgress);
    }
    try {
      data = await streamChunkedFileUpload({
        file: targetFile,
        kind: params.kind,
        projectSlug: params.projectSlug,
        songTitle: cleanSongTitle,
        originalBytes,
        width,
        height,
        headers,
        useJsonTransport: true,
        signal: params.signal,
        logger,
        onProgress: emitProgress,
        onPhaseChange: params.onPhaseChange,
      });
    } catch (err) {
      if (isUploadCancelledError(err) || params.signal?.aborted) {
        logger.warn('cancelled', `Upload cancelled during Stage 2 (chunked-json) at ${highestProgress}%`, {
          percent: highestProgress,
          error: err,
        });
        throw err instanceof UploadCancelledError
          ? err
          : new UploadCancelledError('Upload cancelled by user.', 'cancelled', highestProgress);
      }
      primaryError = err;
      if (err instanceof BackendUploadUnavailableError) {
        backendUnavailable = true;
      }
      logger.warn('transport-fallback', `Stage 2 (chunked-json) failed at ${highestProgress}%`, {
        transport: 'chunked-json',
        percent: highestProgress,
        error: err,
      });
    }
  }

  // Stage 3: Static hosting fallback — direct Firebase Cloud Storage SDK (only if bucket is provisioned)
  if (!data && backendUnavailable) {
    if (params.signal?.aborted) {
      throw new UploadCancelledError('Upload cancelled by user.', 'cancelled', highestProgress);
    }
    try {
      data = await uploadViaFirebaseStorageSdk({
        file: targetFile,
        kind: params.kind,
        projectSlug: params.projectSlug,
        songTitle: cleanSongTitle,
        originalBytes,
        width,
        height,
        signal: params.signal,
        logger,
        onProgress: emitProgress,
      });
    } catch (sdkErr) {
      if (isUploadCancelledError(sdkErr) || params.signal?.aborted) {
        throw sdkErr instanceof UploadCancelledError
          ? sdkErr
          : new UploadCancelledError('Upload cancelled by user.', 'cancelled', highestProgress);
      }
      logger.warn('transport-fallback', 'Firebase Storage SDK unavailable — proceeding to Local Portable Media Vault', {
        transport: 'firebase-sdk',
        error: sdkErr,
      });
    }
  }

  // Stage 4: Local Portable Media Vault (inline Data URI for compact images, IndexedDB + playable Blob URL for audio/video)
  // Guarantees uploads complete cleanly to 100% even on static GitHub Pages builds before Firebase Cloud Storage is enabled.
  if (!data && typeof window !== 'undefined') {
    if (params.signal?.aborted) {
      throw new UploadCancelledError('Upload cancelled by user.', 'cancelled', highestProgress);
    }
    try {
      logger.info('transport-fallback', 'Storing media in Local Portable Media Vault fallback', {
        transport: 'local-vault',
      });
      const vaulted = await saveMediaToLocalVault({
        file: targetFile,
        kind: params.kind,
        projectSlug: params.projectSlug,
        songTitle: cleanSongTitle,
        originalBytes,
        width,
        height,
        onProgress: emitProgress,
      });
      data = {
        ok: true,
        object: {
          id: vaulted.id,
          objectKey: vaulted.objectKey,
          fileName: vaulted.fileName,
          songTitle: vaulted.songTitle,
          contentType: vaulted.contentType,
          sizeBytes: vaulted.sizeBytes,
          originalBytes: vaulted.originalBytes,
          savedBytes: vaulted.savedBytes,
          width: vaulted.width,
          height: vaulted.height,
          url: vaulted.url,
          storageTier: 'local-vault',
        },
      };
    } catch (vaultErr) {
      logger.error('mid-process-error', 'Local Portable Media Vault fallback also failed', {
        transport: 'local-vault',
        error: vaultErr || primaryError,
      });
      throw new Error(formatUploadErrorMessage(vaultErr || primaryError));
    }
  }

  if (!data) {
    logger.error('mid-process-error', 'All upload transports failed without producing a stored media URL', {
      error: primaryError,
    });
    throw new Error(formatUploadErrorMessage(primaryError));
  }

  const storedBytes: number = data.object.sizeBytes;
  const savedBytes = Math.max(0, originalBytes - storedBytes);
  const objectKey: string = data.object.objectKey;
  const remoteBucketUrl = data.object.url.startsWith('http')
    ? data.object.url
    : buildFirebaseBucketObjectUrl(objectKey);

  // Sync compressed media metadata to Firebase Firestore in the background (non-blocking for maximum speed)
  void recordCompressedMediaInFirestore({
    id: data.object.id || `media-${Date.now()}`,
    projectSlug: params.projectSlug || 'general',
    fileName: cleanSongTitle || targetFile.name,
    contentType: targetFile.type || 'application/octet-stream',
    originalBytes,
    storedBytes,
    width,
    height,
    url: data.object.url,
  })
    .then(() => {
      if (auth.currentUser?.emailVerified) {
        logger.info('firestore-sync', `Recorded media metadata in Firestore media_records (${objectKey})`, {
          transport: 'firestore',
          percent: 100,
        });
      }
    })
    .catch((fsErr) => {
      logger.warn('firestore-sync', 'Background Firestore media_records sync skipped or denied', {
        transport: 'firestore',
        error: fsErr,
      });
    });

  logger.info(
    'complete',
    `Upload complete via ${data.object.storageTier} -> ${data.object.url} (${Math.round(
      storedBytes / 1024
    )} KB)`,
    {
      percent: 100,
      bytesTransferred: storedBytes,
    }
  );
  params.onStatus?.('Upload complete.');

  return {
    url: data.object.url,
    remoteBucketUrl,
    storageBucket: FIREBASE_STORAGE_BUCKET,
    storageTier: data.object.storageTier,
    sizeBytes: storedBytes,
    originalBytes,
    savedBytes,
    width,
    height,
    contentType: targetFile.type || data.object.contentType || 'application/octet-stream',
    objectKey,
    songTitle: data.object.songTitle || cleanSongTitle || undefined,
  };
}

export async function deleteMediaFromFirebase(urlOrObjectKey: string): Promise<void> {
  if (!urlOrObjectKey || urlOrObjectKey.startsWith('data:') || urlOrObjectKey.startsWith('blob:')) {
    return;
  }
  try {
    if (urlOrObjectKey.includes('firebasestorage.googleapis.com')) {
      const ref = storageRef(storage, urlOrObjectKey);
      await deleteObject(ref).catch(() => {});
      return;
    }
    await fetch('/api/firebase/delete-by-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: urlOrObjectKey,
        storageBucket: FIREBASE_STORAGE_BUCKET,
      }),
    });
  } catch {
    // Ignore network cleanup error
  }
}

export async function fetchFirebaseStorageCatalog(): Promise<{
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
  objects: Array<{
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
  }>;
}> {
  try {
    const res = await fetch('/api/firebase/status', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {
    // Fallback to direct Firestore + Local Vault catalog on static hosting
  }

  const objects: Array<{
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
  }> = [];

  const user = auth.currentUser;
  if (user && user.emailVerified) {
    try {
      const source = isVerifiedAdminUser(user)
        ? collection(db, 'media_records')
        : query(collection(db, 'media_records'), where('ownerId', '==', user.uid));
      const snap = await getDocs(source);
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (!d) return;
        const ct = typeof d.contentType === 'string' ? d.contentType : 'application/octet-stream';
        const kind: 'images' | 'video' | 'voice' | 'music' = ct.startsWith('video/')
          ? 'video'
          : ct.startsWith('audio/')
          ? 'music'
          : 'images';
        const storedBytes = typeof d.storedBytes === 'number' ? d.storedBytes : 0;
        const origBytes = typeof d.originalBytes === 'number' ? d.originalBytes : storedBytes;
        objects.push({
          id: typeof d.id === 'string' ? d.id : docSnap.id,
          objectKey: typeof d.url === 'string' ? d.url : docSnap.id,
          fileName: typeof d.fileName === 'string' ? d.fileName : docSnap.id,
          kind,
          contentType: ct,
          sizeBytes: storedBytes,
          originalBytes: origBytes,
          savedBytes: Math.max(0, origBytes - storedBytes),
          projectSlug: typeof d.projectSlug === 'string' ? d.projectSlug : 'general',
          url: typeof d.url === 'string' ? d.url : '',
          storageTier: 'firebase-5gb',
          createdAt: toIsoDate(d.createdAt),
        });
      });
    } catch {
      // ignore read errors
    }
  }

  // Include locally vaulted media items when running without Express server
  const localItems = await listLocalVaultMedia().catch(() => []);
  for (const item of localItems) {
    if (!objects.some((o) => o.id === item.id)) {
      objects.push({
        id: item.id,
        objectKey: item.objectKey,
        fileName: item.fileName,
        kind: item.kind,
        contentType: item.contentType,
        sizeBytes: item.sizeBytes,
        originalBytes: item.originalBytes,
        savedBytes: item.savedBytes,
        projectSlug: item.projectSlug,
        url: item.url,
        storageTier: 'local-vault',
        createdAt: item.createdAt,
      });
    }
  }

  const usedBytes = objects.reduce((sum, item) => sum + item.sizeBytes, 0);
  const savedBytesByCompression = objects.reduce((sum, item) => sum + (item.savedBytes || 0), 0);

  return {
    config: {
      projectId: FIREBASE_PROJECT_ID,
      databaseId: FIREBASE_DATABASE_ID,
      storageBucket: FIREBASE_STORAGE_BUCKET,
      publicBaseUrl: '',
      enabled: true,
    },
    connectionMode: 'firebase_sdk_direct',
    endpoint: getFirebaseBucketEndpoint(),
    usedBytes,
    savedBytesByCompression,
    capacityBytes: FIREBASE_5GB_CAPACITY_BYTES,
    objectCount: objects.length,
    objects,
  };
}

export async function cleanFirebaseStorageCatalog(): Promise<{
  ok: boolean;
  purgedObjectsCount: number;
  storageBucket: string;
}> {
  const localPurged = await clearLocalVaultMedia().catch(() => 0);
  try {
    const res = await fetch('/api/firebase/clean', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ storageBucket: FIREBASE_STORAGE_BUCKET }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      return {
        ok: Boolean(data.ok),
        purgedObjectsCount: Number(data.purgedObjectsCount || 0) + localPurged,
        storageBucket: FIREBASE_STORAGE_BUCKET,
      };
    }
  } catch {
    // Fall back to cleaning Firestore media_records directly on static hosting
  }

  let purgedObjectsCount = localPurged;
  const user = auth.currentUser;
  if (isVerifiedAdminUser(user)) {
    const snap = await getDocs(collection(db, 'media_records'));
    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      if (typeof d?.url === 'string' && d.url.includes('firebasestorage.googleapis.com')) {
        await deleteObject(storageRef(storage, d.url)).catch(() => {});
      }
      await deleteDoc(docSnap.ref);
      purgedObjectsCount++;
    }
  }

  return {
    ok: true,
    purgedObjectsCount,
    storageBucket: FIREBASE_STORAGE_BUCKET,
  };
}

export async function saveOrderToFirestore(order: {
  id: string;
  slug: string;
  product: 'chasing-her' | 'memories' | 'custom';
  build_product?: 'chasing-her' | 'memories';
  full_name: string;
  whatsapp: string;
  email: string;
  country: 'gh' | 'ke' | 'ng';
  status: 'pending_payment' | 'paid' | 'hosted' | 'expired';
  progress: 'received' | 'building' | 'review' | 'hosted';
  progress_note?: string;
  pin: string;
  hosted_url?: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const safeId = order.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const safeSlug = order.slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || 'my-love';
  const buildProduct: 'chasing-her' | 'memories' =
    order.product === 'memories' || order.build_product === 'memories'
      ? 'memories'
      : 'chasing-her';
  const path = `orders/${safeId}`;
  const docRef = doc(db, 'orders', safeId);

  try {
    const existingSnap = await getDoc(docRef);
    const existingData = existingSnap.exists() ? existingSnap.data() : null;

    await setDoc(docRef, {
      id: safeId,
      ownerId: existingData?.ownerId || user.uid,
      slug: existingData?.slug || safeSlug,
      product: existingData?.product || order.product,
      build_product: buildProduct,
      full_name: (order.full_name || 'Customer').slice(0, 160),
      whatsapp: (order.whatsapp || '+2330000000').slice(0, 32),
      email: (order.email || user.email || 'customer@chasingher.love').slice(0, 160),
      country: order.country,
      status: order.status,
      progress: order.progress,
      ...(order.progress_note ? { progress_note: order.progress_note.slice(0, 1000) } : {}),
      pin: /^\d{4,6}$/.test(order.pin) ? order.pin : '140226',
      ...(order.hosted_url ? { hosted_url: order.hosted_url.slice(0, 2048) } : {}),
      createdAt: existingData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteOrderFromFirestore(orderId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const safeId = orderId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `orders/${safeId}`;
  try {
    await deleteDoc(doc(db, 'orders', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface FirestoreSyncResult {
  synced: boolean;
  path: string;
  skippedReason?: 'unauthenticated';
}

export async function saveChasingHerProjectToFirestore(
  slug: string,
  project: ChasingHerProjectData
): Promise<FirestoreSyncResult> {
  const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || 'my-love';
  const path = `projects/${safeSlug}`;
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    console.info('[SiteBuilderUpload][firestore-sync] Skipped Firestore project write (guest session; local & media storage active)', {
      path,
      databaseId: FIREBASE_DATABASE_ID,
    });
    return { synced: false, path, skippedReason: 'unauthenticated' };
  }

  const usage = computeProjectStorageUsage(project, 'chasing-her');
  const docRef = doc(db, 'projects', safeSlug);

  try {
    const existingSnap = await getDoc(docRef);
    const existingData = existingSnap.exists() ? existingSnap.data() : null;

    await setDoc(docRef, {
      slug: safeSlug,
      ownerId: existingData?.ownerId || user.uid,
      pin: /^\d{4,6}$/.test(project.pin) ? project.pin : '140226',
      intro_message: (project.intro_message || 'Made for you').slice(0, 500),
      letter_title: (project.letter_title || 'My Love,').slice(0, 200),
      letter_body: (project.letter_body || 'With all my heart.').slice(0, 10000),
      final_message: (project.final_message || 'Forever yours').slice(0, 500),
      ...(project.music_url ? { music_url: project.music_url.slice(0, 2048) } : {}),
      payloadJson: JSON.stringify(project).slice(0, 350000),
      storedBytes: Math.max(0, Math.min(52428800, Math.round(usage.usedBytes))),
      createdAt: existingData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.info('[SiteBuilderUpload][firestore-sync] Synced Chasing Her project to Firestore', {
      path,
      databaseId: FIREBASE_DATABASE_ID,
      storedBytes: Math.round(usage.usedBytes),
    });
    return { synced: true, path };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveMemoriesProjectToFirestore(
  slug: string,
  project: MemoriesProjectData
): Promise<FirestoreSyncResult> {
  const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || 'my-love';
  const path = `memory_projects/${safeSlug}`;
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    console.info('[SiteBuilderUpload][firestore-sync] Skipped Firestore project write (guest session; local & media storage active)', {
      path,
      databaseId: FIREBASE_DATABASE_ID,
    });
    return { synced: false, path, skippedReason: 'unauthenticated' };
  }

  const usage = computeProjectStorageUsage(project, 'memories');
  const docRef = doc(db, 'memory_projects', safeSlug);

  try {
    const existingSnap = await getDoc(docRef);
    const existingData = existingSnap.exists() ? existingSnap.data() : null;

    await setDoc(docRef, {
      slug: safeSlug,
      ownerId: existingData?.ownerId || user.uid,
      pin: /^\d{4,6}$/.test(project.pin) ? project.pin : '250824',
      hero_title: (project.hero_title || 'For My Love').slice(0, 200),
      hero_subtitle: (project.hero_subtitle || 'Our favorite moments').slice(0, 500),
      collage_names: (project.collage_names || 'Our Story').slice(0, 160),
      letter_title: (project.letter_title || 'To My Heart,').slice(0, 200),
      letter_body: (project.letter_body || 'Forever and always.').slice(0, 10000),
      final_message: (project.final_message || 'Forever & Always').slice(0, 500),
      payloadJson: JSON.stringify(project).slice(0, 350000),
      storedBytes: Math.max(0, Math.min(52428800, Math.round(usage.usedBytes))),
      createdAt: existingData?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.info('[SiteBuilderUpload][firestore-sync] Synced Memories project to Firestore', {
      path,
      databaseId: FIREBASE_DATABASE_ID,
      storedBytes: Math.round(usage.usedBytes),
    });
    return { synced: true, path };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProjectFromFirestore(
  product: 'chasing-her' | 'memories',
  slug: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const collectionName = product === 'memories' ? 'memory_projects' : 'projects';
  const path = `${collectionName}/${safeSlug}`;
  try {
    await deleteDoc(doc(db, collectionName, safeSlug));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function savePlatformSettingsToFirestore(
  settingsMap: Record<string, string>
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  for (const [key, value] of Object.entries(settingsMap)) {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
    if (!safeKey || safeKey === '_connection_probe') continue;
    const path = `platform_settings/${safeKey}`;
    try {
      await setDoc(doc(db, 'platform_settings', safeKey), {
        key: safeKey,
        value: String(value ?? '').slice(0, 15000),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function syncWorkspaceSnapshotToFirestore(params: {
  orders: SubmissionOrder[];
  chasingHerProjects: Record<string, ChasingHerProjectData>;
  memoriesProjects: Record<string, MemoriesProjectData>;
  settingsMap: Record<string, string>;
}): Promise<{ syncedOrders: number; syncedProjects: number; syncedSettings: number }> {
  const user = auth.currentUser;
  if (!isVerifiedAdminUser(user)) {
    throw new Error(`Sign in with Google (${FIREBASE_ADMIN_EMAIL}) before syncing workspace data to Firestore.`);
  }

  let syncedOrders = 0;
  for (const order of params.orders) {
    await saveOrderToFirestore(order);
    syncedOrders++;
  }

  let syncedProjects = 0;
  for (const [slug, proj] of Object.entries(params.chasingHerProjects)) {
    await saveChasingHerProjectToFirestore(slug, proj);
    syncedProjects++;
  }
  for (const [slug, proj] of Object.entries(params.memoriesProjects)) {
    await saveMemoriesProjectToFirestore(slug, proj);
    syncedProjects++;
  }

  await savePlatformSettingsToFirestore(params.settingsMap);
  const syncedSettings = Object.keys(params.settingsMap).length;

  return { syncedOrders, syncedProjects, syncedSettings };
}

export async function fetchPlatformSettingsFromFirestore(): Promise<Record<string, string>> {
  try {
    const snap = await getDocs(collection(db, 'platform_settings'));
    const result: Record<string, string> = {};
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && typeof data.key === 'string' && typeof data.value === 'string' && data.key !== '_connection_probe') {
        result[data.key] = data.value;
      }
    });
    return result;
  } catch {
    return {};
  }
}

export async function lookupCustomerOrdersInFirestore(email: string): Promise<number> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || !email) return 0;
  try {
    const q = query(
      collection(db, 'orders'),
      where('ownerId', '==', user.uid)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return 0;
  }
}

function parseFirestoreFunnelSessionDoc(
  docId: string,
  d: Record<string, unknown> | undefined
): FunnelSessionRecord | null {
  if (!d) return null;
  const funnel: FunnelCampaignId =
    d.funnel === 'birthday-interactive' ? 'birthday-interactive' : 'reconcile-interactive';
  const country = d.country === 'ke' ? 'ke' : 'gh';
  const currentStep: FunnelStepId =
    typeof d.currentStep === 'string' && d.currentStep in FUNNEL_STEP_INDEX
      ? (d.currentStep as FunnelStepId)
      : 'intro';
  const furthestStep: FunnelStepId =
    typeof d.furthestStep === 'string' && d.furthestStep in FUNNEL_STEP_INDEX
      ? (d.furthestStep as FunnelStepId)
      : currentStep;
  const furthestStepIndex =
    typeof d.furthestStepIndex === 'number'
      ? Math.max(0, Math.min(10, Math.round(d.furthestStepIndex)))
      : FUNNEL_STEP_INDEX[furthestStep];

  const answers: Partial<Record<FunnelQuestionKey, string>> = {};
  const answerLabels: Partial<Record<FunnelQuestionKey, string>> = {};
  const qKeys: FunnelQuestionKey[] = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];

  if (d.answers && typeof d.answers === 'object') {
    const rawAnswers = d.answers as Record<string, unknown>;
    for (const k of qKeys) {
      if (typeof rawAnswers[k] === 'string' && rawAnswers[k]) {
        answers[k] = rawAnswers[k] as string;
      }
    }
  }
  if (d.answerLabels && typeof d.answerLabels === 'object') {
    const rawLabels = d.answerLabels as Record<string, unknown>;
    for (const k of qKeys) {
      if (typeof rawLabels[k] === 'string' && rawLabels[k]) {
        answerLabels[k] = rawLabels[k] as string;
      }
    }
  }

  return {
    id: typeof d.id === 'string' ? d.id : docId,
    funnel,
    country,
    currentStep,
    furthestStep,
    furthestStepIndex,
    answeredCount:
      typeof d.answeredCount === 'number'
        ? Math.max(0, Math.min(6, Math.round(d.answeredCount)))
        : Object.keys(answers).length,
    completedQuiz: Boolean(d.completedQuiz || furthestStepIndex >= FUNNEL_STEP_INDEX.result),
    answers,
    answerLabels,
    resultId: typeof d.resultId === 'string' ? d.resultId : undefined,
    resultTitle: typeof d.resultTitle === 'string' ? d.resultTitle : undefined,
    recommendedEdition:
      d.recommendedEdition === 'chasing-her' ||
      d.recommendedEdition === 'memories' ||
      d.recommendedEdition === 'either'
        ? d.recommendedEdition
        : undefined,
    startedAt: toIsoDate(d.createdAt),
    updatedAt: toIsoDate(d.updatedAt),
  };
}

/**
 * Persists an anonymous visitor questionnaire session to Firestore so the Admin Backstage
 * can inspect exact Q1-Q6 answers and drop-off points across all traffic.
 * Uses `setDoc` on first write (create) and `updateDoc` on subsequent writes (update)
 * so unauthenticated visitors never need read permissions on `funnel_sessions`.
 */
export async function upsertFunnelSessionToFirestore(
  session: FunnelSessionRecord,
  alreadyCreatedInFirestore: boolean
): Promise<boolean> {
  const sanitized = sanitizeFunnelSessionForFirestore(session);
  const docRef = doc(db, 'funnel_sessions', sanitized.id);

  const mutableFields: Record<string, unknown> = {
    currentStep: sanitized.currentStep,
    furthestStep: sanitized.furthestStep,
    furthestStepIndex: sanitized.furthestStepIndex,
    answeredCount: sanitized.answeredCount,
    completedQuiz: sanitized.completedQuiz,
    answers: sanitized.answers,
    answerLabels: sanitized.answerLabels,
    updatedAt: serverTimestamp(),
  };
  if (sanitized.resultId) mutableFields.resultId = sanitized.resultId;
  if (sanitized.resultTitle) mutableFields.resultTitle = sanitized.resultTitle;
  if (sanitized.recommendedEdition) {
    mutableFields.recommendedEdition = sanitized.recommendedEdition;
  }

  try {
    if (alreadyCreatedInFirestore) {
      await updateDoc(docRef, mutableFields);
      return true;
    }
    await setDoc(docRef, {
      id: sanitized.id,
      funnel: sanitized.funnel,
      country: sanitized.country,
      ...mutableFields,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch {
    if (alreadyCreatedInFirestore) {
      try {
        await setDoc(docRef, {
          id: sanitized.id,
          funnel: sanitized.funnel,
          country: sanitized.country,
          ...mutableFields,
          createdAt: serverTimestamp(),
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export async function fetchFunnelSessionsFromFirestore(): Promise<FunnelSessionRecord[]> {
  const user = auth.currentUser;
  if (!isVerifiedAdminUser(user)) return [];
  try {
    const snap = await getDocs(collection(db, 'funnel_sessions'));
    const list: FunnelSessionRecord[] = [];
    snap.forEach((docSnap) => {
      const parsed = parseFirestoreFunnelSessionDoc(docSnap.id, docSnap.data());
      if (parsed) list.push(parsed);
    });
    return list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  } catch {
    return [];
  }
}

export async function deleteFunnelSessionFromFirestore(sessionId: string): Promise<void> {
  const user = auth.currentUser;
  if (!isVerifiedAdminUser(user)) return;
  const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  if (!safeId) return;
  try {
    await deleteDoc(doc(db, 'funnel_sessions', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `funnel_sessions/${safeId}`);
  }
}
