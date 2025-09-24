import { NextRequest, NextResponse } from 'next/server';
import { AIController } from '@/services/ai/ai-controller';
import { TripGenerator } from '@/services/ai/trip-generator';
import { ProgressiveGenerator } from '@/services/ai/progressive-generator';
import { logger } from '@/lib/monitoring/logger';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// In-memory storage for progress (use Redis/Database in production)
const progressStore = new Map<string, any>();

/**
 * API Route: /api/ai/progressive
 * Polling-based progressive generation for Firebase compatibility
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationContext, sessionId, action } = body;

    // Check if this is a status check
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
    const userMessage = message;
    const contextToUse = conversationContext;
    const generationId = `${sessionId}-${Date.now()}`;

    // Initialize progress
    progressStore.set(generationId, {
      type: 'processing',
      status: 'starting',
      progress: 0,
      message: 'Processing your request...'
    });

    // Start async generation in the background
    // Capture the API key before the async context
    const apiKey = process.env.OPENAI_API_KEY;
    console.log(`🔑 API Key available: ${apiKey ? 'Yes' : 'No'}`);

    // Use process.nextTick to ensure it runs after response is sent but ASAP
    process.nextTick(() => {
      console.log(`🚀 Starting background generation for ${generationId}`);
      console.log(`🔑 API Key in background: ${apiKey ? 'Yes' : 'No'}`);
      generateProgressively(generationId, userMessage, contextToUse, apiKey).catch(error => {
        logger.error('API', 'Progressive generation failed', error);
        progressStore.set(generationId, {
          type: 'error',
          message: error.message || 'Generation failed',
          error: true
        });
      });
    });

    // Return immediately with generation ID
    return NextResponse.json({
      success: true,
      data: {
        generationId,
        message: 'Generation started. Poll for progress.',
        pollUrl: `/api/ai/progressive?action=status&sessionId=${generationId}`
      }
    });

  } catch (error: any) {
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
      error: 'No progress found'
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

  const aiController = new AIController();
  const tripGenerator = new TripGenerator();

  // Update progress
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

    // Add initial delay to ensure UI has time to start polling
    await new Promise(resolve => setTimeout(resolve, 500));

    const response = await aiController.processMessage(userMessage, contextToUse);

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
      const destinations = tripParams.destination.split(',').map(d => d.trim());
      const useProgressive = tripParams.duration > 7 || destinations.length > 1;

      if (useProgressive) {
        updateProgress({
          type: 'processing',
          status: 'generating',
          progress: 30,
          message: `Planning ${destinations.join(' and ')} trip...`,
          mode: 'progressive'
        });

        const progressiveGen = new ProgressiveGenerator(apiKey);

        let generationError = null;
        let allCityData = []; // Accumulate city data
        let generatedMetadata = null;

        const result = await progressiveGen.generateProgressive({
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
          generationError = err;
          throw err;
        });

        updateProgress({
          type: 'complete',
          status: 'success',
          progress: 100,
          message: 'Your itinerary is ready!',
          itinerary: result.itinerary,
          allCities: allCityData, // Preserve all cities data
          metadata: generatedMetadata, // Preserve metadata
          conversationContext: response.context
        });

      } else {
        // Standard generation
        updateProgress({
          type: 'processing',
          status: 'generating',
          progress: 50,
          message: 'Generating your itinerary...',
          mode: 'standard'
        });

        const itinerary = await tripGenerator.generateItinerary(tripParams);

        updateProgress({
          type: 'complete',
          status: 'success',
          progress: 100,
          message: 'Your itinerary is ready!',
          itinerary,
          conversationContext: response.context
        });
      }

    } else if (response.type === 'question') {
      updateProgress({
        type: 'question',
        status: 'awaiting_input',
        progress: 100,
        message: response.message,
        awaitingInput: response.missingFields?.[0],
        conversationContext: response.context
      });

    } else {
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