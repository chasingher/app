export type CompressionTier =
  | 'under-500kb'
  | '500kb-to-2mb'
  | '2mb-to-5mb'
  | 'over-5mb'
  | 'passthrough';

export interface CompressionRulePlan {
  tier: CompressionTier;
  shouldProcess: boolean;
  maxDimension: number;
  initialQuality: number;
  minQuality: number;
  targetMaxBytes: number;
  minSavingsRatioToKeep: number;
}

export interface ImageCompressionOptions {
  maxDimension?: number;
  forcePreserveTransparency?: boolean;
  onStatus?: (statusMessage: string) => void;
}

export interface ImageCompressionResult {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  savingsPercent: number;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  outputFormat: string;
  hasTransparency: boolean;
  tier: CompressionTier;
  wasCompressed: boolean;
  fallbackReason?: string;
}

export const KB = 1024;
export const MB = 1024 * 1024;

export const THRESHOLD_500KB = 500 * KB;
export const THRESHOLD_2MB = 2 * MB;
export const THRESHOLD_5MB = 5 * MB;
export const THRESHOLD_10MB = 10 * MB;
export const MAX_ALLOWED_RAW_IMAGE_BYTES = 60 * MB;
export const DEFAULT_MAX_IMAGE_DIMENSION = 1600;

/**
 * Pure function that determines the compression tier and quality parameters
 * based on the input file's byte size and MIME type.
 */
export function determineCompressionPlan(
  fileSizeBytes: number,
  mimeType: string,
  customMaxDim?: number
): CompressionRulePlan {
  const cleanMime = (mimeType || '').toLowerCase();

  // Vector SVGs and animated GIFs should not be rasterized onto a single-frame canvas
  if (cleanMime === 'image/svg+xml' || cleanMime === 'image/gif') {
    return {
      tier: 'passthrough',
      shouldProcess: false,
      maxDimension: customMaxDim || DEFAULT_MAX_IMAGE_DIMENSION,
      initialQuality: 1,
      minQuality: 1,
      targetMaxBytes: fileSizeBytes,
      minSavingsRatioToKeep: 0,
    };
  }

  // Rule 1: Below 500 KB — avoid aggressive compression; optimize only if dimensions exceed maxDimension
  // or if gentle WebP conversion saves at least 12% without quality loss.
  if (fileSizeBytes < THRESHOLD_500KB) {
    return {
      tier: 'under-500kb',
      shouldProcess: true,
      maxDimension: customMaxDim || DEFAULT_MAX_IMAGE_DIMENSION,
      initialQuality: 0.9,
      minQuality: 0.86,
      targetMaxBytes: 420 * KB,
      minSavingsRatioToKeep: 0.12, // Only replace if we save >= 12% (or if resized from >1600px)
    };
  }

  // Rule 2: 500 KB to 2 MB — optimize where doing so meaningfully reduces size (aiming for ~200KB–650KB)
  if (fileSizeBytes <= THRESHOLD_2MB) {
    return {
      tier: '500kb-to-2mb',
      shouldProcess: true,
      maxDimension: customMaxDim || DEFAULT_MAX_IMAGE_DIMENSION,
      initialQuality: 0.84,
      minQuality: 0.76,
      targetMaxBytes: 620 * KB,
      minSavingsRatioToKeep: 0.08, // Keep optimized version if it saves at least 8%
    };
  }

  // Rule 3: 2 MB to 5 MB — automatically resize and compress into the 250KB–700KB sweet spot
  if (fileSizeBytes <= THRESHOLD_5MB) {
    return {
      tier: '2mb-to-5mb',
      shouldProcess: true,
      maxDimension: customMaxDim || DEFAULT_MAX_IMAGE_DIMENSION,
      initialQuality: 0.8,
      minQuality: 0.72,
      targetMaxBytes: 680 * KB,
      minSavingsRatioToKeep: 0.05,
    };
  }

  // Rule 4: Above 5 MB — apply stronger optimization while keeping romantic photos crisp and artifact-free
  const maxDimForHeavy =
    customMaxDim || (fileSizeBytes > THRESHOLD_10MB ? 1520 : DEFAULT_MAX_IMAGE_DIMENSION);

  return {
    tier: 'over-5mb',
    shouldProcess: true,
    maxDimension: maxDimForHeavy,
    initialQuality: 0.76,
    minQuality: 0.7,
    targetMaxBytes: 720 * KB,
    minSavingsRatioToKeep: 0.03,
  };
}

/**
 * Pure function to calculate target width and height while strictly preserving aspect ratio
 * for portrait, landscape, and square photographs without ever upscaling smaller images.
 */
