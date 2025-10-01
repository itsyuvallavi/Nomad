# Infrastructure Directory

React-specific infrastructure for app-wide functionality.

## Directory Structure

```
infrastructure/
├── components/                 # Infrastructure components
│   ├── ErrorBoundary.tsx      # Global error boundary
│   └── PasswordGate.tsx       # App access control
├── contexts/                   # Global React contexts
│   └── AuthContext.tsx        # Authentication context
└── providers/                  # App-wide providers
    ├── motion.tsx             # Framer Motion provider
    └── offline.tsx            # Offline functionality
```

## What Belongs Here

✅ **DO** place here:
- React Context providers for global state
- App-wide providers (motion, offline, theme)
- Infrastructure components (ErrorBoundary, guards)
- App-level wrappers and Higher-Order Components
- Global state management setup
- Root-level configuration components

❌ **DON'T** place here:
- Regular UI components → Use `src/components/`
- Page components → Use `src/pages/`
- Business logic → Use `src/services/`
- Utility functions → Use `src/lib/utils/`
- API integrations → Use `src/services/api/`

## Component Categories

### Providers (`/providers`)
App-wide React providers that wrap the entire application or major sections:
- **Motion Provider**: Framer Motion configuration and animations
- **Offline Provider**: PWA offline functionality and caching

### Contexts (`/contexts`)
Global state management using React Context API:
- **AuthContext**: User authentication state and methods
- Future contexts: Theme, Language, Settings

### Infrastructure Components (`/components`)
Critical system-level components:
- **ErrorBoundary**: Catches and handles React errors gracefully
- **PasswordGate**: Controls app access with password protection

## Usage Patterns

### In Root Layout
```tsx
// src/app/layout.tsx
import { AuthProvider } from '@/infrastructure/contexts/AuthContext';
import { MotionProvider } from '@/infrastructure/providers/motion';
import { OfflineProvider } from '@/infrastructure/providers/offline';
import ErrorBoundary from '@/infrastructure/components/ErrorBoundary';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <MotionProvider>
              <OfflineProvider>
                {children}
              </OfflineProvider>
            </MotionProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

### Consuming Contexts
```tsx
// In any component
import { useAuth } from '@/infrastructure/contexts/AuthContext';

function MyComponent() {
  const { user, login, logout } = useAuth();
  // Component logic...
}
```

## Best Practices

1. **Provider Hierarchy**: Order providers from most stable (auth) to most dynamic (theme)
2. **Error Boundaries**: Always wrap providers in error boundaries
3. **Lazy Loading**: Consider lazy loading heavy providers
4. **Context Splitting**: Split large contexts to prevent unnecessary re-renders
5. **Type Safety**: Fully type all context values and providers

## Architecture Notes

Infrastructure components are the foundation of the app and should:
- Be extremely stable and well-tested
- Have minimal dependencies
- Provide clear APIs for consuming components
- Handle edge cases and errors gracefully
- Be documented thoroughly for team understanding