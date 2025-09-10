import { Settings, Mic, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { EmptyState } from '@/components/ui/empty-state';
import { AnimatedLogo } from '@/components/ui/animated-logo';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  messages: Message[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isGenerating: boolean;
  onSettings?: () => void;
}

export function ChatPanel({
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
  onKeyPress,
  isGenerating,
  onSettings
}: ChatPanelProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <AnimatedLogo size="sm" />
          <div>
            <h2 className="text-foreground font-medium">Nomad Navigator</h2>
            <p className="text-xs text-muted-foreground">AI Assistant</p>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
            <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[80%] ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}>
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-foreground text-xs font-bold">AI</span>
                </div>
              )}
              <div className={`max-w-[85%] ${
                message.role === 'user' 
                  ? 'bg-foreground text-background rounded-lg rounded-br-sm' 
                  : 'bg-muted text-foreground rounded-lg rounded-bl-sm'
              } px-3 py-2`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
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
      </div>

      {/* Input Area */}
      <div className="p-6 pt-4 border-t border-border">
        <div className="bg-muted/50 rounded-lg px-4 py-3 flex items-center gap-3 border border-border">
          <input
            type="text"
            placeholder={isGenerating ? "AI is thinking..." : "Ask about your trip..."}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            disabled={isGenerating}
            className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-sm"
          />
          <div className="flex items-center gap-2">
            <button 
              className="w-6 h-6 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
              disabled={isGenerating}
            >
              <Mic size={16} />
            </button>
            <button 
              onClick={onSendMessage}
              disabled={isGenerating || !inputValue.trim()}
              className="w-6 h-6 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
        
        <p className="text-muted-foreground text-xs text-center mt-3">
          AI responses may contain errors. Please verify important details.
        </p>
      </div>
    </div>
  );
}