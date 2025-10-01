'use client';

import { useEffect, useState } from 'react';
import { type Variants } from 'framer-motion';

/**
 * Hook to get motion configuration based on user preferences
 * Respects prefers-reduced-motion for accessibility
 */
export function useMotionConfig() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if user prefers reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Return motion-safe variants
  const getVariants = (variants: Variants): Variants => {
    if (prefersReducedMotion) {
      // Return instant transitions for reduced motion
      return {
        initial: variants.initial || {},
        animate: variants.animate || {},
        exit: variants.exit || {},
        transition: { duration: 0 }
      };
    }
    return variants;
  };

  // Return motion-safe transition
  const getTransition = (transition: any) => {
    if (prefersReducedMotion) {
      return { duration: 0 };
    }
    return transition;
  };

  // Check if animations should be enabled
  const shouldAnimate = !prefersReducedMotion;

  return {
    prefersReducedMotion,
    getVariants,
    getTransition,
    shouldAnimate,
    // Provide motion-safe animation values
    duration: prefersReducedMotion ? 0 : undefined,
    animate: prefersReducedMotion ? false : true,
  };
}

/**
 * Motion-safe animation variants
 */
export const motionSafeVariants = {
  fadeIn: (prefersReducedMotion: boolean): Variants => ({
    initial: prefersReducedMotion ? {} : { opacity: 0 },
    animate: { opacity: 1 },
    transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }
  }),

  slideIn: (prefersReducedMotion: boolean): Variants => ({
    initial: prefersReducedMotion ? {} : { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }
  }),

  scaleIn: (prefersReducedMotion: boolean): Variants => ({
    initial: prefersReducedMotion ? {} : { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }
  }),

  stagger: (prefersReducedMotion: boolean): Variants => ({
    animate: {
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.05
      }
    }
  })
};