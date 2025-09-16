/**
 * Question Generator
 * Generates contextual questions for missing information
 * NEVER assumes or uses defaults - always asks the user
 */

import { ConversationState, CollectedData } from './conversation-state-manager';

export interface QuestionTemplate {
  field: string;
  questions: string[];
  followUp?: string[];
  suggestions?: string[];
}

export class QuestionGenerator {
  private templates: Map<string, QuestionTemplate>;

  constructor() {
    this.templates = this.initializeTemplates();
  }

  /**
   * Initialize question templates for each field
   */
  private initializeTemplates(): Map<string, QuestionTemplate> {
    const templates = new Map<string, QuestionTemplate>();

    // Destination questions
    templates.set('destination', {
      field: 'destination',
      questions: [
        "Where would you like to go?",
        "What destination do you have in mind?",
        "Where are you thinking of traveling to?",
        "Which city or country would you like to visit?"
      ],
      followUp: [
        "Any specific city in mind?",
        "Which part of the country interests you?",
        "Do you have a particular region in mind?"
      ],
      suggestions: [
        "Popular destinations include Paris, Tokyo, Barcelona, New York, and Bali.",
        "Are you looking for beaches, mountains, cities, or cultural experiences?",
        "Would you prefer Europe, Asia, Americas, or somewhere else?"
      ]
    });

    // Date questions
    templates.set('dates', {
      field: 'dates',
      questions: [
        "When would you like to travel?",
        "What dates are you considering for your trip?",
        "When are you planning to visit?",
        "What time period works best for you?"
      ],
      followUp: [
        "Do you have specific dates in mind?",
        "Are your dates flexible?",
        "Is there a particular month you prefer?"
      ],
      suggestions: [
        "You can say things like 'next week', 'in March', or specific dates.",
        "Consider seasons - spring (Mar-May), summer (Jun-Aug), fall (Sep-Nov), or winter (Dec-Feb).",
        "Weekday travel is often less crowded and more affordable than weekends."
      ]
    });

    // Duration questions
    templates.set('duration', {
      field: 'duration',
      questions: [
        "How long would you like to stay?",
        "How many days are you planning for this trip?",
        "What's the duration you have in mind?",
        "How long do you want your trip to be?"
      ],
      followUp: [
        "Is this including travel days?",
        "Do you have a specific number of days in mind?",
        "Are you flexible with the duration?"
      ],
      suggestions: [
        "A weekend getaway is typically 2-3 days.",
        "A standard city break is usually 4-5 days.",
        "For multiple cities, consider at least 7-10 days."
      ]
    });

    // Traveler questions
    templates.set('travelers', {
      field: 'travelers',
      questions: [
        "Will you be traveling solo or with others?",
        "Who will be joining you on this trip?",
        "Is this a solo adventure or a group trip?",
        "How many people will be traveling?"
      ],
      followUp: [
        "How many people in total?",
        "Are there any children in your group?",
        "Is this a family trip, romantic getaway, or friends' adventure?"
      ]
    });

    // Preference questions
    templates.set('preferences', {
      field: 'preferences',
      questions: [
        "Do you have any specific interests or activities in mind?",
        "What kind of experiences are you looking for?",
        "Any particular preferences for this trip?",
        "What would make this trip perfect for you?"
      ],
      followUp: [
        "Are you interested in museums, outdoor activities, food tours, or nightlife?",
        "Do you need any work facilities like coworking spaces?",
        "Any dietary restrictions or accessibility needs?"
      ],
      suggestions: [
        "Popular activities include sightseeing, museums, local cuisine, shopping, and cultural experiences.",
        "Let me know if you need coworking spaces for remote work.",
        "Feel free to mention any special requirements or preferences."
      ]
    });

    return templates;
  }

  /**
   * Generate a question for missing information
   * CRITICAL: This is what prevents the system from using defaults
   */
  generateQuestion(
    missingField: string,
    context?: CollectedData,
    previousAttempts: number = 0
  ): string {
    const template = this.templates.get(missingField);
    if (!template) {
      return `Could you tell me more about the ${missingField} for your trip?`;
    }

    // Use different questions for variety
    const questionIndex = Math.min(previousAttempts, template.questions.length - 1);
    let question = template.questions[questionIndex];

    // Add context if available
    if (context) {
      question = this.addContext(question, missingField, context);
    }

    return question;
  }

