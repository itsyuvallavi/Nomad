import { NextRequest, NextResponse } from 'next/server';
import { generatePersonalizedItinerary } from '@/ai/flows/generate-personalized-itinerary';
import { analyzeInitialPrompt } from '@/ai/flows/analyze-initial-prompt';

// Cache for recent prompts (in-memory cache)
const promptCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache

// Clean up old cache entries
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of promptCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      promptCache.delete(key);
    }
  }
}

// Generate cache key from prompt
function getCacheKey(prompt: string, context?: any): string {
  return `${prompt.toLowerCase().trim()}_${JSON.stringify(context || {})}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, context } = body;

    // Clean old cache entries periodically
    cleanCache();

    // Check cache first
    const cacheKey = getCacheKey(prompt, context);
    const cached = promptCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Returning cached itinerary');
      return NextResponse.json({ 
        success: true, 
        data: cached.data,
        cached: true 
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'X-Cache': 'HIT'
        }
      });
    }

    // Analyze the prompt first
    const analysis = await analyzeInitialPrompt({ prompt });
    
    // Generate the itinerary
    const itinerary = await generatePersonalizedItinerary({
      prompt,
      userPreferences: context?.preferences || {},
      context: analysis
    });

    // Store in cache
    promptCache.set(cacheKey, {
      data: itinerary,
      timestamp: Date.now()
    });

    return NextResponse.json({ 
      success: true, 
      data: itinerary 
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'X-Cache': 'MISS'
      }
    });
  } catch (error) {
    console.error('Error generating itinerary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate itinerary' 
      },
      { status: 500 }
    );
  }
}

// Optimize for edge runtime for better performance
export const runtime = 'nodejs'; // Use 'edge' if your AI libs support it
export const maxDuration = 60; // Maximum execution time in seconds