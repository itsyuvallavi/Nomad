import { useEffect, useState } from 'react';
import { logger } from '@/lib/monitoring/logger';

interface ServiceWorkerState {
  isSupported: boolean;
  isInstalled: boolean;
  isUpdating: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isInstalled: false,
    isUpdating: false,
    registration: null
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isSupported = 'serviceWorker' in navigator;
    setState(prev => ({ ...prev, isSupported }));

    if (!isSupported) {
      logger.warn('SYSTEM', 'Service Worker not supported');
      return;
    }

    // Register service worker
    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        setState(prev => ({
          ...prev,
          registration,
          isInstalled: true
        }));

        logger.info('SYSTEM', 'Service Worker registered successfully');

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          setState(prev => ({ ...prev, isUpdating: true }));

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              setState(prev => ({ ...prev, isUpdating: false }));
              logger.info('SYSTEM', 'Service Worker updated');
              
              // Optionally reload the page for new content
              if (window.confirm('A new version is available. Would you like to refresh?')) {
                window.location.reload();
              }
            }
          });
        });

        // Check for updates periodically (every hour)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

      } catch (error) {
        logger.error('SYSTEM', 'Service Worker registration failed', { error });
        setState(prev => ({ ...prev, isInstalled: false }));
      }
    };

    registerServiceWorker();

    // Handle controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      logger.info('SYSTEM', 'Service Worker controller changed');
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  const skipWaiting = () => {
    if (state.registration?.waiting) {
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const clearCache = async () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      logger.info('SYSTEM', 'Cache clear requested');
    }
  };

  const checkForUpdates = async () => {
    if (state.registration) {
      try {
        await state.registration.update();
        logger.info('SYSTEM', 'Checked for Service Worker updates');
      } catch (error) {
        logger.error('SYSTEM', 'Failed to check for updates', { error });
      }
    }
  };

  return {
    ...state,
    skipWaiting,
    clearCache,
    checkForUpdates
  };
}