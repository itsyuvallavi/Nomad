/**
 * Intent Understanding for Conversational AI
 * Determines what the user wants and what's missing
 */

import { openai, MODEL_CONFIG } from '../openai-config';
import { logger } from '@/lib/monitoring/logger';

export interface TripIntent {
  // Core requirements
  location: string | null;
  startDate: string | null;
  duration: number | null;

  // Derived information
  isQuestion: boolean;
  isVague: boolean;
  tripType: 'vacation' | 'workation' | 'business';

  // Optional features (only if explicitly mentioned)
  needsCoworking: boolean;
  dietaryRestrictions: string[];
  specificActivities: string[];
  budgetLevel: 'budget' | 'moderate' | 'luxury' | null;

  // What's missing
  missingRequirements: string[];

  // Suggested response
  aiResponse: string;
}

const INTENT_PROMPT = `Analyze the user's travel request and extract information.
The request may be in ANY LANGUAGE (English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, etc.).
Understand the intent regardless of language.

CORE REQUIREMENTS (what every trip needs):
1. location: The destination (city/country) or null if not mentioned
2. startDate: When they want to travel (YYYY-MM-DD format) or null
3. duration: Number of days or null

Common multi-language patterns:
- Spanish: "viaje a" = "trip to", "días" = "days", "semana" = "week"
- French: "voyage à" = "trip to", "jours" = "days", "pour" = "for"
- German: "Reise nach" = "trip to", "Tage" = "days", "Woche" = "week"
- Italian: "viaggio a" = "trip to", "giorni" = "days", "settimana" = "week"
- Portuguese: "viagem para" = "trip to", "dias" = "days", "semana" = "week"

TRIP TYPE (default is always "vacation"):
- "vacation": Default for all trips unless work is mentioned
- "workation": ONLY if user mentions: work, remote work, coworking, digital nomad
- "business": ONLY if user mentions: business trip, meetings, conference

SPECIAL REQUESTS (only note if EXPLICITLY mentioned):
- needsCoworking: true ONLY if user asks for coworking spaces
- dietaryRestrictions: ONLY if mentioned (vegan, vegetarian, halal, kosher, gluten-free, etc.)
- specificActivities: ONLY specific activities requested (hiking, diving, museums, etc.)
- budgetLevel: ONLY if mentioned (cheap, budget, luxury, expensive)

ANALYSIS:
- isQuestion: true if asking for help or clarification
- isVague: true if missing core requirements
- missingRequirements: array of what's missing ["location", "duration", "startDate"]

Return as JSON.`;

