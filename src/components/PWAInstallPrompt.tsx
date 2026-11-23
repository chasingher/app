import React, { useEffect, useState, useSyncExternalStore } from 'react';
import {
  Download,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  WifiOff,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import {
  initGlobalPWAInstallListeners,
  pwaInstallStore,
} from '../utils/pwaInstallManager';

export function usePWAInstall() {
  useEffect(() => {
    initGlobalPWAInstallListeners();
  }, []);

  const snapshot = useSyncExternalStore(
    pwaInstallStore.subscribe,
    pwaInstallStore.getSnapshot,
    pwaInstallStore.getSnapshot
  );

  const install = async () => {
    const outcome = await pwaInstallStore.triggerInstall();
    return outcome === 'accepted';
  };

  return {
    isInstallable: snapshot.isInstallable,
    isInstalled: snapshot.isInstalled,
    isIOS: snapshot.isIOS,
    isInIframe: snapshot.isInIframe,
    swStatus: snapshot.swStatus,
    lastOutcome: snapshot.lastOutcome,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 left-4 z-50 flex items-center gap-2 rounded-xl bg-[#5A1A2C] px-4 py-2.5 text-xs font-semibold text-[#FBF3EA] shadow-lg border border-[#E2B96F]/40"
    >
      <WifiOff className="h-4 w-4 text-[#E2B96F]" />
      <span>Offline Mode — Cached app data active</span>
    </div>
  );
};

interface PWAInstallButtonProps {
  contextLabel?: 'My Site' | 'Backstage Admin' | 'Chasing Her';
  variant?: 'compact' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  contextLabel = 'Chasing Her',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } =
    usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installedToast, setInstalledToast] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (isInstalled && !installedToast) {
    return null;
  }

  const currentUrl =
    typeof window !== 'undefined' ? window.location.href : '/';

  const handleAction = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        const accepted = await install();
        if (accepted) {
          setInstalledToast(true);
        }
      } finally {
        setInstalling(false);
      }
      return;
    }
    setShowGuide(true);
  };

  const handleCopyDirectUrl = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl).catch(() => {});
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2200);
    }
  };

  return (
    <>
      {installedToast ? (
        <div
          role="status"
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-emerald-400/35 bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-emerald-200 whitespace-nowrap shrink-0"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
          <span>App Installed</span>
        </div>
      ) : variant === 'compact' ? (
        <button
          type="button"
          data-testid="pwa-install-btn"
          data-install-ready={isInstallable ? 'true' : 'false'}
          disabled={installing}
          onClick={handleAction}
          className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-[#E2B96F]/35 bg-[#F5E7D8] px-3 sm:px-3.5 py-2 text-xs font-semibold text-[#4A1221] hover:bg-[#EDD6C0] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5 text-[#7A1C33] shrink-0" />
          <span className="hidden sm:inline">
            {installing
              ? 'Opening Installer…'
              : isInstallable
              ? `Install ${contextLabel} App`
              : `Install ${contextLabel}`}
          </span>
          <span className="sm:hidden">
            {installing ? 'Installing…' : 'Install'}
          </span>
        </button>
      ) : (
        <div className="rounded-2xl border border-[#DCC397]/60 bg-gradient-to-r from-[#3A0D18] to-[#5A1A2C] p-4 text-[#FBF3EA] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FBF3EA]/10 border border-[#E2B96F]/30">
                <Smartphone className="h-5 w-5 text-[#E2B96F]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#FBF3EA]">
                  Install {contextLabel} on Your Home Screen
                </h3>
                <p className="text-xs text-[#FBF3EA]/80 mt-0.5">
                  {isInstallable
                    ? 'Ready for 1-tap Chrome installation — full-screen launch and offline access.'
                    : 'Instant 1-tap launch, full-screen mobile experience, and offline access.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              data-testid="pwa-install-card-btn"
              data-install-ready={isInstallable ? 'true' : 'false'}
              disabled={installing}
              onClick={handleAction}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#E2B96F] text-[#2B0C14] text-xs font-bold hover:bg-[#ebd09c] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              <span>
                {installing
                  ? 'Opening Installer…'
                  : isInstallable
                  ? 'Install App Now'
                  : isIOS
                  ? 'Install on iPhone'
                  : 'Add to Home Screen'}
              </span>
            </button>
          </div>
        </div>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false);
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-[#FBF3EA] border border-[#DCC397] p-6 text-[#2B1318] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCC397]/50">
              <div className="flex items-center gap-2.5">
                <Smartphone className="h-5 w-5 text-[#7A1C33]" />
                <h3
                  id="pwa-guide-title"
                  className="text-base font-bold text-[#33101B]"
                >
                  Install {contextLabel} App
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#7A5A47] hover:bg-[#EFE0CE] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-[#4A2C22]">
              {isInIframe ? (
                <>
                  <p className="leading-relaxed">
                    Chrome blocks direct app installation while a website is
                    inside an embedded preview frame. Open your direct app link
                    in a regular Chrome tab, then tap{' '}
                    <strong>Install App</strong> for 1-click installation.
                  </p>
                  <div className="rounded-2xl bg-[#F4E6D6] p-3.5 space-y-2.5">
                    <p className="text-[11px] font-mono text-[#5A1A2C] break-all leading-snug">
                      {currentUrl}
                    </p>
                    <button
                      type="button"
                      onClick={handleCopyDirectUrl}
                      className="w-full min-h-[40px] rounded-xl bg-[#5A1A2C] hover:bg-[#42111F] text-[#FBF3EA] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="h-4 w-4 text-[#E2B96F]" />
                          <span>Link Copied — Paste in Chrome Address Bar</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 text-[#E2B96F]" />
                          <span>Copy Direct App URL for Chrome</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : isIOS ? (
                <div className="rounded-2xl bg-[#F4E6D6] p-4 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Share className="h-4 w-4 text-[#7A1C33] shrink-0 mt-0.5" />
                    <span>
                      <strong>Step 1:</strong> Tap the <strong>Share</strong>{' '}
                      button at the bottom of Safari.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <PlusSquare className="h-4 w-4 text-[#7A1C33] shrink-0 mt-0.5" />
                    <span>
                      <strong>Step 2:</strong> Scroll down and tap{' '}
                      <strong>Add to Home Screen</strong>, then tap{' '}
                      <strong>Add</strong>.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <p className="leading-relaxed">
                    <strong>Chasing Her</strong> is configured as an installable
                    Chrome Web App. If Chrome hasn&apos;t shown the automatic
                    popup yet (or if it was dismissed earlier):
                  </p>
                  <div className="rounded-2xl bg-[#F4E6D6] p-4 space-y-2.5 text-xs">
                    <div className="flex items-start gap-2.5">
                      <ExternalLink className="h-4 w-4 text-[#7A1C33] shrink-0 mt-0.5" />
                      <span>
                        <strong>Desktop Chrome / Edge:</strong> Click the{' '}
                        <strong>Install</strong> icon on the right side of the
                        address bar, or open menu <strong>(⋮) → Cast, save, and share → Install page as app</strong>.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <PlusSquare className="h-4 w-4 text-[#7A1C33] shrink-0 mt-0.5" />
                      <span>
                        <strong>Android Chrome:</strong> Tap the browser menu{' '}
                        <strong>(⋮)</strong> and choose{' '}
                        <strong>Install app</strong> (or{' '}
                        <strong>Add to Home screen</strong>).
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#2E6B47] shrink-0 mt-0.5" />
                      <span>
                        <strong>App Shortcuts:</strong> Long-press the installed
                        icon to jump directly to <em>My Site</em> or{' '}
                        <em>Backstage Admin</em>.
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-[#5A1A2C] py-2.5 text-sm font-semibold text-[#FBF3EA] hover:bg-[#42111F] transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
