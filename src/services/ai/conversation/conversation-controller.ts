/**
 * Conversation Controller
 * Main orchestrator for the conversational AI flow
 * NEVER generates without complete information - always asks first
 */

import {
  ConversationStateManager,
  ConversationState,
  ConversationContext,
  Message,
  CollectedData
} from './conversation-state-manager';
import { QuestionGenerator } from './question-generator';
import { ResponseAnalyzer, AnalysisResult } from './response-analyzer';

export enum ResponseType {
  QUESTION = 'question',
  CONFIRMATION = 'confirmation',
  ITINERARY = 'itinerary',
  MODIFICATION = 'modification',
  ERROR = 'error',
  GREETING = 'greeting'
}

export interface ConversationResponse {
  type: ResponseType;
  message: string;
  awaitingInput?: string;
  canProceed: boolean;
  suggestedOptions?: string[];
  itinerary?: any;
  requiresGeneration?: boolean;
  collectedData?: CollectedData;
}

export class ConversationController {
  private stateManager: ConversationStateManager;
  private questionGenerator: QuestionGenerator;
  private responseAnalyzer: ResponseAnalyzer;

  constructor(sessionId?: string, existingContext?: string) {
    if (existingContext) {
      this.stateManager = ConversationStateManager.deserialize(existingContext);
    } else {
      this.stateManager = new ConversationStateManager(sessionId);
    }
    this.questionGenerator = new QuestionGenerator();
    this.responseAnalyzer = new ResponseAnalyzer();
  }

  /**
   * Main entry point - process user message and return appropriate response
   * CRITICAL: This enforces the no-defaults policy
   */
  async processUserMessage(message: string): Promise<ConversationResponse> {
    // Add message to history
    this.stateManager.addMessage({
      role: 'user',
      content: message,
      timestamp: new Date(),
      messageType: 'answer'
    });

    // Check for timeout
    if (this.stateManager.hasTimedOut()) {
      this.stateManager.reset();
      return this.handleGreeting(message);
    }

    // Get current state
    const currentState = this.stateManager.getState();

    // Route based on state
    switch (currentState) {
      case ConversationState.GREETING:
        return this.handleGreeting(message);

      case ConversationState.COLLECTING_DESTINATION:
        return this.handleDestinationCollection(message);

      case ConversationState.COLLECTING_DATES:
        return this.handleDatesCollection(message);

      case ConversationState.COLLECTING_DURATION:
        return this.handleDurationCollection(message);

      case ConversationState.COLLECTING_TRAVELERS:
        return this.handleTravelersCollection(message);

      case ConversationState.COLLECTING_PREFERENCES:
        return this.handlePreferencesCollection(message);

      case ConversationState.CONFIRMING_DETAILS:
        return this.handleConfirmation(message);

      case ConversationState.SHOWING_ITINERARY:
      case ConversationState.AWAITING_FEEDBACK:
        return this.handleFeedback(message);

      case ConversationState.MODIFYING:
        return this.handleModification(message);

      default:
        return this.handleGeneralMessage(message);
    }
  }

  /**
   * Handle greeting and initial message
   */
  private async handleGreeting(message: string): Promise<ConversationResponse> {
    // Analyze the initial message
    const analysis = await this.responseAnalyzer.analyzeResponse(message, 'general');

    // Check if they already provided a destination
    const destinationAnalysis = await this.responseAnalyzer.analyzeResponse(message, 'destination');
    if (destinationAnalysis.value &&
        destinationAnalysis.confidence === 'high' &&
        !destinationAnalysis.needsClarification) {
      this.stateManager.updateCollectedData({ destination: destinationAnalysis.value });
      this.stateManager.setState(ConversationState.COLLECTING_DATES);

      const question = this.questionGenerator.generateQuestion('dates', this.stateManager.getContext().collectedData);
      return {
        type: ResponseType.QUESTION,
        message: `Great! ${destinationAnalysis.value} sounds wonderful. ${question}`,
        awaitingInput: 'dates',
        canProceed: false
      };
    }

    // No destination provided - ask for it
    this.stateManager.setState(ConversationState.COLLECTING_DESTINATION);
    const greeting = this.questionGenerator.generateGreeting();

    return {
      type: ResponseType.GREETING,
      message: greeting,
      awaitingInput: 'destination',
      canProceed: false
    };
  }

