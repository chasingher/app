import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Lock,
  Smartphone,
} from 'lucide-react';
import {
  CountryCode,
  CountryConfig,
  ProductType,
  validateCustomerEmail,
} from '../utils/platformLogic';
import type { SubmissionOrder } from '../utils/supabaseAndOci';
import {
  CHECKOUT_DIAL_COUNTRIES,
  CHECKOUT_STEPS,
  CheckoutFieldErrors,
  CheckoutStepId,
  DialCountryOption,
  buildCheckoutDraftOrder,
  canNavigateToStep,
  getProductSummaryLabel,
  getStepIndex,
  getStepProgressPercent,
  validateCheckoutDetails,
} from '../utils/checkoutFlow';

interface EasyCheckoutFlowProps {
  idPrefix: 'inline' | 'drawer';
  country: CountryCode;
  countryConfig: CountryConfig;
  pricePage: string;
  priceCustom: string;
  selectedProduct: ProductType;
  onSelectProduct: (product: ProductType) => void;
  step: CheckoutStepId;
  onStepChange: (step: CheckoutStepId) => void;
  customerName: string;
  onCustomerNameChange: (val: string) => void;
  customerEmail: string;
  onCustomerEmailChange: (val: string) => void;
  customerPhone: string;
  onCustomerPhoneChange: (val: string) => void;
  selectedDialOption: DialCountryOption;
  onSelectDialOption: (opt: DialCountryOption) => void;
  partnerName?: string;
  customPin?: string;
  openingLine?: string;
  pendingOrder: SubmissionOrder | null;
  onDraftOrderReady: (draft: SubmissionOrder) => void;
  selectedPaymentMethod: string;
  onSelectPaymentMethod: (method: string) => void;
  submitting: boolean;
  onCompletePayment: () => void;
  focusNameSignal?: number;
}

