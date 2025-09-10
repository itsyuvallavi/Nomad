import { Variants } from 'framer-motion';

// Animation timing and easing configurations
export const animationConfig = {
  duration: {
    instant: 0.1,
    fast: 0.2,
    normal: 0.3,
    slow: 0.5,
    verySlow: 0.8,
    superSlow: 1.2
  },
  easing: {
    smooth: [0.4, 0.0, 0.2, 1],
    bounce: [0.68, -0.55, 0.265, 1.55],
    elastic: [0.175, 0.885, 0.32, 1.275],
    sharp: [0.4, 0.0, 0.6, 1]
  },
  stagger: {
    fast: 0.05,
    normal: 0.1,
    slow: 0.15
  },
  spring: {
    bouncy: { type: "spring", stiffness: 400, damping: 20 },
    smooth: { type: "spring", stiffness: 300, damping: 30 },
    slow: { type: "spring", stiffness: 200, damping: 40 }
  }
};

// Reusable animation variants
export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.easing.smooth
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: animationConfig.duration.fast
    }
  }
};

export const fadeInScale: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.easing.smooth
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: animationConfig.duration.fast
    }
  }
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: animationConfig.stagger.normal,
      delayChildren: 0.1
    }
  }
};

export const slideInFromLeft: Variants = {
  initial: {
    x: -100,
    opacity: 0
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.easing.smooth
    }
  }
};

export const slideInFromRight: Variants = {
  initial: {
    x: 100,
    opacity: 0
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.easing.smooth
    }
  }
};

export const scaleIn: Variants = {
  initial: {
    scale: 0,
    opacity: 0
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: animationConfig.duration.normal,
      ease: animationConfig.easing.bounce
    }
  }
};

export const rotateIn: Variants = {
  initial: {
    rotate: -180,
    opacity: 0
  },
  animate: {
    rotate: 0,
    opacity: 1,
    transition: {
      duration: animationConfig.duration.slow,
      ease: animationConfig.easing.elastic
    }
  }
};

// Hover animations
export const hoverScale = {
  scale: 1.05,
  transition: {
    duration: animationConfig.duration.fast,
    ease: animationConfig.easing.smooth
  }
};

export const hoverLift = {
  y: -5,
  scale: 1.02,
  transition: {
    duration: animationConfig.duration.fast,
    ease: animationConfig.easing.smooth
  }
};

export const tapScale = {
  scale: 0.95,
  transition: {
    duration: animationConfig.duration.instant
  }
};

// Custom hooks for animations
export const useReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Number counter animation
export const countAnimation = (
  start: number,
  end: number,
  duration: number = 1000,
  onUpdate: (value: number) => void
) => {
  const startTime = Date.now();
  const diff = end - start;

  const frame = () => {
    const now = Date.now();
    const progress = Math.min((now - startTime) / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
    const currentValue = start + diff * easeProgress;
    
    onUpdate(Math.round(currentValue));
    
    if (progress < 1) {
      requestAnimationFrame(frame);
    }
  };
  
  requestAnimationFrame(frame);
};

// Shimmer effect for loading states
export const shimmer = `
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
  
  .shimmer {
    animation: shimmer 2s infinite linear;
    background: linear-gradient(
      90deg,
      #f0f0f0 0%,
      #f8f8f8 20%,
      #f0f0f0 40%,
      #f0f0f0 100%
    );
    background-size: 1000px 100%;
  }
`;

// Pulse animation for dots
export const pulse = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
  
  .pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;

// Floating animation for elements
export const float = `
  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }
  
  .float {
    animation: float 3s ease-in-out infinite;
  }
`;