  /**
   * Handle destination collection
   */
  private async handleDestinationCollection(message: string): Promise<ConversationResponse> {
    const analysis = await this.responseAnalyzer.analyzeResponse(message, 'destination');

    // User is uncertain
    if (analysis.needsClarification && analysis.clarificationReason === 'uncertain') {
      const help = this.questionGenerator.generateUncertaintyHelp('destination');
      return {
        type: ResponseType.QUESTION,
        message: help,
        awaitingInput: 'destination',
        canProceed: false,
        suggestedOptions: ['Paris', 'Tokyo', 'Barcelona', 'New York', 'Bali']
      };
    }

    // Too vague (like "Europe")
    if (analysis.needsClarification && analysis.clarificationReason === 'too_vague') {
      const followUp = this.questionGenerator.generateFollowUp('destination', message);
      return {
        type: ResponseType.QUESTION,
        message: `${message} is a great region! ${followUp}`,
        awaitingInput: 'destination',
        canProceed: false
      };
    }

    // Too many destinations
    if (analysis.needsClarification && analysis.clarificationReason === 'too_many_destinations') {
      return {
        type: ResponseType.QUESTION,
        message: `That's a lot of places! I can handle up to 5 destinations. Which are your top priorities?`,
        awaitingInput: 'destination',
        canProceed: false
      };
    }

    // Valid destination
    if (analysis.value && !analysis.needsClarification && analysis.confidence === 'high') {
      this.stateManager.updateCollectedData({ destination: analysis.value });
      this.stateManager.setState(ConversationState.COLLECTING_DATES);

      const question = this.questionGenerator.generateQuestion('dates', this.stateManager.getContext().collectedData);
      return {
        type: ResponseType.QUESTION,
        message: `${analysis.value} sounds amazing! ${question}`,
        awaitingInput: 'dates',
        canProceed: false
      };
    }

    // No destination provided
    if (analysis.clarificationReason === 'no_destination_provided') {
      const question = this.questionGenerator.generateQuestion('destination');
      return {
        type: ResponseType.QUESTION,
        message: question,
        awaitingInput: 'destination',
        canProceed: false
      };
    }

    // Couldn't understand
    return {
      type: ResponseType.QUESTION,
      message: "I didn't quite catch that. Which city or country would you like to visit?",
      awaitingInput: 'destination',
      canProceed: false
    };
  }

  /**
   * Handle dates collection
   */
  private async handleDatesCollection(message: string): Promise<ConversationResponse> {
    const analysis = await this.responseAnalyzer.analyzeResponse(message, 'dates');

    // User is uncertain
    if (analysis.needsClarification && analysis.clarificationReason === 'uncertain') {
      const help = this.questionGenerator.generateUncertaintyHelp('dates');
      return {
        type: ResponseType.QUESTION,
        message: help,
        awaitingInput: 'dates',
        canProceed: false
      };
    }

    // Season is too vague
    if (analysis.needsClarification && analysis.clarificationReason === 'season_too_vague') {
      return {
        type: ResponseType.QUESTION,
        message: `${analysis.value} is a great time to travel! Could you be more specific about which month?`,
        awaitingInput: 'dates',
        canProceed: false
      };
    }

    // Valid dates
    if (analysis.value && !analysis.needsClarification) {
      this.stateManager.updateCollectedData({ startDate: analysis.value });
      this.stateManager.setState(ConversationState.COLLECTING_DURATION);

      const question = this.questionGenerator.generateQuestion('duration', this.stateManager.getContext().collectedData);
      return {
        type: ResponseType.QUESTION,
        message: `Perfect timing! ${question}`,
        awaitingInput: 'duration',
        canProceed: false
      };
    }

    // Couldn't understand
    return {
      type: ResponseType.QUESTION,
      message: "Could you clarify when you'd like to travel? You can say things like 'next week', 'in March', or specific dates.",
      awaitingInput: 'dates',
      canProceed: false
    };
  }

