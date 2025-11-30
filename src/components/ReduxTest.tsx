/**
 * Redux Test Component
 *
 * Simple component to verify Redux is working in the live app
 * Displays Redux state and allows interaction
 */

'use client';

import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectCurrentView,
  selectIsLoading,
  selectShowShortcuts,
  selectIsMobile,
  setView,
  setLoading,
  toggleShortcuts,
  setIsMobile,
} from '@/store/slices/uiSlice';
import {
  selectMessages,
  selectIsGenerating,
  selectMessageCount,
  addMessage,
  setGenerating,
} from '@/store/slices/conversationSlice';
import {
  selectCurrentItinerary,
  selectHasItinerary,
} from '@/store/slices/tripSlice';

export function ReduxTest() {
  const dispatch = useAppDispatch();

  // UI Slice
  const currentView = useAppSelector(selectCurrentView);
  const isLoading = useAppSelector(selectIsLoading);
  const showShortcuts = useAppSelector(selectShowShortcuts);
  const isMobile = useAppSelector(selectIsMobile);

  // Conversation Slice
  const messages = useAppSelector(selectMessages);
  const isGenerating = useAppSelector(selectIsGenerating);
  const messageCount = useAppSelector(selectMessageCount);

  // Trip Slice
  const currentItinerary = useAppSelector(selectCurrentItinerary);
  const hasItinerary = useAppSelector(selectHasItinerary);

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-xl max-w-md z-50 text-xs font-mono">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-green-400">🎉 Redux Live Test</h3>
        <div className="text-[10px] text-green-400">● Connected</div>
      </div>

      {/* UI State */}
      <div className="mb-3 border-t border-gray-700 pt-2">
        <div className="font-bold text-yellow-400 mb-1">UI State:</div>
        <div className="space-y-1 pl-2">
          <div>View: <span className="text-cyan-400">{currentView}</span></div>
          <div>Loading: <span className="text-cyan-400">{isLoading ? 'Yes' : 'No'}</span></div>
          <div>Shortcuts: <span className="text-cyan-400">{showShortcuts ? 'Visible' : 'Hidden'}</span></div>
          <div>Mobile: <span className="text-cyan-400">{isMobile ? 'Yes' : 'No'}</span></div>
        </div>
      </div>

      {/* Conversation State */}
      <div className="mb-3 border-t border-gray-700 pt-2">
        <div className="font-bold text-yellow-400 mb-1">Conversation State:</div>
        <div className="space-y-1 pl-2">
          <div>Messages: <span className="text-cyan-400">{messageCount.total}</span></div>
          <div>Generating: <span className="text-cyan-400">{isGenerating ? 'Yes' : 'No'}</span></div>
        </div>
      </div>

      {/* Trip State */}
      <div className="mb-3 border-t border-gray-700 pt-2">
        <div className="font-bold text-yellow-400 mb-1">Trip State:</div>
        <div className="space-y-1 pl-2">
          <div>Has Itinerary: <span className="text-cyan-400">{hasItinerary ? 'Yes' : 'No'}</span></div>
        </div>
      </div>

      {/* Test Actions */}
      <div className="border-t border-gray-700 pt-2">
        <div className="font-bold text-yellow-400 mb-2">Test Actions:</div>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => dispatch(toggleShortcuts())}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-[10px]"
          >
            Toggle Shortcuts
          </button>
          <button
            onClick={() => dispatch(setLoading(!isLoading))}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-[10px]"
          >
            Toggle Loading
          </button>
          <button
            onClick={() => dispatch(setIsMobile(!isMobile))}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-[10px]"
          >
            Toggle Mobile
          </button>
          <button
            onClick={() => dispatch(setGenerating(!isGenerating))}
            className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-[10px]"
          >
            Toggle Generating
          </button>
          <button
            onClick={() => dispatch(addMessage({
              role: 'user',
              content: `Test message ${Date.now()}`,
            }))}
            className="bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-[10px] col-span-2"
          >
            Add Test Message
          </button>
          <button
            onClick={() => {
              dispatch(setView('chat'));
              alert('View changed to "chat" - check Redux DevTools!');
            }}
            className="bg-purple-600 hover:bg-purple-700 px-2 py-1 rounded text-[10px] col-span-2"
          >
            Change View to Chat
          </button>
        </div>
      </div>

      <div className="mt-3 text-[10px] text-gray-400 border-t border-gray-700 pt-2">
        💡 Open Redux DevTools in browser to see state changes!
      </div>
    </div>
  );
}
