/**
 * Header component for the itinerary page
 */

import { ArrowLeft, MessageSquare, Layers, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
    onReturn: () => void;
    mobileActiveTab: 'chat' | 'itinerary';
    setMobileActiveTab: (tab: 'chat' | 'itinerary') => void;
    currentItinerary: any;
    showShortcuts: boolean;
    setShowShortcuts: (show: boolean | ((prev: boolean) => boolean)) => void;
}

export function Header({
    onReturn,
    mobileActiveTab,
    setMobileActiveTab,
    currentItinerary,
    showShortcuts,
    setShowShortcuts
}: HeaderProps) {
    return (
        <div className="flex items-center justify-between p-4 border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <Button onClick={onReturn} variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
            </Button>

            {/* Mobile Tab Switcher */}
            <div className="flex md:hidden gap-2">
                <Button
                    variant={mobileActiveTab === 'chat' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMobileActiveTab('chat')}
                    className="gap-2"
                >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                </Button>
                {currentItinerary && (
                    <Button
                        variant={mobileActiveTab === 'itinerary' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMobileActiveTab('itinerary')}
                        className="gap-2"
                    >
                        <Layers className="w-4 h-4" />
                        Itinerary
                    </Button>
                )}
            </div>

            {/* Desktop Shortcuts Button */}
            <div className="hidden md:flex gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowShortcuts(prev => !prev)}
                    className="gap-1"
                >
                    <Info className="w-4 h-4" />
                    <span className="hidden sm:inline">Shortcuts</span>
                </Button>
            </div>
        </div>
    );
}