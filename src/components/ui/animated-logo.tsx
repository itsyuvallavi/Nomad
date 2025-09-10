'use client';

import { motion } from 'framer-motion';

interface AnimatedLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AnimatedLogo({ size = 'md', className = '' }: AnimatedLogoProps) {
  const sizes = {
    sm: { outer: 'w-8 h-8', inner: 'w-4 h-4' },
    md: { outer: 'w-12 h-12', inner: 'w-6 h-6' },
    lg: { outer: 'w-16 h-16', inner: 'w-8 h-8' }
  };

  const { outer, inner } = sizes[size];

  return (
    <motion.div
      className={`inline-flex items-center justify-center ${outer} bg-foreground rounded-2xl ${className}`}
      animate={{ 
        scale: [1, 1.02, 1],
      }}
      transition={{ 
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <motion.div 
        className={`${inner} bg-background rounded-lg`}
        animate={{ 
          rotate: 360,
        }}
        transition={{ 
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </motion.div>
  );
}