export function calculateTargetDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number = DEFAULT_MAX_IMAGE_DIMENSION
): { width: number; height: number; wasResized: boolean } {
  const safeW = Math.max(1, Math.round(originalWidth));
  const safeH = Math.max(1, Math.round(originalHeight));
  const safeMax = Math.max(64, Math.round(maxDimension));

  if (safeW <= safeMax && safeH <= safeMax) {
    return { width: safeW, height: safeH, wasResized: false };
  }

  if (safeW >= safeH) {
    // Landscape or Square
    const ratio = safeMax / safeW;
    return {
      width: safeMax,
      height: Math.max(1, Math.round(safeH * ratio)),
      wasResized: true,
    };
  } else {
    // Portrait
    const ratio = safeMax / safeH;
    return {
      width: Math.max(1, Math.round(safeW * ratio)),
      height: safeMax,
      wasResized: true,
    };
  }
}

/**
 * Pure function to select the target output MIME format and file extension,
 * ensuring transparent PNG/WebP images NEVER lose transparency to JPEG.
 */
export function selectOptimalOutputFormat(params: {
  inputMimeType: string;
  hasTransparency: boolean;
  supportsWebP: boolean;
}): { mimeType: 'image/webp' | 'image/jpeg' | 'image/png'; extension: string } {
  const { hasTransparency, supportsWebP } = params;

  if (hasTransparency) {
    if (supportsWebP) {
      return { mimeType: 'image/webp', extension: 'webp' };
    }
    return { mimeType: 'image/png', extension: 'png' };
  }

  if (supportsWebP) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  return { mimeType: 'image/jpeg', extension: 'jpg' };
}

export function replaceFileExtension(fileName: string, newExt: string): string {
  const cleanName = (fileName || 'photo').trim();
  const base = cleanName.replace(/\.[^/.]+$/, '');
  return `${base}.${newExt.replace(/^\./, '')}`;
}

export function isSupportedImageFile(file: { name?: string; type?: string }): {
  supported: boolean;
  isHeic: boolean;
  reason?: string;
} {
  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const isHeic =
    mime === 'image/heic' ||
    mime === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif');

  if (isHeic) {
    return { supported: true, isHeic: true };
  }

  if (mime.startsWith('image/')) {
    return { supported: true, isHeic: false };
  }

  if (/\.(jpe?g|png|webp|gif|bmp|avif|svg)$/i.test(name)) {
    return { supported: true, isHeic: false };
  }

  return {
    supported: false,
    isHeic: false,
    reason: `Unsupported file type "${file.name || mime}". Please choose a JPEG, PNG, WebP, or phone photograph.`,
  };
}

/**
 * Inspects an RGBA pixel buffer (Uint8ClampedArray) on a fast stride to detect any non-opaque pixels.
 */
export function detectAlphaTransparencyFromPixels(
  rgbaData: Uint8ClampedArray | number[],
  totalPixels: number
): boolean {
  const len = rgbaData.length;
  if (len < 4) return false;
  // Sample up to ~2,500 pixels evenly across the image for sub-millisecond detection
  const stridePixels = Math.max(1, Math.floor(totalPixels / 2500));
  const step = stridePixels * 4;
  for (let i = 3; i < len; i += step) {
    if (rgbaData[i] < 250) {
      return true;
    }
  }
  return false;
}

let cachedWebPSupport: boolean | null = null;

function checkBrowserWebPSupport(): boolean {
  if (cachedWebPSupport !== null) return cachedWebPSupport;
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const dataUrl = canvas.toDataURL('image/webp');
    cachedWebPSupport = dataUrl.startsWith('data:image/webp');
    return cachedWebPSupport;
  } catch {
    cachedWebPSupport = false;
    return false;
  }
}

