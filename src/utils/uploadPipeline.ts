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

// 192 KB chunks stream quickly even on 3G/mobile uplinks (Ghana/Kenya -> EU Cloud Run)
// and remain well below proxy, WAF, and Cloud Run body buffers.
export const DEFAULT_UPLOAD_CHUNK_BYTES = 192 * 1024;
export const CHUNKED_UPLOAD_THRESHOLD_BYTES = 256 * 1024;
// Idle-only stall watchdog: resets on every XHR upload progress packet so slow healthy
// connections never get falsely killed mid-transfer.
export const UPLOAD_STALL_TIMEOUT_MS = 45_000;
// Mid-process UI warning threshold: if no bytes advance for 12s mid-upload, surface
// proactive Cancel & Retry controls so users are never stuck waiting blindly.
export const MID_PROCESS_STALL_WARNING_MS = 12_000;
export const FIREBASE_SDK_STALL_TIMEOUT_MS = 8_000;
export const INLINE_DATA_URI_MAX_BYTES = 750 * 1024; // 750 KB max for inline base64 Data URI

export type UploadPhase =
  | 'init'
  | 'compress'
  | 'stage'
  | 'upload-start'
  | 'mid-process-progress'
  | 'mid-process-retry'
  | 'mid-process-timeout'
  | 'mid-process-error'
  | 'transport-fallback'
  | 'cancelled'
  | 'finalize'
  | 'firestore-sync'
  | 'complete';

export type UploadTransport =
  | 'staging'
  | 'chunked-binary'
  | 'raw-stream'
  | 'chunked-json'
  | 'firebase-sdk'
  | 'local-vault'
  | 'firestore';

export type UploadLogLevel = 'info' | 'warn' | 'error';

export interface UploadLogEntry {
  timestamp: string;
  sessionId: string;
  level: UploadLogLevel;
  phase: UploadPhase;
  transport: UploadTransport;
  projectSlug: string;
  fileName: string;
  kind: 'images' | 'video' | 'voice' | 'music' | 'project';
  fileSizeBytes: number;
  percent: number;
  elapsedMs: number;
  idleMs: number;
  chunkIndex?: number;
  totalChunks?: number;
  attempt?: number;
  httpStatus?: number;
  readyState?: number;
  throughputKBps?: number;
  online?: boolean;
  message: string;
  errorName?: string;
  errorMessage?: string;
}

export interface UploadPhaseProgressEvent {
  sessionId: string;
  phase: UploadPhase;
  transport: UploadTransport;
  detail: string;
  percent: number;
  chunkIndex?: number;
  totalChunks?: number;
  fileName: string;
}

export class UploadCancelledError extends Error {
  readonly phase: UploadPhase;
  readonly percentAtCancel: number;

  constructor(
    message = 'Upload cancelled by user.',
    phase: UploadPhase = 'cancelled',
    percentAtCancel = 0
  ) {
    super(message);
    this.name = 'UploadCancelledError';
    this.phase = phase;
    this.percentAtCancel = percentAtCancel;
  }
}

export class UploadTimeoutError extends Error {
  readonly phase: UploadPhase;
  readonly transport: UploadTransport;
  readonly percentAtTimeout: number;
  readonly chunkIndex?: number;
  readonly totalChunks?: number;
  readonly idleMs: number;
  readonly elapsedMs: number;

  constructor(params: {
    message: string;
    phase: UploadPhase;
    transport: UploadTransport;
    percentAtTimeout: number;
    chunkIndex?: number;
    totalChunks?: number;
    idleMs: number;
    elapsedMs: number;
  }) {
    super(params.message);
    this.name = 'UploadTimeoutError';
    this.phase = params.phase;
    this.transport = params.transport;
    this.percentAtTimeout = params.percentAtTimeout;
    this.chunkIndex = params.chunkIndex;
    this.totalChunks = params.totalChunks;
    this.idleMs = params.idleMs;
    this.elapsedMs = params.elapsedMs;
  }
}

export function isUploadCancelledError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof UploadCancelledError) return true;
  if (err instanceof Error) {
    if (err.name === 'UploadCancelledError' || err.name === 'AbortError') return true;
    const msg = err.message.toLowerCase();
    return (
      msg.includes('upload was cancelled') ||
      msg.includes('upload cancelled') ||
      msg.includes('user_cancelled') ||
      msg.includes('aborted by user')
    );
  }
  return false;
}

