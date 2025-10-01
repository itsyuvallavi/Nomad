# Hooks Directory

Custom React hooks for reusable stateful logic.

## Current Hooks

```
hooks/
├── use-keyboard-shortcuts.ts  # Keyboard shortcut handling
├── use-motion-config.ts       # Animation/motion configuration
├── use-premium-gestures.ts    # Premium gesture features
├── use-service-worker.ts      # Service worker management
└── use-swipe-gestures.ts      # Touch/swipe gesture detection
```

## What Belongs Here

✅ **DO** place here:
- Custom React hooks (must start with `use`)
- Hooks that encapsulate reusable stateful logic
- Hooks for managing state, effects, or React features
- Hooks that compose multiple React hooks
- Hooks that provide abstraction over browser APIs

❌ **DON'T** place here:
- Regular utility functions → Use `src/lib/utils/`
- React components → Use `src/components/`
- Direct API calls → Use `src/services/api/`
- Non-hook functions → Use appropriate service or utility directory

## Hook Guidelines

### Naming Convention
- **Required prefix**: All hooks must start with `use`
- **Descriptive names**: `useKeyboardShortcuts`, not `useKB`
- **Action-oriented**: `useSwipeGestures`, not `useSwipe`

### Structure Requirements
1. **TypeScript**: All hooks must be fully typed
2. **JSDoc**: Include documentation for complex hooks
3. **Error Handling**: Handle errors gracefully
4. **Cleanup**: Return cleanup functions from useEffect
5. **Memoization**: Use useMemo/useCallback appropriately

## Usage Examples

```tsx
// Import a hook
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useSwipeGestures } from '@/hooks/use-swipe-gestures';

// Use in a component
function MyComponent() {
  const { isCtrlPressed } = useKeyboardShortcuts();
  const { onSwipeLeft, onSwipeRight } = useSwipeGestures();

  // Component logic...
}
```

## Hook Categories

### User Interaction
- `use-keyboard-shortcuts.ts` - Global keyboard shortcuts
- `use-swipe-gestures.ts` - Mobile swipe detection
- `use-premium-gestures.ts` - Advanced gesture features

### System Integration
- `use-service-worker.ts` - PWA service worker lifecycle
- `use-motion-config.ts` - Animation preferences

## Best Practices

1. **Single Responsibility**: Each hook should have one clear purpose
2. **Reusability**: Hooks should be generic enough to use across components
3. **Testing**: Include tests for complex hooks
4. **Performance**: Avoid unnecessary re-renders
5. **Dependencies**: Specify useEffect dependencies correctly