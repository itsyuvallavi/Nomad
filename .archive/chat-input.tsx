'use client';

import { memo, useCallback, KeyboardEvent } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear?: () => void;
  isGenerating: boolean;
  placeholder?: string;
  className?: string;
  showClearButton?: boolean;
}

export const ChatInput = memo(function ChatInput({
  value,
  onChange,
  onSubmit,
  onClear,
  isGenerating,
  placeholder = "Describe your travel plans or request changes...",
  className,
  showClearButton = false
}: ChatInputProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isGenerating) {
        onSubmit();
      }
    }
  }, [value, isGenerating, onSubmit]);

  const handleSubmit = useCallback(() => {
    if (value.trim() && !isGenerating) {
      onSubmit();
    }
  }, [value, isGenerating, onSubmit]);

  return (
    <div className={cn("border-t bg-background/95 backdrop-blur-sm p-4", className)}>
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isGenerating}
              className={cn(
                "min-h-[60px] max-h-[200px] resize-none pr-10",
                "focus:ring-2 focus:ring-orange-500/20",
                isGenerating && "opacity-50 cursor-not-allowed"
              )}
              rows={2}
            />
            {showClearButton && value && !isGenerating && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onClear}
                className="absolute right-2 top-2 h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || isGenerating}
            size="lg"
            className={cn(
              "px-4 bg-gradient-to-r from-orange-500 to-pink-500",
              "hover:from-orange-600 hover:to-pink-600",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-200"
            )}
          >
            {isGenerating ? (
              <Sparkles className="h-5 w-5 animate-pulse" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        {isGenerating && (
          <p className="text-xs text-muted-foreground mt-2 animate-pulse">
            AI is generating your itinerary...
          </p>
        )}
      </div>
    </div>
  );
});

export default ChatInput;