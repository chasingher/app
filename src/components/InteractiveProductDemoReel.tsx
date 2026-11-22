import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Heart,
  Music,
  Mic,
  Wand2,
  Smartphone,
  Eye,
  Volume2,
  Image as ImageIcon,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import {
  ChasingHerProjectData,
  MemoriesProjectData,
  ShowcaseMediaMap,
  SiteExperienceShowcaseMap,
  DEFAULT_SITE_EXPERIENCES,
  buildHeartMosaicLayout,
} from '../utils/platformLogic';
import { DEFAULT_FLOWER_POOL } from '../utils/supabaseAndOci';
import { SALES_PAGE_ASSETS } from '../utils/salesPageAssets';
import { RecipientSitePreview } from './RecipientSitePreview';

const INSTANT_MOSAIC_POOL = [
  SALES_PAGE_ASSETS.polaroid1,
  SALES_PAGE_ASSETS.polaroid2,
  SALES_PAGE_ASSETS.polaroid3,
  SALES_PAGE_ASSETS.heroShot,
];

interface InteractiveProductDemoReelProps {
  partnerName: string;
  customPin: string;
  customOpeningLine: string;
  pricePage: string;
  chasingHerDemo: ChasingHerProjectData;
  memoriesDemo: MemoriesProjectData;
  showcaseMedia: ShowcaseMediaMap;
  siteExperiences?: SiteExperienceShowcaseMap;
  campaignMode?: 'reconcile' | 'birthday';
  onSelectProductAndCheckout: (product: 'chasing-her' | 'memories') => void;
  onOpenFullModal: (product: 'chasing-her' | 'memories') => void;
}

interface CarouselSlideSpec {
  id: string;
  stepBadge: string;
  perspective: 'creator' | 'recipient-both' | 'recipient-chasing' | 'recipient-memories';
  perspectiveLabel: string;
  title: string;
  subtitle: string;
  emotionalQuote: string;
  durationSec: number;
}

const DEMO_CAROUSEL_SLIDES: CarouselSlideSpec[] = [
  {
    id: 'builder-studio',
    stepBadge: '01 · CREATOR STUDIO',
    perspective: 'creator',
    perspectiveLabel: 'Inside Your Guided Builder',
    title: 'Upload photos, trim your song chorus & write from the heart in minutes',
    subtitle:
      'No coding or design skills needed. Pick your opening flowers, drop in your favorite photos with captions, trim the exact second your song chorus drops, or record a voice note.',
    emotionalQuote: '“Everything auto-saves for 48 hours while the live preview updates beside you.”',
    durationSec: 5.5,
  },
  {
    id: 'passcode-vault',
    stepBadge: '02 · RECIPIENT UNBOXING',
    perspective: 'recipient-both',
    perspectiveLabel: 'What They See First On Their Phone',
    title: 'Cupid’s arrow strikes the 3D heart & unlocks their secret birthday PIN',
    subtitle:
      'You send them their private link at midnight. When they tap it, a velvet-and-gold vault asks for a 6-digit code only the two of you know—like their birthday or the day you met.',
    emotionalQuote: '“Wait... why does this link have our secret date as the passcode?!”',
    durationSec: 5,
  },
  {
    id: 'flower-curtain',
    stepBadge: '03 · BOTANICAL REVEAL',
    perspective: 'recipient-both',
    perspectiveLabel: 'Soundtrack & Spinning Flower Curtain',
    title: 'Your chosen song fades in as a spinning curtain of flowers blooms open',
    subtitle:
      'The moment the last digit of their PIN clicks in, your custom chorus begins playing and our 5 signature botanical blossoms spin and part across their screen to reveal your opening line.',
    emotionalQuote: '“The moment our song started playing and the flowers parted, she gasped.”',
    durationSec: 5,
  },
  {
    id: 'chasing-her-story',
    stepBadge: '04 · CHASING HER EDITION',
    perspective: 'recipient-chasing',
    perspectiveLabel: 'Drifting Polaroids & 3D Wax-Sealed Letter',
    title: 'Two drifting rows of Polaroid memories lead to a crimson wax-sealed letter',
    subtitle:
      'Your photos drift past like vintage Polaroids with handwritten captions underneath, followed by an interactive 3D envelope they tap to reveal your typewriter love letter.',
    emotionalQuote: '“She tapped the crimson wax seal and started crying before line three.”',
    durationSec: 6,
  },
  {
    id: 'memories-mosaic',
    stepBadge: '05 · MEMORIES EDITION',
    perspective: 'recipient-memories',
    perspectiveLabel: '34-Photo Beating Heart & Voice Duet',
    title: '34 of your photos fly into a beating heart mosaic with your voice reading to them',
    subtitle:
      'Watch 34 photos assemble tile-by-tile from the center outward into a beating heart, then burst into a 9-transition slideshow while your background music softens under your voice note.',
    emotionalQuote: '“Hearing my voice reading the letter over our 34 photos broke her in the best way.”',
    durationSec: 6,
  },
];

