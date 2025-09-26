/**
 * Token Configuration and Limits for AI Operations
 *
 * This configuration optimizes token usage across different AI operations
 * by using appropriate models and setting sensible limits for each task.
 */

export interface TokenUsageStats {
  count: number;
  totalTokens: number;
  totalCost: string;
  avgTokens: number;
  lastUsage?: TokenUsage;
}

export interface TokenConfig {
  model: string;
  maxTokens: number;
  temperature?: number;
  description: string;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
  estimatedCost: number;
}

// Model pricing per 1M tokens (as of Jan 2025)
export const MODEL_PRICING = {
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
} as const;

/**
 * Token limits optimized for each AI operation
 * Using cheaper models for simpler tasks to reduce costs
 */
export const TOKEN_LIMITS: Record<string, TokenConfig> = {
  // Intent & metadata extraction - simple tasks use cheaper models
  INTENT_EXTRACTION: {
    model: 'gpt-3.5-turbo',
    maxTokens: 150,
    temperature: 0.3,
    description: 'Extract user intent from natural language'
  },

  METADATA_GENERATION: {
    model: 'gpt-3.5-turbo',
    maxTokens: 200,
    temperature: 0.5,
    description: 'Generate trip metadata (title, description)'
  },

  DATE_PARSING: {
    model: 'gpt-3.5-turbo',
    maxTokens: 100,
    temperature: 0.1,
    description: 'Parse dates from user input'
  },

  // City and itinerary generation - complex tasks need better models
  CITY_GENERATION: {
    model: 'gpt-4o-mini',
    maxTokens: 2000,
    temperature: 0.7,
    description: 'Generate detailed city itinerary (per city)'
  },

  ACTIVITY_ENRICHMENT: {
    model: 'gpt-4o-mini',
    maxTokens: 500,
    temperature: 0.6,
    description: 'Enrich activity with details and recommendations'
  },

  // Full itinerary generation - most complex task
  FULL_ITINERARY: {
    model: 'gpt-4o',
    maxTokens: 4000,
    temperature: 0.7,
    description: 'Generate complete multi-city itinerary'
  },

  // Refinement and optimization
  ITINERARY_REFINEMENT: {
    model: 'gpt-4o-mini',
    maxTokens: 1500,
    temperature: 0.5,
    description: 'Refine itinerary based on user feedback'
  },

  ROUTE_OPTIMIZATION: {
    model: 'gpt-3.5-turbo',
    maxTokens: 300,
    temperature: 0.2,
    description: 'Optimize route between activities'
  },

  // Cost estimation
  COST_ESTIMATION: {
    model: 'gpt-3.5-turbo',
    maxTokens: 250,
    temperature: 0.3,
    description: 'Estimate trip costs'
  },

  // Chat and conversation
  CHAT_RESPONSE: {
    model: 'gpt-4o-mini',
    maxTokens: 800,
    temperature: 0.7,
    description: 'Generate chat responses'
  },

  CHAT_SUMMARY: {
    model: 'gpt-3.5-turbo',
    maxTokens: 200,
    temperature: 0.5,
    description: 'Summarize conversation context'
  }
};

/**
 * Get token configuration for a specific operation
 */
export function getTokenConfig(operation: keyof typeof TOKEN_LIMITS): TokenConfig {
  const config = TOKEN_LIMITS[operation];
  if (!config) {
    console.warn(`No token config found for operation: ${operation}, using default`);
    return TOKEN_LIMITS.CHAT_RESPONSE;
  }
  return config;
}

/**
 * Calculate estimated cost for token usage
 */
export function calculateTokenCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING];
  if (!pricing) {
    console.warn(`No pricing found for model: ${model}`);
    return 0;
  }

  const promptCost = (promptTokens / 1_000_000) * pricing.input;
  const completionCost = (completionTokens / 1_000_000) * pricing.output;

  return promptCost + completionCost;
}

/**
 * Token counting utility (approximate)
 * For accurate counting, use tiktoken library
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters for English text
  // This is a simplified estimation, consider using tiktoken for accuracy
  return Math.ceil(text.length / 4);
}

/**
 * Track token usage for monitoring
 */
export class TokenUsageTracker {
  private usage: Map<string, TokenUsage[]> = new Map();

  track(operation: string, usage: TokenUsage): void {
    if (!this.usage.has(operation)) {
      this.usage.set(operation, []);
    }
    this.usage.get(operation)!.push(usage);
  }

  getStats(operation?: string): Record<string, TokenUsageStats> {
    if (operation) {
      const operationUsage = this.usage.get(operation) || [];
      return { [operation]: this.calculateStats(operationUsage) };
    }

    const allStats: Record<string, TokenUsageStats> = {};
    for (const [op, usages] of this.usage.entries()) {
      allStats[op] = this.calculateStats(usages);
    }
    return allStats;
  }

  private calculateStats(usages: TokenUsage[]): TokenUsageStats {
    if (usages.length === 0) return { count: 0, totalTokens: 0, totalCost: '0', avgTokens: 0 };

    const totalTokens = usages.reduce((sum, u) => sum + u.total, 0);
    const totalCost = usages.reduce((sum, u) => sum + u.estimatedCost, 0);
    const avgTokens = totalTokens / usages.length;

    return {
      count: usages.length,
      totalTokens,
      totalCost: totalCost.toFixed(4),
      avgTokens: Math.round(avgTokens),
      lastUsage: usages[usages.length - 1]
    };
  }

  reset(): void {
    this.usage.clear();
  }
}

// Global token tracker instance
export const tokenTracker = new TokenUsageTracker();

/**
 * Validate token usage against limits
 */
export function validateTokenUsage(
  operation: keyof typeof TOKEN_LIMITS,
  actualTokens: number
): boolean {
  const config = getTokenConfig(operation);
  if (actualTokens > config.maxTokens) {
    console.warn(
      `Token limit exceeded for ${operation}: ${actualTokens} > ${config.maxTokens}`
    );
    return false;
  }
  return true;
}