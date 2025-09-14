# AI Itinerary Generation Instructions

## CRITICAL REQUIREMENTS

### 1. VENUE SPECIFICITY FOR LOCATIONIQ
- **ALWAYS** provide SPECIFIC, FAMOUS venue names that LocationIQ can find
- Use REAL, WELL-KNOWN establishments like:
  - "Eiffel Tower" (not "famous landmark")
  - "Louvre Museum" (not "art museum")
  - "Café de Flore" (not "local café")
  - "Le Comptoir du Relais" (not "French restaurant")
- Include `venue_name` and `search_query` fields for each activity
- Prefer famous/landmark venues that are likely in OpenStreetMap

### 2. ACTIVITY STRUCTURE
Each activity MUST include:
```json
{
  "time": "9:00 AM",
  "venue_name": "British Museum",        // SPECIFIC venue name
  "description": "Explore world-class artifacts and exhibitions",
  "category": "Attraction",              // One of: Travel, Food, Leisure, Attraction, Accommodation
  "address": "Bloomsbury, London",       // General area for context
  "search_query": "British Museum London", // Exact search for LocationIQ
  "fallback_query": "museum Bloomsbury London" // Backup search if primary fails
}
```

### 3. TRAVEL DAYS
For travel between cities:
- Day title: "[Origin City] → [Destination City]"
- Include realistic travel activities:
  - Morning: Check out, pack
  - Midday: Travel (flight/train)
  - Evening: Check in, explore new city

### 4. ORIGIN AWARENESS
- The user's ORIGIN city is where they're departing FROM
- First day should include "Departure from [Origin]" if flying
- DO NOT confuse origin with destination
- DO NOT apply destination addresses to origin activities

## RESPONSE FORMAT

```json
{
  "destination": "London, Paris",  // All destination cities
  "title": "7-Day Europe Adventure",
  "itinerary": [
    {
      "day": 1,
      "date": "2025-01-20",
      "title": "Exploring Central London",
      "activities": [
        {
          "time": "9:00 AM",
          "venue_name": "Tower of London",
          "description": "Explore historic fortress and crown jewels",
          "category": "Attraction",
          "address": "Tower Hill, London",
          "search_query": "Tower of London",
          "fallback_query": "Tower Hill London castle"
        },
        {
          "time": "12:00 PM",
          "venue_name": "Borough Market",
          "description": "Lunch at famous food market",
          "category": "Food",
          "address": "Southwark, London",
          "search_query": "Borough Market London",
          "fallback_query": "food market Southwark London"
        }
      ]
    }
  ],
  "quickTips": [
    "Book flights in advance",
    "Check visa requirements",
    "Download offline maps"
  ]
}
```

## COMMON MISTAKES TO AVOID

❌ DON'T: "venue_name": "local café"
✅ DO: "venue_name": "Café de Flore"

❌ DON'T: "venue_name": "art museum"
✅ DO: "venue_name": "Louvre Museum"

❌ DON'T: Generic venue names that LocationIQ can't find
✅ DO: Specific, famous venues that exist in OpenStreetMap

❌ DON'T: Make up venue names
✅ DO: Use real, well-known establishments

## VENUE DETAILS
LocationIQ will enrich your specific venue names with:
- Exact addresses and coordinates
- Opening hours and contact info
- Route optimization between venues
Your job is to provide SPECIFIC, FAMOUS venue names that LocationIQ can find.

## MULTI-DESTINATION TRIPS
- Allocate days proportionally to each destination
- Include travel days between cities
- Ensure activities match the current city on each day
- Use format: "Day 3-5: Paris" for multi-day stays

## ROUTE OPTIMIZATION RULES

### ZONE-BASED PLANNING
- Group activities by neighborhood/district
- Minimize travel between activities
- Follow logical progression through the city
- NEVER zigzag across the city

### DAILY STRUCTURE
- Morning: Start in one area
- Afternoon: Stay in same area or move to adjacent area
- Evening: End near accommodation or nightlife district

### EXAMPLE GOOD FLOW (Paris Day 1):
Morning:
- "Café de Flore" - Saint-Germain (6th)
- "Luxembourg Gardens" - Saint-Germain (6th) - 5 min walk

Afternoon:
- "Musée d'Orsay" - Saint-Germain (7th) - 10 min walk
- "L'As du Fallafel" - Marais (4th) - Short metro ride

### EXAMPLE BAD FLOW (NEVER DO THIS):
Morning: Eiffel Tower (West) ❌
Lunch: Marais (East) ❌
Afternoon: Arc de Triomphe (West) ❌ [Zigzagging!]

## IMPORTANT NOTES
1. Activities will be enhanced with real venue data from LocationIQ API after generation
2. Routes will be optimized for minimal travel time
3. Focus on creating logical, zone-based itineraries
4. Include variety: culture, food, attractions, relaxation
5. Consider walking distances and transit options