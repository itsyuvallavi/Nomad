/**
 * Mobile Bottom Navigation
 * Premium mobile navigation with haptic feedback and smooth animations
 */

'use client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/helpers/general";
import { HAPTIC, animationConfig } from "@/lib/animations";
import { useHapticTap } from "@/hooks/use-premium-gestures";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  badge?: number;
  disabled?: boolean;
}

export interface MobileBottomNavProps {
  items: NavItem[];
  activeItem: string;
  onItemChange: (itemId: string) => void;
  className?: string;
  showLabels?: boolean;
  hapticFeedback?: boolean;
  variant?: "default" | "minimal" | "elevated" | "glass";
}

const navVariants = {
  default: "bg-white border-t border-gray-200 shadow-lg",
  minimal: "bg-white/95 backdrop-blur-sm",
  elevated: "bg-white shadow-2xl border-0 rounded-t-3xl",
  glass: "bg-white/80 backdrop-blur-md border-t border-white/20",
};

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  items,
  activeItem,
  onItemChange,
  className,
  showLabels = true,
  hapticFeedback = true,
  variant = "default",
}) => {
  const [indicatorPosition, setIndicatorPosition] = React.useState(0);
  const itemRefs = React.useRef<{ [key: string]: HTMLButtonElement | null }>({});

  // Update indicator position when active item changes
  React.useEffect(() => {
    const activeElement = itemRefs.current[activeItem];
    if (activeElement) {
      const rect = activeElement.getBoundingClientRect();
      const containerRect = activeElement.closest('.mobile-nav-container')?.getBoundingClientRect();
      if (containerRect) {
        const position = rect.left - containerRect.left + rect.width / 2;
        setIndicatorPosition(position);
      }
    }
  }, [activeItem]);

  const createNavHandler = (itemId: string, disabled?: boolean) => 
    useHapticTap(() => {
      if (!disabled && itemId !== activeItem) {
        onItemChange(itemId);
      }
    }, hapticFeedback ? 'light' : undefined);

  return (
    <motion.nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 mobile-nav-container",
        navVariants[variant],
        className
      )}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        ...animationConfig.spring.smooth,
        delay: 0.2,
      }}
    >
      {/* Active indicator */}
      <motion.div
        className="absolute top-0 h-1 bg-blue-600 rounded-b-full"
        style={{
          width: 32,
          x: indicatorPosition - 16,
        }}
        transition={animationConfig.spring.bouncy}
      />

      {/* Navigation items */}
      <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {items.map((item) => {
          const isActive = item.id === activeItem;
          const handlePress = createNavHandler(item.id, item.disabled);

          return (
            <motion.button
              key={item.id}
              ref={(el) => {itemRefs.current[item.id] = el}}
              onClick={handlePress}
              disabled={item.disabled}
              className={cn(
                "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 rounded-xl transition-all duration-200 relative",
                {
                  "bg-blue-50 text-blue-600": isActive && !item.disabled,
                  "text-gray-600 hover:text-gray-900 hover:bg-gray-50": !isActive && !item.disabled,
                  "opacity-50 cursor-not-allowed": item.disabled,
                }
              )}
              whileTap={!item.disabled ? { scale: 0.95 } : undefined}
              layout
            >
              {/* Icon container with animation */}
              <motion.div
                className="relative flex items-center justify-center mb-1"
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive && showLabels ? -2 : 0,
                }}
                transition={animationConfig.spring.bouncy}
              >
                {/* Icon */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={isActive ? 'active' : 'inactive'}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="w-6 h-6 flex items-center justify-center"
                  >
                    {isActive && item.activeIcon ? item.activeIcon : item.icon}
                  </motion.div>
                </AnimatePresence>

                {/* Badge */}
                {item.badge && item.badge > 0 && (
                  <motion.div
                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={animationConfig.spring.bouncy}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.div>
                )}
              </motion.div>

              {/* Label with animation */}
              {showLabels && (
                <motion.span
                  className={cn(
                    "text-xs font-medium leading-none",
                    {
                      "text-blue-600": isActive,
                      "text-gray-600": !isActive,
                    }
                  )}
                  animate={{
                    opacity: isActive ? 1 : 0.8,
                    scale: isActive ? 1.05 : 1,
                  }}
                  transition={animationConfig.spring.smooth}
                >
                  {item.label}
                </motion.span>
              )}

              {/* Active background glow */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 bg-blue-100 rounded-xl -z-10"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={animationConfig.spring.smooth}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Safe area padding for devices with home indicator */}
      <div className="safe-area-inset-bottom" />
    </motion.nav>
  );
};

// Floating Action Button that works with bottom nav
export interface MobileNavFABProps {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  hapticFeedback?: boolean;
}

export const MobileNavFAB: React.FC<MobileNavFABProps> = ({
  children,
  onClick,
  className,
  hapticFeedback = true,
}) => {
  const handlePress = useHapticTap(onClick, hapticFeedback ? 'medium' : undefined);

  return (
    <motion.button
      onClick={handlePress}
      className={cn(
        "fixed bottom-20 right-6 z-50 bg-blue-600 text-white rounded-full p-4 shadow-2xl hover:shadow-3xl min-w-[56px] min-h-[56px] flex items-center justify-center",
        className
      )}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{
        ...animationConfig.spring.bouncy,
        delay: 0.5,
      }}
    >
      {children}
    </motion.button>
  );
};

// Hook for managing bottom nav state
export const useMobileBottomNav = (defaultItem: string) => {
  const [activeItem, setActiveItem] = React.useState(defaultItem);
  
  const handleItemChange = React.useCallback((itemId: string) => {
    setActiveItem(itemId);
  }, []);

  return {
    activeItem,
    setActiveItem,
    handleItemChange,
  };
};

export default MobileBottomNav;