async function decodeImageSource(file: File): Promise<{
  width: number;
  height: number;
  drawToContext: (ctx: CanvasRenderingContext2D, targetW: number, targetH: number) => void;
  cleanup: () => void;
}> {
  // Prefer createImageBitmap with EXIF orientation 'from-image' when available
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
      } as ImageBitmapOptions);
      return {
        width: bitmap.width,
        height: bitmap.height,
        drawToContext: (ctx, targetW, targetH) => {
          ctx.drawImage(bitmap, 0, 0, targetW, targetH);
        },
        cleanup: () => {
          try {
            bitmap.close();
          } catch {
            // ignore
          }
        },
      };
    } catch {
      // Fall through to HTMLImageElement loader
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Image has invalid dimensions'));
        return;
      }
      resolve({
        width,
        height,
        drawToContext: (ctx, targetW, targetH) => {
          ctx.drawImage(img, 0, 0, targetW, targetH);
        },
        cleanup: () => {
          URL.revokeObjectURL(objectUrl);
        },
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Unable to decode image "${file.name}"`));
    };

    img.src = objectUrl;
  });
}

function encodeCanvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.size > 0) {
          resolve(blob);
          return;
        }
        // Fallback to toDataURL if toBlob returned null
        try {
          const dataUrl = canvas.toDataURL(mimeType, quality);
          const parts = dataUrl.split(',');
          const byteString = atob(parts[1] || '');
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          resolve(new Blob([ab], { type: mimeType }));
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Canvas encoding failed'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Compresses and optimizes a customer image File on the client device prior to uploading.
 * Preserves aspect ratio, orientation, and transparency, strips unnecessary EXIF metadata,
 * and cleans up all temporary memory and object URLs.
 */
export async function compressImageFile(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<ImageCompressionResult> {
  const { maxDimension, forcePreserveTransparency = false, onStatus } = options;
  const originalBytes = file.size;

  const supportCheck = isSupportedImageFile(file);
  if (!supportCheck.supported) {
    throw new Error(supportCheck.reason || 'Unsupported image file format.');
  }

  if (originalBytes > MAX_ALLOWED_RAW_IMAGE_BYTES) {
    throw new Error(
      `"${file.name}" is ${(originalBytes / MB).toFixed(1)} MB, which exceeds the 60 MB device memory safety limit. Please select a standard photograph.`
    );
  }

  const plan = determineCompressionPlan(originalBytes, file.type, maxDimension);

  if (!plan.shouldProcess || typeof document === 'undefined') {
    return {
      file,
      originalBytes,
      compressedBytes: originalBytes,
      savedBytes: 0,
      savingsPercent: 0,
      originalWidth: 0,
      originalHeight: 0,
      width: 0,
      height: 0,
      outputFormat: file.type || 'image/jpeg',
      hasTransparency: false,
      tier: plan.tier,
      wasCompressed: false,
    };
  }

  onStatus?.(`Preparing "${file.name}"…`);

  let decoded: Awaited<ReturnType<typeof decodeImageSource>> | null = null;
  let canvas: HTMLCanvasElement | null = null;

  try {
    decoded = await decodeImageSource(file);
    const originalWidth = decoded.width;
    const originalHeight = decoded.height;

    const { width, height, wasResized } = calculateTargetDimensions(
      originalWidth,
      originalHeight,
      plan.maxDimension
    );

    // If image is under 500 KB, already within 1600px, and already WebP/JPEG, avoid unnecessary re-compression
    const cleanMime = (file.type || '').toLowerCase();
    if (
      plan.tier === 'under-500kb' &&
      !wasResized &&
      cleanMime === 'image/webp'
    ) {
      decoded.cleanup();
      return {
        file,
        originalBytes,
        compressedBytes: originalBytes,
        savedBytes: 0,
        savingsPercent: 0,
        originalWidth,
        originalHeight,
        width: originalWidth,
        height: originalHeight,
        outputFormat: file.type,
        hasTransparency: false,
        tier: plan.tier,
        wasCompressed: false,
      };
    }

    onStatus?.(`Optimizing "${file.name}"…`);

    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw new Error('Browser canvas 2D context unavailable');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    decoded.drawToContext(ctx, width, height);
    // Immediately free decoded bitmap / object URL memory
    decoded.cleanup();
    decoded = null;

    // Detect transparency if input could contain an alpha channel (PNG, WebP, GIF) or if forced
    let hasTransparency = forcePreserveTransparency;
    if (
      !hasTransparency &&
      (cleanMime === 'image/png' ||
        cleanMime === 'image/webp' ||
        file.name.toLowerCase().endsWith('.png'))
    ) {
      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        hasTransparency = detectAlphaTransparencyFromPixels(
          imgData.data,
          width * height
        );
      } catch {
        hasTransparency = forcePreserveTransparency;
      }
    }

    // If not transparent, composite over a warm neutral white background in case any edge pixels have partial alpha
    if (!hasTransparency && cleanMime === 'image/png') {
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = width;
      compositeCanvas.height = height;
      const compCtx = compositeCanvas.getContext('2d');
      if (compCtx) {
        compCtx.fillStyle = '#FFFFFF';
        compCtx.fillRect(0, 0, width, height);
        compCtx.drawImage(canvas, 0, 0);
        canvas.width = 0;
        canvas.height = 0;
        canvas = compositeCanvas;
      }
    }

    const supportsWebP = checkBrowserWebPSupport();
    const { mimeType: targetMime, extension } = selectOptimalOutputFormat({
      inputMimeType: cleanMime,
      hasTransparency,
      supportsWebP,
    });

    let currentQuality = plan.initialQuality;
    let blob = await encodeCanvasToBlob(canvas, targetMime, currentQuality);

    // Adaptive second pass for larger photos (> 2 MB or > targetMaxBytes) while preserving visual quality
    if (
      blob.size > plan.targetMaxBytes &&
      currentQuality > plan.minQuality &&
      targetMime !== 'image/png'
    ) {
      currentQuality = Math.max(plan.minQuality, Number((currentQuality - 0.06).toFixed(2)));
      const secondBlob = await encodeCanvasToBlob(canvas, targetMime, currentQuality);
      if (secondBlob.size < blob.size) {
        blob = secondBlob;
      }
    }

    // Clean up canvas memory immediately
    canvas.width = 0;
    canvas.height = 0;
    canvas = null;

    // Never return a file larger than the original! Also check minimum required savings ratio unless resized.
    const savedBytesRaw = originalBytes - blob.size;
    const savingsRatio = originalBytes > 0 ? savedBytesRaw / originalBytes : 0;

    if (blob.size >= originalBytes || (!wasResized && savingsRatio < plan.minSavingsRatioToKeep)) {
      return {
        file,
        originalBytes,
        compressedBytes: originalBytes,
        savedBytes: 0,
        savingsPercent: 0,
        originalWidth,
        originalHeight,
        width: originalWidth,
        height: originalHeight,
        outputFormat: file.type || 'image/jpeg',
        hasTransparency,
        tier: plan.tier,
        wasCompressed: false,
      };
    }

    const outputName = replaceFileExtension(file.name, extension);
    const compressedFile = new File([blob], outputName, {
      type: targetMime,
      lastModified: Date.now(),
    });

    const savedBytes = Math.max(0, originalBytes - compressedFile.size);
    const savingsPercent =
      originalBytes > 0 ? Math.round((savedBytes / originalBytes) * 100) : 0;

    return {
      file: compressedFile,
      originalBytes,
      compressedBytes: compressedFile.size,
      savedBytes,
      savingsPercent,
      originalWidth,
      originalHeight,
      width,
      height,
      outputFormat: targetMime,
      hasTransparency,
      tier: plan.tier,
      wasCompressed: true,
    };
  } catch (err) {
    if (decoded) {
      decoded.cleanup();
    }
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }

    // Graceful fallback: if decode failed (e.g. HEIC on a desktop browser without HEVC codec)
    // and the original file is within reasonable platform limits (<= 15 MB), allow uploading original with warning
    if (originalBytes <= 15 * MB) {
      return {
        file,
        originalBytes,
        compressedBytes: originalBytes,
        savedBytes: 0,
        savingsPercent: 0,
        originalWidth: 0,
        originalHeight: 0,
        width: 0,
        height: 0,
        outputFormat: file.type || 'application/octet-stream',
        hasTransparency: false,
        tier: 'passthrough',
        wasCompressed: false,
        fallbackReason:
          err instanceof Error
            ? err.message
            : 'Used original image because browser optimization was unavailable for this format.',
      };
    }

    throw new Error(
      `Could not optimize "${file.name}" (${(originalBytes / MB).toFixed(1)} MB). Please try a JPEG or PNG photo under 15 MB.`
    );
  }
}

/**
 * Processes multiple uploaded images with controlled concurrency (default: 2 at a time)
 * and yields to the main thread between items so mobile browsers stay 60fps responsive.
 */
export async function compressImageBatch(
  files: File[],
  options: ImageCompressionOptions & {
    concurrency?: number;
    onProgress?: (completed: number, total: number, currentFileName: string) => void;
  } = {}
): Promise<{
  results: ImageCompressionResult[];
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  totalSavedBytes: number;
  totalSavingsPercent: number;
}> {
  const { concurrency = 2, onProgress, onStatus, ...restOptions } = options;
  const total = files.length;
  const results: ImageCompressionResult[] = new Array(total);
  let nextIndex = 0;
  let completedCount = 0;

  const worker = async () => {
    while (nextIndex < total) {
      const currentIdx = nextIndex++;
      const currentFile = files[currentIdx];

      onStatus?.(
        total > 1
          ? `Optimizing photo ${currentIdx + 1} of ${total} ("${currentFile.name}")…`
          : `Optimizing "${currentFile.name}"…`
      );

      // Yield briefly to keep mobile UI thread responsive during multi-photo selections
      await new Promise((r) => setTimeout(r, 0));

      const res = await compressImageFile(currentFile, restOptions);
      results[currentIdx] = res;
      completedCount++;
      onProgress?.(completedCount, total, currentFile.name);
    }
  };

  const workerCount = Math.max(1, Math.min(concurrency, total));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  let totalOriginalBytes = 0;
  let totalCompressedBytes = 0;
  for (const r of results) {
    if (r) {
      totalOriginalBytes += r.originalBytes;
      totalCompressedBytes += r.compressedBytes;
    }
  }
  const totalSavedBytes = Math.max(0, totalOriginalBytes - totalCompressedBytes);
  const totalSavingsPercent =
    totalOriginalBytes > 0
      ? Math.round((totalSavedBytes / totalOriginalBytes) * 100)
      : 0;

  return {
    results,
    totalOriginalBytes,
    totalCompressedBytes,
    totalSavedBytes,
    totalSavingsPercent,
  };
}
