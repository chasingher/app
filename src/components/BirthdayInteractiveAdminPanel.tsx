import React, { useState } from 'react';
import { Check, Download, Plus, Save, Trash2 } from 'lucide-react';
import { VerifiedTestimonial } from '../utils/interactiveSalesConfig';
import {
  BirthdayInteractiveConfig,
  PORTABLE_BIRTHDAY_STORIES,
  calculateBirthdayOfferPricing,
  isBirthdayCheckoutConfigured,
} from '../utils/birthdayInteractiveConfig';

interface BirthdayInteractiveAdminPanelProps {
  config: BirthdayInteractiveConfig;
  onSaveConfig: (next: BirthdayInteractiveConfig) => void;
}

export const BirthdayInteractiveAdminPanel: React.FC<
  BirthdayInteractiveAdminPanelProps
> = ({ config, onSaveConfig }) => {
  const [draft, setDraft] = useState<BirthdayInteractiveConfig>(config);
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Add verified testimonial inputs
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newCreatedWhat, setNewCreatedWhat] = useState(
    'Chasing Her · Scrollable Story'
  );
  const [newFeedback, setNewFeedback] = useState('');
  const [newSampleUrl, setNewSampleUrl] = useState('');
  const [newPermission, setNewPermission] = useState(false);
  const [testimonialError, setTestimonialError] = useState<string | null>(null);

  const ghPricing = calculateBirthdayOfferPricing(draft.markets.gh);
  const kePricing = calculateBirthdayOfferPricing(draft.markets.ke);
  const checkoutActive = isBirthdayCheckoutConfigured(draft.checkout);

  const handleSave = () => {
    onSaveConfig(draft);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleAddTestimonial = () => {
    setTestimonialError(null);
    if (!newName.trim() || !newFeedback.trim()) {
      setTestimonialError(
        'Enter customer name/initials and their genuine birthday feedback.'
      );
      return;
    }
    if (!newPermission) {
      setTestimonialError(
        'Confirm customer permission before publishing a verified testimonial.'
      );
      return;
    }

    const entry: VerifiedTestimonial = {
      id: `bvt-${Date.now()}`,
      customerName: newName.trim(),
      location: newLocation.trim() || undefined,
      createdWhat: newCreatedWhat.trim() || 'Digital Birthday Keepsake',
      feedback: newFeedback.trim(),
      sampleUrl: newSampleUrl.trim() || undefined,
      verifiedPermission: true,
    };

    const nextDraft: BirthdayInteractiveConfig = {
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

  const handleImportBirthdayStories = () => {
    const existingIds = new Set(draft.verifiedTestimonials.map((t) => t.id));
    const additions = PORTABLE_BIRTHDAY_STORIES.filter(
      (s) => !existingIds.has(s.id)
    );
    if (additions.length === 0) return;
    const nextDraft: BirthdayInteractiveConfig = {
      ...draft,
      verifiedTestimonials: [...draft.verifiedTestimonials, ...additions],
    };
    setDraft(nextDraft);
    onSaveConfig(nextDraft);
  };

  const handleRemoveTestimonial = (id: string) => {
    const nextDraft: BirthdayInteractiveConfig = {
      ...draft,
      verifiedTestimonials: draft.verifiedTestimonials.filter(
        (t) => t.id !== id
      ),
    };
    setDraft(nextDraft);
    onSaveConfig(nextDraft);
  };

  return (
    <div
      className="rounded-2xl bg-[#1A060C] border border-[#E2B96F]/20 overflow-hidden"
      data-testid="admin-birthday-interactive-settings"
    >
      <div className="px-5 py-4 border-b border-[#E2B96F]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-[#FBF3EA]">
            Interactive Birthday Keepsake Settings
          </h2>
          <p className="text-xs text-[#FBF3EA]/65 mt-0.5">
            Configure Ghana &amp; Kenya birthday pricing, optional done-for-you concierge availability, live payment checkout, and verified birthday testimonials.
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
              <span>Birthday Settings Saved</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Birthday Settings</span>
            </>
          )}
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Market Pricing: Ghana & Kenya */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(['gh', 'ke'] as const).map((code) => {
            const market = draft.markets[code];
            const calc = code === 'gh' ? ghPricing : kePricing;
            return (
              <div
                key={code}
                className="rounded-xl bg-[#120408] border border-[#E2B96F]/15 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#FBF3EA]">
                    {code === 'gh' ? '🇬🇭 Ghana Pricing' : '🇰🇪 Kenya Pricing'}
                  </h3>
                  <span className="text-xs font-mono tabular-nums text-[#E2B96F]">
                    {calc.formattedSelfBuild}
                    {calc.showPreviousPrice ? ` (was ${calc.formattedPrevious})` : ''}
                    {draft.checkout.conciergeEnabled
                      ? ` · Concierge ${calc.formattedConcierge}`
                      : ''}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <label className="space-y-1 text-[11px] text-[#FBF3EA]/70">
                    <span>Currency</span>
                    <input
                      type="text"
                      value={market.currency}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          markets: {
                            ...prev.markets,
                            [code]: {
                              ...prev.markets[code],
                              currency: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-full min-h-[36px] px-2.5 rounded-lg bg-[#1A060C] border border-[#E2B96F]/25 text-xs text-[#FBF3EA]"
                    />
                  </label>

                  <label className="space-y-1 text-[11px] text-[#FBF3EA]/70">
                    <span>Self-Build</span>
                    <input
                      type="number"
                      min={0}
                      value={market.selfBuildPrice}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          markets: {
                            ...prev.markets,
                            [code]: {
                              ...prev.markets[code],
                              selfBuildPrice: Number(e.target.value) || 0,
                            },
                          },
                        }))
                      }
                      className="w-full min-h-[36px] px-2.5 rounded-lg bg-[#1A060C] border border-[#E2B96F]/25 text-xs font-mono tabular-nums text-[#FBF3EA]"
                    />
                  </label>

                  <label className="space-y-1 text-[11px] text-[#FBF3EA]/70">
                    <span>Previous Price</span>
                    <input
                      type="number"
                      min={0}
                      value={market.previousPrice}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          markets: {
                            ...prev.markets,
                            [code]: {
                              ...prev.markets[code],
                              previousPrice: Number(e.target.value) || 0,
                            },
                          },
                        }))
                      }
                      className="w-full min-h-[36px] px-2.5 rounded-lg bg-[#1A060C] border border-[#E2B96F]/25 text-xs font-mono tabular-nums text-[#FBF3EA]"
                    />
                  </label>

                  <label className="space-y-1 text-[11px] text-[#FBF3EA]/70">
                    <span>Concierge</span>
                    <input
                      type="number"
                      min={0}
                      value={market.conciergePrice}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          markets: {
                            ...prev.markets,
                            [code]: {
                              ...prev.markets[code],
                              conciergePrice: Number(e.target.value) || 0,
                            },
                          },
                        }))
                      }
                      className="w-full min-h-[36px] px-2.5 rounded-lg bg-[#1A060C] border border-[#E2B96F]/25 text-xs font-mono tabular-nums text-[#FBF3EA]"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2 text-xs text-[#FBF3EA]/80 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={market.offerActive}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        markets: {
                          ...prev.markets,
                          [code]: {
                            ...prev.markets[code],
                            offerActive: e.target.checked,
                          },
                        },
                      }))
                    }
                    className="w-4 h-4 accent-[#E2B96F]"
                  />
                  <span>Show previous listed price comparison</span>
                </label>
              </div>
            );
          })}
        </div>

        {/* Concierge & Checkout Configuration */}
        <div className="pt-5 border-t border-[#E2B96F]/12 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#FBF3EA]">
              Payment Checkout &amp; Concierge Availability
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
                placeholder="e.g. Paystack, Flutterwave"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2.5 text-xs text-[#FBF3EA]/85 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.checkout.conciergeEnabled}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    checkout: {
                      ...prev.checkout,
                      conciergeEnabled: e.target.checked,
                    },
                  }))
                }
                className="w-4 h-4 accent-[#E2B96F]"
              />
              <span>
                Enable Done-for-You Concierge option on Birthday Interactive
                page
              </span>
            </label>

            <label className="space-y-1 text-xs text-[#FBF3EA]/70">
              <span>Concierge Delivery Timing (shown only when enabled)</span>
              <input
                type="text"
                value={draft.checkout.conciergeDeliveryTiming}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    checkout: {
                      ...prev.checkout,
                      conciergeDeliveryTiming: e.target.value,
                    },
                  }))
                }
                placeholder="within 24 hours"
                className="w-full min-h-[36px] px-3 rounded-lg bg-[#120408] border border-[#E2B96F]/25 text-xs text-[#FBF3EA]"
              />
            </label>
          </div>
        </div>

        {/* Verified Birthday Testimonials Manager */}
        <div className="pt-5 border-t border-[#E2B96F]/12 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#FBF3EA]">
                Verified Birthday Testimonials (
                {draft.verifiedTestimonials.length})
              </h3>
              <p className="text-xs text-[#FBF3EA]/60 mt-0.5">
                Hidden from public visitors until verified customer feedback is
                added or imported below.
              </p>
            </div>

            <button
              type="button"
              onClick={handleImportBirthdayStories}
              className="min-h-[34px] px-3 rounded-lg border border-[#E2B96F]/30 bg-[#120408] hover:border-[#E2B96F] text-xs font-medium text-[#E2B96F] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Import 3 Stories from Standard Birthday Page</span>
            </button>
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
                      {item.location ? ` · ${item.location}` : ''} ·{' '}
                      {item.createdWhat}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTestimonial(item.id)}
                    aria-label={`Remove birthday testimonial from ${item.customerName}`}
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
                placeholder="Edition created"
                className="min-h-[36px] px-3 rounded-lg bg-[#1A060C] border border-[#E2B96F]/20 text-xs text-[#FBF3EA]"
              />
            </div>

            <textarea
              rows={2}
              value={newFeedback}
              onChange={(e) => setNewFeedback(e.target.value)}
              placeholder="Genuine birthday customer feedback (verbatim, with permission)"
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
                <span>Add Verified Birthday Testimonial</span>
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