export const InteractiveProductDemoReel: React.FC<InteractiveProductDemoReelProps> = ({
  partnerName,
  customPin,
  customOpeningLine,
  pricePage,
  chasingHerDemo,
  memoriesDemo,
  siteExperiences = DEFAULT_SITE_EXPERIENCES,
  campaignMode = 'birthday',
  onSelectProductAndCheckout,
  onOpenFullModal,
}) => {
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [isHoveringStage, setIsHoveringStage] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const [viewMode, setViewMode] = useState<'carousel' | 'live-chasing-her' | 'live-memories'>(
    'carousel'
  );

  // Interactive micro-states inside slides when playing/hovering
  const [builderSimStep, setBuilderSimStep] = useState(0);
  const [typedPinCount, setTypedPinCount] = useState(2);
  const [waxSealCracked, setWaxSealCracked] = useState(false);
  const [mosaicPlacedCount, setMosaicPlacedCount] = useState(34);

  const carouselSlides = useMemo<CarouselSlideSpec[]>(() => {
    return DEMO_CAROUSEL_SLIDES.map((slide) => {
      if (slide.id === 'chasing-her-story') {
        const exp = siteExperiences['chasing-her'];
        return {
          ...slide,
          title: exp.demoSceneTitle || slide.title,
          subtitle: exp.demoSceneSubtitle || slide.subtitle,
          emotionalQuote: exp.demoSceneQuote || slide.emotionalQuote,
        };
      }
      if (slide.id === 'memories-mosaic') {
        const exp = siteExperiences.memories;
        return {
          ...slide,
          title: exp.demoSceneTitle || slide.title,
          subtitle: exp.demoSceneSubtitle || slide.subtitle,
          emotionalQuote: exp.demoSceneQuote || slide.emotionalQuote,
        };
      }
      return slide;
    });
  }, [siteExperiences]);

  const mosaicSlots = useMemo(() => buildHeartMosaicLayout(9, 7), []);
  const activeSlide = carouselSlides[activeSlideIdx] || carouselSlides[0];
  const isMotionActive = isAutoPlaying || (isHoveringStage && !manuallyPaused);

  const sanitizedSlug =
    (partnerName || 'amara')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'amara';

  const displayPin = (customPin || '140826').padEnd(6, '8').slice(0, 6);

  // Carousel progress timer (advances smoothly when isMotionActive is true in 'carousel' mode)
  useEffect(() => {
    if (viewMode !== 'carousel' || !isMotionActive) return;

    const durationMs = activeSlide.durationSec * 1000;
    const intervalMs = 60;
    const stepPct = (intervalMs / durationMs) * 100;

    const timer = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev + stepPct >= 100) {
          setActiveSlideIdx((idx) => (idx + 1) % DEMO_CAROUSEL_SLIDES.length);
          return 0;
        }
        return prev + stepPct;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [viewMode, isMotionActive, activeSlideIdx, activeSlide.durationSec]);

  // Reset slide-specific micro-animations when switching slides
  useEffect(() => {
    setSlideProgress(0);
    if (activeSlide.id === 'builder-studio') {
      setBuilderSimStep(0);
      const t1 = setTimeout(() => setBuilderSimStep(1), 1100);
      const t2 = setTimeout(() => setBuilderSimStep(2), 2400);
      const t3 = setTimeout(() => setBuilderSimStep(3), 3700);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
    if (activeSlide.id === 'passcode-vault') {
      setTypedPinCount(2);
      const iv = setInterval(() => {
        setTypedPinCount((c) => (c < 6 ? c + 1 : 2));
      }, 650);
      return () => clearInterval(iv);
    }
    if (activeSlide.id === 'chasing-her-story') {
      setWaxSealCracked(false);
      const t = setTimeout(() => setWaxSealCracked(true), 1800);
      return () => clearTimeout(t);
    }
    if (activeSlide.id === 'memories-mosaic') {
      setMosaicPlacedCount(12);
      const iv = setInterval(() => {
        setMosaicPlacedCount((c) => (c < 34 ? Math.min(34, c + 6) : 34));
      }, 220);
      return () => clearInterval(iv);
    }
  }, [activeSlide.id]);

  const handleSelectSlide = (idx: number) => {
    setViewMode('carousel');
    setActiveSlideIdx(idx);
    setSlideProgress(0);
  };

  const handlePrevSlide = () => {
    setViewMode('carousel');
    setActiveSlideIdx(
      (idx) => (idx - 1 + DEMO_CAROUSEL_SLIDES.length) % DEMO_CAROUSEL_SLIDES.length
    );
    setSlideProgress(0);
  };

  const handleNextSlide = () => {
    setViewMode('carousel');
    setActiveSlideIdx((idx) => (idx + 1) % DEMO_CAROUSEL_SLIDES.length);
    setSlideProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* Top Mode Bar: Interactive Storyboard Reel vs Direct Live Embedded Playable Sites */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#DCC397] font-bold mb-2">
            {campaignMode === 'reconcile'
              ? 'Actual Builder & Recipient Demonstration'
              : 'Section 02 · Interactive Creator & Unboxing Cinema'}
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-[40px] leading-[1.12] text-[#FBF3EA]">
            {campaignMode === 'reconcile'
              ? 'See how you create her personal love letter in minutes—and what she experiences when she opens your link.'
              : 'Watch how you build it in minutes—and how they unwrap it at midnight.'}
          </h2>
        </div>

        {/* Mode Switcher: Auto-Play Reel vs Live Embedded Interactive Experiences */}
        <div className="flex flex-wrap sm:flex-nowrap shrink-0 items-center gap-1.5 self-start lg:self-end bg-[#140308] p-1.5 rounded-2xl border border-[#DCC397]/30">
          <button
            type="button"
            onClick={() => setViewMode('carousel')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'carousel'
                ? 'bg-[#DCC397] text-[#2B1710] shadow-xs'
                : 'text-[#FBF3EA]/75 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>5-Scene Motion Reel</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('live-chasing-her')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'live-chasing-her'
                ? 'bg-[#DCC397] text-[#2B1710] shadow-xs'
                : 'text-[#FBF3EA]/75 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Try Live “Chasing Her”</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('live-memories')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'live-memories'
                ? 'bg-[#DCC397] text-[#2B1710] shadow-xs'
                : 'text-[#FBF3EA]/75 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Try Live “Memories”</span>
          </button>
        </div>
      </div>

      {/* IF USER SWITCHED TO EMBEDDED LIVE INTERACTIVE SITE */}
      {viewMode !== 'carousel' ? (
        <div className="rounded-[28px] bg-[#140308] border-2 border-[#DCC397]/45 p-3 sm:p-6 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-[#DCC397]/20 border border-[#DCC397]/40 text-[#DCC397] text-xs font-bold">
                Live Interactive Experience · No Static Placeholders
              </span>
              <span className="text-xs text-[#F5DAD5]/85">
                Type PIN{' '}
                <strong className="font-mono text-[#DCC397]">
                  {viewMode === 'live-chasing-her' ? chasingHerDemo.pin : memoriesDemo.pin}
                </strong>{' '}
                or tap Skip Passcode inside the phone screen
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onSelectProductAndCheckout(
                    viewMode === 'live-chasing-her' ? 'chasing-her' : 'memories'
                  )
                }
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#DCC397] to-[#B98A4E] text-[#2B1710] font-extrabold text-xs cursor-pointer"
              >
                Lock In This Experience ({pricePage}) →
              </button>
              <button
                type="button"
                onClick={() => setViewMode('carousel')}
                className="px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-[#FBF3EA] cursor-pointer"
              >
                ← Back to 5-Scene Reel
              </button>
            </div>
          </div>

          <div className="max-h-[680px] overflow-y-auto rounded-2xl">
            <RecipientSitePreview
              product={viewMode === 'live-chasing-her' ? 'chasing-her' : 'memories'}
              chasingHerData={chasingHerDemo}
              memoriesData={memoriesDemo}
            />
          </div>
        </div>
      ) : (
        /* 5-SCENE HOVER-TO-PLAY / AUTO-PLAY INTERACTIVE CAROUSEL */
        <div
          onMouseEnter={() => setIsHoveringStage(true)}
          onMouseLeave={() => setIsHoveringStage(false)}
          className="rounded-[30px] bg-[#140308] border border-[#B98A4E]/45 p-4 sm:p-7 md:p-9 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.65)] space-y-6"
        >
          {/* Segmented Storyboard Progress Scrubber */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {DEMO_CAROUSEL_SLIDES.map((slide, idx) => {
              const isActive = idx === activeSlideIdx;
              const isPassed = idx < activeSlideIdx;
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => handleSelectSlide(idx)}
                  className={`p-3 rounded-2xl text-left border transition relative overflow-hidden cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-br from-[#5A1A2C] to-[#2F0A15] border-[#DCC397] shadow-md'
                      : 'bg-white/5 border-white/10 text-[#FBF3EA]/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {/* Top progress bar inside each pill */}
                  <div className="h-1 w-full bg-white/15 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-[#DCC397] transition-all duration-75"
                      style={{
                        width: isActive ? `${slideProgress}%` : isPassed ? '100%' : '0%',
                      }}
                    />
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#DCC397] truncate">
                    {slide.stepBadge}
                  </div>
                  <div className="font-serif text-xs sm:text-sm text-[#FBF3EA] font-medium truncate mt-0.5">
                    {slide.perspectiveLabel}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main Split Cinema Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            {/* Left Column: Narrative + Playback Controls (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-5 bg-[#1E060E]/90 rounded-[24px] p-5 sm:p-6 border border-white/10">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCC397]/15 border border-[#DCC397]/40 text-[#DCC397] text-[11px] font-bold uppercase tracking-wider">
                    {activeSlide.perspective === 'creator' ? (
                      <Wand2 className="w-3.5 h-3.5" />
                    ) : (
                      <Smartphone className="w-3.5 h-3.5" />
                    )}
                    <span>{activeSlide.perspectiveLabel}</span>
                  </span>

                  <span className="text-[11px] font-mono text-[#DCC397]/80">
                    Scene 0{activeSlideIdx + 1} / 0{DEMO_CAROUSEL_SLIDES.length}
                  </span>
                </div>

                <h3 className="font-serif text-2xl sm:text-[28px] text-[#FBF3EA] leading-[1.2]">
                  {activeSlide.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#F5DAD5]/85 leading-relaxed">
                  {activeSlide.subtitle}
                </p>

                <div className="p-3.5 rounded-2xl bg-[#2A0914] border-l-2 border-[#DCC397] font-serif italic text-xs sm:text-sm text-[#DCC397]">
                  {activeSlide.emotionalQuote}
                </div>
              </div>

              {/* Carousel Transport Controls & Direct Launch */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handlePrevSlide}
                      aria-label="Previous demonstration scene"
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#FBF3EA] cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isMotionActive) {
                          setIsAutoPlaying(false);
                          setManuallyPaused(true);
                        } else {
                          setManuallyPaused(false);
                          setIsAutoPlaying(true);
                        }
                      }}
                      className="px-3.5 py-2 rounded-full bg-[#DCC397]/20 hover:bg-[#DCC397]/30 border border-[#DCC397]/40 text-[#DCC397] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {isMotionActive ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause Reel</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Hover or Tap to Play</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSlide}
                      aria-label="Next demonstration scene"
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#FBF3EA] cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setViewMode(
                        activeSlide.id === 'memories-mosaic'
                          ? 'live-memories'
                          : 'live-chasing-her'
                      )
                    }
                    className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-[#FBF3EA] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#DCC397]" />
                    <span>Interact Live ↗</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Kinetic Visual Viewport (7 cols) */}
            <div className="lg:col-span-7">
              <div className="h-full min-h-[410px] rounded-[24px] bg-gradient-to-b from-[#2A0812] via-[#1C040B] to-[#120206] border border-[#DCC397]/40 p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden shadow-inner">
                {/* Top Device Chrome Bar */}
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10 text-[11px] z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C2185B]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#DCC397]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="ml-2 font-mono text-[#DCC397] truncate">
                      {activeSlide.perspective === 'creator'
                        ? `mysite.chasingher.love/builder/for-${sanitizedSlug}`
                        : `chasingher.love/for-${sanitizedSlug}`}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-[#DCC397] text-[10px] font-bold uppercase tracking-wider">
                    {isMotionActive ? '● Live Motion Active' : 'Hover or Tap to Animate'}
                  </span>
                </div>

                {/* =========================================================
                    SCENE 01: GUIDED BUILDER STUDIO LIVE WORKFLOW
                   ========================================================= */}
                {activeSlide.id === 'builder-studio' && (
                  <div className="my-auto py-3 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center z-10">
                    {/* Left: Simulated Builder Controls */}
                    <div className="sm:col-span-7 space-y-2.5 bg-[#FFFBF6] text-[#2B1710] p-4 rounded-2xl border border-[#B98A4E]/40 shadow-lg">
                      <div className="flex items-center justify-between border-b border-[#5A1A2C]/10 pb-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#5A1A2C]">
                          Guided Love Builder
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold">
                          Auto-Saved · {builderSimStep >= 2 ? '100%' : '85%'} Ready
                        </span>
                      </div>

                      {/* Step A: Photo Polaroids Uploaded */}
                      <div
                        onClick={() => setBuilderSimStep(0)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer ${
                          builderSimStep === 0
                            ? 'border-[#5A1A2C] bg-[#F5DAD5]/40'
                            : 'border-[#2B1710]/10 bg-[#FBF3EA]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-[#5A1A2C] mb-1.5">
                          <span className="flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5" /> 1. Drop Your Photos &amp; Captions
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold">6 Uploaded ✓</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[
                            SALES_PAGE_ASSETS.polaroid1,
                            SALES_PAGE_ASSETS.polaroid2,
                            SALES_PAGE_ASSETS.polaroid3,
                          ].map((src, i) => (
                            <img
                              key={i}
                              src={src}
                              alt="Uploaded memory"
                              className="w-10 h-10 rounded-lg object-cover border border-[#5A1A2C]/20"
                            />
                          ))}
                          <span className="text-[11px] italic text-[#7A5A47] pl-1">
                            &ldquo;Sunset with {partnerName || 'Amara'}&rdquo;
                          </span>
                        </div>
                      </div>

                      {/* Step B: Chorus Waveform Trimmer + Voice Duet */}
                      <div
                        onClick={() => setBuilderSimStep(1)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer ${
                          builderSimStep === 1
                            ? 'border-[#5A1A2C] bg-[#F5DAD5]/40'
                            : 'border-[#2B1710]/10 bg-[#FBF3EA]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-[#5A1A2C] mb-1">
                          <span className="flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5" /> 2. Trim Song Chorus &amp; Voice Note
                          </span>
                          <span className="font-mono text-[10px] text-[#7A5A47]">0:42 – 1:28</span>
                        </div>
                        <div className="flex items-end gap-0.5 h-5 px-1">
                          {[35, 65, 90, 50, 85, 100, 75, 95, 60, 80, 95, 70, 55, 85, 45, 70].map(
                            (h, i) => (
                              <span
                                key={i}
                                className={`flex-1 rounded-full transition-all duration-300 ${
                                  i >= 3 && i <= 12 ? 'bg-[#5A1A2C]' : 'bg-[#5A1A2C]/25'
                                }`}
                                style={{
                                  height: `${
                                    isMotionActive ? Math.max(25, (h + builderSimStep * 17) % 100) : h
                                  }%`,
                                }}
                              />
                            )
                          )}
                        </div>
                      </div>

                      {/* Step C: Love Letter & Secret PIN */}
                      <div
                        onClick={() => setBuilderSimStep(2)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer ${
                          builderSimStep >= 2
                            ? 'border-[#5A1A2C] bg-[#F5DAD5]/40'
                            : 'border-[#2B1710]/10 bg-[#FBF3EA]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-[#5A1A2C]">
                          <span>3. Wax-Sealed Letter &amp; PIN</span>
                          <span className="font-mono text-[11px] bg-[#5A1A2C] text-[#FBF3EA] px-2 py-0.5 rounded">
                            PIN: {displayPin}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Synchronized Live Phone Preview */}
                    <div className="sm:col-span-5 rounded-2xl bg-[#22060F] border-2 border-[#DCC397]/50 p-3.5 text-center space-y-2.5 shadow-2xl">
                      <div className="text-[10px] uppercase tracking-widest text-[#DCC397] font-bold">
                        Live Recipient Phone
                      </div>
                      <div className="relative w-24 h-24 mx-auto">
                        <img
                          src={SALES_PAGE_ASSETS.polaroid2}
                          alt="Live phone preview"
                          className="w-full h-full object-cover rounded-xl border border-[#DCC397]/40 shadow-md"
                        />
                        <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-[#C2185B] text-white flex items-center justify-center text-xs shadow">
                          ♥
                        </span>
                      </div>
                      <div className="font-serif italic text-base text-[#FBF3EA]">
                        For {partnerName || 'Amara'}
                      </div>
                      <p className="text-[11px] text-[#F5DAD5]/80 line-clamp-2">
                        &ldquo;{customOpeningLine}&rdquo;
                      </p>
                      <div className="pt-1">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold">
                          ✓ Ready to Share on WhatsApp
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* =========================================================
                    SCENE 02: CUPID ARROW GATE & SECRET PASSCODE VAULT
                   ========================================================= */}
                {activeSlide.id === 'passcode-vault' && (
                  <div className="my-auto py-3 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center z-10">
                    {/* Left: Midnight WhatsApp Message + 3D Split Heart */}
                    <div className="sm:col-span-6 space-y-3">
                      <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/35 text-left text-xs text-emerald-100 shadow-md">
                        <div className="text-[10px] text-emerald-300 font-bold mb-1">
                          WhatsApp · 12:00 AM (Their Birthday)
                        </div>
                        &ldquo;Happy Birthday my love ❤️ Open your surprise:{' '}
                        <span className="underline text-[#DCC397] font-mono">
                          chasingher.love/for-{sanitizedSlug}
                        </span>{' '}
                        — your PIN is your birthday!&rdquo;
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-2">
                        <img
                          src={SALES_PAGE_ASSETS.finalHeart}
                          alt="3D Heart"
                          className="w-16 h-16 mx-auto object-contain ch-pulse-heart"
                        />
                        <div className="text-xs font-serif italic text-[#DCC397]">
                          Cupid&apos;s golden arrow strikes the 3D heart to reveal the passcode screen
                        </div>
                      </div>
                    </div>

                    {/* Right: Interactive Burgundy & Gold Keypad */}
                    <div className="sm:col-span-6 rounded-2xl bg-[#2D0914] border border-[#DCC397]/45 p-4 text-center space-y-3 shadow-xl">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#DCC397] font-bold">
                        🔒 Private Keepsake For {partnerName || 'Amara'}
                      </div>

                      {/* 6 PIN Slots */}
                      <div className="flex items-center justify-center gap-1.5">
                        {displayPin.split('').map((digit, i) => {
                          const revealed = i < typedPinCount;
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setTypedPinCount(i + 1)}
                              className={`w-8 h-9 rounded-lg border font-mono text-sm font-bold flex items-center justify-center transition cursor-pointer ${
                                revealed
                                  ? 'bg-[#DCC397] text-[#2B1710] border-[#DCC397] scale-105'
                                  : 'bg-white/10 text-[#DCC397] border-[#DCC397]/40'
                              }`}
                            >
                              {revealed ? digit : '•'}
                            </button>
                          );
                        })}
                      </div>

                      {/* Mini Keypad Grid */}
                      <div className="grid grid-cols-3 gap-1.5 max-w-[180px] mx-auto pt-1">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setTypedPinCount((c) => (c < 6 ? c + 1 : 1))}
                            className="py-1.5 rounded-lg bg-white/5 hover:bg-[#DCC397]/25 border border-white/10 text-xs font-semibold text-[#FBF3EA] cursor-pointer"
                          >
                            {n}
                          </button>
                        ))}
                      </div>

                      <div className="text-[11px] text-[#DCC397]">
                        {typedPinCount >= 6
                          ? '✨ Passcode Verified! Parting the flowers...'
                          : 'Tap any key or watch the PIN unlock automatically'}
                      </div>
                    </div>
                  </div>
                )}

                {/* =========================================================
                    SCENE 03: BLOOMING BOTANICAL CURTAIN & SOUNDTRACK
                   ========================================================= */}
                {activeSlide.id === 'flower-curtain' && (
                  <div className="my-auto text-center space-y-5 py-4 z-10">
                    <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap">
                      {DEFAULT_FLOWER_POOL.slice(0, 6).map((flowerUri, idx) => (
                        <img
                          key={idx}
                          src={flowerUri}
                          alt="Spinning botanical blossom"
                          className="w-14 h-14 sm:w-16 sm:h-16 animate-spin transition-transform duration-700 hover:scale-125"
                          style={{
                            animationDuration: `${8 + idx * 1.8}s`,
                            filter: 'drop-shadow(0 8px 18px rgba(194,24,91,0.5))',
                          }}
                        />
                      ))}
                    </div>

                    <div className="space-y-2 max-w-md mx-auto">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DCC397]/15 border border-[#DCC397]/35 text-[11px] uppercase tracking-[0.2em] text-[#DCC397] font-bold">
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Your Song Chorus Fades In Gently</span>
                      </div>
                      <h4 className="font-serif italic text-2xl sm:text-3xl text-[#FBF3EA]">
                        &ldquo;{customOpeningLine}&rdquo;
                      </h4>
                      <p className="text-xs text-[#F5DAD5]/80">
                        5 signature botanical blossoms spin in a layered curtain and part to reveal your photos.
                      </p>
                    </div>
                  </div>
                )}

                {/* =========================================================
                    SCENE 04: CHASING HER — POLAROID WALL & WAX-SEALED LETTER
                   ========================================================= */}
                {activeSlide.id === 'chasing-her-story' && (
                  <div className="my-auto py-2 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center z-10">
                    {/* Left: Moving Polaroid Wall */}
                    <div className="sm:col-span-6 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#DCC397]">
                        Drifting Polaroid Photo Wall
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { img: SALES_PAGE_ASSETS.polaroid1, cap: '“remember this?”', rot: '-4deg' },
                          { img: SALES_PAGE_ASSETS.polaroid2, cap: '“us, always”', rot: '3deg' },
                          { img: SALES_PAGE_ASSETS.polaroid3, cap: '“every little thing”', rot: '-2deg' },
                        ].map((p, i) => (
                          <div
                            key={i}
                            className="bg-[#FFFDF9] p-1.5 pb-3 rounded-xs shadow-lg text-center transition-transform duration-500 hover:scale-105"
                            style={{ transform: `rotate(${p.rot})` }}
                          >
                            <img
                              src={p.img}
                              alt={p.cap}
                              className="w-full aspect-square object-cover rounded-[1px]"
                            />
                            <div className="font-serif italic text-[10px] text-[#5A1A2C] mt-1">
                              {p.cap}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Interactive 3D Wax-Sealed Love Letter */}
                    <div className="sm:col-span-6 text-center">
                      {!waxSealCracked ? (
                        <div className="space-y-3">
                          <div
                            onClick={() => setWaxSealCracked(true)}
                            className="ch-envelope mx-auto scale-90 cursor-pointer"
                            role="button"
                            tabIndex={0}
                            aria-label="Open wax-sealed love letter"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') setWaxSealCracked(true);
                            }}
                          >
                            <div className="ch-envelope-body" />
                            <div className="ch-envelope-note" />
                            <div className="ch-envelope-pocket" />
                            <div className="ch-envelope-flap" />
                            <div className="ch-envelope-seal">♥</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setWaxSealCracked(true)}
                            className="px-4 py-1.5 rounded-full bg-[#DCC397] text-[#2B1710] font-extrabold text-[11px] cursor-pointer"
                          >
                            Tap Wax Seal to Read Letter →
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-[#FFFBF2] text-[#2B1710] border-2 border-[#B98A4E] text-left space-y-2 shadow-xl">
                          <div className="flex items-center justify-between border-b border-[#5A1A2C]/15 pb-1.5">
                            <span className="font-serif italic text-base text-[#5A1A2C] font-bold">
                              My Dearest {partnerName || 'Amara'},
                            </span>
                            <button
                              type="button"
                              onClick={() => setWaxSealCracked(false)}
                              className="text-[10px] font-bold text-[#5A1A2C] underline cursor-pointer"
                            >
                              Seal Envelope
                            </button>
                          </div>
                          <p className="font-serif text-xs leading-relaxed text-[#2B1710]">
                            &ldquo;From the first evening we laughed for hours to every quiet call before sleep, you have been my peace, my joy, and my favorite person in this world...&rdquo;
                          </p>
                          <div className="font-script text-base text-[#5A1A2C] text-right">
                            Forever yours ♥
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* =========================================================
                    SCENE 05: MEMORIES — 34-PHOTO BEATING HEART MOSAIC
                   ========================================================= */}
                {activeSlide.id === 'memories-mosaic' && (
                  <div className="my-auto py-2 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center z-10">
                    {/* Left: Authentic 34-Slot Heart Grid */}
                    <div className="sm:col-span-7 flex flex-col items-center">
                      <div
                        className="grid gap-1 mx-auto ch-pulse-heart"
                        style={{
                          gridTemplateColumns: 'repeat(9, minmax(0, 1fr))',
                          width: '234px',
                        }}
                      >
                        {Array.from({ length: 63 }).map((_, cellIdx) => {
                          const r = Math.floor(cellIdx / 9);
                          const c = cellIdx % 9;
                          const slotIndex = mosaicSlots.findIndex(
                            (s) => s.row === r && s.col === c
                          );
                          if (slotIndex === -1) {
                            return <div key={cellIdx} className="w-6 h-6" />;
                          }
                          const isVisible = slotIndex < mosaicPlacedCount;
                          const imgSrc =
                            INSTANT_MOSAIC_POOL[slotIndex % INSTANT_MOSAIC_POOL.length];
                          return (
                            <div
                              key={cellIdx}
                              className={`w-6 h-6 rounded-[3px] overflow-hidden border border-[#DCC397]/50 transition-all duration-300 ${
                                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                              }`}
                            >
                              <img
                                src={imgSrc}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[11px] text-[#DCC397] font-serif italic mt-2">
                        34 photos assemble into a beating heart ({mosaicPlacedCount}/34 tiles)
                      </div>
                    </div>

                    {/* Right: Voice Note Duet + 9-Transition Slideshow Card */}
                    <div className="sm:col-span-5 rounded-2xl bg-white/5 border border-[#DCC397]/35 p-4 space-y-3">
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#DCC397]">
                        <Mic className="w-3.5 h-3.5 text-[#E1A6A3]" />
                        <span>Voice Note + Song Duet</span>
                      </div>
                      <p className="text-xs text-[#F5DAD5]/90 leading-relaxed">
                        After the 34-photo heart beats, it bursts into a full-screen slideshow while your background song automatically ducks under your voice note.
                      </p>
                      <button
                        type="button"
                        onClick={() => setViewMode('live-memories')}
                        className="w-full py-2 px-3 rounded-xl bg-[#DCC397] text-[#2B1710] font-extrabold text-xs cursor-pointer"
                      >
                        Try Live 34-Heart Mosaic ↗
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Action Footer inside Viewport */}
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs z-10">
                  <span className="text-[#F5DAD5]/80">
                    Want to test the real recipient screen with sound &amp; animations?
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenFullModal('chasing-her')}
                      className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#DCC397] font-bold text-[11px] cursor-pointer"
                    >
                      Fullscreen Sample 01
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenFullModal('memories')}
                      className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#DCC397] font-bold text-[11px] cursor-pointer"
                    >
                      Fullscreen Sample 02
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// HOVER-TO-PLAY INTERACTIVE EDITION CARDS FOR SECTION 3
// Replaces static text-only cards with live hover-to-play cinema previews
// (and supports Admin-uploaded video in showcaseMedia when configured)
// ============================================================================
interface HoverToPlayEditionCardsProps {
  pricePage: string;
  showcaseMedia: ShowcaseMediaMap;
  siteExperiences?: SiteExperienceShowcaseMap;
  onPreviewLive: (product: 'chasing-her' | 'memories') => void;
  onChooseEdition: (product: 'chasing-her' | 'memories') => void;
}

export const HoverToPlayEditionCards: React.FC<HoverToPlayEditionCardsProps> = ({
  pricePage,
  showcaseMedia,
  siteExperiences = DEFAULT_SITE_EXPERIENCES,
  onPreviewLive,
  onChooseEdition,
}) => {
  const [hoveredCard, setHoveredCard] = useState<'chasing-her' | 'memories' | null>(null);
  const chVideoRef = useRef<HTMLVideoElement | null>(null);
  const memVideoRef = useRef<HTMLVideoElement | null>(null);
  const mosaicSlots = useMemo(() => buildHeartMosaicLayout(9, 7), []);

  const chExp = siteExperiences['chasing-her'];
  const memExp = siteExperiences.memories;

  const chMediaUrl = chExp.mediaUrl || showcaseMedia['chasing-her']?.media_url || '';
  const chMediaType = chExp.mediaUrl
    ? chExp.mediaType || 'image'
    : showcaseMedia['chasing-her']?.media_type || 'image';

  const memMediaUrl = memExp.mediaUrl || showcaseMedia.memories?.media_url || '';
  const memMediaType = memExp.mediaUrl
    ? memExp.mediaType || 'image'
    : showcaseMedia.memories?.media_type || 'image';

  const handleEnterCard = (edition: 'chasing-her' | 'memories') => {
    setHoveredCard(edition);
    const vid = edition === 'chasing-her' ? chVideoRef.current : memVideoRef.current;
    if (vid) {
      vid.currentTime = 0;
      vid.play().catch(() => {});
    }
  };

  const handleLeaveCard = (edition: 'chasing-her' | 'memories') => {
    setHoveredCard((prev) => (prev === edition ? null : prev));
    const vid = edition === 'chasing-her' ? chVideoRef.current : memVideoRef.current;
    if (vid) {
      vid.pause();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* EDITION 01: CHASING HER (HOVER-TO-PLAY POLAROID & WAX SEAL REEL) */}
      <div
        data-testid="edition-card-chasing-her"
        onMouseEnter={() => handleEnterCard('chasing-her')}
        onMouseLeave={() => handleLeaveCard('chasing-her')}
        className="group bg-[#FFFBF6] rounded-[28px] overflow-hidden border-2 border-[#5A1A2C]/15 hover:border-[#5A1A2C] shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
      >
        <div>
          {/* Hover-to-Play Cinema Header */}
          <div className="relative h-56 bg-gradient-to-br from-[#2B0813] via-[#421020] to-[#1A040A] overflow-hidden p-4 flex flex-col justify-between">
            {chMediaType === 'video' && chMediaUrl ? (
              <video
                ref={chVideoRef}
                src={chMediaUrl}
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-85"
              />
            ) : chExp.mediaUrl ? (
              <img
                src={chExp.mediaUrl}
                alt={chExp.title}
                className="absolute inset-0 w-full h-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              /* Interactive Hover-to-Play Polaroid Conveyor + Wax Envelope */
              <div className="my-auto flex items-center justify-center gap-3 pt-4">
                {[
                  { src: SALES_PAGE_ASSETS.polaroid1, cap: '“first date”', rot: -6 },
                  { src: SALES_PAGE_ASSETS.polaroid2, cap: '“us, always”', rot: 3 },
                  { src: SALES_PAGE_ASSETS.polaroid3, cap: '“my peace”', rot: -3 },
                ].map((p, idx) => (
                  <div
                    key={idx}
                    className="w-24 bg-[#FFFDF9] p-1.5 pb-3 rounded-xs shadow-xl transition-transform duration-500"
                    style={{
                      transform:
                        hoveredCard === 'chasing-her'
                          ? `translateY(${idx % 2 === 0 ? '-6px' : '4px'}) rotate(${p.rot * -1}deg) scale(1.06)`
                          : `rotate(${p.rot}deg)`,
                    }}
                  >
                    <img
                      src={p.src}
                      alt={p.cap}
                      className="w-full aspect-square object-cover rounded-[1px]"
                    />
                    <div className="font-serif italic text-[10px] text-[#5A1A2C] text-center mt-1">
                      {p.cap}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="relative z-10 flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-xs border border-[#DCC397]/40 text-[#DCC397] text-[10px] font-bold uppercase tracking-wider">
                {hoveredCard === 'chasing-her' ? '▶ Playing Preview' : 'Hover to Play Motion'}
              </span>
              <span className="px-3 py-1 rounded-full bg-[#DCC397] text-[#2B1710] text-xs font-extrabold">
                {pricePage}
              </span>
            </div>

            <div className="relative z-10 flex items-center justify-between gap-2 text-[11px] text-[#FBF3EA]/90 bg-black/45 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10">
              <span className="truncate">✦ {chExp.featureStrip}</span>
              <span className="text-[#DCC397] font-bold shrink-0">{chExp.editionLabel}</span>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-7 space-y-4">
            <div>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#5A1A2C] mb-1.5">
                {chExp.title}
              </h3>
              <p className="text-sm text-[#7A5A47] leading-relaxed">{chExp.description}</p>
            </div>

            {chExp.exampleFeatures.length > 0 && (
              <ul className="space-y-2 pt-3 border-t border-[#5A1A2C]/10">
                {chExp.exampleFeatures.map((feat, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs sm:text-[13px] text-[#2B1710] leading-snug"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#5A1A2C] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 sm:px-7 sm:pb-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onPreviewLive('chasing-her')}
            className="py-3 px-4 rounded-full bg-[#FBF3EA] border border-[#5A1A2C]/20 text-[#5A1A2C] font-bold text-xs hover:bg-[#F5DAD5]/50 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-[#5A1A2C]" />
            <span>Launch Live Sample</span>
          </button>
          <button
            type="button"
            data-pick="chasing-her"
            onClick={() => onChooseEdition('chasing-her')}
            className="py-3 px-4 rounded-full bg-[#5A1A2C] hover:bg-[#33101B] text-[#FBF3EA] font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{chExp.ctaLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#DCC397]" />
          </button>
        </div>
      </div>

      {/* EDITION 02: MEMORIES (HOVER-TO-PLAY 34-PHOTO HEART MOSAIC & VOICE DUET) */}
      <div
        data-testid="edition-card-memories"
        onMouseEnter={() => handleEnterCard('memories')}
        onMouseLeave={() => handleLeaveCard('memories')}
        className="group bg-[#FFFBF6] rounded-[28px] overflow-hidden border-2 border-[#5A1A2C]/15 hover:border-[#5A1A2C] shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
      >
        <div>
          {/* Hover-to-Play Cinema Header */}
          <div className="relative h-56 bg-gradient-to-br from-[#230610] via-[#3B0B1C] to-[#140207] overflow-hidden p-4 flex flex-col justify-between">
            {memMediaType === 'video' && memMediaUrl ? (
              <video
                ref={memVideoRef}
                src={memMediaUrl}
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-85"
              />
            ) : memExp.mediaUrl ? (
              <img
                src={memExp.mediaUrl}
                alt={memExp.title}
                className="absolute inset-0 w-full h-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              /* Interactive Hover-to-Play 34-Tile Heart Mosaic */
              <div className="my-auto flex items-center justify-center pt-3">
                <div
                  className={`grid gap-0.5 transition-transform duration-500 ${
                    hoveredCard === 'memories' ? 'scale-110' : 'scale-100'
                  }`}
                  style={{
                    gridTemplateColumns: 'repeat(9, minmax(0, 1fr))',
                    width: '180px',
                  }}
                >
                  {Array.from({ length: 63 }).map((_, cellIdx) => {
                    const r = Math.floor(cellIdx / 9);
                    const c = cellIdx % 9;
                    const slotIndex = mosaicSlots.findIndex((s) => s.row === r && s.col === c);
                    if (slotIndex === -1) {
                      return <div key={cellIdx} className="w-4 h-4" />;
                    }
                    const imgSrc = INSTANT_MOSAIC_POOL[slotIndex % INSTANT_MOSAIC_POOL.length];
                    return (
                      <div
                        key={cellIdx}
                        className="w-4 h-4 rounded-[2px] overflow-hidden border border-[#DCC397]/40"
                      >
                        <img src={imgSrc} alt="" className="w-full h-full object-cover" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="relative z-10 flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-xs border border-[#DCC397]/40 text-[#DCC397] text-[10px] font-bold uppercase tracking-wider">
                {hoveredCard === 'memories' ? '▶ Playing 34-Heart Mosaic' : 'Hover to Play Motion'}
              </span>
              <span className="px-3 py-1 rounded-full bg-[#DCC397] text-[#2B1710] text-xs font-extrabold">
                {pricePage}
              </span>
            </div>

            <div className="relative z-10 flex items-center justify-between gap-2 text-[11px] text-[#FBF3EA]/90 bg-black/45 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10">
              <span className="truncate">✦ {memExp.featureStrip}</span>
              <span className="text-[#DCC397] font-bold shrink-0">{memExp.editionLabel}</span>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-7 space-y-4">
            <div>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#5A1A2C] mb-1.5">
                {memExp.title}
              </h3>
              <p className="text-sm text-[#7A5A47] leading-relaxed">{memExp.description}</p>
            </div>

            {memExp.exampleFeatures.length > 0 && (
              <ul className="space-y-2 pt-3 border-t border-[#5A1A2C]/10">
                {memExp.exampleFeatures.map((feat, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs sm:text-[13px] text-[#2B1710] leading-snug"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#5A1A2C] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 sm:px-7 sm:pb-7 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onPreviewLive('memories')}
            className="py-3 px-4 rounded-full bg-[#FBF3EA] border border-[#5A1A2C]/20 text-[#5A1A2C] font-bold text-xs hover:bg-[#F5DAD5]/50 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-[#5A1A2C]" />
            <span>Launch Live Sample</span>
          </button>
          <button
            type="button"
            data-pick="memories"
            onClick={() => onChooseEdition('memories')}
            className="py-3 px-4 rounded-full bg-[#5A1A2C] hover:bg-[#33101B] text-[#FBF3EA] font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>{memExp.ctaLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#DCC397]" />
          </button>
        </div>
      </div>
    </div>
  );
};
