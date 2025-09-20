import { NextRequest, NextResponse } from 'next/server';
import { AIController } from '@/services/ai/ai-controller';
import { TripGenerator } from '@/services/ai/trip-generator';
import { logger } from '@/lib/monitoring/logger';

/**
 * API Route: /api/ai
 * Handles conversational itinerary generation with OSM enrichment
 */

// Response type for the API
export interface ConversationalItineraryOutput {
  type: 'question' | 'confirmation' | 'itinerary' | 'error';
  message: string;
  awaitingInput?: string;
  suggestedOptions?: string[];
  itinerary?: any;
  conversationContext?: string;
  requiresGeneration?: boolean;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { message, prompt, conversationContext, context, sessionId } = body;

    // Support both 'message' and 'prompt' fields for backwards compatibility
    const userMessage = message || prompt;

    // Process the message through the conversation controller
    // Support both 'conversationContext' and 'context' fields
    const contextToUse = conversationContext || context;


    // DETAILED REQUEST LOGGING
    console.log('\n' + '='.repeat(80));
    console.log('🔵 NEW UI REQUEST');
    console.log('='.repeat(80));
    console.log(`📝 USER INPUT: "${userMessage}"`);
    console.log(`🕐 TIME: ${new Date().toISOString()}`);
    console.log(`🆔 SESSION: ${sessionId || 'new-session'}`);
    console.log(`📦 HAS CONTEXT: ${!!contextToUse}`);
    console.log('-'.repeat(80));

    // Initialize controllers
    const aiController = new AIController();
    const tripGenerator = new TripGenerator();

    logger.info('API', 'Processing message with AI controller', {
      hasContext: !!contextToUse
    });

    const aiStartTime = Date.now();
    const response = await aiController.processMessage(userMessage, contextToUse);
    const aiTime = Date.now() - aiStartTime;

    // LOG AI RESPONSE DETAILS
    console.log('\n⚡ INTENT EXTRACTION:');
    console.log(`   Time: ${aiTime}ms`);
    console.log(`   Type: ${response.type}`);
    console.log(`   Message: "${response.message}"`);
    if (response.intent) {
      console.log(`   Extracted Intent:`);
      console.log(`     - Destination: ${response.intent.destination || 'missing'}`);
      console.log(`     - Duration: ${response.intent.duration || 'missing'}`);
      console.log(`     - Start Date: ${response.intent.startDate || 'missing'}`);
      console.log(`     - Travelers: ${JSON.stringify(response.intent.travelers) || 'missing'}`);
    }
    if (response.missingFields?.length) {
      console.log(`   Missing Fields: ${response.missingFields.join(', ')}`);
    }
    console.log('-'.repeat(80));

    // Check if we have enough information to generate
    if (response.type === 'ready' && response.canGenerate && response.intent) {
      // Extract parameters and generate itinerary
      const tripParams = aiController.getTripParameters(response.intent);

      logger.info('API', 'Generating itinerary', {
        destination: tripParams.destination,
        duration: tripParams.duration
      });

      // Generate the itinerary with HERE enrichment
      const genStartTime = Date.now();
      console.log('\n🎯 GENERATING ITINERARY...');
      const itinerary = await tripGenerator.generateItinerary(tripParams);
      const genTime = Date.now() - genStartTime;

      // LOG GENERATION DETAILS
      console.log(`   Generation Time: ${genTime}ms`);
      console.log(`   Days Generated: ${itinerary.itinerary?.length || 0}`);
      console.log(`   Total Activities: ${itinerary.itinerary?.reduce((sum, day) => sum + (day.activities?.length || 0), 0) || 0}`);
      if (itinerary.itinerary?.length > 0) {
        console.log(`   First Day: ${itinerary.itinerary[0].date}`);
        console.log(`   Last Day: ${itinerary.itinerary[itinerary.itinerary.length - 1].date}`);
      }

      console.log('\n✅ COMPLETE RESPONSE SUMMARY:');
      console.log(`   Total Time: ${Date.now() - startTime}ms`);
      console.log(`   Intent Extraction: ${aiTime}ms`);
      console.log(`   Itinerary Generation: ${genTime}ms`);
      console.log('='.repeat(80) + '\n');

      // Return the generated itinerary
      return NextResponse.json({
        success: true,
        data: {
          type: 'itinerary',
          message: 'Your itinerary is ready!',
          itinerary,
          conversationContext: response.context
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Conversation-Session': sessionId || 'new'
        }
      });
    }

    // Need more information - return question
    if (response.type === 'question') {
      console.log('\n❓ ASKING FOLLOW-UP QUESTION:');
      console.log(`   Question: "${response.message}"`);
      console.log(`   Missing Fields: ${response.missingFields?.join(', ') || 'none'}`);
      console.log(`   Total Time: ${Date.now() - startTime}ms`);
      console.log('='.repeat(80) + '\n');

      return NextResponse.json({
        success: true,
        data: {
          type: 'question',
          message: response.message,
          awaitingInput: response.missingFields?.[0],
          suggestedOptions: undefined,
          conversationContext: response.context
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Conversation-Session': sessionId || 'new'
        }
      });
    }

    // Handle other response types
    console.log('\n💬 OTHER RESPONSE TYPE:');
    console.log(`   Type: ${response.type}`);
    console.log(`   Message: "${response.message}"`);
    console.log(`   Total Time: ${Date.now() - startTime}ms`);
    console.log('='.repeat(80) + '\n');

    return NextResponse.json({
      success: true,
      data: {
        type: 'confirmation',
        message: response.message,
        requiresGeneration: false,
        conversationContext: response.context
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Conversation-Session': sessionId || 'new'
      }
    });

  } catch (error: any) {
    const errorTime = Date.now() - startTime;

    // LOG ERROR DETAILS
    console.log('\n❌ ERROR OCCURRED:');
    console.log(`   Error Type: ${error.name}`);
    console.log(`   Error Message: ${error.message}`);
    console.log(`   Time to Error: ${errorTime}ms`);
    if (error.stack) {
      console.log(`   Stack Trace:`);
      console.log(error.stack.split('\n').slice(0, 5).map((l: string) => `     ${l}`).join('\n'));
    }
    console.log('='.repeat(80) + '\n');

    // Check for timeout (increased to 45 seconds for multi-city trips)
    if (error.name === 'AbortError' || errorTime > 45000) {
      return NextResponse.json({
        success: false,
        error: 'Request timed out. Please try again with a simpler request.',
        type: 'error',
        timeElapsed: errorTime
      }, { status: 504 });
    }

    // Check for OpenAI errors
    if (error.message?.includes('OpenAI') || error.message?.includes('API')) {
      return NextResponse.json({
        success: false,
        error: 'AI service temporarily unavailable. Please try again.',
        type: 'error',
        details: error.message
      }, { status: 503 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process request',
        type: 'error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Configuration
export const runtime = 'nodejs';
export const maxDuration = 60; // Maximum execution time in seconds