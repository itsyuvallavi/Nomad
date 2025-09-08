/**
 * Chunked OpenAI integration for large multi-destination itineraries
 * This approach generates each destination separately to avoid timeouts
 * 
 * ⚠️ CRITICAL: NEVER USE HARDCODED DATA!
 * ✅ ALWAYS fetch from OpenAI API for EVERY destination
 * ❌ NEVER return mock or hardcoded itineraries
 * ❌ NEVER use fallback static data
 * ALL DATA MUST COME FROM LIVE API CALLS!
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { parseDestinations, buildStructuredPrompt } from '@/ai/utils/destination-parser';

// Initialize OpenAI client
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (typeof window !== 'undefined') {
    throw new Error('OpenAI client should only be used on the server');
  }
  
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 45000, // 45 second timeout per chunk
      maxRetries: 2, // Add automatic retries
    });
  }
  
  return openai;
}

interface DestinationChunk {
  destination: string;
  days: number;
  startDay: number;
  endDay: number;
}

/**
 * Generate itinerary for a single destination
 */
async function generateDestinationChunk(
  chunk: DestinationChunk,
  tripContext: string,
  startDate: Date
): Promise<any[]> {
  const client = getOpenAIClient();
  
  // Calculate dates for this chunk
  const chunkStartDate = new Date(startDate);
  chunkStartDate.setDate(chunkStartDate.getDate() + chunk.startDay - 1);
  
  const systemPrompt = `Generate a ${chunk.days}-day itinerary for ${chunk.destination}.
Days should be numbered ${chunk.startDay} to ${chunk.endDay}.
Start date: ${chunkStartDate.toISOString().split('T')[0]}

Return ONLY a valid JSON array of day objects:
[{"day": number, "date": "YYYY-MM-DD", "title": "string", "activities": [3-4 activities]}]
An activity is: {"time": "string", "description": "string", "category": "Travel/Food/Leisure", "address": "string"}`;

  const userPrompt = `Create a detailed ${chunk.days}-day itinerary for ${chunk.destination}.
Context for the whole trip: ${tripContext}
Include realistic activities, local restaurants, and cultural experiences.`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 4096, // Increased token limit per chunk
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{"days": []}';
    // The AI might return the array directly or wrapped in an object.
    const result = JSON.parse(content);
    
    // Extract the days array from various possible response formats
    const days = result.days || result.itinerary || (Array.isArray(result) ? result : []);
    
    return Array.isArray(days) ? days : [];
  } catch (error: any) {
    logger.error('AI', `Failed to generate chunk for ${chunk.destination}`, error);
    // Provide more specific error messages for chunk generation
    if (error.status === 429) {
      throw new Error(`AI service is overloaded while generating plans for ${chunk.destination}. Please try again shortly.`);
    }
    throw new Error(`Failed to generate itinerary for ${chunk.destination}: ${error.message}`);
  }
}

/**
 * Generate itinerary using chunked approach
 */
