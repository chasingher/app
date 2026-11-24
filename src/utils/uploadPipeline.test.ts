import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arrayBufferToBase64,
  buildChunkPlan,
  clearRecentUploadLogs,
  computeChunkedUploadProgress,
  computePoolUploadProgress,
  createStallWatchdog,
  createUploadSessionId,
  createUploadSessionLogger,
  formatUploadErrorMessage,
  getRecentUploadLogs,
  INITIAL_UPLOAD_RECOVERY_STATE,
  isBucketNotProvisionedError,
  isInlineDataUriEligible,
  isUploadCancelledError,
  isUploadTimeoutError,
  reduceUploadRecoveryState,
  shouldUseChunkedUpload,
  UploadCancelledError,
  UploadTimeoutError,
  DEFAULT_UPLOAD_CHUNK_BYTES,
} from './uploadPipeline';

test('shouldUseChunkedUpload routes audio/video and larger images to chunked upload', () => {
  assert.equal(shouldUseChunkedUpload(2 * 1024 * 1024, 'music'), true);
  assert.equal(shouldUseChunkedUpload(120 * 1024, 'voice'), true);
  assert.equal(shouldUseChunkedUpload(900 * 1024, 'video'), true);
  assert.equal(shouldUseChunkedUpload(300 * 1024, 'images'), true);
  assert.equal(shouldUseChunkedUpload(120 * 1024, 'images'), false);
  assert.equal(shouldUseChunkedUpload(0, 'music'), false);
});

test('buildChunkPlan slices multi-MB files with 192KB chunks and exact byte coverage', () => {
  const totalBytes = 2_350_000;
  const plan = buildChunkPlan(totalBytes, DEFAULT_UPLOAD_CHUNK_BYTES);

  assert.equal(plan.chunkSize, 192 * 1024);
  assert.equal(plan.totalBytes, totalBytes);
  assert.equal(plan.totalChunks, Math.ceil(totalBytes / (192 * 1024)));
  assert.equal(plan.slices[0].start, 0);
  assert.equal(plan.slices[plan.slices.length - 1].end, totalBytes);

  let covered = 0;
  for (let i = 0; i < plan.slices.length; i++) {
    const slice = plan.slices[i];
    assert.equal(slice.index, i);
    assert.equal(slice.start, covered);
    assert.equal(slice.size, slice.end - slice.start);
    covered += slice.size;
  }
  assert.equal(covered, totalBytes);
});

test('buildChunkPlan handles empty files safely', () => {
  const plan = buildChunkPlan(0);
  assert.equal(plan.totalChunks, 0);
  assert.deepEqual(plan.slices, []);
});

test('computeChunkedUploadProgress increases monotonically from 5% to 99% without stalling at 26%', () => {
  const totalChunks = 12;
  const samples: number[] = [];
  for (let i = 0; i < totalChunks; i++) {
    samples.push(computeChunkedUploadProgress(i, totalChunks, 0.25));
    samples.push(computeChunkedUploadProgress(i, totalChunks, 1));
  }

  for (let i = 1; i < samples.length; i++) {
    assert.ok(
      samples[i] >= samples[i - 1],
      `Expected monotonic progress: ${samples[i]} >= ${samples[i - 1]}`
    );
  }
  assert.ok(samples[0] >= 5);
  assert.equal(samples[samples.length - 1], 99);
});

test('computePoolUploadProgress averages file progress safely', () => {
  assert.equal(computePoolUploadProgress([]), 100);
  assert.equal(computePoolUploadProgress([100, 100]), 100);
  assert.equal(computePoolUploadProgress([50, 100]), 75);
  assert.equal(computePoolUploadProgress([120, -10]), 50);
});

test('createStallWatchdog triggers when idle and resets when touched', async () => {
  let stalled = false;
  const watchdog = createStallWatchdog(80, () => {
    stalled = true;
  });

  await new Promise((r) => setTimeout(r, 45));
  watchdog.touch();
  await new Promise((r) => setTimeout(r, 45));
  assert.equal(stalled, false, 'Watchdog should reset when touched before expiry');

  await new Promise((r) => setTimeout(r, 110));
  assert.equal(stalled, true, 'Watchdog should fire after idle timeout');
  assert.equal(watchdog.isStopped(), true);
});

