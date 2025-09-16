import { NextRequest, NextResponse } from 'next/server';
import {
  generatePersonalizedItineraryV2,
  type ConversationalItineraryOutput
} from '@/services/ai/flows/generate-personalized-itinerary-v2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, conversationContext, sessionId, attachedFile } = body;

    // Call the new conversational generation
    const response: ConversationalItineraryOutput = await generatePersonalizedItineraryV2({
      prompt,
      conversationHistory: conversationContext,
      sessionId,
      attachedFile
    });

    // Return the conversational response
    return NextResponse.json({
      success: true,
      data: response
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Conversation-Session': sessionId || 'new'
      }
    });
  } catch (error: any) {
    console.error('Error in conversational itinerary generation:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process conversation',
        type: 'error'
      },
      { status: 500 }
    );
  }
}

// Configuration
export const runtime = 'nodejs';
export const maxDuration = 60; // Maximum execution time in seconds