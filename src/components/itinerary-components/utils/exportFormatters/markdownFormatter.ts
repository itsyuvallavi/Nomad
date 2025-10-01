/**
 * Markdown export formatter for itineraries
 */

import type { FormatterOptions, FormatterResult } from './types';

export function formatAsMarkdown({ itinerary }: FormatterOptions): FormatterResult {
  let md = `# ${itinerary.title || 'Untitled Itinerary'}\n\n`;
  md += `**Destination:** ${itinerary.destination}\n`;
  md += `**Duration:** ${itinerary.itinerary?.length || 0} days\n\n`;

  itinerary.itinerary?.forEach((day) => {
    md += `## Day ${day.day} - ${day.date}\n`;
    md += `### ${day.title}\n\n`;

    day.activities.forEach((activity) => {
      md += `- **${activity.time}:** ${activity.description}\n`;
      if (activity.address) {
        md += `  - 📍 *${activity.address}*\n`;
      }
    });
    md += '\n';
  });

  if (itinerary.quickTips && itinerary.quickTips.length > 0) {
    md += '## Travel Tips\n\n';
    itinerary.quickTips.forEach((tip) => {
      md += `- ${tip}\n`;
    });
  }

  return {
    content: md,
    mimeType: 'text/markdown',
    filename: `${(itinerary.title || 'itinerary').replace(/\s+/g, '_')}.md`
  };
}