  /**
   * Add context to make questions more natural
   */
  private addContext(question: string, field: string, context: CollectedData): string {
    // Personalize based on what we already know
    if (field === 'dates' && context.destination) {
      return question.replace('travel', `visit ${context.destination}`);
    }

    if (field === 'duration' && context.destination) {
      return question.replace('stay', `stay in ${context.destination}`);
    }

    if (field === 'travelers' && context.destination && context.duration) {
      return `Great! A ${context.duration}-day trip to ${context.destination}. ${question}`;
    }

    return question;
  }

  /**
   * Generate follow-up question when user's response is unclear
   */
  generateFollowUp(field: string, userResponse: string): string {
    const template = this.templates.get(field);
    if (!template || !template.followUp) {
      return "Could you be more specific?";
    }

    // Pick a random follow-up
    const index = Math.floor(Math.random() * template.followUp.length);
    return template.followUp[index];
  }

  /**
   * Generate helpful suggestions when user is unsure
   */
  generateSuggestions(field: string): string {
    const template = this.templates.get(field);
    if (!template || !template.suggestions) {
      return "Take your time to think about what would work best for you.";
    }

    // Pick a random suggestion
    const index = Math.floor(Math.random() * template.suggestions.length);
    return template.suggestions[index];
  }

  /**
   * Generate confirmation message before creating itinerary
   */
  generateConfirmation(data: CollectedData): string {
    const parts: string[] = ["Perfect! Let me confirm the details:"];

    // Build confirmation based on collected data
    if (data.destination) {
      parts.push(`• Destination: ${data.destination}`);
    }
    if (data.startDate) {
      parts.push(`• Starting: ${data.startDate}`);
    }
    if (data.duration) {
      parts.push(`• Duration: ${data.duration} days`);
    }
    if (data.travelers) {
      const travelerText = data.travelers.count === 1
        ? 'Solo traveler'
        : `${data.travelers.count} travelers (${data.travelers.type})`;
      parts.push(`• Travelers: ${travelerText}`);
    }
    if (data.preferences?.needsCoworking) {
      parts.push(`• Including coworking spaces`);
    }
    if (data.preferences?.activities && data.preferences.activities.length > 0) {
      parts.push(`• Interests: ${data.preferences.activities.join(', ')}`);
    }

    parts.push("\nIs this correct? (Yes to proceed, or tell me what to change)");

    return parts.join('\n');
  }

  /**
   * Generate a response when user wants to modify something
   */
  generateModificationPrompt(): string {
    const prompts = [
      "What would you like to change?",
      "Which detail should I update?",
      "What needs to be different?",
      "Tell me what you'd like to modify."
    ];

    const index = Math.floor(Math.random() * prompts.length);
    return prompts[index];
  }

  /**
   * Generate greeting message
   */
  generateGreeting(): string {
    const greetings = [
      "Hello! I'd be happy to help you plan your trip. Where would you like to go?",
      "Hi there! Ready to plan an amazing trip? Let's start with your destination - where are you thinking of traveling?",
      "Welcome! I'm here to help create your perfect itinerary. What destination do you have in mind?",
      "Hello! Let's plan your next adventure. Where would you like to visit?"
    ];

    const index = Math.floor(Math.random() * greetings.length);
    return greetings[index];
  }

  /**
   * Generate a message when starting to create the itinerary
   */
  generateGeneratingMessage(data: CollectedData): string {
    const messages = [
      `Wonderful! I'll start creating your ${data.duration}-day itinerary for ${data.destination}...`,
      `Perfect! Let me craft your personalized ${data.destination} itinerary...`,
      `Great! Creating your ${data.duration}-day adventure in ${data.destination} now...`,
      `Excellent! I'm preparing your custom itinerary for ${data.destination}...`
    ];

    const index = Math.floor(Math.random() * messages.length);
    return messages[index];
  }

  /**
   * Generate a message after showing the itinerary
   */
  generateFeedbackPrompt(): string {
    const prompts = [
      "Here's your itinerary! Would you like to make any changes?",
      "Your itinerary is ready! Let me know if you'd like to modify anything.",
      "I've created your personalized itinerary. Feel free to ask for any adjustments!",
      "Here's your trip plan! Is there anything you'd like to change or add?"
    ];

    const index = Math.floor(Math.random() * prompts.length);
    return prompts[index];
  }

  /**
   * Handle responses when user says things like "I don't know" or "not sure"
   */
  generateUncertaintyHelp(field: string): string {
    const template = this.templates.get(field);
    if (!template || !template.suggestions) {
      return "No problem! Take your time to think about it, and let me know when you're ready.";
    }

    // Provide helpful suggestions
    return `No worries! ${template.suggestions[0]} What sounds good to you?`;
  }
}