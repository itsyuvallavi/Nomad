# LocationIQ + AI Integration with Route Optimization

## The Complete Problem
1. LocationIQ needs **specific venue names** to find places
2. The itinerary must follow a **logical geographical flow** (no zigzagging across the city)
3. Activities should be grouped by **proximity** to minimize travel time

## Enhanced Implementation Strategy: Three-Stage Generation

```
User Input → OpenAI (with zones) → Specific Venues → LocationIQ → Route Optimization → Final Itinerary
```

## Stage 1: Zone-Based Planning

### Divide Cities into Logical Zones
OpenAI should first understand the city's geography and plan by zones:

```json
{
  "Paris_zones": {
    "Central": ["1st", "2nd", "3rd", "4th arrondissement"],
    "Left_Bank": ["5th", "6th", "7th arrondissement"],
    "Champs_Elysees": ["8th", "16th arrondissement"],
    "Montmartre": ["18th arrondissement"],
    "Marais": ["3rd", "4th arrondissement"]
  }
}
```

## Enhanced AI Prompt

```markdown
ITINERARY GENERATION RULES:

1. GEOGRAPHICAL FLOW (CRITICAL):
   - Group activities by neighborhood/district
   - Minimize travel between activities
   - Follow logical progression through the city
   - NEVER zigzag across the city

2. DAILY STRUCTURE:
   - Morning: Start in one area
   - Afternoon: Stay in same area or move to adjacent area
   - Evening: End near accommodation or nightlife district

3. VENUE REQUIREMENTS:
   For EVERY activity provide:
   - venue_name: Specific, real venue name
   - venue_search: Exact search string
   - neighborhood: Area/district of the city
   - nearby_activities: What else is close by

EXAMPLE OF GOOD FLOW (Paris Day 1):
Morning:
  - venue_name: "Café de Flore"
    neighborhood: "Saint-Germain (6th)"
  - venue_name: "Luxembourg Gardens"
    neighborhood: "Saint-Germain (6th)"
    note: "5 min walk from café"

Afternoon:
  - venue_name: "Musée d'Orsay"
    neighborhood: "Saint-Germain (7th)"
    note: "10 min walk from gardens"
  - venue_name: "L'As du Fallafel"
    neighborhood: "Marais (4th)"
    note: "Short metro ride or 20 min walk"

Evening:
  - venue_name: "Le Comptoir du Relais"
    neighborhood: "Saint-Germain (6th)"
    note: "Return to morning area for dinner"

EXAMPLE OF BAD FLOW (NEVER DO THIS):
Morning: Eiffel Tower (West) ❌
Lunch: Marais (East) ❌
Afternoon: Arc de Triomphe (West) ❌ [Zigzagging!]
Dinner: Belleville (East) ❌
```

## Stage 2: Route Optimization Service

**New File**: `src/services/ai/utils/route-optimizer.ts`

```typescript
import { calculateDistance } from '@/services/api/locationiq-geocoding';

export interface ActivityWithLocation {
  venue_name: string;
  coordinates?: { lat: number; lng: number };
  time_slot: 'morning' | 'afternoon' | 'evening';
  duration_hours: number;
}

export async function optimizeRoute(activities: ActivityWithLocation[]): Promise<ActivityWithLocation[]> {
  // Group by time slots first (maintain morning/afternoon/evening structure)
  const timeGroups = {
    morning: activities.filter(a => a.time_slot === 'morning'),
    afternoon: activities.filter(a => a.time_slot === 'afternoon'),
    evening: activities.filter(a => a.time_slot === 'evening')
  };

  // Optimize within each time slot
  const optimized = [];

  for (const slot of ['morning', 'afternoon', 'evening']) {
    const group = timeGroups[slot];
    if (group.length > 1) {
      // Sort by proximity using nearest neighbor algorithm
      const sorted = nearestNeighborSort(group);
      optimized.push(...sorted);
    } else {
      optimized.push(...group);
    }
  }

  return optimized;
}

function nearestNeighborSort(activities: ActivityWithLocation[]): ActivityWithLocation[] {
  if (activities.length <= 1) return activities;

  const sorted = [activities[0]];
  const remaining = [...activities.slice(1)];

  while (remaining.length > 0) {
    const current = sorted[sorted.length - 1];
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    // Find nearest unvisited activity
    remaining.forEach((activity, index) => {
      if (current.coordinates && activity.coordinates) {
        const distance = calculateDistance(
          current.coordinates,
          activity.coordinates
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      }
    });

    sorted.push(remaining[nearestIndex]);
    remaining.splice(nearestIndex, 1);
  }

  return sorted;
}

export function validateRouteEfficiency(activities: ActivityWithLocation[]): {
  isEfficient: boolean;
  totalDistance: number;
  warnings: string[];
} {
  let totalDistance = 0;
  const warnings = [];

  for (let i = 0; i < activities.length - 1; i++) {
    if (activities[i].coordinates && activities[i + 1].coordinates) {
      const distance = calculateDistance(
        activities[i].coordinates!,
        activities[i + 1].coordinates!
      );

      totalDistance += distance;

      // Warn if activities are too far apart (>5km)
      if (distance > 5) {
        warnings.push(
          `⚠️ ${activities[i].venue_name} to ${activities[i + 1].venue_name}: ${distance.toFixed(1)}km apart`
        );
      }
    }
  }

  return {
    isEfficient: warnings.length === 0,
    totalDistance,
    warnings
  };
}
```

