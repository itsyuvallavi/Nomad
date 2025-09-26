import { NextRequest, NextResponse } from 'next/server';
import { AIController } from '@/services/ai/ai-controller';
import { TripGenerator } from '@/services/ai/trip-generator';
import { logger } from '@/lib/monitoring/logger';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// In-memory storage for progress (use Redis/Database in production)
const progressStore = new Map<string, any>();

/**
 * API Route: /api/ai
 * Unified endpoint for AI-powered itinerary generation with progressive polling
 * Supports Firebase deployment constraints
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, prompt, conversationContext, context, sessionId, action } = body;

    // Support backwards compatibility
    const userMessage = message || prompt;
    const contextToUse = conversationContext || context;

    // Check if this is a status check (backwards compatibility)
    if (action === 'status' && sessionId) {
      const progress = progressStore.get(sessionId);
      if (progress) {
        return NextResponse.json({
          success: true,
          data: progress
        });
      }
      return NextResponse.json({
        success: false,
        error: 'No progress found for this session'
      }, { status: 404 });
    }

    // Start new generation
    const generationId = `${sessionId || 'gen'}-${Date.now()}`;

    // Initialize progress with complete structure
    progressStore.set(generationId, {
      type: 'processing',
      status: 'starting',
      progress: 0,
      message: 'Processing your request...',
      awaitingInput: undefined,
      hasItinerary: false
    });

    // Start async generation in the background
    // Capture the API key before the async context
    const apiKey = process.env.OPENAI_API_KEY;
    console.log(`🔑 API Key check:`, {
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 7) || 'missing'
    });

    if (!apiKey) {
      console.error('❌ CRITICAL: No OpenAI API key found!');
      progressStore.set(generationId, {
        type: 'error',
        message: 'OpenAI API key not configured',
        error: true
      });
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }

    // Start generation immediately
    generateProgressively(generationId, userMessage, contextToUse, apiKey).catch(error => {
      logger.error('API', 'Progressive generation failed', error);
      progressStore.set(generationId, {
        type: 'error',
        message: error.message || 'Generation failed',
        error: true
      });
    });

    // Return immediately with generation ID
    return NextResponse.json({
      success: true,
      data: {
        generationId,
        message: 'Generation started. Poll for progress.',
        pollUrl: `/api/ai?generationId=${generationId}`
      }
    });

  } catch (error: any) {
    logger.error('API', 'Failed to start generation', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process request'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const generationId = searchParams.get('generationId');

  if (!generationId) {
    return NextResponse.json({
      success: false,
      error: 'Generation ID required'
    }, { status: 400 });
  }

  const progress = progressStore.get(generationId);

  if (!progress) {
    return NextResponse.json({
      success: false,
      error: 'No progress found',
      data: {
        type: 'error',
        message: 'Generation not found',
        status: 'error'
      }
    }, { status: 404 });
  }

  // Clean up completed generations after 5 minutes
  if (progress.type === 'complete' || progress.type === 'error') {
    setTimeout(() => progressStore.delete(generationId), 300000);
  }

  return NextResponse.json({
    success: true,
    data: progress
  });
}

async function generateProgressively(
  generationId: string,
  userMessage: string,
  contextToUse: string | undefined,
  apiKey?: string
) {
  console.log(`📍 [generateProgressively] Started for ${generationId}`);
  console.log(`🔑 [generateProgressively] API Key received: ${apiKey ? 'Yes' : 'No'}`);
  console.log(`📬 [generateProgressively] Message: ${userMessage}`);

  const aiController = new AIController(apiKey);
  const tripGenerator = new TripGenerator(apiKey);

  // Update progress helper
  const updateProgress = (update: any) => {
    console.log(`📊 Progress Update [${generationId}]:`, {
      status: update.status,
      type: update.type,
      progress: update.progress
    });
    progressStore.set(generationId, update);
  };

  try {
    // Process message
    updateProgress({
      type: 'processing',
      status: 'understanding',
      progress: 10,
      message: 'Understanding your request...'
    });

    // Small delay to ensure progress is stored before first poll
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('🎯 Processing message with AI Controller...');
    const response = await aiController.processMessage(userMessage, contextToUse);
    console.log('✅ AI Controller response:', {
      type: response.type,
      canGenerate: response.canGenerate,
      hasIntent: !!response.intent,
      missingFields: response.missingFields
    });

    updateProgress({
      type: 'processing',
      status: 'intent_extracted',
      progress: 20,
      message: 'Analyzing travel requirements...',
      intent: response.intent,
      missingFields: response.missingFields
    });

    // Check if we can generate
    if (response.type === 'ready' && response.canGenerate && response.intent) {
      const tripParams = aiController.getTripParameters(response.intent);
      const destinations = tripParams.destination.split(',').map((d: string) => d.trim());

      // Always use progressive generation (it's now the default)
      updateProgress({
        type: 'processing',
        status: 'generating',
        progress: 30,
        message: `Planning ${destinations.join(' and ')} trip...`,
        mode: 'progressive'
      });

      let generationError = null;
      let allCityData: any[] = []; // Accumulate city data
      let generatedMetadata: any = null;

      console.log('🚀 [generateProgressively] Starting progressive generation with:', {
        destinations,
        duration: tripParams.duration,
        startDate: tripParams.startDate
      });

      const generationResult = await tripGenerator.generateProgressive({
          destinations,
          duration: tripParams.duration,
          startDate: tripParams.startDate,
          preferences: tripParams.preferences,
          onProgress: (update: any) => {
            console.log(`📡 Progress callback received: ${update.type}`, {
              city: update.city,
              hasData: !!update.data
            });

            if (update.type === 'metadata') {
              generatedMetadata = update.data;
              updateProgress({
                type: 'processing',
                status: 'metadata_ready',
                progress: 40,
                message: 'Trip overview ready',
                metadata: update.data,
                allCities: [] // Initialize empty
              });
              console.log('✅ Metadata update stored, continuing to city generation...');
            } else if (update.type === 'generating') {
              console.log('🔧 Generating update:', update);
            } else if (update.type === 'city_complete') {
              console.log(`🏙️ City complete: ${update.city}, days: ${update.data?.days?.length}`);

              // Add this city's data to accumulated list
              allCityData.push({ city: update.city, data: update.data });

              // Store ALL cities generated so far
              const progress = progressStore.get(generationId);
              updateProgress({
                type: 'processing',
                status: 'city_complete',
                progress: Math.min(40 + update.progress * 0.5, 90),
                message: `Generated ${update.city} itinerary`,
                city: update.city,
                cityData: update.data,
                allCities: allCityData, // Include all cities so far
                metadata: generatedMetadata || progress?.metadata // Keep metadata
              });
              console.log(`✅ City update stored for: ${update.city}, total cities: ${allCityData.length}`);
            }
          }
        }).catch(err => {
          console.error('❌ Progressive generation error:', err);
          console.error('Stack trace:', err.stack);
          generationError = err;
          throw err;
        });

        // Extract the itinerary from the result (it returns { itinerary, updates })
        const result = generationResult.itinerary;

        console.log('✅ [generateProgressively] Generation completed successfully');
        console.log('📊 Final result:', {
          hasItinerary: !!result,
          hasDailyItineraries: !!result?.dailyItineraries,
          days: result?.dailyItineraries?.length || 0,
          firstDay: result?.dailyItineraries?.[0]
        });

        updateProgress({
          type: 'complete',
          status: 'success',
          progress: 100,
          message: 'Your itinerary is ready!',
          itinerary: result, // This is now the extracted itinerary
          allCities: allCityData, // Preserve all cities data
          metadata: generatedMetadata, // Preserve metadata
          conversationContext: response.context
        });

    } else if (response.type === 'question') {
      // Need more information from user
      updateProgress({
        type: 'question',
        status: 'awaiting_input',
        progress: 100,
        message: response.message,
        awaitingInput: response.missingFields?.[0],
        conversationContext: response.context
      });

    } else {
      // Need confirmation from user
      updateProgress({
        type: 'confirmation',
        status: 'awaiting_confirmation',
        progress: 100,
        message: response.message,
        conversationContext: response.context
      });
    }

  } catch (error: any) {
    console.error(`❌ Generation failed [${generationId}]:`, error);
    updateProgress({
      type: 'error',
      status: 'failed',
      progress: 0,
      message: error.message || 'Generation failed',
      error: true,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 300;