export function isUploadTimeoutError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof UploadTimeoutError) return true;
  if (err instanceof Error) {
    if (err.name === 'UploadTimeoutError') return true;
    const msg = err.message.toLowerCase();
    return msg.includes('timed out') || msg.includes('timeout') || msg.includes('stalled');
  }
  return false;
}

const MAX_UPLOAD_LOG_BUFFER = 150;
const recentUploadLogs: UploadLogEntry[] = [];

export function getRecentUploadLogs(): UploadLogEntry[] {
  return [...recentUploadLogs];
}

export function clearRecentUploadLogs(): void {
  recentUploadLogs.length = 0;
}

export function createUploadSessionLogger(meta: {
  sessionId?: string;
  projectSlug: string;
  fileName: string;
  kind: 'images' | 'video' | 'voice' | 'music' | 'project';
  fileSizeBytes: number;
  silentConsole?: boolean;
}) {
  const sessionId = meta.sessionId || createUploadSessionId();
  const startedAtMs = Date.now();
  let lastActivityAtMs = startedAtMs;
  let lastPercent = 0;
  let lastPhase: UploadPhase = 'init';
  let lastTransport: UploadTransport = 'staging';
  let lastChunkIndex: number | undefined;
  let totalChunks: number | undefined;

  const log = (
    level: UploadLogLevel,
    phase: UploadPhase,
    message: string,
    extra: {
      transport?: UploadTransport;
      percent?: number;
      chunkIndex?: number;
      totalChunks?: number;
      attempt?: number;
      httpStatus?: number;
      readyState?: number;
      bytesTransferred?: number;
      error?: unknown;
    } = {}
  ): UploadLogEntry => {
    const now = Date.now();
    const elapsedMs = Math.max(0, now - startedAtMs);
    const idleMs = Math.max(0, now - lastActivityAtMs);

    if (typeof extra.percent === 'number' && Number.isFinite(extra.percent)) {
      lastPercent = Math.max(0, Math.min(100, Math.round(extra.percent)));
    }
    if (extra.transport) lastTransport = extra.transport;
    if (typeof extra.chunkIndex === 'number') lastChunkIndex = extra.chunkIndex;
    if (typeof extra.totalChunks === 'number') totalChunks = extra.totalChunks;
    lastPhase = phase;

    if (
      phase === 'mid-process-progress' ||
      phase === 'upload-start' ||
      phase === 'finalize' ||
      phase === 'complete'
    ) {
      lastActivityAtMs = now;
    }

    const throughputKBps =
      typeof extra.bytesTransferred === 'number' && elapsedMs > 0
        ? Math.round((extra.bytesTransferred / 1024 / (elapsedMs / 1000)) * 10) / 10
        : undefined;

    const online =
      typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
        ? navigator.onLine
        : undefined;

    const errObj = extra.error instanceof Error ? extra.error : null;
    const entry: UploadLogEntry = {
      timestamp: new Date(now).toISOString(),
      sessionId,
      level,
      phase,
      transport: lastTransport,
      projectSlug: meta.projectSlug || 'general',
      fileName: meta.fileName,
      kind: meta.kind,
      fileSizeBytes: meta.fileSizeBytes,
      percent: lastPercent,
      elapsedMs,
      idleMs,
      ...(typeof lastChunkIndex === 'number' ? { chunkIndex: lastChunkIndex } : {}),
      ...(typeof totalChunks === 'number' ? { totalChunks } : {}),
      ...(typeof extra.attempt === 'number' ? { attempt: extra.attempt } : {}),
      ...(typeof extra.httpStatus === 'number' ? { httpStatus: extra.httpStatus } : {}),
      ...(typeof extra.readyState === 'number' ? { readyState: extra.readyState } : {}),
      ...(typeof throughputKBps === 'number' ? { throughputKBps } : {}),
      ...(typeof online === 'boolean' ? { online } : {}),
      message,
      ...(errObj ? { errorName: errObj.name, errorMessage: errObj.message } : {}),
      ...(!errObj && extra.error ? { errorMessage: String(extra.error) } : {}),
    };

    recentUploadLogs.push(entry);
    if (recentUploadLogs.length > MAX_UPLOAD_LOG_BUFFER) {
      recentUploadLogs.splice(0, recentUploadLogs.length - MAX_UPLOAD_LOG_BUFFER);
    }

    if (!meta.silentConsole && typeof console !== 'undefined') {
      const tag = `[SiteBuilderUpload][${sessionId}][${phase}]`;
      if (level === 'error') {
        console.error(tag, message, entry);
      } else if (level === 'warn') {
        console.warn(tag, message, entry);
      } else {
        console.info(tag, message, entry);
      }
    }

    return entry;
  };

  return {
    sessionId,
    getSnapshot: () => ({
      sessionId,
      startedAtMs,
      lastActivityAtMs,
      elapsedMs: Math.max(0, Date.now() - startedAtMs),
      idleMs: Math.max(0, Date.now() - lastActivityAtMs),
      lastPercent,
      lastPhase,
      lastTransport,
      lastChunkIndex,
      totalChunks,
    }),
    info: (
      phase: UploadPhase,
      message: string,
      extra?: Parameters<typeof log>[3]
    ) => log('info', phase, message, extra),
    warn: (
      phase: UploadPhase,
      message: string,
      extra?: Parameters<typeof log>[3]
    ) => log('warn', phase, message, extra),
    error: (
      phase: UploadPhase,
      message: string,
      extra?: Parameters<typeof log>[3]
    ) => log('error', phase, message, extra),
  };
}

