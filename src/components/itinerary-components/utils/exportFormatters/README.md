# Export Formatters Documentation

## Overview

The Export Formatters module provides a comprehensive set of utilities for converting itinerary data into various exportable formats. Each formatter is designed to be modular, type-safe, and easily extensible.

## Architecture

```
exportFormatters/
├── index.ts           # Main exports and type definitions
├── textFormatter.ts   # Plain text formatting
├── markdownFormatter.ts # Markdown formatting
├── icsFormatter.ts    # Calendar (ICS) format
├── pdfFormatter.ts    # PDF generation
└── README.md         # This documentation
```

## Core Types

```typescript
interface FormatterResult {
  content: string | Blob;
  filename: string;
  mimeType: string;
}

interface FormatterOptions {
  itinerary: GeneratePersonalizedItineraryOutput;
  locale?: string;
  timezone?: string;
  includeDetails?: boolean;
}
```

## Available Formatters

### 1. Text Formatter (`formatAsText`)

Converts itinerary data to plain text format suitable for copying to clipboard or simple text files.

**Purpose**: Human-readable format for sharing via messaging apps or email

**Usage**:
```typescript
import { formatAsText } from '@/components/itinerary-components/utils/exportFormatters';

const result = formatAsText({
  itinerary: itineraryData,
  includeDetails: true
});
// result.content: string (plain text)
// result.filename: "itinerary.txt"
// result.mimeType: "text/plain"
```

**Example Output**:
```
=================================
TRIP TO PARIS & ROME
5 Days | March 15-19, 2024
=================================

DESTINATION 1: PARIS (3 days)
---------------------------------

Day 1 - March 15
• Morning: Eiffel Tower Visit
  Time: 09:00 - 11:00
  Location: Champ de Mars

• Afternoon: Louvre Museum
  Time: 14:00 - 17:00
  Location: Rue de Rivoli
```

### 2. Markdown Formatter (`formatAsMarkdown`)

Creates a markdown-formatted version with proper headings, lists, and emphasis.

**Purpose**: Documentation, GitHub sharing, note-taking apps

**Usage**:
```typescript
import { formatAsMarkdown } from '@/components/itinerary-components/utils/exportFormatters';

const result = formatAsMarkdown({
  itinerary: itineraryData
});
// result.content: string (markdown)
// result.filename: "itinerary.md"
// result.mimeType: "text/markdown"
```

**Example Output**:
```markdown
# Trip to Paris & Rome

**Duration**: 5 Days (March 15-19, 2024)
**Destinations**: 2

## Paris
*3 days in the City of Light*

### Day 1 - March 15

#### Morning: Eiffel Tower Visit
- **Time**: 09:00 - 11:00
- **Location**: Champ de Mars
- **Description**: Iconic iron tower with panoramic city views
```

### 3. ICS Formatter (`formatAsICS`)

Generates calendar files compatible with Google Calendar, Outlook, and Apple Calendar.

**Purpose**: Import itinerary activities directly into calendar applications

**Usage**:
```typescript
import { formatAsICS } from '@/components/itinerary-components/utils/exportFormatters';

const result = formatAsICS({
  itinerary: itineraryData,
  timezone: 'Europe/Paris'
});
// result.content: Blob (ICS file)
// result.filename: "itinerary.ics"
// result.mimeType: "text/calendar"
```

**Features**:
- Creates individual calendar events for each activity
- Includes location data for map integration
- Sets proper time zones for international travel
- Adds descriptions and travel notes

**Example ICS Event**:
```
BEGIN:VEVENT
UID:activity-001@nomad-navigator.com
DTSTART:20240315T090000Z
DTEND:20240315T110000Z
SUMMARY:Eiffel Tower Visit
LOCATION:Champ de Mars, Paris, France
DESCRIPTION:Iconic iron tower with panoramic city views
END:VEVENT
```

### 4. PDF Formatter (`formatAsPDF`)

Generates professionally formatted PDF documents with proper styling and layout.

**Purpose**: Printable itineraries, official documentation, archival

**Usage**:
```typescript
import { formatAsPDF } from '@/components/itinerary-components/utils/exportFormatters';

const result = await formatAsPDF({
  itinerary: itineraryData,
  includeDetails: true
});
// result.content: Blob (PDF file)
// result.filename: "itinerary.pdf"
// result.mimeType: "application/pdf"
```

**Features**:
- Professional typography and layout
- Page breaks between destinations
- Optional QR codes for digital access
- Embedded images when available
- Table of contents for long itineraries

**PDF Structure**:
```
Page 1: Cover Page
- Trip Title
- Duration
- Summary

Page 2+: Destination Pages
- Destination Header
- Daily Activities
- Accommodation Info
- Transportation Details

Last Page: Notes & Contact Info
```

