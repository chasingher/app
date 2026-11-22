import React from 'react';
import {
  Heart,
  Sparkles,
  ArrowRight,
  Play,
  Globe,
  Sliders,
  Copy,
  Check,
  Smartphone,
  Wand2,
  CheckCircle2,
  MessageCircle,
  PhoneMissed,
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

export const RECONCILE_OPENING_PRESETS = [
  'I know words alone cannot undo the hurt, but I never want you to forget how deeply I love you.',
  'Even in the silence between us, every memory we built together still means the world to me.',
  'I made this for you because some feelings deserve more than another text message.',
] as const;

const RECONCILE_STORIES = [
  {
    badge: 'STORY 01 · WHEN SHE STOPPED REPLYING',
    roleLabel: 'After 5 days of unanswered texts',
    whatsappSent:
      "I know you need space and I respect that. I made something for you when you're ready: chasingher.love/for-efua (PIN: 041124)",
    whatsappReply:
      'I just finished going through the whole thing... how did you even make this? Seeing our old pictures and your letter made me cry 😭❤️',
    headline:
      '"She hadn\'t replied to my texts in five days. Fifteen minutes after I sent her link, she called me in tears."',
    body: 'Every text I sent only made things feel more tense. Putting our favorite photos, the song from our first trip, and a sincere letter into Chasing Her made her pause and remember why we fell in love in the first place.',
    author: 'Kofi M.',
    location: 'East Legon, Accra 🇬🇭',
    previewTarget: 'chasing-her' as const,
  },
  {
    badge: 'STORY 02 · REMINDING HER OF US',
    roleLabel: '34 memories & a sincere voice note',
    whatsappSent:
      "Not another long text. Just something from my heart whenever you have 2 minutes: chasingher.love/njeri",
    whatsappReply:
      'Hearing your voice over our 34 photos broke all my defenses. Can we meet for coffee tomorrow evening?',
    headline:
      '"My voice note playing softly over 34 of our happiest moments said what a hundred WhatsApp paragraphs never could."',
    body: 'When emotions are high, texts sound defensive. Hearing my calm voice reading my letter while 34 of our memories formed a beating heart reminded her that what we have is worth fighting for.',
    author: 'David K.',
    location: 'Kilimani, Nairobi 🇰🇪',
    previewTarget: 'memories' as const,
  },
  {
    badge: 'STORY 03 · SINCERE EFFORT',
    roleLabel: 'Showing real thought & time',
    whatsappSent:
      'I took some time to build this for you. The passcode is the day we first met: chasingher.love/amina',
    whatsappReply:
      "You actually took the time to make all of this for me? I didn't expect this at all... thank you ❤️",
    headline:
      '"She told me it was the first time she truly felt how much she meant to me without me trying to argue my point."',
    body: "I'm not a programmer or a poet, so I used the guided builder. In 25 minutes I had a private, PIN-protected love letter with our Polaroids and songs that showed genuine care.",
    author: 'Samuel O.',
    location: 'Nyali, Mombasa 🇰🇪',
    previewTarget: 'chasing-her' as const,
  },
] as const;

const RECONCILE_FAQS = [
  {
    q: 'Do I need to know how to build a website or code?',
    a: 'No. You do not need any technical, coding, or design skills. Simply access the guided builder, follow the step-by-step prompts, drop in your photos and words, preview your creation, and publish your shareable link.',
  },
  {
    q: 'What if I am not a good writer?',
    a: "You don't have to be a writer—you just have to know what you want her to know. Sincere, honest words in your own voice always mean more to her than copied poetry.",
  },
  {
    q: 'How do I send it to her once I am done?',
    a: 'As soon as you publish inside your My Site portal, you receive a private shareable link (protected by a 6-digit PIN meaningful to the two of you) that you can send on WhatsApp, iMessage, SMS, or Instagram.',
  },
  {
    q: 'When do I get access to the builder and My Site App?',
    a: 'Immediately after payment. The moment checkout completes, you are automatically redirected into your standalone My Site Customer App where you can build at your own pace with 48-hour auto-save.',
  },
  {
    q: 'Can your team build it for me if I am overwhelmed?',
    a: 'Yes. If you want our team to assemble and polish the entire experience for you, select our Concierge Custom-Build option during checkout and upload your photos and notes inside My Site.',
  },
] as const;

interface FlowerThemeOption {
  readonly id: string;
  readonly name: string;
  readonly colors: readonly string[];
  readonly tag: string;
}

interface ReconcileSalesCampaignContentProps {
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

export const ReconcileSalesCampaignContent: React.FC<ReconcileSalesCampaignContentProps> = ({
  countryConfig,
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
          HERO — CLEAR ABOVE-THE-FOLD OPENING (ARE YOU ABOUT TO LOSE HER?)
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
              Private Digital Love Letter
            </p>

            <h1 className="font-serif text-[clamp(2.5rem,5.4vw,4.35rem)] leading-[1.06] text-[#2B1710] tracking-tight text-balance">
              Are you about to{' '}
              <em className="italic text-[#5A1A2C] font-medium">lose her?</em>
            </h1>

            <p className="text-lg sm:text-xl leading-relaxed text-[#5C4033] max-w-2xl mx-auto text-balance">
              Are you afraid she&apos;s already moved on — and most importantly,{' '}
              <strong className="text-[#2B1710] font-semibold">do you still love her?</strong>{' '}
              Give your words a quiet, private space she&apos;ll actually open.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenInstantCheckout('chasing-her')}
                className="py-4 px-7 rounded-full bg-gradient-to-b from-[#6E2236] to-[#5A1A2C] text-[#FBF3EA] font-bold text-sm sm:text-base shadow-[0_14px_30px_-10px_rgba(90,26,44,0.55),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-0.5 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Create Her Love Letter</span>
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
                alt="Preview of a Chasing Her digital love letter website shown on laptop and phone, with photos, a song, and a heartfelt letter"
                className="w-full h-full object-cover block"
              />
            </div>

            <div className="md:col-span-5 p-6 bg-gradient-to-b from-[#33101B] to-[#220810] flex flex-col justify-center space-y-4">
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#DCC397] font-bold">
                  What She Discovers Piece By Piece
                </div>
                <div className="text-base font-serif italic text-[#FBF3EA] leading-relaxed">
                  Her Name · Your Words · Your Photos · Your Song · Wax-Sealed Letter
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
            Almost every man has, at some point, found himself in a situation where the woman he loves is so upset with him that she no longer replies to his texts or picks up his calls.
          </p>
          <p className="font-semibold text-[#5A1A2C] text-lg sm:text-xl">
            She leaves his messages unanswered.
          </p>
          <p>And it leaves him wondering...</p>

          <blockquote className="my-6 p-6 sm:p-8 rounded-[24px] bg-gradient-to-br from-[#5A1A2C] via-[#431220] to-[#280913] text-[#FBF3EA] shadow-xl border border-[#B98A4E]/40 relative overflow-hidden">
            <div className="text-[#DCC397]/25 font-serif text-7xl leading-none absolute -top-2 left-3 select-none">
              &ldquo;
            </div>
            <p className="relative z-10 font-serif italic text-xl sm:text-2xl leading-relaxed text-[#FBF3EA]">
              Is this it? Is my relationship with the woman I love coming to a painful end?
            </p>
          </blockquote>

          <p className="font-serif text-xl sm:text-2xl text-[#5A1A2C] font-medium">
            But the truth is, you still want to give it one more try.
          </p>
          <p className="font-semibold text-[#2B1710]">You don&apos;t want it to end.</p>
          <p>
            You still love her. You still want to tell her how much she means to you. And most importantly, you want to remind her of how beautiful what you both shared was — and that, despite your mistakes, you still believe what you have together is worth fighting for.
          </p>
          <p>
            Because sometimes, when emotions are high and hurt has taken over, you wish you could find a way to make her pause for a moment:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-2xl bg-[#F5E9DC] border border-[#5A1A2C]/12 text-xs sm:text-sm font-semibold text-[#5A1A2C]">
              To remember the beautiful moments you shared.
            </div>
            <div className="p-4 rounded-2xl bg-[#F5E9DC] border border-[#5A1A2C]/12 text-xs sm:text-sm font-semibold text-[#5A1A2C]">
              To remember the love that once made you both so happy.
            </div>
            <div className="p-4 rounded-2xl bg-[#5A1A2C] text-[#FBF3EA] text-xs sm:text-sm font-semibold shadow-sm">
              And to hear what you&apos;ve been struggling to tell her all this time.
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 01 — BUT HOW DO YOU TELL HER ALL OF THIS?
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-[#F5E9DC]/90 border-y border-[#5A1A2C]/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              01 · When Texts &amp; Calls Go Unanswered
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#2B1710]">
              BUT HOW DO YOU TELL HER <em className="italic text-[#5A1A2C]">ALL OF THIS?</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left: Visual Contrast — Unanswered Texts vs. Private Experience */}
            <div className="lg:col-span-5">
              <div className="rounded-[28px] bg-[#1D060D] border-2 border-[#B98A4E]/35 p-5 sm:p-6 text-[#FBF3EA] shadow-2xl space-y-4">
                <div className="flex items-center justify-between text-xs border-b border-white/10 pb-3">
                  <span className="text-[#DCC397] font-semibold flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" /> Why Another Text Gets Ignored
                  </span>
                  <span className="text-[11px] text-[#F5DAD5]/60">Seen · No Reply</span>
                </div>

                {/* Unanswered message bubbles */}
                <div className="space-y-2.5 text-xs">
                  <div className="ml-8 p-3 rounded-2xl rounded-tr-xs bg-[#005C4B]/75 text-white/90">
                    Babe I&apos;m really sorry about everything. Can we please talk?
                    <div className="text-[10px] text-emerald-200/70 text-right mt-1">
                      Yesterday · Read ✓✓
                    </div>
                  </div>
                  <div className="ml-12 p-2.5 rounded-xl bg-red-950/60 border border-red-400/25 text-red-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <PhoneMissed className="w-3.5 h-3.5 text-red-300" /> Missed voice call (3)
                    </span>
                    <span className="text-[10px] opacity-75">No answer</span>
                  </div>
                  <div className="ml-6 p-3 rounded-2xl rounded-tr-xs bg-[#005C4B]/75 text-white/90">
                    I miss you so much. There&apos;s so much I want to explain...
                    <div className="text-[10px] text-emerald-200/70 text-right mt-1">
                      11:42 PM · Read ✓✓
                    </div>
                  </div>
                </div>

                {/* The Pivot */}
                <div className="pt-3 border-t border-[#DCC397]/25">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#5A1A2C] to-[#3B0D1B] border border-[#DCC397]/45 space-y-1.5">
                    <div className="text-[10px] uppercase tracking-widest text-[#DCC397] font-bold">
                      ✦ Instead of Another Text Paragraph
                    </div>
                    <div className="font-serif italic text-base text-white">
                      chasingher.love/for-{sanitizedPartnerSlug}
                    </div>
                    <p className="text-[11px] text-[#F5DAD5]/90">
                      A private digital love letter built with your words, your photos, and the memories you both hold close.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: The Exact Narrative Copy */}
            <div className="lg:col-span-7 bg-[#FFFBF6] border border-[#5A1A2C]/12 rounded-[28px] p-6 sm:p-9 shadow-md space-y-4 text-[16px] sm:text-[17px] leading-[1.78] text-[#2B1710]">
              <p className="font-serif text-xl sm:text-2xl text-[#5A1A2C] font-medium">
                You&apos;ve probably tried sending her messages.
              </p>
              <p>Maybe you&apos;ve apologized already.</p>
              <p>Maybe you&apos;ve told her you miss her.</p>
              <p>
                Maybe you&apos;ve tried calling, hoping she would pick up so you could explain everything.
              </p>
              <p className="font-semibold text-[#5A1A2C]">
                But when she doesn&apos;t reply, you&apos;re left with so much more to say.
              </p>
              <p>
                You want her to understand that she means more to you than you have shown her.
              </p>
              <p>
                You want to remind her of the moments that made you both happy.
              </p>
              <p>
                You want to tell her the things you love about her, the memories you still hold close, and how much you wish things could be different.
              </p>
              <p className="font-serif italic text-xl text-[#5A1A2C]">
                But how do you put all of that into one message?
              </p>
              <p className="font-serif italic text-xl text-[#5A1A2C]">
                How do you make her see that this isn&apos;t just another text?
              </p>

              <div className="p-5 sm:p-6 rounded-2xl bg-[#33101B] text-[#FBF3EA] border border-[#B98A4E]/45 shadow-md mt-4">
                <p className="font-serif text-lg sm:text-xl leading-relaxed text-[#DCC397]">
                  What if, instead of sending her another message, you created something she could open and experience for herself?
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 02 — WHAT IF YOU COULD GIVE HER SOMETHING SHE NEVER EXPECTED?
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
              02 · Beyond Another Apology Text
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[42px] leading-[1.15] text-[#2B1710]">
              WHAT IF YOU COULD GIVE HER SOMETHING <em className="italic text-[#5A1A2C]">SHE NEVER EXPECTED?</em>
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
                    &ldquo;us, always&rdquo;
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
                <p>Not another WhatsApp message.</p>
                <p>Not another &ldquo;I&apos;m sorry.&rdquo;</p>
                <p>Not just a few lines telling her you miss her.</p>
              </div>

              <p className="font-serif text-2xl sm:text-3xl text-[#5A1A2C] font-medium pt-1">
                But a beautiful, personal digital love letter...
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4">
                {[
                  'Made with your words.',
                  'Your pictures.',
                  'Your memories.',
                  'The things you love about her.',
                  "And everything you've been wishing you could tell her.",
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
                Something she opens on her phone and discovers piece by piece.
              </p>
              <p>
                Something that reminds her of the beautiful moments you both shared and lets her see the feelings you may have struggled to express.
              </p>

              <div className="pt-3 border-t border-[#5A1A2C]/10 flex flex-wrap items-center justify-between gap-3">
                <p className="font-serif italic text-xl sm:text-2xl text-[#5A1A2C] font-semibold">
                  Something you created specially for her.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenInstantCheckout('chasing-her')}
                  className="px-5 py-2.5 rounded-full bg-[#5A1A2C] text-[#FBF3EA] text-xs font-bold hover:bg-[#33101B] transition cursor-pointer shrink-0"
                >
                  Start Creating Hers →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 03 — INTRODUCING CHASING HER (A love letter she won't see coming)
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-[#F5E9DC]/85 border-y border-[#5A1A2C]/10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              03 · Introducing Chasing Her
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[44px] leading-[1.12] text-[#2B1710] mb-3">
              A love letter <em className="italic text-[#5A1A2C]">she won&apos;t see coming.</em>
            </h2>
            <p className="text-base sm:text-lg text-[#2B1710] leading-relaxed">
              <strong className="text-[#5A1A2C]">Chasing Her</strong> lets you create a beautiful, personal digital love letter for the woman you love.
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
                  You don&apos;t need to be a programmer.
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-[#FBF3EA] border border-[#5A1A2C]/10">
                <div className="text-xs uppercase tracking-wider text-[#B98A4E] font-bold mb-1">
                  03 · Sincere &amp; Honest
                </div>
                <div className="font-serif text-lg font-semibold text-[#5A1A2C]">
                  And you don&apos;t need to be a good writer.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center text-[16px] sm:text-[17px] leading-[1.78] text-[#2B1710]">
              <div className="lg:col-span-7 space-y-3">
                <p>
                  Our simple builder lets you create your own romantic experience, add your personal touch, and turn your feelings into something you can share with her.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-sm font-semibold text-[#5A1A2C]">
                  <div className="p-3 rounded-xl bg-[#F5E9DC]/70">♥ You can make it about her.</div>
                  <div className="p-3 rounded-xl bg-[#F5E9DC]/70">♥ About the memories you share.</div>
                  <div className="p-3 rounded-xl bg-[#F5E9DC]/70">♥ About the things you love about her.</div>
                  <div className="p-3 rounded-xl bg-[#F5E9DC]/70">♥ About what you&apos;ve been meaning to tell her.</div>
                </div>
                <p className="pt-1">
                  And when you&apos;re done, you&apos;ll have a personal experience you can send to her through a link.
                </p>
              </div>

              <div className="lg:col-span-5 p-6 rounded-[24px] bg-gradient-to-br from-[#5A1A2C] to-[#280913] text-[#FBF3EA] border border-[#B98A4E]/45 shadow-xl space-y-3">
                <div className="text-xs uppercase tracking-widest text-[#DCC397] font-bold">
                  Why It Reaches Her Heart
                </div>
                <p className="font-serif italic text-xl sm:text-2xl text-white leading-snug">
                  &ldquo;This isn&apos;t another message you typed in a hurry. It&apos;s something you took the time to create.&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => onOpenInstantCheckout('chasing-her')}
                  className="w-full py-3 px-4 rounded-full bg-[#DCC397] text-[#2B1710] font-extrabold text-xs uppercase tracking-wider hover:brightness-105 transition cursor-pointer"
                >
                  Create Her Love Letter ({funnel.pricePage}) →
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
          SECTION 04 — IMAGINE HER OPENING IT...
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
              04 · The Moment She Clicks Your Link
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-[44px] leading-[1.12] text-[#2B1710]">
              IMAGINE HER <em className="italic text-[#5A1A2C]">OPENING IT...</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
            {/* Left: The Step-by-Step Emotional Discovery Narrative */}
            <div className="lg:col-span-6 bg-[#FFFBF6] border border-[#5A1A2C]/15 rounded-[28px] p-6 sm:p-9 shadow-md space-y-4 text-[16px] sm:text-[17px] leading-[1.78] text-[#2B1710]">
              <div className="space-y-2.5">
                {[
                  'She clicks the link you sent her.',
                  "She begins to explore what you've created.",
                  'She sees her name.',
                  'She finds your words.',
                  "She comes across the pictures and memories you've chosen.",
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

              <p className="pt-2">And then she realizes...</p>

              <div className="p-5 rounded-2xl bg-[#5A1A2C] text-[#FBF3EA] font-serif italic text-xl sm:text-2xl shadow-md">
                &ldquo;You actually took the time to make this for her.&rdquo;
              </div>

              <p>Not because someone told you what to buy.</p>
              <p>Not because you copied a message from the internet.</p>
              <p className="font-semibold text-[#5A1A2C]">
                But because there are things you still want her to know.
              </p>

              <ul className="space-y-1.5 pl-1 text-[#5A1A2C] font-medium">
                <li>✦ Things you wish you had said.</li>
                <li>✦ Things you wish you had done better.</li>
                <li>✦ And things about her that you never want her to forget.</li>
              </ul>

              <p className="pt-2 border-t border-[#5A1A2C]/10 text-[#7A5A47]">
                You can&apos;t control what she will feel when she opens it.
              </p>
              <p className="font-serif text-lg sm:text-xl text-[#2B1710] font-medium">
                But at least this time, you can express yourself in a way that is more personal than another text.
              </p>
            </div>

            {/* Right: Interactive Live Personalizer Sandbox for Her */}
            <div className="lg:col-span-6 bg-[#FFFBF6] rounded-[28px] border-2 border-[#B98A4E]/35 p-6 sm:p-8 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#5A1A2C]/10 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5A1A2C]">
                  <Sliders className="w-3.5 h-3.5 text-[#B98A4E]" />
                  <span>Preview Her Personal Link Right Now</span>
                </div>
                <span className="text-xs text-[#7A5A47]">Try typing her name</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B1710] mb-1">
                    1. Her First Name
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
                    2. Meaningful 6-Digit PIN
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
                  4. Select or Customize Your Opening Line To Her
                </label>
                <div className="space-y-1.5">
                  {RECONCILE_OPENING_PRESETS.map((line, i) => (
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
                    For <em className="italic text-[#DCC397]">{partnerName || 'Her'}</em>
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
                  Create This For {partnerName || 'Her'} ({funnel.pricePage}) →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 05 — YOU DON'T HAVE TO KNOW HOW TO CREATE IT. WE'VE MADE IT SIMPLE.
          + [INSERT ACTUAL BUILDER DEMONSTRATION]
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
          {/* Narrative Intro from Copy before the Builder Demonstration */}
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
                  &ldquo;This sounds beautiful, but how am I supposed to make something like this?&rdquo;
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
                  Add Photos, Song &amp; Words
                </div>
                <p className="text-xs text-[#F5DAD5]/80">
                  Put in the things you want her to see—your photos, captions, voice note, and letter.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-[#DCC397]/25">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#DCC397] mb-1">
                  Step 03 · Preview
                </div>
                <div className="font-serif text-base font-semibold text-white mb-1">
                  Test Her Experience Live
                </div>
                <p className="text-xs text-[#F5DAD5]/80">
                  Preview your creation in real time and edit freely until every detail feels right.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#DCC397]/15 border border-[#DCC397]/50">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#DCC397] mb-1">
                  Step 04 · Publish
                </div>
                <div className="font-serif text-base font-semibold text-white mb-1">
                  Send Her Private Link
                </div>
                <p className="text-xs text-[#F5DAD5]/90">
                  Publish with one tap and get your shareable link protected by her PIN.
                </p>
              </div>
            </div>

            <p className="text-center font-serif italic text-xl sm:text-2xl text-[#DCC397]">
              &ldquo;You can create something beautiful for her without having to build a website from scratch.&rdquo;
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
            campaignMode="reconcile"
            onSelectProductAndCheckout={(prod) => onOpenInstantCheckout(prod)}
            onOpenFullModal={(prod) => onOpenLivePreviewModal(prod)}
          />
        </div>
      </section>

      {/* =====================================================================
          SECTION 06 — THERE'S NO NEED TO LET YOUR WORDS GET LOST IN ANOTHER TEXT.
         ===================================================================== */}
      <section className="py-16 md:py-24 px-4 sm:px-6 bg-[#F5E9DC]/85 border-b border-[#5A1A2C]/10">
        <div className="max-w-5xl mx-auto space-y-16">
          {/* Core Sincerity Letter */}
          <div className="max-w-3xl mx-auto bg-[#FFFDF9] border-2 border-[#B98A4E]/35 rounded-[32px] p-6 sm:p-10 md:p-12 shadow-xl space-y-5 text-[16px] sm:text-[18px] leading-[1.8] text-[#2B1710]">
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block">
              06 · Speak From The Heart
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl leading-[1.15] text-[#2B1710]">
              THERE&apos;S NO NEED TO LET YOUR WORDS GET LOST IN <em className="italic text-[#5A1A2C]">ANOTHER TEXT.</em>
            </h2>

            <p>Some things deserve more thought.</p>
            <p>Some feelings are difficult to explain in a few lines.</p>
            <p className="font-serif italic text-xl text-[#5A1A2C] font-medium">
              And some memories are too beautiful to leave unspoken.
            </p>

            <div className="space-y-2 py-2 text-[#5A1A2C] font-semibold">
              <p>✦ If you still have something you want to tell her...</p>
              <p>✦ If you still want her to know how much she means to you...</p>
              <p>✦ If you still want to remind her of the beautiful moments you shared...</p>
            </div>

            <p className="font-semibold text-[#2B1710] text-lg">
              Then take your time and create something that truly comes from you.
            </p>

            <div className="p-6 sm:p-7 rounded-[24px] bg-gradient-to-br from-[#5A1A2C] via-[#3F111F] to-[#240710] text-[#FBF3EA] border border-[#B98A4E]/45 space-y-2.5 shadow-lg">
              <p className="text-sm sm:text-base text-[#F5DAD5]/85">
                Not a promise that everything will go back to the way it was.
              </p>
              <p className="text-sm sm:text-base text-[#F5DAD5]/85">
                Not a trick to make her respond.
              </p>
              <p className="font-serif italic text-xl sm:text-2xl text-[#DCC397] pt-1">
                But a sincere expression of what is still in your heart.
              </p>
            </div>
          </div>

          {/* Real Reconciliation Stories + WhatsApp Replies */}
          <div>
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[#B98A4E] font-bold block mb-2">
                Real Experiences · When Words Needed A New Way To Reach Her
              </span>
              <h3 className="font-serif text-3xl sm:text-4xl text-[#2B1710]">
                What happened when they sent her a <em className="italic text-[#5A1A2C]">Chasing Her</em> link instead of another text
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {RECONCILE_STORIES.map((item, idx) => (
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
                  Take your time inside your private <em className="italic text-[#5A1A2C]">My Site</em> studio.
                </h3>
                <p className="text-sm sm:text-base text-[#7A5A47] leading-relaxed">
                  As soon as your payment is confirmed, you are automatically redirected to your standalone <strong>My Site Customer App</strong> where you get <strong>48 hours</strong> to carefully write your letter, arrange your photos, preview her link, and make free edits until every word feels sincere.
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
                  Struggling to put it all together yourself? Let our team help you build it.
                </h3>
                <p className="text-xs sm:text-sm text-[#F5DAD5]/90 leading-relaxed">
                  Select our <strong>Custom-Build Service ({funnel.priceCustom})</strong> during checkout, upload your photos and raw thoughts inside My Site, and our studio writers &amp; designers will craft the entire page for you within 24 hours.
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
              {RECONCILE_FAQS.map((item, idx) => (
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
