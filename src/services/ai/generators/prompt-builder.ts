/**
 * Prompt Builder Module
 * Constructs prompts for GPT-based itinerary generation
 */

import { Zone } from '../data/city-zones';
import { TripParams } from '../trip-generator';

export class PromptBuilder {
  /**
   * Build user prompt for GPT itinerary generation
   */
  buildItineraryPrompt(params: TripParams, zoneGuidance: string): string {
    const interests = params.interests || params.preferences?.interests || [];
    const budget = params.budget || params.preferences?.budget || 'medium';
    const pace = params.preferences?.pace || 'moderate';

    let prompt = `Create a ${params.duration}-day itinerary for ${params.destination}.\n\n`;
    prompt += `START DATE: ${params.startDate}\n`;
    prompt += `TRAVELERS: ${params.travelers?.adults || 1} adults`;

    if (params.travelers?.children) {
      prompt += `, ${params.travelers.children} children`;
    }
    prompt += '\n';

    if (interests.length > 0) {
      prompt += `INTERESTS: ${interests.join(', ')}\n`;
    }

    prompt += `BUDGET: ${budget}\n`;
    prompt += `PACE: ${pace}\n`;

    if (params.preferences?.mustSee && params.preferences.mustSee.length > 0) {
      prompt += `MUST SEE: ${params.preferences.mustSee.join(', ')}\n`;
    }

    if (params.preferences?.avoid && params.preferences.avoid.length > 0) {
      prompt += `AVOID: ${params.preferences.avoid.join(', ')}\n`;
    }

    // Add zone guidance if available
    if (zoneGuidance) {
      prompt += zoneGuidance;
    }

    prompt += '\n\nGenerate a detailed itinerary with specific venues, times, and activities for each day.';
    prompt += ' Include accommodation recommendations and estimated costs.';
    prompt += ' Format as JSON with dailyItineraries array.';

    return prompt;
  }

  /**
   * Build modification prompt for existing itinerary
   */
  buildModificationPrompt(
    currentItinerary: any,
    userFeedback: string
  ): { system: string; user: string } {
    const systemPrompt = `You are a travel itinerary modifier.
    Modify the existing itinerary based on user feedback.
    Keep the overall structure but make the requested changes.
    Return a complete itinerary in the same JSON format.`;

    const userPrompt = `Current itinerary: ${JSON.stringify(currentItinerary)}

    User feedback: ${userFeedback}

    Modify the itinerary according to the feedback and return the complete updated itinerary.`;

    return { system: systemPrompt, user: userPrompt };
  }

  /**
   * Build zone guidance text
   */
  buildZoneGuidance(zones: Zone[], duration: number): string {
    if (zones.length === 0) return '';

    const sortedZones = zones
      .filter(z => z.priority !== undefined)
      .sort((a, b) => (a.priority || 999) - (b.priority || 999));

    const daysPerZone = Math.max(1, Math.floor(duration / sortedZones.length));

    let guidance = '\nZONE PLANNING GUIDANCE:\n';
    guidance += 'Group activities by these zones to minimize travel time:\n\n';

    sortedZones.forEach((zone, index) => {
      const startDay = index * daysPerZone + 1;
      const endDay = Math.min(startDay + daysPerZone - 1, duration);

      guidance += `Days ${startDay}-${endDay}: ${zone.name}\n`;
      guidance += `  Key areas: ${zone.neighborhoods.slice(0, 3).join(', ')}\n`;
    });

    return guidance;
  }

  /**
   * Extract search query from activity description
   */
  extractSearchQuery(description: string): string {
    // Remove common words and extract key location/venue info
    const stopWords = [
      'visit', 'explore', 'see', 'tour', 'head',
      'to', 'the', 'at', 'in', 'go', 'enjoy',
      'experience', 'discover', 'check', 'out'
    ];

    const words = description.toLowerCase().split(/\s+/);
    const filtered = words.filter(word =>
      !stopWords.includes(word) && word.length > 2
    );

    return filtered.slice(0, 3).join(' ');
  }
}