  /**
   * Handle duration collection
   */
  private async handleDurationCollection(message: string): Promise<ConversationResponse> {
    const analysis = await this.responseAnalyzer.analyzeResponse(message, 'duration');

    // User is uncertain
    if (analysis.needsClarification && analysis.clarificationReason === 'uncertain') {
      const help = this.questionGenerator.generateUncertaintyHelp('duration');
      return {
        type: ResponseType.QUESTION,
        message: help,
        awaitingInput: 'duration',
        canProceed: false
      };
    }

    // Duration too long
    if (analysis.needsClarification && analysis.clarificationReason === 'too_long') {
      return {
        type: ResponseType.QUESTION,
        message: `${analysis.value} days is quite a long trip! I can plan trips up to 30 days. Would you like to plan for 30 days, or a shorter duration?`,
        awaitingInput: 'duration',
        canProceed: false
      };
    }

    // Approximate duration
    if (analysis.needsClarification && analysis.clarificationReason === 'approximate_duration') {
      return {
        type: ResponseType.QUESTION,
        message: `"${message}" sounds good! Could you give me a specific number of days?`,
        awaitingInput: 'duration',
        canProceed: false
      };
    }

    // Valid duration
    if (analysis.value && !analysis.needsClarification) {
      this.stateManager.updateCollectedData({ duration: analysis.value });

      // Ask about travelers (optional but helpful)
      this.stateManager.setState(ConversationState.COLLECTING_TRAVELERS);
      const question = this.questionGenerator.generateQuestion('travelers', this.stateManager.getContext().collectedData);

      return {
        type: ResponseType.QUESTION,
        message: question,
        awaitingInput: 'travelers',
        canProceed: false
      };
    }

    // Couldn't understand
    return {
      type: ResponseType.QUESTION,
      message: "How many days would you like to spend on this trip?",
      awaitingInput: 'duration',
      canProceed: false
    };
  }

  /**
   * Handle travelers collection
   */
  private async handleTravelersCollection(message: string): Promise<ConversationResponse> {
    const analysis = await this.responseAnalyzer.analyzeResponse(message, 'travelers');

    // Process whatever they provide (or skip if uncertain)
    if (analysis.value) {
      this.stateManager.updateCollectedData({ travelers: analysis.value });
    }

    // Move to preferences
    this.stateManager.setState(ConversationState.COLLECTING_PREFERENCES);
    const question = this.questionGenerator.generateQuestion('preferences', this.stateManager.getContext().collectedData);

    return {
      type: ResponseType.QUESTION,
      message: question,
      awaitingInput: 'preferences',
      canProceed: false
    };
  }

  /**
   * Handle preferences collection
   */
  private async handlePreferencesCollection(message: string): Promise<ConversationResponse> {
    const analysis = await this.responseAnalyzer.analyzeResponse(message, 'preferences');

    // Process whatever preferences they provide
    if (analysis.value && Object.keys(analysis.value).length > 0) {
      this.stateManager.updateCollectedData({ preferences: analysis.value });
    }

    // Move to confirmation
    this.stateManager.setState(ConversationState.CONFIRMING_DETAILS);
    const confirmation = this.questionGenerator.generateConfirmation(this.stateManager.getContext().collectedData);

    return {
      type: ResponseType.CONFIRMATION,
      message: confirmation,
      awaitingInput: 'confirmation',
      canProceed: false,
      collectedData: this.stateManager.getContext().collectedData
    };
  }

