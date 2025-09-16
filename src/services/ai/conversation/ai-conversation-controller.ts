/**
 * AI-Powered Conversation Controller
 * Uses OpenAI to handle all conversation logic naturally
 * No hardcoded patterns - just intelligent understanding
 */

import { AIPoweredAnalyzer, ExtractedInfo, AnalysisResult } from './ai-powered-analyzer';
import { generateConversationalItinerary } from '@/services/ai/utils/conversational-generator';
import { enrichItineraryWithLocationIQ } from '@/services/ai/services/location-enrichment-locationiq';
import { getWeatherForecast } from '@/services/api/weather';
import { logger } from '@/lib/monitoring/logger';

export enum ResponseType {
  QUESTION = 'question',
  ITINERARY = 'itinerary',
  CONFIRMATION = 'confirmation',
  ERROR = 'error'
}

export interface ConversationResponse {
  type: ResponseType;
  message: string;
  itinerary?: any;
  awaitingInput?: string;
  canProceed: boolean;
  conversationContext?: string;
}

export class AIConversationController {
  private analyzer: AIPoweredAnalyzer;
  private conversationHistory: string[] = [];
  private collectedData: ExtractedInfo = {};
  private sessionId: string;

  constructor(sessionId?: string, existingContext?: string) {
    this.analyzer = new AIPoweredAnalyzer();
    this.sessionId = sessionId || `session-${Date.now()}`;

    // Restore context if provided
    if (existingContext) {
      try {
        const context = JSON.parse(existingContext);
        this.conversationHistory = context.history || [];
        this.collectedData = context.data || {};
      } catch (e) {
        logger.warn('AI', 'Failed to parse conversation context', e);
      }
    }
  }

  /**
   * Process any user message naturally using AI
   */
  async processMessage(message: string): Promise<ConversationResponse> {
    try {
      // Add to conversation history
      this.conversationHistory.push(message);

      // Analyze the message with AI
      const analysis = await this.analyzer.analyzeUserMessage(
        message,
        this.conversationHistory,
        this.collectedData
      );

      // Update collected data
      this.collectedData = {
        ...this.collectedData,
        ...analysis.extractedInfo
      };

      logger.info('AI', 'Message analysis', {
        extracted: analysis.extractedInfo,
        missing: analysis.missingInfo,
        ready: analysis.readyToGenerate
      });

      // Check if user wants to modify existing itinerary
      if (analysis.extractedInfo.userIntent === 'modify_trip' && this.collectedData.destination) {
        return this.handleModification(analysis);
      }

      // Check if we have enough info to generate
      if (analysis.readyToGenerate) {
        return this.generateItinerary();
      }

      // Ask for missing information
      if (analysis.missingInfo.length > 0 && analysis.nextQuestion) {
        return {
          type: ResponseType.QUESTION,
          message: analysis.nextQuestion,
          awaitingInput: analysis.missingInfo[0], // First missing field
          canProceed: false,
          conversationContext: this.getContext()
        };
      }

      // If uncertain, ask for destination (most important)
      if (!this.collectedData.destination) {
        return {
          type: ResponseType.QUESTION,
          message: "Where would you like to travel? I can help you plan an amazing trip to any destination.",
          awaitingInput: 'destination',
          canProceed: false,
          conversationContext: this.getContext()
        };
      }

      // Default to asking for confirmation if we have basic info
      if (this.collectedData.destination) {
        const confirmMessage = await this.analyzer.generateResponse(analysis, 'confirmation');
        return {
          type: ResponseType.CONFIRMATION,
          message: confirmMessage,
          awaitingInput: 'confirmation',
          canProceed: true,
          conversationContext: this.getContext()
        };
      }

      // Fallback
      return {
        type: ResponseType.QUESTION,
        message: "I'm here to help plan your trip. Where would you like to go?",
        awaitingInput: 'destination',
        canProceed: false,
        conversationContext: this.getContext()
      };

    } catch (error: any) {
      logger.error('AI', 'Conversation processing error', error);
      return {
        type: ResponseType.ERROR,
        message: "I encountered an issue understanding your request. Could you please tell me where you'd like to travel?",
        canProceed: false,
        conversationContext: this.getContext()
      };
    }
  }