test('createStallWatchdog stop prevents firing', async () => {
  let stalled = false;
  const watchdog = createStallWatchdog(60, () => {
    stalled = true;
  });
  watchdog.stop();
  await new Promise((r) => setTimeout(r, 90));
  assert.equal(stalled, false);
});

test('createUploadSessionId produces safe alphanumeric session identifiers', () => {
  const a = createUploadSessionId();
  const b = createUploadSessionId();
  assert.match(a, /^upl-[a-z0-9-]+$/);
  assert.notEqual(a, b);
});

test('arrayBufferToBase64 encodes binary chunks accurately', () => {
  const raw = new Uint8Array([72, 101, 108, 108, 111, 33]); // "Hello!"
  assert.equal(arrayBufferToBase64(raw.buffer), 'SGVsbG8h');
});

test('isInlineDataUriEligible selects compact images for inline Data URI and larger audio for IndexedDB', () => {
  assert.equal(isInlineDataUriEligible(220 * 1024, 'images'), true);
  assert.equal(isInlineDataUriEligible(900 * 1024, 'images'), false);
  assert.equal(isInlineDataUriEligible(2_400_000, 'music'), false);
  assert.equal(isInlineDataUriEligible(180 * 1024, 'voice'), true);
});

test('isBucketNotProvisionedError identifies HTTP 404 and Firebase bucket-not-found messages', () => {
  assert.equal(isBucketNotProvisionedError(404), true);
  assert.equal(isBucketNotProvisionedError(200), false);
  assert.equal(isBucketNotProvisionedError('storage/bucket-not-found'), true);
  assert.equal(isBucketNotProvisionedError('HTTP 404 Not Found'), true);
});

test('UploadCancelledError and UploadTimeoutError helpers detect typed and native errors', () => {
  const cancelErr = new UploadCancelledError('Cancelled at 42%', 'cancelled', 42);
  assert.equal(isUploadCancelledError(cancelErr), true);
  assert.equal(cancelErr.percentAtCancel, 42);
  const abortErr = new Error('The operation was aborted.');
  abortErr.name = 'AbortError';
  assert.equal(isUploadCancelledError(abortErr), true);
  assert.equal(isUploadCancelledError(new Error('Random failure')), false);

  const timeoutErr = new UploadTimeoutError({
    message: 'Chunk 2 timed out',
    phase: 'mid-process-timeout',
    transport: 'chunked-binary',
    percentAtTimeout: 42,
    chunkIndex: 1,
    totalChunks: 4,
    idleMs: 12500,
    elapsedMs: 18000,
  });
  assert.equal(isUploadTimeoutError(timeoutErr), true);
  assert.equal(timeoutErr.chunkIndex, 1);
  assert.equal(timeoutErr.percentAtTimeout, 42);
  assert.equal(isUploadTimeoutError(new Error('Request timed out mid-upload')), true);
  assert.equal(isUploadTimeoutError(cancelErr), false);
});

test('createUploadSessionLogger records mid-process diagnostics into the ring buffer', () => {
  clearRecentUploadLogs();
  const logger = createUploadSessionLogger({
    sessionId: 'upl-test-log',
    projectSlug: 'ama-and-kofi',
    fileName: 'our-song.wav',
    kind: 'music',
    fileSizeBytes: 512_000,
    silentConsole: true,
  });

  logger.info('init', 'Upload initialized', { percent: 2 });
  logger.info('mid-process-progress', 'Chunk 2/3 uploaded', {
    transport: 'chunked-binary',
    chunkIndex: 1,
    totalChunks: 3,
    percent: 66,
    bytesTransferred: 384_000,
  });
  logger.warn('mid-process-timeout', 'Chunk 3 stalled', {
    transport: 'chunked-binary',
    chunkIndex: 2,
    totalChunks: 3,
    attempt: 1,
  });

  const logs = getRecentUploadLogs();
  assert.equal(logs.length, 3);
  assert.equal(logs[1].phase, 'mid-process-progress');
  assert.equal(logs[1].percent, 66);
  assert.equal(logs[1].chunkIndex, 1);
  assert.equal(logs[2].level, 'warn');
  assert.equal(logs[2].attempt, 1);

  const snap = logger.getSnapshot();
  assert.equal(snap.lastPercent, 66);
  assert.equal(snap.lastPhase, 'mid-process-timeout');
  assert.equal(snap.lastTransport, 'chunked-binary');
  clearRecentUploadLogs();
});

