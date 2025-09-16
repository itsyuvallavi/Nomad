/**
 * Premium Mobile Chat Input
 * Enhanced with voice input, haptic feedback, and mobile-first design
 */

'use client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Square, Paperclip, Smile, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { HAPTIC, animationConfig } from "@/lib/animations";
import { useHapticTap } from "@/hooks/use-premium-gestures";
import { PremiumButton } from "@/components/ui/premium-button";

export interface PremiumChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  isGenerating?: boolean;
  maxLength?: number;
  showAttachment?: boolean;
  showEmoji?: boolean;
  showVoice?: boolean;
  hapticFeedback?: boolean;
  autoResize?: boolean;
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onAttachment?: () => void;
  onEmojiClick?: () => void;
}

export const PremiumChatInput: React.FC<PremiumChatInputProps> = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  placeholder = "Type your message...",
  disabled = false,
  isGenerating = false,
  maxLength = 2000,
  showAttachment = true,
  showEmoji = true,
  showVoice = true,
  hapticFeedback = true,
  autoResize = true,
  onVoiceStart,
  onVoiceEnd,
  onAttachment,
  onEmojiClick,
}) => {
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingDuration, setRecordingDuration] = React.useState(0);
  const [isFocused, setIsFocused] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const recordingIntervalRef = React.useRef<NodeJS.Timeout>();

  const hasContent = value.trim().length > 0;
  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.8;
  const isAtLimit = charCount >= maxLength;

  // Auto-resize textarea
  React.useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value, autoResize]);

  // Voice recording handlers
  const startRecording = useHapticTap(() => {
    setIsRecording(true);
    setRecordingDuration(0);
    onVoiceStart?.();

    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  }, hapticFeedback ? 'medium' : undefined);

  const stopRecording = useHapticTap(() => {
    setIsRecording(false);
    onVoiceEnd?.();

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    setRecordingDuration(0);
  }, hapticFeedback ? 'light' : undefined);

  const handleSend = useHapticTap(() => {
    if (hasContent && !disabled && !isGenerating) {
      onSend();
    }
  }, hapticFeedback ? 'light' : undefined);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      if (hasContent && !disabled && !isGenerating) {
        handleSend();
      }
    }
    onKeyPress?.(e);
  };

  const formatRecordingTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      className="relative bg-white border-t border-gray-200 p-4 safe-area-inset-bottom"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={animationConfig.spring.smooth}
    >
      {/* Recording overlay */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            className="absolute inset-0 bg-red-500 bg-opacity-10 backdrop-blur-sm flex items-center justify-center z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-4 text-red-600">
              <motion.div
                className="w-4 h-4 bg-red-500 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="font-medium">
                Recording... {formatRecordingTime(recordingDuration)}
              </span>
              <PremiumButton
                size="iconSm"
                variant="destructive"
                onClick={stopRecording}
                hapticType="medium"
              >
                <Square className="w-4 h-4" />
              </PremiumButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input container */}
      <div
        className={cn(
          "flex items-end gap-3 p-3 rounded-2xl border-2 transition-all duration-200",
          {
            "border-blue-300 bg-blue-50/50": isFocused,
            "border-gray-200 bg-gray-50": !isFocused,
            "border-red-300 bg-red-50": isAtLimit,
          }
        )}
      >
        {/* Attachment button */}
        {showAttachment && (
          <PremiumButton
            size="iconSm"
            variant="ghost"
            onClick={onAttachment}
            hapticType="light"
            className="shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </PremiumButton>
        )}

        {/* Text input */}
        <div className="flex-1 relative">
          <motion.textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled || isRecording}
            maxLength={maxLength}
            className={cn(
              "w-full resize-none border-0 bg-transparent placeholder-gray-500 text-gray-900 text-base leading-relaxed focus:outline-none min-h-[24px] max-h-[120px]",
              {
                "text-red-600": isAtLimit,
              }
            )}
            style={{
              height: autoResize ? 'auto' : '24px',
            }}
          />

          {/* Character counter */}
          <AnimatePresence>
            {isNearLimit && (
              <motion.div
                className={cn(
                  "absolute -bottom-6 right-0 text-xs font-medium",
                  {
                    "text-orange-500": isNearLimit && !isAtLimit,
                    "text-red-500": isAtLimit,
                  }
                )}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                {charCount}/{maxLength}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right side buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Emoji button */}
          {showEmoji && !isRecording && (
            <PremiumButton
              size="iconSm"
              variant="ghost"
              onClick={onEmojiClick}
              hapticType="light"
            >
              <Smile className="w-5 h-5" />
            </PremiumButton>
          )}

          {/* Voice button */}
          {showVoice && !hasContent && (
            <PremiumButton
              size="iconSm"
              variant={isRecording ? "destructive" : "ghost"}
              onClick={isRecording ? stopRecording : startRecording}
              hapticType={isRecording ? "heavy" : "medium"}
            >
              {isRecording ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </PremiumButton>
          )}

          {/* Send button */}
          <AnimatePresence>
            {(hasContent || isGenerating) && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={animationConfig.spring.bouncy}
              >
                <PremiumButton
                  size="iconSm"
                  variant="default"
                  onClick={handleSend}
                  disabled={disabled || isGenerating || isAtLimit}
                  loading={isGenerating}
                  hapticType="light"
                  showRipple={true}
                >
                  <Send className="w-5 h-5" />
                </PremiumButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Suggestions or quick actions could go here */}
      <div className="mt-2 flex flex-wrap gap-2">
        {/* Placeholder for suggestions */}
      </div>
    </motion.div>
  );
};

export default PremiumChatInput;