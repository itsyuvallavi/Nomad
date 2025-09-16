# /infrastructure - React Infrastructure

This directory contains **React-specific infrastructure** components and setup that provide app-wide functionality.

## ✅ What belongs here:
- React Context providers
- App-wide React providers (motion, offline, theme)
- Infrastructure components (ErrorBoundary, guards)
- App-level wrappers and HOCs
- Global state management setup

## ❌ What does NOT belong here:
- Regular UI components (use `/components`)
- Page components (use `/pages`)
- Business logic (use `/services`)
- Utility functions (use `/lib`)

## 📁 Subdirectories:

### `/providers`
React providers that wrap the app
- `motion.tsx` - Framer Motion provider
- `offline.tsx` - Offline functionality provider

### `/contexts`
React contexts for global state
- `AuthContext.tsx` - Authentication context and provider

### `/components`
Infrastructure-level components
- `ErrorBoundary.tsx` - Global error boundary
- `PasswordGate.tsx` - App access control component

## Usage:
These are typically used in `app/layout.tsx` or at the root level to provide app-wide functionality.

## Examples:
- ✅ Authentication context
- ✅ Theme provider
- ✅ Error boundary
- ✅ App-wide motion provider
- ❌ Button component (→ `/components/ui`)
- ❌ API service (→ `/services`)
- ❌ Utility function (→ `/lib`)