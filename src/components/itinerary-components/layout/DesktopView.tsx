/**
 * Desktop view layout component
 */

import { ChatPanel } from '../chat/ChatPanel';
import { ItineraryPanel } from '../itinerary/ItineraryDisplay';
import { ModernLoadingPanel } from '../chat/LoadingProgress';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/types/core.types';

type StandardProgressStage = 'understanding' | 'planning' | 'generating' | 'finalizing';

interface DesktopViewProps {
    messages: any[];
    userInput: string;
    setUserInput: (value: string) => void;
    handleSendMessage: () => void;
    isGenerating: boolean;
    currentItinerary: GeneratePersonalizedItineraryOutput | null;
    generationProgress: {
        stage: string;
        percentage: number;
        message: string;
        estimatedTimeRemaining?: number;
    };
}

export function DesktopView({
    messages,
    userInput,
    setUserInput,
    handleSendMessage,
    isGenerating,
    currentItinerary,
    generationProgress
}: DesktopViewProps) {
    return (
        <div className="hidden md:flex w-full gap-4 p-4">
            <div className="w-1/2">
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
            </div>
            <div className="w-1/2">
                {currentItinerary ? (
                    <ItineraryPanel
                        key="itinerary-panel"
                        itinerary={currentItinerary}
                    />
                ) : (
                    <ModernLoadingPanel
                        key="loading-panel"
                        progress={{
                            ...generationProgress,
                            stage: (generationProgress.stage === 'analyzing' ? 'planning' : generationProgress.stage) as StandardProgressStage
                        }}
                    />
                )}
            </div>
        </div>
    );
}