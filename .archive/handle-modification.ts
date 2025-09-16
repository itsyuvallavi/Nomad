/**
 * Modification Handler - Processes changes to existing travel itineraries
 * Handles adding/removing destinations, changing durations, updating preferences
 */

import { logger } from '@/lib/monitoring/logger';
import { ParsedTrip, ParsedDestination } from '../utils/destination-parser';
import { ClassificationResult } from '../utils/hybrid-parser';
import { ConversationState } from './generate-dialog-response';

export type ModificationType = 
  | 'add_destination' 
  | 'remove_destination' 
  | 'change_duration' 
  | 'update_preferences' 
  | 'adjust_dates'
  | 'replace_destination';

export interface ModificationRequest {
  type: ModificationType;
  target?: string; // destination name, preference type, etc.
  value?: any; // new duration, new destination, preference value
  context?: string; // additional context from user input
}

export interface ModificationResult {
  success: boolean;
  modificationType: ModificationType;
  changes: {
    before: ParsedTrip;
    after: ParsedTrip;
    summary: string;
    diff: ModificationDiff[];
  };
  confidence: number;
  requiresConfirmation: boolean;
  confirmationPrompt?: string;
  metadata: {
    processingTime: number;
    affectedDestinations: string[];
    totalDaysChange: number;
  };
}

export interface ModificationDiff {
  type: 'added' | 'removed' | 'modified';
  field: 'destination' | 'duration' | 'order' | 'total_days';
  before?: any;
  after?: any;
  description: string;
}

/**
 * Main modification handler
 */
export async function handleModification(
  input: string,
  currentItinerary: ParsedTrip,
  context: ConversationState
): Promise<ModificationResult> {
  const startTime = Date.now();
  
  logger.info('Modification Handler', 'Processing modification request', {
    inputLength: input.length,
    currentDestinations: currentItinerary.destinations.length,
    currentDays: currentItinerary.totalDays
  });
  
  try {
    // Step 1: Detect modification type and extract details
    const modificationRequest = detectModification(input, currentItinerary);
    
    // Step 2: Validate modification is feasible
    const validation = validateModification(modificationRequest, currentItinerary);
    if (!validation.valid) {
      return createFailureResult(modificationRequest, currentItinerary, validation.reason || 'Validation failed', Date.now() - startTime);
    }
    
    // Step 3: Apply modification and create new itinerary
    const modifiedItinerary = applyModification(modificationRequest, currentItinerary);
    
    // Step 4: Generate diff and summary
    const diff = generateDiff(currentItinerary, modifiedItinerary, modificationRequest);
    const summary = generateSummary(modificationRequest, diff);
    
    // Step 5: Determine if confirmation is needed
    const requiresConfirmation = shouldRequireConfirmation(modificationRequest, diff);
    
    const result: ModificationResult = {
      success: true,
      modificationType: modificationRequest.type,
      changes: {
        before: currentItinerary,
        after: modifiedItinerary,
        summary,
        diff
      },
      confidence: calculateModificationConfidence(modificationRequest, input),
      requiresConfirmation,
      confirmationPrompt: requiresConfirmation ? generateConfirmationPrompt(modificationRequest, summary) : undefined,
      metadata: {
        processingTime: Date.now() - startTime,
        affectedDestinations: getAffectedDestinations(diff),
        totalDaysChange: modifiedItinerary.totalDays - currentItinerary.totalDays
      }
    };
    
    logger.info('Modification Handler', 'Modification processed successfully', {
      type: result.modificationType,
      confidence: result.confidence,
      requiresConfirmation: result.requiresConfirmation,
      daysChange: result.metadata.totalDaysChange,
      processingTime: result.metadata.processingTime
    });
    
    return result;
    
  } catch (error) {
    logger.error('Modification Handler', 'Modification processing failed', { error });
    
    return createFailureResult(
      { type: 'add_destination' }, // default type for error case
      currentItinerary,
      error instanceof Error ? error.message : 'Unknown error occurred',
      Date.now() - startTime
    );
  }
}

/**
 * Detect modification type and extract details from user input
 */
