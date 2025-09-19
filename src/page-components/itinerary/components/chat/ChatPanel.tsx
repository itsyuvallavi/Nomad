import { Settings, Mic, Send, MessageCircle, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyState } from '@/components/common/EmptyState';
import { AnimatedLogo } from '@/components/common/AnimatedLogo';
import { Badge } from '@/components/ui/badge';
import { ConversationState, DialogResponse } from '@/services/ai/flows/generate-dialog-response';
import { ClassificationResult, ParseResult } from '@/services/ai/utils/hybrid-parser';

// Enhanced message interface with metadata from Phase 3
interface EnhancedMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    classification?: ClassificationResult;
    parseResult?: ParseResult;
    confidence?: number;
    responseType?: string;
    processingTime?: number;
    requiresFollowUp?: boolean;
  };
}

// Legacy message for backward compatibility
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  messages: Message[] | EnhancedMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isGenerating: boolean;
  onSettings?: () => void;
  // Phase 3 enhancements
  conversationState?: ConversationState;
  showMetadata?: boolean;
  onQuickAction?: (action: string, data?: any) => void;
  suggestions?: string[];
}

export function ChatPanel({
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  onKeyPress,
  isGenerating,
  onSettings,
  conversationState,
  showMetadata = false,
  onQuickAction,
  suggestions = []
}: ChatPanelProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header - Compact on mobile */}
      <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-border">
        <div className="flex items-center gap-2 sm:gap-3">
          <AnimatedLogo size="sm" />
          <div>
            <h2 className="text-sm sm:text-base text-foreground font-medium">Nomad Navigator</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">AI Assistant</p>
              {conversationState && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {conversationState.metadata?.messageCount || 0} messages
                </Badge>
              )}
            </div>
          </div>
        </div>
        {onSettings && (
          <button 
            onClick={onSettings}
            className="w-8 h-8 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
          >
            <Settings size={20} />
          </button>
        )}
      </div>

      {/* Messages - Optimized padding for mobile */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
        {messages.length === 0 ? (
          <EmptyState 
            type="no-messages" 
            title="Ready to Plan Your Journey?"
            description="Share your destination and travel dates, and I'll create an amazing itinerary for you!"
          />
        ) : (
          messages.map((message, index) => (
          <motion.div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.03, ease: "easeOut" }}
          >
            <div className={`flex items-end gap-1.5 sm:gap-2 max-w-[90%] sm:max-w-[85%] md:max-w-[80%] ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}>
              {message.role === 'assistant' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-foreground text-[10px] sm:text-xs font-bold">AI</span>
                </div>
              )}
              <div className={`${
                message.role === 'user' 
                  ? 'bg-foreground text-background rounded-lg rounded-br-sm' 
                  : 'bg-muted text-foreground rounded-lg rounded-bl-sm'
              } px-2.5 sm:px-3 py-1.5 sm:py-2`}>
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                
                {/* Enhanced metadata display for Phase 3 */}
                {'metadata' in message && message.metadata && showMetadata && (
                  <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                    {message.metadata.classification && (
                      <div className="flex items-center gap-2 text-xs">
                        <MessageCircle size={10} />
                        <span className="text-muted-foreground">
                          Type: {message.metadata.classification.type}
                        </span>
                        {message.metadata.confidence && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            {Math.round(message.metadata.confidence * 100)}% confidence
                          </Badge>
                        )}
                      </div>
                    )}
                    {message.metadata.processingTime && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock size={10} />
                        <span>{message.metadata.processingTime}ms</span>
                      </div>
                    )}
                    {message.metadata.requiresFollowUp && (
                      <div className="flex items-center gap-2 text-xs text-amber-600">
                        <AlertCircle size={10} />
                        <span>Awaiting response</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))
        )}
        
        {isGenerating && (
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div className="flex items-end gap-2">
              <motion.div 
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
                animate={{ 
                  rotate: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                  scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                }}
              >
                <span className="text-white text-xs font-bold">AI</span>
              </motion.div>
              <div className="bg-muted text-foreground rounded-lg rounded-bl-sm px-3 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      className="w-2 h-2 bg-muted-foreground rounded-full"
                      animate={{ 
                        y: [0, -10, 0],
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{ 
                        duration: 1.2, 
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-muted-foreground rounded-full"
                      animate={{ 
                        y: [0, -10, 0],
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{ 
                        duration: 1.2, 
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.2
                      }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-muted-foreground rounded-full"
                      animate={{ 
                        y: [0, -10, 0],
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.2, 0.8]
                      }}
                      transition={{ 
                        duration: 1.2, 
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.4
                      }}
                    />
                  </div>
                  <motion.span 
                    className="text-sm bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent font-medium"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    Crafting your perfect itinerary...
                  </motion.span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Quick suggestions from Phase 3 dialog system */}
        {suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 px-2"
          >
            {suggestions.map((suggestion, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onQuickAction?.('suggestion', suggestion)}
                className="text-xs px-3 py-1.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full border border-border hover:border-foreground/20 transition-colors"
              >
                {suggestion}
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Conversation Context Indicator */}
      {conversationState && conversationState.context.destinations.length > 0 && (
        <div className="px-6 py-2 border-t border-border bg-muted/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle size={12} className="text-green-600" />
            <span>
              Planning: {conversationState.context.destinations.join(', ')}
              {conversationState.context.origin && ` from ${conversationState.context.origin}`}
            </span>
            {conversationState.currentItinerary && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-2">
                {conversationState.currentItinerary.totalDays} days
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Input Area - Mobile optimized */}
      <div className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 border-t border-border">
        <div className="bg-muted/50 rounded-lg px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 border border-border min-h-[44px]">
          <input
            type="text"
            placeholder={isGenerating ? "AI is thinking..." : "Ask about your trip..."}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            disabled={isGenerating}
            className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-xs sm:text-sm"
          />
          <div className="flex items-center gap-1 sm:gap-2">
            <button 
              className="min-w-[32px] min-h-[32px] sm:w-6 sm:h-6 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
              disabled={isGenerating}
            >
              <Mic className="w-4 h-4 sm:w-4 sm:h-4" />
            </button>
            <button 
              onClick={onSendMessage}
              disabled={isGenerating || !inputValue.trim()}
              className="min-w-[32px] min-h-[32px] sm:w-6 sm:h-6 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
        
        <p className="text-muted-foreground text-[10px] sm:text-xs text-center mt-2 sm:mt-3">
          AI responses may contain errors. Verify important details.
        </p>
      </div>
    </div>
  );
}