export type UploadRecoveryStatus =
  | 'idle'
  | 'staging'
  | 'uploading'
  | 'stalled'
  | 'cancelled'
  | 'error'
  | 'success';

export interface UploadRecoveryState {
  status: UploadRecoveryStatus;
  sessionId: string | null;
  phase: string;
  activeFileName: string;
  percent: number;
  totalFiles: number;
  completedFiles: number;
  startedAtMs: number | null;
  lastActivityAtMs: number | null;
  errorMessage: string;
  failurePhase: string;
  percentAtFailure: number | null;
  canRetry: boolean;
}

export const INITIAL_UPLOAD_RECOVERY_STATE: UploadRecoveryState = {
  status: 'idle',
  sessionId: null,
  phase: '',
  activeFileName: '',
  percent: 0,
  totalFiles: 0,
  completedFiles: 0,
  startedAtMs: null,
  lastActivityAtMs: null,
  errorMessage: '',
  failurePhase: '',
  percentAtFailure: null,
  canRetry: false,
};

export type UploadRecoveryAction =
  | {
      type: 'START';
      mode: 'staging' | 'uploading';
      sessionId: string;
      totalFiles: number;
      phase: string;
      activeFileName?: string;
      nowMs?: number;
    }
  | {
      type: 'PROGRESS';
      percent: number;
      phase?: string;
      activeFileName?: string;
      completedFiles?: number;
      nowMs?: number;
    }
  | {
      type: 'MARK_STALLED';
      nowMs?: number;
    }
  | {
      type: 'CANCEL';
      reason?: string;
      canRetry?: boolean;
    }
  | {
      type: 'FAIL';
      errorMessage: string;
      failurePhase?: string;
      canRetry?: boolean;
    }
  | {
      type: 'COMPLETE';
      phase?: string;
    }
  | {
      type: 'RESET';
    };

export function reduceUploadRecoveryState(
  state: UploadRecoveryState,
  action: UploadRecoveryAction
): UploadRecoveryState {
  switch (action.type) {
    case 'START': {
      const now = action.nowMs ?? Date.now();
      return {
        status: action.mode,
        sessionId: action.sessionId,
        phase: action.phase,
        activeFileName: action.activeFileName || '',
        percent: action.mode === 'uploading' ? 5 : 0,
        totalFiles: Math.max(0, action.totalFiles),
        completedFiles: 0,
        startedAtMs: now,
        lastActivityAtMs: now,
        errorMessage: '',
        failurePhase: '',
        percentAtFailure: null,
        canRetry: false,
      };
    }
    case 'PROGRESS': {
      if (state.status !== 'uploading' && state.status !== 'staging' && state.status !== 'stalled') {
        return state;
      }
      const now = action.nowMs ?? Date.now();
      const clamped = Math.max(0, Math.min(100, Math.round(action.percent)));
      return {
        ...state,
        status: state.status === 'stalled' ? 'uploading' : state.status,
        percent: Math.max(state.percent, clamped),
        phase: action.phase ?? state.phase,
        activeFileName: action.activeFileName ?? state.activeFileName,
        completedFiles:
          typeof action.completedFiles === 'number'
            ? action.completedFiles
            : state.completedFiles,
        lastActivityAtMs: now,
      };
    }
    case 'MARK_STALLED': {
      if (state.status !== 'uploading' && state.status !== 'staging') {
        return state;
      }
      return {
        ...state,
        status: 'stalled',
        canRetry: true,
      };
    }
    case 'CANCEL': {
      return {
        ...state,
        status: 'cancelled',
        errorMessage:
          action.reason ||
          'Upload cancelled. Your selected files are still safely staged — tap Retry Upload whenever you are ready.',
        failurePhase: state.phase || 'mid-process',
        percentAtFailure: state.percent,
        canRetry: action.canRetry ?? true,
      };
    }
    case 'FAIL': {
      return {
        ...state,
        status: 'error',
        errorMessage: action.errorMessage,
        failurePhase: action.failurePhase || state.phase || 'mid-process',
        percentAtFailure: state.percent,
        canRetry: action.canRetry ?? true,
      };
    }
    case 'COMPLETE': {
      return {
        ...state,
        status: 'success',
        percent: 100,
        completedFiles: state.totalFiles,
        phase: action.phase || 'Upload complete',
        errorMessage: '',
        failurePhase: '',
        percentAtFailure: null,
        canRetry: false,
      };
    }
    case 'RESET': {
      return { ...INITIAL_UPLOAD_RECOVERY_STATE };
    }
    default:
      return state;
  }
}

