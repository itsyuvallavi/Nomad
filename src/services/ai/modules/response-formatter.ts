/**
 * Response Formatter Module
 * Formats AI responses, questions, and error messages
 * Provides consistent response structure across the application
 */

import { ParsedIntent } from './intent-parser';
import { ConversationState } from './conversation-manager';
import { logger } from '@/lib/monitoring/logger';

// Response types
export interface AIResponse {
  type: 'question' | 'ready' | 'generating' | 'error' | 'itinerary';
  message: string;
  intent?: Partial<ParsedIntent>;
  missingFields?: string[];
  canGenerate: boolean;
  context?: string;
  response?: string;
  generationId?: string;
  state?: ConversationState;
}

export class ResponseFormatter {
  /**
   * Format a question for missing information
   */
  formatQuestion(
    missingField: string,
    currentIntent: Partial<ParsedIntent>,
    context?: any
  ): AIResponse {
    const question = this.generateQuestionForField(missingField, currentIntent);

    return {
      type: 'question',
      message: question,
      intent: currentIntent,
      missingFields: [missingField],
      canGenerate: false,
      context: context ? JSON.stringify(context) : undefined
    };
  }

  /**
   * Format a ready to generate response
   */
  formatReadyResponse(
    intent: Partial<ParsedIntent>,
    context?: any
  ): AIResponse {
    const summary = this.generateIntentSummary(intent);

    return {
      type: 'ready',
      message: `Great! I'll create your itinerary:\n${summary}\n\nGenerating your personalized travel plan...`,
      intent,
      canGenerate: true,
      context: context ? JSON.stringify(context) : undefined
    };
  }

  /**
   * Format generating status response
   */
  formatGeneratingResponse(
    generationId: string,
    intent: Partial<ParsedIntent>
  ): AIResponse {
    return {
      type: 'generating',
      message: 'Creating your personalized itinerary...',
      intent,
      canGenerate: false,
      generationId
    };
  }

  /**
   * Format error response
   */
  formatErrorResponse(
    error: string | Error,
    intent?: Partial<ParsedIntent>
  ): AIResponse {
    const errorMessage = error instanceof Error ? error.message : error;

    logger.error('Formatting error response', { error: errorMessage });

    return {
      type: 'error',
      message: `I encountered an issue: ${errorMessage}\n\nPlease try rephrasing your request or provide more details.`,
      intent,
      canGenerate: false
    };
  }

  /**
   * Format itinerary response
   */
  formatItineraryResponse(
    itinerary: any,
    intent: Partial<ParsedIntent>
  ): AIResponse {
    return {
      type: 'itinerary',
      message: 'Your itinerary is ready!',
      response: JSON.stringify(itinerary),
      intent,
      canGenerate: false
    };
  }

  /**
   * Format clarification request
   */
  formatClarificationRequest(
    ambiguity: string,
    options: string[],
    currentIntent: Partial<ParsedIntent>
  ): AIResponse {
    let message = `I need clarification on ${ambiguity}. `;

    if (options.length > 0) {
      message += `Did you mean:\n`;
      options.forEach((option, index) => {
        message += `${index + 1}. ${option}\n`;
      });
    }

    return {
      type: 'question',
      message,
      intent: currentIntent,
      missingFields: [ambiguity],
      canGenerate: false
    };
  }

  /**
   * Format multi-field question
   */
  formatMultiFieldQuestion(
    missingFields: string[],
    currentIntent: Partial<ParsedIntent>
  ): AIResponse {
    const fieldLabels = this.getFieldLabels(missingFields);

    let message = 'To create your perfect itinerary, I need a few more details:\n\n';

    fieldLabels.forEach((label, index) => {
      message += `${index + 1}. ${label}\n`;
    });

    message += '\nYou can provide all information at once or answer one by one.';

    return {
      type: 'question',
      message,
      intent: currentIntent,
      missingFields,
      canGenerate: false
    };
  }

