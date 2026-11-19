import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Heart,
  Upload,
  CheckCircle2,
  Eye,
  Save,
  Plus,
  Trash2,
  Music,
  Cloud,
  ArrowLeft,
  Download,
  Lock,
  ArrowUp,
  ArrowDown,
  Mic,
  Square,
  Play,
  Pause,
  Sparkles,
  Scissors,
  Film,
  HardDrive,
  AlertTriangle,
} from 'lucide-react';
import {
  ChasingHerProjectData,
  MemoriesProjectData,
  MusicLibraryTrack,
  SLIDESHOW_EFFECTS,
  ActiveBuildMediaItem,
  ProjectMediaMeta,
  buildHeartMosaicLayout,
  computeChasingHerProgress,
  computeMemoriesProgress,
  computeProjectStorageUsage,
  canAddFileToBuild,
  commitProjectSavedMedia,
  formatStorageMegabytes,
  formatStorageCompact,
} from '../utils/platformLogic';
import {
  uploadMediaToFirebase,
  deleteMediaFromFirebase,
  ROMANTIC_GALLERY,
  DEFAULT_FLOWER_POOL,
  INITIAL_MUSIC_LIBRARY,
} from '../utils/supabaseAndOci';
import {
  saveChasingHerProjectToFirestore,
  saveMemoriesProjectToFirestore,
} from '../utils/firebaseClient';
import { compressImageBatch } from '../utils/imageCompression';
import {
  buildChasingHerStandaloneHtml,
  buildMemoriesStandaloneHtml,
} from '../utils/htmlExporter';
import { RecipientSitePreview } from './RecipientSitePreview';

interface SiteBuilderStudioProps {
  mode: 'customer' | 'admin';
  initialProduct: 'chasing-her' | 'memories';
  activeSlug: string;
  chasingHerProjects: Record<string, ChasingHerProjectData>;
  memoriesProjects: Record<string, MemoriesProjectData>;
  onSaveChasingHer: (slug: string, data: ChasingHerProjectData) => void;
  onSaveMemories: (slug: string, data: MemoriesProjectData) => void;
  onBackToAccount?: () => void;
  globalFlowerPool?: string[];
  globalMusicLibrary?: MusicLibraryTrack[];
}

function makeDefaultChasingHer(slug: string): ChasingHerProjectData {
  return {
    slug,
    pin: '140226',
    intro_message: 'Every ordinary day becomes unforgettable because you are in it.',
    letter_title: 'My Dearest,',
    letter_body:
      'Every moment with you feels like a gift I never want to stop unwrapping.\n\nForever yours.',
    final_message: 'I love you to the moon and back.',
    photos: [
      { url: ROMANTIC_GALLERY[0], caption: 'First Date' },
      { url: ROMANTIC_GALLERY[1], caption: 'Anniversary Dinner' },
      { url: ROMANTIC_GALLERY[2], caption: 'Our Favorite Trip' },
    ],
    flower_images: DEFAULT_FLOWER_POOL,
    songs: [
      {
        title: 'Love Nwantiti (Acoustic)',
        artist: 'CKay',
        duration: '2:26',
        spotify_url: 'https://open.spotify.com/track/2Xr1dTzJee307rmrkt8c0g',
      },
    ],
    music_url: '',
    music_start: 0,
    music_end: null,
  };
}

function makeDefaultMemories(slug: string): MemoriesProjectData {
  return {
    slug,
    pin: '250824',
    hero_title: 'For My Love',
    hero_subtitle: 'I gathered our favorite moments into one place… tap the heart to begin.',
    collage_names: 'Wanjiku & Brian',
    collage_day: '14',
    collage_month: '02',
    collage_year: '2026',
    collage_quote: 'Every love story is beautiful, but ours is my favorite.',
    mosaic_images: ROMANTIC_GALLERY.slice(0, 6),
    letter_title: 'To My Heart,',
    letter_body:
      'Every picture in that heart holds a moment, and every moment holds our story together.\n\nForever yours.',
    final_message: 'Always & Forever',
    memories: [
      {
        url: ROMANTIC_GALLERY[0],
        type: 'image',
        caption: 'Golden hour by the water',
        date: '2025',
        place: 'Accra / Nairobi',
        transition: 'fade',
        duration: 6,
      },
      {
        url: ROMANTIC_GALLERY[1],
        type: 'image',
        caption: 'Our quiet Sunday mornings',
        date: '2025',
        place: 'Together',
        transition: 'zoom-in',
        duration: 6,
      },
    ],
    flower_images: DEFAULT_FLOWER_POOL,
    music_url: '',
    music_start: 0,
    music_end: null,
    voice_url: '',
  };
}

function formatSec(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function swapItems<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const target = idx + dir;
  if (target < 0 || target >= arr.length) return arr;
  const copy = [...arr];
  const [item] = copy.splice(idx, 1);
  copy.splice(target, 0, item);
  return copy;
}

// Interactive Music Trimmer sub-component
const MusicTrimmer: React.FC<{
  musicUrl?: string;
  musicStart: number;
  musicEnd: number | null | undefined;
  onChangeRange: (start: number, end: number | null) => void;
}> = ({ musicUrl, musicStart, musicEnd, onChangeRange }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [musicUrl]);

  if (!musicUrl) {
    return (
      <div className="rounded-xl bg-[#FBF3EA] border border-[#DCC397] p-3 text-xs text-[#7A5A47]">
        Pick a track from the Shared Music Library or upload your own audio above to unlock precision start/end trimming.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#FBF3EA] border border-[#DCC397] p-4 space-y-3">
      <audio
        ref={audioRef}
        src={musicUrl}
        onLoadedMetadata={(e) => {
          const d = (e.target as HTMLAudioElement).duration || 0;
          setDuration(d);
        }}
        onTimeUpdate={(e) => {
          const el = e.target as HTMLAudioElement;
          setCurrentTime(el.currentTime);
          if (musicEnd !== null && musicEnd !== undefined && el.currentTime >= musicEnd) {
            el.pause();
            setPlaying(false);
          }
        }}
        onEnded={() => setPlaying(false)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#33101B]">
        <span className="font-semibold flex items-center gap-1.5">
          <Scissors className="w-3.5 h-3.5 text-[#7A1C33]" />
          <span>Song Segment Trimmer</span>
        </span>
        <span className="font-mono tabular-nums text-[#7A1C33]">
          {formatSec(musicStart)} → {musicEnd ? formatSec(musicEnd) : duration ? formatSec(duration) : 'Full'}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={Math.max(1, Math.round(duration || 180))}
        step={1}
        value={Math.round(currentTime)}
        onChange={(e) => {
          const next = Number(e.target.value);
          setCurrentTime(next);
          if (audioRef.current) audioRef.current.currentTime = next;
        }}
        aria-label="Scrub soundtrack playback position"
        className="w-full accent-[#5A1A2C] cursor-pointer"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!audioRef.current) return;
            if (playing) {
              audioRef.current.pause();
              setPlaying(false);
            } else {
              audioRef.current.play().catch(() => {});
              setPlaying(true);
            }
          }}
          className="min-h-[38px] px-3 rounded-lg bg-[#5A1A2C] text-[#FBF3EA] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{playing ? 'Pause' : 'Play'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!audioRef.current) return;
            audioRef.current.currentTime = musicStart;
            audioRef.current.play().catch(() => {});
            setPlaying(true);
          }}
          className="min-h-[38px] px-3 rounded-lg border border-[#DCC397] bg-white text-[#33101B] text-xs font-medium cursor-pointer"
        >
          Play Trimmed Segment
        </button>

        <button
          type="button"
          onClick={() => {
            const nextStart = Math.floor(currentTime);
            const nextEnd =
              musicEnd !== null && musicEnd !== undefined && musicEnd <= nextStart
                ? null
                : musicEnd ?? null;
            onChangeRange(nextStart, nextEnd);
          }}
          className="min-h-[38px] px-3 rounded-lg border border-[#5A1A2C]/40 bg-white text-[#5A1A2C] text-xs font-semibold cursor-pointer"
        >
          Start Here ({formatSec(currentTime)})
        </button>

        <button
          type="button"
          onClick={() => {
            const nextEnd = Math.ceil(currentTime);
            if (nextEnd > musicStart) {
              onChangeRange(musicStart, nextEnd);
            }
          }}
          className="min-h-[38px] px-3 rounded-lg border border-[#5A1A2C]/40 bg-white text-[#5A1A2C] text-xs font-semibold cursor-pointer"
        >
          End Here ({formatSec(currentTime)})
        </button>

        {(musicStart > 0 || (musicEnd !== null && musicEnd !== undefined)) && (
          <button
            type="button"
            onClick={() => onChangeRange(0, null)}
            className="min-h-[38px] px-2.5 rounded-lg text-xs text-[#9C2D2D] hover:underline cursor-pointer"
          >
            Clear Trim
          </button>
        )}
      </div>
    </div>
  );
};

