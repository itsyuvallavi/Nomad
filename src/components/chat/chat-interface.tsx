import { Settings, Mic, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { EmptyState } from '@/components/ui/empty-state';

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
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-600/50">
        <div className="flex items-center gap-2 md:gap-3">
          <motion.div 
            className="w-8 h-8 bg-white rounded-lg flex items-center justify-center"
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 1, 0]
            }}
            transition={{ 
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <motion.div 
              className="w-4 h-4 bg-slate-800 rounded-sm"
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                rotate: {
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                },
                scale: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
            />
          </motion.div>
          <span className="text-white font-medium text-sm md:text-base">Nomad Navigator</span>
        </div>
        {onSettings && (
          <button 
            onClick={onSettings}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <Settings size={20} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
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
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, delay: index * 0.03, ease: "easeOut" }}
          >
            <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[80%] ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}>
              {message.role === 'assistant' && (
                <motion.div 
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.03 + 0.1, type: "spring", stiffness: 500 }}
                >
                  <span className="text-white text-xs font-bold">AI</span>
                </motion.div>
              )}
              <motion.div 
                className={`${
                  message.role === 'user' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl rounded-br-md shadow-lg shadow-blue-500/20' 
                    : 'bg-gradient-to-r from-slate-700/90 to-slate-600/90 text-slate-100 rounded-2xl rounded-bl-md shadow-lg backdrop-blur-sm border border-slate-600/50'
                } px-4 py-3 transition-all hover:shadow-xl`}
                whileHover={{ scale: 1.02 }}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </motion.div>
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
                className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg"
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
              <div className="bg-gradient-to-r from-slate-700/90 to-slate-600/90 backdrop-blur-sm text-slate-100 rounded-2xl rounded-bl-md px-5 py-3 shadow-lg border border-slate-600/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      className="w-2.5 h-2.5 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full shadow-sm"
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
                      className="w-2.5 h-2.5 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full shadow-sm"
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
                      className="w-2.5 h-2.5 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full shadow-sm"
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
      <div className="p-4 md:p-6 border-t border-slate-600/50">
        <div className="bg-slate-700/80 backdrop-blur-sm rounded-2xl px-3 py-2 md:px-4 md:py-3 flex items-center gap-2 md:gap-3">
          <input
            type="text"
            placeholder={isGenerating ? "AI is thinking..." : "Ask anything..."}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            disabled={isGenerating}
            className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none disabled:opacity-50 text-base md:text-sm min-h-[24px]"
          />
          <div className="flex items-center gap-1 md:gap-2">
            <button 
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              disabled={isGenerating}
            >
              <Mic size={18} />
            </button>
            <button 
              onClick={onSendMessage}
              disabled={isGenerating || !inputValue.trim()}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
        
        <p className="text-slate-500 text-xs text-center mt-4">
          Nomad Navigator may contain errors. We recommend checking important information.
        </p>
      </div>
    </div>
  );
}