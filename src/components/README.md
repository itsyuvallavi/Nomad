# /components - Reusable UI Components

This directory contains **reusable React components** for the user interface.

## ✅ What belongs here:
- Reusable UI components
- Shared component logic
- Component-specific styles
- Components used across multiple pages

## ❌ What does NOT belong here:
- Page-specific components (use `/pages/[page]/components`)
- Infrastructure components (use `/infrastructure/components`)
- Business logic (use `/services`)
- Utility functions (use `/lib`)

## 📁 Subdirectories:

### `/ui`
Base UI components (mostly from shadcn/ui)
- Buttons, inputs, cards, dialogs
- Form elements
- Basic UI building blocks

### `/common`
Shared components used across pages
- `AnimatedLogo.tsx` - Logo with animation
- `EmptyState.tsx` - Empty state display
- `ProtectedRoute.tsx` - Route protection wrapper

### `/navigation`
Navigation components
- `Header.tsx` - App header
- `/auth` - Authentication UI components (login, signup forms)

## Component Guidelines:
- Components here should be reusable
- Should not contain page-specific business logic
- Should accept props for customization
- Should be well-documented with TypeScript interfaces

## Examples:
- ✅ Button component
- ✅ Navigation header
- ✅ Form input components
- ✅ Modal dialogs
- ❌ HomePage component (→ `/pages/home`)
- ❌ Trip-specific form (→ `/pages/home/components`)
- ❌ API calls (→ `/services`)