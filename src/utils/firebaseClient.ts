import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { getStorage, ref as storageRef } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  ChasingHerProjectData,
  MemoriesProjectData,
  computeProjectStorageUsage,
  buildFirebaseStorageUrl,
  resolveFirebaseStorageEndpoint,
} from './platformLogic';
import { compressImageFile } from './imageCompression';

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId || 'gen-lang-client-0322444571';
export const FIREBASE_DATABASE_ID =
  firebaseConfig.firestoreDatabaseId || 'ai-studio-chasingher-f7a61704-2cdd-4e3c-af0b-e387f983103a';
export const FIREBASE_STORAGE_BUCKET = 'gen-lang-client-0322444571.firebasestorage.app';
export const FIREBASE_STORAGE_GS_URI = `gs://${FIREBASE_STORAGE_BUCKET}`;
export const FIREBASE_5GB_CAPACITY_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB Firebase Free Plan capacity

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

export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// Run startup connectivity validation when running in a browser context
if (typeof window !== 'undefined') {
  testConnection();
}

export async function signInWithGooglePopup() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signOutFirebase() {
  return signOut(auth);
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

function fileToBase64DataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

export async function uploadMediaToFirebase(params: {
  file: File;
  kind: 'images' | 'video' | 'voice' | 'music';
  projectSlug: string;
  alreadyCompressed?: boolean;
  originalBytes?: number;
  width?: number;
  height?: number;
  forcePreserveTransparency?: boolean;
  onStatus?: (msg: string) => void;
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
  const base64Data = await fileToBase64DataUrl(targetFile);

  const res = await fetch('/api/firebase/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: targetFile.name,
      contentType: targetFile.type || 'application/octet-stream',
      kind: params.kind,
      projectSlug: params.projectSlug || 'general',
      storageBucket: FIREBASE_STORAGE_BUCKET,
      originalBytes,
      width,
      height,
      base64Data,
    }),
  });

  if (!res.ok) {
    throw new Error('Firebase media upload failed');
  }
  const data = await res.json();
  const storedBytes: number = data.object.sizeBytes;
  const savedBytes = Math.max(0, originalBytes - storedBytes);
  const objectKey: string = data.object.objectKey;
  const remoteBucketUrl = buildFirebaseBucketObjectUrl(objectKey);

  // Sync compressed media metadata to Firebase Firestore when user is authenticated
  try {
    await recordCompressedMediaInFirestore({
      id: data.object.id || `media-${Date.now()}`,
      projectSlug: params.projectSlug || 'general',
      fileName: targetFile.name,
      contentType: targetFile.type || 'image/webp',
      originalBytes,
      storedBytes,
      width,
      height,
      url: data.object.url,
    });
  } catch {
    // Non-blocking if user is not signed in with Firebase Auth
  }

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
    contentType: targetFile.type || data.object.contentType || 'image/webp',
    objectKey,
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

  try {
    await setDoc(doc(db, 'orders', safeId), {
      id: safeId,
      ownerId: user.uid,
      slug: safeSlug,
      product: order.product,
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
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

  try {
    await setDoc(doc(db, 'projects', safeSlug), {
      slug: safeSlug,
      ownerId: user.uid,
      pin: /^\d{4,6}$/.test(project.pin) ? project.pin : '140226',
      intro_message: (project.intro_message || 'Made for you').slice(0, 500),
      letter_title: (project.letter_title || 'My Love,').slice(0, 200),
      letter_body: (project.letter_body || 'With all my heart.').slice(0, 10000),
      final_message: (project.final_message || 'Forever yours').slice(0, 500),
      ...(project.music_url ? { music_url: project.music_url.slice(0, 2048) } : {}),
      payloadJson: JSON.stringify(project).slice(0, 350000),
      storedBytes: Math.max(0, Math.min(52428800, Math.round(usage.usedBytes))),
      createdAt: serverTimestamp(),
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

  try {
    await setDoc(doc(db, 'memory_projects', safeSlug), {
      slug: safeSlug,
      ownerId: user.uid,
      pin: /^\d{4,6}$/.test(project.pin) ? project.pin : '250824',
      hero_title: (project.hero_title || 'For My Love').slice(0, 200),
      hero_subtitle: (project.hero_subtitle || 'Our favorite moments').slice(0, 500),
      collage_names: (project.collage_names || 'Our Story').slice(0, 160),
      letter_title: (project.letter_title || 'To My Heart,').slice(0, 200),
      letter_body: (project.letter_body || 'Forever and always.').slice(0, 10000),
      final_message: (project.final_message || 'Forever & Always').slice(0, 500),
      payloadJson: JSON.stringify(project).slice(0, 350000),
      storedBytes: Math.max(0, Math.min(52428800, Math.round(usage.usedBytes))),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function savePlatformSettingsToFirestore(
  settingsMap: Record<string, string>
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  for (const [key, value] of Object.entries(settingsMap)) {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
    if (!safeKey) continue;
    const path = `platform_settings/${safeKey}`;
    try {
      await setDoc(doc(db, 'platform_settings', safeKey), {
        key: safeKey,
        value: String(value ?? '').slice(0, 5000),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}

export async function fetchPlatformSettingsFromFirestore(): Promise<Record<string, string>> {
  try {
    const snap = await getDocs(collection(db, 'platform_settings'));
    const result: Record<string, string> = {};
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && typeof data.key === 'string' && typeof data.value === 'string') {
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