function detectModification(input: string, currentItinerary: ParsedTrip): ModificationRequest {
  const normalizedInput = input.toLowerCase().trim();
  
  // Patterns for different modification types
  const patterns = {
    add_destination: [
      /(?:add|include|also\s+visit)\s+([A-Z][a-zA-Z\s]+?)(?:\s+for\s+(\d+)\s*days?)?/i,
      /(\d+)\s*(?:more\s+)?days?\s+in\s+([A-Z][a-zA-Z\s]+)/i,
      /extend\s+(?:the\s+)?trip\s+(?:to\s+)?(?:include\s+)?([A-Z][a-zA-Z\s]+)/i
    ],
    
    remove_destination: [
      /(?:remove|skip|exclude|cancel)\s+([A-Z][a-zA-Z\s]+)/i,
      /(?:don't|do\s+not)\s+(?:go\s+to|visit)\s+([A-Z][a-zA-Z\s]+)/i,
      /(?:take\s+out|drop)\s+([A-Z][a-zA-Z\s]+)/i
    ],
    
    change_duration: [
      /(?:change|make|extend|reduce)\s+([A-Z][a-zA-Z\s]+)\s+(?:to\s+)?(\d+)\s*days?/i,
      /spend\s+(\d+)\s*days?\s+in\s+([A-Z][a-zA-Z\s]+)\s+instead/i,
      /(?:increase|decrease)\s+([A-Z][a-zA-Z\s]+)\s+(?:by\s+)?(\d+)\s*days?/i
    ],
    
    replace_destination: [
      /(?:replace|substitute|swap)\s+([A-Z][a-zA-Z\s]+)\s+(?:with|for)\s+([A-Z][a-zA-Z\s]+)/i,
      /(?:instead\s+of|rather\s+than)\s+([A-Z][a-zA-Z\s]+)(?:,\s*(?:go\s+to|visit)\s+)?([A-Z][a-zA-Z\s]+)/i
    ],
    
    update_preferences: [
      /make\s+it\s+more\s+(\w+)/i,
      /(?:focus\s+on|emphasize|prefer)\s+(\w+)/i,
      /(?:less|more)\s+(\w+)/i
    ]
  };
  
  // Try to match patterns and extract modification details
  for (const [type, typePatterns] of Object.entries(patterns)) {
    for (const pattern of typePatterns) {
      const match = input.match(pattern);
      if (match) {
        return extractModificationDetails(type as ModificationType, match, normalizedInput);
      }
    }
  }
  
  // Fallback: try to detect numbers and city names for generic modifications
  const cityMatch = input.match(/([A-Z][a-zA-Z\s]+)/);
  const numberMatch = input.match(/(\d+)/);
  
  if (cityMatch && numberMatch) {
    return {
      type: 'add_destination',
      target: cityMatch[1].trim(),
      value: parseInt(numberMatch[1]),
      context: input
    };
  }
  
  if (cityMatch) {
    return {
      type: 'add_destination',
      target: cityMatch[1].trim(),
      context: input
    };
  }
  
  // Default fallback
  return {
    type: 'add_destination',
    context: input
  };
}

/**
 * Extract specific details for each modification type
 */
function extractModificationDetails(
  type: ModificationType,
  match: RegExpMatchArray,
  input: string
): ModificationRequest {
  switch (type) {
    case 'add_destination':
      return {
        type,
        target: match[1]?.trim() || match[2]?.trim(),
        value: match[2] ? parseInt(match[1]) : (match[3] ? parseInt(match[3]) : undefined),
        context: input
      };
      
    case 'remove_destination':
      return {
        type,
        target: match[1]?.trim(),
        context: input
      };
      
    case 'change_duration':
      return {
        type,
        target: match[1]?.trim() || match[2]?.trim(),
        value: parseInt(match[2] || match[1]),
        context: input
      };
      
    case 'replace_destination':
      return {
        type,
        target: match[1]?.trim(), // old destination
        value: match[2]?.trim(),  // new destination
        context: input
      };
      
    case 'update_preferences':
      return {
        type,
        target: 'preference',
        value: match[1]?.trim(),
        context: input
      };
      
    default:
      return { type, context: input };
  }
}

/**
 * Validate that modification is feasible
 */
function validateModification(
  request: ModificationRequest,
  currentItinerary: ParsedTrip
): { valid: boolean; reason?: string } {
  switch (request.type) {
    case 'add_destination':
      if (currentItinerary.destinations.length >= 5) {
        return { valid: false, reason: 'Cannot add more destinations - maximum of 5 cities allowed' };
      }
      if (!request.target) {
        return { valid: false, reason: 'No destination specified to add' };
      }
      break;
      
    case 'remove_destination':
      if (currentItinerary.destinations.length <= 1) {
        return { valid: false, reason: 'Cannot remove destination - at least one destination required' };
      }
      if (!request.target) {
        return { valid: false, reason: 'No destination specified to remove' };
      }
      const targetExists = currentItinerary.destinations.some(d => 
        d.name.toLowerCase().includes(request.target!.toLowerCase())
      );
      if (!targetExists) {
        return { valid: false, reason: `Destination "${request.target}" not found in current itinerary` };
      }
      break;
      
    case 'change_duration':
      if (!request.target || !request.value) {
        return { valid: false, reason: 'Both destination and new duration must be specified' };
      }
      if (request.value < 1 || request.value > 15) {
        return { valid: false, reason: 'Duration must be between 1 and 15 days per city' };
      }
      break;
      
    case 'replace_destination':
      if (!request.target || !request.value) {
        return { valid: false, reason: 'Both old and new destinations must be specified' };
      }
      break;
  }
  
  return { valid: true };
}

/**
 * Apply modification to create new itinerary
 */
function applyModification(
  request: ModificationRequest,
  currentItinerary: ParsedTrip
): ParsedTrip {
  const newItinerary: ParsedTrip = {
    ...currentItinerary,
    destinations: [...currentItinerary.destinations]
  };
  
  switch (request.type) {
    case 'add_destination':
      const newDestination: ParsedDestination = {
        name: request.target!,
        days: request.value || 3,
        duration: request.value || 3,
        durationText: `${request.value || 3} days`,
        order: newItinerary.destinations.length + 1
      };
      newItinerary.destinations.push(newDestination);
      break;
      
    case 'remove_destination':
      const removeIndex = newItinerary.destinations.findIndex(d =>
        d.name.toLowerCase().includes(request.target!.toLowerCase())
      );
      if (removeIndex >= 0) {
        newItinerary.destinations.splice(removeIndex, 1);
        // Reorder remaining destinations
        newItinerary.destinations.forEach((dest, index) => {
          dest.order = index + 1;
        });
      }
      break;
      
    case 'change_duration':
      const changeIndex = newItinerary.destinations.findIndex(d =>
        d.name.toLowerCase().includes(request.target!.toLowerCase())
      );
      if (changeIndex >= 0) {
        newItinerary.destinations[changeIndex].duration = request.value!;
        newItinerary.destinations[changeIndex].days = request.value!;
        newItinerary.destinations[changeIndex].durationText = `${request.value} days`;
      }
      break;
      
    case 'replace_destination':
      const replaceIndex = newItinerary.destinations.findIndex(d =>
        d.name.toLowerCase().includes(request.target!.toLowerCase())
      );
      if (replaceIndex >= 0) {
        const oldDuration = newItinerary.destinations[replaceIndex].duration;
        newItinerary.destinations[replaceIndex] = {
          ...newItinerary.destinations[replaceIndex],
          name: request.value!,
          durationText: `${oldDuration} days`
        };
      }
      break;
  }
  
  // Recalculate total days
  newItinerary.totalDays = newItinerary.destinations.reduce((sum, dest) => sum + dest.duration, 0);
  
  return newItinerary;
}

/**
 * Generate diff between old and new itineraries
 */
function generateDiff(
  before: ParsedTrip,
  after: ParsedTrip,
  request: ModificationRequest
): ModificationDiff[] {
  const diffs: ModificationDiff[] = [];
  
  // Check for added destinations
  after.destinations.forEach(afterDest => {
    const beforeDest = before.destinations.find(d => d.name === afterDest.name);
    if (!beforeDest) {
      diffs.push({
        type: 'added',
        field: 'destination',
        after: afterDest,
        description: `Added ${afterDest.name} (${afterDest.duration} days)`
      });
    } else if (beforeDest.duration !== afterDest.duration) {
      diffs.push({
        type: 'modified',
        field: 'duration',
        before: beforeDest.duration,
        after: afterDest.duration,
        description: `Changed ${afterDest.name} from ${beforeDest.duration} to ${afterDest.duration} days`
      });
    }
  });
  
  // Check for removed destinations
  before.destinations.forEach(beforeDest => {
    const afterDest = after.destinations.find(d => d.name === beforeDest.name);
    if (!afterDest) {
      diffs.push({
        type: 'removed',
        field: 'destination',
        before: beforeDest,
        description: `Removed ${beforeDest.name} (${beforeDest.duration} days)`
      });
    }
  });
  
  // Check total days change
  if (before.totalDays !== after.totalDays) {
    diffs.push({
      type: 'modified',
      field: 'total_days',
      before: before.totalDays,
      after: after.totalDays,
      description: `Total trip duration changed from ${before.totalDays} to ${after.totalDays} days`
    });
  }
  
  return diffs;
}

/**
 * Generate human-readable summary of changes
 */
function generateSummary(request: ModificationRequest, diffs: ModificationDiff[]): string {
  if (diffs.length === 0) {
    return 'No changes were made to your itinerary.';
  }
  
  const descriptions = diffs.map(diff => diff.description);
  
  if (descriptions.length === 1) {
    return descriptions[0];
  }
  
  if (descriptions.length === 2) {
    return descriptions.join(' and ');
  }
  
  return descriptions.slice(0, -1).join(', ') + ', and ' + descriptions[descriptions.length - 1];
}

/**
 * Calculate confidence in modification
 */
function calculateModificationConfidence(request: ModificationRequest, input: string): number {
  let confidence = 0.7; // base confidence
  
  // Increase confidence if we have clear targets and values
  if (request.target) confidence += 0.1;
  if (request.value) confidence += 0.1;
  
  // Increase confidence based on input clarity
  if (input.includes('add') || input.includes('remove') || input.includes('change')) {
    confidence += 0.1;
  }
  
  return Math.min(0.95, confidence);
}

/**
 * Determine if modification requires user confirmation
 */
function shouldRequireConfirmation(request: ModificationRequest, diffs: ModificationDiff[]): boolean {
  // Always require confirmation for removing destinations
  if (request.type === 'remove_destination') return true;
  
  // Require confirmation for major changes (>3 day difference)
  const majorChange = diffs.some(diff => 
    diff.field === 'total_days' && 
    Math.abs((diff.after as number) - (diff.before as number)) > 3
  );
  
  return majorChange;
}

/**
 * Generate confirmation prompt for user
 */
function generateConfirmationPrompt(request: ModificationRequest, summary: string): string {
  return `I'll make this change to your itinerary: ${summary}. Would you like me to proceed?`;
}

/**
 * Get list of destinations affected by changes
 */
function getAffectedDestinations(diffs: ModificationDiff[]): string[] {
  const affected = new Set<string>();
  
  diffs.forEach(diff => {
    if (diff.field === 'destination') {
      if (diff.before) affected.add((diff.before as ParsedDestination).name);
      if (diff.after) affected.add((diff.after as ParsedDestination).name);
    }
  });
  
  return Array.from(affected);
}

/**
 * Create failure result for error cases
 */
function createFailureResult(
  request: ModificationRequest,
  currentItinerary: ParsedTrip,
  reason: string,
  processingTime: number
): ModificationResult {
  return {
    success: false,
    modificationType: request.type,
    changes: {
      before: currentItinerary,
      after: currentItinerary,
      summary: `Failed to modify itinerary: ${reason}`,
      diff: []
    },
    confidence: 0.1,
    requiresConfirmation: false,
    metadata: {
      processingTime,
      affectedDestinations: [],
      totalDaysChange: 0
    }
  };
}

/**
 * Export types and main function
 */
