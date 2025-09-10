# UI Update Implementation Plan

## Overview
Update the Nomad Navigator UI based on the Figma design in `/home/user/studio/Nomad_UI_v2.3`. The design features a modern, minimalist aesthetic with improved colors, component sizing, and new features.

## Design Analysis

### Color Scheme (from Figma design)
The new design uses an oklch color space with:
- **Light Mode:**
  - Background: #ffffff
  - Foreground: oklch(0.145 0 0) - Very dark gray/black
  - Primary: #030213 - Deep navy/black
  - Secondary: oklch(0.95 0.0058 264.53) - Light grayish
  - Muted: #ececf0 - Light gray
  - Muted Foreground: #717182 - Medium gray
  - Accent: #e9ebef - Very light gray
  - Border: rgba(0, 0, 0, 0.1) - Light border
  - Input Background: #f3f3f5 - Light gray background

- **Dark Mode:**
  - Background: oklch(0.145 0 0) - Very dark
  - Foreground: oklch(0.985 0 0) - Near white
  - Primary: oklch(0.985 0 0) - Near white
  - Secondary: oklch(0.269 0 0) - Dark gray
  - Muted: oklch(0.269 0 0) - Dark gray
  - Muted Foreground: oklch(0.708 0 0) - Medium light gray

### Key Design Features Identified
1. **Animated Logo:** Rotating square inside a rounded container with subtle scaling animation
2. **Clean Typography:** Tracking-tight headings, clear hierarchy
3. **Compact Layouts:** Efficient use of space with smaller components
4. **Rounded Corners:** Consistent radius of 0.625rem (10px)
5. **Subtle Borders:** Light borders with transparency
6. **Input Styling:** Rounded inputs with background fills instead of borders

### Component Structure (from Figma)
- **Chat Panel:** 320px width (w-80), left sidebar
- **Trip Overview:** Center panel, flexible width
- **Map View:** 384px width (w-96), right sidebar (toggleable)
- **Compact Components:** Smaller padding, tighter spacing

## Implementation Tasks

### Phase 1: Color System Update
1. Update `/src/app/globals.css` with new color variables
2. Convert HSL colors to oklch format for better color consistency
3. Add new CSS variables for input backgrounds and switch backgrounds

### Phase 2: Main Page Update
1. Update the start/search form design
2. Implement the animated logo component
3. Update button styles and input designs
4. Add the clean, centered layout from Figma

### Phase 3: Chat Interface Update
1. Implement new chat panel design (320px width)
2. Add animated logo to chat header
3. Update message bubble styles (rounded corners, new colors)
4. Implement compact input area with icon buttons
5. Add subtle animations for messages

### Phase 4: Itinerary Display Update
1. Update trip overview layout to be more compact
2. Implement new destination cards design
3. Update cost breakdown component
4. Add compact meta information grid
5. Implement proper spacing and sizing

### Phase 5: New Components
1. Create animated logo component with motion
2. Implement new authentication form design
3. Add trip actions component
4. Create refined map toggle button

### Phase 6: Testing & Polish
1. Test responsive behavior
2. Ensure dark mode works correctly
3. Verify all animations are smooth
4. Check accessibility

## Technical Approach

### Dependencies Needed
The Figma design uses:
- `motion` library for animations (already in project)
- `lucide-react` for icons (already in project)
- Radix UI components (already in project)

### Files to Modify
1. `/src/app/globals.css` - Color system
2. `/src/app/page.tsx` - Main app structure
3. `/src/components/forms/trip-search-form.tsx` - Start screen
4. `/src/components/chat/chat-container.tsx` - Chat interface
5. `/src/components/chat/chat-interface.tsx` - Chat UI
6. `/src/components/itinerary/itinerary-view.tsx` - Itinerary display
7. Create new: `/src/components/ui/animated-logo.tsx`

## MVP Approach
Focus on:
1. Color system update (biggest visual impact)
2. Main page design update
3. Chat interface refinement
4. Component sizing adjustments

Skip for now:
- Complex animations (can add later)
- Authentication UI (not currently used)
- Advanced map features

## Success Criteria
- Colors match the Figma design
- Components are properly sized and spaced
- Interface feels modern and clean
- Existing functionality remains intact
- Performance is not degraded