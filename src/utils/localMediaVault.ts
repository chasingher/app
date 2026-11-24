import { isInlineDataUriEligible } from './uploadPipeline';

const DB_NAME = 'chasingher_media_vault_v1';
const STORE_NAME = 'media_blobs';
const DB_VERSION = 1;

export interface LocalVaultMediaRecord {
  id: string;
  objectKey: string;
  fileName: string;
  songTitle?: string;
  kind: 'images' | 'video' | 'voice' | 'music';
  contentType: string;
  sizeBytes: number;
  originalBytes: number;
  savedBytes: number;
  width: number;
  height: number;
  projectSlug: string;
  url: string;
  createdAt: string;
}

interface StoredVaultEntry extends Omit<LocalVaultMediaRecord, 'url'> {
  blob: Blob;
  inlineDataUrl?: string;
}

const activeBlobUrls = new Map<string, string>();

function openVaultDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not encode local media as Data URI.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read selected file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Stores a media file cleanly in browser IndexedDB (and inline Data URI for compact
 * images/voice clips) when both the Express server upload API and external Firebase
 * Cloud Storage bucket are unavailable (for example, static GitHub Pages deployments
 * before Firebase Storage is enabled).
 */
export async function saveMediaToLocalVault(params: {
  file: File;
  kind: 'images' | 'video' | 'voice' | 'music';
  projectSlug: string;
  songTitle?: string;
  originalBytes: number;
  width: number;
  height: number;
  onProgress?: (percent: number) => void;
}): Promise<LocalVaultMediaRecord> {
  params.onProgress?.(45);
  const safeSlug = (params.projectSlug || 'general').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120);
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const objectKey = `local-vault/${safeSlug}/${params.kind}/${id}-${safeName}`;
  const contentType = params.file.type || 'application/octet-stream';
  const cleanTitle = (params.songTitle || '').trim().slice(0, 120);

  let url: string;
  let inlineDataUrl: string | undefined;

  if (isInlineDataUriEligible(params.file.size, params.kind)) {
    inlineDataUrl = await readFileAsDataUrl(params.file);
    url = inlineDataUrl;
  } else {
    url = URL.createObjectURL(params.file);
    activeBlobUrls.set(id, url);
  }

  params.onProgress?.(80);

  const entry: StoredVaultEntry = {
    id,
    objectKey,
    fileName: cleanTitle || safeName,
    ...(cleanTitle ? { songTitle: cleanTitle } : {}),
    kind: params.kind,
    contentType,
    sizeBytes: params.file.size,
    originalBytes: Math.max(params.originalBytes, params.file.size),
    savedBytes: Math.max(0, params.originalBytes - params.file.size),
    width: params.width,
    height: params.height,
    projectSlug: safeSlug,
    createdAt: new Date().toISOString(),
    blob: params.file,
    inlineDataUrl,
  };

  const db = await openVaultDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(entry);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  params.onProgress?.(100);

  return {
    id: entry.id,
    objectKey: entry.objectKey,
    fileName: entry.fileName,
    songTitle: entry.songTitle,
    kind: entry.kind,
    contentType: entry.contentType,
    sizeBytes: entry.sizeBytes,
    originalBytes: entry.originalBytes,
    savedBytes: entry.savedBytes,
    width: entry.width,
    height: entry.height,
    projectSlug: entry.projectSlug,
    url,
    createdAt: entry.createdAt,
  };
}

export async function listLocalVaultMedia(): Promise<LocalVaultMediaRecord[]> {
  const db = await openVaultDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? (req.result as StoredVaultEntry[]) : [];
        const list = rows
          .map((row) => {
            let url = row.inlineDataUrl || activeBlobUrls.get(row.id) || '';
            if (!url && row.blob) {
              url = URL.createObjectURL(row.blob);
              activeBlobUrls.set(row.id, url);
            }
            return {
              id: row.id,
              objectKey: row.objectKey,
              fileName: row.fileName,
              songTitle: row.songTitle,
              kind: row.kind,
              contentType: row.contentType,
              sizeBytes: row.sizeBytes,
              originalBytes: row.originalBytes,
              savedBytes: row.savedBytes,
              width: row.width,
              height: row.height,
              projectSlug: row.projectSlug,
              url,
              createdAt: row.createdAt,
            };
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        resolve(list);
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function clearLocalVaultMedia(): Promise<number> {
  const db = await openVaultDb();
  for (const blobUrl of activeBlobUrls.values()) {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {
      // ignore
    }
  }
  activeBlobUrls.clear();
  if (!db) return 0;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const countReq = store.count();
      let count = 0;
      countReq.onsuccess = () => {
        count = countReq.result || 0;
        store.clear();
      };
      tx.oncomplete = () => resolve(count);
      tx.onerror = () => resolve(0);
    } catch {
      resolve(0);
    }
  });
}
