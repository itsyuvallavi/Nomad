# Trip Generator Modules

Supporting modules for the TripGenerator that handle itinerary generation, optimization, and enrichment.

## Modules

### route-optimizer.ts (309 lines)
**Purpose**: Optimizes daily routes by grouping activities into geographic zones

**Key Functions**:
- `optimizeDailyRoutes()` - Main optimization entry point
- `assignZonesToActivities()` - Maps activities to city zones
- `groupActivitiesByZone()` - Groups by geographic area
- `reorderActivitiesByZone()` - Minimizes zone transitions
- `calculateDistance()` - Estimates travel distances

**Zone Data Supported**:
- London, Paris, Rome, Tokyo, NYC, Barcelona, Amsterdam, Berlin, Sydney, Dubai

**Example**:
```typescript
const optimizer = new RouteOptimizer();
const optimized = optimizer.optimizeDailyRoutes(itinerary);
// Activities now grouped by zone to minimize travel
```

### cost-estimator.ts (331 lines)
**Purpose**: Calculates detailed cost estimates for trips

**Cost Categories**:
- **Accommodation**: Hotel costs by budget level
- **Activities**: Attraction and experience costs
- **Food**: Meal costs per day
- **Transportation**: Local transport and transfers
- **Flights**: Estimated airfare (if applicable)

**Budget Levels**:
```typescript
{
  budget: { accommodation: 50, meals: 30, activities: 20 },
  medium: { accommodation: 150, meals: 60, activities: 50 },
  luxury: { accommodation: 400, meals: 150, activities: 100 }
}
```

### prompt-builder.ts (119 lines)
**Purpose**: Constructs optimized prompts for GPT-4o-mini

**Key Functions**:
- `buildItineraryPrompt()` - Main itinerary generation prompt
- `buildModificationPrompt()` - For itinerary updates
- `buildZoneGuidance()` - Adds zone-based planning hints
- `extractSearchQuery()` - Extracts venue search terms

**Prompt Structure**:
- User preferences and constraints
- Zone guidance for efficient planning
- Output format specifications
- Specific venue requirements

### itinerary-validator.ts (206 lines)
**Purpose**: Ensures itinerary data consistency and completeness

**Validation Tasks**:
- Structure validation
- Date consistency checks
- Activity count verification
- Missing field recovery
- Legacy format conversion

**Key Functions**:
- `validateAndFixItinerary()` - Main validation entry
- `ensureItineraryStructure()` - Structural consistency
- `validateParams()` - Input parameter validation
- `calculateDate()` - Date calculations
- `parseJSONSafely()` - Safe JSON parsing with recovery

### itinerary-enricher.ts (204 lines)
**Purpose**: Enriches itineraries with real venue data from HERE Places API

**Enrichment Process**:
1. Identify activities needing location data
2. Extract search queries from descriptions
3. Batch search using HERE Places API
4. Match and apply venue data
5. Add coordinates, addresses, ratings

**API Integration**:
```typescript
const enricher = new ItineraryEnricher();
const enriched = await enricher.enrichItinerary(itinerary);
// Activities now have real venue data, coordinates, addresses
```

## Data Flow

```
TripGenerator Request
    ↓
PromptBuilder
    ├── Build GPT Prompt
    └── Add Zone Guidance
         ↓
GPT-4o-mini Generation
         ↓
ItineraryValidator
    ├── Parse Response
    └── Fix Structure
         ↓
RouteOptimizer
    ├── Assign Zones
    └── Reorder Activities
         ↓
ItineraryEnricher
    ├── Search Venues (HERE API)
    └── Add Location Data
         ↓
CostEstimator
    ├── Calculate Costs
    └── Add Budget Breakdown
         ↓
Final Validation
```

## Integration Example

```typescript
export class TripGenerator {
  async generateItinerary(params: TripParams) {
    // 1. Build prompt
    const prompt = this.promptBuilder.buildItineraryPrompt(params);

    // 2. Generate with GPT
    const baseItinerary = await this.generateBaseItinerary(params);

    // 3. Optimize routes
    const optimized = this.routeOptimizer.optimizeDailyRoutes(baseItinerary);

    // 4. Enrich with real data
    const enriched = await this.enricher.enrichItinerary(optimized);

    // 5. Add costs
    const withCosts = await this.costEstimator.addCostEstimates(enriched);

    // 6. Final validation
    return this.validator.validateAndFixItinerary(withCosts);
  }
}
```

## Performance Metrics

- **Route Optimization**: <100ms
- **Cost Calculation**: <50ms
- **Prompt Building**: <10ms
- **Validation**: <20ms
- **Enrichment**: 2-5s (API dependent)

## Zone-Based Planning

The route optimizer uses predefined city zones to group activities:

**Example: Paris Zones**
- Zone 1: Central (Louvre, Notre-Dame, Marais)
- Zone 2: Champs-Élysées (Arc de Triomphe, Eiffel Tower)
- Zone 3: Montmartre (Sacré-Cœur, Moulin Rouge)
- Zone 4: Latin Quarter (Panthéon, Luxembourg)

Activities are grouped by zone to minimize travel between distant areas.

## Cost Estimation Factors

The cost estimator considers:
- **Destination**: City-specific pricing
- **Season**: Peak vs off-peak
- **Group Size**: Per-person calculations
- **Budget Level**: Scales all costs
- **Duration**: Multi-day discounts

## HERE Places Integration

The enricher uses HERE Places API for:
- Venue name verification
- Address lookup
- GPS coordinates
- Business hours (when available)
- Ratings and reviews
- Category classification