  /**
   * Generate question for specific field
   */
  private generateQuestionForField(
    field: string,
    currentIntent: Partial<ParsedIntent>
  ): string {
    const questions: Record<string, string> = {
      destination: 'Where would you like to go? Please specify a city or region.',

      startDate: 'When would you like to start your trip? You can say things like "next Monday", "March 15", or a specific date.',

      duration: currentIntent.startDate && currentIntent.endDate
        ? 'I see you have dates. Just to confirm, how many days is your trip?'
        : 'How many days would you like to travel?',

      travelers: 'How many people will be traveling? Please specify adults and children if applicable.',

      budget: 'What\'s your budget preference? (budget, medium, or luxury)',

      interests: 'What are your main interests for this trip? (e.g., culture, food, adventure, relaxation)',

      endDate: 'When would you like your trip to end?',

      preferences: 'Do you have any specific preferences or requirements for your trip?'
    };

    return questions[field] || `Please provide information about: ${field}`;
  }

  /**
   * Generate summary of parsed intent
   */
  private generateIntentSummary(intent: Partial<ParsedIntent>): string {
    const parts: string[] = [];

    if (intent.destinations && intent.destinations.length > 1) {
      parts.push(`📍 Multi-city trip: ${intent.destinations.join(' → ')}`);
    } else if (intent.destination) {
      parts.push(`📍 Destination: ${intent.destination}`);
    }

    if (intent.duration) {
      parts.push(`📅 Duration: ${intent.duration} days`);
    }

    if (intent.startDate) {
      const date = new Date(intent.startDate);
      parts.push(`📆 Starting: ${date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`);
    }

    if (intent.travelers) {
      const { adults = 1, children = 0 } = intent.travelers;
      const travelerStr = children > 0
        ? `${adults} adult${adults > 1 ? 's' : ''}, ${children} child${children > 1 ? 'ren' : ''}`
        : `${adults} adult${adults > 1 ? 's' : ''}`;
      parts.push(`👥 Travelers: ${travelerStr}`);
    }

    if (intent.budget) {
      const budgetEmoji = {
        budget: '💰',
        medium: '💵',
        luxury: '💎'
      };
      parts.push(`${budgetEmoji[intent.budget] || '💵'} Budget: ${intent.budget}`);
    }

    if (intent.interests && intent.interests.length > 0) {
      parts.push(`✨ Interests: ${intent.interests.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Get human-readable labels for fields
   */
  private getFieldLabels(fields: string[]): string[] {
    const labels: Record<string, string> = {
      destination: 'Where would you like to go?',
      startDate: 'When do you want to start your trip?',
      duration: 'How many days will you be traveling?',
      travelers: 'How many people are traveling?',
      budget: "What's your budget level?",
      interests: 'What are your main interests?',
      endDate: 'When does your trip end?',
      preferences: 'Any specific preferences?'
    };

    return fields.map(field => labels[field] || `${field}?`);
  }

  /**
   * Format feedback response
   */
  formatFeedbackResponse(
    feedback: string,
    currentItinerary: any
  ): AIResponse {
    return {
      type: 'generating',
      message: `I understand you'd like to: ${feedback}\n\nUpdating your itinerary...`,
      canGenerate: true
    };
  }

  /**
   * Format welcome message
   */
  formatWelcomeMessage(): AIResponse {
    return {
      type: 'question',
      message: `Hello! I'm your AI travel assistant. 🌍\n\nTell me about your dream trip! You can say things like:\n• "3 days in Paris next month"\n• "Week-long adventure in Japan"\n• "Family trip to London in July"\n\nWhat destination are you thinking about?`,
      canGenerate: false,
      missingFields: ['destination', 'duration', 'startDate']
    };
  }

  /**
   * Format confirmation message
   */
  formatConfirmationMessage(intent: Partial<ParsedIntent>): AIResponse {
    const summary = this.generateIntentSummary(intent);

    return {
      type: 'question',
      message: `Let me confirm your trip details:\n\n${summary}\n\nIs this correct? (yes/no)`,
      intent,
      canGenerate: true
    };
  }

  /**
   * Format progress update
   */
  formatProgressUpdate(
    stage: string,
    progress: number
  ): AIResponse {
    const progressBar = this.generateProgressBar(progress);

    return {
      type: 'generating',
      message: `${stage}\n${progressBar} ${Math.round(progress)}%`,
      canGenerate: false
    };
  }

  /**
   * Generate visual progress bar
   */
  private generateProgressBar(progress: number): string {
    const filled = Math.floor(progress / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}