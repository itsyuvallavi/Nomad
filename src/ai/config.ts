// AI Configuration
// Consolidated from openai-config.ts

export const AI_CONFIG = {
  // Model settings
  model: {
    name: 'gemini-1.5-flash',
    temperature: 0.7,
    maxTokens: 8192,
  },
  
  // API settings
  api: {
    timeout: 30000,
    retries: 3,
  },
  
  // Feature flags
  features: {
    useTools: true,
    streaming: false,
    caching: true,
  }
};

// Export any OpenAI specific config if needed
export * from './openai-config';