# Accessibility Implementation Guide

## Overview
This document outlines the accessibility features implemented in the Nomad Navigator itinerary components following WCAG 2.1 AA guidelines.

## Components with Accessibility Features

### 1. Loading-skeleton.tsx
- **ARIA Labels**: Added `role="status"` and `aria-live="polite"` for screen reader announcements
- **Screen Reader Text**: Includes hidden text announcing "Loading your travel itinerary. Please wait."
- **Visual Elements**: Marked non-essential animations with `aria-hidden="true"`

### 2. Activity-card.tsx (Event Cards)
- **Keyboard Navigation**:
  - Enter/Space to expand/collapse cards
  - Tab to navigate between cards
  - Escape to close expanded state
- **ARIA Support**:
  - `role="button"` with `aria-expanded` state
  - Descriptive `aria-label` including activity type, title, and time
  - Location and rating information with proper labels
- **Focus Management**:
  - Visible focus ring (blue-500)
  - Focus restoration on Escape key

### 3. DestinationSwitcher.tsx
- **Keyboard Navigation**:
  - Arrow keys (Left/Right/Up/Down) to navigate between destinations
  - Home/End keys to jump to first/last destination
  - Enter to select destination
- **ARIA Support**:
  - `role="tablist"` and `role="tab"` for proper semantics
  - `aria-selected` for current selection
  - Descriptive labels including destination name and duration
- **Focus Management**:
  - Automatic focus update on selection
  - Visible focus indicators

### 4. Export-menu.tsx
- **Keyboard Support**:
  - Full keyboard navigation within dropdown
  - Escape key to close menu
- **Focus Management**:
  - Focus trap when menu is open
  - Focus restoration to trigger button on close
- **ARIA Support**:
  - `aria-haspopup` and `aria-expanded` on trigger
  - Descriptive labels for each export option
  - Live region announcements for success feedback
- **Status Indicators**:
  - Loading states announced ("Exporting...", "Generating PDF...")
  - Success confirmations via `aria-live="assertive"`

### 5. DayTimeline.tsx
- **Keyboard Navigation**:
  - Arrow keys to navigate between days
  - Home/End to jump to first/last day
  - Enter/Space to select and scroll to day section
- **ARIA Support**:
  - `role="tablist"` for day selector
  - Progress indicator with `role="progressbar"`
  - Descriptive labels including day number and date
- **Visual Feedback**:
  - Focus rings on all interactive elements
  - Scroll buttons with proper labels

## Utility Components

### SkipLinks.tsx
Provides skip navigation for keyboard users:
- Skip to main content
- Skip to itinerary
- Skip to destinations
- Automatically shows on focus, hides on blur

### LiveRegion.tsx
Announces dynamic content changes:
- Configurable priority (polite/assertive)
- Auto-clear after specified duration
- Hook for programmatic announcements

### focus-utils.ts
Focus management utilities:
- `trapFocus()`: Trap focus within modals/menus
- `restoreFocus()`: Restore previous focus
- `getFocusableElements()`: Get all focusable elements
- `announceToScreenReader()`: Programmatic announcements
- `navigateElements()`: Arrow key navigation helper

## Implementation Guidelines

### Focus Indicators
All interactive elements have:
- Visible focus ring (2px blue-500 with offset)
- High contrast (4.5:1 minimum)
- Consistent styling across components

### Keyboard Navigation Patterns
- **Tab/Shift+Tab**: Navigate between major sections
- **Arrow Keys**: Navigate within component groups
- **Enter/Space**: Activate buttons and controls
- **Escape**: Close modals, menus, and expanded states
- **Home/End**: Jump to first/last item in lists

### Screen Reader Support
- All interactive elements have descriptive labels
- Dynamic changes announced via live regions
- Loading states properly communicated
- Error states clearly announced

### Color and Contrast
- Minimum 4.5:1 contrast ratio for normal text
- 3:1 for large text and UI components
- Color not used as sole indicator of state

## Testing Recommendations

### Manual Testing
1. **Keyboard Only**: Navigate entire interface without mouse
2. **Screen Reader**: Test with NVDA (Windows) or VoiceOver (Mac)
3. **Focus Order**: Verify logical tab order
4. **Escape Routes**: Ensure users can exit all states

### Automated Testing
```bash
# Run accessibility tests
npm run test:a11y

# Lighthouse audit
npm run lighthouse
```

### Browser Testing
- Chrome DevTools Accessibility panel
- Firefox Accessibility Inspector
- axe DevTools extension

## Common Patterns

### Loading States
```tsx
<div role="status" aria-live="polite" aria-label="Loading content">
  <span className="sr-only">Loading, please wait...</span>
  {/* Visual loading indicator */}
</div>
```

### Interactive Cards
```tsx
<div
  role="button"
  tabIndex={0}
  aria-expanded={isExpanded}
  aria-label={descriptiveLabel}
  onKeyDown={handleKeyDown}
>
  {/* Card content */}
</div>
```

### Navigation Lists
```tsx
<div role="tablist" aria-label="Select option">
  <button
    role="tab"
    aria-selected={isSelected}
    tabIndex={isSelected ? 0 : -1}
  >
    {/* Option content */}
  </button>
</div>
```

## Future Improvements
- [ ] Add high contrast mode support
- [ ] Implement reduced motion preferences
- [ ] Add keyboard shortcut help dialog
- [ ] Enhance error message announcements
- [ ] Add focus visible polyfill for older browsers

## Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/TR/wai-aria-practices-1.1/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)