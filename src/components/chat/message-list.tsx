'use client';

import { memo, useEffect, useRef } from 'react';
import { useMotion } from '@/components/providers/motion-provider';
import { cn } from '@/lib/utils';
import type { Message } from './hooks/use-chat-state';
import MessageBubble from './message-bubble';

interface MessageListProps {
  messages: Message[];
  isGenerating: boolean;
  className?: string;
}

export const MessageList = memo(function MessageList({ 
  messages, 
  isGenerating,
  className 
}: MessageListProps) {
  const { motion, isLoaded } = useMotion();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const MotionDiv = isLoaded && motion ? motion.div : 'div';

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex-1 overflow-y-auto",
        "px-4 py-6 space-y-4",
        "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
        className
      )}
    >
      {messages.length === 0 && !isGenerating && (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-center">
            Start planning your trip by describing your travel preferences above.
          </p>
        </div>
      )}

      {messages.map((message, index) => (
        <MotionDiv
          key={index}
          {...(isLoaded ? {
            initial: { opacity: 0, y: 10 },
            animate: { opacity: 1, y: 0 },
            transition: { 
              duration: 0.3,
              delay: index * 0.05
            }
          } : {})}
        >
          <MessageBubble
            role={message.role}
            content={message.content}
            isStreaming={message.isStreaming}
          />
        </MotionDiv>
      ))}

      {isGenerating && messages.length === 0 && (
        <MotionDiv
          {...(isLoaded ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.3 }
          } : {})}
        >
          <MessageBubble
            role="assistant"
            content="Processing your request..."
            isStreaming={true}
          />
        </MotionDiv>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
});

export default MessageList;