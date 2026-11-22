import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Wand2,
  Eye,
  MessageCircle,
  Copy,
  Check,
  Lock,
  ExternalLink,
  Trash2,
  Send,
  Globe,
  Plus,
} from 'lucide-react';
import {
  COUNTRIES,
  CountryCode,
  OrderProgressStage,
  ProductType,
  buildAppRoutePath,
  resolveCountrySettings,
} from '../utils/platformLogic';
import { SubmissionOrder } from '../utils/supabaseAndOci';

function toUrlSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

const PROGRESS_STAGES: { id: OrderProgressStage; step: string; label: string }[] = [
  { id: 'received', step: '01', label: 'Received' },
  { id: 'building', step: '02', label: 'Building' },
  { id: 'review', step: '03', label: 'Review' },
  { id: 'hosted', step: '04', label: 'Live' },
];

interface AdminOrderInspectorProps {
  order: SubmissionOrder;
  hasProject: boolean;
  localSettings: Record<string, string>;
  onUpdateOrder: (updated: SubmissionOrder) => void;
  onDeleteOrder?: (orderId: string) => void;
  onOpenInStudio: (order: SubmissionOrder) => void;
  onPreview: (order: SubmissionOrder) => void;
  onClose: () => void;
}

export const AdminOrderInspector: React.FC<AdminOrderInspectorProps> = ({
  order,
  hasProject,
  localSettings,
  onUpdateOrder,
  onDeleteOrder,
  onOpenInStudio,
  onPreview,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const countryCfg = COUNTRIES[order.country] || COUNTRIES.gh;
  const pricing = resolveCountrySettings(order.country, localSettings);
  const buildType: 'chasing-her' | 'memories' =
    order.build_product === 'memories' || order.product === 'memories'
      ? 'memories'
      : 'chasing-her';
  const cleanPhone = order.whatsapp.replace(/[^0-9]/g, '');
  const previewPath = `${buildAppRoutePath({ view: 'preview' }, import.meta.env.BASE_URL)}?product=${buildType}&slug=${order.slug}`;
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${previewPath}`
      : previewPath;

  const awaitingConfirm =
    Boolean(order.returned_from_payment_at) && order.status === 'pending_payment';

  const copyValue = (val: string, key: string) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const buildWaLink = (template: 'confirmed' | 'review' | 'live') => {
    const firstName = order.full_name.split(' ')[0] || 'there';
    const text =
      template === 'confirmed'
        ? `Hi ${firstName}! Your payment for Chasing Her (/${order.slug}) has been verified. You can open My Site Studio anytime to customize your photos, words, and song.`
        : template === 'review'
        ? `Hi ${firstName}! Your private love website (/${order.slug}) is ready for your final review. Open My Site to preview it and let us know if you want any tweaks.`
        : `Hi ${firstName}! Your private love website is LIVE! Share this link with your partner:\n${order.hosted_url || shareUrl}\nSecret Unlock PIN: ${order.pin}`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <aside
      aria-label="Order fulfillment inspector"
      data-testid="admin-order-inspector"
      className="bg-[#1A060C] border border-[#E2B96F]/20 rounded-2xl flex flex-col overflow-hidden"
    >
      {/* Inspector Header */}
      <div className="px-5 py-4 border-b border-[#E2B96F]/15 flex items-start justify-between gap-3 bg-[#210810]">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#FBF3EA]/60">
            <span className="text-[#E2B96F] font-medium">
              {countryCfg.flag} {countryCfg.name}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {order.product === 'chasing-her'
                ? 'Chasing Her'
                : order.product === 'memories'
                ? 'Memories 34-Heart'
                : 'Concierge Build'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[#E2B96F]">
              {order.product === 'custom' ? pricing.priceCustom : pricing.pricePage}
            </span>
          </div>
          <h3 className="font-serif text-xl text-[#FBF3EA] truncate">{order.full_name}</h3>
          <div className="flex items-center gap-2 text-xs text-[#FBF3EA]/65 font-mono">
            <span className="truncate">/{order.slug}</span>
            <button
              type="button"
              onClick={() => copyValue(shareUrl, 'share-url')}
              className="text-[#E2B96F] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              {copiedKey === 'share-url' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close order inspector"
          className="h-9 w-9 rounded-lg border border-[#FBF3EA]/15 text-[#FBF3EA]/70 hover:text-[#FBF3EA] hover:border-[#E2B96F]/40 flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Inspector Body */}
      <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-210px)]">
        {/* Urgent Payment Confirmation Banner or Payment Verification Control */}
        {awaitingConfirm ? (
          <div className="rounded-xl bg-amber-950/50 border border-amber-400/35 p-4 space-y-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-amber-200">
                Customer returned from payment checkout
              </p>
              <p className="text-xs text-amber-100/75">
                Verify receipt in {countryCfg.paymentMethodsLabel}, then unlock their build stage.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateOrder({
                  ...order,
                  status: 'paid',
                  progress: order.progress === 'received' ? 'building' : order.progress,
                })
              }
              className="w-full min-h-[42px] px-4 rounded-xl bg-[#E2B96F] hover:bg-[#ebd08a] text-[#16050A] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify Payment &amp; Advance Stage</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 py-2.5 px-3.5 rounded-xl bg-[#130408] border border-[#E2B96F]/15">
            <div className="text-xs">
              <span className="text-[#FBF3EA]/55 block">Payment Status</span>
              <span
                className={`font-semibold ${
                  order.status === 'paid' || order.status === 'hosted'
                    ? 'text-emerald-300'
                    : 'text-amber-300'
                }`}
              >
                {order.status === 'hosted'
                  ? 'Paid & Hosted Live'
                  : order.status === 'paid'
                  ? 'Payment Verified'
                  : 'Awaiting Payment'}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateOrder({
                  ...order,
                  status: order.status === 'pending_payment' ? 'paid' : 'pending_payment',
                })
              }
              className="min-h-[36px] px-3 rounded-lg border border-[#E2B96F]/25 text-xs font-medium text-[#FBF3EA]/85 hover:border-[#E2B96F] hover:text-[#E2B96F] transition-colors cursor-pointer whitespace-nowrap"
            >
              {order.status === 'pending_payment' ? 'Mark Paid' : 'Set Pending'}
            </button>
          </div>
        )}

        {/* Primary Studio Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onOpenInStudio(order)}
            className="min-h-[44px] px-3.5 rounded-xl bg-[#E2B96F] hover:bg-[#ecd08b] text-[#16050A] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Wand2 className="w-4 h-4 shrink-0" />
            <span>{hasProject ? 'Open in Studio' : 'Start Build'}</span>
          </button>

          <button
            type="button"
            onClick={() => onPreview(order)}
            className="min-h-[44px] px-3.5 rounded-xl bg-[#130408] border border-[#E2B96F]/30 hover:border-[#E2B96F] text-[#FBF3EA] font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-4 h-4 text-[#E2B96F] shrink-0" />
            <span>Live Preview</span>
          </button>
        </div>

        {/* 4-Stage Fulfillment Pipeline */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#FBF3EA]/80">Fulfillment Stage</span>
            <span className="font-mono text-[#E2B96F] text-[11px]">
              Step {Math.max(1, PROGRESS_STAGES.findIndex((s) => s.id === order.progress) + 1)} / 4
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 bg-[#130408] p-1 rounded-xl border border-[#E2B96F]/15">
            {PROGRESS_STAGES.map((stage) => {
              const active = order.progress === stage.id;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() =>
                    onUpdateOrder({
                      ...order,
                      progress: stage.id,
                      status:
                        stage.id === 'hosted'
                          ? 'hosted'
                          : order.status === 'pending_payment'
                          ? 'paid'
                          : order.status,
                    })
                  }
                  className={`min-h-[38px] px-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#E2B96F] text-[#16050A]'
                      : 'text-[#FBF3EA]/65 hover:text-[#FBF3EA] hover:bg-white/5'
                  }`}
                >
                  {stage.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Customer Contact & Secret PIN */}
        <div className="space-y-3 pt-1 border-t border-[#FBF3EA]/10">
          <p className="text-xs font-medium text-[#FBF3EA]/80">Customer Contact &amp; Access</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2 py-1.5">
              <span className="text-[#FBF3EA]/55">Email</span>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[#FBF3EA] truncate">{order.email}</span>
                <button
                  type="button"
                  onClick={() => copyValue(order.email, 'email')}
                  aria-label="Copy customer email"
                  className="text-[#E2B96F] hover:text-[#f0cf8f] cursor-pointer shrink-0"
                >
                  {copiedKey === 'email' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 py-1.5 border-t border-[#FBF3EA]/5">
              <span className="text-[#FBF3EA]/55">WhatsApp</span>
              <span className="font-mono tabular-nums text-[#FBF3EA]">{order.whatsapp}</span>
            </div>

            <div className="flex items-center justify-between gap-2 py-1.5 border-t border-[#FBF3EA]/5">
              <label htmlFor={`pin-${order.id}`} className="text-[#FBF3EA]/55 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#E2B96F]" />
                <span>Secret PIN</span>
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id={`pin-${order.id}`}
                  type="text"
                  maxLength={6}
                  value={order.pin}
                  onChange={(e) =>
                    onUpdateOrder({
                      ...order,
                      pin: e.target.value.replace(/[^0-9]/g, '').slice(0, 6),
                    })
                  }
                  className="w-24 min-h-[34px] px-2.5 rounded-lg bg-[#130408] border border-[#E2B96F]/25 text-xs font-mono tabular-nums text-center text-[#E2B96F] focus:outline-none focus:border-[#E2B96F]"
                />
                <button
                  type="button"
                  onClick={() => copyValue(order.pin, 'pin')}
                  aria-label="Copy PIN"
                  className="h-[34px] w-[34px] rounded-lg bg-[#130408] border border-[#E2B96F]/20 flex items-center justify-center text-[#E2B96F] hover:border-[#E2B96F] cursor-pointer"
                >
                  {copiedKey === 'pin' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Concierge Edition Selector & Brief */}
        {order.product === 'custom' && (
          <div className="space-y-2.5 pt-3 border-t border-[#FBF3EA]/10">
            <label className="block text-xs text-[#FBF3EA]/80 font-medium">
              Concierge Target Edition
              <select
                value={buildType}
                onChange={(e) =>
                  onUpdateOrder({
                    ...order,
                    build_product: e.target.value as 'chasing-her' | 'memories',
                  })
                }
                className="mt-1.5 w-full min-h-[40px] px-3 rounded-xl bg-[#130408] border border-[#E2B96F]/25 text-xs text-[#FBF3EA]"
              >
                <option value="memories">Build as Memories (34-Heart)</option>
                <option value="chasing-her">Build as Chasing Her (Storybook)</option>
              </select>
            </label>
          </div>
        )}

        {order.brief && (
          <div className="rounded-xl bg-[#130408] border border-[#E2B96F]/15 p-3.5 space-y-2 text-xs">
            <p className="font-medium text-[#E2B96F]">Concierge Brief</p>
            <div className="space-y-1 text-[#FBF3EA]/80">
              <p>
                <span className="text-[#FBF3EA]/50">For:</span> {order.brief.for || '—'}
              </p>
              <p>
                <span className="text-[#FBF3EA]/50">Mood:</span> {order.brief.feel || '—'}
              </p>
              <p className="break-words">
                <span className="text-[#FBF3EA]/50">Notes:</span>{' '}
                {order.brief.notes || order.brief.links || '—'}
              </p>
            </div>
          </div>
        )}

        {/* Hosted Live URL & Customer Status Note */}
        <div className="space-y-3 pt-3 border-t border-[#FBF3EA]/10">
          <label className="block text-xs text-[#FBF3EA]/75">
            <span className="font-medium flex items-center justify-between">
              <span>Live Hosted URL</span>
              {order.hosted_url && (
                <a
                  href={order.hosted_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#E2B96F] hover:underline inline-flex items-center gap-1"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </span>
            <input
              type="text"
              value={order.hosted_url || ''}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateOrder({
                  ...order,
                  hosted_url: val,
                  progress: val.trim() ? 'hosted' : order.progress,
                  status: val.trim() ? 'hosted' : order.status,
                });
              }}
              placeholder="Paste final URL to auto-mark Live..."
              className="mt-1.5 w-full min-h-[40px] px-3 rounded-xl bg-[#130408] border border-[#E2B96F]/25 text-xs font-mono text-[#FBF3EA] placeholder:text-[#FBF3EA]/35 focus:outline-none focus:border-[#E2B96F]"
            />
          </label>

          <label className="block text-xs text-[#FBF3EA]/75">
            <span className="font-medium">Status Note (Shown on Customer My Site)</span>
            <textarea
              rows={2}
              value={order.progress_note || ''}
              onChange={(e) =>
                onUpdateOrder({
                  ...order,
                  progress_note: e.target.value,
                })
              }
              placeholder="Write a helpful status update for the customer..."
              className="mt-1.5 w-full rounded-xl bg-[#130408] border border-[#E2B96F]/25 p-3 text-xs text-[#FBF3EA] placeholder:text-[#FBF3EA]/35 focus:outline-none focus:border-[#E2B96F]"
            />
          </label>
        </div>

        {/* One-Click WhatsApp Templates */}
        <div className="space-y-2 pt-3 border-t border-[#FBF3EA]/10">
          <p className="text-xs font-medium text-[#FBF3EA]/80">Quick WhatsApp Messages</p>
          <div className="grid grid-cols-1 gap-1.5">
            <a
              href={buildWaLink('confirmed')}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[38px] px-3 rounded-xl bg-emerald-950/45 border border-emerald-500/25 hover:border-emerald-400/50 text-emerald-200 text-xs font-medium flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Send Payment Verified Message</span>
              </span>
              <Send className="w-3.5 h-3.5 opacity-70" />
            </a>

            <a
              href={buildWaLink('review')}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[38px] px-3 rounded-xl bg-[#130408] border border-[#E2B96F]/20 hover:border-[#E2B96F]/50 text-[#FBF3EA]/85 text-xs font-medium flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5 text-[#E2B96F] shrink-0" />
                <span>Send Draft Ready for Review</span>
              </span>
              <Send className="w-3.5 h-3.5 opacity-60" />
            </a>

            <a
              href={buildWaLink('live')}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[38px] px-3 rounded-xl bg-[#130408] border border-[#E2B96F]/20 hover:border-[#E2B96F]/50 text-[#FBF3EA]/85 text-xs font-medium flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[#E2B96F] shrink-0" />
                <span>Deliver Live Link &amp; Secret PIN</span>
              </span>
              <Send className="w-3.5 h-3.5 opacity-60" />
            </a>
          </div>
        </div>

        {/* Delete Order Zone */}
        {onDeleteOrder && (
          <div className="pt-3 border-t border-[#FBF3EA]/10">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full min-h-[38px] px-3 rounded-xl border border-rose-500/25 text-rose-300/80 hover:text-rose-200 hover:bg-rose-950/40 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Order</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onDeleteOrder(order.id)}
                  className="flex-1 min-h-[38px] px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="min-h-[38px] px-3 rounded-xl border border-[#FBF3EA]/20 text-xs text-[#FBF3EA]/75 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

interface AdminCreateOrderModalProps {
  onCreate: (order: SubmissionOrder) => void;
  onClose: () => void;
}

export const AdminCreateOrderModal: React.FC<AdminCreateOrderModalProps> = ({
  onCreate,
  onClose,
}) => {
  const [fullName, setFullName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [country, setCountry] = useState<CountryCode>('gh');
  const [product, setProduct] = useState<ProductType>('chasing-her');
  const [status, setStatus] = useState<'paid' | 'pending_payment'>('paid');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Please enter both customer name and email.');
      return;
    }

    const baseSlug = toUrlSlug(
      partnerName.trim()
        ? `${partnerName.trim()}-and-${fullName.trim().split(' ')[0]}`
        : fullName.trim()
    );
    const uniqueSlug = `${baseSlug || 'love-story'}-${Date.now().toString().slice(-3)}`;
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const buildProduct: 'chasing-her' | 'memories' =
      product === 'memories' ? 'memories' : 'chasing-her';

    const newOrder: SubmissionOrder = {
      id: `ord-${country}-${Date.now().toString().slice(-5)}`,
      slug: uniqueSlug,
      product,
      build_product: buildProduct,
      full_name: fullName.trim(),
      whatsapp: whatsapp.trim() || `${COUNTRIES[country].dialCode}000000000`,
      email: email.trim().toLowerCase(),
      country,
      status,
      progress: status === 'paid' ? 'building' : 'received',
      progress_note:
        status === 'paid'
          ? 'Payment confirmed by Admin Studio. Your website workspace is ready.'
          : 'Order logged. Waiting for payment confirmation.',
      pin,
      brief: partnerName.trim()
        ? {
            for: partnerName.trim(),
            design: buildProduct,
          }
        : undefined,
      created_at: new Date().toISOString(),
    };

    onCreate(newOrder);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Create Manual Order"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#1A060C] border border-[#E2B96F]/25 overflow-hidden shadow-2xl">
        <div className="px-6 py-4 bg-[#210810] border-b border-[#E2B96F]/15 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl text-[#FBF3EA]">Log Manual Order</h2>
            <p className="text-xs text-[#FBF3EA]/60 mt-0.5">
              Create an order from WhatsApp or direct transfer and sync to Firestore.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new order dialog"
            className="h-9 w-9 rounded-lg border border-[#FBF3EA]/15 text-[#FBF3EA]/70 hover:text-[#FBF3EA] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-950/60 border border-rose-500/35 px-3.5 py-2.5 text-xs text-rose-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <label className="block text-xs text-[#FBF3EA]/75">
              Customer Full Name *
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Samuel Osei"
                className="mt-1.5 w-full min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/25 text-sm text-[#FBF3EA] focus:outline-none focus:border-[#E2B96F]"
              />
            </label>

            <label className="block text-xs text-[#FBF3EA]/75">
              Partner / Recipient Name
              <input
                type="text"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="e.g. Efua"
                className="mt-1.5 w-full min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/25 text-sm text-[#FBF3EA] focus:outline-none focus:border-[#E2B96F]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <label className="block text-xs text-[#FBF3EA]/75">
              Customer Email *
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="samuel@example.com"
                className="mt-1.5 w-full min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/25 text-sm text-[#FBF3EA] focus:outline-none focus:border-[#E2B96F]"
              />
            </label>

            <label className="block text-xs text-[#FBF3EA]/75">
              WhatsApp Phone
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+233241234567"
                className="mt-1.5 w-full min-h-[42px] px-3.5 rounded-xl bg-[#120408] border border-[#E2B96F]/25 text-sm font-mono text-[#FBF3EA] focus:outline-none focus:border-[#E2B96F]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block text-xs text-[#FBF3EA]/75">
              Country
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value as CountryCode)}
                className="mt-1.5 w-full min-h-[42px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/25 text-xs text-[#FBF3EA]"
              >
                <option value="gh">Ghana (GH₵)</option>
                <option value="ke">Kenya (KSh)</option>
              </select>
            </label>

            <label className="block text-xs text-[#FBF3EA]/75">
              Paid Edition
              <select
                value={product}
                onChange={(e) => setProduct(e.target.value as ProductType)}
                className="mt-1.5 w-full min-h-[42px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/25 text-xs text-[#FBF3EA]"
              >
                <option value="chasing-her">Chasing Her</option>
                <option value="memories">Memories 34-Heart</option>
                <option value="custom">Concierge Build</option>
              </select>
            </label>

            <label className="block text-xs text-[#FBF3EA]/75">
              Payment Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'paid' | 'pending_payment')}
                className="mt-1.5 w-full min-h-[42px] px-3 rounded-xl bg-[#120408] border border-[#E2B96F]/25 text-xs text-[#FBF3EA]"
              >
                <option value="paid">Payment Verified</option>
                <option value="pending_payment">Awaiting Payment</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#FBF3EA]/10">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 rounded-xl border border-[#FBF3EA]/15 text-xs font-medium text-[#FBF3EA]/75 hover:text-[#FBF3EA] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[42px] px-5 rounded-xl bg-[#E2B96F] hover:bg-[#ecd08b] text-[#16050A] font-semibold text-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
