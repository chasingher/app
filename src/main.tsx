import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import {
  initGlobalPWAInstallListeners,
  pwaInstallStore,
} from './utils/pwaInstallManager';

initGlobalPWAInstallListeners();

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  pwaInstallStore.setServiceWorkerStatus('registering');
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      pwaInstallStore.setServiceWorkerStatus(
        registration ? 'registered' : 'idle',
        null
      );
    },
    onRegisterError(error) {
      pwaInstallStore.setServiceWorkerStatus(
        'error',
        error instanceof Error ? error.message : String(error)
      );
    },
  });
} else {
  pwaInstallStore.setServiceWorkerStatus('unsupported');
}

createRoot(document.getElementById('root')!).render(<App />);
