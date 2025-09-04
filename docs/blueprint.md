# **App Name**: Nomad Navigator

## Core Features:

- AI Itinerary Generator: Generates personalized day-by-day itineraries based on destination, travel dates, work requirements, visa status, budget, and lifestyle preferences using the OpenAI API. Uses a tool to decide on incorporation of particular events or locations.
- User Profile & Preferences: Allows users to input and store their work schedule, visa information, budget ranges, lifestyle preferences, and skills/interests.
- Nomad-Specific Database: Maintains a database of coworking spaces with ratings and amenities, time zone overlap information, cost of living comparisons, and local nomad community events. Read-only; allows browsing and display.
- Interactive Map: Displays an interactive map using the Google Maps API, highlighting recommended coworking spaces, cafes with WiFi, and points of interest. User can save points.
- Itinerary Sharing: Enables users to share their generated itineraries with travel companions via a shareable link.  Others can view but not edit.

## Style Guidelines:

- Primary color: Dark navy (#0E1A2B) for a sophisticated and trustworthy feel, inspired by Sera UI's dark theme.
- Secondary color: Light gray (#F0F2F5) for backgrounds, ensuring content stands out with a clean look as seen in the reference image.
- Accent color: Teal (#4AD4D4), used sparingly for interactive elements and highlights, providing a pop of color similar to the 'Popular Destinations' indicator.
- Headline font: 'Satoshi' (sans-serif) for a modern, clean, and readable aesthetic, aligning with Shadcn's component library style.
- Body font: 'Inter' (sans-serif) to ensure readability for long-form text and descriptions, complementing the 'Satoshi' headline font.
- Use clean, minimalist icons sourced from a Shadcn-compatible library (e.g., Lucide) to represent locations, activities, and amenities.
- Employ a card-based layout similar to the 'Popular Destinations' section in the reference image, utilizing Shadcn's Card component for a consistent and modern design.
- Incorporate subtle animations for loading states and transitions between itinerary sections using React Spring or Framer Motion, ensuring smooth user experience.