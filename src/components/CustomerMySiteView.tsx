import React, { useState } from 'react';
import {
  Heart,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit3,
  MessageCircle,
  Lock,
  Copy,
  Check,
  CreditCard,
  Eye,
  HardDrive,
} from 'lucide-react';
import {
  COUNTRIES,
  OrderProgressStage,
  ChasingHerProjectData,
  MemoriesProjectData,
  resolveCountrySettings,
  computeProjectStorageUsage,
  formatStorageMegabytes,
} from '../utils/platformLogic';
import { SubmissionOrder } from '../utils/supabaseAndOci';
import { lookupCustomerOrdersInFirestore } from '../utils/firebaseClient';
import { PWAInstallButton } from './PWAInstallPrompt';
import { RecipientSitePreview } from './RecipientSitePreview';

interface CustomerMySiteViewProps {
  orders: SubmissionOrder[];
  justPaidOrderId?: string | null;
  settingsMap: Record<string, string>;
  chasingHerProjects: Record<string, ChasingHerProjectData>;
  memoriesProjects: Record<string, MemoriesProjectData>;
  onOpenBuilder: (order: SubmissionOrder) => void;
  onMarkPaymentReturned: (orderId: string) => void;
}

const PROGRESS_STAGES: Array<{ id: OrderProgressStage; step: string; label: string; desc: string }> = [
  {
    id: 'received',
    step: '01',
    label: 'Order Received',
    desc: 'Your details and design choice are saved.',
  },
  {
    id: 'building',
    step: '02',
    label: 'Crafting Your Site',
    desc: 'Arranging your photos, letter, and music.',
  },
  {
    id: 'review',
    step: '03',
    label: 'Ready for Review',
    desc: 'Preview your site and verify every detail.',
  },
  {
    id: 'hosted',
    step: '04',
    label: 'Live & Hosted',
    desc: 'Ready to share with your secret 6-digit PIN.',
  },
];

