/**
 * Premium Gesture Hook
 * Advanced touch interactions with haptic feedback
 */

import { useRef, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import { HAPTIC, GESTURE_THRESHOLDS } from '@/lib/animations';

interface GestureHandlers {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchIn?: () => void;
  onPinchOut?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDrag?: (delta: { x: number; y: number }) => void;
}

interface GestureOptions {
  enableHaptic?: boolean;
  swipeThreshold?: number;
  pinchThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
}

export const usePremiumGestures = (
  handlers: GestureHandlers,
  options: GestureOptions = {}
) => {
  const {
    enableHaptic = true,
    swipeThreshold = GESTURE_THRESHOLDS.swipe.minDistance,
    pinchThreshold = GESTURE_THRESHOLDS.pinch.minScale,
    longPressDelay = GESTURE_THRESHOLDS.longPress.duration,
    doubleTapDelay = 300,
  } = options;

  const lastTapRef = useRef(0);
  const longPressTimeoutRef = useRef<NodeJS.Timeout>();

  const triggerHaptic = useCallback((type: keyof typeof HAPTIC) => {
    if (enableHaptic) {
      HAPTIC[type]();
    }
  }, [enableHaptic]);

  const pointerDownTime = useRef<number>(0);
  const pointerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const bind = useGesture(
    {
      // Touch/click handling
      onPointerDown: ({ event }) => {
        pointerDownTime.current = Date.now();
        pointerStartPos.current = { x: event.clientX, y: event.clientY };
        
        // Long press detection
        longPressTimeoutRef.current = setTimeout(() => {
          handlers.onLongPress?.();
          triggerHaptic('heavy');
        }, longPressDelay);
      },

      onPointerUp: ({ event }) => {
        // Clear long press timeout
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
          longPressTimeoutRef.current = undefined;
        }

        // Check if this was a tap
        const elapsedTime = Date.now() - pointerDownTime.current;
        const distance = Math.sqrt(
          Math.pow(event.clientX - pointerStartPos.current.x, 2) +
          Math.pow(event.clientY - pointerStartPos.current.y, 2)
        );
        const isTap = elapsedTime < GESTURE_THRESHOLDS.tap.maxDuration && 
                     distance < GESTURE_THRESHOLDS.tap.maxDistance;

        if (isTap) {
          const now = Date.now();
          const timeSinceLastTap = now - lastTapRef.current;

          if (timeSinceLastTap < doubleTapDelay && timeSinceLastTap > 0) {
            // Double tap
            handlers.onDoubleTap?.();
            triggerHaptic('medium');
            lastTapRef.current = 0; // Reset to prevent triple tap
          } else {
            // Single tap (with delay to check for double tap)
            setTimeout(() => {
              if (Date.now() - lastTapRef.current >= doubleTapDelay) {
                handlers.onTap?.();
                triggerHaptic('tap');
              }
            }, doubleTapDelay);
            lastTapRef.current = now;
          }
        }
      },

      // Drag handling
      onDragStart: () => {
        handlers.onDragStart?.();
        triggerHaptic('light');
      },

      onDrag: ({ delta }) => {
        handlers.onDrag?.({ x: delta[0], y: delta[1] });
      },

      onDragEnd: ({ direction, distance, velocity }) => {
        handlers.onDragEnd?.();

        // Swipe detection based on velocity and distance
        if (distance[0] > swipeThreshold || Math.abs(velocity[0]) > GESTURE_THRESHOLDS.swipe.minVelocity) {
          if (direction[0] === 1) {
            handlers.onSwipeRight?.();
          } else if (direction[0] === -1) {
            handlers.onSwipeLeft?.();
          }
          triggerHaptic('light');
        }

        if (distance[1] > swipeThreshold || Math.abs(velocity[1]) > GESTURE_THRESHOLDS.swipe.minVelocity) {
          if (direction[1] === 1) {
            handlers.onSwipeDown?.();
          } else if (direction[1] === -1) {
            handlers.onSwipeUp?.();
          }
          triggerHaptic('light');
        }
      },

      // Pinch handling
      onPinch: ({ offset: [scale] }) => {
        const threshold = 0.1; // 10% threshold for pinch detection
        if (scale > 1 + threshold) {
          handlers.onPinchOut?.();
          triggerHaptic('medium');
        } else if (scale < 1 - threshold) {
          handlers.onPinchIn?.();
          triggerHaptic('medium');
        }
      },
    },
    {
      drag: {
        threshold: 10,
        filterTaps: true,
      },
      pinch: {
        threshold: 0.1,
      },
    }
  );

  return bind;
};

// Hook for simple tap with haptic feedback
export const useHapticTap = (callback: () => void, hapticType: keyof typeof HAPTIC = 'tap') => {
  return useCallback(() => {
    HAPTIC[hapticType]();
    callback();
  }, [callback, hapticType]);
};

// Hook for swipe navigation
export const useSwipeNavigation = (
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold = GESTURE_THRESHOLDS.swipe.minDistance
) => {
  return usePremiumGestures({
    onSwipeLeft,
    onSwipeRight,
  }, { swipeThreshold: threshold });
};

// Hook for card interactions
export const useCardGestures = (
  onTap?: () => void,
  onLongPress?: () => void,
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void
) => {
  return usePremiumGestures({
    onTap,
    onLongPress,
    onSwipeLeft,
    onSwipeRight,
  });
};

export default usePremiumGestures;