  /**
   * Handle confirmation
   */
  private async handleConfirmation(message: string): Promise<ConversationResponse> {
    const analysis = await this.responseAnalyzer.analyzeResponse(message, 'confirmation');

    // User confirmed - ready to generate
    if (analysis.value === true) {
      this.stateManager.setState(ConversationState.GENERATING);
      const generatingMessage = this.questionGenerator.generateGeneratingMessage(
        this.stateManager.getContext().collectedData
      );

      return {
        type: ResponseType.ITINERARY,
        message: generatingMessage,
        canProceed: true,
        requiresGeneration: true,
        collectedData: this.stateManager.getContext().collectedData
      };
    }

    // User wants changes
    if (analysis.value === false || analysis.clarificationReason === 'wants_changes') {
      this.stateManager.setState(ConversationState.MODIFYING);
      const modificationPrompt = this.questionGenerator.generateModificationPrompt();

      return {
        type: ResponseType.QUESTION,
        message: modificationPrompt,
        awaitingInput: 'modification',
        canProceed: false
      };
    }

    // Unclear response
    return {
      type: ResponseType.CONFIRMATION,
      message: "Should I proceed with creating your itinerary, or would you like to change something?",
      awaitingInput: 'confirmation',
      canProceed: false
    };
  }

  /**
   * Handle feedback after showing itinerary
   */
  private async handleFeedback(message: string): Promise<ConversationResponse> {
    const analysis = await this.responseAnalyzer.analyzeResponse(message, 'general');

    // Check if it's a modification request
    if (analysis.field === 'modification') {
      this.stateManager.setState(ConversationState.MODIFYING);
      return {
        type: ResponseType.MODIFICATION,
        message: "I'll help you modify the itinerary. What specific changes would you like?",
        awaitingInput: 'modification_details',
        canProceed: false,
        itinerary: this.stateManager.getContext().currentItinerary
      };
    }

    // User is satisfied
    const lower = message.toLowerCase();
    if (lower.includes('thank') || lower.includes('perfect') || lower.includes('great') ||
        lower.includes('good') || lower.includes('nice')) {
      return {
        type: ResponseType.GREETING,
        message: "You're welcome! Have an amazing trip! Feel free to ask if you need any more help.",
        canProceed: false
      };
    }

    // Default - ask what they need
    return {
      type: ResponseType.QUESTION,
      message: "Is there anything you'd like to change about the itinerary?",
      awaitingInput: 'feedback',
      canProceed: false
    };
  }

  /**
   * Handle modification requests
   */
  private async handleModification(message: string): Promise<ConversationResponse> {
    // This would integrate with the existing modification flow
    // For now, return a placeholder
    return {
      type: ResponseType.MODIFICATION,
      message: `I'll update the itinerary based on your request: "${message}". Processing the changes...`,
      canProceed: true,
      requiresGeneration: true,
      itinerary: this.stateManager.getContext().currentItinerary
    };
  }

  /**
   * Handle general messages
   */
  private async handleGeneralMessage(message: string): Promise<ConversationResponse> {
    // Try to understand what they want
    const analysis = await this.responseAnalyzer.analyzeResponse(message, 'general');

    if (analysis.field === 'greeting') {
      return this.handleGreeting(message);
    }

    if (analysis.field === 'help') {
      // Check what we're missing and ask for it
      const missing = this.stateManager.getMissingInformation();
      if (missing.length > 0) {
        const nextState = this.stateManager.getNextState();
        this.stateManager.setState(nextState);
        const question = this.questionGenerator.generateQuestion(missing[0], this.stateManager.getContext().collectedData);
        return {
          type: ResponseType.QUESTION,
          message: question,
          awaitingInput: missing[0],
          canProceed: false
        };
      }
    }

    // Default - ask what they need
    return {
      type: ResponseType.QUESTION,
      message: "I'm here to help you plan your trip. Where would you like to go?",
      awaitingInput: 'destination',
      canProceed: false
    };
  }

  /**
   * Get current context for persistence
   */
  getContext(): string {
    return this.stateManager.serialize();
  }

  /**
   * Update itinerary after generation
   */
  setGeneratedItinerary(itinerary: any): void {
    this.stateManager.setCurrentItinerary(itinerary);
  }

  /**
   * Check if we can generate an itinerary
   */
  canGenerate(): boolean {
    return this.stateManager.canGenerateItinerary();
  }

  /**
   * Get collected data
   */
  getCollectedData(): CollectedData {
    return this.stateManager.getContext().collectedData;
  }
}