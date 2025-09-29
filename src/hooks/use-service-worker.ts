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

              // Don't show update notifications on first load
              const isFirstVisit = !localStorage.getItem('app-visited');
              if (isFirstVisit) {
                localStorage.setItem('app-visited', 'true');
                logger.info('SYSTEM', 'First visit - skipping update notification');
                return;
              }

              // Check if we recently showed an update notification
              const lastNotified = localStorage.getItem('sw-update-last-notified');
              const now = Date.now();
              const thirtyMinutes = 30 * 60 * 1000;

              // Skip notification if we showed one recently
              if (lastNotified && (now - parseInt(lastNotified)) < thirtyMinutes) {
                logger.info('SYSTEM', 'Skipping update notification (shown recently)');
                return;
              }

              // Mobile handling: More subtle approach
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

              if (isMobile) {
                // On mobile, just log the update, don't show popup
                localStorage.setItem('sw-update-last-notified', now.toString());
                logger.info('SYSTEM', 'App updated in background. Changes will apply on next visit.');
              } else {
                // On desktop, show a less intrusive notification
                localStorage.setItem('sw-update-last-notified', now.toString());

                // Use a timeout to avoid showing immediately
                setTimeout(() => {
                  // Only show if the page has been open for at least 10 seconds
                  if (window.confirm('A new version is available. Would you like to refresh?')) {
                    window.location.reload();
                  }
                }, 10000); // Wait 10 seconds before showing
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