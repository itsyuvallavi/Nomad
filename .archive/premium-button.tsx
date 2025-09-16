/**
 * Premium Button Component
 * Enhanced with haptic feedback, advanced animations, and mobile-first interactions
 */

'use client';

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { HAPTIC, HAPTIC_BUTTON_VARIANTS, animationConfig } from "@/lib/animations";
import { useHapticTap } from "@/hooks/use-premium-gestures";

const premiumButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 transform-gpu will-change-transform relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 focus-visible:ring-blue-500",
        destructive: "bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl hover:shadow-red-500/25 focus-visible:ring-red-500",
        outline: "border-2 border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 shadow-md hover:shadow-lg text-gray-900 focus-visible:ring-gray-500",
        secondary: "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 hover:from-gray-200 hover:to-gray-300 shadow-md hover:shadow-lg focus-visible:ring-gray-500",
        ghost: "hover:bg-gray-100 text-gray-900 hover:shadow-sm focus-visible:ring-gray-500",
        gradient: "bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 shadow-lg hover:shadow-xl hover:shadow-purple-500/25 focus-visible:ring-purple-500",
        success: "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl hover:shadow-green-500/25 focus-visible:ring-green-500",
        warning: "bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700 shadow-lg hover:shadow-xl hover:shadow-yellow-500/25 focus-visible:ring-yellow-500",
      },
      size: {
        sm: "h-9 px-3 py-2 text-xs rounded-md min-w-[44px]", // Ensure minimum touch target
        default: "h-11 px-6 py-3 text-sm rounded-lg min-w-[44px]",
        lg: "h-13 px-8 py-4 text-base rounded-xl min-w-[44px]",
        xl: "h-16 px-10 py-5 text-lg rounded-2xl min-w-[44px]",
        icon: "h-11 w-11 rounded-lg min-w-[44px] min-h-[44px]",
        iconSm: "h-9 w-9 rounded-md min-w-[44px] min-h-[44px]",
        iconLg: "h-13 w-13 rounded-xl min-w-[44px] min-h-[44px]",
        fab: "h-14 w-14 rounded-full shadow-2xl min-w-[44px] min-h-[44px]",
      },
      loading: {
        true: "pointer-events-none",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      loading: false,
    },
  }
);

// Ripple effect component
const Ripple = ({ x, y }: { x: number; y: number }) => (
  <motion.span
    className="absolute pointer-events-none rounded-full bg-white/20"
    style={{
      left: x - 35,
      top: y - 35,
      width: 70,
      height: 70,
    }}
    initial={{ scale: 0, opacity: 1 }}
    animate={{ scale: 4, opacity: 0 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
  />
);

// Loading spinner component
const LoadingSpinner = ({ size = "sm" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClass = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }[size];

  return (
    <motion.div
      className={cn("border-2 border-current border-t-transparent rounded-full", sizeClass)}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
};

export interface PremiumButtonProps
  extends Omit<HTMLMotionProps<"button">, "size">,
    VariantProps<typeof premiumButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  hapticFeedback?: boolean;
  hapticType?: keyof typeof HAPTIC;
  showRipple?: boolean;
  children?: React.ReactNode;
}

const PremiumButton = React.forwardRef<HTMLButtonElement, PremiumButtonProps>(
  ({
    className,
    variant,
    size,
    loading = false,
    hapticFeedback = true,
    hapticType = "tap",
    showRipple = true,
    asChild = false,
    children,
    onClick,
    disabled,
    ...props
  }, ref) => {
    const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);
    const rippleId = React.useRef(0);

    // Handle haptic feedback on click
    const handleClick = useHapticTap((event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;

      // Create ripple effect
      if (showRipple && event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const newRipple = {
          id: rippleId.current++,
          x,
          y,
        };

        setRipples(prev => [...prev, newRipple]);

        // Remove ripple after animation
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== newRipple.id));
        }, 600);
      }

      onClick?.(event);
    }, hapticFeedback ? hapticType : undefined);

    const Comp = asChild ? Slot : motion.button;

    const content = (
      <>
        {ripples.map(ripple => (
          <Ripple key={ripple.id} x={ripple.x} y={ripple.y} />
        ))}
        {loading && (
          <LoadingSpinner size={size === "sm" || size === "iconSm" ? "sm" : size === "lg" || size === "xl" || size === "iconLg" ? "lg" : "md"} />
        )}
        {(!loading || asChild) && children}
      </>
    );

    if (asChild) {
      return (
        <Slot
          className={cn(premiumButtonVariants({ variant, size, loading, className }))}
          ref={ref}
          onClick={handleClick}
          disabled={disabled || loading}
          {...props}
        >
          {content}
        </Slot>
      );
    }

    return (
      <motion.button
        className={cn(premiumButtonVariants({ variant, size, loading, className }))}
        ref={ref}
        variants={HAPTIC_BUTTON_VARIANTS}
        initial="initial"
        whileHover={!disabled && !loading ? "hover" : undefined}
        whileTap={!disabled && !loading ? "tap" : undefined}
        onClick={handleClick}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </motion.button>
    );
  }
);

PremiumButton.displayName = "PremiumButton";

// Floating Action Button variant
export interface FABProps extends PremiumButtonProps {
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  offset?: number;
}

const FAB = React.forwardRef<HTMLButtonElement, FABProps>(
  ({ position = "bottom-right", offset = 24, className, size = "fab", variant = "default", ...props }, ref) => {
    const positionStyles = {
      "bottom-right": { bottom: offset, right: offset },
      "bottom-left": { bottom: offset, left: offset },
      "bottom-center": { bottom: offset, left: "50%", transform: "translateX(-50%)" },
    }[position];

    return (
      <motion.div
        className="fixed z-50"
        style={positionStyles}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          ...animationConfig.spring.bouncy,
          delay: 0.5,
        }}
      >
        <PremiumButton
          ref={ref}
          size={size}
          variant={variant}
          className={cn("shadow-2xl hover:shadow-3xl", className)}
          hapticType="medium"
          {...props}
        />
      </motion.div>
    );
  }
);

FAB.displayName = "FAB";

export { PremiumButton, FAB, premiumButtonVariants };
export default PremiumButton;