export const SiteBuilderStudio: React.FC<SiteBuilderStudioProps> = ({
  mode,
  initialProduct,
  activeSlug,
  chasingHerProjects,
  memoriesProjects,
  onSaveChasingHer,
  onSaveMemories,
  onBackToAccount,
  globalFlowerPool = DEFAULT_FLOWER_POOL,
  globalMusicLibrary = INITIAL_MUSIC_LIBRARY,
}) => {
  const [product, setProduct] = useState<'chasing-her' | 'memories'>(initialProduct);
  const [slug, setSlug] = useState(activeSlug || 'ama-and-kofi');
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [uploadingStatus, setUploadingStatus] = useState<string>('');
  const [saveBanner, setSaveBanner] = useState<string>('');
  const [quotaErrorBanner, setQuotaErrorBanner] = useState<string>('');
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);
  const [uploadProgressDetail, setUploadProgressDetail] = useState<{
    stage: string;
    completed: number;
    total: number;
  } | null>(null);
  const stagedBlobFilesRef = useRef<
    Record<
      string,
      {
        file: File;
        kind: 'images' | 'video' | 'music' | 'voice';
        originalBytes: number;
        width?: number;
        height?: number;
      }
    >
  >({});

  const [chForm, setChForm] = useState<ChasingHerProjectData>(
    () => chasingHerProjects[activeSlug] || makeDefaultChasingHer(activeSlug || 'ama-and-kofi')
  );
  const [memForm, setMemForm] = useState<MemoriesProjectData>(
    () => memoriesProjects[activeSlug] || makeDefaultMemories(activeSlug || 'wanjiku-and-brian')
  );

  // Voice Note Live Recorder state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const releaseMediaUrlResources = (url: string | undefined) => {
    if (!url) return;
    if (stagedBlobFilesRef.current[url]) {
      delete stagedBlobFilesRef.current[url];
    }
    if (url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    } else if (url.startsWith('/uploads/firebase/')) {
      deleteMediaFromFirebase(url);
    }
  };

  // Sync product & slug changes cleanly from parent (e.g. switching projects in Unified Admin)
  useEffect(() => {
    setProduct(initialProduct);
    setQuotaErrorBanner('');
  }, [initialProduct]);

  useEffect(() => {
    const cleanSlug = activeSlug || 'ama-and-kofi';
    setSlug(cleanSlug);
    setChForm(chasingHerProjects[cleanSlug] || makeDefaultChasingHer(cleanSlug));
    setMemForm(memoriesProjects[cleanSlug] || makeDefaultMemories(cleanSlug));
    setQuotaErrorBanner('');
  }, [activeSlug, chasingHerProjects, memoriesProjects]);

  const mosaicPreviewSlots = useMemo(() => buildHeartMosaicLayout(9, 7), []);

  const progress =
    product === 'chasing-her'
      ? computeChasingHerProgress(chForm)
      : computeMemoriesProgress(memForm);

  const storageUsage = useMemo(
    () => computeProjectStorageUsage(product === 'chasing-her' ? chForm : memForm, product),
    [product, chForm, memForm]
  );

  const handleRemoveActiveMediaItem = (item: ActiveBuildMediaItem) => {
    setQuotaErrorBanner('');
    releaseMediaUrlResources(item.url);

    if (item.targetType === 'music') {
      if (product === 'chasing-her') {
        setChForm((p) => ({ ...p, music_url: '', music_start: 0, music_end: null }));
      } else {
        setMemForm((p) => ({ ...p, music_url: '', music_start: 0, music_end: null }));
      }
    } else if (item.targetType === 'voice') {
      setMemForm((p) => ({ ...p, voice_url: '' }));
    } else if (item.targetType === 'ch-photo') {
      setChForm((p) => ({
        ...p,
        photos: p.photos.filter((_, idx) => idx !== item.index),
      }));
    } else if (item.targetType === 'mem-mosaic') {
      setMemForm((p) => ({
        ...p,
        mosaic_images: p.mosaic_images.filter((_, idx) => idx !== item.index),
      }));
    } else if (item.targetType === 'mem-slide') {
      setMemForm((p) => ({
        ...p,
        memories: p.memories.filter((_, idx) => idx !== item.index),
      }));
    } else if (item.targetType === 'flower') {
      if (product === 'chasing-her') {
        setChForm((p) => ({
          ...p,
          flower_images: p.flower_images.filter((u) => u !== item.url),
        }));
      } else {
        setMemForm((p) => ({
          ...p,
          flower_images: p.flower_images.filter((u) => u !== item.url),
        }));
      }
    }
    setUploadingStatus(
      `Removed "${item.name}" — freed ${formatStorageCompact(item.sizeBytes)} from your 50 MB build.`
    );
    setTimeout(() => setUploadingStatus(''), 3500);
  };

  const handleFirebaseFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'ch-photo' | 'flower' | 'mem-mosaic' | 'mem-slide' | 'voice' | 'music'
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    if (isProcessingUpload) {
      e.target.value = '';
      return;
    }

    const rawFiles: File[] = Array.from(fileList);
    e.target.value = '';

    setQuotaErrorBanner('');
    setIsProcessingUpload(true);
    setUploadProgressDetail({
      stage: 'Preparing image…',
      completed: 0,
      total: rawFiles.length,
    });
    setUploadingStatus('Preparing image…');

    try {
      let runningUsedBytes = storageUsage.usedBytes;
      const activeMusicItem = storageUsage.activeFiles.find((f) => f.targetType === 'music');
      const activeVoiceItem = storageUsage.activeFiles.find((f) => f.targetType === 'voice');

      // Separate image files for automatic client-side compression before quota check & upload
      const isImageTarget =
        target === 'ch-photo' || target === 'flower' || target === 'mem-mosaic';

      let totalBatchOriginalBytes = 0;
      let totalBatchCompressedBytes = 0;
      let compressedImageCount = 0;

      // Process in controlled concurrency batches for images, or direct for audio/video
      const imageIndices: number[] = [];
      const imageFilesToCompress: File[] = [];

      rawFiles.forEach((f, idx) => {
        const isImg =
          isImageTarget ||
          (target === 'mem-slide' &&
            !f.type.startsWith('video/') &&
            (f.type.startsWith('image/') ||
              /\.(jpe?g|png|webp|heic|heif|bmp|avif|svg|gif)$/i.test(f.name)));
        if (isImg) {
          imageIndices.push(idx);
          imageFilesToCompress.push(f);
        }
      });

      const compressedByIndex = new Map<
        number,
        Awaited<ReturnType<typeof compressImageBatch>>['results'][number]
      >();

      if (imageFilesToCompress.length > 0) {
        setUploadProgressDetail({
          stage: 'Optimizing image…',
          completed: 0,
          total: imageFilesToCompress.length,
        });
        setUploadingStatus(
          imageFilesToCompress.length > 1
            ? `Optimizing ${imageFilesToCompress.length} images…`
            : 'Optimizing image…'
        );

        const batchOut = await compressImageBatch(imageFilesToCompress, {
          concurrency: 2,
          forcePreserveTransparency: target === 'flower',
          onStatus: (msg) => setUploadingStatus(msg),
          onProgress: (done, tot) => {
            setUploadProgressDetail({
              stage: 'Optimizing image…',
              completed: done,
              total: tot,
            });
          },
        });

        batchOut.results.forEach((res, i) => {
          compressedByIndex.set(imageIndices[i], res);
        });
      }

      for (let i = 0; i < rawFiles.length; i++) {
        const rawFile = rawFiles[i];
        const compResult = compressedByIndex.get(i);
        // Use the compressed file (never retain both original and compressed file in memory/storage)
        const finalFile = compResult ? compResult.file : rawFile;
        const originalBytes = compResult ? compResult.originalBytes : rawFile.size;
        const storedBytes = finalFile.size;
        const savedBytes = Math.max(0, originalBytes - storedBytes);

        totalBatchOriginalBytes += originalBytes;
        totalBatchCompressedBytes += storedBytes;
        if (compResult) compressedImageCount++;

        const replacedBytes =
          target === 'music'
            ? activeMusicItem?.sizeBytes || 0
            : target === 'voice'
            ? activeVoiceItem?.sizeBytes || 0
            : 0;

        // Storage usage reflects the actual compressed bytes stored, not the original un-optimized device size
        const check = canAddFileToBuild(runningUsedBytes, storedBytes, replacedBytes);
        if (!check.allowed) {
          setQuotaErrorBanner(
            check.error ||
              'Your 50.0 MB paid build storage is full. Remove unwanted audio or media files to upload more.'
          );
          break;
        }

        runningUsedBytes = check.nextUsedBytes;
        const kind: 'images' | 'video' | 'music' | 'voice' =
          target === 'voice'
            ? 'voice'
            : target === 'music'
            ? 'music'
            : finalFile.type.startsWith('video/')
            ? 'video'
            : 'images';

        const category: ProjectMediaMeta['category'] =
          target === 'music'
            ? 'music'
            : target === 'voice'
            ? 'voice'
            : target === 'flower'
            ? 'flower'
            : finalFile.type.startsWith('video/')
            ? 'video'
            : 'photo';

        // Clean up replaced single-slot audio URLs immediately
        if (target === 'music' && activeMusicItem?.url) {
          releaseMediaUrlResources(activeMusicItem.url);
        } else if (target === 'voice' && activeVoiceItem?.url) {
          releaseMediaUrlResources(activeVoiceItem.url);
        }

        const stagedUrl = URL.createObjectURL(finalFile);
        stagedBlobFilesRef.current[stagedUrl] = {
          file: finalFile,
          kind,
          originalBytes,
          width: compResult?.width,
          height: compResult?.height,
        };

        const stagedMeta: ProjectMediaMeta = {
          url: stagedUrl,
          name: finalFile.name,
          sizeBytes: storedBytes,
          originalSizeBytes: originalBytes,
          savedBytes,
          width: compResult?.width,
          height: compResult?.height,
          outputFormat: compResult?.outputFormat || finalFile.type,
          category,
          status: 'staged',
        };

        const cleanCaption = rawFile.name.replace(/\.[^.]+$/, '');

        if (target === 'ch-photo') {
          setChForm((prev) => ({
            ...prev,
            photos: [...prev.photos, { url: stagedUrl, caption: cleanCaption }],
            media_meta: { ...(prev.media_meta || {}), [stagedUrl]: stagedMeta },
          }));
        } else if (target === 'flower') {
          if (product === 'chasing-her') {
            setChForm((prev) => ({
              ...prev,
              flower_images: [...prev.flower_images, stagedUrl],
              media_meta: { ...(prev.media_meta || {}), [stagedUrl]: stagedMeta },
            }));
          } else {
            setMemForm((prev) => ({
              ...prev,
              flower_images: [...prev.flower_images, stagedUrl],
              media_meta: { ...(prev.media_meta || {}), [stagedUrl]: stagedMeta },
            }));
          }
        } else if (target === 'mem-mosaic') {
          setMemForm((prev) => ({
            ...prev,
            mosaic_images: [...prev.mosaic_images, stagedUrl],
            media_meta: { ...(prev.media_meta || {}), [stagedUrl]: stagedMeta },
          }));
        } else if (target === 'mem-slide') {
          setMemForm((prev) => ({
            ...prev,
            memories: [
              ...prev.memories,
              {
                url: stagedUrl,
                type: finalFile.type.startsWith('video/') ? 'video' : 'image',
                caption: cleanCaption || 'New cherished moment',
                date: '2026',
                place: 'Our Story',
                transition: 'fade',
                duration: 6,
                muted: true,
              },
            ],
            media_meta: { ...(prev.media_meta || {}), [stagedUrl]: stagedMeta },
          }));
        } else if (target === 'voice') {
          setMemForm((prev) => ({
            ...prev,
            voice_url: stagedUrl,
            media_meta: { ...(prev.media_meta || {}), [stagedUrl]: stagedMeta },
          }));
        } else if (target === 'music') {
          if (product === 'chasing-her') {
            setChForm((prev) => ({
              ...prev,
              music_url: stagedUrl,
              music_start: 0,
              music_end: null,
              media_meta: { ...(prev.media_meta || {}), [stagedUrl]: stagedMeta },
            }));
          } else {
            setMemForm((prev) => ({
              ...prev,
              music_url: stagedUrl,
              music_start: 0,
              music_end: null,
              media_meta: { ...(prev.media_meta || {}), [stagedUrl]: stagedMeta },
            }));
          }
        }
      }

      const batchSaved = Math.max(0, totalBatchOriginalBytes - totalBatchCompressedBytes);
      const batchSavedPct =
        totalBatchOriginalBytes > 0
          ? Math.round((batchSaved / totalBatchOriginalBytes) * 100)
          : 0;

      setUploadProgressDetail({
        stage: 'Upload complete',
        completed: rawFiles.length,
        total: rawFiles.length,
      });

      if (compressedImageCount > 0 && batchSaved > 0) {
        setUploadingStatus(
          `Upload complete · Optimized ${formatStorageCompact(
            totalBatchOriginalBytes
          )} → ${formatStorageCompact(totalBatchCompressedBytes)} (${batchSavedPct}% storage saved)`
        );
      } else if (target === 'music' || target === 'voice') {
        setUploadingStatus(
          'Audio staged in your 50 MB build! Only the final audio you keep & save gets permanently stored.'
        );
      } else {
        setUploadingStatus(
          `Upload complete · ${formatStorageCompact(totalBatchCompressedBytes)} staged in your 50 MB build.`
        );
      }
    } catch (err) {
      setQuotaErrorBanner(
        err instanceof Error
          ? err.message
          : 'Could not optimize or stage the selected image. Please try another photo.'
      );
      setUploadingStatus('');
    } finally {
      setIsProcessingUpload(false);
      setTimeout(() => {
        setUploadProgressDetail(null);
      }, 2500);
      setTimeout(() => setUploadingStatus(''), 5500);
    }
  };

  const handleToggleVoiceRecorder = async () => {
    if (isRecordingVoice) {
      mediaRecorderRef.current?.stop();
      setIsRecordingVoice(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        const activeVoiceItem = storageUsage.activeFiles.find((f) => f.targetType === 'voice');
        const check = canAddFileToBuild(
          storageUsage.usedBytes,
          file.size,
          activeVoiceItem?.sizeBytes || 0
        );
        if (!check.allowed) {
          setQuotaErrorBanner(
            check.error ||
              'Your 50.0 MB paid build storage is full. Remove unwanted files to fit this voice recording.'
          );
          return;
        }

        if (activeVoiceItem?.url) {
          releaseMediaUrlResources(activeVoiceItem.url);
        }
        const localUrl = URL.createObjectURL(blob);
        stagedBlobFilesRef.current[localUrl] = {
          file,
          kind: 'voice',
          originalBytes: file.size,
        };
        setMemForm((prev) => ({
          ...prev,
          voice_url: localUrl,
          media_meta: {
            ...(prev.media_meta || {}),
            [localUrl]: {
              url: localUrl,
              name: file.name,
              sizeBytes: file.size,
              originalSizeBytes: file.size,
              savedBytes: 0,
              category: 'voice',
              status: 'staged',
            },
          },
        }));
        setUploadingStatus(
          'Voice note staged! Click Save & Publish when you are ready to permanently store it.'
        );
        setTimeout(() => setUploadingStatus(''), 3500);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingSeconds(0);
      setIsRecordingVoice(true);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setUploadingStatus('Microphone permission denied or unavailable on this browser.');
      setTimeout(() => setUploadingStatus(''), 3500);
    }
  };

  const handleSaveProject = async () => {
    setQuotaErrorBanner('');
    setSaveBanner('Uploading…');
    let hadUploadFailure = false;

    if (product === 'chasing-her') {
      let working: ChasingHerProjectData = { ...chForm, slug };
      const currentUsage = computeProjectStorageUsage(working, 'chasing-her');

      // Upload ONLY the active staged files that the customer kept in their final build
      for (const item of currentUsage.activeFiles) {
        if (item.status === 'staged' && stagedBlobFilesRef.current[item.url]) {
          try {
            const { file, kind, originalBytes, width, height } =
              stagedBlobFilesRef.current[item.url];
            const uploaded = await uploadMediaToFirebase({
              file,
              kind,
              projectSlug: slug,
              alreadyCompressed: true,
              originalBytes,
              width,
              height,
            });
            const permanentUrl = uploaded.url;
            releaseMediaUrlResources(item.url);

            if (working.music_url === item.url) working.music_url = permanentUrl;
            working.photos = working.photos.map((p) =>
              p.url === item.url ? { ...p, url: permanentUrl } : p
            );
            working.flower_images = working.flower_images.map((u) =>
              u === item.url ? permanentUrl : u
            );
            working.media_meta = {
              ...(working.media_meta || {}),
              [permanentUrl]: {
                url: permanentUrl,
                name: item.name,
                sizeBytes: uploaded.sizeBytes || item.sizeBytes,
                originalSizeBytes: uploaded.originalBytes || item.originalSizeBytes,
                savedBytes: uploaded.savedBytes ?? item.savedBytes,
                width: uploaded.width || item.width,
                height: uploaded.height || item.height,
                outputFormat: uploaded.contentType || item.outputFormat,
                category: item.category,
                status: 'saved',
              },
            };
          } catch {
            hadUploadFailure = true;
          }
        }
      }

      if (hadUploadFailure) {
        setChForm(working);
        setQuotaErrorBanner(
          'Network connection interrupted while uploading to Firebase storage. Your optimized photos remain safely staged — tap Save & Publish to retry.'
        );
        setSaveBanner('');
        return;
      }

      const { committedProject, purgedStagedUrls } = commitProjectSavedMedia(
        working,
        'chasing-her'
      );
      for (const purgedUrl of purgedStagedUrls) {
        releaseMediaUrlResources(purgedUrl);
      }

      setChForm(committedProject);
      onSaveChasingHer(slug, committedProject);
      try {
        await saveChasingHerProjectToFirestore(slug, committedProject);
      } catch {
        // continue with local persistence when user is not signed in with Google
      }
    } else {
      let working: MemoriesProjectData = { ...memForm, slug };
      const currentUsage = computeProjectStorageUsage(working, 'memories');

      for (const item of currentUsage.activeFiles) {
        if (item.status === 'staged' && stagedBlobFilesRef.current[item.url]) {
          try {
            const { file, kind, originalBytes, width, height } =
              stagedBlobFilesRef.current[item.url];
            const uploaded = await uploadMediaToFirebase({
              file,
              kind,
              projectSlug: slug,
              alreadyCompressed: true,
              originalBytes,
              width,
              height,
            });
            const permanentUrl = uploaded.url;
            releaseMediaUrlResources(item.url);

            if (working.music_url === item.url) working.music_url = permanentUrl;
            if (working.voice_url === item.url) working.voice_url = permanentUrl;
            working.mosaic_images = working.mosaic_images.map((u) =>
              u === item.url ? permanentUrl : u
            );
            working.memories = working.memories.map((m) =>
              m.url === item.url ? { ...m, url: permanentUrl } : m
            );
            working.flower_images = working.flower_images.map((u) =>
              u === item.url ? permanentUrl : u
            );
            working.media_meta = {
              ...(working.media_meta || {}),
              [permanentUrl]: {
                url: permanentUrl,
                name: item.name,
                sizeBytes: uploaded.sizeBytes || item.sizeBytes,
                originalSizeBytes: uploaded.originalBytes || item.originalSizeBytes,
                savedBytes: uploaded.savedBytes ?? item.savedBytes,
                width: uploaded.width || item.width,
                height: uploaded.height || item.height,
                outputFormat: uploaded.contentType || item.outputFormat,
                category: item.category,
                status: 'saved',
              },
            };
          } catch {
            hadUploadFailure = true;
          }
        }
      }

      if (hadUploadFailure) {
        setMemForm(working);
        setQuotaErrorBanner(
          'Network connection interrupted while uploading to cloud storage. Your optimized photos remain safely staged — tap Save & Publish to retry.'
        );
        setSaveBanner('');
        return;
      }

      const { committedProject, purgedStagedUrls } = commitProjectSavedMedia(
        working,
        'memories'
      );
      for (const purgedUrl of purgedStagedUrls) {
        releaseMediaUrlResources(purgedUrl);
      }

      setMemForm(committedProject);
      onSaveMemories(slug, committedProject);
      try {
        await saveMemoriesProjectToFirestore(slug, committedProject);
      } catch {
        // continue with local persistence when user is not signed in with Google
      }
    }
    setSaveBanner(
      'Upload complete · Chosen audio & optimized WebP photos permanently stored in your 50 MB Firebase build.'
    );
    setTimeout(() => setSaveBanner(''), 4000);
  };

  const handleExportHtml = () => {
    const htmlContent =
      product === 'chasing-her'
        ? buildChasingHerStandaloneHtml(slug, chForm, window.location.origin)
        : buildMemoriesStandaloneHtml(slug, memForm, window.location.origin);

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-${product}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentFlowerList =
    product === 'chasing-her' ? chForm.flower_images : memForm.flower_images;

  const togglePoolFlower = (flowerUrl: string) => {
    const exists = currentFlowerList.includes(flowerUrl);
    const nextList = exists
      ? currentFlowerList.filter((u) => u !== flowerUrl)
      : [...currentFlowerList, flowerUrl];

    if (product === 'chasing-her') {
      setChForm((p) => ({ ...p, flower_images: nextList }));
    } else {
      setMemForm((p) => ({ ...p, flower_images: nextList }));
    }
  };

  const activeMusicLibrary = globalMusicLibrary.filter((m) => m.is_active);
  const currentMusicUrl = product === 'chasing-her' ? chForm.music_url : memForm.music_url;
  const currentMusicStart = (product === 'chasing-her' ? chForm.music_start : memForm.music_start) || 0;
  const currentMusicEnd = product === 'chasing-her' ? chForm.music_end : memForm.music_end;

  return (
    <div className="space-y-6 pb-20">
      {/* Studio Top Bar */}
      <div className="rounded-3xl bg-white border border-[#DCC397] p-4 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBackToAccount && (
            <button
              type="button"
              onClick={onBackToAccount}
              aria-label="Back to My Site"
              className="min-h-[44px] min-w-[44px] rounded-xl border border-[#DCC397] bg-[#FBF3EA] flex items-center justify-center text-[#33101B] hover:bg-[#F3E2CE] cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 text-xs text-[#7A5A47]">
              <span>{mode === 'admin' ? 'Unified Backstage Studio' : 'Self-Serve Love Builder'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-[#5A1A2C] font-semibold">/{slug}</span>
            </div>
            <h2 className="font-['Fraunces'] text-xl sm:text-2xl text-[#2B1318]">
              {product === 'chasing-her'
                ? 'Chasing Her — Polaroid Wall, Flower Curtain & Sealed Letter'
                : 'Memories — 34-Photo Heart Mosaic, 9-FX Slideshow & Voice Duet'}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 shrink-0">
          {mode === 'admin' ? (
            <div className="inline-flex rounded-xl bg-[#F4E6D6] p-1 border border-[#DCC397] shrink-0">
              <button
                type="button"
                onClick={() => setProduct('chasing-her')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  product === 'chasing-her'
                    ? 'bg-[#5A1A2C] text-[#FBF3EA]'
                    : 'text-[#5C3D31] hover:text-[#2B1318]'
                }`}
              >
                Chasing Her
              </button>
              <button
                type="button"
                onClick={() => setProduct('memories')}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                  product === 'memories'
                    ? 'bg-[#5A1A2C] text-[#FBF3EA]'
                    : 'text-[#5C3D31] hover:text-[#2B1318]'
                }`}
              >
                Memories
              </button>
            </div>
          ) : (
            <div
              data-testid="locked-paid-edition-badge"
              className="inline-flex items-center gap-2 rounded-xl bg-[#FBF3EA] px-3.5 py-2 border border-[#DCC397] text-xs font-bold text-[#5A1A2C] whitespace-nowrap shrink-0"
            >
              <Lock className="h-3.5 w-3.5 text-[#7A1C33] shrink-0" />
              <span>
                Paid Edition: {product === 'chasing-her' ? 'Chasing Her' : 'Memories (34-Heart)'}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowMobilePreview((v) => !v)}
            className="lg:hidden min-h-[44px] px-4 py-2 rounded-xl border border-[#5A1A2C] text-xs font-bold text-[#5A1A2C] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Eye className="h-4 w-4" />
            <span>{showMobilePreview ? 'Edit Content' : 'Live Preview'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportHtml}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-[#DCC397] bg-[#FBF3EA] text-xs font-semibold text-[#33101B] hover:bg-[#F3E2CE] flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4 text-[#7A1C33] shrink-0" />
            <span>Export Full HTML</span>
          </button>

          <button
            type="button"
            onClick={handleSaveProject}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#5A1A2C] hover:bg-[#42111F] text-xs font-bold text-[#FBF3EA] flex items-center gap-2 shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            <Save className="h-4 w-4 text-[#E2B96F] shrink-0" />
            <span>Save & Publish</span>
          </button>
        </div>
      </div>

      {/* Readiness Checklist */}
      <div className="rounded-2xl bg-[#F5E7D8] border border-[#DCC397] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#33101B]">
            <span>Site Readiness Checklist ({progress.completed}/{progress.total} complete)</span>
            <span className="font-mono tabular-nums text-[#7A1C33]">{progress.percent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#E3CBB3] overflow-hidden">
            <div
              className="h-full bg-[#5A1A2C] transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            {progress.items.map((item) => (
              <span
                key={item.label}
                className={`text-xs flex items-center gap-1 ${
                  item.done ? 'text-[#2E6B47] font-medium' : 'text-[#7A5A47]'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{item.label}</span>
              </span>
            ))}
          </div>
        </div>

        {(uploadingStatus || saveBanner || uploadProgressDetail) && (
          <div
            role="status"
            data-testid="upload-optimization-status"
            className="rounded-xl bg-[#3A0D18] text-[#E2B96F] px-4 py-2.5 text-xs font-semibold flex items-center gap-2 shrink-0"
          >
            <Cloud className="h-4 w-4 shrink-0" />
            <span>
              {uploadingStatus ||
                saveBanner ||
                (uploadProgressDetail
                  ? `${uploadProgressDetail.stage} (${uploadProgressDetail.completed}/${uploadProgressDetail.total})`
                  : '')}
            </span>
          </div>
        )}
      </div>

      {/* 50 MB Paid Build Media Storage & Audio Staging Manager */}
      <div
        data-testid="build-storage-quota-panel"
        className="rounded-3xl bg-white border border-[#DCC397] p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#3A0D18] text-[#E2B96F] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                <HardDrive className="h-3.5 w-3.5" />
                <span>50.0 MB Paid Build Storage</span>
              </span>
              {storageUsage.totalCompressionSavedBytes > 0 && (
                <span
                  data-testid="compression-savings-badge"
                  className="inline-flex items-center gap-1 rounded-lg bg-[#E7F4EC] border border-[#9CD3B0] text-[#1D5735] px-2.5 py-1 text-[11px] font-bold"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    Auto-Optimized: Saved {formatStorageCompact(storageUsage.totalCompressionSavedBytes)}
                  </span>
                </span>
              )}
              {storageUsage.breakdown.stagedBytes > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#FDF2D0] border border-[#E2B96F] text-[#5C3D10] px-2.5 py-1 text-[11px] font-semibold">
                  <span>
                    {formatStorageMegabytes(storageUsage.breakdown.stagedBytes)} Staged · Only chosen files save permanently on Publish
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#E7F4EC] text-[#215738] px-2.5 py-1 text-[11px] font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>All active audio & media permanently stored</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#6E4F3D]">
              Each paid website build includes <strong>50.0 MB</strong> of media storage. Large phone photos are automatically optimized to crisp WebP on your device before upload, and audio tracks are staged so only the final files you keep on <strong>Save & Publish</strong> consume storage.
            </p>
          </div>

          <div className="flex flex-col sm:items-end justify-center shrink-0">
            <div className="text-sm font-bold text-[#2B1318] font-mono tabular-nums">
              {formatStorageMegabytes(storageUsage.usedBytes)} / 50.0 MB used ({storageUsage.percentUsed}%)
            </div>
            <div className="text-xs text-[#7A5A47] font-mono tabular-nums">
              {formatStorageMegabytes(storageUsage.remainingBytes)} remaining · Audio:{' '}
              {formatStorageMegabytes(storageUsage.breakdown.audioBytes)} · Photos/Video:{' '}
              {formatStorageMegabytes(storageUsage.breakdown.photoVideoBytes)}
            </div>
          </div>
        </div>

        {/* Segmented 50 MB Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded-full bg-[#EFE3D4] overflow-hidden flex border border-[#DCC397]/70">
            <div
              className="h-full bg-[#7A1C33] transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  (storageUsage.breakdown.savedBytes / storageUsage.maxBytes) * 100
                )}%`,
              }}
              title={`Permanently Stored: ${formatStorageMegabytes(
                storageUsage.breakdown.savedBytes
              )}`}
            />
            <div
              className="h-full bg-[#D99B26] transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  (storageUsage.breakdown.stagedBytes / storageUsage.maxBytes) * 100
                )}%`,
              }}
              title={`Staged (Pending Save): ${formatStorageMegabytes(
                storageUsage.breakdown.stagedBytes
              )}`}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7A5A47]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#7A1C33]" />
                <span>Permanently Stored ({formatStorageMegabytes(storageUsage.breakdown.savedBytes)})</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#D99B26]" />
                <span>Staged Unsaved ({formatStorageMegabytes(storageUsage.breakdown.stagedBytes)})</span>
              </span>
            </div>
            <span>
              {storageUsage.isFull
                ? '50.0 MB limit reached — remove unwanted files below to upload more'
                : 'Replace audio anytime or remove unwanted files below to free up space'}
            </span>
          </div>
        </div>

        {/* Quota Exceeded / Full Warning Banner */}
        {(quotaErrorBanner || storageUsage.isFull) && (
          <div
            role="alert"
            data-testid="quota-exceeded-alert"
            className="rounded-2xl bg-[#FDE8E8] border border-[#E5A3A3] px-4 py-3 text-xs text-[#7D1D1D] flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-[#B22626] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  Upload Notice
                </p>
                <p className="mt-0.5">
                  {quotaErrorBanner ||
                    'Your 50.0 MB allocation for this paid build is full. You cannot upload additional files until you remove or replace existing audio, photos, or video files below.'}
                </p>
              </div>
            </div>
            {quotaErrorBanner && (
              <button
                type="button"
                onClick={() => setQuotaErrorBanner('')}
                className="text-[11px] font-bold underline shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* Active Files in This Paid Build (Audio & Visual Media with One-Click Remove) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-[#33101B]">
            <span>
              Active Files in This Build ({storageUsage.activeFiles.length}) — Remove unwanted files anytime
            </span>
            {storageUsage.breakdown.stagedBytes > 0 && (
              <button
                type="button"
                onClick={handleSaveProject}
                className="text-xs font-bold text-[#7A1C33] hover:underline cursor-pointer"
              >
                Commit & Permanently Store Chosen Files →
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto pr-1">
            {storageUsage.activeFiles.map((item) => {
              const isAudio = item.category === 'music' || item.category === 'voice';
              const itemSavedBytes = item.savedBytes || 0;
              return (
                <div
                  key={item.slotKey}
                  data-testid={`active-build-file-${item.slotKey}`}
                  className={`rounded-2xl border p-2.5 flex items-center justify-between gap-2 text-xs ${
                    isAudio
                      ? 'bg-[#FDF6EE] border-[#D9B382]'
                      : 'bg-[#FAF6F0] border-[#E6D5BE]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isAudio
                            ? 'bg-[#5A1A2C] text-[#E2B96F]'
                            : 'bg-[#E6D5BE] text-[#33101B]'
                        }`}
                      >
                        {item.category}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          item.status === 'staged'
                            ? 'bg-[#FDF2D0] text-[#7A4F08] border border-[#E2B96F]'
                            : 'bg-[#E7F4EC] text-[#215738]'
                        }`}
                      >
                        {item.status === 'staged' ? 'Staged (Unsaved)' : 'Saved'}
                      </span>
                    </div>
                    <p className="font-semibold text-[#2B1318] truncate mt-1" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-[11px] text-[#7A5A47] font-mono tabular-nums">
                      {formatStorageCompact(item.sizeBytes)}
                      {itemSavedBytes > 0 && item.originalSizeBytes ? (
                        <span className="text-[#215738] font-semibold">
                          {' '}
                          (was {formatStorageCompact(item.originalSizeBytes)})
                        </span>
                      ) : null}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveActiveMediaItem(item)}
                    aria-label={`Remove ${item.name} from build`}
                    className="min-h-[34px] px-2.5 py-1 rounded-xl bg-[#FDE8E8] hover:bg-[#F9D2D2] text-[#9C2D2D] text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Editor Column */}
        <div className={`lg:col-span-6 space-y-5 ${showMobilePreview ? 'hidden lg:block' : 'block'}`}>
          {/* 01. Slug & Secret PIN */}
          <div className="rounded-3xl bg-white border border-[#DCC397] p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#33101B]">
              <Lock className="h-4 w-4 text-[#7A1C33]" />
              <h3>01. Project Link Slug & Secret Unlock PIN</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block text-xs font-semibold text-[#5C3D31]">
                Project Link Slug
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))}
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-3.5 py-2 text-sm font-mono text-[#2B1318]"
                />
              </label>
              <label className="block text-xs font-semibold text-[#5C3D31]">
                4–6 Digit Secret Passcode
                <input
                  type="text"
                  maxLength={6}
                  value={product === 'chasing-her' ? chForm.pin : memForm.pin}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 6);
                    if (product === 'chasing-her') {
                      setChForm((p) => ({ ...p, pin: digits }));
                    } else {
                      setMemForm((p) => ({ ...p, pin: digits }));
                    }
                  }}
                  placeholder="140226"
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-3.5 py-2 text-sm font-mono tracking-widest text-[#2B1318]"
                />
              </label>
            </div>
          </div>

          {/* 02. Opening Flower Curtain Pool (Restored for BOTH Chasing Her & Memories) */}
          <div className="rounded-3xl bg-white border border-[#DCC397] p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-[#33101B]">
                  <Sparkles className="h-4 w-4 text-[#C2185B]" />
                  <h3>02. Opening Flower Curtain ({currentFlowerList.length} selected)</h3>
                </div>
                <p className="text-xs text-[#7A5A47] mt-0.5">
                  Spinning roses that bloom outward and part open right after unlocking
                </p>
              </div>
              <label className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#5A1A2C] text-[#FBF3EA] text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-[#42111F]">
                <Upload className="h-3.5 w-3.5 text-[#E2B96F]" />
                <span>Upload Flower PNG</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFirebaseFileUpload(e, 'flower')}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7A5A47]">
                Tap flowers from Global Pool to include/remove
              </p>
              <div className="flex flex-wrap gap-2.5">
                {Array.from(new Set([...globalFlowerPool, ...currentFlowerList])).map((url, idx) => {
                  const selected = currentFlowerList.includes(url);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => togglePoolFlower(url)}
                      aria-label={`Toggle flower ${idx + 1}`}
                      className={`relative h-14 w-14 rounded-2xl p-2 border-2 transition cursor-pointer flex items-center justify-center ${
                        selected
                          ? 'border-[#C2185B] bg-[#FDF1E7] shadow-sm scale-105'
                          : 'border-[#E6D5BE] bg-[#FAF7F2] opacity-55 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-contain" />
                      {selected && (
                        <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[#C2185B] text-white text-[10px] font-bold flex items-center justify-center">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {product === 'chasing-her' ? (
            <>
              {/* Chasing Her: 03. Intro & Sealed Love Letter */}
              <div className="rounded-3xl bg-white border border-[#DCC397] p-6 space-y-4">
                <h3 className="font-['Fraunces'] text-lg text-[#33101B]">
                  03. Opening Line & Wax-Sealed Love Letter
                </h3>
                <label className="block text-xs font-semibold text-[#5C3D31]">
                  Hero Opening Line
                  <input
                    type="text"
                    value={chForm.intro_message}
                    onChange={(e) => setChForm((p) => ({ ...p, intro_message: e.target.value }))}
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-3.5 py-2 text-sm text-[#2B1318]"
                  />
                </label>
                <label className="block text-xs font-semibold text-[#5C3D31]">
                  Letter Salutation
                  <input
                    type="text"
                    value={chForm.letter_title}
                    onChange={(e) => setChForm((p) => ({ ...p, letter_title: e.target.value }))}
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-3.5 py-2 text-sm text-[#2B1318]"
                  />
                </label>
                <label className="block text-xs font-semibold text-[#5C3D31]">
                  Your Love Letter Body
                  <textarea
                    rows={5}
                    value={chForm.letter_body}
                    onChange={(e) => setChForm((p) => ({ ...p, letter_body: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-[#DCC397] bg-[#FFFDF9] p-3.5 text-sm text-[#2B1318] leading-relaxed"
                  />
                </label>
                <label className="block text-xs font-semibold text-[#5C3D31]">
                  Closing Promise
                  <input
                    type="text"
                    value={chForm.final_message}
                    onChange={(e) => setChForm((p) => ({ ...p, final_message: e.target.value }))}
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-3.5 py-2 text-sm text-[#2B1318]"
                  />
                </label>
              </div>

              {/* Chasing Her: 04. Polaroid Wall Photos with Captions & Reorder */}
              <div className="rounded-3xl bg-white border border-[#DCC397] p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-['Fraunces'] text-lg text-[#33101B]">
                      04. Polaroid Wall Photos ({chForm.photos.length})
                    </h3>
                    <p className="text-xs text-[#7A5A47]">
                      Edit captions & reorder how they scroll across your hero wall
                    </p>
                  </div>
                  <label className="min-h-[44px] px-4 py-2 rounded-xl bg-[#5A1A2C] text-[#FBF3EA] text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-[#42111F]">
                    <Upload className="h-4 w-4 text-[#E2B96F]" />
                    <span>Upload Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFirebaseFileUpload(e, 'ch-photo')}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-2.5">
                  {chForm.photos.map((photo, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-2xl bg-[#FBF3EA] border border-[#E6D5BE] p-2.5"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || `Photo ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-xl object-cover shrink-0 border border-[#DCC397]"
                      />
                      <input
                        type="text"
                        value={photo.caption || ''}
                        onChange={(e) => {
                          const cap = e.target.value;
                          setChForm((p) => ({
                            ...p,
                            photos: p.photos.map((item, i) =>
                              i === idx ? { ...item, caption: cap } : item
                            ),
                          }));
                        }}
                        placeholder="Polaroid caption (optional)"
                        className="flex-1 min-h-[40px] rounded-lg border border-[#DCC397] bg-white px-3 text-xs text-[#2B1318]"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setChForm((p) => ({ ...p, photos: swapItems(p.photos, idx, -1) }))
                          }
                          disabled={idx === 0}
                          aria-label="Move photo up"
                          className="h-9 w-8 rounded-lg bg-white border border-[#DCC397] text-[#33101B] disabled:opacity-35 flex items-center justify-center cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setChForm((p) => ({ ...p, photos: swapItems(p.photos, idx, 1) }))
                          }
                          disabled={idx === chForm.photos.length - 1}
                          aria-label="Move photo down"
                          className="h-9 w-8 rounded-lg bg-white border border-[#DCC397] text-[#33101B] disabled:opacity-35 flex items-center justify-center cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void releaseMediaUrlResources(photo.url);
                            setChForm((p) => {
                              const nextMeta = { ...(p.media_meta || {}) };
                              delete nextMeta[photo.url];
                              return {
                                ...p,
                                photos: p.photos.filter((_, i) => i !== idx),
                                media_meta: nextMeta,
                              };
                            });
                          }}
                          aria-label={`Remove photo ${idx + 1}`}
                          className="h-9 w-8 rounded-lg bg-[#FDE8E8] text-[#9C2D2D] flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chasing Her: 05. Full SongsEditor (Spotify URL + Duration + Explicit + Reorder) */}
              <div className="rounded-3xl bg-white border border-[#DCC397] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-['Fraunces'] text-lg text-[#33101B]">
                      05. Our Top Songs (Spotify Embeds)
                    </h3>
                    <p className="text-xs text-[#7A5A47]">
                      Paste a Spotify track link to embed the playable player on the final site
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setChForm((p) => ({
                        ...p,
                        songs: [
                          ...p.songs,
                          { title: 'New Song', artist: 'Favorite Artist', duration: '3:30', explicit: false },
                        ],
                      }))
                    }
                    className="min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[#5A1A2C] text-xs font-semibold text-[#5A1A2C] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Song</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {chForm.songs.map((song, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-[#FBF3EA] p-3.5 border border-[#E6D5BE] space-y-2.5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <input
                          type="text"
                          value={song.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setChForm((p) => ({
                              ...p,
                              songs: p.songs.map((s, i) => (i === idx ? { ...s, title: val } : s)),
                            }));
                          }}
                          placeholder="Song title"
                          className="sm:col-span-5 min-h-[40px] rounded-lg border border-[#DCC397] bg-white px-3 text-xs text-[#2B1318]"
                        />
                        <input
                          type="text"
                          value={song.artist}
                          onChange={(e) => {
                            const val = e.target.value;
                            setChForm((p) => ({
                              ...p,
                              songs: p.songs.map((s, i) => (i === idx ? { ...s, artist: val } : s)),
                            }));
                          }}
                          placeholder="Artist"
                          className="sm:col-span-5 min-h-[40px] rounded-lg border border-[#DCC397] bg-white px-3 text-xs text-[#2B1318]"
                        />
                        <input
                          type="text"
                          value={song.duration || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setChForm((p) => ({
                              ...p,
                              songs: p.songs.map((s, i) => (i === idx ? { ...s, duration: val } : s)),
                            }));
                          }}
                          placeholder="3:20"
                          className="sm:col-span-2 min-h-[40px] rounded-lg border border-[#DCC397] bg-white px-2.5 text-xs font-mono text-center text-[#2B1318]"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <input
                          type="url"
                          value={song.spotify_url || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setChForm((p) => ({
                              ...p,
                              songs: p.songs.map((s, i) =>
                                i === idx ? { ...s, spotify_url: val } : s
                              ),
                            }));
                          }}
                          placeholder="https://open.spotify.com/track/..."
                          className="flex-1 min-w-[200px] min-h-[38px] rounded-lg border border-[#DCC397] bg-white px-3 text-xs font-mono text-[#2B1318]"
                        />

                        <label className="inline-flex items-center gap-1.5 text-xs text-[#5C3D31] px-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!song.explicit}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setChForm((p) => ({
                                ...p,
                                songs: p.songs.map((s, i) =>
                                  i === idx ? { ...s, explicit: checked } : s
                                ),
                              }));
                            }}
                          />
                          <span>Explicit</span>
                        </label>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setChForm((p) => ({ ...p, songs: swapItems(p.songs, idx, -1) }))
                            }
                            disabled={idx === 0}
                            className="h-8 w-8 rounded-lg bg-white border border-[#DCC397] text-[#33101B] disabled:opacity-35 flex items-center justify-center cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setChForm((p) => ({ ...p, songs: swapItems(p.songs, idx, 1) }))
                            }
                            disabled={idx === chForm.songs.length - 1}
                            className="h-8 w-8 rounded-lg bg-white border border-[#DCC397] text-[#33101B] disabled:opacity-35 flex items-center justify-center cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setChForm((p) => ({
                                ...p,
                                songs: p.songs.filter((_, i) => i !== idx),
                              }))
                            }
                            aria-label={`Delete song ${song.title}`}
                            className="h-8 w-8 rounded-lg bg-[#FDE8E8] text-[#9C2D2D] flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Memories: 03. Intro & Heart Mosaic Header */}
              <div className="rounded-3xl bg-white border border-[#DCC397] p-6 space-y-4">
                <h3 className="font-['Fraunces'] text-lg text-[#33101B]">
                  03. Intro Gate, Couple Names & Center Heart Note
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block text-xs font-semibold text-[#5C3D31]">
                    Intro Screen Title
                    <input
                      type="text"
                      value={memForm.hero_title}
                      onChange={(e) => setMemForm((p) => ({ ...p, hero_title: e.target.value }))}
                      className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-3.5 py-2 text-sm text-[#2B1318]"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-[#5C3D31]">
                    Intro Play Prompt
                    <input
                      type="text"
                      value={memForm.hero_subtitle}
                      onChange={(e) =>
                        setMemForm((p) => ({ ...p, hero_subtitle: e.target.value }))
                      }
                      className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-3.5 py-2 text-sm text-[#2B1318]"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block text-xs font-semibold text-[#5C3D31]">
                    Couple Names
                    <input
                      type="text"
                      value={memForm.collage_names}
                      onChange={(e) =>
                        setMemForm((p) => ({ ...p, collage_names: e.target.value }))
                      }
                      placeholder="e.g. Wanjiku & Brian"
                      className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-3.5 py-2 text-sm text-[#2B1318]"
                    />
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="block text-xs font-semibold text-[#5C3D31]">
                      Day
                      <input
                        type="text"
                        value={memForm.collage_day}
                        onChange={(e) => setMemForm((p) => ({ ...p, collage_day: e.target.value }))}
                        className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-2 text-sm text-center text-[#2B1318]"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-[#5C3D31]">
                      Month
                      <input
                        type="text"
                        value={memForm.collage_month}
                        onChange={(e) =>
                          setMemForm((p) => ({ ...p, collage_month: e.target.value }))
                        }
                        className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-2 text-sm text-center text-[#2B1318]"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-[#5C3D31]">
                      Year
                      <input
                        type="text"
                        value={memForm.collage_year}
                        onChange={(e) =>
                          setMemForm((p) => ({ ...p, collage_year: e.target.value }))
                        }
                        className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-2 text-sm text-center text-[#2B1318]"
                      />
                    </label>
                  </div>
                </div>

                <label className="block text-xs font-semibold text-[#5C3D31]">
                  Center Heart Sticky Note Quote
                  <input
                    type="text"
                    value={memForm.collage_quote}
                    onChange={(e) => setMemForm((p) => ({ ...p, collage_quote: e.target.value }))}
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-3.5 py-2 text-sm text-[#2B1318]"
                  />
                </label>
              </div>

              {/* Memories: 04. 34-Tile Visual Heart Mosaic Editor */}
              <div className="rounded-3xl bg-white border border-[#DCC397] p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-['Fraunces'] text-lg text-[#33101B]">
                      04. 34-Tile Heart Mosaic ({memForm.mosaic_images.length}/34 photos)
                    </h3>
                    <p className="text-xs text-[#7A5A47]">
                      Uploaded photos automatically fill all 34 heart tiles outward from the center
                    </p>
                  </div>
                  <label className="min-h-[44px] px-4 py-2 rounded-xl bg-[#5A1A2C] text-[#FBF3EA] text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-[#42111F]">
                    <Upload className="h-4 w-4 text-[#E2B96F]" />
                    <span>Upload Mosaic Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFirebaseFileUpload(e, 'mem-mosaic')}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Live Mini 34-Tile Heart Map */}
                <div className="rounded-2xl bg-[#24060E] p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-[132px] h-[132px] shrink-0">
                    {mosaicPreviewSlots.map((slot) => {
                      const img =
                        memForm.mosaic_images.length > 0
                          ? memForm.mosaic_images[slot.id % memForm.mosaic_images.length]
                          : ROMANTIC_GALLERY[slot.id % ROMANTIC_GALLERY.length];
                      return (
                        <div
                          key={slot.id}
                          className="absolute rounded-[2px] overflow-hidden border border-[#FDF1E7]"
                          style={{
                            left: `${slot.xPct * 100}%`,
                            top: `${slot.yPct * 100}%`,
                            width: `${slot.widthPct * 100}%`,
                            height: `${slot.heightPct * 100}%`,
                            transform: `translate(-50%, -50%) rotate(${slot.rotate}deg)`,
                            zIndex: slot.order,
                          }}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-xs text-[#FBF3EA]/80 space-y-1 text-center sm:text-left">
                    <p className="font-semibold text-[#E2B96F]">Live 34-Spot Heart Mosaic Map</p>
                    <p>
                      You currently have{' '}
                      <strong className="text-white">{memForm.mosaic_images.length}</strong> photos
                      (cycling gracefully across all 34 heart positions). Upload more anytime!
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {memForm.mosaic_images.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-xl overflow-hidden border border-[#DCC397] aspect-square bg-[#FBF3EA]"
                    >
                      <img
                        src={url}
                        alt={`Mosaic tile ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          void releaseMediaUrlResources(url);
                          setMemForm((p) => {
                            const nextMeta = { ...(p.media_meta || {}) };
                            delete nextMeta[url];
                            return {
                              ...p,
                              mosaic_images: p.mosaic_images.filter((_, i) => i !== idx),
                              media_meta: nextMeta,
                            };
                          });
                        }}
                        aria-label={`Remove mosaic tile ${idx + 1}`}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Memories: 05. Full Slideshow Memories Editor (9 Transitions + Video Mute + Duration + Reorder) */}
              <div className="rounded-3xl bg-white border border-[#DCC397] p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-['Fraunces'] text-lg text-[#33101B]">
                      05. Slideshow Memories ({memForm.memories.length})
                    </h3>
                    <p className="text-xs text-[#7A5A47]">
                      Choose from all 9 original transitions, captions, durations & video mute settings
                    </p>
                  </div>
                  <label className="min-h-[44px] px-4 py-2 rounded-xl bg-[#5A1A2C] text-[#FBF3EA] text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-[#42111F]">
                    <Film className="h-4 w-4 text-[#E2B96F]" />
                    <span>Add Photo/Video Slide</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => handleFirebaseFileUpload(e, 'mem-slide')}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  {memForm.memories.map((slide, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-[#FBF3EA] border border-[#E6D5BE] p-3.5 space-y-2.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#24060E] shrink-0 border border-[#DCC397]">
                          {slide.type === 'video' ? (
                            <video src={slide.url} className="w-full h-full object-cover" />
                          ) : (
                            <img
                              src={slide.url}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={slide.caption || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMemForm((p) => ({
                                ...p,
                                memories: p.memories.map((m, i) =>
                                  i === idx ? { ...m, caption: val } : m
                                ),
                              }));
                            }}
                            placeholder="Slide caption"
                            className="sm:col-span-2 min-h-[38px] rounded-lg border border-[#DCC397] bg-white px-3 text-xs text-[#2B1318]"
                          />
                          <input
                            type="text"
                            value={slide.date || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMemForm((p) => ({
                                ...p,
                                memories: p.memories.map((m, i) =>
                                  i === idx ? { ...m, date: val } : m
                                ),
                              }));
                            }}
                            placeholder="Date (e.g. Aug 2024)"
                            className="min-h-[38px] rounded-lg border border-[#DCC397] bg-white px-3 text-xs text-[#2B1318]"
                          />
                          <input
                            type="text"
                            value={slide.place || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMemForm((p) => ({
                                ...p,
                                memories: p.memories.map((m, i) =>
                                  i === idx ? { ...m, place: val } : m
                                ),
                              }));
                            }}
                            placeholder="Place (e.g. Diani Beach)"
                            className="min-h-[38px] rounded-lg border border-[#DCC397] bg-white px-3 text-xs text-[#2B1318]"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E6D5BE]/70">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={slide.transition || 'fade'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMemForm((p) => ({
                                ...p,
                                memories: p.memories.map((m, i) =>
                                  i === idx ? { ...m, transition: val } : m
                                ),
                              }));
                            }}
                            aria-label={`Slide ${idx + 1} transition effect`}
                            className="min-h-[36px] rounded-lg border border-[#DCC397] bg-white px-2.5 text-xs text-[#2B1318]"
                          >
                            {SLIDESHOW_EFFECTS.map((fx) => (
                              <option key={fx.id} value={fx.id}>
                                Effect: {fx.label}
                              </option>
                            ))}
                          </select>

                          <label className="inline-flex items-center gap-1 text-xs text-[#5C3D31]">
                            <span>Duration:</span>
                            <input
                              type="number"
                              min={2}
                              max={30}
                              value={slide.duration || 6}
                              onChange={(e) => {
                                const sec = Math.max(2, Number(e.target.value) || 6);
                                setMemForm((p) => ({
                                  ...p,
                                  memories: p.memories.map((m, i) =>
                                    i === idx ? { ...m, duration: sec } : m
                                  ),
                                }));
                              }}
                              className="w-14 min-h-[36px] rounded-lg border border-[#DCC397] bg-white px-2 text-xs text-center text-[#2B1318]"
                            />
                            <span>sec</span>
                          </label>

                          {slide.type === 'video' && (
                            <label className="inline-flex items-center gap-1 text-xs text-[#5C3D31] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={slide.muted !== false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setMemForm((p) => ({
                                    ...p,
                                    memories: p.memories.map((m, i) =>
                                      i === idx ? { ...m, muted: checked } : m
                                    ),
                                  }));
                                }}
                              />
                              <span>Mute video</span>
                            </label>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setMemForm((p) => ({
                                ...p,
                                memories: swapItems(p.memories, idx, -1),
                              }))
                            }
                            disabled={idx === 0}
                            className="h-8 w-8 rounded-lg bg-white border border-[#DCC397] text-[#33101B] disabled:opacity-35 flex items-center justify-center cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setMemForm((p) => ({
                                ...p,
                                memories: swapItems(p.memories, idx, 1),
                              }))
                            }
                            disabled={idx === memForm.memories.length - 1}
                            className="h-8 w-8 rounded-lg bg-white border border-[#DCC397] text-[#33101B] disabled:opacity-35 flex items-center justify-center cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void releaseMediaUrlResources(slide.url);
                              setMemForm((p) => {
                                const nextMeta = { ...(p.media_meta || {}) };
                                delete nextMeta[slide.url];
                                return {
                                  ...p,
                                  memories: p.memories.filter((_, i) => i !== idx),
                                  media_meta: nextMeta,
                                };
                              });
                            }}
                            aria-label={`Delete slide ${idx + 1}`}
                            className="h-8 w-8 rounded-lg bg-[#FDE8E8] text-[#9C2D2D] flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Memories: 06. Letter */}
              <div className="rounded-3xl bg-white border border-[#DCC397] p-6 space-y-4">
                <h3 className="font-['Fraunces'] text-lg text-[#33101B]">
                  06. Wax-Sealed Love Letter
                </h3>
                <label className="block text-xs font-semibold text-[#5C3D31]">
                  Letter Salutation
                  <input
                    type="text"
                    value={memForm.letter_title}
                    onChange={(e) => setMemForm((p) => ({ ...p, letter_title: e.target.value }))}
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-3.5 py-2 text-sm text-[#2B1318]"
                  />
                </label>
                <label className="block text-xs font-semibold text-[#5C3D31]">
                  Letter Body
                  <textarea
                    rows={4}
                    value={memForm.letter_body}
                    onChange={(e) => setMemForm((p) => ({ ...p, letter_body: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-[#DCC397] bg-[#FFFDF9] p-3.5 text-sm text-[#2B1318]"
                  />
                </label>
                <label className="block text-xs font-semibold text-[#5C3D31]">
                  Final Sign-Off
                  <input
                    type="text"
                    value={memForm.final_message}
                    onChange={(e) => setMemForm((p) => ({ ...p, final_message: e.target.value }))}
                    className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-3.5 py-2 text-sm text-[#2B1318]"
                  />
                </label>
              </div>
            </>
          )}

          {/* Shared Audio Engine: Background Soundtrack + Music Trimmer (+ Live Voice Recorder for Memories) */}
          <div className="rounded-3xl bg-white border border-[#DCC397] p-6 space-y-4">
            <h3 className="font-['Fraunces'] text-lg text-[#33101B]">
              {product === 'memories'
                ? '07. Voice Note Recorder + Soundtrack Trimmer'
                : '06. Background Soundtrack & Segment Trimmer'}
            </h3>

            {product === 'memories' && (
              <div className="rounded-2xl bg-[#FBF3EA] border border-[#E6D5BE] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-[#33101B]">
                      Your Recorded Voice Note (Ducks background song automatically)
                    </p>
                    <p className="text-[11px] text-[#7A5A47]">
                      {memForm.voice_url ? 'Voice note attached & ready for duet' : 'Optional — record live or upload an audio file'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleVoiceRecorder}
                      className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                        isRecordingVoice
                          ? 'bg-[#B22626] text-white animate-pulse'
                          : 'bg-[#5A1A2C] text-[#FBF3EA]'
                      }`}
                    >
                      {isRecordingVoice ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-white" />
                          <span>Stop ({formatSec(recordingSeconds)})</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-[#E2B96F]" />
                          <span>Record Voice Note</span>
                        </>
                      )}
                    </button>

                    <label className="min-h-[40px] px-3.5 rounded-xl border border-[#DCC397] bg-white text-xs font-semibold text-[#33101B] flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#7A1C33]" />
                      <span>Upload Audio</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => handleFirebaseFileUpload(e, 'voice')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {memForm.voice_url && (
                  <div className="flex items-center gap-2">
                    <audio controls src={memForm.voice_url} className="w-full h-9" />
                    <button
                      type="button"
                      onClick={() => {
                        if (memForm.voice_url) {
                          void releaseMediaUrlResources(memForm.voice_url);
                        }
                        setMemForm((p) => {
                          const nextMeta = { ...(p.media_meta || {}) };
                          if (p.voice_url) delete nextMeta[p.voice_url];
                          return { ...p, voice_url: '', media_meta: nextMeta };
                        });
                      }}
                      className="text-xs text-[#9C2D2D] hover:underline shrink-0 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-semibold text-[#5C3D31]">
                Choose from Backstage Music Library
                <select
                  value={currentMusicUrl || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    if (product === 'chasing-her') {
                      setChForm((p) => ({ ...p, music_url: url, music_start: 0, music_end: null }));
                    } else {
                      setMemForm((p) => ({ ...p, music_url: url, music_start: 0, music_end: null }));
                    }
                  }}
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-[#DCC397] bg-[#FFFDF9] px-3 text-xs text-[#2B1318]"
                >
                  <option value="">-- Custom / None --</option>
                  {activeMusicLibrary.map((track) => (
                    <option key={track.id} value={track.file_url || track.id}>
                      {track.title} {track.artist ? `(${track.artist})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end">
                <label className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-[#DCC397] bg-[#FBF3EA] text-xs font-semibold text-[#33101B] flex items-center justify-center gap-2 cursor-pointer hover:bg-[#F3E2CE]">
                  <Music className="h-4 w-4 text-[#7A1C33]" />
                  <span>Upload Background Song</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFirebaseFileUpload(e, 'music')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <MusicTrimmer
              musicUrl={currentMusicUrl}
              musicStart={currentMusicStart}
              musicEnd={currentMusicEnd}
              onChangeRange={(start, end) => {
                if (product === 'chasing-her') {
                  setChForm((p) => ({ ...p, music_start: start, music_end: end }));
                } else {
                  setMemForm((p) => ({ ...p, music_start: start, music_end: end }));
                }
              }}
            />
          </div>
        </div>

        {/* Right Live Preview Column */}
        <div
          className={`lg:col-span-6 lg:sticky lg:top-20 ${
            showMobilePreview ? 'block' : 'hidden lg:block'
          }`}
        >
          <RecipientSitePreview
            product={product}
            chasingHerData={chForm}
            memoriesData={memForm}
            bypassPinByDefault={true}
          />
        </div>
      </div>
    </div>
  );
};
