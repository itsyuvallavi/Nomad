# LocationIQ + AI Integration Strategy

## The Problem
LocationIQ works best with **specific venue names** but struggles with generic searches. We need OpenAI to generate specific venue names that LocationIQ can then find.

## Best Implementation Strategy: Two-Stage Generation

### Stage 1: OpenAI Generates Specific Itinerary with Venue Names
OpenAI creates the complete itinerary with **specific, famous venue names** that are likely to exist in LocationIQ/OpenStreetMap.

### Stage 2: LocationIQ Enriches with Real Data
LocationIQ searches for these specific venues to get:
- Exact addresses
- Coordinates for mapping
- Additional details (websites, hours, etc.)

## Implementation Flow

```
User Input → OpenAI → Specific Venues → LocationIQ → Enriched Itinerary
```

### Detailed Flow:

1. **User Input**: "3 days in Paris"

2. **OpenAI Generates** (with enhanced prompt):
   ```json
   {
     "day1": {
       "morning": {
         "venue_name": "Café de Flore",  // Specific famous cafe
         "activity": "Breakfast at historic cafe",
         "search_query": "Café de Flore Paris"  // Exact search term for API
       },
       "afternoon": {
         "venue_name": "Louvre Museum",
         "activity": "Visit world's largest art museum",
         "search_query": "Musée du Louvre Paris"
       }
     }
   }
   ```

3. **LocationIQ Searches**:
   - Search: "Café de Flore Paris" → Gets exact location
   - Search: "Musée du Louvre Paris" → Gets exact location

4. **Final Enriched Output**:
   ```json
   {
     "morning": {
       "venue_name": "Café de Flore",
       "address": "172 Boulevard Saint-Germain, 75006 Paris",
       "coordinates": { "lat": 48.854, "lng": 2.333 },
       "website": "cafedeflore.fr"
     }
   }
   ```

## Prompt Engineering Changes

### Current Prompt (Generic):
```
"Generate an itinerary for Paris including restaurants and attractions"
```

### Enhanced Prompt for LocationIQ:
```
Generate an itinerary for Paris. For each activity, provide:
1. A SPECIFIC, FAMOUS venue name (not generic like "local restaurant")
2. The exact search query to find this venue

Examples of GOOD venue names:
- "Eiffel Tower" ✅ (not "famous landmark")
- "Le Comptoir du Relais" ✅ (not "French restaurant")
- "Louvre Museum" ✅ (not "art museum")
- "Shakespeare and Company" ✅ (not "bookstore")

Examples of BAD venue names:
- "Local café" ❌
- "Popular restaurant" ❌
- "City museum" ❌

For each venue, also provide:
- venue_name: The specific name
- venue_type: restaurant|hotel|attraction|cafe|shop
- search_query: Exact string to search in LocationIQ
- fallback_query: Alternative if first search fails
```

## Implementation Steps

### 1. Update Itinerary Generation Prompt
**File**: `src/services/ai/utils/ITINERARY_GENERATION_PROMPT.md`

Add instructions for OpenAI to:
- Generate specific, well-known venue names
- Include search queries for each venue
- Prefer famous/landmark venues that are in OpenStreetMap

### 2. Modify Generation Flow
**File**: `src/services/ai/flows/generate-personalized-itinerary.ts`

```typescript
async function generateAndEnrichItinerary(prompt: string) {
  // Stage 1: Generate with specific venues
  const itinerary = await generateWithSpecificVenues(prompt);

  // Stage 2: Enrich each venue
  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      if (activity.venue_name && activity.search_query) {
        // Search for specific venue
        const venueData = await locationIQ.search(activity.search_query);

        if (!venueData && activity.fallback_query) {
          // Try fallback
          venueData = await locationIQ.search(activity.fallback_query);
        }

        if (venueData) {
          activity.address = venueData.address;
          activity.coordinates = venueData.coordinates;
        }
      }
    }
  }

  return itinerary;
}
```

### 3. Add Venue Extraction Helper
**File**: `src/services/ai/utils/venue-extractor.ts`

```typescript
export function extractSearchableVenues(activity: Activity) {
  // Extract venue name from activity description
  // Prioritize famous venues
  // Generate search queries

  return {
    primary_search: `${activity.venue_name} ${activity.city}`,
    fallback_searches: [
      activity.venue_name,
      `${activity.type} near ${activity.area} ${activity.city}`
    ]
  };
}
```

### 4. Implement Smart Fallbacks
```typescript
const searchStrategies = [
  // 1. Try exact venue name
  (venue) => `${venue.name} ${venue.city}`,

  // 2. Try without city
  (venue) => venue.name,

  // 3. Try category search
  (venue) => `${venue.type} in ${venue.area}`,

  // 4. Fall back to static data
  (venue) => getStaticVenue(venue.type, venue.city)
];
```

## Benefits of This Approach

1. **Higher Success Rate**: Specific venue names are more likely to be found
2. **Better User Experience**: Users get real, famous venues they can actually visit
3. **Efficient API Usage**: Fewer failed searches, better use of rate limits
4. **Fallback Strategy**: Multiple search attempts ensure we find something

## Example Output Comparison

### Before (Generic):
```
Morning: Visit a local café for breakfast
LocationIQ Search: "cafe in Paris" → Often fails or returns random results
```

### After (Specific):
```
Morning: Breakfast at Café de Flore, famous for hosting Hemingway
LocationIQ Search: "Café de Flore Paris" → Successfully finds exact location
```

## Testing Strategy

1. Test with major cities (Paris, London, Tokyo)
2. Verify specific venues are found
3. Check fallback mechanisms work
4. Monitor API usage efficiency

## Success Metrics

- ✅ 80%+ venue searches return exact matches
- ✅ Reduced API calls by 50% (fewer retries)
- ✅ All major tourist venues are found
- ✅ Graceful fallback for unknown venues