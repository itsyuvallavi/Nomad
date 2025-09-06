
'use client';

import { useState, useEffect, useRef } from 'react';
import { analyzeInitialPrompt } from '@/ai/flows/analyze-initial-prompt';
import { generatePersonalizedItinerary } from '@/ai/flows/generate-personalized-itinerary';
import ItineraryLoader from './itinerary-loader';
import type { FormValues } from './itinerary-form';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { ArrowUp, Bot, User, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { RecentSearch, ChatState } from '@/app/page';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatDisplayProps = {
    initialPrompt: FormValues;
    savedChatState?: ChatState;
    searchId?: string;
    onItineraryGenerated: (itinerary: GeneratePersonalizedItineraryOutput) => void;
    onError: (error: string) => void;
    onReturn: () => void;
};

export default function ChatDisplay({
    initialPrompt,
    savedChatState,
    searchId,
    onItineraryGenerated,
    onError,
    onReturn,
}: ChatDisplayProps) {
    const [messages, setMessages] = useState<Message[]>(savedChatState?.messages || []);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(!savedChatState);
    const [isGenerating, setIsGenerating] = useState(false);
    const [hasAskedQuestions, setHasAskedQuestions] = useState(savedChatState?.hasAskedQuestions || false);
    const currentSearchId = useRef(searchId || new Date().toISOString());

    const chatContainerRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
        
        // Save chat state whenever messages change, but only if not completed
        if (messages.length > 0 && !(savedChatState?.isCompleted)) {
            saveChatStateToStorage();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, hasAskedQuestions]);
    
    const saveChatStateToStorage = () => {
        try {
            const storedSearches = localStorage.getItem('recentSearches');
            const recentSearches: RecentSearch[] = storedSearches ? JSON.parse(storedSearches) : [];
            
            const existingIndex = recentSearches.findIndex(s => s.id === currentSearchId.current);
            
            const chatState: ChatState = {
                messages,
                hasAskedQuestions,
                isCompleted: false, // This will be set to true only when itinerary is generated
                itinerary: undefined
            };
            
            const searchEntry: RecentSearch = {
                id: currentSearchId.current,
                prompt: initialPrompt.prompt,
                fileDataUrl: initialPrompt.fileDataUrl,
                chatState,
                title: initialPrompt.prompt, // Use the prompt as title until itinerary is generated
                lastUpdated: new Date().toISOString()
            };
            
            if (existingIndex >= 0) {
                recentSearches[existingIndex] = searchEntry;
            } else {
                recentSearches.unshift(searchEntry);
            }
            
            localStorage.setItem('recentSearches', JSON.stringify(recentSearches.slice(0, 5)));
        } catch (e) {
            console.error('Could not save chat state:', e);
        }
    };

    useEffect(() => {
        // If we have a saved state, we're resuming. Check if it's already completed.
        if (savedChatState) {
            if (savedChatState.isCompleted && savedChatState.itinerary) {
                onItineraryGenerated(savedChatState.itinerary);
            }
            setIsLoading(false);
            return; // IMPORTANT: Stop here if we're resuming a chat.
        }
        
        // This logic runs only for a NEW chat session
        const getQuestions = async () => {
            setIsLoading(true);
            try {
                const result = await analyzeInitialPrompt({
                    prompt: initialPrompt.prompt,
                    attachedFile: initialPrompt.fileDataUrl,
                });
                
                const validQuestions = (result.questions || []).filter(q => q && q.trim().length > 0);
                
                if (validQuestions.length > 0) {
                    const questionMessage = validQuestions[0]; // Should be a single combined message
                    setMessages([
                        { role: 'user', content: initialPrompt.prompt },
                        { role: 'assistant', content: questionMessage }
                    ]);
                    setHasAskedQuestions(true);
                } else {
                    setMessages([
                        { role: 'user', content: initialPrompt.prompt },
                        { role: 'assistant', content: "Great, I have all the information I need. I'm now generating your personalized itinerary..." }
                    ]);
                    await generateItinerary(initialPrompt.prompt);
                }

            } catch (e) {
                console.error('[ChatDisplay] Error in getQuestions:', e);
                onError("Sorry, I had trouble understanding your request. Please try again.");
            } finally {
                setIsLoading(false);
            }
        };

        if (messages.length === 0) {
            getQuestions();
        }
        
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const generateItinerary = async (fullPrompt: string) => {
        setIsGenerating(true);
        try {
            const itinerary = await generatePersonalizedItinerary({
                prompt: fullPrompt,
                attachedFile: initialPrompt.fileDataUrl,
            });
            
            try {
                const storedSearches = localStorage.getItem('recentSearches');
                let recentSearches: RecentSearch[] = storedSearches ? JSON.parse(storedSearches) : [];
                
                const existingIndex = recentSearches.findIndex(s => s.id === currentSearchId.current);
                
                // Final "assistant" message before showing itinerary
                const finalAssistantMessage = {role: 'assistant', content: "Here is your generated itinerary."};

                const searchEntry: RecentSearch = {
                    id: currentSearchId.current,
                    prompt: initialPrompt.prompt,
                    fileDataUrl: initialPrompt.fileDataUrl,
                    chatState: {
                      messages: [...messages, finalAssistantMessage],
                      hasAskedQuestions: true,
                      isCompleted: true,
                      itinerary,
                    },
                    title: itinerary.title || initialPrompt.prompt,
                    lastUpdated: new Date().toISOString()
                };
                
                if (existingIndex >= 0) {
                    recentSearches[existingIndex] = searchEntry;
                } else {
                    recentSearches.unshift(searchEntry);
                }

                localStorage.setItem('recentSearches', JSON.stringify(recentSearches.slice(0, 5)));
            } catch (e) {
                console.error("Could not save completed search to localStorage", e);
            }

            onItineraryGenerated(itinerary);
        } catch (e) {
            console.error('[ChatDisplay] Error generating itinerary:', e);
            onError("I'm sorry, there was an error creating your itinerary. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    }

    const handleUserInputSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        // Combine all previous messages and the new user input to create a full context
        const fullPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n') + `\nuser: ${userInput}`;
        
        setMessages(prev => [
            ...prev, 
            { role: 'user', content: userInput },
            { role: 'assistant', content: "Great, I have all the information I need. I'm now generating your personalized itinerary..." }
        ]);
        
        setUserInput('');
        await generateItinerary(fullPrompt);
    };
    
    if (isGenerating) {
      return (
         <main className="flex-1 flex items-center justify-center p-6">
            <ItineraryLoader />
        </main>
      )
    }

    return (
        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-medium text-lg">Chat</h2>
                    <Button variant="ghost" onClick={onReturn} className="text-slate-300 hover:text-white hover:bg-slate-700">
                        <ArrowLeft className="mr-2 h-4 w-4" /> New Search
                    </Button>
                </div>
                 <div ref={chatContainerRef} className="flex-1 space-y-4 overflow-y-auto pr-2">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                             {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    <Bot size={20} className="text-white" />
                                </div>
                            )}
                            <div className={`rounded-lg px-4 py-2 text-white max-w-[80%] whitespace-pre-line ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                <p className="text-sm">{msg.content}</p>
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    <User size={20} className="text-white" />
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                <Bot size={20} className="text-white" />
                            </div>
                            <div className="rounded-lg px-4 py-2 text-white bg-slate-700">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                 <form onSubmit={handleUserInputSubmit} className="mt-4 flex items-center gap-2">
                    <Input
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Type your answer..."
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                        disabled={isLoading || !hasAskedQuestions}
                    />
                    <Button type="submit" size="icon" className="bg-slate-700 hover:bg-slate-600 text-white" disabled={isLoading || !userInput.trim()}>
                        <ArrowUp size={20} />
                    </Button>
                </form>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <ItineraryLoader />
            </div>
        </main>
    );
}
