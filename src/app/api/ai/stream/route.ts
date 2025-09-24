import { NextRequest } from 'next/server';
import { AIController } from '@/services/ai/ai-controller';
import { TripGenerator } from '@/services/ai/trip-generator';
import { ProgressiveGenerator } from '@/services/ai/progressive-generator';
import { logger } from '@/lib/monitoring/logger';

/**
 * API Route: /api/ai/stream
 * Handles conversational itinerary generation with streaming/progressive updates
 */

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();

      try {
        const body = await request.json();
        const { message, prompt, conversationContext, context, sessionId } = body;

        const userMessage = message || prompt;
        const contextToUse = conversationContext || context;

        // Send initial acknowledgment
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'start',
          message: 'Processing your request...',
          timestamp: new Date().toISOString()
        })}\n\n`));

        // Initialize controllers
        const aiController = new AIController();
        const tripGenerator = new TripGenerator();

        // Process message with AI controller
        const response = await aiController.processMessage(userMessage, contextToUse);

        // Send intent extraction update
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'intent_extracted',
          intent: response.intent,
          canGenerate: response.canGenerate,
          missingFields: response.missingFields
        })}\n\n`));

        // Check if we can generate
        if (response.type === 'ready' && response.canGenerate && response.intent) {
          const tripParams = aiController.getTripParameters(response.intent);

          // Decide on generation strategy
          const destinations = tripParams.destination.split(',').map(d => d.trim());
          const useProgressive = tripParams.duration > 7 || destinations.length > 1;

          if (useProgressive) {
            // Progressive generation with streaming updates
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'generation_mode',
              mode: 'progressive',
              destinations,
              duration: tripParams.duration
            })}\n\n`));

            const progressiveGen = new ProgressiveGenerator();

            // Generate with progress callbacks
            const result = await progressiveGen.generateProgressive({
              destinations,
              duration: tripParams.duration,
              startDate: tripParams.startDate,
              preferences: tripParams.preferences,
              onProgress: (update: any) => {
                // Stream progress updates to client
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'progress',
                  ...update
                })}\n\n`));
              }
            });

            // Send final itinerary
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'itinerary',
              message: 'Your itinerary is ready!',
              itinerary: result.itinerary,
              conversationContext: response.context
            })}\n\n`));

          } else {
            // Standard generation
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'generation_mode',
              mode: 'standard'
            })}\n\n`));

            const itinerary = await tripGenerator.generateItinerary(tripParams);

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'itinerary',
              message: 'Your itinerary is ready!',
              itinerary,
              conversationContext: response.context
            })}\n\n`));
          }

        } else if (response.type === 'question') {
          // Need more information
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'question',
            message: response.message,
            awaitingInput: response.missingFields?.[0],
            conversationContext: response.context
          })}\n\n`));

        } else {
          // Other response types
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'confirmation',
            message: response.message,
            conversationContext: response.context
          })}\n\n`));
        }

        // Send completion
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          duration: Date.now() - startTime
        })}\n\n`));

      } catch (error: any) {
        // Send error
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: error.message || 'Failed to process request',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export const runtime = 'nodejs';
export const maxDuration = 300;