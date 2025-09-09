/**
 * Parse History & Learning System
 * Stores successful parses and learns patterns to improve future parsing
 */

import fs from 'fs/promises';
import path from 'path';
import { ParsedTravelRequest } from './master-parser';
import { enhancedLogger } from './enhanced-logger';

export interface ParseHistoryEntry {
  id: string;
  input: string;
  parsedResult: ParsedTravelRequest;
  userConfirmed: boolean;
  timestamp: Date;
  corrections?: Partial<ParsedTravelRequest>;
  successMetrics?: {
    generationSuccessful?: boolean;
    userSatisfied?: boolean;
    responseTime?: number;
  };
}

export interface LearnedPattern {
  pattern: string;
  frequency: number;
  confidence: number;
  examples: string[];
  mappings: {
    [key: string]: any;
  };
}

const HISTORY_FILE = path.join(process.cwd(), 'data', 'parse-history.json');
const PATTERNS_FILE = path.join(process.cwd(), 'data', 'learned-patterns.json');
const MAX_HISTORY_SIZE = 1000;
const MIN_PATTERN_FREQUENCY = 3;

export class ParseLearningSystem {
  private static historyCache: ParseHistoryEntry[] | null = null;
  private static patternsCache: LearnedPattern[] | null = null;

  /**
   * Initialize the learning system
   */
  static async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = path.join(process.cwd(), 'data');
      await fs.mkdir(dataDir, { recursive: true });