test('reduceUploadRecoveryState transitions through active upload, stall, cancel, retry, and completion', () => {
  let state = reduceUploadRecoveryState(INITIAL_UPLOAD_RECOVERY_STATE, {
    type: 'START',
    mode: 'uploading',
    sessionId: 'upl-1',
    totalFiles: 2,
    phase: 'Uploading our-song.wav...',
    activeFileName: 'our-song.wav',
    nowMs: 1000,
  });
  assert.equal(state.status, 'uploading');
  assert.equal(state.percent, 5);

  state = reduceUploadRecoveryState(state, {
    type: 'PROGRESS',
    percent: 48,
    phase: 'Chunk 2/4',
    nowMs: 3000,
  });
  assert.equal(state.status, 'uploading');
  assert.equal(state.percent, 48);

  state = reduceUploadRecoveryState(state, { type: 'MARK_STALLED', nowMs: 16000 });
  assert.equal(state.status, 'stalled');
  assert.equal(state.percent, 48);

  state = reduceUploadRecoveryState(state, {
    type: 'CANCEL',
    reason: 'Upload cancelled at 48%.',
    canRetry: true,
  });
  assert.equal(state.status, 'cancelled');
  assert.equal(state.percentAtFailure, 48);
  assert.equal(state.canRetry, true);

  // Retry starts cleanly
  state = reduceUploadRecoveryState(state, {
    type: 'START',
    mode: 'uploading',
    sessionId: 'upl-2',
    totalFiles: 2,
    phase: 'Retrying upload...',
    nowMs: 18000,
  });
  assert.equal(state.status, 'uploading');
  assert.equal(state.errorMessage, '');

  state = reduceUploadRecoveryState(state, { type: 'COMPLETE', phase: 'Saved!' });
  assert.equal(state.status, 'success');
  assert.equal(state.percent, 100);

  const failed = reduceUploadRecoveryState(
    reduceUploadRecoveryState(INITIAL_UPLOAD_RECOVERY_STATE, {
      type: 'START',
      mode: 'uploading',
      sessionId: 'upl-3',
      totalFiles: 1,
      phase: 'Uploading photo.jpg',
      nowMs: 20000,
    }),
    {
      type: 'FAIL',
      errorMessage: 'Network timeout at 35%',
      failurePhase: 'mid-process-timeout',
      canRetry: true,
    }
  );
  assert.equal(failed.status, 'error');
  assert.equal(failed.failurePhase, 'mid-process-timeout');
  assert.equal(failed.canRetry, true);
});

test('formatUploadErrorMessage distinguishes cancel, timeout, bucket-not-enabled, stall, and size errors', () => {
  assert.match(formatUploadErrorMessage(new UploadCancelledError()), /cancelled/i);
  assert.match(
    formatUploadErrorMessage(
      new UploadTimeoutError({
        message: 'Chunk 2 stalled',
        phase: 'mid-process-timeout',
        transport: 'chunked-binary',
        percentAtTimeout: 50,
        idleMs: 15000,
        elapsedMs: 22000,
      })
    ),
    /timed out|stalled/i
  );
  assert.match(
    formatUploadErrorMessage(new Error('storage/bucket-not-found')),
    /not enabled/i
  );
  assert.match(formatUploadErrorMessage(new Error('Upload stalled at 26%')), /timed out/i);
  assert.match(formatUploadErrorMessage(new Error('HTTP 413 Payload Too Large')), /50 MB/i);
  assert.match(
    formatUploadErrorMessage(new Error('storage/retry-limit-exceeded')),
    /did not respond/i
  );
  assert.equal(formatUploadErrorMessage(null, 'Custom fallback'), 'Custom fallback');
});

