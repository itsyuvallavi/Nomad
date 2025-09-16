# /hooks - Custom React Hooks

This directory contains **custom React hooks** used across the application.

## ✅ What belongs here:
- Custom React hooks (must start with `use`)
- Hooks that encapsulate reusable logic
- Hooks for managing state, effects, or other React features
- Hooks that combine multiple React hooks

## ❌ What does NOT belong here:
- Regular utility functions (use `/lib`)
- React components (use `/components`)
- API calls (unless wrapped in a hook like `useAPI`)
- Non-hook functions

## 📁 Current Hooks:

- `use-keyboard-shortcuts.ts` - Keyboard shortcut handling
- `use-swipe-gestures.ts` - Touch/swipe gesture detection

## Hook Guidelines:

1. **Naming**: Must start with `use` (React convention)
2. **Purpose**: Encapsulate reusable stateful logic
3. **Returns**: Can return state, handlers, or both
4. **Side Effects**: Can use useEffect internally
5. **Composition**: Can use other hooks

## Examples:
- ✅ `useLocalStorage` - Syncs state with localStorage
- ✅ `useDebounce` - Debounces a value
- ✅ `useWindowSize` - Tracks window dimensions
- ✅ `useKeyPress` - Detects key presses
- ❌ `formatDate` (→ `/lib/helpers`)
- ❌ `Button` component (→ `/components`)
- ❌ API service (→ `/services`)