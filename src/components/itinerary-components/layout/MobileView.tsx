/**
 * Mobile view layout component
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';
import { ChatPanel } from '../chat/ChatPanel';
import { ItineraryPanel } from '../itinerary/ItineraryDisplay';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/types/core.types';

interface MobileViewProps {
    mobileActiveTab: 'chat' | 'itinerary';
    messages: any[];
    userInput: string;
    setUserInput: (value: string) => void;
    handleSendMessage: () => void;
    isGenerating: boolean;
    currentItinerary: GeneratePersonalizedItineraryOutput | null;
    swipeHandlers: any;
}

export function MobileView({
    mobileActiveTab,
    messages,
    userInput,
    setUserInput,
    handleSendMessage,
    isGenerating,
    currentItinerary,
    swipeHandlers
}: MobileViewProps) {
    const itineraryContainerRef = useRef<HTMLDivElement>(null);

    return (
        <div className="flex md:hidden w-full" {...swipeHandlers}>
            <AnimatePresence mode="wait">
                {mobileActiveTab === 'chat' ? (
                    <motion.div
                        key="chat"
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -100, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                    >
                        <ChatPanel
                            messages={messages}
                            inputValue={userInput}
                            onInputChange={setUserInput}
                            onSendMessage={handleSendMessage}
                            onKeyPress={(e: React.KeyboardEvent) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            isGenerating={isGenerating}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="itinerary"
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 100, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-full"
                        ref={itineraryContainerRef}
                    >
                        {currentItinerary && (
                            <ItineraryPanel
                                key="mobile-itinerary-panel"
                                itinerary={currentItinerary}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}