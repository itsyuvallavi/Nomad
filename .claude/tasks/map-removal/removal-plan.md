# Map Component Removal Plan

## Overview
Complete removal of all map-related functionality from the Nomad Navigator application.

## Files to Delete

### 1. Map Component Files (8 files)
```
src/pages/itinerary/components/map/
├── utils/geocoding.ts
├── Activity-marker.tsx
├── ItineraryMap.tsx
├── Locationiq-map.tsx
├── map-panel.tsx
├── MapView.tsx
├── MobileMapModal.tsx
└── Route-layer.tsx
```

### 2. Re-export Files (1 file)
```
src/components/map/itinerary-map.tsx
```

### 3. API Service File (if exists)
```
src/services/api/locationiq.ts
```

## Files to Modify

### 1. **src/pages/itinerary/ItineraryPage.tsx**
**Changes:**
- Remove imports: `MapPanel` from `./components/map/MapView`
- Remove imports: `MobileMapModal` from `./components/map/MobileMapModal`
- Remove import: `Map as MapIcon` from lucide-react
- Remove state: `showMapPanel`, `showMobileMapModal`
- Remove map toggle button in UI
- Remove MapPanel component rendering (lines 595-599)
- Remove MobileMapModal component rendering (lines 604-609)
- Remove keyboard shortcut for map toggle ('m' key)
- Update layout widths (remove map panel width calculations)

### 2. **src/pages/itinerary/components/itinerary/ItineraryDisplay.tsx**
**Changes:**
- Remove dynamic import of `ItineraryMap` (lines 20-27)
- Remove import: `Map` icon from lucide-react
- Remove state: `showMap`, `selectedMapDay`
- Remove map toggle button (lines 278-287)
- Remove entire map section rendering (lines 416-435)
- Remove map day selection buttons (lines 447-464)
- Remove map-related logic from `setSelectedMapDay` calls

### 3. **src/app/globals.css**
**Changes:**
- Remove leaflet CSS import: `@import 'leaflet/dist/leaflet.css';` (line 2)

### 4. **package.json**
**Changes:**
- Remove dependencies:
  - `leaflet`
  - `react-leaflet`
  - `@types/leaflet`
  - `maplibre-gl` (if not used elsewhere)
  - `radar-sdk-js` (if not used elsewhere)

## Archive Files (Already in .archive)
- `.archive/radar-map.tsx`
- `.archive/radar-places.ts`

## Verification Steps

### After Removal:
1. ✅ No imports of map components remain
2. ✅ No map-related state variables
3. ✅ No map-related UI elements (buttons, modals, panels)
4. ✅ No map API calls or geocoding functions
5. ✅ Layout adjusts properly without map panel
6. ✅ No console errors about missing map components
7. ✅ Build completes successfully
8. ✅ Type checking passes

## Impact Assessment

### Features Lost:
- Visual map display of itinerary locations
- Interactive day-by-day route visualization
- Activity markers on map
- Mobile map modal view
- Map toggle functionality

### Features Preserved:
- ✅ Full itinerary display with activities
- ✅ Day-by-day schedule view
- ✅ Location information in text format
- ✅ Export functionality
- ✅ Chat/refinement features
- ✅ All other core functionality

## Execution Order

1. **Phase 1: Remove imports and state**
   - Update ItineraryPage.tsx
   - Update ItineraryDisplay.tsx

2. **Phase 2: Remove UI elements**
   - Remove map toggle buttons
   - Remove map panels and modals
   - Adjust layouts

3. **Phase 3: Clean dependencies**
   - Update globals.css
   - Update package.json

4. **Phase 4: Delete files**
   - Delete all map component files
   - Delete re-export files
   - Delete API service files

5. **Phase 5: Verification**
   - Run type checking
   - Run build
   - Test application

## Ready to Execute?
This plan will completely remove all map functionality while preserving all other features of the application. The itinerary will continue to work with text-based location information only.