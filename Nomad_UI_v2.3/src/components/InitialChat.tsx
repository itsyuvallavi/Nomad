import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Mic, Plus } from 'lucide-react';

interface InitialChatProps {
  onSendMessage: (message: string) => void;
}

export function InitialChat({ onSendMessage }: InitialChatProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleQuickTest = () => {
    onSendMessage('Plan a 5-day trip to London with coworking spaces and local experiences');
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Logo */}
        <motion.div
          className="inline-flex items-center justify-center w-16 h-16 bg-foreground rounded-2xl mx-auto"
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
            className="w-8 h-8 bg-background rounded-lg"
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

        {/* Welcome Text */}
        <div className="space-y-2">
          <h1 className="text-2xl tracking-tight text-foreground">Hi, I'm Nomad Navigator</h1>
          <p className="text-muted-foreground">Can I help you with anything?</p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Plus className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Find the best co-working spaces"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-xl px-12 py-4 text-foreground placeholder-muted-foreground outline-none focus:border-foreground/30 transition-colors"
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Test Button */}
          <Button
            type="button"
            onClick={handleQuickTest}
            variant="outline"
            className="border-border hover:bg-muted/50 text-sm"
          >
            Quick Test: London Trip
          </Button>
        </form>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground mt-8">
          Nomad Navigator may contain errors. We recommend checking important information.
        </p>
      </div>
    </div>
  );
}