# ItineraryDisplay Component

## Overview

The `ItineraryDisplay` component is the main container for rendering AI-generated travel itineraries in the Nomad Navigator application. It provides a comprehensive, interactive interface for viewing, navigating, and managing multi-destination travel plans.

## Architecture

```
ItineraryDisplay/
├── index.tsx                    # Main component with state management
├── README.md                    # This documentation
└── (uses external components from parent directory)
```

## Props Interface

```typescript
interface ItineraryDisplayProps {
  initialItinerary: GeneratePersonalizedItineraryOutput;
  onRequestChanges?: (feedback: string) => void;
  isLoading?: boolean;
  className?: string;
}
```

### Prop Details

- **`initialItinerary`** (required): The AI-generated itinerary data object containing destinations, activities, and metadata
- **`onRequestChanges`** (optional): Callback function for handling user feedback and modification requests
- **`isLoading`** (optional): Loading state indicator for async operations
- **`className`** (optional): Additional CSS classes for custom styling

## Component Hierarchy

### Core Subcomponents

1. **ItineraryHeader**
   - Displays title, summary, and basic trip information
   - Handles export menu integration
   - Shows trip duration and destination count

2. **DestinationSwitcher**
   - Tab-based navigation between destinations
   - Visual indicators for current selection
   - Smooth transitions between views

3. **DestinationDetails**
   - Container for destination-specific content
   - Manages day-by-day activity display
   - Handles flight and accommodation information

4. **Activity-card**
   - Individual activity presentation
   - Interactive elements for activity details
   - Time and location information display

5. **Export-menu**
   - Multiple export format support (Text, Markdown, PDF, ICS)
   - Copy to clipboard functionality
   - Share capabilities

6. **Weather-widget**
   - Real-time weather display for destinations
   - Temperature and condition indicators
   - Integrated with each destination view

## Usage Example

```tsx
import { ItineraryDisplay } from '@/components/itinerary-components/itinerary/ItineraryDisplay';

function TripPage() {
  const [itinerary, setItinerary] = useState(initialData);

  const handleFeedback = (feedback: string) => {
    // Process user feedback
    console.log('User feedback:', feedback);
  };

  return (
    <ItineraryDisplay
      initialItinerary={itinerary}
      onRequestChanges={handleFeedback}
      isLoading={false}
      className="max-w-4xl mx-auto"
    />
  );
}
```

## Performance Considerations

### Optimizations Implemented

1. **React.memo Usage**
   - Applied to expensive child components
   - Prevents unnecessary re-renders on prop changes
   - Particularly important for activity lists

2. **useCallback Hooks**
   - Event handlers memoized to maintain referential equality
   - Reduces child component re-renders
   - Critical for list item interactions

3. **Lazy Loading**
   - Weather data fetched on-demand
   - Images loaded progressively
   - Export formatters loaded when needed

4. **State Management**
   - Local state for UI interactions
   - Minimal prop drilling through component tree
   - Efficient update patterns for lists

### Bundle Size Optimization

- Export formatters are dynamically imported
- PDF generation library loaded on-demand
- Icon imports optimized with tree-shaking

## Accessibility Features

### ARIA Support
- Proper ARIA labels on all interactive elements
- Live regions for dynamic content updates
- Keyboard navigation support throughout

### Keyboard Navigation
- Tab order follows logical content flow
- Arrow keys for destination switching
- Escape key for closing modals/menus

### Screen Reader Compatibility
- Semantic HTML structure
- Descriptive labels for all actions
- Status announcements for state changes

## State Management

The component manages several state aspects:

```typescript
// Active destination tracking
const [activeDestination, setActiveDestination] = useState(0);

// Activity expansion states
const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

// Export menu state
const [isExporting, setIsExporting] = useState(false);
```

## Error Handling

- Wrapped in ErrorBoundary for graceful failure recovery
- Fallback UI for missing data scenarios
- User-friendly error messages
- Console logging for debugging

## Theming and Styling

- Uses Tailwind CSS utility classes
- Dark mode support built-in
- Responsive design from mobile to desktop
- Customizable through className prop

## Data Flow

```
User Interaction
    ↓
ItineraryDisplay (State Management)
    ↓
├── DestinationSwitcher (Navigation)
├── DestinationDetails (Content)
│   └── Activity-card (Items)
└── Export-menu (Actions)
```

## Testing Considerations

### Unit Testing
- Test prop validation and default values
- Verify state updates on user interactions
- Check accessibility attributes

### Integration Testing
- Test destination switching functionality
- Verify export functionality
- Validate data flow through components

### E2E Testing
- Full user journey from viewing to exporting
- Multi-destination navigation
- Responsive behavior across viewports

## Future Enhancements

1. **Real-time Collaboration**
   - Share itinerary with travel companions
   - Collaborative editing capabilities
   - Activity voting system

2. **Advanced Filtering**
   - Filter activities by category
   - Time-based filtering
   - Budget range filters

3. **Map Integration**
   - Visual route planning
   - Interactive activity markers
   - Distance calculations

4. **Offline Support**
   - Progressive Web App capabilities
   - Local storage for offline viewing
   - Sync when connection restored

## Dependencies

- React 18+ (hooks, memo)
- TypeScript for type safety
- Tailwind CSS for styling
- Framer Motion for animations
- Lucide React for icons
- shadcn/ui components

## Maintenance Notes

- Keep activity data structure consistent
- Maintain TypeScript types when modifying
- Test export formats after data structure changes
- Update accessibility features with new interactions