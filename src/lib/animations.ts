export const HAPTIC = {
  light: 'light' as const,
  medium: 'medium' as const,
  heavy: 'heavy' as const,
};

export const animationConfig = {
  duration: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
  },
  easing: {
    default: [0.4, 0, 0.2, 1],
    smooth: [0.25, 0.1, 0.25, 1],
  },
  spring: {
    stiffness: 100,
    damping: 10,
    mass: 1,
    smooth: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 20,
    },
    bouncy: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 15,
    },
  },
};