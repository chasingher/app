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
import { getStorage, ref as storageRef } from 'firebase/storage';
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

  // 4. Storage Bucket & Upload API Health Check
  const apiStart = nowMs();
  try {
    const res = await fetch('/api/firebase/status');
    const apiMs = Math.max(1, Math.round(nowMs() - apiStart));
    if (!res.ok) {
      checks.push({
        id: 'storage_api',
        label: 'Storage Bucket & Upload API',
        status: 'fail',
        latencyMs: apiMs,
        detail: `Storage status endpoint returned HTTP ${res.status}.`,
      });
    } else {
      const payload = await res.json();
      const count = Array.isArray(payload.objects) ? payload.objects.length : 0;
      checks.push({
        id: 'storage_api',
        label: 'Storage Bucket & Upload API',
        status: 'pass',
        latencyMs: apiMs,
        detail: `Bucket "${FIREBASE_STORAGE_BUCKET}" ready (${count} active media file${count === 1 ? '' : 's'}, ${apiMs} ms).`,
      });
    }
  } catch (error) {
    const apiMs = Math.max(1, Math.round(nowMs() - apiStart));
    checks.push({
      id: 'storage_api',
      label: 'Storage Bucket & Upload API',
      status: 'fail',
      latencyMs: apiMs,
      detail: `Could not reach upload API: ${error instanceof Error ? error.message : String(error)}`,
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

function streamRawFileUpload(params: {
  file: File;
  headers: Record<string, string>;
  onProgress?: (percent: number) => void;
}): Promise<RawUploadResponse> {
  if (typeof XMLHttpRequest === 'undefined') {
    return fetch('/api/firebase/upload-raw', {
      method: 'POST',
      headers: params.headers,
      body: params.file,
    }).then(async (res) => {
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Firebase media upload failed');
      }
      params.onProgress?.(100);
      return res.json() as Promise<RawUploadResponse>;
    });
  }

  return new Promise<RawUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/firebase/upload-raw', true);
    for (const [key, val] of Object.entries(params.headers)) {
      xhr.setRequestHeader(key, val);
    }

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) {
        const pct = Math.min(99, Math.round((ev.loaded / ev.total) * 100));
        params.onProgress?.(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as RawUploadResponse;
          params.onProgress?.(100);
          resolve(parsed);
        } catch {
          reject(new Error('Invalid upload response from server'));
        }
      } else {
        try {
          const errBody = JSON.parse(xhr.responseText);
          reject(new Error(errBody.error || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error while uploading media'));
    xhr.onabort = () => reject(new Error('Upload was cancelled'));
    xhr.send(params.file);
  });
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
  onStatus?: (msg: string) => void;
  onProgress?: (percent: number) => void;
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

  if (
    params.kind === 'images' &&
    !params.alreadyCompressed &&
    (params.file.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|heic|heif|bmp|avif)$/i.test(params.file.name))
  ) {
    const compressed = await compressImageFile(params.file, {
      forcePreserveTransparency: params.forcePreserveTransparency,
      onStatus: params.onStatus,
    });
    targetFile = compressed.file;
    originalBytes = compressed.originalBytes;
    width = compressed.width;
    height = compressed.height;
  }

  params.onStatus?.('Uploading…');
  params.onProgress?.(5);

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

  const data = await streamRawFileUpload({
    file: targetFile,
    headers,
    onProgress: params.onProgress,
  });

  const storedBytes: number = data.object.sizeBytes;
  const savedBytes = Math.max(0, originalBytes - storedBytes);
  const objectKey: string = data.object.objectKey;
  const remoteBucketUrl = buildFirebaseBucketObjectUrl(objectKey);

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
  }).catch(() => {
    // Non-blocking if user is not signed in with Firebase Auth
  });

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

export async function cleanFirebaseStorageCatalog(): Promise<{
  ok: boolean;
  purgedObjectsCount: number;
  storageBucket: string;
}> {
  const res = await fetch('/api/firebase/clean', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storageBucket: FIREBASE_STORAGE_BUCKET }),
  });
  if (!res.ok) {
    throw new Error('Failed to clean Firebase storage catalog');
  }
  const data = await res.json();
  return {
    ok: Boolean(data.ok),
    purgedObjectsCount: Number(data.purgedObjectsCount || 0),
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

export async function saveChasingHerProjectToFirestore(
  slug: string,
  project: ChasingHerProjectData
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || 'my-love';
  const usage = computeProjectStorageUsage(project, 'chasing-her');
  const path = `projects/${safeSlug}`;
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
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveMemoriesProjectToFirestore(
  slug: string,
  project: MemoriesProjectData
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const safeSlug = slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128) || 'my-love';
  const usage = computeProjectStorageUsage(project, 'memories');
  const path = `memory_projects/${safeSlug}`;
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
