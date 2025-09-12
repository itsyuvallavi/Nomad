import { analyzeInitialPromptFlow } from '@/ai/flows/analyze-initial-prompt';
import { generatePersonalizedItineraryFlow } from '@/ai/flows/generate-personalized-itinerary';
import { refineItineraryBasedOnFeedbackFlow } from '@/ai/flows/refine-itinerary-based-on-feedback';
import type { FormValues } from '@/components/forms/trip-details-form';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import type { GenerationProgress } from '../hooks/use-chat-state';

export interface AIServiceOptions {
  onProgress?: (progress: GenerationProgress) => void;
  onStream?: (content: string) => void;
  signal?: AbortSignal;
}

export class AIService {
  private static instance: AIService;
  
  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async generateItinerary(
    prompt: FormValues,
    options: AIServiceOptions = {}
  ): Promise<GeneratePersonalizedItineraryOutput> {
    const { onProgress, signal } = options;

    try {
      // Stage 1: Understanding
      onProgress?.({
        stage: 'understanding',
        message: 'Understanding your travel preferences...',
        percentage: 10,
        timestamp: Date.now()
      });

      const analyzedPrompt = await analyzeInitialPromptFlow(prompt);
      if (signal?.aborted) throw new Error('Generation cancelled');

      // Stage 2: Planning
      onProgress?.({
        stage: 'planning',
        message: 'Planning your perfect itinerary...',
        percentage: 30,
        timestamp: Date.now()
      });

      // Stage 3: Generating
      onProgress?.({
        stage: 'generating',
        message: 'Creating detailed activities and recommendations...',
        percentage: 60,
        timestamp: Date.now()
      });

      const itinerary = await generatePersonalizedItineraryFlow({
        ...analyzedPrompt,
        fileDataUrl: prompt.fileDataUrl,
        fileName: prompt.fileName,
        contextFileDataUrl: prompt.contextFileDataUrl,
        contextFileName: prompt.contextFileName
      });

      if (signal?.aborted) throw new Error('Generation cancelled');

      // Stage 4: Finalizing
      onProgress?.({
        stage: 'finalizing',
        message: 'Finalizing your itinerary...',
        percentage: 90,
        timestamp: Date.now()
      });

      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));

      onProgress?.({
        stage: 'finalizing',
        message: 'Complete!',
        percentage: 100,
        timestamp: Date.now()
      });

      return itinerary;
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  async refineItinerary(
    currentItinerary: GeneratePersonalizedItineraryOutput,
    feedback: string,
    options: AIServiceOptions = {}
  ): Promise<GeneratePersonalizedItineraryOutput> {
    const { onProgress, signal } = options;

    try {
      onProgress?.({
        stage: 'understanding',
        message: 'Processing your feedback...',
        percentage: 20,
        timestamp: Date.now()
      });

      if (signal?.aborted) throw new Error('Refinement cancelled');

      onProgress?.({
        stage: 'generating',
        message: 'Updating your itinerary...',
        percentage: 50,
        timestamp: Date.now()
      });

      const refinedItinerary = await refineItineraryBasedOnFeedbackFlow({
        currentItinerary,
        userFeedback: feedback
      });

      if (signal?.aborted) throw new Error('Refinement cancelled');

      onProgress?.({
        stage: 'finalizing',
        message: 'Applying changes...',
        percentage: 90,
        timestamp: Date.now()
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      onProgress?.({
        stage: 'finalizing',
        message: 'Updated!',
        percentage: 100,
        timestamp: Date.now()
      });

      return refinedItinerary;
    } catch (error) {
      console.error('AI Refinement Error:', error);
      throw error;
    }
  }

  // Helper to format error messages
  formatError(error: any): string {
    if (error?.message?.includes('cancelled')) {
      return 'Generation was cancelled';
    }
    if (error?.message?.includes('API key')) {
      return 'AI service configuration error. Please check your API keys.';
    }
    if (error?.message?.includes('rate limit')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    if (error?.message?.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    return error?.message || 'An unexpected error occurred. Please try again.';
  }
}

export const aiService = AIService.getInstance();