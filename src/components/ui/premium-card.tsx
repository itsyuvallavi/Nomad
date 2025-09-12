/**
 * Premium Card Component
 * Enhanced with 3D transforms, haptic feedback, and mobile gestures
 */

'use client';

import * as React from "react";
import { motion, HTMLMotionProps, useMotionValue, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { CARD_VARIANTS, HAPTIC } from "@/lib/animations";
import { useCardGestures } from "@/hooks/use-premium-gestures";

export interface PremiumCardProps extends HTMLMotionProps<"div"> {
  interactive?: boolean;
  hover3D?: boolean;
  hapticFeedback?: boolean;
  swipeActions?: boolean;
  onTap?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "bordered" | "glass" | "gradient";
}

const cardVariants = {
  default: "bg-white border border-gray-200 shadow-sm",
  elevated: "bg-white shadow-lg border-0",
  bordered: "bg-white border-2 border-gray-200 shadow-none",
  glass: "bg-white/80 backdrop-blur-md border border-white/20 shadow-lg",
  gradient: "bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-md",
};

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
  ({
    className,
    children,
    interactive = false,
    hover3D = false,
    hapticFeedback = true,
    swipeActions = false,
    onTap,
    onLongPress,
    onSwipeLeft,
    onSwipeRight,
    variant = "default",
    ...props
  }, ref) => {
    // Motion values for 3D hover effect
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
    const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

    // Gesture handling
    const bind = useCardGestures(
      onTap ? () => {
        if (hapticFeedback) HAPTIC.tap();
        onTap();
      } : undefined,
      onLongPress ? () => {
        if (hapticFeedback) HAPTIC.heavy();
        onLongPress();
      } : undefined,
      onSwipeLeft ? () => {
        if (hapticFeedback) HAPTIC.light();
        onSwipeLeft();
      } : undefined,
      onSwipeRight ? () => {
        if (hapticFeedback) HAPTIC.light();
        onSwipeRight();
      } : undefined
    );

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!hover3D) return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      mouseX.set(e.clientX - centerX);
      mouseY.set(e.clientY - centerY);
    };

    const handleMouseLeave = () => {
      if (!hover3D) return;
      mouseX.set(0);
      mouseY.set(0);
    };

    const cardProps = {
      className: cn(
        "rounded-xl p-6 transition-all duration-300 transform-gpu will-change-transform",
        cardVariants[variant],
        {
          "cursor-pointer select-none": interactive || onTap,
          "hover:shadow-2xl": interactive && variant !== "glass",
          "active:scale-[0.98]": interactive,
        },
        className
      ),
      variants: interactive ? CARD_VARIANTS : undefined,
      initial: interactive ? "initial" : undefined,
      animate: interactive ? "animate" : undefined,
      whileHover: interactive ? "hover" : undefined,
      whileTap: interactive ? "tap" : undefined,
      style: hover3D ? {
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      } : undefined,
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
      ...(swipeActions && bind()),
      ref,
      ...props,
    };

    return (
      <motion.div {...cardProps}>
        {children}
      </motion.div>
    );
  }
);

PremiumCard.displayName = "PremiumCard";

// Card Header component
export interface PremiumCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const PremiumCardHeader = React.forwardRef<HTMLDivElement, PremiumCardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-2 pb-4", className)}
      {...props}
    />
  )
);
PremiumCardHeader.displayName = "PremiumCardHeader";

// Card Title component
export interface PremiumCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

const PremiumCardTitle = React.forwardRef<HTMLHeadingElement, PremiumCardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-tight tracking-tight text-gray-900",
        className
      )}
      {...props}
    />
  )
);
PremiumCardTitle.displayName = "PremiumCardTitle";

// Card Description component
export interface PremiumCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

const PremiumCardDescription = React.forwardRef<HTMLParagraphElement, PremiumCardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-gray-600 leading-relaxed", className)}
      {...props}
    />
  )
);
PremiumCardDescription.displayName = "PremiumCardDescription";

// Card Content component
export interface PremiumCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const PremiumCardContent = React.forwardRef<HTMLDivElement, PremiumCardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("pt-0", className)} {...props} />
  )
);
PremiumCardContent.displayName = "PremiumCardContent";

// Card Footer component
export interface PremiumCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

const PremiumCardFooter = React.forwardRef<HTMLDivElement, PremiumCardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center pt-4 border-t border-gray-100", className)}
      {...props}
    />
  )
);
PremiumCardFooter.displayName = "PremiumCardFooter";

// Animated List Container for cards
export interface AnimatedCardListProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  staggerDelay?: number;
}

const AnimatedCardList = React.forwardRef<HTMLDivElement, AnimatedCardListProps>(
  ({ className, children, staggerDelay = 0.05, ...props }, ref) => {
    const containerVariants = {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay,
          delayChildren: 0.1,
        },
      },
    };

    return (
      <motion.div
        ref={ref}
        className={cn("space-y-4", className)}
        variants={containerVariants}
        initial="initial"
        animate="animate"
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
AnimatedCardList.displayName = "AnimatedCardList";

export {
  PremiumCard,
  PremiumCardHeader,
  PremiumCardTitle,
  PremiumCardDescription,
  PremiumCardContent,
  PremiumCardFooter,
  AnimatedCardList,
};

export default PremiumCard;