  /**
   * Generate the actual itinerary using collected data
   */
  private async generateItinerary(): Promise<ConversationResponse> {
    try {
      logger.info('AI', 'Generating itinerary with collected data', this.collectedData);

      // Set defaults for missing optional fields
      const tripData = {
        destination: this.collectedData.destination!,
        duration: this.collectedData.duration || 3,
        startDate: this.collectedData.startDate || 'flexible',
        travelers: this.collectedData.travelers || { count: 1, type: 'solo' },
        preferences: this.collectedData.preferences || {}
      };

      // Generate base itinerary using OpenAI
      // Format the prompt to include all information
      const prompt = `Generate a ${tripData.duration} day itinerary for ${tripData.destination} ${
        tripData.startDate && tripData.startDate !== 'flexible' ? `starting ${tripData.startDate}` : 'with flexible dates'
      } for ${tripData.travelers.count} ${tripData.travelers.type} travelers`;

      const itinerary = await generateConversationalItinerary(prompt, '');

      // Enrich with LocationIQ if available
      const hasLocationIQ = !!process.env.LOCATIONIQ_API_KEY || !!process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY;
      let enrichedItinerary = itinerary;

      if (hasLocationIQ) {
        try {
          enrichedItinerary = await enrichItineraryWithLocationIQ(itinerary);
          logger.info('AI', 'Itinerary enriched with LocationIQ');
        } catch (error) {
          logger.warn('AI', 'LocationIQ enrichment failed', error);
        }
      }

      // Add weather data if available
      const hasWeatherAPI = !!process.env.OPENWEATHERMAP;
      if (hasWeatherAPI && tripData.destination && tripData.duration) {
        try {
          const weatherData = await getWeatherForecast(tripData.destination, tripData.duration);
          if (weatherData && weatherData.length > 0) {
            enrichedItinerary.itinerary = enrichedItinerary.itinerary.map((day: any, index: number) => {
              const dayWeather = weatherData[index];
              if (dayWeather) {
                return {
                  ...day,
                  weather: {
                    temp: dayWeather.temp,
                    weather: dayWeather.weather,
                    humidity: dayWeather.humidity,
                    wind_speed: dayWeather.wind_speed,
                    pop: dayWeather.pop
                  }
                };
              }
              return day;
            });
            logger.info('AI', 'Weather data added to itinerary');
          }
        } catch (error) {
          logger.warn('AI', 'Weather fetch failed', error);
        }
      }

      return {
        type: ResponseType.ITINERARY,
        message: `Here's your personalized ${tripData.duration}-day itinerary for ${tripData.destination}!

I've crafted this based on your preferences. Feel free to ask me to modify anything - I can change activities, adjust the schedule, or completely revise any day.`,
        itinerary: enrichedItinerary,
        canProceed: true,
        conversationContext: this.getContext()
      };

    } catch (error: any) {
      logger.error('AI', 'Itinerary generation failed', error);
      return {
        type: ResponseType.ERROR,
        message: `I had trouble creating your itinerary. Let's try again - could you tell me more about your trip to ${this.collectedData.destination}?`,
        canProceed: false,
        conversationContext: this.getContext()
      };
    }
  }

  /**
   * Handle modification requests for existing itinerary
   */
  private async handleModification(analysis: AnalysisResult): Promise<ConversationResponse> {
    // This would integrate with the modification flow
    return {
      type: ResponseType.QUESTION,
      message: `I understand you want to modify your trip. ${analysis.extractedInfo.modificationRequest || 'What would you like to change?'}`,
      awaitingInput: 'modification',
      canProceed: false,
      conversationContext: this.getContext()
    };
  }

  /**
   * Get serialized context for storage
   */
  getContext(): string {
    return JSON.stringify({
      history: this.conversationHistory,
      data: this.collectedData,
      sessionId: this.sessionId
    });
  }

  /**
   * Check if we can generate an itinerary
   */
  canGenerate(): boolean {
    return !!this.collectedData.destination;
  }
}