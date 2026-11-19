import test from 'node:test';
import assert from 'node:assert/strict';
import {
  KB,
  MB,
  determineCompressionPlan,
  calculateTargetDimensions,
  selectOptimalOutputFormat,
  detectAlphaTransparencyFromPixels,
  isSupportedImageFile,
  replaceFileExtension,
} from './imageCompression';

test('determineCompressionPlan applies tiered thresholds for <500KB, 500KB–2MB, 2MB–5MB, and >5MB images', () => {
  // 1. Small image under 500KB
  const smallPlan = determineCompressionPlan(280 * KB, 'image/jpeg');
  assert.equal(smallPlan.tier, 'under-500kb');
  assert.equal(smallPlan.maxDimension, 1600);
  assert.equal(smallPlan.initialQuality, 0.9);
  assert.equal(smallPlan.minSavingsRatioToKeep, 0.12);

  // 2. Medium image between 500KB and 2MB
  const mediumPlan = determineCompressionPlan(1.4 * MB, 'image/jpeg');
  assert.equal(mediumPlan.tier, '500kb-to-2mb');
  assert.equal(mediumPlan.maxDimension, 1600);
  assert.equal(mediumPlan.initialQuality, 0.84);

  // 3. Large image between 2MB and 5MB
  const largePlan = determineCompressionPlan(3.6 * MB, 'image/jpeg');
  assert.equal(largePlan.tier, '2mb-to-5mb');
  assert.equal(largePlan.maxDimension, 1600);
  assert.equal(largePlan.initialQuality, 0.8);

  // 4. Phone photograph 5MB–10MB
  const phonePlan = determineCompressionPlan(7.8 * MB, 'image/jpeg');
  assert.equal(phonePlan.tier, 'over-5mb');
  assert.equal(phonePlan.maxDimension, 1600);
  assert.equal(phonePlan.initialQuality, 0.76);
  assert.equal(phonePlan.minQuality, 0.7);

  // 5. Ultra-high-res >10MB raw phone photo
  const ultraPlan = determineCompressionPlan(14 * MB, 'image/jpeg');
  assert.equal(ultraPlan.tier, 'over-5mb');
  assert.equal(ultraPlan.maxDimension, 1520);

  // 6. SVG and GIF passthrough
  const svgPlan = determineCompressionPlan(45 * KB, 'image/svg+xml');
  assert.equal(svgPlan.tier, 'passthrough');
  assert.equal(svgPlan.shouldProcess, false);
});

test('calculateTargetDimensions preserves exact aspect ratio for portrait, landscape, square, and small images', () => {
  // Portrait 12MP phone photo (3024 x 4032 -> 1200 x 1600)
  const portrait = calculateTargetDimensions(3024, 4032, 1600);
  assert.equal(portrait.width, 1200);
  assert.equal(portrait.height, 1600);
  assert.equal(portrait.wasResized, true);

  // Landscape 12MP phone photo (4032 x 3024 -> 1600 x 1200)
  const landscape = calculateTargetDimensions(4032, 3024, 1600);
  assert.equal(landscape.width, 1600);
  assert.equal(landscape.height, 1200);
  assert.equal(landscape.wasResized, true);

  // Square photo (3200 x 3200 -> 1600 x 1600)
  const square = calculateTargetDimensions(3200, 3200, 1600);
  assert.equal(square.width, 1600);
  assert.equal(square.height, 1600);
  assert.equal(square.wasResized, true);

  // Small image below 1600px is never upscaled
  const small = calculateTargetDimensions(960, 720, 1600);
  assert.equal(small.width, 960);
  assert.equal(small.height, 720);
  assert.equal(small.wasResized, false);
});

test('selectOptimalOutputFormat and detectAlphaTransparencyFromPixels preserve transparency and prevent JPEG black backgrounds', () => {
  // Opaque pixel buffer (4 pixels, all alpha = 255)
  const opaqueBuffer = new Uint8ClampedArray([
    255, 0, 0, 255,
    0, 255, 0, 255,
    0, 0, 255, 255,
    255, 255, 255, 255,
  ]);
  assert.equal(detectAlphaTransparencyFromPixels(opaqueBuffer, 4), false);

  // Transparent pixel buffer (alpha = 0 on pixel 2)
  const transparentBuffer = new Uint8ClampedArray([
    255, 0, 0, 255,
    0, 255, 0, 0,
    0, 0, 255, 255,
    255, 255, 255, 255,
  ]);
  assert.equal(detectAlphaTransparencyFromPixels(transparentBuffer, 4), true);

  // Transparent PNG with WebP support -> WebP (preserves alpha)
  const transparentWebp = selectOptimalOutputFormat({
    inputMimeType: 'image/png',
    hasTransparency: true,
    supportsWebP: true,
  });
  assert.equal(transparentWebp.mimeType, 'image/webp');
  assert.equal(transparentWebp.extension, 'webp');

  // Transparent PNG without WebP support -> PNG (NEVER JPEG!)
  const transparentFallback = selectOptimalOutputFormat({
    inputMimeType: 'image/png',
    hasTransparency: true,
    supportsWebP: false,
  });
  assert.equal(transparentFallback.mimeType, 'image/png');
  assert.equal(transparentFallback.extension, 'png');

  // Opaque photo without WebP support -> JPEG
  const opaqueFallback = selectOptimalOutputFormat({
    inputMimeType: 'image/jpeg',
    hasTransparency: false,
    supportsWebP: false,
  });
  assert.equal(opaqueFallback.mimeType, 'image/jpeg');
  assert.equal(opaqueFallback.extension, 'jpg');

  assert.equal(replaceFileExtension('IMG_4821.PNG', 'webp'), 'IMG_4821.webp');
});

test('isSupportedImageFile accepts JPEG, PNG, WebP, HEIC/HEIF and rejects unsupported files', () => {
  assert.equal(isSupportedImageFile({ name: 'photo.jpg', type: 'image/jpeg' }).supported, true);
  assert.equal(isSupportedImageFile({ name: 'rose.png', type: 'image/png' }).supported, true);
  assert.equal(isSupportedImageFile({ name: 'moment.webp', type: 'image/webp' }).supported, true);

  const heic = isSupportedImageFile({ name: 'IMG_0012.HEIC', type: '' });
  assert.equal(heic.supported, true);
  assert.equal(heic.isHeic, true);

  const bad = isSupportedImageFile({ name: 'archive.zip', type: 'application/zip' });
  assert.equal(bad.supported, false);
  assert.ok(bad.reason?.includes('Unsupported file type'));
});
