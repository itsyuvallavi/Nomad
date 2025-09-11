/**
 * Enhanced Chat Example - Shows how to use Phase 4 components with Phase 3 dialog system
 * This demonstrates the complete integration of the enhanced dialog architecture
 */

'use client';

import React from 'react';
import { ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChatPanel } from './chat-interface';
import { ConversationContextDisplay } from './context-display';
import { useEnhancedChat } from '@/hooks/use-enhanced-chat';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedChatExampleProps {
  onBack?: () => void;
  onItineraryGenerated?: (itinerary: any) => void;
}

export function EnhancedChatExample({ 
  onBack, 
  onItineraryGenerated 
}: EnhancedChatExampleProps) {
  const [showContext, setShowContext] = React.useState(false);
  
  const {
    messages,
    conversationState,
    isGenerating,
    inputValue,
    setInputValue,
    sendMessage,
    clearConversation,
    suggestions,
    handleQuickAction,
    showMetadata,
    toggleMetadata,
    error
  } = useEnhancedChat({
    userId: 'demo-user',
    onItineraryGenerated,
    onError: (error) => console.error('Chat error:', error)
  });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft size={16} />
              </Button>
            )}
            <div>
              <h1 className="font-semibold">Enhanced Chat Demo</h1>
              <p className="text-sm text-muted-foreground">
                Phase 3 Dialog System + Phase 4 UI Integration
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {conversationState && (
              <Badge variant="outline">
                {conversationState.metadata.messageCount} messages
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleMetadata}
            >
              <Info size={16} className="mr-1" />
              {showMetadata ? 'Hide' : 'Show'} Debug
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowContext(!showContext)}
            >
              Context
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <div className="flex items-center gap-2 text-red-800">
              <Info size={16} />
              <span className="text-sm font-medium">Error: {error}</span>
            </div>
          </div>
        )}

        {/* Chat Interface */}
        <div className="flex-1">
          <ChatPanel
            messages={messages}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSendMessage={sendMessage}
            onKeyPress={handleKeyPress}
            isGenerating={isGenerating}
            conversationState={conversationState}
            showMetadata={showMetadata}
            onQuickAction={handleQuickAction}
            suggestions={suggestions}
          />
        </div>
      </div>

      {/* Context Sidebar */}
      <AnimatePresence>
        {showContext && conversationState && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="border-l border-border bg-muted/10 overflow-hidden"
          >
            <div className="p-4 h-full overflow-y-auto">
              <ConversationContextDisplay
                conversationState={conversationState}
                onClearContext={clearConversation}
                onEditDestination={(dest) => console.log('Edit destination:', dest)}
                onEditOrigin={() => console.log('Edit origin')}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default EnhancedChatExample;