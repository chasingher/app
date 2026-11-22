import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Heart,
  Lock,
  Unlock,
  Music,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  X,
  Volume2,
  VolumeX,
  ExternalLink,
  Sparkles,
  Mic,
  Delete,
} from 'lucide-react';
import {
  ChasingHerProjectData,
  MemoriesProjectData,
  buildHeartMosaicLayout,
} from '../utils/platformLogic';
import { ROMANTIC_GALLERY, DEFAULT_FLOWER_POOL } from '../utils/supabaseAndOci';

interface RecipientSitePreviewProps {
  product: 'chasing-her' | 'memories';
  chasingHerData?: ChasingHerProjectData;
  memoriesData?: MemoriesProjectData;
  onClose?: () => void;
  bypassPinByDefault?: boolean;
  isPublicShowcase?: boolean;
}

type ChasingHerStage = 'gate' | 'login' | 'flowers' | 'main';
type MemoriesStage = 'gate' | 'login' | 'intro' | 'collage' | 'flowers' | 'memories' | 'letter';

const LOADING_MESSAGES = [
  "Hold on, I'm preparing your gift…",
  'I love you so much…',
  'Kisses, baby — be excited…',
  'Almost there, my love…',
  "This one's just for you…",
];

function getSpotifyTrackId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/track[/:]([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function TypewriterText({
  text,
  speed = 40,
  delay = 0,
  showCursor = true,
}: {
  text: string;
  speed?: number;
  delay?: number;
  showCursor?: boolean;
}) {
  const [display, setDisplay] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    let iv: ReturnType<typeof setInterval> | undefined;
    let idx = 0;
    setDisplay('');
    setDone(false);

    const startTimer = setTimeout(() => {
      if (!text) {
        setDone(true);
        return;
      }
      iv = setInterval(() => {
        idx += 1;
        setDisplay(text.slice(0, idx));
        if (idx >= text.length) {
          if (iv) clearInterval(iv);
          setDone(true);
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(startTimer);
      if (iv) clearInterval(iv);
    };
  }, [text, speed, delay]);

  return (
    <>
      {display}
      {showCursor && !done && <span className="ch-tw-cursor">|</span>}
    </>
  );
}

function HeartSvg({ className = 'w-full h-full' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 28" fill="none" className={className}>
      <path
        d="M16 27C10 22.5 2 16 2 9.2 2 4.4 5.7 1 10.1 1c2.6 0 5 1.3 6 3.4C17.1 2.3 19.5 1 22.1 1 26.5 1 30 4.4 30 9.2 30 16 22 22.5 16 27z"
        fill="#c2185b"
      />
    </svg>
  );
}

function CupidArrowSvg() {
  return (
    <svg className="ch-cupid-arrow" viewBox="0 0 140 36" width="140" height="36">
      <line x1="6" y1="18" x2="118" y2="18" stroke="#e8c27a" strokeWidth="3" strokeLinecap="round" />
      <path d="M118 18 L102 9 M118 18 L102 27" stroke="#e8c27a" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M6 18 L17 12 M6 18 L17 24 M6 18 L15 18" stroke="#e8c27a" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// =========================================================================
// STAGE 1: CUPID ARROW & 3D SPLIT-HEART LOADING GATE
// =========================================================================
function LoadingGateStage({
  mode,
  onDone,
}: {
  mode: 'chasing-her' | 'memories';
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<'waiting' | 'arrow' | 'impact' | 'opening'>('waiting');
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPhase('arrow'), mode === 'chasing-her' ? 2200 : 1600);
    return () => clearTimeout(t);
  }, [mode]);

  useEffect(() => {
    if (phase === 'waiting') {
      const t = setTimeout(() => setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length), 2000);
      return () => clearTimeout(t);
    }
    if (phase === 'arrow') {
      const t = setTimeout(() => setPhase('impact'), 1350);
      return () => clearTimeout(t);
    }
    if (phase === 'impact') {
      const t = setTimeout(() => setPhase('opening'), 380);
      return () => clearTimeout(t);
    }
    if (phase === 'opening') {
      const t = setTimeout(onDone, mode === 'chasing-her' ? 1750 : 1450);
      return () => clearTimeout(t);
    }
  }, [phase, mode, onDone]);

  return (
    <div
      className="relative min-h-[540px] flex flex-col items-center justify-center gap-9 px-6 py-12 text-center overflow-hidden"
      style={{
        background: 'radial-gradient(circle at 50% 15%, #fffaf5 0%, #fdf1e7 55%, #f7ddc9 100%)',
      }}
    >
      <div
        className={`ch-loading-heart-wrap ${phase === 'impact' ? 'impact' : ''} ${
          phase === 'opening' ? 'ch-heart-open' : ''
        }`}
      >
        <div className="ch-heart-half ch-heart-half-left">
          <HeartSvg />
        </div>
        <div className="ch-heart-half ch-heart-half-right">
          <HeartSvg />
        </div>
        <div className="ch-heart-burst" />
        {(phase === 'arrow' || phase === 'impact') && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <CupidArrowSvg />
          </div>
        )}
      </div>

      <div className="font-['Caveat'] font-semibold text-xl sm:text-2xl text-[#96123f] min-h-[2rem]">
        {phase === 'waiting' ? (
          <TypewriterText
            key={msgIndex}
            text={mode === 'memories' ? 'Gathering every little memory…' : LOADING_MESSAGES[msgIndex]}
            speed={38}
          />
        ) : (
          <span>Unlocking your secret gift…</span>
        )}
      </div>

      <button
        type="button"
        onClick={onDone}
        className="text-xs font-medium text-[#96123f]/75 hover:text-[#96123f] underline cursor-pointer"
      >
        Continue to Passcode →
      </button>
    </div>
  );
}

// =========================================================================
// STAGE 2: RETAINED REDESIGNED DEEP BURGUNDY & GOLD PASSCODE LOCK SCREEN
// =========================================================================
function RedesignedPasscodeStage({
  expectedPin,
  onUnlock,
  productLabel,
  showDemoHelper = false,
}: {
  expectedPin: string;
  onUnlock: () => void;
  productLabel: string;
  showDemoHelper?: boolean;
}) {
  const maxLen = Math.max(4, (expectedPin || '140226').length);
  const [digits, setDigits] = useState('');
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDigit = (d: string) => {
    if (success || digits.length >= maxLen) return;
    const next = digits + d;
    setDigits(next);

    if (next.length === maxLen) {
      setTimeout(() => {
        if (next === expectedPin) {
          setSuccess(true);
          setTimeout(onUnlock, 560);
        } else {
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setDigits('');
          }, 520);
        }
      }, 200);
    }
  };

  return (
    <div
      className={`relative min-h-[560px] flex flex-col items-center justify-center gap-6 px-5 py-10 text-[#FDF3EA] overflow-hidden transition-all duration-700 ${
        success ? 'opacity-95 scale-[1.02]' : ''
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 24%, #4a0918 0%, #28060e 52%, #160308 100%)',
      }}
    >
      {/* Subtle golden atmospheric halo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 35%, rgba(226,185,111,0.14), transparent 60%)',
        }}
      />

      <p className="relative z-10 font-['Cormorant_Garamond'] italic text-xl text-[#E2B96F] tracking-wide text-center">
        {success ? 'There you are.' : 'Only you know this secret code'}
      </p>

      {/* Gold-ringed burgundy heart emblem */}
      <div
        className={`relative z-10 w-[86px] h-[86px] rounded-full flex items-center justify-center ${
          shake ? 'ch-shake' : success ? 'ch-burst-heart' : ''
        }`}
        style={{
          background:
            'radial-gradient(circle at 35% 30%, rgba(226,185,111,0.22), rgba(194,24,91,0.16))',
          border: '1px solid rgba(226,185,111,0.42)',
          boxShadow: '0 14px 34px rgba(0,0,0,0.45), 0 0 28px rgba(194,24,91,0.28)',
        }}
      >
        <div className={`w-12 h-12 ${!shake && !success ? 'ch-pulse-heart' : ''}`}>
          <HeartSvg />
        </div>
      </div>

      {/* 6 Gold-Outlined Progress Dots */}
      <div className={`relative z-10 flex items-center justify-center gap-3.5 ${shake ? 'ch-shake' : ''}`}>
        {Array.from({ length: maxLen }).map((_, idx) => {
          const filled = idx < digits.length;
          return (
            <span
              key={idx}
              className="w-3.5 h-3.5 rounded-full transition-all duration-300"
              style={{
                border: success
                  ? '2px solid #4c9a52'
                  : filled
                  ? '2px solid #e2b96f'
                  : '2px solid rgba(226,185,111,0.65)',
                background: success
                  ? '#4c9a52'
                  : filled
                  ? '#e2b96f'
                  : 'rgba(255,255,255,0.04)',
                boxShadow: success
                  ? '0 0 14px rgba(76,154,82,0.65)'
                  : filled
                  ? '0 0 12px rgba(226,185,111,0.6)'
                  : 'none',
                transform: filled ? 'scale(1.18)' : 'scale(1)',
              }}
            />
          );
        })}
      </div>

      {/* Glass & Burgundy-Gold Circular Keypad */}
      <div className="relative z-10 grid grid-cols-3 gap-x-5 gap-y-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => handleDigit(n)}
            className="w-[66px] h-[66px] rounded-full text-2xl font-medium text-[#FDF3EA] flex items-center justify-center transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            style={{
              border: '1px solid rgba(226,185,111,0.32)',
              background: 'linear-gradient(155deg, rgba(255,255,255,0.11), rgba(58,13,24,0.72))',
              boxShadow: '0 8px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.16)',
            }}
          >
            {n}
          </button>
        ))}

        <button
          type="button"
          onClick={() => !success && setDigits('')}
          className="w-[66px] h-[66px] rounded-full text-sm font-semibold text-[#f9d8e2] flex items-center justify-center transition hover:brightness-110 active:scale-95 cursor-pointer"
          style={{
            border: '1px solid rgba(232,135,159,0.35)',
            background: 'rgba(194,24,91,0.22)',
          }}
        >
          Clear
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="w-[66px] h-[66px] rounded-full text-2xl font-medium text-[#FDF3EA] flex items-center justify-center transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          style={{
            border: '1px solid rgba(226,185,111,0.32)',
            background: 'linear-gradient(155deg, rgba(255,255,255,0.11), rgba(58,13,24,0.72))',
            boxShadow: '0 8px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.16)',
          }}
        >
          0
        </button>

        <button
          type="button"
          onClick={() => !success && setDigits((p) => p.slice(0, -1))}
          aria-label="Backspace digit"
          className="w-[66px] h-[66px] rounded-full text-[#f9d8e2] flex items-center justify-center transition hover:brightness-110 active:scale-95 cursor-pointer"
          style={{
            border: '1px solid rgba(232,135,159,0.35)',
            background: 'rgba(194,24,91,0.22)',
          }}
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {/* Preview Demo Helper (Shown ONLY on official public showcase demos, never on private customer letters) */}
      {showDemoHelper ? (
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 text-xs text-[#FBF3EA]/70 pt-1">
          <span>
            {productLabel} Demo PIN:{' '}
            <strong className="font-mono text-[#E2B96F] tracking-widest">{expectedPin}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setSuccess(true);
              setDigits(expectedPin);
              setTimeout(onUnlock, 380);
            }}
            className="inline-flex items-center gap-1 text-[#E2B96F] hover:underline font-medium cursor-pointer"
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Skip Passcode</span>
          </button>
        </div>
      ) : (
        <div
          data-testid="private-passcode-notice"
          className="relative z-10 flex items-center justify-center gap-1.5 text-xs text-[#FBF3EA]/60 pt-1 text-center"
        >
          <Lock className="w-3.5 h-3.5 text-[#E2B96F]/80 shrink-0" />
          <span>Private personal letter · Enter the secret PIN shared with you</span>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// STAGE 3: GLOBAL OPENING FLOWER CURTAIN OVERLAY (BOTH EDITIONS)
// =========================================================================
function FlowerCurtainStage({
  whisper,
  onDone,
}: {
  images?: string[];
  whisper: string;
  onDone: () => void;
}) {
  // Always use solely the curated 5-blossom flower wall
  const pool = DEFAULT_FLOWER_POOL;

  const flowers = useMemo(() => {
    const w = 800;
    const h = 540;
    const cols = 8;
    const rows = 5;
    const cellW = w / cols;
    const cellH = h / rows;

    const list: Array<{
      id: number;
      dx: number;
      dy: number;
      dist: number;
      size: number;
      src: string;
      spinDur: number;
      spinDir: 'normal' | 'reverse';
      packDelay: number;
      packDuration: number;
      exitDx: number;
      exitDy: number;
      exitRotate: number;
      exitDelay: number;
      exitDuration: number;
    }> = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const j1 = Math.sin(idx * 17.3) * 0.5;
        const j2 = Math.cos(idx * 23.1) * 0.5;
        const px = (c + 0.5) * cellW + j1 * cellW * 0.35;
        const py = (r + 0.5) * cellH + j2 * cellH * 0.35;
        const dx = px - w / 2;
        const dy = py - h / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        list.push({
          id: idx,
          dx,
          dy,
          dist,
          size: Math.max(cellW, cellH) * 1.48,
          src: pool[idx % pool.length],
          spinDur: 13 + (idx % 7),
          spinDir: idx % 2 === 0 ? 'normal' : 'reverse',
          packDelay: 0,
          packDuration: 720,
          exitDx: 0,
          exitDy: 0,
          exitRotate: 0,
          exitDelay: 0,
          exitDuration: 1500,
        });
      }
    }

    list.sort((a, b) => a.dist - b.dist);
    list.forEach((f, order) => {
      f.packDelay = order * 42;
      f.packDuration = 600 + (order % 4) * 80;
      const side = f.dx >= 0 ? 1 : -1;
      f.exitDx = f.dx + side * (w * 0.85 + Math.abs(f.dx) * 0.15);
      f.exitDy = f.dy + ((order % 5) - 2) * 32;
      f.exitRotate = side * (35 + (order % 4) * 12);
      f.exitDelay = (order % 5) * 60;
      f.exitDuration = 1400 + (order % 3) * 200;
    });

    return list;
  }, [pool]);

  const sparkles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: `${(i * 19 + 8) % 92 + 4}%`,
        top: `${(i * 23 + 11) % 86 + 6}%`,
        size: 6 + (i % 4) * 3,
        delay: `${(i % 5) * 0.35}s`,
        dur: `${1.8 + (i % 3) * 0.4}s`,
      })),
    []
  );

  const [phase, setPhase] = useState<'start' | 'packed' | 'parting'>('start');
  const [whisperIn, setWhisperIn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPhase('packed'), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 'packed') return;
    const maxPackEnd = flowers.reduce((m, f) => Math.max(m, f.packDelay + f.packDuration), 0);
    const wTimer = setTimeout(() => setWhisperIn(true), Math.max(0, maxPackEnd - 450));
    const pTimer = setTimeout(() => {
      setWhisperIn(false);
      setPhase('parting');
    }, maxPackEnd + 1350);
    return () => {
      clearTimeout(wTimer);
      clearTimeout(pTimer);
    };
  }, [phase, flowers]);

  useEffect(() => {
    if (phase !== 'parting') return;
    const maxExit = flowers.reduce((m, f) => Math.max(m, f.exitDelay + f.exitDuration), 0);
    const t = setTimeout(onDone, maxExit + 120);
    return () => clearTimeout(t);
  }, [phase, flowers, onDone]);

  return (
    <div
      className={`relative min-h-[540px] flex items-center justify-center overflow-hidden transition-colors duration-[1600ms] ${
        phase === 'parting' ? 'bg-[#200000]/10' : 'bg-[#fdf1e7]'
      }`}
    >
      {/* Ambient blush glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(232,135,159,0.28), rgba(232,135,159,0) 64%)',
        }}
      />

      {/* Twinkling sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        {sparkles.map((sp) => (
          <span
            key={sp.id}
            className="ch-sparkle"
            style={{
              left: sp.left,
              top: sp.top,
              width: sp.size,
              height: sp.size,
              animationDelay: sp.delay,
              animationDuration: sp.dur,
            }}
          />
        ))}
      </div>

      {/* Spinning center-out flower lattice */}
      {flowers.map((f) => {
        const wrapStyle: React.CSSProperties =
          phase === 'start'
            ? { transform: 'scale(0)', opacity: 0 }
            : phase === 'packed'
            ? {
                transform: `translate(${f.dx}px, ${f.dy}px) scale(1)`,
                opacity: 1,
                transition: `transform ${f.packDuration}ms cubic-bezier(.16,1,.3,1) ${f.packDelay}ms, opacity 450ms ease ${f.packDelay}ms`,
              }
            : {
                transform: `translate(${f.exitDx}px, ${f.exitDy}px) rotate(${f.exitRotate}deg) scale(.82)`,
                opacity: 0.95,
                transition: `transform ${f.exitDuration}ms cubic-bezier(.4,0,.3,1) ${f.exitDelay}ms`,
              };

        return (
          <div
            key={f.id}
            className="absolute left-1/2 top-1/2 w-0 h-0 pointer-events-none"
            style={wrapStyle}
          >
            <div
              className="ch-flower-self"
              style={{
                width: f.size,
                height: f.size,
                animationDuration: `${f.spinDur}s`,
                animationDirection: f.spinDir,
              }}
            >
              <img
                src={f.src}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
          </div>
        );
      })}

      {/* Whisper headline */}
      <div
        className={`relative z-20 px-6 text-center transition-all duration-1000 ${
          whisperIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <p
          className="font-['Dancing_Script'] font-bold text-4xl sm:text-5xl text-[#96123f]"
          style={{ textShadow: '0 6px 24px rgba(255,255,255,0.85)' }}
        >
          {whisper}
        </p>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="absolute bottom-4 right-4 z-30 min-h-[36px] px-3.5 rounded-full bg-[#380000]/80 text-[#FDF3EA] text-xs font-medium hover:bg-[#380000] cursor-pointer"
      >
        Open Reveal →
      </button>
    </div>
  );
}

// =========================================================================
// MAIN RECIPIENT EXPERIENCE PREVIEW COMPONENT
// =========================================================================
export const RecipientSitePreview: React.FC<RecipientSitePreviewProps> = ({
  product,
  chasingHerData,
  memoriesData,
  onClose,
  bypassPinByDefault = false,
  isPublicShowcase = false,
}) => {
  const chData: ChasingHerProjectData = chasingHerData || {
    slug: 'ama-and-kofi',
    pin: '140226',
    intro_message: 'Every ordinary day becomes unforgettable because you are in it.',
    letter_title: 'My Dearest,',
    letter_body:
      'From the first evening we laughed together to every quiet call before sleep, you have been my peace and my favorite person in this world.\n\nForever yours.',
    final_message: 'I love you to the moon and back.',
    photos: ROMANTIC_GALLERY.map((url, idx) => ({ url, caption: `Memory ${idx + 1}` })),
    flower_images: DEFAULT_FLOWER_POOL,
    songs: [
      {
        title: 'Love Nwantiti (Acoustic)',
        artist: 'CKay',
        duration: '2:26',
        spotify_url: 'https://open.spotify.com/track/2Xr1dTzJee307rmrkt8c0g',
      },
      {
        title: 'Essence',
        artist: 'Wizkid ft. Tems',
        duration: '4:08',
        spotify_url: 'https://open.spotify.com/track/5FG7Tl93LdH117jEKYl3Cm',
      },
    ],
  };

  const memData: MemoriesProjectData = memoriesData || {
    slug: 'wanjiku-and-brian',
    pin: '250824',
    hero_title: 'For Wanjiku',
    hero_subtitle: 'I gathered our favorite moments into one place… tap the heart to begin.',
    collage_names: 'Wanjiku & Brian',
    collage_day: '25',
    collage_month: '08',
    collage_year: '2024',
    collage_quote: 'Every love story is beautiful, but ours is my favorite.',
    mosaic_images: ROMANTIC_GALLERY,
    letter_title: 'To My Heart,',
    letter_body:
      'Every photo in that heart holds a piece of our story. Thank you for loving me with so much warmth and grace.',
    final_message: 'Forever & Always',
    memories: ROMANTIC_GALLERY.slice(0, 3).map((url, idx) => ({
      url,
      type: 'image',
      caption: `Cherished Moment #${idx + 1}`,
      date: '2025',
      place: 'Together',
      transition: idx === 0 ? 'fade' : idx === 1 ? 'blur-focus' : 'polaroid',
      duration: 6,
    })),
    flower_images: DEFAULT_FLOWER_POOL,
  };

  const expectedPin = (product === 'chasing-her' ? chData.pin : memData.pin) || '140226';

  const [chStage, setChStage] = useState<ChasingHerStage>(bypassPinByDefault ? 'main' : 'gate');
  const [memStage, setMemStage] = useState<MemoriesStage>(
    bypassPinByDefault ? 'memories' : 'gate'
  );

  // Reset stages sensibly if product or bypassPinByDefault changes
  useEffect(() => {
    setChStage(bypassPinByDefault ? 'main' : 'gate');
    setMemStage(bypassPinByDefault ? 'memories' : 'gate');
  }, [product, bypassPinByDefault]);

  // Shared interactive state inside story
  const [envelopeOpen, setEnvelopeOpen] = useState(false);
  const [showLetterCard, setShowLetterCard] = useState(false);
  const [finalBackdropIdx, setFinalBackdropIdx] = useState(0);

  // Memories Mosaic 34-tile state
  const mosaicSlots = useMemo(() => buildHeartMosaicLayout(9, 7), []);
  const [placedCount, setPlacedCount] = useState(0);
  const [collagePhase, setCollagePhase] = useState<'placing' | 'settled' | 'beating' | 'exploding'>(
    'placing'
  );

  // Memories Slideshow state
  const [slideIdx, setSlideIdx] = useState(0);
  const [slideshowPlaying, setSlideshowPlaying] = useState(true);
  const [slideProgressPct, setSlideProgressPct] = useState(0);

  // Real Audio Playback state (Music Trim + Voice Duet)
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const activeMusicUrl = product === 'chasing-her' ? chData.music_url : memData.music_url;
  const activeMusicTitle = (
    product === 'chasing-her' ? chData.music_title : memData.music_title
  )?.trim();
  const activeMusicStart =
    (product === 'chasing-her' ? chData.music_start : memData.music_start) || 0;
  const activeMusicEnd =
    product === 'chasing-her' ? chData.music_end : memData.music_end;
  const activeVoiceUrl = product === 'memories' ? memData.voice_url : undefined;

  const stopAllAudio = () => {
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
    }
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
    }
    setIsAudioPlaying(false);
  };

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [product]);

  const startMusicOrDuet = () => {
    if (!activeMusicUrl && !activeVoiceUrl) {
      setIsAudioPlaying((p) => !p);
      return;
    }

    if (activeVoiceUrl) {
      if (!voiceAudioRef.current || voiceAudioRef.current.src !== activeVoiceUrl) {
        voiceAudioRef.current = new Audio(activeVoiceUrl);
      }
      const v = voiceAudioRef.current;
      v.currentTime = 0;
      v.volume = isMuted ? 0 : 1;
      v.play().catch(() => {});
      v.onended = () => {
        if (musicAudioRef.current) {
          musicAudioRef.current.volume = isMuted ? 0 : 0.62;
        }
      };
    }

    if (activeMusicUrl) {
      if (!musicAudioRef.current || musicAudioRef.current.src !== activeMusicUrl) {
        musicAudioRef.current = new Audio(activeMusicUrl);
      }
      const m = musicAudioRef.current;
      m.currentTime = Math.max(0, activeMusicStart);
      m.volume = isMuted ? 0 : activeVoiceUrl ? 0.24 : 0.55;
      m.ontimeupdate = () => {
        if (
          activeMusicEnd !== null &&
          activeMusicEnd !== undefined &&
          activeMusicEnd > activeMusicStart &&
          m.currentTime >= activeMusicEnd
        ) {
          m.currentTime = activeMusicStart;
        }
      };
      m.play().catch(() => {});
    }

    setIsAudioPlaying(true);
  };

  const togglePlayAudio = () => {
    if (isAudioPlaying) {
      stopAllAudio();
    } else {
      startMusicOrDuet();
    }
  };

  // Trigger 34-tile Mosaic animation whenever entering Memories 'collage' stage
  useEffect(() => {
    if (product !== 'memories' || memStage !== 'collage') return;
    setPlacedCount(0);
    setCollagePhase('placing');
    let i = 0;
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    const iv = setInterval(() => {
      i += 1;
      setPlacedCount(i);
      if (i >= mosaicSlots.length) {
        clearInterval(iv);
        timers.push(setTimeout(() => setCollagePhase('settled'), 650));
        timers.push(setTimeout(() => setCollagePhase('beating'), 2100));
        timers.push(setTimeout(() => setCollagePhase('exploding'), 5200));
        timers.push(setTimeout(() => setMemStage('flowers'), 6200));
      }
    }, 78);

    return () => {
      clearInterval(iv);
      timers.forEach(clearTimeout);
    };
  }, [product, memStage, mosaicSlots.length]);

  // Chasing Her crossfading final backdrop
  const chPhotos =
    chData.photos && chData.photos.length > 0
      ? chData.photos
      : ROMANTIC_GALLERY.map((url, idx) => ({ url, caption: `Memory ${idx + 1}` }));

  useEffect(() => {
    if (product !== 'chasing-her' || chStage !== 'main' || chPhotos.length <= 1) return;
    const iv = setInterval(() => {
      setFinalBackdropIdx((i) => (i + 1) % chPhotos.length);
    }, 6000);
    return () => clearInterval(iv);
  }, [product, chStage, chPhotos.length]);

  // Memories slideshow timer & progress bar
  const slides =
    memData.memories && memData.memories.length > 0
      ? memData.memories
      : ROMANTIC_GALLERY.slice(0, 3).map((url, idx) => ({
          url,
          type: 'image' as const,
          caption: `Cherished Memory #${idx + 1}`,
          date: '2025',
          place: 'Together',
          transition: 'fade',
          duration: 6,
        }));
  const activeSlide = slides[slideIdx % slides.length];

  useEffect(() => {
    if (product !== 'memories' || memStage !== 'memories' || !slideshowPlaying || !activeSlide) {
      return;
    }
    if (activeSlide.type === 'video') {
      setSlideProgressPct(100);
      return;
    }
    const totalMs = Math.max(2000, (Number(activeSlide.duration) || 6) * 1000);
    const start = Date.now();
    setSlideProgressPct(0);

    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setSlideProgressPct(pct);
      if (elapsed >= totalMs) {
        clearInterval(tick);
        setSlideIdx((i) => (i + 1) % slides.length);
      }
    }, 80);

    return () => clearInterval(tick);
  }, [product, memStage, slideshowPlaying, slideIdx, activeSlide, slides.length]);

  const mosaicPool =
    memData.mosaic_images && memData.mosaic_images.length > 0
      ? memData.mosaic_images
      : ROMANTIC_GALLERY;

  const resetEnvelope = () => {
    setEnvelopeOpen(false);
    setShowLetterCard(false);
  };

  return (
    <div className="relative rounded-3xl overflow-hidden bg-[#200000] text-[#FDF3EA] border border-[#E2B96F]/35 shadow-2xl">
      {/* Minimal Recipient Header (Audio + Replay + Close Controls Only) */}
      <div className="sticky top-0 z-40 px-4 py-3 bg-[#1A0409]/95 backdrop-blur-md border-b border-[#E2B96F]/25 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-[#C2185B] fill-[#C2185B] shrink-0" />
          <span className="font-['Dancing_Script'] text-lg sm:text-xl text-[#E2B96F] whitespace-nowrap">
            {product === 'chasing-her' ? 'Chasing Her' : 'Memories'}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={togglePlayAudio}
            aria-label={isAudioPlaying ? 'Pause audio' : 'Play audio'}
            className="min-h-[36px] px-3 rounded-full border border-[#E2B96F]/40 bg-[#3A0D18] text-xs font-medium text-[#FDF3EA] flex items-center gap-1.5 cursor-pointer"
          >
            {isAudioPlaying ? (
              <Pause className="h-3.5 w-3.5 text-[#E2B96F]" />
            ) : (
              <Play className="h-3.5 w-3.5 text-[#E2B96F]" />
            )}
            <span className="hidden sm:inline max-w-[160px] truncate">
              {product === 'memories' && activeVoiceUrl
                ? isAudioPlaying
                  ? activeMusicTitle
                    ? `Duet · ${activeMusicTitle}`
                    : 'Duet Playing'
                  : 'Play Duet'
                : activeMusicTitle
                ? `${isAudioPlaying ? 'Pause' : 'Play'} · ${activeMusicTitle}`
                : isAudioPlaying
                ? 'Pause Song'
                : 'Play Song'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              if (musicAudioRef.current) musicAudioRef.current.muted = nextMuted;
              if (voiceAudioRef.current) voiceAudioRef.current.muted = nextMuted;
            }}
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            className="min-h-[36px] w-9 rounded-full border border-white/15 bg-white/5 flex items-center justify-center text-[#E2B96F] cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              resetEnvelope();
              if (product === 'chasing-her') setChStage('gate');
              else setMemStage('gate');
            }}
            aria-label="Replay experience from beginning"
            className="min-h-[36px] w-9 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 flex items-center justify-center text-[#FDF3EA] cursor-pointer"
            title="Replay from Lock Screen"
          >
            <Lock className="h-3.5 w-3.5" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={() => {
                stopAllAudio();
                onClose();
              }}
              aria-label="Close preview"
              className="min-h-[36px] w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* =================================================================
          EDITION A: CHASING HER EXPERIENCE (RESTORED ORIGINAL STRUCTURE)
         ================================================================= */}
      {product === 'chasing-her' && (
        <>
          {chStage === 'gate' && (
            <LoadingGateStage mode="chasing-her" onDone={() => setChStage('login')} />
          )}

          {chStage === 'login' && (
            <RedesignedPasscodeStage
              expectedPin={expectedPin}
              productLabel="Chasing Her"
              showDemoHelper={isPublicShowcase}
              onUnlock={() => {
                startMusicOrDuet();
                setChStage('flowers');
              }}
            />
          )}

          {chStage === 'flowers' && (
            <FlowerCurtainStage
              images={chData.flower_images}
              whisper="For you"
              onDone={() => setChStage('main')}
            />
          )}

          {chStage === 'main' && (
            <div className="relative bg-[#200000]">
              {/* Section 1: Hero with Alternating Marquee Polaroid Rows + Glow + Typewriter */}
              <section className="relative min-h-[460px] flex flex-col items-center justify-center overflow-hidden bg-[#200000] py-14 px-5 border-b border-[#E2B96F]/15">
                <div
                  className="absolute inset-0 flex flex-col justify-center gap-3.5 opacity-80 pointer-events-none"
                  style={{
                    WebkitMaskImage:
                      'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
                    maskImage:
                      'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
                  }}
                >
                  {[0, 1, 2].map((row) => {
                    const repeated = [...chPhotos, ...chPhotos, ...chPhotos, ...chPhotos];
                    return (
                      <div key={row} className="w-full overflow-hidden">
                        <div
                          className={`flex items-center gap-4 w-max ${
                            row % 2 === 0 ? 'ch-marquee-right' : 'ch-marquee-left'
                          }`}
                        >
                          {repeated.map((p, i) => (
                            <div
                              key={i}
                              className="shrink-0 bg-[#f3e9dc] p-1.5 pb-4 rounded-[3px] shadow-xl w-[112px] sm:w-[126px]"
                              style={{ transform: `rotate(${((row * 7 + i * 13) % 9) - 4}deg)` }}
                            >
                              <img
                                src={p.url || ROMANTIC_GALLERY[i % ROMANTIC_GALLERY.length]}
                                alt={p.caption || ''}
                                referrerPolicy="no-referrer"
                                className="w-full h-[104px] sm:h-[118px] object-cover rounded-[2px]"
                              />
                              {p.caption && (
                                <p className="font-['Caveat'] text-[11px] text-[#4a2020] text-center truncate mt-1">
                                  {p.caption}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Atmospheric vignette & radial glow */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(32,0,0,0.42), rgba(32,0,0,0.58) 55%, rgba(32,0,0,0.86))',
                  }}
                />
                <div
                  className="absolute left-1/2 top-1/2 w-[380px] h-[380px] rounded-full pointer-events-none"
                  style={{
                    transform: 'translate(-50%, -50%)',
                    background:
                      'radial-gradient(circle, rgba(232,194,122,0.28), rgba(232,194,122,0) 70%)',
                    filter: 'blur(12px)',
                  }}
                />

                <div className="relative z-10 text-center max-w-2xl mx-auto px-3">
                  <p className="font-['Cormorant_Garamond'] italic text-sm tracking-widest text-[#E2B96F] mb-3">
                    Made exclusively for you
                  </p>
                  <h2
                    className="font-['Dancing_Script'] font-bold text-3xl sm:text-5xl text-[#FDF3EA] leading-tight"
                    style={{ textShadow: '0 4px 32px rgba(0,0,0,0.7)' }}
                  >
                    <TypewriterText text={chData.intro_message} speed={52} />
                  </h2>
                </div>

                <div className="relative z-10 mt-8 flex flex-col items-center gap-1 text-[#FDF3EA]/75">
                  <span className="font-['Cormorant_Garamond'] italic text-sm">
                    Scroll to read my heart
                  </span>
                  <ChevronDown className="w-5 h-5 text-[#E8C27A] animate-bounce" />
                </div>
              </section>

              {/* Section 2: Wax-Sealed 3D Envelope & Typewriter Love Letter */}
              <section
                className="relative py-16 px-6 flex flex-col items-center justify-center text-center border-b border-[#E2B96F]/15"
                style={{
                  background: 'radial-gradient(circle at 50% 25%, #4a0909, #200000 78%)',
                }}
              >
                <p className="font-['Cormorant_Garamond'] italic text-base sm:text-lg text-[#FFEBD8]/70 mb-7">
                  I wrote this down so I&apos;d get every word right
                </p>

                {!showLetterCard && (
                  <div className="flex flex-col items-center gap-4">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!envelopeOpen) {
                          setEnvelopeOpen(true);
                          setTimeout(() => setShowLetterCard(true), 1100);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (!envelopeOpen) {
                            setEnvelopeOpen(true);
                            setTimeout(() => setShowLetterCard(true), 1100);
                          }
                        }
                      }}
                      className={`ch-envelope ${envelopeOpen ? 'open' : ''}`}
                      aria-label="Tap to break the wax seal"
                    >
                      <div className="ch-envelope-body" />
                      <div className="ch-envelope-note" />
                      <div className="ch-envelope-pocket" />
                      <div className="ch-envelope-flap" />
                      <div className="ch-envelope-seal">
                        <Heart className="w-4 h-4 fill-white" />
                      </div>
                    </div>
                    <p className="font-['Caveat'] text-xl text-[#E9CDBF]">
                      {envelopeOpen ? 'Opening…' : 'Tap the wax seal to open'}
                    </p>
                  </div>
                )}

                {showLetterCard && (
                  <div className="max-w-2xl w-full rounded-[28px] bg-white/5 border border-white/15 backdrop-blur-md p-7 sm:p-11 shadow-2xl text-center">
                    <h3 className="font-['Dancing_Script'] font-bold text-3xl sm:text-4xl text-[#E8C27A] mb-3">
                      <TypewriterText text={chData.letter_title} speed={45} />
                    </h3>
                    <div className="flex items-center justify-center gap-3 my-4 opacity-80">
                      <span className="w-12 h-px bg-gradient-to-r from-transparent to-[#E8C27A]" />
                      <Heart className="w-3.5 h-3.5 text-[#E8C27A] fill-[#E8C27A]" />
                      <span className="w-12 h-px bg-gradient-to-l from-transparent to-[#E8C27A]" />
                    </div>
                    <p className="font-['Caveat'] text-2xl sm:text-[26px] leading-[1.85] text-[#FDF3EA] text-left whitespace-pre-wrap">
                      <TypewriterText
                        text={chData.letter_body}
                        speed={15}
                        delay={(chData.letter_title || '').length * 45 + 300}
                      />
                    </p>
                    <button
                      type="button"
                      onClick={resetEnvelope}
                      className="mt-6 text-xs text-[#E8C27A]/80 hover:text-[#E8C27A] underline cursor-pointer"
                    >
                      Fold & Seal Envelope Again
                    </button>
                  </div>
                )}
              </section>

              {/* Section 3: Our Top Songs (Real Spotify Embeds or Rich Cards) */}
              <section
                className="py-14 px-6 border-b border-[#E2B96F]/15"
                style={{ background: 'linear-gradient(180deg, #4a0909, #200000)' }}
              >
                <div className="text-center mb-8">
                  <h3 className="font-['Dancing_Script'] font-bold text-3xl sm:text-4xl text-[#FDF3EA]">
                    Our Top Songs
                  </h3>
                  <p className="font-['Cormorant_Garamond'] italic text-base text-[#E0BFAE] mt-1">
                    the soundtrack of us
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  {(chData.songs && chData.songs.length > 0
                    ? chData.songs
                    : [{ title: 'Love Nwantiti', artist: 'CKay', duration: '2:26' }]
                  ).map((song, idx) => {
                    const trackId = getSpotifyTrackId(song.spotify_url);
                    return (
                      <div
                        key={idx}
                        className="rounded-2xl overflow-hidden border border-white/10 bg-black/25 shadow-lg"
                      >
                        {trackId ? (
                          <iframe
                            src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
                            width="100%"
                            height="152"
                            frameBorder="0"
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            title={song.title}
                          />
                        ) : (
                          <div className="p-4 flex items-center gap-3.5">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#8A1C3A] to-[#3A0D18] flex items-center justify-center shrink-0 text-[#E8C27A]">
                              <Music className="w-6 h-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                                <span>{song.title}</span>
                                {song.explicit && (
                                  <span className="text-[10px] px-1 py-0.5 rounded bg-white/20">E</span>
                                )}
                              </div>
                              <div className="font-['Cormorant_Garamond'] italic text-sm text-white/65 truncate">
                                {song.artist}
                              </div>
                              {song.duration && (
                                <div className="text-[11px] font-mono text-[#E8C27A]/80 mt-0.5">
                                  {song.duration}
                                </div>
                              )}
                            </div>
                            <a
                              href={
                                song.spotify_url ||
                                `https://open.spotify.com/search/${encodeURIComponent(
                                  `${song.title} ${song.artist}`
                                )}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${song.title} on Spotify`}
                              className="w-9 h-9 rounded-full bg-white text-[#200000] flex items-center justify-center shrink-0 hover:scale-105 transition"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Section 4: Crossfading Ken Burns Backdrop + Final Message */}
              <section className="relative py-20 px-6 text-center overflow-hidden bg-[#380000]">
                <div className="absolute inset-0">
                  {chPhotos.map((p, i) => (
                    <img
                      key={i}
                      src={p.url || ROMANTIC_GALLERY[i % ROMANTIC_GALLERY.length]}
                      alt=""
                      referrerPolicy="no-referrer"
                      className={`absolute inset-0 w-full h-full object-cover transition-all duration-[2200ms] ${
                        i === finalBackdropIdx % chPhotos.length
                          ? 'opacity-65 scale-110'
                          : 'opacity-0 scale-100'
                      }`}
                    />
                  ))}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at 50% 45%, rgba(56,9,9,0.22), rgba(32,0,0,0.78) 80%)',
                    }}
                  />
                </div>

                <div className="relative z-10 max-w-2xl mx-auto">
                  <p className="font-['Cormorant_Garamond'] italic text-base text-[#FDF3EA]/75 mb-2">
                    forever yours
                  </p>
                  <h3 className="font-['Dancing_Script'] font-bold text-3xl sm:text-5xl text-[#FDF3EA] mb-7">
                    {chData.final_message}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      resetEnvelope();
                      setChStage('flowers');
                    }}
                    className="min-h-[44px] px-7 py-2.5 rounded-full border border-[#E8C27A]/55 bg-[#FFF7F1]/10 hover:bg-[#FFF7F1]/20 font-['Cormorant_Garamond'] text-base text-[#FDF3EA] inline-flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-[#E8C27A]" />
                    <span>Relive this moment</span>
                  </button>
                </div>
              </section>
            </div>
          )}
        </>
      )}

      {/* =================================================================
          EDITION B: MEMORIES EXPERIENCE (RESTORED ORIGINAL STRUCTURE)
         ================================================================= */}
      {product === 'memories' && (
        <>
          {memStage === 'gate' && (
            <LoadingGateStage mode="memories" onDone={() => setMemStage('login')} />
          )}

          {memStage === 'login' && (
            <RedesignedPasscodeStage
              expectedPin={expectedPin}
              productLabel="Memories"
              showDemoHelper={isPublicShowcase}
              onUnlock={() => setMemStage('intro')}
            />
          )}

          {memStage === 'intro' && (
            <div
              className="relative min-h-[540px] flex flex-col items-center justify-center gap-7 px-6 py-12 text-center"
              style={{
                background: 'radial-gradient(circle at 50% 40%, #4a0909, #200000 80%)',
              }}
            >
              <h2 className="font-['Dancing_Script'] font-bold text-4xl sm:text-5xl text-[#FDF3EA]">
                {memData.hero_title}
              </h2>

              <button
                type="button"
                onClick={() => {
                  startMusicOrDuet();
                  setMemStage(mosaicPool.length > 0 ? 'collage' : 'flowers');
                }}
                aria-label="Play voice note and open 34-photo heart mosaic"
                className="relative w-32 h-28 flex items-center justify-center group cursor-pointer"
              >
                <div className="w-full h-full ch-pulse-heart drop-shadow-[0_14px_26px_rgba(194,24,91,0.55)] group-hover:scale-110 transition-transform">
                  <HeartSvg />
                </div>
                <Play className="absolute w-8 h-8 text-white fill-white" />
              </button>

              <p className="font-['Caveat'] font-semibold text-2xl text-[#E9CDBF] max-w-md">
                {memData.hero_subtitle}
              </p>

              {(activeVoiceUrl || activeMusicUrl) && (
                <span className="inline-flex items-center gap-2 text-xs text-[#E2B96F] bg-black/30 border border-[#E2B96F]/30 px-3.5 py-1.5 rounded-full">
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voice Note + Music Duet Ready</span>
                </span>
              )}
            </div>
          )}

          {memStage === 'collage' && (
            <div
              className="relative min-h-[560px] flex flex-col items-center justify-center gap-4 px-4 py-10 overflow-hidden"
              style={{
                background: 'radial-gradient(circle at 50% 42%, #4a0909, #200000 78%)',
              }}
            >
              {memData.collage_names && (
                <h2 className="font-['Dancing_Script'] font-bold text-3xl sm:text-4xl text-[#FDF3EA] z-20">
                  {memData.collage_names}
                </h2>
              )}

              <div className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] flex items-center justify-center">
                {/* Ambient glow */}
                <div
                  className={`absolute left-1/2 top-1/2 w-[140%] h-[140%] rounded-full pointer-events-none transition-opacity duration-1000 ${
                    collagePhase !== 'placing' ? 'opacity-100' : 'opacity-0'
                  } ${collagePhase === 'beating' ? 'ch-glow-beating' : ''}`}
                  style={{
                    transform: 'translate(-50%, -50%)',
                    background:
                      'radial-gradient(circle, rgba(232,135,159,0.34), rgba(232,135,159,0) 62%)',
                  }}
                />

                {/* Shockwave ring */}
                <div
                  className={`absolute left-1/2 top-[52%] w-10 h-10 rounded-full border-2 border-[#FFF0E6]/90 opacity-0 pointer-events-none ${
                    collagePhase === 'exploding' ? 'ch-shockwave-go' : ''
                  }`}
                />

                {/* 34 Beating Heart Tiles */}
                <div
                  className={`relative w-full h-full ${
                    collagePhase === 'beating' ? 'ch-collage-beating' : ''
                  }`}
                >
                  {mosaicSlots.map((slot) => {
                    const img = mosaicPool[slot.id % mosaicPool.length];
                    const visible = slot.order < placedCount;
                    const exploding = collagePhase === 'exploding';
                    const tx = (slot.xPct - 0.5) * 620;
                    const ty = (slot.yPct - 0.5) * 620;

                    return (
                      <div
                        key={slot.id}
                        className="absolute rounded-[4px] overflow-hidden border-[3px] border-[#FDF1E7] bg-[#3A1414] shadow-lg"
                        style={{
                          left: `${slot.xPct * 100}%`,
                          top: `${slot.yPct * 100}%`,
                          width: `${slot.widthPct * 100}%`,
                          height: `${slot.heightPct * 100}%`,
                          zIndex: visible ? slot.order + 2 : 0,
                          opacity: exploding ? 0 : visible ? 1 : 0,
                          transform: exploding
                            ? `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(1.25) rotate(${slot.rotate * 2}deg)`
                            : visible
                            ? `translate(-50%, -50%) rotate(${slot.rotate}deg) scale(1)`
                            : `translate(-50%, -50%) scale(0.35)`,
                          transition: exploding
                            ? 'all 1050ms cubic-bezier(.16,1,.3,1)'
                            : 'all 620ms cubic-bezier(.34,1.35,.64,1)',
                        }}
                      >
                        <img
                          src={img}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  })}

                  {/* Sticky Note + Date */}
                  {memData.collage_quote && (
                    <div
                      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-3 z-50 bg-[#FDF8EF] text-[#3A2418] px-4 py-3 rounded shadow-2xl text-center max-w-[210px] border border-[#DCC397] transition-all duration-700 ${
                        collagePhase === 'settled' || collagePhase === 'beating'
                          ? 'opacity-100 scale-100'
                          : collagePhase === 'exploding'
                          ? 'opacity-0 scale-150'
                          : 'opacity-0 scale-75'
                      }`}
                    >
                      <p className="font-['Caveat'] text-base sm:text-lg font-bold leading-snug">
                        “{memData.collage_quote}”
                      </p>
                      {(memData.collage_day || memData.collage_month || memData.collage_year) && (
                        <p className="text-[11px] font-semibold tracking-widest text-[#8A4E5D] mt-1">
                          {[memData.collage_day, memData.collage_month, memData.collage_year]
                            .filter(Boolean)
                            .join(' ❤ ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMemStage('flowers')}
                className="relative z-20 text-xs text-[#E2B96F] hover:underline cursor-pointer"
              >
                Part Opening Flowers →
              </button>
            </div>
          )}

          {memStage === 'flowers' && (
            <FlowerCurtainStage
              images={memData.flower_images}
              whisper={memData.collage_names || 'Our Story'}
              onDone={() => setMemStage('memories')}
            />
          )}

          {memStage === 'memories' && (
            <div
              className="py-12 px-4 sm:px-8"
              style={{ background: 'linear-gradient(180deg, #4a0909, #200000)' }}
            >
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-6">
                  <h2 className="font-['Dancing_Script'] font-bold text-3xl sm:text-4xl text-[#FDF3EA]">
                    Our Memories Together
                  </h2>
                  <p className="font-['Cormorant_Garamond'] italic text-sm text-[#E2B96F] mt-1">
                    Transition Effect: <span className="font-mono">{activeSlide.transition || 'fade'}</span>
                  </p>
                </div>

                {/* Slide Stage */}
                <div className="relative rounded-2xl overflow-hidden bg-[#140505] aspect-[4/3] sm:aspect-[16/10] shadow-2xl border border-[#E8C27A]/30">
                  <div
                    key={`${slideIdx}-${activeSlide.transition || 'fade'}`}
                    className={`w-full h-full ch-fx-${activeSlide.transition || 'fade'} ${
                      slideIdx % 2 === 0 ? 'ch-kb-in' : 'ch-kb-out'
                    }`}
                  >
                    {activeSlide.type === 'video' ? (
                      <video
                        src={activeSlide.url}
                        autoPlay
                        muted={activeSlide.muted !== false}
                        playsInline
                        onEnded={() =>
                          slideIdx + 1 < slides.length && setSlideIdx((i) => i + 1)
                        }
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={activeSlide.url}
                        alt={activeSlide.caption || 'Memory slide'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Caption Gradient */}
                  {(activeSlide.caption || activeSlide.date || activeSlide.place) && (
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 bg-gradient-to-t from-black/85 via-black/35 to-transparent text-left">
                      <p className="font-['Caveat'] text-2xl sm:text-3xl text-white font-semibold">
                        {activeSlide.caption}
                      </p>
                      <p className="font-['Cormorant_Garamond'] text-sm sm:text-base text-[#E8C27A] mt-0.5">
                        {[activeSlide.date, activeSlide.place].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  )}

                  {/* Top Slide Duration Progress Fill */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-white/15">
                    <div
                      className="h-full bg-[#E8C27A] transition-all duration-100"
                      style={{ width: `${slideProgressPct}%` }}
                    />
                  </div>
                </div>

                {/* Slideshow Navigation & Heart Indicators */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSlideIdx((i) => (i - 1 + slides.length) % slides.length)}
                      aria-label="Previous memory slide"
                      className="min-h-[44px] min-w-[44px] rounded-full border border-[#E8C27A]/40 bg-white/5 hover:bg-white/15 flex items-center justify-center text-[#FDF3EA] cursor-pointer"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSlideshowPlaying((p) => !p)}
                      aria-label={slideshowPlaying ? 'Pause slideshow' : 'Play slideshow'}
                      className="min-h-[44px] px-4 rounded-full border border-[#E8C27A]/40 bg-white/5 hover:bg-white/15 flex items-center gap-1.5 text-xs font-medium text-[#FDF3EA] cursor-pointer"
                    >
                      {slideshowPlaying ? (
                        <Pause className="w-3.5 h-3.5 text-[#E8C27A]" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-[#E8C27A]" />
                      )}
                      <span>
                        {(slideIdx % slides.length) + 1} / {slides.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSlideIdx((i) => (i + 1) % slides.length)}
                      aria-label="Next memory slide"
                      className="min-h-[44px] min-w-[44px] rounded-full border border-[#E8C27A]/40 bg-white/5 hover:bg-white/15 flex items-center justify-center text-[#FDF3EA] cursor-pointer"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Dot indicators */}
                  <div className="flex items-center gap-1.5">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSlideIdx(i)}
                        aria-label={`Jump to slide ${i + 1}`}
                        className={`h-2.5 rounded-full transition-all cursor-pointer ${
                          i === slideIdx % slides.length
                            ? 'w-7 bg-[#E8C27A]'
                            : 'w-2.5 bg-white/30 hover:bg-white/55'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      resetEnvelope();
                      setMemStage('letter');
                    }}
                    className="min-h-[44px] px-5 rounded-full bg-[#E8C27A] text-[#20040A] font-semibold text-xs flex items-center gap-1.5 hover:brightness-105 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Open Sealed Letter →</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {memStage === 'letter' && (
            <div
              className="min-h-[540px] py-14 px-6 flex flex-col items-center justify-center text-center"
              style={{
                background: 'radial-gradient(circle at 50% 22%, #4a0909, #200000 78%)',
              }}
            >
              {!showLetterCard ? (
                <div className="flex flex-col items-center gap-5">
                  <p className="font-['Cormorant_Garamond'] italic text-lg text-[#FFEBD8]/75">
                    Tap the wax seal for my final letter
                  </p>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (!envelopeOpen) {
                        setEnvelopeOpen(true);
                        setTimeout(() => setShowLetterCard(true), 800);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!envelopeOpen) {
                          setEnvelopeOpen(true);
                          setTimeout(() => setShowLetterCard(true), 800);
                        }
                      }
                    }}
                    className={`ch-envelope ${envelopeOpen ? 'open' : ''}`}
                    aria-label="Open memories letter envelope"
                  >
                    <div className="ch-envelope-body" />
                    <div className="ch-envelope-note" />
                    <div className="ch-envelope-pocket" />
                    <div className="ch-envelope-flap" />
                    <div className="ch-envelope-seal">
                      <Heart className="w-4 h-4 fill-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl w-full rounded-[24px] bg-white/5 border border-white/15 backdrop-blur-md p-7 sm:p-11 text-left shadow-2xl">
                  <h3 className="font-['Dancing_Script'] font-bold text-3xl sm:text-4xl text-[#E8C27A] text-center mb-5">
                    <TypewriterText text={memData.letter_title} speed={55} />
                  </h3>
                  <p className="font-['Caveat'] text-2xl sm:text-[26px] leading-[1.9] text-[#FDF3EA] whitespace-pre-wrap">
                    <TypewriterText
                      text={memData.letter_body}
                      speed={22}
                      delay={(memData.letter_title || '').length * 55 + 250}
                    />
                  </p>
                  <p className="font-['Dancing_Script'] text-2xl text-[#E8C27A] text-center mt-6">
                    {memData.final_message}
                  </p>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        resetEnvelope();
                        setMemStage('intro');
                      }}
                      className="min-h-[44px] px-6 rounded-full border border-[#E8C27A]/50 bg-white/5 hover:bg-white/10 text-xs font-medium text-[#FDF3EA] inline-flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#E8C27A]" />
                      <span>Replay our story</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
