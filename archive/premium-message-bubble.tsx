/**
 * Premium Message Bubble
 * Enhanced with swipe actions, haptic feedback, and smooth animations
 */

'use client';

import * as React from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Copy, Reply, Heart, MoreVertical, Trash2, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { HAPTIC, animationConfig, STAGGER_ITEM_VARIANTS } from "@/lib/animations";
import { usePremiumGestures } from "@/hooks/use-premium-gestures";

export interface MessageAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'destructive';
  onClick: () => void;
}

export interface PremiumMessageBubbleProps {
  content: string;
  isUser: boolean;
  timestamp?: Date;
  isGenerating?: boolean;
  metadata?: {
    confidence?: number;
    responseType?: string;
    processingTime?: number;
  };
  actions?: MessageAction[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  hapticFeedback?: boolean;
  showTimestamp?: boolean;
  showMetadata?: boolean;
  index?: number;
}

const defaultActions: MessageAction[] = [
  {
    id: 'copy',
    icon: <Copy className="w-4 h-4" />,
    label: 'Copy',
    onClick: () => {},
  },
  {
    id: 'reply',
    icon: <Reply className="w-4 h-4" />,
    label: 'Reply',
    onClick: () => {},
  },
];

export const PremiumMessageBubble: React.FC<PremiumMessageBubbleProps> = ({
  content,
  isUser,
  timestamp,
  isGenerating = false,
  metadata,
  actions = defaultActions,
  onSwipeLeft,
  onSwipeRight,
  onLongPress,
  onDoubleTap,
  hapticFeedback = true,
  showTimestamp = true,
  showMetadata = false,
  index = 0,
}) => {
  const [showActions, setShowActions] = React.useState(false);
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);

  // Gesture handlers
  const bind = usePremiumGestures({
    onSwipeLeft: () => {
      if (hapticFeedback) HAPTIC.light();
      onSwipeLeft?.();
    },
    onSwipeRight: () => {
      if (hapticFeedback) HAPTIC.light();
      onSwipeRight?.();
    },
    onLongPress: () => {
      if (hapticFeedback) HAPTIC.heavy();
      setShowActions(true);
      onLongPress?.();
    },
    onDoubleTap: () => {
      if (hapticFeedback) HAPTIC.medium();
      onDoubleTap?.();
    },
  });

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setDragOffset(info.offset.x);
    setIsDragging(Math.abs(info.offset.x) > 10);
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    setDragOffset(0);

    // Trigger swipe actions based on drag distance
    const swipeThreshold = 100;
    if (Math.abs(info.offset.x) > swipeThreshold) {
      if (info.offset.x > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
      if (hapticFeedback) HAPTIC.light();
    }
  };

  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const bubbleVariants = {
    ...STAGGER_ITEM_VARIANTS,
    animate: {
      ...STAGGER_ITEM_VARIANTS.animate,
      transition: {
        ...STAGGER_ITEM_VARIANTS.animate.transition,
        delay: index * 0.1,
      },
    },
  };

  return (
    <motion.div
      className={cn(
        "flex w-full px-4 py-2",
        {
          "justify-end": isUser,
          "justify-start": !isUser,
        }
      )}
      variants={bubbleVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div
        className={cn(
          "relative max-w-[80%] md:max-w-[70%] group",
          {
            "ml-12": !isUser, // Space for avatar on assistant messages
          }
        )}
        {...bind()}
        drag="x"
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.1}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x: dragOffset }}
        whileDrag={{ scale: 1.02 }}
      >
        {/* Swipe indicators */}
        <AnimatePresence>
          {isDragging && (
            <>
              {dragOffset > 50 && (
                <motion.div
                  className="absolute left-full top-1/2 -translate-y-1/2 ml-4 text-green-500"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Reply className="w-5 h-5" />
                </motion.div>
              )}
              {dragOffset < -50 && (
                <motion.div
                  className="absolute right-full top-1/2 -translate-y-1/2 mr-4 text-red-500"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Heart className="w-5 h-5" />
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>

        {/* Message bubble */}
        <motion.div
          className={cn(
            "relative px-4 py-3 rounded-3xl shadow-sm transition-all duration-200",
            {
              // User messages (right side)
              "bg-blue-600 text-white ml-auto": isUser,
              // Assistant messages (left side)
              "bg-white border border-gray-200 text-gray-900": !isUser,
              // Generating state
              "opacity-70": isGenerating,
            }
          )}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Message content */}
          <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </div>

          {/* Generating indicator */}
          {isGenerating && (
            <motion.div
              className="flex items-center gap-1 mt-2 opacity-60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    isUser ? "bg-blue-200" : "bg-gray-400"
                  )}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          )}

          {/* Timestamp */}
          {showTimestamp && timestamp && (
            <div
              className={cn(
                "text-xs mt-1 opacity-60",
                isUser ? "text-blue-100" : "text-gray-500"
              )}
            >
              {formatTime(timestamp)}
            </div>
          )}

          {/* Metadata */}
          {showMetadata && metadata && (
            <div className="mt-2 text-xs opacity-60 space-y-1">
              {metadata.confidence && (
                <div>Confidence: {Math.round(metadata.confidence * 100)}%</div>
              )}
              {metadata.responseType && (
                <div>Type: {metadata.responseType}</div>
              )}
              {metadata.processingTime && (
                <div>Processed in {metadata.processingTime}ms</div>
              )}
            </div>
          )}
        </motion.div>

        {/* Action menu */}
        <AnimatePresence>
          {showActions && (
            <>
              {/* Backdrop */}
              <motion.div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowActions(false)}
              />

              {/* Action buttons */}
              <motion.div
                className={cn(
                  "absolute z-50 bg-white rounded-2xl shadow-2xl border p-2 min-w-[200px]",
                  {
                    "right-0 top-full mt-2": isUser,
                    "left-0 top-full mt-2": !isUser,
                  }
                )}
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={animationConfig.spring.bouncy}
              >
                {actions.map((action, actionIndex) => (
                  <motion.button
                    key={action.id}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-left",
                      {
                        "text-red-600 hover:bg-red-50": action.variant === 'destructive',
                        "text-gray-900 hover:bg-gray-50": action.variant !== 'destructive',
                      }
                    )}
                    onClick={() => {
                      action.onClick();
                      setShowActions(false);
                      if (hapticFeedback) HAPTIC.light();
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: actionIndex * 0.05,
                      ...animationConfig.spring.smooth,
                    }}
                  >
                    {action.icon}
                    {action.label}
                  </motion.button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default PremiumMessageBubble;