export const CustomerMySiteView: React.FC<CustomerMySiteViewProps> = ({
  orders,
  justPaidOrderId,
  settingsMap,
  chasingHerProjects,
  memoriesProjects,
  onOpenBuilder,
  onMarkPaymentReturned,
}) => {
  const [emailQuery, setEmailQuery] = useState(() => {
    try {
      return localStorage.getItem('cust_email') || '';
    } catch {
      return '';
    }
  });
  const [activeEmail, setActiveEmail] = useState(() => {
    try {
      return localStorage.getItem('cust_email') || '';
    } catch {
      return '';
    }
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewOrder, setPreviewOrder] = useState<SubmissionOrder | null>(null);
  const [loadingLookup, setLoadingLookup] = useState(false);

  const justPaidOrder = justPaidOrderId
    ? orders.find((o) => o.id === justPaidOrderId) || null
    : null;

  const matchedOrders = orders.filter((o) =>
    activeEmail.trim()
      ? o.email.toLowerCase() === activeEmail.trim().toLowerCase()
      : true
  );

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailQuery.trim().toLowerCase();
    setLoadingLookup(true);
    setActiveEmail(clean);
    try {
      if (clean) localStorage.setItem('cust_email', clean);
      await lookupCustomerOrdersInFirestore(clean);
    } catch {
      // Fallback to local state seamlessly
    }
    setLoadingLookup(false);
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Post-Payment Instant Unlock Banner */}
      {justPaidOrder && (
        <div className="rounded-2xl bg-gradient-to-r from-[#123726] via-[#174630] to-[#0F2D1F] text-[#FBF3EA] p-6 border border-emerald-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Payment Verified · Your Private Studio Is Unlocked</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl text-white">
              Welcome, {justPaidOrder.full_name.split(' ')[0]} — /{justPaidOrder.slug} is ready.
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl">
              {justPaidOrder.product === 'custom'
                ? 'Your Concierge Custom Brief is saved below. Track studio progress or preview your gift anytime.'
                : 'Your personalized starter template is pre-loaded with your PIN and opening message. Launch the Website Builder below to add your photos and song.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenBuilder(justPaidOrder)}
            className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Edit3 className="h-4 w-4" />
            <span>Open Website Builder</span>
          </button>
        </div>
      )}

      {/* Editorial Customer Portal Header */}
      <section className="rounded-2xl bg-gradient-to-br from-[#2A0A14] via-[#1C060D] to-[#140409] text-[#FBF3EA] p-6 sm:p-8 border border-[#E2B96F]/20 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#E2B96F]">
              Private Customer Portal · My Site Studio
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#FFF9F2] tracking-tight">
              Your Love Website &amp; Order Tracker
            </h1>
            <p className="text-sm text-[#FBF3EA]/70 max-w-xl leading-relaxed">
              Check your build progress, copy your secret unlock PIN, manage your 50.0 MB media space, and edit your site anytime.
            </p>
          </div>
          <a
            href="https://wa.me/2348094169489?text=Hi%20Chasing%20Her%20team%2C%20I%20need%20help%20with%20my%20website%20order"
            target="_blank"
            rel="noreferrer"
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#120408] hover:bg-[#220911] border border-[#E2B96F]/30 text-xs font-medium text-[#FBF3EA] flex items-center gap-2 self-start sm:self-end transition-colors whitespace-nowrap shrink-0"
          >
            <MessageCircle className="h-4 w-4 text-[#E2B96F]" />
            <span>WhatsApp Concierge</span>
          </a>
        </div>

        {/* Dedicated PWA Install Card for Customers */}
        <PWAInstallButton contextLabel="My Site" variant="card" />
      </section>

      {/* Email Lookup Bar + Instant Preview Accounts */}
      <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/18 p-5 sm:p-6 space-y-4">
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1">
            <span className="sr-only">Enter your order email address</span>
            <div className="relative">
              <Search className="h-4 w-4 text-[#FBF3EA]/45 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={emailQuery}
                onChange={(e) => setEmailQuery(e.target.value)}
                placeholder="Enter your order email (e.g. kofi@example.com)"
                className="w-full min-h-[46px] rounded-xl border border-[#E2B96F]/20 bg-[#120408] pl-11 pr-4 py-2.5 text-sm text-[#FBF3EA] placeholder:text-[#FBF3EA]/40 focus:outline-none focus:border-[#E2B96F]"
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={loadingLookup}
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {loadingLookup ? 'Searching…' : 'Find My Site'}
          </button>
          {activeEmail && (
            <button
              type="button"
              onClick={() => {
                setEmailQuery('');
                setActiveEmail('');
              }}
              className="min-h-[46px] px-4 py-2.5 rounded-xl border border-[#E2B96F]/25 bg-[#120408] text-xs font-medium text-[#FBF3EA]/80 hover:border-[#E2B96F] cursor-pointer whitespace-nowrap shrink-0"
            >
              Show All
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[#FBF3EA]/55">
          <span>Quick preview orders:</span>
          {[
            { email: 'kofi@example.com', label: '🇬🇭 Kofi (Hosted)' },
            { email: 'brian@example.com', label: '🇰🇪 Brian (Building)' },
            { email: 'amara@example.com', label: '🇳🇬 Tunde & Amara (Review)' },
          ].map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => {
                setEmailQuery(acc.email);
                setActiveEmail(acc.email);
              }}
              className={`min-h-[34px] px-3 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                activeEmail.toLowerCase() === acc.email
                  ? 'border-[#E2B96F] bg-[#E2B96F] text-[#16050A] font-semibold'
                  : 'border-[#E2B96F]/20 bg-[#120408] text-[#FBF3EA]/80 hover:border-[#E2B96F]/50'
              }`}
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Orders List */}
      {matchedOrders.length === 0 ? (
        <div className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/18 p-12 text-center space-y-3">
          <Heart className="h-8 w-8 text-[#E2B96F] mx-auto opacity-85" />
          <h2 className="font-serif text-2xl text-[#FBF3EA]">
            No projects found for “{activeEmail}”
          </h2>
          <p className="text-sm text-[#FBF3EA]/65 max-w-md mx-auto">
            Double-check your email spelling or tap “Show All” above to view sample customer sites.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {matchedOrders.map((order) => {
            const cCfg = COUNTRIES[order.country] || COUNTRIES.gh;
            const funnel = resolveCountrySettings(order.country, settingsMap);
            const stageIdx = PROGRESS_STAGES.findIndex((s) => s.id === order.progress);
            const activeStageIndex = stageIdx === -1 ? 0 : stageIdx;
            const buildProd: 'chasing-her' | 'memories' =
              order.product === 'memories' || order.build_product === 'memories'
                ? 'memories'
                : 'chasing-her';
            const projData =
              buildProd === 'memories'
                ? memoriesProjects[order.slug]
                : chasingHerProjects[order.slug];
            const storage = computeProjectStorageUsage(projData, buildProd);

            return (
              <article
                key={order.id}
                className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 p-6 sm:p-8 space-y-6"
              >
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#FBF3EA]/10 pb-5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#FBF3EA]/60">
                      <span>
                        {cCfg.flag} {cCfg.name}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[#E2B96F]">
                        {order.product === 'memories'
                          ? 'Memories 34-Heart Edition'
                          : order.product === 'custom'
                          ? 'Concierge Custom Build'
                          : 'Chasing Her Edition'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[#FBF3EA]/80">/{order.slug}</span>
                    </div>
                    <h2 className="font-serif text-2xl sm:text-3xl text-[#FBF3EA]">
                      {order.full_name}’s Love Website
                    </h2>
                    <p className="text-xs text-[#FBF3EA]/55">{order.email}</p>
                  </div>

                  {/* Secret PIN Box */}
                  <div className="flex items-center gap-3 rounded-xl bg-[#120408] border border-[#E2B96F]/25 px-4 py-2.5 self-start">
                    <Lock className="h-4 w-4 text-[#E2B96F] shrink-0" />
                    <div>
                      <div className="text-[11px] text-[#FBF3EA]/55">Secret Unlock PIN</div>
                      <div className="font-mono text-sm font-bold tracking-widest text-[#E2B96F] tabular-nums">
                        {order.pin || '140226'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(order.pin || '140226', `pin-${order.id}`)}
                      aria-label={`Copy PIN for ${order.slug}`}
                      className="min-h-[36px] min-w-[36px] rounded-lg bg-[#1A060C] border border-[#E2B96F]/25 flex items-center justify-center text-[#E2B96F] hover:border-[#E2B96F] transition-colors cursor-pointer"
                    >
                      {copiedId === `pin-${order.id}` ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 4-Step Visual Progress Tracker */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {PROGRESS_STAGES.map((stage, idx) => {
                    const isCompleted = idx <= activeStageIndex;
                    const isCurrent = idx === activeStageIndex;
                    return (
                      <div
                        key={stage.id}
                        className={`rounded-xl p-4 border transition-colors ${
                          isCurrent
                            ? 'border-[#E2B96F]/60 bg-[#250A13]'
                            : isCompleted
                            ? 'border-[#E2B96F]/20 bg-[#140409]'
                            : 'border-[#FBF3EA]/8 bg-[#120408] opacity-55'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-[#FBF3EA]">
                          <span className={isCurrent ? 'text-[#E2B96F]' : ''}>
                            {stage.step}. {stage.label}
                          </span>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-[#FBF3EA]/40 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-[#FBF3EA]/65 mt-1.5 leading-snug">
                          {stage.desc}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Studio Note */}
                {order.progress_note && (
                  <div className="rounded-xl bg-[#220911] border border-[#E2B96F]/20 px-4 py-3.5 text-sm text-[#FBF3EA]/85">
                    <strong className="font-semibold text-[#E2B96F]">Studio Update: </strong>
                    {order.progress_note}
                  </div>
                )}

                {/* 50.0 MB Paid Build Storage Allocation Meter */}
                <div
                  data-testid={`mysite-storage-card-${order.slug}`}
                  className="rounded-xl bg-[#120408] border border-[#E2B96F]/18 p-4 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#FBF3EA]">
                      <HardDrive className="h-4 w-4 text-[#E2B96F]" />
                      <span>Paid Build Media Storage (50.0 MB Allocation)</span>
                    </div>
                    <span className="text-xs font-mono font-semibold text-[#E2B96F] tabular-nums">
                      {formatStorageMegabytes(storage.usedBytes)} / 50.0 MB used (
                      {storage.percentUsed}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#260A13] overflow-hidden">
                    <div
                      className="h-full bg-[#E2B96F] transition-all duration-300"
                      style={{ width: `${Math.min(100, storage.percentUsed)}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#FBF3EA]/60">
                    <span className="tabular-nums">
                      Saved Audio:{' '}
                      <strong className="text-[#FBF3EA]/85">
                        {formatStorageMegabytes(storage.breakdown.audioBytes)}
                      </strong>{' '}
                      · Photos &amp; Video:{' '}
                      <strong className="text-[#FBF3EA]/85">
                        {formatStorageMegabytes(storage.breakdown.photoVideoBytes)}
                      </strong>{' '}
                      · {formatStorageMegabytes(storage.remainingBytes)} remaining
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenBuilder(order)}
                      className="font-semibold text-[#E2B96F] hover:underline cursor-pointer"
                    >
                      Manage Files in Builder →
                    </button>
                  </div>
                </div>

                {/* Payment Banner if pending_payment */}
                {order.status === 'pending_payment' && (
                  <div className="rounded-xl bg-amber-950/45 border border-amber-400/35 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-amber-200">
                        {order.returned_from_payment_at
                          ? 'Payment received — our studio is confirming it now'
                          : `Complete Payment (${
                              order.product === 'custom' ? funnel.priceCustom : funnel.pricePage
                            }) to Publish Your Link`}
                      </div>
                      <p className="text-xs text-amber-100/70">
                        {cCfg.paymentMethodsLabel} · Instant confirmation
                      </p>
                    </div>
                    {!order.returned_from_payment_at && (
                      <button
                        type="button"
                        onClick={() => onMarkPaymentReturned(order.id)}
                        className="min-h-[42px] px-5 py-2.5 rounded-xl bg-[#E2B96F] text-[#16050A] text-xs font-semibold flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>
                          Complete Payment (
                          {order.product === 'custom' ? funnel.priceCustom : funnel.pricePage})
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onOpenBuilder(order)}
                    className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit Photos, Letter &amp; Music</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewOrder(order)}
                    className="min-h-[46px] px-5 py-2.5 rounded-xl border border-[#E2B96F]/35 bg-[#120408] hover:border-[#E2B96F] text-[#FBF3EA] text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Eye className="h-4 w-4 text-[#E2B96F]" />
                    <span>Preview Live Experience</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        `${window.location.origin}/?view=preview&product=${buildProd}&slug=${order.slug}`,
                        `link-${order.id}`
                      )
                    }
                    className="min-h-[46px] px-4 py-2.5 rounded-xl border border-[#FBF3EA]/15 bg-[#120408] hover:border-[#E2B96F]/45 text-[#FBF3EA]/85 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {copiedId === `link-${order.id}` ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-400" />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4 text-[#E2B96F]" />
                        <span>Copy Shareable Link</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Preview Customer Website"
        >
          <div className="w-full max-w-4xl my-auto">
            <RecipientSitePreview
              product={
                previewOrder.product === 'memories' || previewOrder.build_product === 'memories'
                  ? 'memories'
                  : 'chasing-her'
              }
              chasingHerData={chasingHerProjects[previewOrder.slug]}
              memoriesData={memoriesProjects[previewOrder.slug]}
              onClose={() => setPreviewOrder(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
