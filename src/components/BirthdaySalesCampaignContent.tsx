import React from 'react';
import {
  Heart,
  ArrowRight,
  Play,
  Globe,
  Sliders,
  Copy,
  Check,
  Smartphone,
  Wand2,
  MessageCircle,
  Gift,
  Lock,
} from 'lucide-react';
import {
  CountryConfig,
  ProductType,
  ChasingHerProjectData,
  MemoriesProjectData,
  ShowcaseMediaMap,
  SiteExperienceShowcaseMap,
  DEFAULT_SITE_EXPERIENCES,
} from '../utils/platformLogic';
import { LOCKED_FLOWER_WALL_ITEMS } from '../utils/supabaseAndOci';
import { SALES_PAGE_ASSETS } from '../utils/salesPageAssets';
import {
  InteractiveProductDemoReel,
  HoverToPlayEditionCards,
} from './InteractiveProductDemoReel';

export const BIRTHDAY_OPENING_PRESETS = [
  "Happy Birthday my love — out of all the gifts I could give you, I wanted to build something you'll keep forever.",
  'Every ordinary day with you feels like a gift. Today is all about celebrating the woman who has my heart.',
  'Happy Birthday — I put our favorite memories, your song, and everything I love about you into one private space.',
] as const;

const BIRTHDAY_STORIES = [
  {
    badge: 'STORY 01 · MIDNIGHT BIRTHDAY SURPRISE',
    roleLabel: 'Built on his phone in 20 minutes',
    whatsappSent:
      'Babe, happy birthday ❤️ Open this when you wake up: chasingher.love/for-ama (PIN: 140826)',
    whatsappReply:
      "WAIT STOP 😭❤️ How did you make a whole website for my birthday?! I'm literally showing all my friends right now!",
    headline:
      '"I built her entire birthday website on my phone in 20 minutes — and it looked like I hired a designer."',
    body: 'I wanted something for her birthday that she could proudly show her friends. The builder guided me step by step: I added 12 of our favorite photos, picked her favorite song, and wrote why I love her. Watching the flowers bloom when she typed her birthday PIN was unforgettable.',
    author: 'Kwame O.',
    location: 'East Legon, Accra 🇬🇭',
    previewTarget: 'chasing-her' as const,
  },
  {
    badge: 'STORY 02 · 34-HEART MEMORIES',
    roleLabel: 'Voice note duet over 34 memories',
    whatsappSent:
      'Happy birthday my queen 🎂 Tap the heart & enter the date we first met: chasingher.love/wanjiku',
    whatsappReply:
      'Hearing your voice play over our 34 photos made me cry happy tears 😭 Best birthday gift anyone has ever given me.',
    headline:
      '"At midnight on her birthday, she screen-recorded her reaction and called me in tears."',
    body: 'I told her the passcode was the date we first met. When the flowers parted and my voice note started playing softly over 34 of our favorite moments shaped into a beating heart, she said nobody had ever done anything this thoughtful for her.',
    author: 'Brian M.',
    location: 'Westlands, Nairobi 🇰🇪',
    previewTarget: 'memories' as const,
  },
  {
    badge: 'STORY 03 · LONG-DISTANCE BIRTHDAY',
    roleLabel: 'Thoughtful & within budget',
    whatsappSent:
      'Made something special for your birthday, open with headphones on 🎧❤️ chasingher.love/abena',
    whatsappReply:
      "You really sat down and built this from scratch for me?! I've replayed our soundtrack 6 times already ❤️✨",
    headline:
      '"I couldn’t fly in for her birthday, so I built a private website she opened at 12:00 AM with headphones on."',
    body: "Flowers fade in three days and texts disappear in a chat thread. For less than the cost of dinner, I gave her a PIN-protected keepsake with our Polaroids, her favorite songs, and a wax-sealed letter she still opens every week.",
    author: 'Daniel K.',
    location: 'Kilimani, Nairobi 🇰🇪',
    previewTarget: 'chasing-her' as const,
  },
] as const;

const BIRTHDAY_FAQS = [
  {
    q: 'Do I need to know how to build a website or code?',
    a: 'No. You do not need any technical, coding, or design skills. Simply access the guided builder, follow the step-by-step prompts, drop in your photos and words, preview your creation, and publish your shareable link.',
  },
  {
    q: 'What if I am not a good writer?',
    a: "You don't have to sound like a poet—you just have to speak from your heart. Honest words about why they mean so much to you always land deeper than a copied birthday wish.",
  },
  {
    q: 'How do I send it to them on their birthday?',
    a: 'As soon as you publish inside your My Site portal, you receive a private shareable link (protected by a 6-digit PIN like their birthday or anniversary) that you can send at midnight on WhatsApp, iMessage, SMS, or Instagram.',
  },
  {
    q: 'When do I get access to the builder and My Site App?',
    a: 'Immediately after payment. The moment checkout completes, you are automatically redirected into your standalone My Site Customer App where you can build at your own pace with 48-hour auto-save.',
  },
  {
    q: 'Can your team build it for me if I am short on time?',
    a: 'Yes. If their birthday is right around the corner and you want our team to assemble and polish the entire experience for you, select our Concierge Custom-Build option during checkout and upload your photos and notes inside My Site.',
  },
  {
    q: 'Is Chasing Her only for birthdays?',
    a: "No. While it makes an unforgettable birthday gift, you can also use it for anniversaries, Valentine's Day, apologies, long-distance surprises, or any moment you want to celebrate the person you love.",
  },
] as const;

interface FlowerThemeOption {
  readonly id: string;
  readonly name: string;
  readonly colors: readonly string[];
  readonly tag: string;
}

