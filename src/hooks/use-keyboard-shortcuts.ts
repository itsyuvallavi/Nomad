import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled = true) {
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Skip if user is typing in an input field
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      // Allow Ctrl/Cmd+Enter to submit even in input fields
      if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') {
        return;
      }
    }
    
    shortcuts.forEach(shortcut => {
      const ctrlPressed = event.ctrlKey || event.metaKey; // Support both Ctrl and Cmd
      const matchesCtrl = shortcut.ctrl ? ctrlPressed : !ctrlPressed;
      const matchesShift = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const matchesAlt = shortcut.alt ? event.altKey : !event.altKey;
      const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
      
      if (matchesKey && matchesCtrl && matchesShift && matchesAlt) {
        event.preventDefault();
        shortcut.action();
      }
    });
  }, [shortcuts, enabled]);
  
  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [handleKeyPress, enabled]);
}

// Common shortcuts for the app
export const commonShortcuts = {
  newSearch: { key: 'n', ctrl: true, description: 'Start new search' },
  exportPDF: { key: 'e', ctrl: true, description: 'Export to PDF' },
  toggleMap: { key: 'm', ctrl: true, description: 'Toggle map view' },
  focusChat: { key: '/', description: 'Focus chat input' },
  submitMessage: { key: 'Enter', ctrl: true, description: 'Send message' },
  clearChat: { key: 'k', ctrl: true, description: 'Clear chat' },
  help: { key: '?', shift: true, description: 'Show keyboard shortcuts' },
  escape: { key: 'Escape', description: 'Close dialogs/modals' },
  nextDay: { key: 'ArrowRight', description: 'Next day' },
  prevDay: { key: 'ArrowLeft', description: 'Previous day' },
  expandAll: { key: 'a', ctrl: true, shift: true, description: 'Expand all days' },
  collapseAll: { key: 'a', ctrl: true, alt: true, description: 'Collapse all days' }
};