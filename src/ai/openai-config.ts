import OpenAI from 'openai';

// Initialize OpenAI client with API key from environment
// This must run server-side only
export const openai = typeof window === 'undefined' ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null as any;

// Model configuration
export const MODEL_CONFIG = {
  model: 'gpt-4o-mini', // Using GPT-4o-mini for best cost/performance balance
  temperature: 0.7,
  max_tokens: 16384, // Increased from 8192 to handle multi-destination trips
  response_format: { type: 'json_object' as const },
};

// Console logging helper
export const logOpenAICall = (type: string, details: any) => {
  const timestamp = new Date().toISOString();
  console.log(`🤖 [OpenAI ${type}] ${timestamp}`, details);
};