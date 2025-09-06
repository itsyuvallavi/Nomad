
'use client';

import { useState, useEffect } from 'react';
import { analyzeInitialPrompt } from '@/ai/flows/analyze-initial-prompt';
import ItineraryLoader from './itinerary-loader';
import type { FormValues } from './itinerary-form';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';

type ChatDisplayProps = {
    initialPrompt: FormValues | null;
    onItineraryGenerated: (itinerary: GeneratePersonalizedItineraryOutput) => void;
    onError: (error: string) => void;
};

export default function ChatDisplay({
    initialPrompt,
    onItineraryGenerated,
    onError,
}: ChatDisplayProps) {
    const [questions, setQuestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (initialPrompt) {
            const getQuestions = async () => {
                setIsLoading(true);
                try {
                    const result = await analyzeInitialPrompt({
                        prompt: initialPrompt.prompt,
                        attachedFile: initialPrompt.fileDataUrl,
                    });
                    setQuestions(result.questions);
                } catch (e) {
                    console.error(e);
                    onError("Sorry, I had trouble understanding your request. Please try again.");
                } finally {
                    setIsLoading(false);
                }
            };
            getQuestions();
        }
    }, [initialPrompt, onError]);

    return (
        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6">
                <h2 className="text-white font-medium text-lg mb-4">Chat</h2>
                {/* Chat interface will go here */}
                <div className="text-slate-400">
                    <p>Chat placeholder</p>
                </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <ItineraryLoader />
            </div>
        </main>
    );
}
