export interface UploadChunkSlice {
  index: number;
  start: number;
  end: number;
  size: number;
}

export interface UploadChunkPlan {
  totalBytes: number;
  chunkSize: number;
  totalChunks: number;
  slices: UploadChunkSlice[];
}

export const DEFAULT_UPLOAD_CHUNK_BYTES = 512 * 1024; // 512 KB per chunk — immune to proxy body buffers & 32 MB limits
export const CHUNKED_UPLOAD_THRESHOLD_BYTES = 384 * 1024; // Files > 384 KB (or any audio/video) stream via chunked upload
export const UPLOAD_STALL_TIMEOUT_MS = 18_000; // Abort cleanly if zero bytes move for 18 seconds (never hang forever at 26%)
export const FIREBASE_SDK_STALL_TIMEOUT_MS = 10_000; // Strict 10s stall cap on direct Firebase Storage SDK fallback

/**
 * Decides whether to use chunked binary upload immediately rather than a single-shot request.
 * Audio/video files and any file above 384 KB use chunked upload for smooth progress and
 * full resilience against reverse-proxy buffering or mid-stream stalls.
 */
export function shouldUseChunkedUpload(
  fileSizeBytes: number,
  kind: 'images' | 'video' | 'voice' | 'music'
): boolean {
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) return false;
  if (kind === 'music' || kind === 'voice' || kind === 'video') {
    return fileSizeBytes > 64 * 1024;
  }
  return fileSizeBytes > CHUNKED_UPLOAD_THRESHOLD_BYTES;
}

/**
 * Generates deterministic byte ranges for slicing a File/Blob into upload chunks.
 */
export function buildChunkPlan(
  totalBytes: number,
  chunkSize: number = DEFAULT_UPLOAD_CHUNK_BYTES
): UploadChunkPlan {
  const safeTotal = Math.max(0, Math.floor(totalBytes));
  const safeChunk = Math.max(16 * 1024, Math.floor(chunkSize));

  if (safeTotal === 0) {
    return {
      totalBytes: 0,
      chunkSize: safeChunk,
      totalChunks: 0,
      slices: [],
    };
  }

  const totalChunks = Math.ceil(safeTotal / safeChunk);
  const slices: UploadChunkSlice[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * safeChunk;
    const end = Math.min(safeTotal, start + safeChunk);
    slices.push({
      index: i,
      start,
      end,
      size: end - start,
    });
  }

  return {
    totalBytes: safeTotal,
    chunkSize: safeChunk,
    totalChunks,
    slices,
  };
}

/**
 * Computes smooth, bounded overall progress (5% .. 99%) across a chunked upload.
 * Always keeps progress monotonic when combined with Math.max(prev, next).
 */
export function computeChunkedUploadProgress(
  chunkIndex: number,
  totalChunks: number,
  chunkFraction: number = 1
): number {
  if (totalChunks <= 0) return 5;
  const clampedChunk = Math.max(0, Math.min(totalChunks - 1, chunkIndex));
  const clampedFrac = Math.max(0, Math.min(1, chunkFraction));
  const overallFraction = (clampedChunk + clampedFrac) / totalChunks;
  // Map [0, 1] -> [5, 99] so UI never stalls at 0% and reserves 100% for server commit confirmation
  return Math.max(5, Math.min(99, Math.round(5 + overallFraction * 94)));
}

/**
 * Computes average percentage across a multi-file upload pool.
 */
export function computePoolUploadProgress(progressByIndex: number[]): number {
  if (!progressByIndex.length) return 100;
  const total = progressByIndex.reduce(
    (sum, pct) => sum + Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0)),
    0
  );
  return Math.max(0, Math.min(100, Math.round(total / progressByIndex.length)));
}

/**
 * Creates a reusable stall watchdog that invokes `onStall` if `touch()` is not
 * called within `timeoutMs`. Used to guarantee uploads NEVER hang forever at 26%.
 */
export function createStallWatchdog(
  timeoutMs: number,
  onStall: () => void
): {
  touch: () => void;
  stop: () => void;
  isStopped: () => boolean;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const arm = () => {
    if (stopped) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      if (stopped) return;
      stopped = true;
      timer = null;
      onStall();
    }, Math.max(50, timeoutMs));
  };

  arm();

  return {
    touch: () => {
      if (!stopped) arm();
    },
    stop: () => {
      stopped = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
    isStopped: () => stopped,
  };
}

/**
 * Generates a compact, URL-safe upload session ID for multi-chunk uploads.
 */
export function createUploadSessionId(): string {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `upl-${stamp}-${rand}`;
}

/**
 * Formats upload errors into concise, actionable messages for the UI.
 */
export function formatUploadErrorMessage(err: unknown, fallback = 'Upload failed — please try again.'): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const msg = raw.trim();
  if (!msg) return fallback;

  const lower = msg.toLowerCase();
  if (lower.includes('413') || lower.includes('50 mb') || lower.includes('too large')) {
    return 'File is larger than the 50 MB upload limit. Please use a smaller file.';
  }
  if (lower.includes('stall') || lower.includes('timed out') || lower.includes('timeout')) {
    return 'Upload timed out because the network connection stalled. Please retry.';
  }
  if (lower.includes('storage/unauthorized') || lower.includes('storage/unauthenticated') || lower.includes('permission')) {
    return 'Cloud storage rejected the upload (permissions or CORS). Please sign in as Admin or retry via the studio server.';
  }
  if (lower.includes('storage/retry-limit-exceeded') || lower.includes('storage/canceled')) {
    return 'Cloud storage bucket did not respond in time. Please check your connection and retry.';
  }
  return msg;
}
