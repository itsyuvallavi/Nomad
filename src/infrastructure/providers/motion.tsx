'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useMotionConfig } from '@/hooks/use-motion-config';

interface MotionContextValue {
  prefersReducedMotion: boolean;
  shouldAnimate: boolean;
  isLoaded: boolean;
  motion: any;
  AnimatePresence: any;
  MotionConfig: any;
}

const MotionContext = createContext<MotionContextValue>({
  prefersReducedMotion: false,
  shouldAnimate: true,
  isLoaded: false,
  motion: null,
  AnimatePresence: null,
  MotionConfig: null,
});

export function useMotion() {
  return useContext(MotionContext);
}

interface MotionProviderProps {
  children: ReactNode;
}

export function MotionProvider({ children }: MotionProviderProps) {
  const { prefersReducedMotion, shouldAnimate } = useMotionConfig();
  const [motionModule, setMotionModule] = useState<any>(null);

  useEffect(() => {
    // Only load Framer Motion after initial render
    const loadMotion = async () => {
      const framerMotion = await import('framer-motion');
      setMotionModule(framerMotion);
    };

    // Delay loading to prioritize critical content
    const timer = setTimeout(loadMotion, 50);
    return () => clearTimeout(timer);
  }, []);

  const value = {
    prefersReducedMotion,
    shouldAnimate,
    isLoaded: !!motionModule,
    motion: motionModule?.motion,
    AnimatePresence: motionModule?.AnimatePresence,
    MotionConfig: motionModule?.MotionConfig,
  };

  // Before Framer Motion loads, render children without animations
  if (!motionModule) {
    return (
      <MotionContext.Provider value={value}>
        {children}
      </MotionContext.Provider>
    );
  }

  const { MotionConfig } = motionModule;

  return (
    <MotionContext.Provider value={value}>
      <MotionConfig reducedMotion={prefersReducedMotion ? "always" : "never"}>
        {children}
      </MotionConfig>
    </MotionContext.Provider>
  );
}