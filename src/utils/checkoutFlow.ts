import {
  CountryCode,
  ProductType,
  validateCustomerEmail,
  validateWhatsAppPhone,
  buildAppRoutePath,
} from './platformLogic';
import type { SubmissionOrder } from './supabaseAndOci';

export type CheckoutStepId = 'plan' | 'details' | 'payment' | 'redirecting';

export interface DialCountryOption {
  iso: string;
  name: string;
  dial: string;
  flag: string;
  linkedCountry?: CountryCode;
}

export const CHECKOUT_DIAL_COUNTRIES: readonly DialCountryOption[] = [
  { iso: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭', linkedCountry: 'gh' },
  { iso: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪', linkedCountry: 'ke' },
  { iso: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', linkedCountry: 'ng' },
  { iso: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { iso: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { iso: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { iso: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬' },
  { iso: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿' },
  { iso: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼' },
  { iso: 'CI', name: "Côte d'Ivoire", dial: '+225', flag: '🇨🇮' },
  { iso: 'CM', name: 'Cameroon', dial: '+237', flag: '🇨🇲' },
  { iso: 'SN', name: 'Senegal', dial: '+221', flag: '🇸🇳' },
  { iso: 'ZM', name: 'Zambia', dial: '+260', flag: '🇿🇲' },
  { iso: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
] as const;

export const CHECKOUT_STEPS: readonly {
  id: Exclude<CheckoutStepId, 'redirecting'>;
  number: 1 | 2 | 3;
  label: string;
}[] = [
  { id: 'plan', number: 1, label: 'Plan' },
  { id: 'details', number: 2, label: 'Details' },
  { id: 'payment', number: 3, label: 'Pay' },
] as const;

export interface CheckoutFieldErrors {
  name?: string;
  email?: string;
  phone?: string;
}

export interface CheckoutDetailsInput {
  name: string;
  email: string;
  phone: string;
  country: CountryCode;
  dialOption: DialCountryOption;
}

export interface CheckoutDetailsValidation {
  valid: boolean;
  errors: CheckoutFieldErrors;
  normalizedEmail: string;
  normalizedPhone: string;
  emailSuggestion?: string;
}

export function getStepIndex(step: CheckoutStepId): number {
  if (step === 'plan') return 0;
  if (step === 'details') return 1;
  if (step === 'payment') return 2;
  return 3;
}

export function getStepProgressPercent(step: CheckoutStepId): number {
  if (step === 'plan') return 33;
  if (step === 'details') return 66;
  return 100;
}

export function canNavigateToStep(
  target: Exclude<CheckoutStepId, 'redirecting'>,
  current: CheckoutStepId,
  hasValidDetails: boolean
): boolean {
  if (current === 'redirecting') return false;
  if (target === current) return false;
  if (target === 'plan') return true;
  if (target === 'details') return true;
  if (target === 'payment') return hasValidDetails;
  return false;
}

export function validateCheckoutDetails(
  input: CheckoutDetailsInput
): CheckoutDetailsValidation {
  const errors: CheckoutFieldErrors = {};

  const trimmedName = (input.name || '').trim();
  if (trimmedName.length < 2) {
    errors.name = 'Enter your name so we can set up your private portal.';
  }

  const emailCheck = validateCustomerEmail(input.email || '');
  if (!emailCheck.valid) {
    errors.email = emailCheck.error || 'Enter a valid email address.';
  }

  const targetCountry = input.dialOption.linkedCountry || input.country;
  const phoneCheck = validateWhatsAppPhone(input.phone || '', targetCountry);
  let normalizedPhone = phoneCheck.e164;

  if (!phoneCheck.valid) {
    const digitsOnly = (input.phone || '').replace(/\D/g, '');
    if (
      !input.dialOption.linkedCountry &&
      digitsOnly.length >= 7 &&
      digitsOnly.length <= 12
    ) {
      normalizedPhone = `${input.dialOption.dial}${digitsOnly.replace(/^0+/, '')}`;
    } else {
      errors.phone = phoneCheck.error || 'Enter a valid WhatsApp number.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedEmail: emailCheck.normalized,
    normalizedPhone,
    emailSuggestion: emailCheck.suggestion,
  };
}

export interface BuildDraftOrderParams {
  product: ProductType;
  fullName: string;
  email: string;
  whatsapp: string;
  country: CountryCode;
  partnerName?: string;
  pin?: string;
  openingLine?: string;
  baseUrl?: string;
  nowMs?: number;
  randomSuffix?: number;
}

export function buildCheckoutDraftOrder(params: BuildDraftOrderParams): SubmissionOrder {
  const {
    product,
    fullName,
    email,
    whatsapp,
    country,
    partnerName,
    pin,
    openingLine,
    baseUrl = '/',
    nowMs = Date.now(),
    randomSuffix = Math.floor(100 + Math.random() * 900),
  } = params;

  const cleanFullName = fullName.trim();
  const cleanPartner = (partnerName || '').trim();
  const baseSlug = (cleanPartner || cleanFullName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const slug = `for-${baseSlug || 'my-love'}-${randomSuffix}`;
  const cleanPin = pin && /^\d{4,6}$/.test(pin.trim()) ? pin.trim() : '140826';
  const buildProduct = product === 'memories' ? 'memories' : 'chasing-her';

  return {
    id: `ord-${country}-${nowMs}`,
    slug,
    product,
    build_product: buildProduct,
    full_name: cleanFullName,
    whatsapp,
    email,
    country,
    status: 'pending_payment',
    progress: 'received',
    progress_note:
      product === 'custom'
        ? 'Payment confirmed! Our studio has received your order and will guide you inside My Site.'
        : 'Payment confirmed! Welcome to your My Site portal — tap "Open Builder" to personalize your love letter.',
    pin: cleanPin,
    hosted_url: `${buildAppRoutePath({ view: 'preview' }, baseUrl)}?product=${buildProduct}&slug=${slug}`,
    brief: {
      design: buildProduct,
      for: cleanPartner || 'My Partner',
      feel: openingLine || 'Personal Love Letter',
      links: 'Signature 5-Blossom Flower Wall',
      notes: '',
    },
    created_at: new Date(nowMs).toISOString(),
  };
}

export function getProductSummaryLabel(product: ProductType): string {
  if (product === 'memories') return 'Memories · 34-Photo Heart Mosaic';
  if (product === 'custom') return 'Build It For Me · Concierge Service';
  return 'Chasing Her · Scrollable Love Story';
}
