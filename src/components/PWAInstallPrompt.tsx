import React, { useEffect, useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, CheckCircle2, X, WifiOff } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
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
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [installedToast, setInstalledToast] = useState(false);

  if (isInstalled && !installedToast) {
    return null;
  }

  const handleAction = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setInstalledToast(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={handleAction}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#7A1C33]/25 bg-[#F5E7D8] px-3.5 py-2 text-xs font-semibold text-[#4A1221] hover:bg-[#EDD6C0] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-[#7A1C33]" />
          <span>Install {contextLabel} App</span>
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
                  Instant 1-tap launch, full-screen mobile experience, and offline access.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAction}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#E2B96F] text-[#2B0C14] text-xs font-bold hover:bg-[#ebd09c] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              <span>{isIOS ? 'Install on iPhone' : 'Add to Home Screen'}</span>
            </button>
          </div>
        </div>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
        >
          <div className="w-full max-w-md rounded-3xl bg-[#FBF3EA] border border-[#DCC397] p-6 text-[#2B1318] shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCC397]/50">
              <div className="flex items-center gap-2.5">
                <Smartphone className="h-5 w-5 text-[#7A1C33]" />
                <h3 id="pwa-guide-title" className="text-base font-bold text-[#33101B]">
                  Install {contextLabel} Web App
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
              <p>
                <strong>Chasing Her</strong> includes a full Progressive Web App manifest with direct home-screen shortcuts for both <strong>My Site</strong> and <strong>Backstage Admin</strong>:
              </p>
              <div className="rounded-2xl bg-[#F4E6D6] p-4 space-y-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <Share className="h-4 w-4 text-[#7A1C33] shrink-0" />
                  <span>
                    <strong>iOS Safari:</strong> Tap the <strong>Share</strong> icon in the bottom bar, then tap <strong>Add to Home Screen</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <PlusSquare className="h-4 w-4 text-[#7A1C33] shrink-0" />
                  <span>
                    <strong>Android / Chrome:</strong> Tap the browser menu <strong>(⋮)</strong> or address bar icon and select <strong>Install App</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-[#2E6B47] shrink-0" />
                  <span>
                    <strong>Quick Shortcuts:</strong> Long-press the installed app icon to jump straight to <em>My Site</em> or <em>Backstage Admin</em>.
                  </span>
                </div>
              </div>
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