export const EasyCheckoutFlow: React.FC<EasyCheckoutFlowProps> = ({
  idPrefix,
  country,
  countryConfig,
  pricePage,
  priceCustom,
  selectedProduct,
  onSelectProduct,
  step,
  onStepChange,
  customerName,
  onCustomerNameChange,
  customerEmail,
  onCustomerEmailChange,
  customerPhone,
  onCustomerPhoneChange,
  selectedDialOption,
  onSelectDialOption,
  partnerName,
  customPin,
  openingLine,
  pendingOrder,
  onDraftOrderReady,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  submitting,
  onCompletePayment,
  focusNameSignal,
}) => {
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [emailSuggestion, setEmailSuggestion] = useState<string | undefined>(undefined);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'details' && focusNameSignal && focusNameSignal > 0) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus({ preventScroll: true });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step, focusNameSignal]);

  const activePrice = selectedProduct === 'custom' ? priceCustom : pricePage;

  const planOptions: {
    id: ProductType;
    title: string;
    subtitle: string;
    price: string;
  }[] = [
    {
      id: 'chasing-her',
      title: 'Chasing Her',
      subtitle: 'Love story, flower reveal, Polaroid wall & sealed letter',
      price: pricePage,
    },
    {
      id: 'memories',
      title: 'Memories',
      subtitle: '34-photo heart mosaic, slideshow & personal voice note',
      price: pricePage,
    },
    {
      id: 'custom',
      title: 'Build It For Me',
      subtitle: 'Send your photos & notes — our team crafts it in 24 hours',
      price: priceCustom,
    },
  ];

  const paymentMethods =
    country === 'gh'
      ? [
          {
            id: 'mobile_money',
            title: 'Mobile Money',
            subtitle: 'MTN MoMo · Telecel Cash · AirtelTigo',
            icon: 'mobile' as const,
          },
          {
            id: 'card',
            title: 'Debit or Credit Card',
            subtitle: 'Visa · Mastercard',
            icon: 'card' as const,
          },
        ]
      : country === 'ke'
      ? [
          {
            id: 'mobile_money',
            title: 'Mobile Money',
            subtitle: 'M-PESA Express · Airtel Money',
            icon: 'mobile' as const,
          },
          {
            id: 'card',
            title: 'Debit or Credit Card',
            subtitle: 'Visa · Mastercard',
            icon: 'card' as const,
          },
        ]
      : [
          {
            id: 'mobile_money',
            title: 'Instant Transfer or USSD',
            subtitle: 'Paystack Bank Transfer · USSD',
            icon: 'mobile' as const,
          },
          {
            id: 'card',
            title: 'Debit or Credit Card',
            subtitle: 'Visa · Mastercard · Verve',
            icon: 'card' as const,
          },
        ];

  const currentDetailsValidation = validateCheckoutDetails({
    name: customerName,
    email: customerEmail,
    phone: customerPhone,
    country,
    dialOption: selectedDialOption,
  });

  const handleEmailInput = (val: string) => {
    onCustomerEmailChange(val);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
    if (val.includes('@') && val.includes('.')) {
      const check = validateCustomerEmail(val);
      setEmailSuggestion(check.suggestion);
    } else {
      setEmailSuggestion(undefined);
    }
  };

  const applyEmailSuggestion = () => {
    if (!emailSuggestion) return;
    onCustomerEmailChange(emailSuggestion);
    setEmailSuggestion(undefined);
    setFieldErrors((prev) => ({ ...prev, email: undefined }));
  };

  const proceedToPaymentStep = () => {
    const validation = validateCheckoutDetails({
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      country,
      dialOption: selectedDialOption,
    });

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    const draft = buildCheckoutDraftOrder({
      product: selectedProduct,
      fullName: customerName,
      email: validation.normalizedEmail,
      whatsapp: validation.normalizedPhone,
      country,
      partnerName,
      pin: customPin,
      openingLine,
      baseUrl: import.meta.env.BASE_URL,
    });
    onDraftOrderReady(draft);
    onStepChange('payment');
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    proceedToPaymentStep();
  };

  const handleStepNavClick = (target: 'plan' | 'details' | 'payment') => {
    if (step === 'redirecting' || target === step) return;
    if (target === 'payment') {
      if (step === 'details' || currentDetailsValidation.valid) {
        proceedToPaymentStep();
      } else {
        onStepChange('details');
      }
      return;
    }
    setFieldErrors({});
    onStepChange(target);
  };

  // Sync draft product if user goes back from payment and switches plan
  const handleSelectPlan = (prod: ProductType) => {
    onSelectProduct(prod);
  };

  if (step === 'redirecting') {
    const firstName = customerName.trim().split(' ')[0] || 'there';
    return (
      <div className="py-10 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-600/30 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <p className="text-xs font-medium text-emerald-800 tracking-wide">
          Payment confirmed
        </p>
        <h3 className="font-serif text-2xl sm:text-3xl text-[#2B1710]">
          Opening your My Site portal...
        </h3>
        <p className="text-sm text-[#6B4E3D] max-w-sm mx-auto leading-relaxed">
          Welcome, {firstName}. Everything is unlocked — you can now customize your love letter, photos, and secret PIN at your own pace.
        </p>
      </div>
    );
  }

  const currentIdx = getStepIndex(step);
  const progressPct = getStepProgressPercent(step);

  return (
    <div className="space-y-6">
      {/* Clean 3-Step Interactive Progress Navigation */}
      <nav aria-label="Checkout steps" className="space-y-3">
        <ol className="grid grid-cols-3 gap-2">
          {CHECKOUT_STEPS.map((item, idx) => {
            const isCurrent = item.id === step;
            const isCompleted =
              idx < currentIdx ||
              (item.id === 'details' && currentDetailsValidation.valid && step === 'payment');
            const isClickable =
              item.id !== step &&
              (canNavigateToStep(item.id, step, currentDetailsValidation.valid) ||
                (item.id === 'payment' && step === 'details'));

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleStepNavClick(item.id)}
                  disabled={!isClickable && !isCurrent}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Step ${item.number}: ${item.label}`}
                  className={`w-full min-h-[42px] px-2.5 py-2 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold transition whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C] ${
                    isCurrent
                      ? 'bg-[#5A1A2C] text-[#FBF3EA] shadow-xs'
                      : isCompleted
                      ? 'bg-[#F5DAD5]/65 text-[#5A1A2C] hover:bg-[#F5DAD5] cursor-pointer'
                      : isClickable
                      ? 'bg-[#F5EDE4] text-[#6B4E3D] hover:bg-[#EFE2D3] hover:text-[#2B1710] cursor-pointer'
                      : 'bg-[#F5EDE4]/60 text-[#9A7E6E] cursor-not-allowed'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      isCurrent
                        ? 'bg-[#DCC397] text-[#2B1710]'
                        : isCompleted
                        ? 'bg-[#5A1A2C] text-[#FBF3EA]'
                        : 'bg-[#2B1710]/10 text-[#6B4E3D]'
                    }`}
                    aria-hidden="true"
                  >
                    {isCompleted && !isCurrent ? (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      item.number
                    )}
                  </span>
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ol>

        <div
          className="h-1 w-full rounded-full bg-[#2B1710]/10 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="h-full bg-[#5A1A2C] rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </nav>

      {/* =================================================================
          STEP 1 · PICK YOUR PLAN
         ================================================================= */}
      {step === 'plan' && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h4 className="font-serif text-xl sm:text-2xl text-[#2B1710]">
              Choose your experience
            </h4>
            <p className="text-sm text-[#6B4E3D]">
              You&apos;ll customize the recipient name, photos, and secret PIN right after checkout.
            </p>
          </div>

          <div
            className="space-y-3"
            role="radiogroup"
            aria-label="Choose your experience"
          >
            {planOptions.map((option) => {
              const isSelected = selectedProduct === option.id;
              return (
                <label
                  key={option.id}
                  className={`flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'border-[#5A1A2C] bg-[#F5DAD5]/35 shadow-[0_0_0_1px_#5A1A2C]'
                      : 'border-[#2B1710]/12 bg-[#FBF3EA]/70 hover:border-[#5A1A2C]/40 hover:bg-[#FBF3EA]'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <input
                      type="radio"
                      name={`checkout-plan-${idPrefix}`}
                      value={option.id}
                      checked={isSelected}
                      onChange={() => handleSelectPlan(option.id)}
                      className="mt-1 accent-[#5A1A2C] w-4 h-4 shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-semibold text-[#2B1710]">
                        {option.title}
                      </div>
                      <div className="text-xs sm:text-sm text-[#6B4E3D] mt-0.5 leading-snug">
                        {option.subtitle}
                      </div>
                    </div>
                  </div>
                  <span className="font-serif font-bold text-base sm:text-lg text-[#5A1A2C] tabular-nums shrink-0">
                    {option.price}
                  </span>
                </label>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onStepChange('details')}
            className="w-full min-h-[52px] py-3.5 px-6 rounded-full bg-[#5A1A2C] hover:bg-[#431120] text-[#FBF3EA] font-semibold text-sm sm:text-base shadow-[0_12px_28px_-10px_rgba(90,26,44,0.45)] transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
          >
            <span>Continue with {planOptions.find((p) => p.id === selectedProduct)?.title}</span>
            <ArrowRight className="w-4 h-4 text-[#DCC397]" />
          </button>
        </div>
      )}

      {/* =================================================================
          STEP 2 · ONLY THE 3 ESSENTIAL DETAILS
         ================================================================= */}
      {step === 'details' && (
        <form onSubmit={handleDetailsSubmit} className="space-y-6" noValidate>
          {/* Quiet selected plan summary strip with 1-tap Change */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#2B1710]/10">
            <div className="text-sm text-[#2B1710] min-w-0">
              <span className="font-semibold">
                {planOptions.find((p) => p.id === selectedProduct)?.title}
              </span>
              <span className="mx-2 text-[#B98A4E]" aria-hidden="true">
                ·
              </span>
              <span className="font-serif font-bold text-[#5A1A2C] tabular-nums">
                {activePrice}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onStepChange('plan')}
              className="text-xs font-semibold text-[#5A1A2C] hover:underline cursor-pointer whitespace-nowrap shrink-0"
            >
              Change plan
            </button>
          </div>

          <div className="space-y-1">
            <h4 className="font-serif text-xl sm:text-2xl text-[#2B1710]">
              Your contact details
            </h4>
            <p className="text-sm text-[#6B4E3D]">
              Just 3 essentials so we can unlock your private studio and send your link.
            </p>
          </div>

          <div className="space-y-5">
            {/* Field 1: Name */}
            <div className="space-y-1.5">
              <label
                htmlFor={`${idPrefix}-checkout-name`}
                className="block text-sm font-semibold text-[#2B1710]"
              >
                Your Name
              </label>
              <input
                id={`${idPrefix}-checkout-name`}
                ref={nameInputRef}
                type="text"
                autoComplete="name"
                value={customerName}
                onChange={(e) => {
                  onCustomerNameChange(e.target.value);
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                placeholder="e.g. Kwame Mensah"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? `${idPrefix}-name-error` : undefined}
                className={`w-full min-h-[48px] px-4 py-3 rounded-xl bg-white border text-base sm:text-sm text-[#2B1710] placeholder:text-[#9A7E6E] focus:outline-none focus:ring-2 focus:ring-[#5A1A2C]/20 transition ${
                  fieldErrors.name
                    ? 'border-red-500 focus:border-red-600'
                    : 'border-[#2B1710]/18 focus:border-[#5A1A2C]'
                }`}
              />
              {fieldErrors.name && (
                <p
                  id={`${idPrefix}-name-error`}
                  role="alert"
                  className="text-xs font-medium text-red-700"
                >
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Field 2: Email */}
            <div className="space-y-1.5">
              <label
                htmlFor={`${idPrefix}-checkout-email`}
                className="block text-sm font-semibold text-[#2B1710]"
              >
                Your Email
              </label>
              <input
                id={`${idPrefix}-checkout-email`}
                type="email"
                autoComplete="email"
                value={customerEmail}
                onChange={(e) => handleEmailInput(e.target.value)}
                placeholder="you@gmail.com"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={
                  fieldErrors.email
                    ? `${idPrefix}-email-error`
                    : `${idPrefix}-email-hint`
                }
                className={`w-full min-h-[48px] px-4 py-3 rounded-xl bg-white border text-base sm:text-sm text-[#2B1710] placeholder:text-[#9A7E6E] focus:outline-none focus:ring-2 focus:ring-[#5A1A2C]/20 transition ${
                  fieldErrors.email
                    ? 'border-red-500 focus:border-red-600'
                    : 'border-[#2B1710]/18 focus:border-[#5A1A2C]'
                }`}
              />
              {fieldErrors.email ? (
                <p
                  id={`${idPrefix}-email-error`}
                  role="alert"
                  className="text-xs font-medium text-red-700"
                >
                  {fieldErrors.email}
                </p>
              ) : (
                <p id={`${idPrefix}-email-hint`} className="text-xs text-[#6B4E3D]">
                  Unlocks your private My Site portal right after payment.
                </p>
              )}
              {emailSuggestion && (
                <p className="text-xs text-[#6B4E3D]">
                  Did you mean{' '}
                  <button
                    type="button"
                    onClick={applyEmailSuggestion}
                    className="text-[#5A1A2C] font-semibold underline cursor-pointer"
                  >
                    {emailSuggestion}
                  </button>
                  ?
                </p>
              )}
            </div>

            {/* Field 3: WhatsApp Number */}
            <div className="space-y-1.5">
              <label
                htmlFor={`${idPrefix}-checkout-phone`}
                className="block text-sm font-semibold text-[#2B1710]"
              >
                WhatsApp Number
              </label>
              <div
                className={`flex items-stretch rounded-xl bg-white border focus-within:ring-2 focus-within:ring-[#5A1A2C]/20 transition overflow-hidden ${
                  fieldErrors.phone
                    ? 'border-red-500 focus-within:border-red-600'
                    : 'border-[#2B1710]/18 focus-within:border-[#5A1A2C]'
                }`}
              >
                <label className="sr-only" htmlFor={`${idPrefix}-checkout-dial`}>
                  Country code
                </label>
                <select
                  id={`${idPrefix}-checkout-dial`}
                  value={selectedDialOption.iso}
                  onChange={(e) => {
                    const matched = CHECKOUT_DIAL_COUNTRIES.find(
                      (c) => c.iso === e.target.value
                    );
                    if (matched) onSelectDialOption(matched);
                  }}
                  className="min-h-[48px] pl-3 pr-2 bg-[#FBF3EA] border-r border-[#2B1710]/12 text-sm font-medium text-[#2B1710] focus:outline-none cursor-pointer shrink-0"
                >
                  {CHECKOUT_DIAL_COUNTRIES.map((opt) => (
                    <option key={opt.iso} value={opt.iso}>
                      {opt.flag} {opt.dial}
                    </option>
                  ))}
                </select>
                <input
                  id={`${idPrefix}-checkout-phone`}
                  type="tel"
                  autoComplete="tel-national"
                  value={customerPhone}
                  onChange={(e) => {
                    onCustomerPhoneChange(e.target.value);
                    if (fieldErrors.phone) {
                      setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  placeholder={countryConfig.phonePlaceholder}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={
                    fieldErrors.phone
                      ? `${idPrefix}-phone-error`
                      : `${idPrefix}-phone-hint`
                  }
                  className="w-full min-h-[48px] px-3.5 py-3 bg-transparent text-base sm:text-sm text-[#2B1710] placeholder:text-[#9A7E6E] focus:outline-none"
                />
              </div>
              {fieldErrors.phone ? (
                <p
                  id={`${idPrefix}-phone-error`}
                  role="alert"
                  className="text-xs font-medium text-red-700"
                >
                  {fieldErrors.phone}
                </p>
              ) : (
                <p id={`${idPrefix}-phone-hint`} className="text-xs text-[#6B4E3D]">
                  Used only to deliver your link or assist if you need help.
                </p>
              )}
            </div>
          </div>

          {/* Easy Back + Next Navigation */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onStepChange('plan')}
              className="min-h-[52px] px-4 sm:px-5 py-3.5 rounded-full border border-[#2B1710]/18 text-[#2B1710] hover:bg-[#F5EDE4] text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[52px] py-3.5 px-5 rounded-full bg-[#5A1A2C] hover:bg-[#431120] text-[#FBF3EA] font-semibold text-sm sm:text-base shadow-[0_12px_28px_-10px_rgba(90,26,44,0.45)] transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
            >
              <span>Continue to Pay</span>
              <span className="text-[#DCC397] tabular-nums">· {activePrice}</span>
              <ArrowRight className="w-4 h-4 text-[#DCC397]" />
            </button>
          </div>
        </form>
      )}

      {/* =================================================================
          STEP 3 · SIMPLE PAYMENT CONFIRMATION
         ================================================================= */}
      {step === 'payment' && pendingOrder && (
        <div className="space-y-6">
          {/* Calm Order Recap */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#FBF3EA] border border-[#2B1710]/12 space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-[#2B1710]">
                {getProductSummaryLabel(pendingOrder.product)}
              </span>
              <span className="font-serif text-xl font-bold text-[#5A1A2C] tabular-nums shrink-0">
                {activePrice}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#2B1710]/10 text-xs text-[#6B4E3D]">
              <span className="truncate">
                {pendingOrder.full_name} · {pendingOrder.email} · {pendingOrder.whatsapp}
              </span>
              <button
                type="button"
                onClick={() => onStepChange('details')}
                className="text-[#5A1A2C] font-semibold hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                Edit
              </button>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3" role="radiogroup" aria-label={`Select ${countryConfig.name} payment method`}>
            <div className="text-sm font-semibold text-[#2B1710]">
              How would you like to pay?
            </div>
            {paymentMethods.map((pm) => {
              const isSelected = selectedPaymentMethod === pm.id;
              return (
                <label
                  key={pm.id}
                  className={`flex items-center justify-between gap-3 p-4 rounded-2xl border transition cursor-pointer ${
                    isSelected
                      ? 'border-[#5A1A2C] bg-[#F5DAD5]/35 shadow-[0_0_0_1px_#5A1A2C]'
                      : 'border-[#2B1710]/12 bg-white hover:border-[#5A1A2C]/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <input
                      type="radio"
                      name={`checkout-pay-${idPrefix}`}
                      checked={isSelected}
                      onChange={() => onSelectPaymentMethod(pm.id)}
                      className="accent-[#5A1A2C] w-4 h-4 shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#2B1710]">
                        {pm.title}
                      </div>
                      <div className="text-xs text-[#6B4E3D] mt-0.5">
                        {pm.subtitle}
                      </div>
                    </div>
                  </div>
                  {pm.icon === 'mobile' ? (
                    <Smartphone className="w-4 h-4 text-[#5A1A2C]/70 shrink-0" aria-hidden="true" />
                  ) : (
                    <CreditCard className="w-4 h-4 text-[#5A1A2C]/70 shrink-0" aria-hidden="true" />
                  )}
                </label>
              );
            })}
          </div>

          {/* Easy Back + Complete Payment Navigation */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              disabled={submitting}
              onClick={() => onStepChange('details')}
              className="min-h-[52px] px-4 sm:px-5 py-3.5 rounded-full border border-[#2B1710]/18 text-[#2B1710] hover:bg-[#F5EDE4] text-sm font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onCompletePayment}
              className="flex-1 min-h-[52px] py-3.5 px-5 rounded-full bg-[#5A1A2C] hover:bg-[#431120] disabled:opacity-60 text-[#FBF3EA] font-semibold text-sm sm:text-base shadow-[0_12px_28px_-10px_rgba(90,26,44,0.45)] transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5A1A2C]"
            >
              <span>
                {submitting ? 'Confirming...' : `Pay ${activePrice} & Unlock`}
              </span>
              {!submitting && <ArrowRight className="w-4 h-4 text-[#DCC397]" />}
            </button>
          </div>
        </div>
      )}

      {/* Single quiet trust line — no stacked boxes or badge clutter */}
      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#6B4E3D] pt-1">
        <Lock className="w-3.5 h-3.5 text-[#B98A4E] shrink-0" aria-hidden="true" />
        <span>Money-back promise · Opens your private My Site portal immediately</span>
      </p>
    </div>
  );
};