## Stage 3: Zone-Aware Generation

**Update File**: `src/services/ai/flows/generate-personalized-itinerary.ts`

```typescript
async function generateOptimizedItinerary(prompt: string) {
  // Step 1: Generate zone-aware itinerary
  const enhancedPrompt = `
    ${prompt}

    IMPORTANT: Plan the itinerary by city zones/neighborhoods.
    Group activities in the same area together.
    Minimize travel time between activities.
  `;

  const rawItinerary = await generateWithZoneAwareness(enhancedPrompt);

  // Step 2: Enrich with LocationIQ
  for (const day of rawItinerary.itinerary) {
    for (const activity of day.activities) {
      const location = await enrichVenueWithLocation(activity, rawItinerary.destination);
      Object.assign(activity, location);
    }
  }

  // Step 3: Optimize route for each day
  for (const day of rawItinerary.itinerary) {
    const optimized = await optimizeRoute(day.activities);
    day.activities = optimized;

    // Validate the route
    const validation = validateRouteEfficiency(day.activities);
    if (!validation.isEfficient) {
      console.warn(`Day ${day.day} route warnings:`, validation.warnings);
      day._routeWarnings = validation.warnings;
    }
    day._totalDistance = validation.totalDistance;
  }

  return rawItinerary;
}
```

## Implementation of City Zone Templates

**New File**: `src/lib/constants/city-zones.ts`

```typescript
export const CITY_ZONES = {
  Paris: {
    zones: [
      {
        name: "Eiffel Tower & Trocadéro",
        arrondissements: ["7th", "16th"],
        attractions: ["Eiffel Tower", "Trocadéro", "Musée Rodin"],
        restaurants: ["Jules Verne", "Café de l'Homme"],
        coordinates: { lat: 48.8584, lng: 2.2945 }
      },
      {
        name: "Latin Quarter",
        arrondissements: ["5th", "6th"],
        attractions: ["Panthéon", "Luxembourg Gardens", "Shakespeare and Company"],
        restaurants: ["Café de Flore", "Les Deux Magots"],
        coordinates: { lat: 48.8462, lng: 2.3454 }
      },
      {
        name: "Marais",
        arrondissements: ["3rd", "4th"],
        attractions: ["Place des Vosges", "Jewish Quarter", "Centre Pompidou"],
        restaurants: ["L'As du Fallafel", "Breizh Café"],
        coordinates: { lat: 48.8566, lng: 2.3617 }
      }
    ]
  },
  London: {
    zones: [
      {
        name: "Westminster & South Bank",
        areas: ["Westminster", "Southbank"],
        attractions: ["Big Ben", "London Eye", "Tate Modern"],
        restaurants: ["Dishoom Covent Garden", "Borough Market"],
        coordinates: { lat: 51.5007, lng: -0.1246 }
      },
      {
        name: "Covent Garden & Soho",
        areas: ["Covent Garden", "Soho"],
        attractions: ["British Museum", "National Gallery"],
        restaurants: ["The Ivy", "Yauatcha"],
        coordinates: { lat: 51.5146, lng: -0.1243 }
      }
    ]
  }
  // Add more cities...
};

export function getZoneRecommendations(city: string, day: number): any {
  const cityZones = CITY_ZONES[city];
  if (!cityZones) return null;

  // Recommend zones for each day
  const dayPlans = {
    1: [cityZones.zones[0]], // Start with most famous area
    2: [cityZones.zones[1]], // Different area
    3: [cityZones.zones[2]], // Another area
  };

  return dayPlans[day] || cityZones.zones;
}
```

