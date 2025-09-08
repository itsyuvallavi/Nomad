import {genkit} from 'genkit';

// OpenAI ONLY - No Gemini
// We're using direct OpenAI integration, not through Genkit
export const ai = genkit({
  plugins: [], // No plugins needed - using OpenAI directly
});

// Export helper to check which provider is active
export const isUsingOpenAI = () => true; // Always OpenAI

// Log API configuration status
if (typeof window !== 'undefined') {
  console.log(`🤖 AI Provider: OpenAI GPT-4o-mini (Gemini removed)`);
}