## Extensibility Guide

### Adding a New Formatter

1. Create a new file in the `exportFormatters` directory:
```typescript
// jsonFormatter.ts
import type { FormatterResult, FormatterOptions } from './types';

export function formatAsJSON(options: FormatterOptions): FormatterResult {
  const { itinerary } = options;

  const jsonContent = JSON.stringify(itinerary, null, 2);

  return {
    content: jsonContent,
    filename: `itinerary-${Date.now()}.json`,
    mimeType: 'application/json'
  };
}
```

2. Export from index.ts:
```typescript
export { formatAsJSON } from './jsonFormatter';
```

3. Add to Export Menu component as needed

### Custom Formatting Options

Each formatter can accept additional options:

```typescript
interface ExtendedFormatterOptions extends FormatterOptions {
  // Base options
  itinerary: GeneratePersonalizedItineraryOutput;
  locale?: string;
  timezone?: string;
  includeDetails?: boolean;

  // Custom options
  colorScheme?: 'light' | 'dark';
  pageSize?: 'A4' | 'Letter';
  includeImages?: boolean;
  watermark?: string;
}
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: PDF formatter loads jsPDF only when needed
2. **String Building**: Use array join for large text concatenation
3. **Memory Management**: Clean up Blob URLs after download
4. **Async Operations**: PDF generation is async to prevent UI blocking

### Bundle Size Impact

| Formatter | Size | Load Strategy |
|-----------|------|---------------|
| Text | ~2KB | Always loaded |
| Markdown | ~3KB | Always loaded |
| ICS | ~5KB | Always loaded |
| PDF | ~200KB | Dynamic import |

## Error Handling

Each formatter includes error handling:

```typescript
try {
  const result = formatAsPDF({ itinerary });
  return result;
} catch (error) {
  console.error('PDF generation failed:', error);
  // Fallback to text format
  return formatAsText({ itinerary });
}
```

## Localization Support

Formatters support internationalization:

```typescript
const result = formatAsText({
  itinerary,
  locale: 'fr-FR', // French formatting
  timezone: 'Europe/Paris'
});
```

Supported locales:
- en-US (default)
- en-GB
- fr-FR
- es-ES
- de-DE
- it-IT
- ja-JP
- zh-CN

## Testing Formatters

### Unit Testing Example

```typescript
describe('formatAsText', () => {
  it('should format single destination correctly', () => {
    const mockItinerary = createMockItinerary();
    const result = formatAsText({ itinerary: mockItinerary });

    expect(result.content).toContain('DESTINATION 1:');
    expect(result.mimeType).toBe('text/plain');
  });

  it('should handle missing activities gracefully', () => {
    const emptyItinerary = createEmptyItinerary();
    const result = formatAsText({ itinerary: emptyItinerary });

    expect(result.content).toContain('No activities planned');
  });
});
```

### Integration Testing

Test the complete export flow:
1. Generate itinerary data
2. Format using each formatter
3. Verify file downloads correctly
4. Validate content structure

## Common Issues and Solutions

### Issue: ICS files not importing correctly
**Solution**: Ensure proper timezone formatting and valid UIDs for events

### Issue: PDF generation timeout
**Solution**: Implement chunked rendering for large itineraries

### Issue: Special characters in text export
**Solution**: Use proper UTF-8 encoding and escape sequences

### Issue: Memory leaks with Blob URLs
**Solution**: Always revoke object URLs after use:
```typescript
const url = URL.createObjectURL(blob);
// ... use URL
URL.revokeObjectURL(url);
```

## Future Enhancements

1. **Excel Export** (XLSX format)
   - Tabular activity data
   - Budget breakdown sheets
   - Contact information tabs

2. **HTML Export**
   - Standalone webpage
   - Embedded styling
   - Print-friendly layout

3. **QR Code Integration**
   - Shareable links in PDF
   - Digital business cards
   - Quick access codes

4. **Template System**
   - Custom PDF templates
   - Brand customization
   - Multiple layout options

5. **Compression**
   - ZIP multiple formats
   - Reduce file sizes
   - Batch exports

## API Reference

### Core Functions

```typescript
formatAsText(options: FormatterOptions): FormatterResult
formatAsMarkdown(options: FormatterOptions): FormatterResult
formatAsICS(options: FormatterOptions): FormatterResult
formatAsPDF(options: FormatterOptions): Promise<FormatterResult>
```

### Utility Functions

```typescript
sanitizeFilename(name: string): string
generateUID(prefix: string): string
formatDate(date: Date, locale?: string): string
escapeICSString(text: string): string
```

## Contributing

When adding new formatters:
1. Follow existing patterns and types
2. Include comprehensive error handling
3. Add unit tests for new formatters
4. Update this documentation
5. Consider bundle size impact
6. Ensure accessibility compliance