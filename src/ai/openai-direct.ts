/**
 * Direct OpenAI integration for itinerary generation
 * This bypasses Genkit and calls OpenAI directly for better control
 * 
 * ⚠️ CRITICAL: NEVER USE HARDCODED DATA!
 * ✅ ALWAYS fetch from OpenAI API
 * ❌ NEVER return mock or hardcoded itineraries
 * ❌ NEVER use fallback static data
 * ALL DATA MUST COME FROM LIVE API CALLS!
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { parseDestinations, buildStructuredPrompt } from '@/ai/utils/destination-parser';

// Initialize OpenAI client only on server
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (typeof window !== 'undefined') {
    throw new Error('OpenAI client should only be used on the server');
  }
  
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 45000, // 45 second timeout (under Next.js 60s limit)
      maxRetries: 1,
    });
  }
  
  return openai;
}

/**
 * Generate itinerary using OpenAI directly
 */
export async function generateItineraryWithOpenAI(
  prompt: string,
  attachedFile?: string,
  conversationHistory?: string
): Promise<GeneratePersonalizedItineraryOutput> {
  const startTime = Date.now();
  
  // Server-side only
  if (typeof window !== 'undefined') {
    throw new Error('This function must be called from server-side code');
  }
  
  logger.info('AI', 'Starting OpenAI generation with GPT-4o-mini', {
    model: 'gpt-4o-mini',
    promptLength: prompt.length,
    timestamp: new Date().toISOString(),
  });

  // Parse destinations for better handling
  const parsedTrip = parseDestinations(prompt);
  
  // Build structured prompt if multiple destinations detected
  let enhancedPrompt = prompt;
  if (parsedTrip.destinations.length > 1) {
    logger.info('AI', 'Multi-destination trip detected', {
      destinations: parsedTrip.destinations.map(d => d.name),
      totalDays: parsedTrip.totalDays
    });
    enhancedPrompt = buildStructuredPrompt(parsedTrip, prompt);
  }

  // Build the system prompt with clear instructions
  const systemPrompt = `You are a travel itinerary generator. Create a JSON response following these CRITICAL rules:

IMPORTANT ADDRESS RULES:
- NEVER provide specific street addresses or building numbers
- Use ONLY generic area descriptions like "Downtown London" or "Paris city center"
- DO NOT mix addresses from different cities (e.g., no London addresses for LA activities)
- Origin activities (departure) must use origin city addresses
- Destination activities must use destination city addresses

JSON Structure:
{
  "destination": "${parsedTrip.destinations.map(d => d.name).join(', ')}",
  "title": "Descriptive trip title",
  "itinerary": [array of ${parsedTrip.totalDays} day objects],
  "quickTips": ["tip1", "tip2", "tip3"]
}

Day structure: 
{
  "day": number,
  "date": "2025-01-XX",
  "title": "Day title",
  "activities": [4-5 activities]
}

Activity structure:
{
  "time": "9:00 AM",
  "description": "Brief activity description",
  "category": "Food|Attraction|Leisure|Travel|Accommodation",
  "address": "Generic area description, City"
}

${parsedTrip.origin ? `Origin city: ${parsedTrip.origin} (departure location)` : ''}
Destination(s): ${parsedTrip.destinations.map(d => `${d.name} (${d.days} days)`).join(', ')}
Total days: ${parsedTrip.totalDays}

Remember: Real venue names and exact addresses will be added later via Google Places API.`;

  const userPrompt = conversationHistory 
    ? `${enhancedPrompt}\n\nConversation History:\n${conversationHistory}`
    : enhancedPrompt;

  try {
    logger.info('API', 'Calling OpenAI API...');
    const client = getOpenAIClient();
    
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];
    
    logger.debug('AI', 'Request details:', {
      messageCount: messages.length,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      totalTokensEstimate: Math.ceil((systemPrompt.length + userPrompt.length) / 4)
    });
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 4096, // Further reduced for faster response
      response_format: { type: 'json_object' },
    });

    const duration = Date.now() - startTime;
    
    logger.info('API', 'OpenAI response received', {
      duration: `${duration}ms`,
      usage: response.usage,
      finishReason: response.choices[0]?.finish_reason,
    });

    // Parse the response
    const content = response.choices[0]?.message?.content || '{}';
    const itinerary = JSON.parse(content) as GeneratePersonalizedItineraryOutput;
    
    // Validate the response
    if (!itinerary.destination || !itinerary.title || !itinerary.itinerary) {
      throw new Error('Invalid itinerary structure from OpenAI');
    }

    logger.info('AI', 'Itinerary generated successfully', {
      destination: itinerary.destination,
      days: itinerary.itinerary.length,
      title: itinerary.title
    });

    // Validate multi-destination completeness
    if (parsedTrip.destinations.length > 1) {
      const generatedCities = itinerary.destination.split(',').map(d => d.trim());
      const missingDestinations = parsedTrip.destinations.filter(
        dest => !generatedCities.some(city => 
          city.toLowerCase().includes(dest.name.toLowerCase())
        )
      );
      
      if (missingDestinations.length > 0) {
        logger.warn('AI', 'Missing destinations detected', {
          missing: missingDestinations.map(d => d.name),
          generated: generatedCities
        });
      }
    }

    return itinerary;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('API', `OpenAI API call failed after ${duration}ms`, {
      error: error.message,
      errorType: error.constructor.name,
      statusCode: error.status || error.response?.status
    });
    
    // Provide more specific error messages
    if (error.message?.includes('timeout')) {
      throw new Error('OpenAI request timed out. The itinerary is too complex. Please try with fewer destinations.');
    } else if (error.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY in .env file.');
    } else if (error.status === 429) {
      throw new Error('AI service is temporarily overloaded (Rate Limit). Please wait a moment and try again.');
    } else if (error.status === 500 || error.status === 503) {
      throw new Error('The AI service is currently unavailable. Please try again later.');
    }
    
    throw new Error(`AI generation failed: ${error.message}`);
  }
}

/**
 * Check if OpenAI is configured and available
 */
export function isOpenAIConfigured(): boolean {
  const hasKey = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 20;
  logger.info('SYSTEM', 'OpenAI API Key Check', {
    hasKey,
    keyLength: process.env.OPENAI_API_KEY?.length || 0,
    keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) || 'not set'
  });
  return hasKey;
}
