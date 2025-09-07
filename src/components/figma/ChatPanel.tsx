import { Settings, Mic, Send } from 'lucide-react';
import { motion } from 'framer-motion';

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
      <div className="flex items-center justify-between p-6 border-b border-slate-600/50">
        <div className="flex items-center gap-3">
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
          <span className="text-white font-medium">Nomad Navigator</span>
        </div>
        {onSettings && (
          <button 
            onClick={onSettings}
            className="w-8 h-8 text-slate-400 hover:text-white transition-colors"
          >
            <Settings size={20} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message, index) => (
          <motion.div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <div className={`max-w-[80%] ${
              message.role === 'user' 
                ? 'bg-blue-600 text-white rounded-2xl rounded-br-md' 
                : 'bg-slate-700/80 text-slate-100 rounded-2xl rounded-bl-md'
            } px-4 py-3`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
          </motion.div>
        ))}
        
        {isGenerating && (
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-slate-700/80 text-slate-100 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-slate-600/50">
        <div className="bg-slate-700/80 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3">
          <input
            type="text"
            placeholder={isGenerating ? "AI is thinking..." : "Ask anything..."}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            disabled={isGenerating}
            className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none disabled:opacity-50"
          />
          <div className="flex items-center gap-2">
            <button 
              className="w-6 h-6 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              disabled={isGenerating}
            >
              <Mic size={16} />
            </button>
            <button 
              onClick={onSendMessage}
              disabled={isGenerating || !inputValue.trim()}
              className="w-6 h-6 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <Send size={16} />
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