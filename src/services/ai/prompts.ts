/**
 * Prompts - Centralized prompt templates for AI operations
 * Contains all conversation questions, generation prompts, and routing rules
 */

interface ItineraryPromptParams {
  destination: string;
  duration: number;
  startDate: string;
  travelers: { adults: number; children: number };
  preferences: any;
  zoneGuidance: string;
}

export const PROMPTS = {
  /**
   * Questions for collecting missing information
   */
  questions: {
    destination: [
      "Where would you like to travel?",
      "What destination do you have in mind?",
      "Which city or country would you like to visit?"
    ],

    dates: {
      withDestination: (destination: string) => [
        `When would you like to visit ${destination}?`,
        `What dates are you planning to travel to ${destination}?`,
        `When are you thinking of going to ${destination}?`
      ],
      withoutDestination: [
        "When would you like to travel?",
        "What are your travel dates?",
        "When are you planning this trip?"
      ]
    },

    duration: {
      withDestination: (destination: string) => [
        `How many days would you like to spend in ${destination}?`,
        `How long will your ${destination} trip be?`,
        `What's the duration of your stay in ${destination}?`
      ],
      withoutDestination: [
        "How many days are you planning to travel?",
        "How long would you like your trip to be?",
        "What's the duration of your trip?"
      ]
    },

    preferences: {
      budget: "What's your budget level for this trip? (budget, mid-range, or luxury)",
      interests: "What are your main interests or activities you'd like to do?",
      pace: "Do you prefer a relaxed, moderate, or packed itinerary?",
      mustSee: "Are there any specific places or experiences you don't want to miss?",
      dietary: "Do you have any dietary restrictions or food preferences?"
    }
  },

  /**
   * Generation prompts for creating itineraries
   */
  generation: {
    /**
     * System prompt defining the AI's role and rules
     */
    systemPrompt: `You are an expert travel planner specializing in creating logical, zone-based itineraries.

CRITICAL RULES:
1. ONLY recommend REAL, FAMOUS, WELL-KNOWN venues that actually exist
2. Each day MUST focus on ONE neighborhood/zone to minimize travel
3. Activities must flow logically: breakfast → morning → lunch → afternoon → dinner
4. Never plan activities requiring 30+ minute travel between consecutive events
5. Walking distance (15 min max) between activities in the same time period
6. Consider opening hours and days (museums closed Mondays, etc.)

OUTPUT FORMAT REQUIREMENTS:
- Return ONLY valid JSON - no text before or after the JSON object
- Start your response with { and end with }
- No markdown, no explanations, no comments
- Use double quotes for all strings
- Ensure all JSON is properly escaped
- Include specific venue names, not generic descriptions
- Set all addresses to "Address N/A" (will be enriched later)
- Include venue_search field with format: "[Venue Name] [City]"`,

    /**
     * Builds the user prompt for itinerary generation
     */
    buildItineraryPrompt: (params: ItineraryPromptParams): string => {
      const { destination, duration, startDate, travelers, preferences, zoneGuidance } = params;

      return `Create a ${duration}-day itinerary for ${destination} starting on ${startDate}.

Travelers: ${travelers.adults} adults${travelers.children > 0 ? `, ${travelers.children} children` : ''}

${preferences.budget ? `Budget: ${preferences.budget}` : ''}
${preferences.interests ? `Interests: ${preferences.interests.join(', ')}` : ''}
${preferences.pace ? `Pace: ${preferences.pace}` : ''}
${preferences.mustSee ? `Must see: ${preferences.mustSee.join(', ')}` : ''}
${preferences.avoid ? `Avoid: ${preferences.avoid.join(', ')}` : ''}

${zoneGuidance}

DAILY STRUCTURE REQUIREMENTS:
- Each day MUST have at least 5-6 activities
- Morning (9:00 AM - 12:00 PM): Breakfast + 1-2 activities
- Afternoon (12:00 PM - 5:00 PM): Lunch + 1-2 activities
- Evening (5:00 PM - 9:00 PM): 1 activity + Dinner
- IMPORTANT: Generate ALL activities for ALL days

LOGICAL FLOW RULES:
1. Start each day with breakfast near the first activity
2. Lunch should be walking distance from morning activities
3. Dinner should be in the same zone as afternoon/evening activities
4. Group museums/galleries in mornings when less crowded
5. Shopping and casual activities in afternoons
6. Scenic viewpoints best at sunset

IMPORTANT: Return ONLY the JSON object below. Do not include any text before or after the JSON.

JSON structure to return:
{
  "title": "X Days in [Destination]",
  "destination": "[destination]",
  "duration": [number],
  "startDate": "[YYYY-MM-DD]",
  "itinerary": [
    {
      "day": 1,
      "date": "[YYYY-MM-DD]",
      "theme": "[Day theme focusing on specific area/zone]",
      "activities": [
        {
          "time": "9:00 AM",
          "description": "Breakfast at famous local cafe",
          "venue_name": "Cafe Central",
          "venue_search": "Cafe Central [City]",
          "category": "breakfast",
          "address": "Address N/A"
        },
        {
          "time": "10:30 AM",
          "description": "Visit the main cathedral",
          "venue_name": "Cathedral Name",
          "venue_search": "Cathedral [City]",
          "category": "attraction",
          "address": "Address N/A"
        },
        {
          "time": "12:30 PM",
          "description": "Lunch at traditional restaurant",
          "venue_name": "Restaurant Name",
          "venue_search": "Restaurant [City]",
          "category": "lunch",
          "address": "Address N/A"
        },
        {
          "time": "2:30 PM",
          "description": "Explore historic neighborhood",
          "venue_name": "Historic Quarter",
          "venue_search": "Historic Quarter [City]",
          "category": "attraction",
          "address": "Address N/A"
        },
        {
          "time": "7:00 PM",
          "description": "Dinner at local restaurant",
          "venue_name": "Local Restaurant",
          "venue_search": "Restaurant [City]",
          "category": "dinner",
          "address": "Address N/A"
        }
      ]
    }
  ],
  "summary": "[Brief trip summary]",
  "packing_suggestions": ["item1", "item2"],
  "local_customs": ["custom1", "custom2"]
}`;
    },

    /**
     * Prompt for modifying existing itineraries
     */
    modificationPrompt: (currentItinerary: string, feedback: string): string => `
Current itinerary:
${currentItinerary}

User feedback:
${feedback}

Modify the itinerary based on the feedback while maintaining:
1. Zone-based planning (same area per day)
2. Logical activity flow (no backtracking)
3. Realistic timing and distances
4. The same JSON structure

Return ONLY the modified itinerary as valid JSON.
Do not include any explanatory text, markdown formatting, or comments.
Start with { and end with }`,

    /**
     * Validation prompt for checking venues
     */
    venueValidationPrompt: (activity: string): string => `
Review this activity and ensure it has a SPECIFIC, REAL venue name:
${activity}

If the venue is generic (like "Local restaurant" or "Popular museum"),
replace it with an actual venue name that exists in that location.

Return the activity with a specific venue name.`
  },

  /**
   * Zone-specific guidance for major cities
   */
  zoneGuidance: {
    paris: `PARIS ZONE ORGANIZATION:
Day 1: Central Paris (Louvre, Palais Royal, Les Halles) - Start at the heart
Day 2: Latin Quarter & Saint-Germain (Notre-Dame, Pantheon, Luxembourg Gardens)
Day 3: Marais & Bastille (Jewish Quarter, Place des Vosges, trendy boutiques)
Day 4: Champs-Élysées & Trocadéro (Arc de Triomphe, shopping, Eiffel Tower views)
Day 5+: Montmartre (Sacré-Cœur, artist quarter, Moulin Rouge)`,

    london: `LONDON ZONE ORGANIZATION:
Day 1: Westminster (Big Ben, Westminster Abbey, Buckingham Palace)
Day 2: Covent Garden & Soho (Markets, theaters, British Museum)
Day 3: City & Tower (Tower of London, Tower Bridge, St. Paul's)
Day 4: South Bank (Tate Modern, Borough Market, Shakespeare's Globe)
Day 5+: Kensington (Museums, Hyde Park, Harrods)`,

    tokyo: `TOKYO ZONE ORGANIZATION:
Day 1: Shinjuku & Shibuya (Crossing, Meiji Shrine, shopping)
Day 2: Asakusa & Ueno (Sensoji Temple, traditional Tokyo, museums)
Day 3: Central Tokyo (Imperial Palace, Ginza shopping, Tokyo Station)
Day 4: Roppongi & Akasaka (Tokyo Tower, modern art, nightlife)
Day 5+: Day trips (Nikko, Kamakura, Mount Fuji)`,

    newyork: `NEW YORK ZONE ORGANIZATION:
Day 1: Midtown Manhattan (Times Square, Rockefeller Center, MoMA)
Day 2: Lower Manhattan (9/11 Memorial, Wall Street, Statue of Liberty)
Day 3: Upper East Side (Central Park, Met Museum, Fifth Avenue)
Day 4: Upper West Side (Natural History Museum, Lincoln Center, Columbia)
Day 5+: Brooklyn (DUMBO, Williamsburg, Coney Island)`,

    rome: `ROME ZONE ORGANIZATION:
Day 1: Ancient Rome (Colosseum, Roman Forum, Palatine Hill)
Day 2: Vatican City (St. Peter's, Sistine Chapel, Vatican Museums)
Day 3: Historic Center (Pantheon, Trevi Fountain, Spanish Steps)
Day 4: Trastevere (Charming neighborhood, local restaurants, nightlife)
Day 5+: Villa Borghese area (Galleries, parks, Piazza del Popolo)`,

    barcelona: `BARCELONA ZONE ORGANIZATION:
Day 1: Gothic Quarter & Las Ramblas (Cathedral, Boqueria Market, historic streets)
Day 2: Eixample (Sagrada Familia, Casa Batlló, Passeig de Gràcia)
Day 3: Park Güell & Gràcia (Gaudí park, bohemian neighborhood)
Day 4: Waterfront (Barceloneta Beach, Port Vell, seafood)
Day 5+: Montjuïc (Castle, Magic Fountain, museums)`,

    default: `ZONE ORGANIZATION PRINCIPLES:
- Start with the historic center/main attractions
- Group neighborhoods by proximity
- One major area per day
- Save distant attractions for later days
- Keep meals within walking distance of activities`
  },

  /**
   * Error messages and fallbacks
   */
  errors: {
    missingRequired: "I need some information to create your itinerary. Could you tell me:",
    invalidDate: "The date format seems incorrect. Please provide dates in format like 'March 15' or '2024-03-15'.",
    invalidDuration: "The trip duration should be between 1 and 30 days.",
    generationFailed: "I encountered an issue creating your itinerary. Let me try again with a simpler approach.",
    enrichmentFailed: "I created your itinerary but couldn't add detailed location information. The basic plan is ready though!"
  },

  /**
   * Conversation responses
   */
  responses: {
    greeting: "Hello! I'm here to help you plan an amazing trip. Where would you like to go?",

    collecting: "Great! Let me gather a bit more information to create the perfect itinerary for you.",

    ready: "Perfect! I have all the information I need. Let me create your personalized itinerary...",

    generating: "I'm working on your itinerary now. This should take about 15-30 seconds...",

    complete: "Your itinerary is ready! Each day focuses on a specific area to minimize travel time and maximize your experience.",

    modification: "I can help you adjust your itinerary. What would you like to change?",

    followUp: "Would you like me to adjust anything about this itinerary?"
  }
};