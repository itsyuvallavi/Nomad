# Components Directory

Reusable React components for the user interface.

## Directory Structure

```
components/
├── auth/                    # Authentication components
│   └── ProtectedRoute.tsx   # Route protection wrapper
├── common/                  # Shared components
│   ├── AnimatedLogo.tsx    # Animated logo component
│   ├── EmptyState.tsx      # Empty state display
│   └── ProtectedRoute.tsx  # Route protection wrapper
├── layout/                  # Layout components
│   └── scrollable-page.tsx # Scrollable page wrapper
├── navigation/             # Navigation components
│   ├── Header.tsx          # App header
│   ├── mobile-bottom-nav.tsx # Mobile bottom navigation
│   └── auth/               # Auth UI components
│       ├── AuthModal.tsx   # Authentication modal
│       ├── AuthSuccess.tsx # Success message component
│       ├── ForgotPasswordForm.tsx
│       ├── LoginForm.tsx   # Login form component
│       ├── SignupForm.tsx  # Signup form component
│       └── UserMenu.tsx    # User dropdown menu
└── ui/                     # Base UI components (shadcn/ui)
    ├── alert-dialog.tsx    # Alert dialog component
    ├── alert.tsx           # Alert messages
    ├── avatar.tsx          # User avatars
    ├── badge.tsx           # Badge labels
    ├── button.tsx          # Button component
    ├── card.tsx            # Card containers
    ├── checkbox.tsx        # Checkbox input
    ├── dialog.tsx          # Modal dialogs
    ├── dropdown-menu.tsx   # Dropdown menus
    ├── error-dialog.tsx    # Error display dialog
    ├── form.tsx            # Form components
    ├── input.tsx           # Text inputs
    ├── label.tsx           # Form labels
    ├── lazy-image.tsx      # Lazy-loaded images
    ├── scrollable-page.tsx # Page scroll wrapper
    ├── select.tsx          # Select dropdowns
    ├── separator.tsx       # Visual separator
    ├── switch.tsx          # Toggle switches
    ├── tabs.tsx            # Tab navigation
    ├── textarea.tsx        # Text area input
    └── tooltip.tsx         # Tooltip component
```

## What Belongs Here

✅ **DO** place here:
- Reusable UI components used across multiple pages
- Shared component logic and styles
- Components that accept props for customization
- UI primitives and building blocks
- Navigation and layout components

❌ **DON'T** place here:
- Page-specific components → Use `src/app/[page]/components/`
- Business logic → Use `src/services/`
- Utility functions → Use `src/lib/utils/`
- API integrations → Use `src/services/api/`
- Type definitions → Use `src/types/`

## Component Guidelines

1. **Reusability**: Components should be generic and reusable across different pages
2. **Props-based**: Use props for customization rather than hard-coded values
3. **Type Safety**: Include TypeScript interfaces for all props
4. **Documentation**: Add JSDoc comments for complex components
5. **Single Responsibility**: Each component should have one clear purpose

## Usage Examples

```tsx
// Import a UI component
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Import navigation component
import { Header } from '@/components/navigation/Header';

// Import auth component
import { LoginForm } from '@/components/navigation/auth/LoginForm';

// Import common component
import { EmptyState } from '@/components/common/EmptyState';
```

## Component Categories

### UI Components (`/ui`)
Basic building blocks from shadcn/ui library. These are primitive components that form the foundation of the UI.

### Common Components (`/common`)
Shared components that combine UI primitives for specific use cases across the application.

### Navigation Components (`/navigation`)
Components related to app navigation, including headers, menus, and navigation bars.

### Auth Components (`/auth` & `/navigation/auth`)
Authentication-related components including forms, modals, and user menus.

### Layout Components (`/layout`)
Page layout and structure components for consistent app layouts.