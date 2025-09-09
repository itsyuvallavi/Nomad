# Three-Column Layout with Map

## Objective
Split the screen into 3 columns when the map is enabled:
- **Left**: Chat interface (conversation)
- **Center**: Itinerary details
- **Right**: Interactive map

## Current Layout
Currently, we have a 2-column layout with chat and itinerary side-by-side. The map is embedded within the itinerary panel.

## Proposed Layout

### Desktop (when map is enabled)
```
[Chat (30%)] [Itinerary (40%)] [Map (30%)]
```

### Desktop (when map is disabled)
```
[Chat (40%)] [Itinerary (60%)]
```

### Mobile/Tablet
Keep the current tabbed interface - no changes needed.

## Implementation Plan

### 1. Modify chat-container.tsx
- Add state for map visibility at the container level
- Pass map state to both ChatDisplay and ItineraryPanel
- Adjust grid layout based on map state

### 2. Extract Map Component
- Move map from inside ItineraryPanel to standalone panel
- Share itinerary data between center and right panels
- Maintain sync between map selection and itinerary scroll

### 3. Responsive Grid Layout
```tsx
<div className={cn(
  "grid h-full",
  showMap 
    ? "lg:grid-cols-[30%_40%_30%]"  // 3 columns with map
    : "lg:grid-cols-[40%_60%]"       // 2 columns without map
)}>
  <ChatInterface />
  <ItineraryPanel />
  {showMap && <MapPanel />}
</div>
```

### 4. Map Panel Features
- Full height of viewport
- Independent scroll from itinerary
- Zoom/pan controls
- Day filter buttons
- Sync with itinerary selection

### 5. UI Controls
- Map toggle button in header
- Resize handles between panels (optional)
- Collapse/expand animations

## Benefits
1. **Better use of screen space** - Map always visible while browsing itinerary
2. **Improved context** - See locations while reading activities
3. **Enhanced navigation** - Click map to jump to day in itinerary
4. **Professional layout** - Similar to travel planning tools like Google Travel

## Technical Considerations
- Minimum screen width: 1280px for 3-column layout
- Below 1280px: Keep current 2-column with embedded map
- Performance: Map renders only when visible
- State management: Share selected day between panels

## Future Enhancements
- Draggable panel dividers
- Save layout preferences
- Picture-in-picture map for mobile
- Split view options (horizontal/vertical)