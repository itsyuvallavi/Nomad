# AI Static Data

Static data files and configurations used by the AI service for trip generation.

**Last Updated**: January 25, 2025

## Overview

This directory contains static data that powers various AI features, including city zone definitions for route optimization, attraction databases, and activity templates. This data is used to enhance AI-generated itineraries with local knowledge and optimize routing.

## Files

### city-zones.ts (6,930 lines)
Geographic zone definitions for major cities to optimize daily routing.

### city-attractions.ts (3,980 lines)
Curated database of popular attractions and venues.

### static-activities.json (15,614 lines)
Pre-defined activity templates for various interests and occasions.

## City Zones System

### Purpose
The city zones system groups neighborhoods and areas into logical zones to:
- Minimize travel time between activities
- Group activities by proximity
- Create more efficient daily plans
- Reduce transportation costs

### Structure
```typescript
export interface Zone {
  name: string;
  center: { lat: number; lng: number };
  neighborhoods: string[];
  priority?: number;  // Lower number = higher priority
  description?: string;
}
```

### Supported Cities
Currently includes zone data for 10 major cities:
- **London** - 5 zones (Central, West End, South Bank, East, North)
- **Paris** - 6 zones (Central, Champs-Élysées, Montmartre, Latin Quarter, Marais, Belleville)
- **Rome** - 4 zones (Historic Center, Vatican, Trastevere, Modern Center)
- **Tokyo** - 7 zones (Shinjuku, Shibuya, Roppongi, Asakusa, Ginza, Odaiba, Harajuku)
- **New York** - 6 zones (Midtown, Downtown, Brooklyn, Upper East, Upper West, Harlem)
- **Barcelona** - 5 zones (Gothic Quarter, Eixample, Gràcia, Barceloneta, Montjuïc)
- **Amsterdam** - 4 zones (Center, Jordaan, De Pijp, Noord)
- **Berlin** - 5 zones (Mitte, Prenzlauer Berg, Kreuzberg, Charlottenburg, Friedrichshain)
- **Sydney** - 5 zones (CBD, Harbour, Eastern Beaches, Inner West, North Shore)
- **Dubai** - 6 zones (Downtown, Marina, Jumeirah, Deira, Business Bay, Palm)

### Usage Example
```typescript
import { getCityZones, getClosestZone } from '../data/city-zones';

// Get all zones for a city
const parisZones = getCityZones('paris');

// Find closest zone to coordinates
const zone = getClosestZone('paris', 48.8566, 2.3522);
// Returns: { name: 'Central Paris', ... }
```

## City Attractions Database

### Structure
```typescript
interface Attraction {
  name: string;
  category: 'museum' | 'landmark' | 'park' | 'market' | 'religious' | 'viewpoint';
  zone: string;
  mustSee: boolean;
  duration: number;  // Visit duration in hours
  bestTime?: 'morning' | 'afternoon' | 'evening' | 'night';
  coordinates?: { lat: number; lng: number };
  description?: string;
}
```

### Categories
- **Museums**: Art galleries, history museums, science centers
- **Landmarks**: Iconic buildings, monuments, bridges
- **Parks**: Gardens, nature areas, recreational spaces
- **Markets**: Local markets, food halls, shopping areas
- **Religious**: Churches, temples, mosques, synagogues
- **Viewpoints**: Observation decks, scenic overlooks

### Must-See Attractions
Each city has designated "must-see" attractions that are prioritized in itineraries:
- **London**: Big Ben, Tower Bridge, British Museum
- **Paris**: Eiffel Tower, Louvre, Notre-Dame
- **Rome**: Colosseum, Vatican, Trevi Fountain
- **Tokyo**: Senso-ji, Shibuya Crossing, Meiji Shrine
- **NYC**: Statue of Liberty, Central Park, Times Square

### Usage Example
```typescript
import { getCityAttractions } from '../data/city-attractions';

const attractions = getCityAttractions('london');
const mustSee = attractions.filter(a => a.mustSee);
const museums = attractions.filter(a => a.category === 'museum');
```

## Static Activities Templates

### Purpose
Pre-defined activity templates that provide:
- Fallback options when AI generation fails
- Quick suggestions for common interests
- Structured activity formats
- Time-tested itinerary components

### Structure
```json
{
  "categories": {
    "cultural": [...],
    "adventure": [...],
    "food": [...],
    "shopping": [...],
    "relaxation": [...]
  },
  "timeOfDay": {
    "morning": [...],
    "afternoon": [...],
    "evening": [...],
    "night": [...]
  },
  "duration": {
    "short": [...],  // 1-2 hours
    "medium": [...], // 2-4 hours
    "long": [...]    // 4+ hours
  }
}
```

### Activity Template Example
```json
{
  "name": "Local Food Market Tour",
  "category": "food",
  "duration": "medium",
  "bestTime": "morning",
  "description": "Explore local food markets and taste regional specialties",
  "interests": ["food", "culture", "photography"],
  "budget": "budget"
}
```

## Data Quality

### Maintenance
- Zone boundaries verified with Google Maps
- Attraction details cross-referenced with TripAdvisor
- Regular updates for seasonal changes
- Community contributions welcome

### Accuracy
- Coordinates accurate to ~50 meters
- Opening hours updated quarterly
- Prices updated semi-annually
- Transportation options verified

## Integration Points

### Route Optimizer
Uses zone data to:
```typescript
// Group activities by zone
const optimizer = new RouteOptimizer();
const optimized = optimizer.optimizeDailyRoutes(itinerary);
```

### Trip Generator
Uses attraction data to:
```typescript
// Enrich generated activities with real venues
const enricher = new ItineraryEnricher();
const enriched = await enricher.enrichItinerary(itinerary);
```

### Metadata Generator
Uses static activities for:
```typescript
// Provide quick fallback activities
const generator = new MetadataGenerator();
const metadata = generator.generateWithFallbacks(params);
```

## Adding New Cities

To add zone data for a new city:

1. **Research city layout** - Identify major districts and neighborhoods
2. **Define zones** - Group nearby areas (aim for 4-7 zones)
3. **Set priorities** - Tourist areas get lower numbers (higher priority)
4. **Add to city-zones.ts**:
```typescript
const newCityZones: Zone[] = [
  {
    name: 'Downtown',
    center: { lat: 0, lng: 0 },
    neighborhoods: ['District1', 'District2'],
    priority: 1
  },
  // ... more zones
];
```
5. **Test routing** - Ensure zone transitions make sense

## Performance Considerations

- **Zone lookups**: O(1) with city name hash
- **Distance calculations**: Cached for repeated queries
- **Attraction filters**: Pre-indexed by category
- **Static loading**: ~50ms on first import

## Future Enhancements

Planned additions:
- Real-time attraction availability
- Seasonal activity variations
- Weather-based activity suggestions
- Accessibility information
- Multi-language descriptions
- Public transport integration
- Local event calendars

## Data Sources

Current data compiled from:
- OpenStreetMap (geographic boundaries)
- Google Maps (zone definitions)
- TripAdvisor (attractions)
- Local tourism boards (must-see lists)
- Community contributions