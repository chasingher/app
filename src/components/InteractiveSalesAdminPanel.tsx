import React, { useState } from 'react';
import { Check, Plus, Save, Trash2 } from 'lucide-react';
import {
  InteractiveSalesConfig,
  VerifiedTestimonial,
  calculateOfferPricing,
  isCheckoutConfigured,
} from '../utils/interactiveSalesConfig';

interface InteractiveSalesAdminPanelProps {
  config: InteractiveSalesConfig;
  onSaveConfig: (next: InteractiveSalesConfig) => void;
}

export const InteractiveSalesAdminPanel: React.FC<InteractiveSalesAdminPanelProps> = ({
  config,
  onSaveConfig,
}) => {
  const [draft, setDraft] = useState<InteractiveSalesConfig>(config);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Add verified testimonial inputs
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newCreatedWhat, setNewCreatedWhat] = useState('Chasing Her — Scrollable Love Story');
  const [newFeedback, setNewFeedback] = useState('');
  const [newSampleUrl, setNewSampleUrl] = useState('');
  const [newPermission, setNewPermission] = useState(false);
  const [testimonialError, setTestimonialError] = useState<string | null>(null);

  const pricing = calculateOfferPricing(draft.pricing);
  const checkoutActive = isCheckoutConfigured(draft.checkout);

  const handleSave = () => {
    onSaveConfig(draft);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleAddTestimonial = () => {
    setTestimonialError(null);
    if (!newName.trim() || !newFeedback.trim()) {
      setTestimonialError('Enter customer name/initials and their genuine feedback.');
      return;
    }
    if (!newPermission) {
      setTestimonialError('Confirm customer permission before publishing a verified testimonial.');
      return;
    }

    const entry: VerifiedTestimonial = {
      id: `vt-${Date.now()}`,
      customerName: newName.trim(),
      location: newLocation.trim() || undefined,
      createdWhat: newCreatedWhat.trim() || 'Digital Love Experience',
      feedback: newFeedback.trim(),
      sampleUrl: newSampleUrl.trim() || undefined,
      verifiedPermission: true,
    };

    const nextDraft: InteractiveSalesConfig = {
      ...draft,
      verifiedTestimonials: [...draft.verifiedTestimonials, entry],
    };
    setDraft(nextDraft);
    onSaveConfig(nextDraft);
    setNewName('');
    setNewLocation('');
    setNewFeedback('');
    setNewSampleUrl('');
    setNewPermission(false);
  };

  const handleRemoveTestimonial = (id: string) => {
    const nextDraft: InteractiveSalesConfig = {
      ...draft,
      verifiedTestimonials: draft.verifiedTestimonials.filter((t) => t.id !== id),
    };
    setDraft(nextDraft);
    onSaveConfig(nextDraft);
  };

  return (
    <div
      className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 overflow-hidden"
      data-testid="admin-interactive-sales-settings"
    >
      <div className="px-5 py-4 border-b border-[#E2B96F]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-[#FBF3EA]">
            Interactive Win Her Back Experience Settings
          </h2>
          <p className="text-xs text-[#FBF3EA]/65 mt-0.5">
            Configure currency, offer discount, live payment checkout URL, and verified customer testimonials in one place.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="min-h-[38px] px-4 rounded-xl bg-[#E2B96F] hover:bg-[#edd18f] text-[#16050A] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          {savedFeedback ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Settings Saved</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Interactive Settings</span>
            </>
          )}
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Pricing & Currency */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#FBF3EA]">
              Offer Pricing &amp; Currency
            </h3>
            <span className="text-xs font-mono tabular-nums text-[#E2B96F]">
              Live preview: {pricing.formattedFinal}
              {pricing.showDiscount
                ? ` (from ${pricing.formattedRegular} · ${pricing.discountPercent}% off)`
                : ' (no discount shown)'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="space-y-1 text-xs text-[#FBF3EA]/70">
              <span>Configured Currency</span>
              <input
                type="text"
                value={draft.pricing.currency}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    pricing: { ...prev.pricing, currency: e.target.value },
                  }))
                }
                placeholder="KES, GHS, NGN, USD"
                className="w-full min-h-[38px] px-3 rounded-lg bg-[#120408] border border-[#E2B96F]/25 text-sm text-[#FBF3EA] focus:outline-none focus:border-[#E2B96F]"
              />
            </label>

            <label className="space-y-1 text-xs text-[#FBF3EA]/70">
              <span>Regular Price</span>
              <input
                type="number"
                min={1}
                value={draft.pricing.regularPrice}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    pricing: {
                      ...prev.pricing,
                      regularPrice: Number(e.target.value) || 0,
                    },
                  }))
                }
                className="w-full min-h-[38px] px-3 rounded-lg bg-[#120408] border border-[#E2B96F]/25 text-sm font-mono tabular-nums text-[#FBF3EA] focus:outline-none focus:border-[#E2B96F]"
              />
            </label>

            <label className="space-y-1 text-xs text-[#FBF3EA]/70">
              <span>Discount (%)</span>
              <input
                type="number"
                min={0}
                max={99}
                value={draft.pricing.discountPercent}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    pricing: {
                      ...prev.pricing,
                      discountPercent: Number(e.target.value) || 0,
                    },
                  }))
                }
                className="w-full min-h-[38px] px-3 rounded-lg bg-[#120408] border border-[#E2B96F]/25 text-sm font-mono tabular-nums text-[#FBF3EA] focus:outline-none focus:border-[#E2B96F]"
              />
            </label>

            <label className="flex items-center gap-2.5 pt-5 text-xs text-[#FBF3EA]/85 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.pricing.offerActive}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    pricing: { ...prev.pricing, offerActive: e.target.checked },
                  }))
                }
                className="w-4 h-4 accent-[#E2B96F]"
              />
              <span>Discount offer active</span>
            </label>
          </div>
        </div>

        {/* Live Checkout Configuration */}
        <div className="pt-5 border-t border-[#E2B96F]/12 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#FBF3EA]">
              Payment Provider &amp; Checkout URL
            </h3>
            <span className="text-xs text-[#FBF3EA]/70">
              Status:{' '}
              <strong
                className={
                  checkoutActive ? 'text-emerald-300' : 'text-amber-300'
                }
              >
                {checkoutActive
                  ? `Active (${draft.checkout.paymentProvider})`
                  : 'Not configured (live button disabled)'}
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="space-y-1 text-xs text-[#FBF3EA]/70">
              <span>Payment Provider Name</span>
              <input
                type="text"
                value={draft.checkout.paymentProvider}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    checkout: {
                      ...prev.checkout,
                      paymentProvider: e.target.value,
                    },
                  }))
                }
                placeholder="e.g. Paystack, Stripe, Flutterwave"
                className="w-full min-h-[38px] px-3 rounded-lg bg-[#120408] border border-[#E2B96F]/25 text-sm text-[#FBF3EA] focus:outline-none focus:border-[#E2B96F]"
              />
            </label>

            <label className="space-y-1 text-xs text-[#FBF3EA]/70">
              <span>Checkout URL (https://...)</span>
              <input
                type="url"
                value={draft.checkout.checkoutUrl}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    checkout: { ...prev.checkout, checkoutUrl: e.target.value },
                  }))
                }
                placeholder="https://..."
                className="w-full min-h-[38px] px-3 rounded-lg bg-[#120408] border border-[#E2B96F]/25 text-sm text-[#FBF3EA] focus:outline-none focus:border-[#E2B96F]"
              />
            </label>

            <label className="space-y-1 text-xs text-[#FBF3EA]/70">
              <span>Post-Payment Destination</span>
              <input
                type="text"
                value={draft.checkout.postPaymentRedirectUrl}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    checkout: {
                      ...prev.checkout,
                      postPaymentRedirectUrl: e.target.value,
                    },
                  }))
                }
                placeholder="/my-site/"
                className="w-full min-h-[38px] px-3 rounded-lg bg-[#120408] border border-[#E2B96F]/25 text-sm font-mono text-[#FBF3EA] focus:outline-none focus:border-[#E2B96F]"
              />
            </label>
          </div>
        </div>

        {/* Verified Testimonials Manager */}
        <div className="pt-5 border-t border-[#E2B96F]/12 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-[#FBF3EA]">
              Verified Customer Testimonials ({draft.verifiedTestimonials.length})
            </h3>
            <p className="text-xs text-[#FBF3EA]/60 mt-0.5">
              Hidden from public visitors until you add verified feedback with customer permission.
            </p>
          </div>

          {draft.verifiedTestimonials.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E2B96F]/25 bg-[#120408] p-4 text-xs text-[#FBF3EA]/70">
              Testimonial placeholder — replace with verified customer feedback.
            </div>
          ) : (
            <div className="space-y-2">
              {draft.verifiedTestimonials.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-[#120408] border border-[#E2B96F]/15 p-3.5 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs text-[#FBF3EA] leading-relaxed">
                      “{item.feedback}”
                    </p>
                    <p className="text-[11px] text-[#FBF3EA]/55">
                      {item.customerName}
                      {item.location ? ` · ${item.location}` : ''} · {item.createdWhat}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTestimonial(item.id)}
                    aria-label={`Remove testimonial from ${item.customerName}`}
                    className="p-2 rounded-lg text-[#FBF3EA]/55 hover:text-red-300 hover:bg-red-950/40 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl bg-[#120408] border border-[#E2B96F]/15 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Approved name or initials"
                className="min-h-[36px] px-3 rounded-lg bg-[#1A060C] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
              />
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Approved location (optional)"
                className="min-h-[36px] px-3 rounded-lg bg-[#1A060C] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
              />
              <input
                type="text"
                value={newCreatedWhat}
                onChange={(e) => setNewCreatedWhat(e.target.value)}
                placeholder="What they created"
                className="min-h-[36px] px-3 rounded-lg bg-[#1A060C] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
              />
            </div>

            <textarea
              rows={2}
              value={newFeedback}
              onChange={(e) => setNewFeedback(e.target.value)}
              placeholder="Genuine customer feedback (verbatim, with permission)"
              className="w-full px-3 py-2 rounded-lg bg-[#1A060C] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-[#FBF3EA]/75 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPermission}
                  onChange={(e) => setNewPermission(e.target.checked)}
                  className="w-4 h-4 accent-[#E2B96F]"
                />
                <span>Verified authentic testimonial with customer permission</span>
              </label>

              <button
                type="button"
                onClick={handleAddTestimonial}
                className="min-h-[36px] px-3.5 rounded-lg border border-[#E2B96F]/35 bg-[#1A060C] hover:border-[#E2B96F] text-xs font-medium text-[#E2B96F] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Verified Testimonial</span>
              </button>
            </div>

            {testimonialError && (
              <p className="text-xs text-red-300">{testimonialError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