interface BirthdaySalesCampaignContentProps {
  countryConfig: CountryConfig;
  funnel: {
    pricePage: string;
    priceWas: string;
    priceCustom: string;
  };
  partnerName: string;
  setPartnerName: (name: string) => void;
  customPin: string;
  setCustomPin: (pin: string) => void;
  selectedFlowerTheme: number;
  setSelectedFlowerTheme: (idx: number) => void;
  flowerThemes: readonly FlowerThemeOption[];
  customOpeningLine: string;
  setCustomOpeningLine: (line: string) => void;
  sanitizedPartnerSlug: string;
  copiedDemoLink: boolean;
  onCopyDemoLink: () => void;
  chasingHerDemo: ChasingHerProjectData;
  memoriesDemo: MemoriesProjectData;
  showcaseMedia: ShowcaseMediaMap;
  siteExperiences?: SiteExperienceShowcaseMap;
  demoSectionRef: React.RefObject<HTMLElement | null>;
  onScrollToDemonstration: () => void;
  onOpenInstantCheckout: (pick?: ProductType) => void;
  onLockInAndScrollToForm: (pick?: ProductType) => void;
  onOpenLivePreviewModal: (product: 'chasing-her' | 'memories') => void;
}

export const BirthdaySalesCampaignContent: React.FC<BirthdaySalesCampaignContentProps> = ({
  funnel,
  partnerName,
  setPartnerName,
  customPin,
  setCustomPin,
  customOpeningLine,
  setCustomOpeningLine,
  sanitizedPartnerSlug,
  copiedDemoLink,
  onCopyDemoLink,
  chasingHerDemo,
  memoriesDemo,
  showcaseMedia,
  siteExperiences = DEFAULT_SITE_EXPERIENCES,
  demoSectionRef,
  onScrollToDemonstration,
  onOpenInstantCheckout,
  onLockInAndScrollToForm,
  onOpenLivePreviewModal,
}) => {
  return (
    <>
      {/* =====================================================================
          HERO — CLEAR ABOVE-THE-FOLD OPENING (BIRTHDAY GIFT CAMPAIGN)
         ===================================================================== */}
      <header className="relative pt-10 pb-14 md:pt-16 md:pb-20 px-4 sm:px-6 overflow-hidden">
        <img
          src={SALES_PAGE_ASSETS.heroBlossom}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none hidden xl:block absolute -top-4 -left-8 w-36 opacity-45 ch-float-blossom z-0"
          style={{ filter: 'drop-shadow(0 12px 22px rgba(90,26,44,0.14))' }}
        />
        <img
          src={SALES_PAGE_ASSETS.heroButterfly}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none hidden xl:block absolute top-8 -right-6 w-32 opacity-45 ch-flutter-butterfly z-0"
          style={{ filter: 'drop-shadow(0 12px 22px rgba(90,26,44,0.14))' }}
        />

        <div className="max-w-4xl mx-auto relative z-10 space-y-10">
          {/* Centered Opening Headline, Subheadline & Actions */}
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.22em] text-[#9A6F3B] font-bold">
              Private Digital Birthday Keepsake
            </p>

            <h1 className="font-serif text-[clamp(2.5rem,5.4vw,4.35rem)] leading-[1.06] text-[#2B1710] tracking-tight text-balance">
              Give them a birthday gift they&apos;ll{' '}
              <em className="italic text-[#5A1A2C] font-medium">never forget.</em>
            </h1>

            <p className="text-lg sm:text-xl leading-relaxed text-[#5C4033] max-w-2xl mx-auto text-balance">
              A private digital love letter made from your photos, your song, and your own words — thoughtful, romantic, and{' '}
              <strong className="text-[#2B1710] font-semibold">all within budget.</strong>
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenInstantCheckout('chasing-her')}
                className="py-4 px-7 rounded-full bg-gradient-to-b from-[#6E2236] to-[#5A1A2C] text-[#FBF3EA] font-bold text-sm sm:text-base shadow-[0_14px_30px_-10px_rgba(90,26,44,0.55),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Create Their Birthday Site</span>
                <ArrowRight className="w-4 h-4 text-[#DCC397]" />
              </button>

              <button
                type="button"
                onClick={onScrollToDemonstration}
                className="py-4 px-6 rounded-full bg-[#FFFDF9] border border-[#5A1A2C]/22 text-[#5A1A2C] font-bold text-sm hover:bg-[#F5DAD5]/40 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-[#5A1A2C]" />
                <span>See How It Works</span>
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#7A5A47] flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
              <span className="whitespace-nowrap">
                One-time <strong className="text-[#5A1A2C]">{funnel.pricePage}</strong>{' '}
                <span className="line-through opacity-60">{funnel.priceWas}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">PIN-protected</span>
              <span className="hidden sm:inline" aria-hidden="true">·</span>
              <span className="whitespace-nowrap">Ready in minutes</span>
            </p>
          </div>

          {/* Centered Product Preview Showcase */}
          <div className="max-w-3xl mx-auto rounded-[26px] overflow-hidden border border-[#B98A4E]/40 shadow-[0_24px_60px_-20px_rgba(43,23,16,0.38)] bg-[#280913] text-[#FBF3EA] grid grid-cols-1 md:grid-cols-12 items-stretch">
            <div className="md:col-span-7 bg-[#1A050B]">
              <img
                src={SALES_PAGE_ASSETS.heroShot}
                alt="Preview of a Chasing Her digital birthday love letter website shown on laptop and phone, with photos, a song, and a heartfelt letter"
                className="w-full h-full object-cover block"
              />
            </div>

            <div className="md:col-span-5 p-6 bg-gradient-to-b from-[#33101B] to-[#220810] flex flex-col justify-center space-y-4">
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#DCC397] font-bold">
                  What They Discover Piece By Piece
                </div>
                <div className="text-base font-serif italic text-[#FBF3EA] leading-relaxed">
                  Their Name · Blooming Flowers · Your Photos · Your Song · Wax-Sealed Letter
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenLivePreviewModal('chasing-her')}
                  className="py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/16 border border-[#DCC397]/30 text-[#FBF3EA] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-[#DCC397] text-[#DCC397]" />
                  <span>Live Sample 01</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLivePreviewModal('memories')}
                  className="py-2.5 px-3.5 rounded-xl bg-white/10 hover:bg-white/16 border border-[#DCC397]/30 text-[#FBF3EA] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 fill-[#E1A6A3] text-[#E1A6A3]" />
                  <span>Live Sample 02</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          OPENING STORY — BREATHABLE EDITORIAL LETTER (RIGHT BELOW THE HERO)
         ===================================================================== */}
      <section className="py-14 md:py-20 px-4 sm:px-6 border-t border-[#5A1A2C]/10 bg-[#FFFDF9]/80">
        <div className="max-w-2xl mx-auto space-y-5 text-[16px] sm:text-[18px] leading-[1.82] text-[#2B1710]">
          <p>
            Their birthday is coming up — and you already know you don&apos;t want to give them just any random, forgettable gift.
          </p>
          <p className="font-semibold text-[#5A1A2C] text-lg sm:text-xl">
            You want something that feels like it was built specially for them.
          </p>
          <p>Something personal enough that it makes them smile and immediately want to show their friends...</p>

          <blockquote className="my-6 p-6 sm:p-8 rounded-[24px] bg-gradient-to-br from-[#5A1A2C] via-[#431220] to-[#280913] text-[#FBF3EA] shadow-xl border border-[#B98A4E]/40 relative overflow-hidden">
            <div className="text-[#DCC397]/25 font-serif text-7xl leading-none absolute -top-2 left-3 select-none">
              &ldquo;
            </div>
            <p className="relative z-10 font-serif italic text-xl sm:text-2xl leading-relaxed text-[#FBF3EA]">
              Out of all the gifts I could give you, I wanted to give you something that reminds you just how special you are to me.
            </p>
          </blockquote>

          <p className="font-serif text-xl sm:text-2xl text-[#5A1A2C] font-medium">
            When you truly love someone, &ldquo;Happy Birthday&rdquo; never feels like enough.
          </p>
          <p className="font-semibold text-[#2B1710]">You want them to feel seen, cherished, and celebrated.</p>
          <p>
            You want a gift that holds your favorite pictures together, the soundtrack that reminds you of them, and the honest words you sometimes never get the chance to say on an ordinary day — all without breaking the bank.
          </p>
          <p>
            Something so personal that the moment they open it, they immediately know:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-[#F5E9DC] border border-[#5A1A2C]/12 text-xs sm:text-sm font-semibold text-[#5A1A2C]">
              You didn&apos;t just rush and buy something ordinary.
            </div>
            <div className="p-4 rounded-2xl bg-[#F5E9DC] border border-[#5A1A2C]/12 text-xs sm:text-sm font-semibold text-[#5A1A2C]">
              You actually put real thought and heart into it.
            </div>
            <div className="p-4 rounded-2xl bg-[#5A1A2C] text-[#FBF3EA] text-xs sm:text-sm font-semibold shadow-sm">
              And you gave them a birthday memory they&apos;ll keep forever.
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 01 — BUT HOW DO YOU STAND OUT ON THEIR BIRTHDAY?
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-[#F5E9DC]/90 border-y border-[#5A1A2C]/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              01 · Beyond Ordinary Birthday Wishes
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#2B1710]">
              BUT HOW DO YOU MAKE THEIR DAY <em className="italic text-[#5A1A2C]">TRULY UNFORGETTABLE?</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left: Visual Contrast — Ordinary Birthday Texts vs. Private Experience */}
            <div className="lg:col-span-5">
              <div className="rounded-[28px] bg-[#1D060D] border-2 border-[#B98A4E]/35 p-5 sm:p-6 text-[#FBF3EA] shadow-2xl space-y-4">
                <div className="flex items-center justify-between text-xs border-b border-white/10 pb-3">
                  <span className="text-[#DCC397] font-semibold flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" /> What Everyone Else Sends
                  </span>
                  <span className="text-[11px] text-[#F5DAD5]/60">12:00 AM · Buried in chat</span>
                </div>

                {/* Ordinary birthday message bubbles */}
                <div className="space-y-2.5 text-xs">
                  <div className="ml-8 p-3 rounded-2xl rounded-tr-xs bg-[#005C4B]/75 text-white/90">
                    Happy birthday my love! Wishing you long life and prosperity 🎂🎉
                    <div className="text-[10px] text-emerald-200/70 text-right mt-1">
                      12:01 AM · Read ✓✓
                    </div>
                  </div>
                  <div className="ml-12 p-2.5 rounded-xl bg-white/8 border border-white/15 text-[#F5DAD5]/80 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-[#DCC397]" /> 42 other &ldquo;HBD!&rdquo; messages
                    </span>
                    <span className="text-[10px] opacity-75">Scrolled past</span>
                  </div>
                  <div className="ml-6 p-3 rounded-2xl rounded-tr-xs bg-[#005C4B]/75 text-white/90">
                    May this new year bring you everything you pray for ❤️
                    <div className="text-[10px] text-emerald-200/70 text-right mt-1">
                      12:03 AM · Read ✓✓
                    </div>
                  </div>
                </div>

                {/* The Pivot */}
                <div className="pt-3 border-t border-[#DCC397]/25">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#5A1A2C] to-[#3B0D1B] border border-[#DCC397]/45 space-y-1.5">
                    <div className="text-[10px] uppercase tracking-widest text-[#DCC397] font-bold">
                      ✦ Instead of Another Birthday Text
                    </div>
                    <div className="font-serif italic text-base text-white">
                      chasingher.love/for-{sanitizedPartnerSlug}
                    </div>
                    <p className="text-[11px] text-[#F5DAD5]/90">
                      A private digital birthday website built with your words, your photos, blooming flowers, and their favorite song.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: The Narrative Copy */}
            <div className="lg:col-span-7 bg-[#FFFBF6] border border-[#5A1A2C]/12 rounded-[28px] p-6 sm:p-9 shadow-md space-y-4 text-[16px] sm:text-[17px] leading-[1.78] text-[#2B1710]">
              <p className="font-serif text-xl sm:text-2xl text-[#5A1A2C] font-medium">
                Anyone can send a birthday text at midnight.
              </p>
              <p>Anyone can buy a regular store-bought gift.</p>
              <p>Anyone can post a picture on their status and write &ldquo;Happy Birthday My Love.&rdquo;</p>
              <p className="font-semibold text-[#5A1A2C]">
                And by the next morning, all of those messages blur together.
              </p>
              <p>
                You want them to know how deeply they mean to you — not just with a quick paragraph, but with something they can unwrap, replay, and proudly show everyone around them.
              </p>
              <p>
                You want to celebrate the moments that made you both laugh, the memories you still hold close, and every little reason you love them.
              </p>
              <p className="font-serif italic text-xl text-[#5A1A2C]">
                How do you give a birthday surprise no one has ever done for them before?
              </p>

              <div className="p-5 sm:p-6 rounded-2xl bg-[#33101B] text-[#FBF3EA] border border-[#B98A4E]/45 shadow-md mt-4">
                <p className="font-serif text-lg sm:text-xl leading-relaxed text-[#DCC397]">
                  What if, instead of sending another birthday message, you created a private website they could open and experience for themselves?
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 02 — WHAT IF YOU COULD GIVE THEM SOMETHING THEY NEVER EXPECTED?
         ===================================================================== */}
      <section className="relative py-16 md:py-24 px-4 sm:px-6 overflow-hidden">
        {/* Floating Butterfly & Blossom */}
        <img
          src={SALES_PAGE_ASSETS.storyButterfly}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute top-4 -right-4 sm:right-10 w-18 sm:w-32 opacity-90 ch-flutter-butterfly"
          style={{ filter: 'drop-shadow(0 10px 20px rgba(90,26,44,0.16))' }}
        />
        <img
          src={SALES_PAGE_ASSETS.storyFlower}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute bottom-4 -left-4 sm:left-10 w-18 sm:w-32 opacity-90 ch-float-blossom"
          style={{ filter: 'drop-shadow(0 10px 20px rgba(90,26,44,0.16))' }}
        />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              02 · A Gift They&apos;ll Proudly Show Their Friends
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#2B1710]">
              WHAT IF YOU COULD GIVE THEM SOMETHING <em className="italic text-[#5A1A2C]">THEY NEVER EXPECTED?</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left: The Signature 3-Polaroid Stack */}
            <div className="lg:col-span-5">
              <div className="relative h-[300px] sm:h-[340px] max-w-[390px] mx-auto">
                <div
                  className="absolute top-3 left-1 sm:left-2 w-[45%] bg-[#FFFDF9] p-2.5 pb-6 rounded-sm shadow-[0_18px_35px_-12px_rgba(43,23,16,0.32)] border border-[#2B1710]/5"
                  style={{ transform: 'rotate(-7deg)' }}
                >
                  <div className="aspect-square rounded-[2px] overflow-hidden bg-[#E8D5C4]">
                    <img
                      src={SALES_PAGE_ASSETS.polaroid1}
                      alt="Close-up of two hands holding hands"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="font-serif italic text-xs text-[#5A1A2C] text-center mt-2">
                    &ldquo;remember this?&rdquo;
                  </div>
                </div>

                <div
                  className="absolute top-0 left-[27%] w-[47%] bg-[#FFFDF9] p-2.5 pb-6 rounded-sm shadow-[0_22px_42px_-12px_rgba(43,23,16,0.38)] border border-[#2B1710]/5 z-10"
                  style={{ transform: 'rotate(4deg)' }}
                >
                  <div className="aspect-square rounded-[2px] overflow-hidden bg-[#E8D5C4]">
                    <img
                      src={SALES_PAGE_ASSETS.polaroid2}
                      alt="Couple taking a sunlit selfie together"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="font-serif italic text-xs text-[#5A1A2C] text-center mt-2">
                    &ldquo;happy birthday, my love&rdquo;
                  </div>
                </div>

                <div
                  className="absolute top-7 right-1 sm:right-2 w-[45%] bg-[#FFFDF9] p-2.5 pb-6 rounded-sm shadow-[0_18px_35px_-12px_rgba(43,23,16,0.32)] border border-[#2B1710]/5 z-20"
                  style={{ transform: 'rotate(-2deg)' }}
                >
                  <div className="aspect-square rounded-[2px] overflow-hidden bg-[#E8D5C4]">
                    <img
                      src={SALES_PAGE_ASSETS.polaroid3}
                      alt="Couple standing together at night with a city skyline"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="font-serif italic text-xs text-[#5A1A2C] text-center mt-2">
                    &ldquo;every little thing&rdquo;
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Copy Card */}
            <div className="lg:col-span-7 bg-[#FFFBF6] border border-[#5A1A2C]/12 rounded-[28px] p-6 sm:p-9 shadow-md space-y-4 text-[16px] sm:text-[17px] leading-[1.78] text-[#2B1710]">
              <div className="space-y-1.5 text-[#7A5A47]">
                <p>Not another rushed WhatsApp paragraph.</p>
                <p>Not a gift that gets forgotten by next week.</p>
                <p>Not a generic card anyone could pick off a shelf.</p>
              </div>

              <p className="font-serif text-2xl sm:text-3xl text-[#5A1A2C] font-medium pt-1">
                But a beautiful, personal digital birthday website...
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4">
                {[
                  'Made with your words.',
                  'Your favorite pictures.',
                  'Your shared memories.',
                  'The song that reminds you of them.',
                  'And a private birthday surprise they will replay all year.',
                ].map((line, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border text-sm font-semibold ${
                      i === 4
                        ? 'sm:col-span-2 bg-[#5A1A2C] text-[#FBF3EA] border-[#5A1A2C]'
                        : 'bg-[#FBF3EA] text-[#2B1710] border-[#5A1A2C]/12'
                    }`}
                  >
                    ✦ {line}
                  </div>
                ))}
              </div>

              <p>
                Something they unlock on their phone with a meaningful 6-digit PIN and discover piece by piece.
              </p>
              <p>
                Whether it&apos;s your main birthday gift or the romantic centerpiece paired with dinner or flowers, it turns their day into a story they&apos;ll never stop talking about.
              </p>

              <div className="pt-3 border-t border-[#5A1A2C]/10 flex flex-wrap items-center justify-between gap-3">
                <p className="font-serif italic text-xl sm:text-2xl text-[#5A1A2C] font-semibold">
                  Something you created specially for them.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenInstantCheckout('chasing-her')}
                  className="px-5 py-2.5 rounded-full bg-[#5A1A2C] text-[#FBF3EA] text-xs font-bold hover:bg-[#33101B] transition cursor-pointer shrink-0"
                >
                  Start Creating Theirs →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 03 — INTRODUCING CHASING HER (A birthday surprise they won't see coming)
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-[#F5E9DC]/85 border-y border-[#5A1A2C]/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              03 · Introducing Chasing Her
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[44px] leading-[1.12] text-[#2B1710] mb-3">
              A birthday surprise <em className="italic text-[#5A1A2C]">they won&apos;t see coming.</em>
            </h2>
            <p className="text-base sm:text-lg text-[#2B1710] leading-relaxed">
              <strong className="text-[#5A1A2C]">Chasing Her</strong> lets you create a romantic, personalized birthday love website for the person you love.
            </p>
          </div>

          <div className="bg-[#FFFBF6] border border-[#5A1A2C]/15 rounded-[28px] p-6 sm:p-10 shadow-md mb-12 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#FBF3EA] border border-[#5A1A2C]/10">
                <div className="text-xs uppercase tracking-wider text-[#B98A4E] font-bold mb-1">
                  01 · Zero Technical Barrier
                </div>
                <div className="font-serif text-lg font-semibold text-[#5A1A2C]">
                  You don&apos;t need to know how to build a website.
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#FBF3EA] border border-[#5A1A2C]/10">
                <div className="text-xs uppercase tracking-wider text-[#B98A4E] font-bold mb-1">
                  02 · Guided Step-By-Step
                </div>
                <div className="font-serif text-lg font-semibold text-[#5A1A2C]">
                  You don&apos;t need to be a designer or programmer.
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#FBF3EA] border border-[#5A1A2C]/10">
                <div className="text-xs uppercase tracking-wider text-[#B98A4E] font-bold mb-1">
                  03 · Sincere &amp; Honest
                </div>
                <div className="font-serif text-lg font-semibold text-[#5A1A2C]">
                  And you don&apos;t need to be a poet.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center text-[16px] sm:text-[17px] leading-[1.78] text-[#2B1710]">
              <div className="lg:col-span-7 space-y-3">
                <p>
                  Our simple builder turns your feelings, favorite memories, and photos into a luxury interactive gift you can send straight to their phone at midnight.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-sm font-semibold text-[#5A1A2C]">
                  <div className="p-3 rounded-xl bg-[#F5E9DC]/70">♥ Make it completely about them.</div>
                  <div className="p-3 rounded-xl bg-[#F5E9DC]/70">♥ Fill it with your favorite photos.</div>
                  <div className="p-3 rounded-xl bg-[#F5E9DC]/70">♥ Add their favorite soundtrack or voice note.</div>
                  <div className="p-3 rounded-xl bg-[#F5E9DC]/70">♥ Lock it with their birthday PIN.</div>
                </div>
                <p className="pt-1">
                  And when you&apos;re done, you&apos;ll have a private shareable link ready to send on WhatsApp, iMessage, or Instagram.
                </p>
              </div>

              <div className="lg:col-span-5 p-6 rounded-[24px] bg-gradient-to-br from-[#5A1A2C] to-[#280913] text-[#FBF3EA] border border-[#B98A4E]/45 shadow-xl space-y-3">
                <div className="text-xs uppercase tracking-widest text-[#DCC397] font-bold">
                  Why They Will Never Forget It
                </div>
                <p className="font-serif italic text-xl sm:text-2xl text-white leading-snug">
                  &ldquo;You bring the love. Chasing Her turns it into the most thoughtful birthday gift they have ever received.&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => onOpenInstantCheckout('chasing-her')}
                  className="w-full py-3 px-4 rounded-full bg-[#DCC397] text-[#2B1710] font-extrabold text-xs uppercase tracking-wider hover:brightness-105 transition cursor-pointer"
                >
                  Create Their Birthday Site ({funnel.pricePage}) →
                </button>
              </div>
            </div>
          </div>

          {/* Hover-to-Play Interactive Edition Cards */}
          <HoverToPlayEditionCards
            pricePage={funnel.pricePage}
            showcaseMedia={showcaseMedia}
            siteExperiences={siteExperiences}
            onPreviewLive={(prod) => onOpenLivePreviewModal(prod)}
            onChooseEdition={(prod) => onLockInAndScrollToForm(prod)}
          />
        </div>
      </section>

      {/* =====================================================================
          SECTION 04 — IMAGINE THEM OPENING IT AT MIDNIGHT...
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              04 · The Moment They Click Your Link
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[44px] leading-[1.12] text-[#2B1710]">
              IMAGINE THEM <em className="italic text-[#5A1A2C]">OPENING IT...</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
            {/* Left: The Step-by-Step Emotional Discovery Narrative */}
            <div className="lg:col-span-6 bg-[#FFFBF6] border border-[#5A1A2C]/15 rounded-[28px] p-6 sm:p-9 shadow-md space-y-4 text-[16px] sm:text-[17px] leading-[1.78] text-[#2B1710]">
              <div className="space-y-2.5">
                {[
                  'They tap the private link you sent at midnight.',
                  'They type in their birthday PIN and watch flowers bloom open.',
                  'They see their name glowing on screen as your song begins.',
                  'They scroll through your Polaroids and favorite moments together.',
                  'They break the wax seal to read your heartfelt birthday letter.',
                ].map((stepText, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[#FBF3EA] border border-[#5A1A2C]/10"
                  >
                    <span className="w-6 h-6 rounded-full bg-[#5A1A2C] text-[#DCC397] text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-[#2B1710]">{stepText}</span>
                  </div>
                ))}
              </div>

              <p className="pt-2">And then they realize...</p>

              <div className="p-5 rounded-2xl bg-[#5A1A2C] text-[#FBF3EA] font-serif italic text-xl sm:text-2xl shadow-md">
                &ldquo;You actually took the time to build this whole experience just for me.&rdquo;
              </div>

              <p>Not a last-minute gift picked up on the way over.</p>
              <p>Not a birthday message copied from Google.</p>
              <p className="font-semibold text-[#5A1A2C]">
                A romantic keepsake they will replay, screen-record, and show off with pride.
              </p>

              <ul className="space-y-1.5 pl-1 text-[#5A1A2C] font-medium">
                <li>✦ Your favorite pictures and captions together.</li>
                <li>✦ The song or voice note that instantly makes them smile.</li>
                <li>✦ Every reason you are grateful they were born.</li>
              </ul>

              <p className="pt-2 border-t border-[#5A1A2C]/10 text-[#7A5A47]">
                And best of all, you stay completely within budget.
              </p>
              <p className="font-serif text-lg sm:text-xl text-[#2B1710] font-medium">
                Because the most unforgettable gifts are the ones made with genuine thought.
              </p>
            </div>

            {/* Right: Interactive Live Personalizer Sandbox */}
            <div className="lg:col-span-6 bg-[#FFFBF6] rounded-[28px] border-2 border-[#B98A4E]/35 p-6 sm:p-8 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#5A1A2C]/10 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5A1A2C]">
                  <Sliders className="w-3.5 h-3.5 text-[#B98A4E]" />
                  <span>Preview Their Birthday Link Right Now</span>
                </div>
                <span className="text-xs text-[#7A5A47]">Try typing their name</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B1710] mb-1">
                    1. Their First Name
                  </label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="e.g. Amara"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF3EA] border border-[#5A1A2C]/20 text-sm font-semibold text-[#5A1A2C] focus:outline-none focus:border-[#5A1A2C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1710] mb-1">
                    2. Birthday 6-Digit PIN
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={customPin}
                    onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="140826"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF3EA] border border-[#5A1A2C]/20 font-mono text-sm font-bold text-[#5A1A2C] focus:outline-none focus:border-[#5A1A2C]"
                  />
                </div>
              </div>

              <div data-testid="sales-locked-flower-wall">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-[#2B1710]">
                    3. Signature Opening Flower Wall
                  </span>
                  <span className="text-[11px] font-semibold text-[#5A1A2C] flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#B98A4E]" />
                    Included automatically
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 p-2.5 rounded-xl bg-[#FBF3EA] border border-[#5A1A2C]/15">
                  {LOCKED_FLOWER_WALL_ITEMS.map((flower) => (
                    <div
                      key={flower.id}
                      className="flex flex-col items-center justify-center gap-1 text-center"
                    >
                      <img
                        src={flower.url}
                        alt={flower.name}
                        className="w-10 h-10 object-contain drop-shadow-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B1710] mb-1.5">
                  4. Select or Customize Your Birthday Opening Line
                </label>
                <div className="space-y-1.5">
                  {BIRTHDAY_OPENING_PRESETS.map((line, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCustomOpeningLine(line)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition border cursor-pointer ${
                        customOpeningLine === line
                          ? 'bg-[#5A1A2C] text-[#FBF3EA] border-[#5A1A2C] font-semibold'
                          : 'bg-[#FBF3EA] text-[#2B1710] border-[#2B1710]/10 hover:bg-[#F5DAD5]/35'
                      }`}
                    >
                      &ldquo;{line}&rdquo;
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Phone Card Preview */}
              <div className="rounded-[22px] bg-gradient-to-b from-[#2A0812] via-[#3B0D1B] to-[#1D050C] text-[#FBF3EA] p-5 border border-[#B98A4E]/45 shadow-xl space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-[#DCC397]" />
                    <span className="font-mono text-xs text-[#DCC397]">
                      chasingher.love/for-{sanitizedPartnerSlug}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onCopyDemoLink}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[#DCC397] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedDemoLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedDemoLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>

                <div className="text-center py-2 space-y-2">
                  <div className="text-[11px] text-[#DCC397] font-mono">
                    <Lock className="w-3 h-3 inline mr-1" />
                    Protected by PIN: {customPin || '140826'}
                  </div>
                  <h3 className="font-serif text-2xl text-[#FBF3EA]">
                    Happy Birthday, <em className="italic text-[#DCC397]">{partnerName || 'My Love'}</em>
                  </h3>
                  <p className="font-serif italic text-xs sm:text-sm text-[#F5DAD5]/90 max-w-md mx-auto">
                    &ldquo;{customOpeningLine}&rdquo;
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenInstantCheckout('chasing-her')}
                  className="w-full py-3 rounded-full bg-gradient-to-r from-[#DCC397] to-[#B98A4E] text-[#2B1710] font-extrabold text-xs uppercase tracking-wider shadow-md hover:brightness-105 transition cursor-pointer"
                >
                  Create This For {partnerName || 'Them'} ({funnel.pricePage}) →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 05 — YOU DON'T HAVE TO KNOW HOW TO CREATE IT. WE'VE MADE IT SIMPLE.
          + [ACTUAL BUILDER & RECIPIENT UNBOXING DEMONSTRATION]
         ===================================================================== */}
      <section
        ref={demoSectionRef}
        id="demonstration"
        className="py-16 md:py-24 px-4 sm:px-6 text-[#FBF3EA] relative overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, #1E060E 0%, #33101B 50%, #1F0710 100%)',
        }}
      >
        <div className="max-w-5xl mx-auto relative z-10 space-y-12">
          {/* Narrative Intro before the Builder Demonstration */}
          <div className="bg-[#280913]/90 border border-[#DCC397]/30 rounded-[28px] p-6 sm:p-10 shadow-2xl">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <span className="text-[11px] uppercase tracking-[0.22em] text-[#DCC397] font-bold block">
                05 · Guided Step-By-Step Builder
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#FBF3EA]">
                YOU DON&apos;T HAVE TO KNOW HOW TO CREATE IT.{' '}
                <em className="italic text-[#DCC397]">WE&apos;VE MADE IT SIMPLE.</em>
              </h2>
              <p className="text-[#F5DAD5]/85 text-base sm:text-lg">
                You may be thinking...{' '}
                <em className="font-serif italic text-xl text-[#DCC397]">
                  &ldquo;This looks amazing, but how am I supposed to build a website for their birthday?&rdquo;
                </em>
              </p>
              <p className="text-[#FBF3EA] text-base sm:text-lg font-medium">
                That&apos;s exactly why we built <strong>Chasing Her</strong>. You don&apos;t need any special skills.
              </p>
            </div>

            {/* 4 Guided Process Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 my-7">
              <div className="p-4 rounded-2xl bg-white/5 border border-[#DCC397]/25">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#DCC397] mb-1">
                  Step 01 · Access
                </div>
                <div className="font-serif text-base font-semibold text-white mb-1">
                  Open the Guided Builder
                </div>
                <p className="text-xs text-[#F5DAD5]/80">
                  Simply access the builder inside your My Site portal right after checkout.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-[#DCC397]/25">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#DCC397] mb-1">
                  Step 02 · Personalize
                </div>
                <div className="font-serif text-base font-semibold text-white mb-1">
                  Add Photos, Song &amp; Letter
                </div>
                <p className="text-xs text-[#F5DAD5]/80">
                  Drop in your favorite pictures, captions, voice note, and birthday message.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-[#DCC397]/25">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#DCC397] mb-1">
                  Step 03 · Preview
                </div>
                <div className="font-serif text-base font-semibold text-white mb-1">
                  Test Their Experience Live
                </div>
                <p className="text-xs text-[#F5DAD5]/80">
                  Preview your creation in real time and polish freely until every detail feels right.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#DCC397]/15 border border-[#DCC397]/50">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#DCC397] mb-1">
                  Step 04 · Publish
                </div>
                <div className="font-serif text-base font-semibold text-white mb-1">
                  Send At Midnight
                </div>
                <p className="text-xs text-[#F5DAD5]/90">
                  Publish with one tap and send their private PIN-protected link on WhatsApp.
                </p>
              </div>
            </div>

            <p className="text-center font-serif italic text-xl sm:text-2xl text-[#DCC397]">
              &ldquo;Create a birthday surprise they&apos;ll show off to everyone — in under 20 minutes.&rdquo;
            </p>
          </div>

          {/* ACTUAL INTERACTIVE BUILDER & RECIPIENT UNBOXING DEMONSTRATION */}
          <InteractiveProductDemoReel
            partnerName={partnerName}
            customPin={customPin}
            customOpeningLine={customOpeningLine}
            pricePage={funnel.pricePage}
            chasingHerDemo={chasingHerDemo}
            memoriesDemo={memoriesDemo}
            showcaseMedia={showcaseMedia}
            siteExperiences={siteExperiences}
            campaignMode="birthday"
            onSelectProductAndCheckout={(prod) => onOpenInstantCheckout(prod)}
            onOpenFullModal={(prod) => onOpenLivePreviewModal(prod)}
          />
        </div>
      </section>

      {/* =====================================================================
          SECTION 06 — DON'T LET THEIR BIRTHDAY PASS WITH JUST ANOTHER TEXT.
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-[#F5E9DC]/85 border-b border-[#5A1A2C]/10">
        <div className="max-w-5xl mx-auto space-y-16">
          {/* Core Birthday Sincerity Letter */}
          <div className="max-w-3xl mx-auto bg-[#FFFDF9] border-2 border-[#B98A4E]/35 rounded-[32px] p-6 sm:p-10 md:p-12 shadow-xl space-y-5 text-[16px] sm:text-[18px] leading-[1.8] text-[#2B1710]">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block">
              06 · Make This Birthday Unforgettable
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl leading-[1.15] text-[#2B1710]">
              DON&apos;T LET THEIR BIRTHDAY PASS WITH JUST{' '}
              <em className="italic text-[#5A1A2C]">ANOTHER TEXT.</em>
            </h2>

            <p>Some people deserve more than a quick message at midnight.</p>
            <p>Some birthdays deserve a gift that stops them in their tracks.</p>
            <p className="font-serif italic text-xl text-[#5A1A2C] font-medium">
              And the memories you&apos;ve built together deserve to be celebrated beautifully.
            </p>

            <div className="space-y-2 py-2 text-[#5A1A2C] font-semibold">
              <p>✦ Give them something personal no one else can copy...</p>
              <p>✦ Give them a surprise they&apos;ll proudly show their friends...</p>
              <p>✦ Give them a keepsake they&apos;ll open again months from now...</p>
            </div>

            <p className="font-semibold text-[#2B1710] text-lg">
              Take 20 minutes today and build a birthday gift that truly comes from you.
            </p>

            <div className="p-6 sm:p-7 rounded-[24px] bg-gradient-to-br from-[#5A1A2C] via-[#3F111F] to-[#240710] text-[#FBF3EA] border border-[#B98A4E]/45 space-y-2.5 shadow-lg">
              <p className="text-sm sm:text-base text-[#F5DAD5]/85">
                Thoughtful, deeply romantic, and effortlessly personal.
              </p>
              <p className="text-sm sm:text-base text-[#F5DAD5]/85">
                Includes 48-hour auto-saved builder access, 30 days of private hosting, and free edits.
              </p>
              <p className="font-serif italic text-xl sm:text-2xl text-[#DCC397] pt-1">
                One-time {funnel.pricePage} — a birthday memory they will treasure forever.
              </p>
            </div>
          </div>

          {/* Real Birthday Stories + Midnight WhatsApp Replies */}
          <div>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
                Real Experiences · Midnight Birthday Reactions
              </span>
              <h3 className="font-serif text-3xl sm:text-4xl text-[#2B1710]">
                What happened when they sent a <em className="italic text-[#5A1A2C]">Chasing Her</em> link on their birthday
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {BIRTHDAY_STORIES.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#FFFBF6] rounded-[26px] border border-[#5A1A2C]/15 shadow-md overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="bg-gradient-to-br from-[#5A1A2C] to-[#2B0A14] p-5 text-[#FBF3EA] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#DCC397]">
                          {item.badge}
                        </span>
                        <span className="text-[#DCC397] text-xs">★★★★★</span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="ml-5 p-2.5 rounded-2xl rounded-tr-xs bg-[#005C4B] text-[11px] text-white leading-snug">
                          {item.whatsappSent}
                        </div>
                        <div className="mr-5 p-2.5 rounded-2xl rounded-tl-xs bg-[#1F2C34] text-[11px] text-emerald-100 leading-snug border border-white/10">
                          {item.whatsappReply}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#B98A4E]">
                        {item.roleLabel}
                      </div>
                      <h4 className="font-serif italic text-lg sm:text-xl text-[#5A1A2C] leading-snug">
                        {item.headline}
                      </h4>
                      <p className="text-sm text-[#2B1710] leading-relaxed">{item.body}</p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-3 border-t border-[#5A1A2C]/10 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-[#2B1710]">{item.author}</div>
                      <div className="text-xs text-[#7A5A47]">{item.location}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenLivePreviewModal(item.previewTarget)}
                      className="px-3 py-1.5 rounded-full bg-[#F5DAD5] hover:bg-[#E1A6A3] text-[#5A1A2C] font-bold text-xs transition shrink-0 cursor-pointer"
                    >
                      Inspect Sample
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Post-Payment Standalone My Site Portal + Optional Done-For-You Concierge */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 bg-[#FFFBF6] rounded-[28px] border border-[#5A1A2C]/15 p-6 sm:p-8 shadow-md flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 text-xs text-[#7A5A47]">
                  <span className="font-bold uppercase tracking-wider text-[#5A1A2C] flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-[#B98A4E]" />
                    Instant Redirect To Your My Site App After Payment
                  </span>
                  <span>48-Hour Auto-Save</span>
                </div>
                <h3 className="font-serif text-2xl sm:text-3xl text-[#2B1710]">
                  Build at your own pace inside your private <em className="italic text-[#5A1A2C]">My Site</em> studio.
                </h3>
                <p className="text-sm sm:text-base text-[#7A5A47] leading-relaxed">
                  As soon as your payment is confirmed, you are automatically redirected to your standalone <strong>My Site Customer App</strong> where you get <strong>48 hours</strong> to upload your photos, pick their song, preview their birthday link, and make free edits until every detail feels perfect.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-[#5A1A2C]/10 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[#7A5A47]">
                  Includes 30 days of private PIN-protected hosting · <strong className="text-[#5A1A2C]">{funnel.pricePage}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenInstantCheckout('chasing-her')}
                  className="px-5 py-2.5 rounded-full bg-[#5A1A2C] text-[#FBF3EA] text-xs font-bold hover:bg-[#33101B] transition cursor-pointer"
                >
                  Unlock Builder Access ({funnel.pricePage}) →
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 bg-gradient-to-b from-[#5A1A2C] to-[#2B0A14] text-[#FBF3EA] rounded-[28px] p-6 sm:p-8 border border-[#B98A4E]/45 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-xs uppercase tracking-widest text-[#DCC397] font-bold flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" /> Done-For-You Concierge Option
                </div>
                <h3 className="font-serif text-2xl text-white">
                  Short on time before their birthday? Let our team build it for you.
                </h3>
                <p className="text-xs sm:text-sm text-[#F5DAD5]/90 leading-relaxed">
                  Select our <strong>Custom-Build Service ({funnel.priceCustom})</strong> during checkout, upload your photos and birthday notes inside My Site, and our studio writers &amp; designers will craft the entire surprise for you within 24 hours.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-white/15">
                <button
                  type="button"
                  data-pick="custom"
                  onClick={() => onOpenInstantCheckout('custom')}
                  className="w-full py-3 px-5 rounded-full bg-[#DCC397] hover:bg-[#B98A4E] text-[#2B1710] font-extrabold text-xs uppercase tracking-wider transition cursor-pointer"
                >
                  Choose &ldquo;Build It For Me&rdquo; ({funnel.priceCustom}) →
                </button>
              </div>
            </div>
          </div>

          {/* Quick FAQ Accordion */}
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
                Questions &amp; Answers
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-[#2B1710]">
                Everything you need to know before you start
              </h3>
            </div>
            <div className="space-y-3">
              {BIRTHDAY_FAQS.map((item, idx) => (
                <details
                  key={idx}
                  open={idx === 0}
                  className="group bg-[#FFFBF6] border border-[#5A1A2C]/14 rounded-2xl px-5 py-4 shadow-2xs"
                >
                  <summary className="font-serif text-base sm:text-lg font-medium text-[#2B1710] cursor-pointer list-none flex items-center justify-between gap-3">
                    <span>{item.q}</span>
                    <span className="text-[#B98A4E] text-xl font-normal transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2.5 text-sm sm:text-[15px] text-[#7A5A47] leading-relaxed">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