/**
 * Decides whether to use chunked upload immediately rather than a single-shot request.
 * Audio/video files and any file above 256 KB use chunked upload for smooth progress and
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
 * Encodes an ArrayBuffer into Base64 cleanly without hitting call-stack limits.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
    return Buffer.from(bytes).toString('base64');
  }
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(bytes.length, i + chunkSize));
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

/**
 * Determines whether a fallback local upload should be stored as a portable inline Data URI
 * (works across reloads & standalone HTML exports) vs IndexedDB + playable Blob URL.
 */
export function isInlineDataUriEligible(
  sizeBytes: number,
  kind: 'images' | 'video' | 'voice' | 'music'
): boolean {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return false;
  if (kind === 'images') {
    return sizeBytes <= INLINE_DATA_URI_MAX_BYTES;
  }
  return sizeBytes <= 350 * 1024;
}

/**
 * Detects when Firebase Cloud Storage bucket is unprovisioned / 404 so the client
 * fails fast in <1s instead of stalling on retries.
 */
export function isBucketNotProvisionedError(statusOrMessage: number | string): boolean {
  if (typeof statusOrMessage === 'number') {
    return statusOrMessage === 404;
  }
  const lower = String(statusOrMessage || '').toLowerCase();
  return (
    lower.includes('bucket-not-found') ||
    lower.includes('bucket does not exist') ||
    lower.includes('storage/object-not-found') ||
    lower.includes('not provisioned') ||
    (lower.includes('404') && lower.includes('not found'))
  );
}

/**
 * Formats upload errors into concise, actionable messages for the UI while preserving
 * specific causes instead of collapsing unrelated failures into one generic timeout.
 */
export function formatUploadErrorMessage(
  err: unknown,
  fallback = 'Upload failed — please try again.'
): string {
  if (isUploadCancelledError(err)) {
    return 'Upload cancelled. Your files are still safely staged — tap Retry Upload whenever you are ready.';
  }

  if (err instanceof UploadTimeoutError) {
    const chunkInfo =
      typeof err.chunkIndex === 'number' && typeof err.totalChunks === 'number'
        ? ` on chunk ${err.chunkIndex + 1} of ${err.totalChunks}`
        : '';
    return `Upload timed out${chunkInfo} at ${err.percentAtTimeout}% after ${Math.round(
      err.idleMs / 1000
    )}s without network activity. Tap Retry Upload to continue.`;
  }

  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const msg = raw.trim();
  if (!msg) return fallback;

  const lower = msg.toLowerCase();
  if (lower.includes('413') || lower.includes('50 mb') || lower.includes('too large')) {
    return 'File is larger than the 50 MB upload limit. Please use a smaller file.';
  }
  if (isBucketNotProvisionedError(msg)) {
    return 'Firebase Cloud Storage bucket is not enabled on this project yet. Enable Storage in Firebase Console or use the live Studio server.';
  }
  if (
    lower.includes('storage/unauthorized') ||
    lower.includes('storage/unauthenticated') ||
    lower.includes('permission')
  ) {
    return 'Cloud storage rejected the upload (permissions or CORS). Please sign in as Admin or retry via the studio server.';
  }
  if (lower.includes('storage/retry-limit-exceeded') || lower.includes('storage/canceled')) {
    return 'Cloud storage bucket did not respond in time. Please check Firebase Storage setup or retry.';
  }
  if (lower.includes('stall') || lower.includes('timed out') || lower.includes('timeout')) {
    return 'Upload timed out because no data transferred for 45 seconds. Please check your internet connection and retry.';
  }
  return msg;
}
