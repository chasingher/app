import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChunkPlan,
  computeChunkedUploadProgress,
  computePoolUploadProgress,
  createStallWatchdog,
  createUploadSessionId,
  formatUploadErrorMessage,
  shouldUseChunkedUpload,
  DEFAULT_UPLOAD_CHUNK_BYTES,
} from './uploadPipeline';

test('shouldUseChunkedUpload routes audio/video and larger images to chunked upload', () => {
  assert.equal(shouldUseChunkedUpload(2 * 1024 * 1024, 'music'), true);
  assert.equal(shouldUseChunkedUpload(120 * 1024, 'voice'), true);
  assert.equal(shouldUseChunkedUpload(900 * 1024, 'video'), true);
  assert.equal(shouldUseChunkedUpload(600 * 1024, 'images'), true);
  assert.equal(shouldUseChunkedUpload(120 * 1024, 'images'), false);
  assert.equal(shouldUseChunkedUpload(0, 'music'), false);
});

test('buildChunkPlan slices multi-MB files with exact byte coverage and no gaps', () => {
  const totalBytes = 2_350_000; // ~2.24 MB
  const plan = buildChunkPlan(totalBytes, DEFAULT_UPLOAD_CHUNK_BYTES);

  assert.equal(plan.totalBytes, totalBytes);
  assert.equal(plan.totalChunks, 5);
  assert.equal(plan.slices.length, 5);
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
  const totalChunks = 6;
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

test('formatUploadErrorMessage maps stall, size, and storage errors cleanly', () => {
  assert.match(formatUploadErrorMessage(new Error('Upload stalled at 26%')), /timed out/i);
  assert.match(formatUploadErrorMessage(new Error('HTTP 413 Payload Too Large')), /50 MB/i);
  assert.match(formatUploadErrorMessage(new Error('storage/retry-limit-exceeded')), /did not respond/i);
  assert.equal(formatUploadErrorMessage(null, 'Custom fallback'), 'Custom fallback');
});
