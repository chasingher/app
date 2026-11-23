import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKOUT_DIAL_COUNTRIES,
  canNavigateToStep,
  getStepProgressPercent,
  validateCheckoutDetails,
  buildCheckoutDraftOrder,
  getProductSummaryLabel,
} from './checkoutFlow';

const GH_DIAL = CHECKOUT_DIAL_COUNTRIES[0];
const KE_DIAL = CHECKOUT_DIAL_COUNTRIES[1];
const UK_DIAL = CHECKOUT_DIAL_COUNTRIES.find((c) => c.iso === 'GB')!;

test('step navigation allows jumping freely between plan and details, and gates payment on valid details', () => {
  assert.equal(canNavigateToStep('details', 'plan', false), true);
  assert.equal(canNavigateToStep('plan', 'details', false), true);
  assert.equal(canNavigateToStep('payment', 'details', false), false);
  assert.equal(canNavigateToStep('payment', 'details', true), true);
  assert.equal(canNavigateToStep('plan', 'payment', true), true);
  assert.equal(canNavigateToStep('details', 'payment', true), true);
  assert.equal(canNavigateToStep('plan', 'redirecting', true), false);
});

test('step progress fills smoothly across 3 steps', () => {
  assert.equal(getStepProgressPercent('plan'), 33);
  assert.equal(getStepProgressPercent('details'), 66);
  assert.equal(getStepProgressPercent('payment'), 100);
  assert.equal(getStepProgressPercent('redirecting'), 100);
});

test('minimal checkout validation requires only name, email, and WhatsApp phone', () => {
  const emptyRes = validateCheckoutDetails({
    name: '',
    email: '',
    phone: '',
    country: 'gh',
    dialOption: GH_DIAL,
  });
  assert.equal(emptyRes.valid, false);
  assert.ok(emptyRes.errors.name);
  assert.ok(emptyRes.errors.email);
  assert.ok(emptyRes.errors.phone);

  const validGh = validateCheckoutDetails({
    name: 'Kwame Mensah',
    email: 'Kwame@Gmail.com',
    phone: '0241234567',
    country: 'gh',
    dialOption: GH_DIAL,
  });
  assert.equal(validGh.valid, true);
  assert.equal(validGh.normalizedEmail, 'kwame@gmail.com');
  assert.equal(validGh.normalizedPhone, '+233241234567');

  const validKe = validateCheckoutDetails({
    name: 'Brian Ochieng',
    email: 'brian@yahoo.com',
    phone: '0712345678',
    country: 'ke',
    dialOption: KE_DIAL,
  });
  assert.equal(validKe.valid, true);
  assert.equal(validKe.normalizedPhone, '+254712345678');

  const validUk = validateCheckoutDetails({
    name: 'Daniel Boateng',
    email: 'daniel@outlook.com',
    phone: '07700900123',
    country: 'gh',
    dialOption: UK_DIAL,
  });
  assert.equal(validUk.valid, true);
  assert.equal(validUk.normalizedPhone, '+447700900123');
});

test('email typo detection returns suggestion without breaking valid syntax', () => {
  const res = validateCheckoutDetails({
    name: 'Ama Serwaa',
    email: 'ama@gamil.com',
    phone: '0245551234',
    country: 'gh',
    dialOption: GH_DIAL,
  });
  assert.equal(res.emailSuggestion, 'ama@gmail.com');
});

test('draft order builder creates complete order with sensible defaults when recipient/PIN are omitted', () => {
  const order = buildCheckoutDraftOrder({
    product: 'chasing-her',
    fullName: 'Kofi Asante',
    email: 'kofi@gmail.com',
    whatsapp: '+233241234567',
    country: 'gh',
    nowMs: 1700000000000,
    randomSuffix: 421,
  });

  assert.equal(order.id, 'ord-gh-1700000000000');
  assert.equal(order.slug, 'for-kofi-asante-421');
  assert.equal(order.pin, '140826');
  assert.equal(order.build_product, 'chasing-her');
  assert.equal(order.brief?.for, 'My Partner');
  assert.equal(order.brief?.notes, '');
  assert.equal(getProductSummaryLabel('custom'), 'Build It For Me · Concierge Service');
});
