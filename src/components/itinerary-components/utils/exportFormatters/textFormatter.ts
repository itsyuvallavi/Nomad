/**
 * Plain text export formatter for itineraries
 */

import type { FormatterOptions, FormatterResult } from './types';

export function formatAsText({ itinerary }: FormatterOptions): FormatterResult {
  let text = `${itinerary.title || 'Untitled Itinerary'}\n`;
  text += `${itinerary.destination}\n`;
  text += `${itinerary.itinerary?.length || 0} days\n\n`;

  itinerary.itinerary?.forEach((day) => {
    text += `Day ${day.day} - ${day.date}\n`;
    text += `${day.title}\n\n`;

    day.activities.forEach((activity) => {
      text += `  ${activity.time}: ${activity.description}\n`;
      if (activity.address) {
        text += `  📍 ${activity.address}\n`;
      }
      text += '\n';
    });
  });

  if (itinerary.quickTips && itinerary.quickTips.length > 0) {
    text += '\nTravel Tips:\n';
    itinerary.quickTips.forEach((tip) => {
      text += `• ${tip}\n`;
    });
  }

  return {
    content: text,
    mimeType: 'text/plain',
    filename: `${(itinerary.title || 'itinerary').replace(/\s+/g, '_')}.txt`
  };
}