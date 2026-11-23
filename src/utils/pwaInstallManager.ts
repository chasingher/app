export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type ServiceWorkerStatus =
  | 'idle'
  | 'registering'
  | 'registered'
  | 'unsupported'
  | 'error';

export interface PWAInstallSnapshot {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isInIframe: boolean;
  swStatus: ServiceWorkerStatus;
  swError: string | null;
  lastOutcome: 'accepted' | 'dismissed' | null;
}

declare global {
  interface Window {
    __chPwaPrompt?: BeforeInstallPromptEvent | null;
    __chPwaInstalled?: boolean;
  }
}

export function detectPWAEnvironment(env?: {
  userAgent?: string;
  standaloneMatch?: boolean;
  navigatorStandalone?: boolean;
  inIframe?: boolean;
}): { isInstalled: boolean; isIOS: boolean; isInIframe: boolean } {
  const ua = (
    env?.userAgent ??
    (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  ).toLowerCase();

  const isIOS = /iphone|ipad|ipod/.test(ua);

  const standaloneMatch =
    env?.standaloneMatch ??
    (typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches);

  const navigatorStandalone =
    env?.navigatorStandalone ??
    (typeof window !== 'undefined' &&
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true);

  let isInIframe = false;
  if (typeof env?.inIframe === 'boolean') {
    isInIframe = env.inIframe;
  } else if (typeof window !== 'undefined') {
    try {
      isInIframe = window.self !== window.top;
    } catch {
      isInIframe = true;
    }
  }

  return {
    isInstalled: Boolean(standaloneMatch || navigatorStandalone),
    isIOS,
    isInIframe,
  };
}

export interface PWAInstallStore {
  getSnapshot: () => PWAInstallSnapshot;
  subscribe: (listener: () => void) => () => void;
  capturePrompt: (event: BeforeInstallPromptEvent) => void;
  markInstalled: () => void;
  setServiceWorkerStatus: (status: ServiceWorkerStatus, error?: string | null) => void;
  triggerInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export function createPWAInstallStore(
  initialEnv?: Parameters<typeof detectPWAEnvironment>[0]
): PWAInstallStore {
  const detected = detectPWAEnvironment(initialEnv);
  let deferredPrompt: BeforeInstallPromptEvent | null = null;
  let snapshot: PWAInstallSnapshot = {
    isInstallable: false,
    isInstalled: detected.isInstalled,
    isIOS: detected.isIOS,
    isInIframe: detected.isInIframe,
    swStatus: 'idle',
    swError: null,
    lastOutcome: null,
  };

  const listeners = new Set<() => void>();

  const emit = (patch: Partial<PWAInstallSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((fn) => fn());
  };

  const capturePrompt = (event: BeforeInstallPromptEvent) => {
    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    deferredPrompt = event;
    emit({ isInstallable: true, isInstalled: false });
  };

  const markInstalled = () => {
    deferredPrompt = null;
    emit({ isInstallable: false, isInstalled: true, lastOutcome: 'accepted' });
  };

  const setServiceWorkerStatus = (
    status: ServiceWorkerStatus,
    error: string | null = null
  ) => {
    emit({ swStatus: status, swError: error });
  };

  const triggerInstall = async (): Promise<
    'accepted' | 'dismissed' | 'unavailable'
  > => {
    if (!deferredPrompt) {
      return 'unavailable';
    }
    const promptEvent = deferredPrompt;
    // Chrome's BeforeInstallPromptEvent can only be invoked once
    deferredPrompt = null;
    emit({ isInstallable: false });

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        emit({ isInstalled: true, lastOutcome: 'accepted' });
        return 'accepted';
      }
      emit({ lastOutcome: 'dismissed' });
      return 'dismissed';
    } catch {
      return 'unavailable';
    }
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    capturePrompt,
    markInstalled,
    setServiceWorkerStatus,
    triggerInstall,
  };
}

// ============================================================================
// GLOBAL BROWSER SINGLETON (Never misses early beforeinstallprompt events)
// ============================================================================

export const pwaInstallStore = createPWAInstallStore();

let browserListenersAttached = false;

export function initGlobalPWAInstallListeners(): void {
  if (typeof window === 'undefined' || browserListenersAttached) return;
  browserListenersAttached = true;

  // Hydrate any event captured in index.html <head> before React loaded
  if (window.__chPwaInstalled) {
    pwaInstallStore.markInstalled();
  } else if (window.__chPwaPrompt) {
    pwaInstallStore.capturePrompt(window.__chPwaPrompt);
  }

  const syncFromWindow = () => {
    if (window.__chPwaInstalled) {
      pwaInstallStore.markInstalled();
    } else if (window.__chPwaPrompt) {
      pwaInstallStore.capturePrompt(window.__chPwaPrompt);
    }
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    const evt = e as BeforeInstallPromptEvent;
    evt.preventDefault();
    window.__chPwaPrompt = evt;
    pwaInstallStore.capturePrompt(evt);
  });

  window.addEventListener('appinstalled', () => {
    window.__chPwaPrompt = null;
    window.__chPwaInstalled = true;
    pwaInstallStore.markInstalled();
  });

  window.addEventListener('chasingher:pwa-prompt-changed', syncFromWindow);
}

// Attach immediately on module evaluation in browser contexts
if (typeof window !== 'undefined') {
  initGlobalPWAInstallListeners();
}
