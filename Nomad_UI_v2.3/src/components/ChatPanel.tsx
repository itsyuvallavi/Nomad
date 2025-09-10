import { Settings, Mic, Send, LogOut } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Separator } from './ui/separator';
import { InitialChat } from './InitialChat';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  onLogout?: () => void;
}

export function ChatPanel({ onLogout }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = (messageContent?: string) => {
    const content = messageContent || inputValue;
    if (!content.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    
    // Add AI response after a short delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I'll help you plan that trip! Let me create a detailed itinerary for you based on your requirements.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);

    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show initial chat interface if no messages
  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center"
              animate={{ 
                scale: [1, 1.02, 1],
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.div 
                className="w-4 h-4 bg-background rounded-sm"
                animate={{ 
                  rotate: 360,
                }}
                transition={{ 
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </motion.div>
            <div>
              <h2 className="text-foreground font-medium">Nomad Navigator</h2>
              <p className="text-xs text-muted-foreground">AI Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </button>
            {onLogout && (
              <button 
                onClick={onLogout}
                className="w-8 h-8 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <Separator />

        {/* Initial Chat Interface */}
        <div className="flex-1">
          <InitialChat onSendMessage={handleSendMessage} />
        </div>
      </div>
    );
  }

  // Show regular chat interface with messages
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center"
            animate={{ 
              scale: [1, 1.02, 1],
            }}
            transition={{ 
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <motion.div 
              className="w-4 h-4 bg-background rounded-sm"
              animate={{ 
                rotate: 360,
              }}
              transition={{ 
                duration: 8,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </motion.div>
          <div>
            <h2 className="text-foreground font-medium">Nomad Navigator</h2>
            <p className="text-xs text-muted-foreground">AI Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-8 h-8 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </button>
          {onLogout && (
            <button 
              onClick={onLogout}
              className="w-8 h-8 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <Separator />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <div className={`max-w-[85%] ${
              message.type === 'user' 
                ? 'bg-foreground text-background rounded-lg rounded-br-sm' 
                : 'bg-muted text-foreground rounded-lg rounded-bl-sm'
            } px-3 py-2`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-6 pt-4">
        <Separator className="mb-4" />
        <div className="bg-muted/50 rounded-lg px-4 py-3 flex items-center gap-3 border border-border">
          <input
            type="text"
            placeholder="Ask about your trip..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-sm"
          />
          <div className="flex items-center gap-2">
            <button className="w-6 h-6 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleSendMessage()}
              className="w-6 h-6 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
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