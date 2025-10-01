/**
 * ICS (iCalendar) export formatter for itineraries
 */

import type { FormatterOptions, FormatterResult } from './types';
import { parseTimeString, formatICSDateTime } from '@/lib/utils/date-helpers';

/**
 * Escape text for ICS format
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function formatAsICS({ itinerary }: FormatterOptions): FormatterResult {
  const events: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nomad Navigator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  itinerary.itinerary?.forEach((day) => {
    const dateStr = day.date;

    day.activities.forEach((activity, index) => {
      events.push('BEGIN:VEVENT');

      // Generate unique ID
      const uid = `${dateStr.replace(/-/g, '')}-${index}@nomadnavigator`;
      events.push(`UID:${uid}`);

      // Add timestamp
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      events.push(`DTSTAMP:${timestamp}`);

      // Add start and end times
      const startTime = formatICSDateTime(dateStr, activity.time || '9:00 AM');
      const { hours, minutes } = parseTimeString(activity.time || '9:00 AM');
      const endTimeStr = `${(hours + 1) % 24}:${String(minutes).padStart(2, '0')} ${hours >= 11 ? 'PM' : 'AM'}`;
      const endTime = formatICSDateTime(dateStr, endTimeStr);

      events.push(`DTSTART:${startTime}`);
      events.push(`DTEND:${endTime}`);

      // Add summary and description
      events.push(`SUMMARY:${escapeICS(activity.description)}`);

      if (activity.address) {
        events.push(`LOCATION:${escapeICS(activity.address)}`);
      }

      const description = `${escapeICS(activity.description)}\\nCategory: ${escapeICS(activity.category || 'General')}`;
      events.push(`DESCRIPTION:${description}`);

      events.push('END:VEVENT');
    });
  });

  events.push('END:VCALENDAR');

  const content = events.join('\r\n');
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });

  return {
    content: blob,
    mimeType: 'text/calendar',
    filename: `${(itinerary.title || 'itinerary').replace(/\s+/g, '_')}.ics`
  };
}