      // Load existing history
      await this.loadHistory();
      await this.loadPatterns();
    } catch (error: any) {
      enhancedLogger.error('LEARNING', 'Failed to initialize learning system', error);
    }
  }

  /**
   * Save a successful parse for learning
   */
  static async saveSuccessfulParse(
    input: string,
    result: ParsedTravelRequest,
    userConfirmed: boolean = false
  ): Promise<void> {
    try {
      const entry: ParseHistoryEntry = {
        id: `parse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        input,
        parsedResult: result,
        userConfirmed,
        timestamp: new Date()
      };

      const history = await this.loadHistory();
      history.push(entry);

      // Limit history size
      if (history.length > MAX_HISTORY_SIZE) {
        history.splice(0, history.length - MAX_HISTORY_SIZE);
      }

      await this.saveHistory(history);
      
      // Extract patterns if we have enough examples
      if (history.length >= MIN_PATTERN_FREQUENCY) {
        await this.extractPatterns(history);
      }

      enhancedLogger.info('LEARNING', 'Saved successful parse', {
        id: entry.id,
        destinationCount: result.destinations.length
      });
    } catch (error: any) {
      enhancedLogger.error('LEARNING', 'Failed to save parse', error);
    }
  }

  /**
   * Find similar previous parses
   */
  static async findSimilarParses(input: string, limit: number = 5): Promise<ParseHistoryEntry[]> {
    try {
      const history = await this.loadHistory();
      const inputLower = input.toLowerCase();
      
      // Calculate similarity scores
      const scored = history.map(entry => {
        const score = this.calculateSimilarity(inputLower, entry.input.toLowerCase());
        return { entry, score };
      });

      // Sort by similarity and return top matches
      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .filter(item => item.score > 0.3) // Minimum similarity threshold
        .map(item => item.entry);
    } catch (error: any) {
      enhancedLogger.error('LEARNING', 'Failed to find similar parses', error);
      return [];
    }
  }

  /**
   * Apply learned patterns to improve parsing
   */
  static async applyLearnedPatterns(
    input: string,
    result: ParsedTravelRequest
  ): Promise<ParsedTravelRequest> {
    try {
      const patterns = await this.loadPatterns();
      const similar = await this.findSimilarParses(input, 3);
      
      let improved = { ...result };

      // Apply patterns from similar successful parses
      if (similar.length > 0) {
        // Check for common destinations
        const destinationFrequency = new Map<string, number>();
        similar.forEach(entry => {
          entry.parsedResult.destinations.forEach(dest => {
            const key = dest.city.toLowerCase();
            destinationFrequency.set(key, (destinationFrequency.get(key) || 0) + 1);
          });
        });

        // If we missed a commonly found destination, suggest it
        const suggestions: string[] = [];
        destinationFrequency.forEach((freq, dest) => {
          if (freq >= 2 && !improved.destinations.some(d => 
            d.city.toLowerCase() === dest
          )) {
            suggestions.push(dest);
          }
        });

        if (suggestions.length > 0) {
          improved.suggestions = [
            ...(improved.suggestions || []),
            `Based on similar searches, you might also want to visit: ${suggestions.join(', ')}`
          ];
        }

        // Apply common trip types
        const tripTypes = similar.map(e => e.parsedResult.tripType);
        const mostCommon = this.getMostCommon(tripTypes);
        if (mostCommon && improved.tripType === 'general') {
          improved.tripType = mostCommon;
          improved.confidence = 'high' as const;
        }

        // Learn duration patterns
        if (!improved.duration || improved.duration === 7) {
          const durations = similar.map(e => e.parsedResult.duration).filter(Boolean);
          if (durations.length > 0) {
            improved.duration = Math.round(
              durations.reduce((a, b) => a + b, 0) / durations.length
            );
          }
        }
      }

      // Apply specific learned patterns
      for (const pattern of patterns) {
        if (this.matchesPattern(input, pattern)) {
          // Apply pattern mappings
          Object.entries(pattern.mappings).forEach(([key, value]) => {
            if (key === 'addDestination' && value) {
              const exists = improved.destinations.some(d => 
                d.city.toLowerCase() === value.toLowerCase()
              );
              if (!exists) {
                improved.destinations.push({
                  city: value,
                  days: 3,
                  confidence: 'medium' as const
                });
              }
            }
          });

          enhancedLogger.info('LEARNING', 'Applied learned pattern', {
            pattern: pattern.pattern,
            confidence: pattern.confidence
          });
        }
      }

      return improved;
    } catch (error: any) {
      enhancedLogger.error('LEARNING', 'Failed to apply patterns', error);
      return result;
    }
  }

  /**
   * Extract patterns from history
   */
  private static async extractPatterns(history: ParseHistoryEntry[]): Promise<void> {
    try {
      const patterns: LearnedPattern[] = [];
      
      // Group by similar inputs
      const groups = new Map<string, ParseHistoryEntry[]>();
      
      history.forEach(entry => {
        // Extract key phrases
        const keywords = this.extractKeywords(entry.input);
        const key = keywords.join('_');
        
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(entry);
      });

      // Create patterns from groups
      groups.forEach((entries, key) => {
        if (entries.length >= MIN_PATTERN_FREQUENCY) {
          // Find common elements
          const commonDestinations = this.findCommonElements(
            entries.map(e => e.parsedResult.destinations.map(d => d.city))
          );

          if (commonDestinations.length > 0) {
            patterns.push({
              pattern: key,
              frequency: entries.length,
              confidence: entries.length / history.length,
              examples: entries.slice(0, 3).map(e => e.input),
              mappings: {
                destinations: commonDestinations
              }
            });
          }
        }
      });

      await this.savePatterns(patterns);
    } catch (error: any) {
      enhancedLogger.error('LEARNING', 'Failed to extract patterns', error);
    }
  }

  /**
   * Calculate similarity between two strings
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    // Jaccard similarity
    return intersection.size / union.size;
  }

  /**
   * Extract keywords from input
   */
  private static extractKeywords(input: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'i', 'me', 'my', 'we', 'our', 'us',
      'want', 'need', 'please', 'help', 'plan', 'trip', 'travel', 'visit'
    ]);

    return input
      .toLowerCase()
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !stopWords.has(word) &&
        !/^\d+$/.test(word)
      )
      .sort();
  }

  /**
   * Find common elements in arrays
   */
  private static findCommonElements(arrays: string[][]): string[] {
    if (arrays.length === 0) return [];
    
    const frequency = new Map<string, number>();
    arrays.forEach(arr => {
      const unique = new Set(arr);
      unique.forEach(item => {
        frequency.set(item, (frequency.get(item) || 0) + 1);
      });
    });

    const threshold = arrays.length * 0.6; // 60% occurrence
    return Array.from(frequency.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([item, _]) => item);
  }

  /**
   * Get most common element
   */
  private static getMostCommon<T>(items: T[]): T | null {
    if (items.length === 0) return null;
    
    const frequency = new Map<T, number>();
    items.forEach(item => {
      frequency.set(item, (frequency.get(item) || 0) + 1);
    });

    let maxCount = 0;
    let mostCommon: T | null = null;
    
    frequency.forEach((count, item) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    });

    return mostCommon;
  }

  /**
   * Check if input matches a pattern
   */
  private static matchesPattern(input: string, pattern: LearnedPattern): boolean {
    const keywords = this.extractKeywords(input);
    const patternKeywords = pattern.pattern.split('_');
    
    // Check if at least 60% of pattern keywords are present
    const matches = patternKeywords.filter(pk => keywords.includes(pk));
    return matches.length >= patternKeywords.length * 0.6;
  }

  /**
   * Load history from file
   */
  private static async loadHistory(): Promise<ParseHistoryEntry[]> {
    if (this.historyCache) {
      return this.historyCache;
    }

    try {
      const data = await fs.readFile(HISTORY_FILE, 'utf-8');
      this.historyCache = JSON.parse(data);
      return this.historyCache!;
    } catch (error) {
      // File doesn't exist yet
      this.historyCache = [];
      return [];
    }
  }

  /**
   * Save history to file
   */
  private static async saveHistory(history: ParseHistoryEntry[]): Promise<void> {
    this.historyCache = history;
    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2));
  }

  /**
   * Load patterns from file
   */
  private static async loadPatterns(): Promise<LearnedPattern[]> {
    if (this.patternsCache) {
      return this.patternsCache;
    }

    try {
      const data = await fs.readFile(PATTERNS_FILE, 'utf-8');
      this.patternsCache = JSON.parse(data);
      return this.patternsCache!;
    } catch (error) {
      // File doesn't exist yet
      this.patternsCache = [];
      return [];
    }
  }

  /**
   * Save patterns to file
   */
  private static async savePatterns(patterns: LearnedPattern[]): Promise<void> {
    this.patternsCache = patterns;
    await fs.writeFile(PATTERNS_FILE, JSON.stringify(patterns, null, 2));
  }

  /**
   * Get learning statistics
   */
  static async getStatistics(): Promise<{
    totalParses: number;
    confirmedParses: number;
    patternCount: number;
    averageConfidence: number;
  }> {
    const history = await this.loadHistory();
    const patterns = await this.loadPatterns();
    
    const confirmed = history.filter(h => h.userConfirmed).length;
    const avgConfidence = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      : 0;

    return {
      totalParses: history.length,
      confirmedParses: confirmed,
      patternCount: patterns.length,
      averageConfidence: avgConfidence
    };
  }
}