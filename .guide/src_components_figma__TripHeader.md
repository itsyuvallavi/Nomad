# File Explanation: `src/components/figma/_TripHeader.tsx`

## Summary

This file defines a presentational component named `TripHeader`. Its purpose is to display the main, high-level details of a travel itinerary in a visually distinct header section. This includes the destination, dates, budget, and number of travelers.

**Note:** The underscore `_` at the beginning of the filename (`_TripHeader.tsx`) is a common convention to indicate that a file is a "partial" or that it might be deprecated or not currently in use. In the context of this project, this component is **not currently being used** in the main application flow. The itinerary panel (`ItineraryPanel.tsx`) now handles the display of this information itself. This file is likely a remnant from an earlier design.

---

## Detailed Breakdown

### Imports

```typescript
import { MapPin, Calendar, DollarSign, Users } from 'lucide-react';
import { motion } from 'framer-motion';
```
- **`lucide-react`**: Imports icons that visually represent the data being displayed (`MapPin` for destination, `Calendar` for dates, etc.).
- **`framer-motion`**: This library is used to add a simple fade-in and slide-up animation to the header, making it appear smoothly on the page.

### Interface (`TripHeaderProps`)

```typescript
interface TripHeaderProps {
  destination: string;
  dates: string;
  budget: string;
  travelers: number;
}
```
- This TypeScript interface defines the data the component expects to receive as props. It clearly lays out the required information: `destination`, `dates`, `budget`, and `travelers`.

### JSX Structure

```jsx
export function TripHeader({ destination, dates, budget, travelers }: TripHeaderProps) {
  return (
    <motion.div
      className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* ... Title Section ... */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ... Info Items ... */}
      </div>
    </motion.div>
  );
}
```
- **`motion.div`**: The entire component is wrapped in this animated div from Framer Motion. The `initial`, `animate`, and `transition` props configure the fade-in and slide-up effect.
- **Styling**: `bg-slate-800/50 backdrop-blur-sm` creates a semi-transparent, blurred background effect that helps the header stand out from the content behind it. `rounded-2xl`, `p-6`, and `mb-6` handle the shape, internal padding, and external margin.

#### Title Section

```jsx
<div className="flex items-center gap-3 mb-4">
  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 ...">
    <MapPin className="w-6 h-6 text-white" />
  </div>
  <div>
    <h1 className="text-white text-2xl font-medium">{destination}</h1>
    <p className="text-slate-400">AI-generated itinerary for digital nomads</p>
  </div>
</div>
```
- This section displays the main title. It uses a flexbox layout (`flex items-center`) to align a large `MapPin` icon next to the `destination` name and a subtitle.

#### Info Grid

```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="flex items-center gap-2 text-slate-300">
    <Calendar className="w-4 h-4" />
    <span className="text-sm">{dates}</span>
  </div>
  {/* ... other items for budget and travelers ... */}
</div>
```
- This `div` uses a CSS Grid layout (`grid`). On small screens, it's a single column (`grid-cols-1`), and on medium screens and up (`md:grid-cols-3`), it switches to a three-column layout.
- Each item in the grid is a flex container that pairs an icon (e.g., `Calendar`) with its corresponding text data (e.g., the `dates` string), providing a clean and scannable summary of the trip's key details.