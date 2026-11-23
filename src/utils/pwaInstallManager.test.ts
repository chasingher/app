import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BeforeInstallPromptEvent,
  createPWAInstallStore,
  detectPWAEnvironment,
} from './pwaInstallManager';

function createMockInstallEvent(
  outcome: 'accepted' | 'dismissed'
): {
  event: BeforeInstallPromptEvent;
  preventDefaultCalled: () => boolean;
  promptCalled: () => boolean;
} {
  let prevented = false;
  let prompted = false;
  const event = {
    preventDefault() {
      prevented = true;
    },
    async prompt() {
      prompted = true;
    },
    userChoice: Promise.resolve({ outcome, platform: 'web' }),
  } as unknown as BeforeInstallPromptEvent;

  return {
    event,
    preventDefaultCalled: () => prevented,
    promptCalled: () => prompted,
  };
}

test('PWA install store captures beforeinstallprompt and triggers Chrome native prompt on install', async () => {
  const store = createPWAInstallStore({
    userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/128.0.0.0 Mobile',
    standaloneMatch: false,
    navigatorStandalone: false,
    inIframe: false,
  });

  assert.equal(store.getSnapshot().isInstallable, false);
  assert.equal(store.getSnapshot().isInstalled, false);
  assert.equal(store.getSnapshot().isIOS, false);

  const mock = createMockInstallEvent('accepted');
  store.capturePrompt(mock.event);

  assert.equal(mock.preventDefaultCalled(), true);
  assert.equal(store.getSnapshot().isInstallable, true);

  const result = await store.triggerInstall();
  assert.equal(mock.promptCalled(), true);
  assert.equal(result, 'accepted');
  assert.equal(store.getSnapshot().isInstalled, true);
  assert.equal(store.getSnapshot().isInstallable, false);
});

test('PWA install store handles dismissed prompt cleanly and prevents double-prompting consumed event', async () => {
  const store = createPWAInstallStore({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/128.0.0.0',
    standaloneMatch: false,
    inIframe: false,
  });

  const mock = createMockInstallEvent('dismissed');
  store.capturePrompt(mock.event);

  const first = await store.triggerInstall();
  assert.equal(first, 'dismissed');
  assert.equal(store.getSnapshot().isInstalled, false);
  assert.equal(store.getSnapshot().isInstallable, false);
  assert.equal(store.getSnapshot().lastOutcome, 'dismissed');

  // Calling again without a fresh beforeinstallprompt returns unavailable
  const second = await store.triggerInstall();
  assert.equal(second, 'unavailable');
});

test('detectPWAEnvironment accurately distinguishes iOS Safari, standalone mode, and embedded iframe', () => {
  const ios = detectPWAEnvironment({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15',
    standaloneMatch: false,
    navigatorStandalone: false,
    inIframe: false,
  });
  assert.equal(ios.isIOS, true);
  assert.equal(ios.isInstalled, false);
  assert.equal(ios.isInIframe, false);

  const standalone = detectPWAEnvironment({
    userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/128.0.0.0',
    standaloneMatch: true,
    inIframe: false,
  });
  assert.equal(standalone.isInstalled, true);

  const iframe = detectPWAEnvironment({
    userAgent: 'Mozilla/5.0 Chrome/128.0.0.0',
    standaloneMatch: false,
    inIframe: true,
  });
  assert.equal(iframe.isInIframe, true);
});