export async function understandTripIntent(
  prompt: string,
  conversationHistory?: string
): Promise<TripIntent> {
  try {
    if (!openai) {
      throw new Error('OpenAI not configured');
    }

    const fullContext = conversationHistory
      ? `Previous conversation:\n${conversationHistory}\n\nCurrent message: ${prompt}`
      : prompt;

    const response = await openai.chat.completions.create({
      model: MODEL_CONFIG.model,
      messages: [
        { role: 'system', content: INTENT_PROMPT },
        { role: 'user', content: `Travel request (may be in any language): "${fullContext}"

Please extract:
- location (city/country mentioned)
- duration (number of days)
- start date
Respond in JSON format.` }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const rawIntent = JSON.parse(response.choices[0].message.content || '{}');

    logger.info('AI', 'Raw intent from OpenAI', rawIntent);

    // Parse the nested structure from OpenAI - handle various formats
    const coreReqs = rawIntent.CORE_REQUIREMENTS || rawIntent.CORE_requirements || rawIntent['CORE REQUIREMENTS'] || rawIntent.core_requirements || {};
    const analysis = rawIntent.ANALYSIS || rawIntent.analysis || {};
    const specialReqs = rawIntent.SPECIAL_REQUESTS || rawIntent['SPECIAL REQUESTS'] || {};

    // Also check for direct properties (in case AI returns flat structure)
    const location = coreReqs.location || rawIntent.location || null;
    const duration = coreReqs.duration || rawIntent.duration || null;
    const startDate = coreReqs.startDate || rawIntent.startDate || rawIntent.start_date || null;

    // Normalize the response structure
    const intent: TripIntent = {
      // Core requirements - use the extracted values
      location: location,
      startDate: startDate,
      duration: duration,

      // Derived information
      isQuestion: analysis.isQuestion || rawIntent.isQuestion || false,
      isVague: analysis.isVague || rawIntent.isVague || false,
      tripType: (rawIntent.TRIP_TYPE || rawIntent['TRIP TYPE'] || rawIntent.tripType || 'vacation').toLowerCase() as any,

      // Optional features
      needsCoworking: specialReqs.needsCoworking || false,
      dietaryRestrictions: specialReqs.dietaryRestrictions || [],
      specificActivities: specialReqs.specificActivities || [],
      budgetLevel: specialReqs.budgetLevel || null,

      // What's missing
      missingRequirements: analysis.missingRequirements || [],

      // Will be generated below
      aiResponse: ''
    };

    // Generate AI response based on parsed intent
    intent.aiResponse = generateAIResponse(intent, prompt);

    logger.info('AI', 'Intent understood', {
      location: intent.location,
      duration: intent.duration,
      tripType: intent.tripType,
      missingCount: intent.missingRequirements?.length || 0
    });

    return intent;

  } catch (error) {
    logger.error('AI', 'Intent understanding failed', error);

    // Return null values if AI fails - NO DEFAULTS
    return {
      location: null,
      startDate: null,
      duration: null,
      isQuestion: prompt.includes('?'),
      isVague: true,
      tripType: 'vacation',
      needsCoworking: false,
      dietaryRestrictions: [],
      specificActivities: [],
      budgetLevel: null,
      missingRequirements: ['location', 'dates', 'duration'],
      aiResponse: "I'd love to help you plan an amazing trip! Where would you like to go?"
    };
  }
}

/**
 * Detect the language of the user's input
 */
function detectLanguage(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();

  // Spanish indicators
  if (lowerPrompt.match(/\b(viaje|días|semana|para|quiero|ciudad|vacaciones)\b/)) return 'es';
  // French indicators
  if (lowerPrompt.match(/\b(voyage|jours|semaine|pour|veux|ville|vacances)\b/)) return 'fr';
  // German indicators
  if (lowerPrompt.match(/\b(reise|tage|woche|nach|möchte|stadt|urlaub)\b/)) return 'de';
  // Italian indicators
  if (lowerPrompt.match(/\b(viaggio|giorni|settimana|voglio|città|vacanza)\b/)) return 'it';
  // Portuguese indicators
  if (lowerPrompt.match(/\b(viagem|dias|semana|para|quero|cidade|férias)\b/)) return 'pt';

  return 'en'; // Default to English
}

/**
 * Generate a helpful conversational response based on what's missing
 */
function generateAIResponse(intent: TripIntent, originalPrompt: string): string {
  const prompt = originalPrompt.toLowerCase();
  const language = detectLanguage(originalPrompt);

  // Handle questions with multi-language support
  if (intent.isQuestion || prompt.match(/^(can|could|would|will|help|what|how|puedo|puis|kann|posso)/i)) {
    const responses = {
      en: "I'd be happy to help you plan an amazing trip! Where would you like to go and for how long?",
      es: "¡Me encantaría ayudarte a planear un viaje increíble! ¿A dónde te gustaría ir y por cuánto tiempo?",
      fr: "Je serais ravi de vous aider à planifier un voyage incroyable! Où aimeriez-vous aller et pour combien de temps?",
      de: "Ich würde Ihnen gerne bei der Planung einer tollen Reise helfen! Wohin möchten Sie reisen und für wie lange?",
      it: "Sarei felice di aiutarti a pianificare un viaggio fantastico! Dove vorresti andare e per quanto tempo?",
      pt: "Ficaria feliz em ajudar você a planejar uma viagem incrível! Para onde você gostaria de ir e por quanto tempo?"
    };
    return responses[language as keyof typeof responses] || responses.en;
  }

  // Handle based on what's missing
  const missing = intent.missingRequirements || [];

  if (missing.length === 0) {
    // We have everything - respond in detected language
    if (language === 'es') {
      if (intent.needsCoworking) {
        return `¡Perfecto! Crearé un workation de ${intent.duration} días en ${intent.location} con espacios de coworking y tiempo para explorar.`;
      }
      return `¡Maravilloso! Aquí está tu aventura de ${intent.duration} días en ${intent.location}!`;
    } else if (language === 'fr') {
      if (intent.needsCoworking) {
        return `Parfait! Je vais créer un workation de ${intent.duration} jours à ${intent.location} avec des espaces de coworking et du temps pour explorer.`;
      }
      return `Merveilleux! Voici votre aventure de ${intent.duration} jours à ${intent.location}!`;
    }
    // Default English
    if (intent.needsCoworking) {
      return `Perfect! I'll create a ${intent.duration}-day workation in ${intent.location} with coworking spaces and plenty of time to explore.`;
    }
    return `Wonderful! Here's your ${intent.duration}-day ${intent.location} adventure!`;
  }

  if (missing.includes('location') && missing.includes('duration')) {
    // Missing both
    if (prompt.match(/^\d+$/)) {
      return `Great! A ${prompt}-day trip. Where would you like to visit?`;
    }
    return "I'd love to help plan your trip! Where would you like to go and for how long?";
  }

  if (missing.includes('location')) {
    // Has duration but missing location
    if (intent.duration) {
      return `Perfect! A ${intent.duration}-day trip sounds wonderful. Where would you like to explore?`;
    }
    return "Where would you like to explore?";
  }

  if (missing.includes('duration')) {
    // Has location but missing duration
    return `${intent.location} is an excellent choice! How many days would you like to spend there? (I'd recommend 3-5 days to see the highlights)`;
  }

  // Default response
  return "Let me create an amazing itinerary for you! Feel free to tell me if you'd like any changes.";
}

/**
 * Get missing requirements from intent
 * NEVER provides defaults - only identifies what's missing
 */
export function getMissingRequirements(intent: TripIntent): string[] {
  const missing: string[] = [];

  // Check core requirements
  if (!intent.location) {
    missing.push('location');
  }
  if (!intent.startDate) {
    missing.push('dates');
  }
  if (!intent.duration) {
    missing.push('duration');
  }

  return missing;
}

/**
 * Check if we have enough information to generate an itinerary
 * NO DEFAULTS - must have actual user input
 */
export function hasRequiredInformation(intent: TripIntent): boolean {
  return !!(intent.location && intent.startDate && intent.duration);
}