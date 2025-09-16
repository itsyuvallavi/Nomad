/**
 * AI-Powered Response Analyzer
 * Uses OpenAI to naturally understand user input without hardcoded patterns
 * The AI extracts information and determines what's still needed
 */

import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''
    });
  }
  return openaiClient;
}

export interface ExtractedInfo {
  destination?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  travelers?: {
    count: number;
    type: string;
  };
  preferences?: {
    activities?: string[];
    budget?: string;
    tripType?: string;
    needsCoworking?: boolean;
  };
  userIntent?: 'plan_trip' | 'modify_trip' | 'ask_question' | 'confirm' | 'cancel';
  modificationRequest?: string;
}

export interface AnalysisResult {
  extractedInfo: ExtractedInfo;
  missingInfo: string[];
  nextQuestion?: string;
  confidence: 'high' | 'medium' | 'low';
  readyToGenerate: boolean;
}

export class AIPoweredAnalyzer {
  async analyzeUserMessage(
    message: string,
    conversationHistory?: string[],
    currentData?: ExtractedInfo
  ): Promise<AnalysisResult> {
    const systemPrompt = `You are an expert travel assistant analyzer. Your job is to understand what the user wants and extract travel planning information from their messages.

Extract the following information if present:
- Destination (city, country, or region)
- Travel dates (start date, end date, or general timeframe)
- Duration (number of days)
- Number and type of travelers (solo, couple, family, group)
- Preferences (activities, budget level, trip type, work needs)
- User intent (planning new trip, modifying existing, asking question, confirming, canceling)

Also determine:
- What information is still missing to create a complete itinerary
- What question to ask next (be conversational and natural)
- Whether we have enough info to generate an itinerary (we need at minimum: destination. Duration can default to 3 days if not specified)

Current collected data: ${JSON.stringify(currentData || {})}
Conversation history: ${conversationHistory?.join(' -> ') || 'None'}

Respond in JSON format.`;

    const userPrompt = `User message: "${message}"

Extract all travel information from this message. Consider the context from previous messages.
If the user mentions a destination (even within a phrase like "plan a trip to Paris"), extract it.
Be smart about understanding variations and natural language.

Response format:
{
  "extractedInfo": {
    "destination": "extracted destination or null",
    "startDate": "extracted date or null",
    "duration": "number of days or null",
    "travelers": {"count": number, "type": "solo/couple/family/group"} or null,
    "preferences": {"activities": [], "budget": "budget/mid/luxury", "tripType": "leisure/business/workation"} or null,
    "userIntent": "plan_trip/modify_trip/ask_question/confirm/cancel",
    "modificationRequest": "if user wants to change something"
  },
  "missingInfo": ["list of missing required info"],
  "nextQuestion": "natural conversational question to ask next",
  "confidence": "high/medium/low",
  "readyToGenerate": boolean (true if we have destination, even without duration)
}`;

    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');

      // Merge with existing data
      if (currentData) {
        result.extractedInfo = {
          ...currentData,
          ...result.extractedInfo
        };
      }

      return result as AnalysisResult;
    } catch (error) {
      console.error('AI analysis failed:', error);

      // Fallback response
      return {
        extractedInfo: currentData || {},
        missingInfo: ['destination', 'dates', 'duration'],
        nextQuestion: "Where would you like to travel?",
        confidence: 'low',
        readyToGenerate: false
      };
    }
  }

  /**
   * Generate a natural response based on analysis
   */
  async generateResponse(
    analysis: AnalysisResult,
    responseType: 'question' | 'confirmation' | 'error'
  ): Promise<string> {
    if (responseType === 'question' && analysis.nextQuestion) {
      return analysis.nextQuestion;
    }

    if (responseType === 'confirmation') {
      const info = analysis.extractedInfo;
      return `Great! Let me confirm your trip details:
📍 Destination: ${info.destination || 'Not specified'}
📅 Dates: ${info.startDate || 'Flexible dates'}
⏱️ Duration: ${info.duration ? `${info.duration} days` : 'Not specified'}
👥 Travelers: ${info.travelers ? `${info.travelers.count} ${info.travelers.type}` : 'Not specified'}

Shall I create your personalized itinerary?`;
    }

    return "I'm having trouble understanding. Could you tell me where you'd like to travel?";
  }
}