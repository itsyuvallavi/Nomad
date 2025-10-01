/**
 * Validation Utilities
 * Shared validation and parsing functions for AI services
 */

/**
 * Safely parse JSON with error recovery
 */
export function safeJsonParse<T = any>(text: string): T | null {
  try {
    return JSON.parse(text);
  } catch (error) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Continue to next recovery method
      }
    }

    // Try to find JSON object in text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        return null;
      }
    }

    return null;
  }
}

/**
 * Validate and normalize budget level
 */
export function normalizeBudgetLevel(budget?: string): 'budget' | 'medium' | 'premium' | 'luxury' {
  if (!budget) return 'medium';

  const normalized = budget.toLowerCase();

  // Map common variations
  const budgetMap: Record<string, 'budget' | 'medium' | 'premium' | 'luxury'> = {
    'low': 'budget',
    'cheap': 'budget',
    'economy': 'budget',
    'budget': 'budget',
    'mid': 'medium',
    'medium': 'medium',
    'moderate': 'medium',
    'standard': 'medium',
    'high': 'premium',
    'premium': 'premium',
    'luxury': 'luxury',
    'luxurious': 'luxury',
    'deluxe': 'luxury'
  };

  return budgetMap[normalized] || 'medium';
}

/**
 * Extract clean search query from activity description
 */
export function extractSearchQuery(description: string): string {
  const stopWords = [
    'visit', 'explore', 'see', 'tour', 'head',
    'to', 'the', 'at', 'in', 'go', 'enjoy',
    'experience', 'discover', 'check', 'out',
    'take', 'a', 'walk', 'around', 'through'
  ];

  const words = description.toLowerCase().split(/\s+/);
  const filtered = words.filter(word =>
    !stopWords.includes(word) && word.length > 2
  );

  return filtered.slice(0, 3).join(' ');
}