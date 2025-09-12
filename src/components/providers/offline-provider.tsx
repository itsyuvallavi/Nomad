'use client';

import { useEffect } from 'react';
import { useServiceWorker } from '@/hooks/use-service-worker';
import { offlineStorage } from '@/lib/offline-storage';
import { logger } from '@/lib/logger';

interface OfflineProviderProps {
  children: React.ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const serviceWorker = useServiceWorker();

  useEffect(() => {
    // Initialize offline storage
    const initOfflineStorage = async () => {
      try {
        await offlineStorage.init();
        logger.info('SYSTEM', 'Offline storage initialized');
      } catch (error) {
        logger.error('SYSTEM', 'Failed to initialize offline storage', { error });
      }
    };

    initOfflineStorage();

    // Log service worker status
    if (serviceWorker.isInstalled) {
      logger.info('SYSTEM', 'Service Worker is installed and active');
    }
  }, [serviceWorker.isInstalled]);

  // Show update notification if service worker is updating
  useEffect(() => {
    if (serviceWorker.isUpdating) {
      logger.info('SYSTEM', 'App is updating in the background...');
    }
  }, [serviceWorker.isUpdating]);

  return <>{children}</>;
}