## Enhanced Prompt Template

**Update File**: `src/services/ai/utils/ITINERARY_GENERATION_PROMPT.md`

```markdown
## ROUTE OPTIMIZATION RULES

1. **Zone-Based Planning**:
   - Day 1: Focus on Central/Main tourist area
   - Day 2: Explore a different district
   - Day 3: Visit remaining must-see areas
   - NEVER jump between opposite ends of the city

2. **Time-Based Proximity**:
   - Morning activities: All within walking distance (max 15 min)
   - Lunch: Near morning or afternoon activities
   - Afternoon: Same zone as morning OR adjacent zone
   - Dinner: Near evening activity or accommodation

3. **Activity Clustering**:
   GOOD: Louvre → Tuileries → Place Vendôme → Opéra (all in line)
   BAD: Louvre → Montmartre → Marais → Eiffel Tower (zigzag)

4. **Transportation Awareness**:
   - Walking: Prefer for <1km distances
   - Metro/Bus: For 1-3km or different zones
   - Taxi: Only for late night or heavy rain
   - Note transport method between activities

## EXAMPLE OUTPUT FORMAT

```json
{
  "day": 1,
  "zone": "Central Paris - Louvre to Champs-Élysées",
  "activities": [
    {
      "time": "9:00 AM",
      "venue_name": "Angelina",
      "venue_search": "Angelina rue de Rivoli Paris",
      "activity": "Famous hot chocolate and pastries",
      "neighborhood": "1st arrondissement",
      "next_venue_distance": "2 min walk"
    },
    {
      "time": "10:00 AM",
      "venue_name": "Louvre Museum",
      "venue_search": "Musée du Louvre Paris",
      "activity": "World's largest art museum",
      "neighborhood": "1st arrondissement",
      "next_venue_distance": "5 min walk through Tuileries"
    },
    {
      "time": "2:00 PM",
      "venue_name": "L'Avenue",
      "venue_search": "L'Avenue restaurant Champs-Élysées",
      "activity": "Lunch with view of fashion crowd",
      "neighborhood": "8th arrondissement",
      "next_venue_distance": "10 min walk"
    }
  ],
  "transport_notes": "All activities walkable. Metro optional if tired.",
  "total_walking": "3.2 km"
}
```

## Success Metrics

1. **No Zigzagging**: Total daily travel distance < 10km
2. **Cluster Efficiency**: 80% of consecutive activities within 1.5km
3. **Zone Coherence**: Max 2-3 zones per day
4. **Time Efficiency**: No more than 30min transport between activities

## Testing the Flow

```javascript
// Test script to validate route optimization
async function testRouteOptimization() {
  const itinerary = await generateOptimizedItinerary("3 days in Paris");

  for (const day of itinerary.days) {
    console.log(`Day ${day.number}:`);
    console.log(`  Zone: ${day.zone}`);
    console.log(`  Total distance: ${day._totalDistance}km`);

    let previousCoords = null;
    for (const activity of day.activities) {
      if (previousCoords && activity.coordinates) {
        const distance = calculateDistance(previousCoords, activity.coordinates);
        console.log(`  → ${activity.venue_name} (${distance.toFixed(1)}km)`);
      } else {
        console.log(`  • ${activity.venue_name}`);
      }
      previousCoords = activity.coordinates;
    }

    if (day._routeWarnings) {
      console.log(`  ⚠️ Warnings: ${day._routeWarnings.join(', ')}`);
    }
  }
}
```

This approach ensures:
1. **Logical geographical flow** - No zigzagging
2. **Efficient use of time** - Minimal travel
3. **Better user experience** - More time enjoying, less time traveling
4. **LocationIQ optimization** - Specific venues that can be found