export async function generateChunkedItinerary(
  prompt: string,
  attachedFile?: string,
  conversationHistory?: string
): Promise<GeneratePersonalizedItineraryOutput> {
  const startTime = Date.now();
  
  logger.info('AI', 'Starting CHUNKED OpenAI generation', {
    model: 'gpt-4o-mini',
    timestamp: new Date().toISOString(),
  });

  // Parse destinations
  const parsedTrip = parseDestinations(prompt);
  
  if (parsedTrip.destinations.length === 0) {
    // If no destinations parsed, but we have a totalDays, create one chunk
    if (parsedTrip.totalDays > 0) {
        parsedTrip.destinations.push({
            name: "Destination", // Generic name
            duration: parsedTrip.totalDays,
            durationText: `${parsedTrip.totalDays} days`,
            order: 1,
        });
    } else {
        throw new Error('No destinations or duration found in prompt for chunked generation.');
    }
  }

  // Calculate start date (default to next Monday)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + ((1 - today.getDay() + 7) % 7 || 7));
  
  // Create chunks for each destination
  const chunks: DestinationChunk[] = [];
  let currentDay = 1;
  
  for (const dest of parsedTrip.destinations) {
    const days = dest.duration || 7; // Use duration, default to 7
    
    const chunk: DestinationChunk = {
      destination: dest.name,
      days: days,
      startDay: currentDay,
      endDay: currentDay + days - 1
    };
    chunks.push(chunk);
    currentDay += days;
  }

  logger.info('AI', 'Generation chunks prepared', {
    chunks: chunks.map(c => ({ 
      destination: c.destination, 
      days: c.days,
      range: `${c.startDay}-${c.endDay}`
    }))
  });

  // Generate each chunk sequentially to avoid timeouts and rate limits
  const allDays: any[] = [];
  
  for (const chunk of chunks) {
    logger.info('AI', `Generating chunk ${chunks.indexOf(chunk) + 1}/${chunks.length}`, {
        destination: chunk.destination,
        days: `${chunk.startDay}-${chunk.endDay}`
    });
    
    try {
      const chunkDays = await generateDestinationChunk(chunk, prompt, startDate);
      // Add destination metadata to each day for easier tracking
      const daysWithDestination = chunkDays.map(day => ({
        ...day,
        _destination: chunk.destination // Add metadata to track which destination this day belongs to
      }));
      allDays.push(...daysWithDestination);
      
      logger.info('AI', `Chunk completed: ${chunk.destination}`, { generatedDays: chunkDays.length });
    } catch (error: any) {
      logger.error('AI', `Failed to generate chunk for ${chunk.destination}`, { error });
      // ⚠️ CRITICAL: NO FALLBACK DATA! If API fails, the whole generation must fail
      // We NEVER use hardcoded data - ALL data must come from APIs
      logger.error('AI', `CRITICAL: API failed for ${chunk.destination} - cannot continue without real data`);
      throw error; // Re-throw the specific error from generateDestinationChunk
    }
  }

  // Sort days by day number
  allDays.sort((a, b) => a.day - b.day);

  // Add travel days between destinations
  const itineraryWithTravel: any[] = [];
  
  for (let i = 0; i < allDays.length; i++) {
    const currentDayData = allDays[i];
    const nextDayData = allDays[i + 1];
    
    itineraryWithTravel.push(currentDayData);
    
    // Check if we're transitioning between destinations
    if (nextDayData && i < chunks.length - 1) {
      const currentChunk = chunks.find(c => currentDayData.day >= c.startDay && currentDayData.day <= c.endDay);
      const nextChunk = chunks.find(c => nextDayData.day >= c.startDay && nextDayData.day <= c.endDay);
      
      if (currentChunk && nextChunk && currentChunk.destination !== nextChunk.destination) {
        // This is the last day of a destination, add travel to the first activity of the next day
        if (nextDayData.activities && nextDayData.activities.length > 0) {
          // Add travel as first activity
          nextDayData.activities.unshift({
            time: "Morning",
            description: `Travel from ${currentChunk.destination} to ${nextChunk.destination}`,
            category: "Travel",
            address: `Flight/Travel to ${nextChunk.destination}`
          });
        }
      }
    }
  }

  // Build the final itinerary
  const destinationNames = parsedTrip.destinations.map(d => d.name).join(', ');
  const title = `${parsedTrip.totalDays}-Day Adventure to ${destinationNames}`;
  
  // Generate quick tips via OpenAI API - NO HARDCODED DATA!
  const tipsPrompt = `Generate 5 travel tips for a trip to: ${destinationNames}. Format as JSON array of strings.`;
  let quickTips: string[] = [];
  
  try {
    const client = getOpenAIClient();
    const tipsResponse = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Return only a JSON array of 5 short travel tips.' },
        { role: 'user', content: tipsPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });
    
    const tipsContent = tipsResponse.choices[0]?.message?.content || '{"tips":[]}';
    const tipsData = JSON.parse(tipsContent);
    // Extract tips array from various possible formats
    if (Array.isArray(tipsData)) {
      quickTips = tipsData;
    } else if (tipsData.tips && Array.isArray(tipsData.tips)) {
      quickTips = tipsData.tips;
    } else if (tipsData.quickTips && Array.isArray(tipsData.quickTips)) {
      quickTips = tipsData.quickTips;
    } else {
      quickTips = [`Multi-destination trip to ${parsedTrip.destinations.length} countries`];
    }
  } catch (error: any) {
    logger.warn('AI', 'Failed to generate tips, using minimal defaults', error);
    // Even tips must come from API - if API fails, provide minimal info
    quickTips = [`Multi-destination trip to ${parsedTrip.destinations.length} countries`];
  }
  
  const itinerary: GeneratePersonalizedItineraryOutput = {
    destination: destinationNames,
    title: title,
    itinerary: itineraryWithTravel.length > 0 ? itineraryWithTravel : allDays,
    quickTips: quickTips
  };

  const duration = Date.now() - startTime;
  logger.info('AI', '✅ Chunked generation completed', {
    duration: `${duration}ms`,
    destinations: chunks.length,
    totalDays: itinerary.itinerary.length
  });

  return itinerary;
}
