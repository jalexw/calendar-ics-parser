# 🗓️ Calendar ICS Parser

A comprehensive TypeScript library for parsing ICS (iCalendar) files with Zod validation and multiple output formats.

## ✨ Features

- **Full ICS Support**: Parses VEVENT, VTODO, VJOURNAL, VFREEBUSY, and VTIMEZONE components
- **Type Safety**: Complete TypeScript support with Zod schema validation
- **Multiple Output Formats**: Pretty-printed, table view, JSON, and raw data formats
- **Line Folding**: Properly handles ICS line folding according to RFC 5545
- **Comprehensive Parsing**: Supports all standard ICS properties including recurrence rules, attendees, organizers, and custom properties
- **Error Handling**: Graceful error handling with detailed parse warnings and errors
- **CLI Interface**: Command-line tool for quick file parsing
- **Extensible**: Easy to extend with custom formatting and validation

## 🚀 Installation

```bash
# Using bun
bun add @jalexw/calendar-ics-parser

# Using npm
npm install @jalexw/calendar-ics-parser

# Using yarn
yarn add @jalexw/calendar-ics-parser
```

## 🖥️ CLI Usage

### Basic Parsing

```bash
# Parse an ICS file with pretty formatting (default)
bunx @jalexw/calendar-ics-parser transform calendar.ics

# Enable debug mode for detailed parsing info
bunx @jalexw/calendar-ics-parser transform calendar.ics --debug
```

### Output Formats

```bash
# Pretty formatted output with icons and colors
bunx @jalexw/calendar-ics-parser transform calendar.ics --format pretty

# Table view of all events
bunx @jalexw/calendar-ics-parser transform calendar.ics --format table

# Simplified JSON output
bunx @jalexw/calendar-ics-parser transform calendar.ics --format json

# Raw parsed data structure
bunx @jalexw/calendar-ics-parser transform calendar.ics --format raw
```

### Options

```bash
# Hide metadata in pretty format
bunx @jalexw/calendar-ics-parser transform calendar.ics --no-metadata

# Limit description length
bunx @jalexw/calendar-ics-parser transform calendar.ics --max-desc 100
```

## 📚 Programmatic API

### Basic Usage

```typescript
import { parseIcsData, formatParsedData, type ParsedIcsData } from '@jalexw/calendar-ics-parser';

const icsContent = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Example//EN
BEGIN:VEVENT
UID:example@example.com
DTSTAMP:20231201T120000Z
DTSTART:20231215T140000Z
DTEND:20231215T150000Z
SUMMARY:Team Meeting
END:VEVENT
END:VCALENDAR`;

// Parse the ICS data
const parsed: ParsedIcsData = await parseIcsData(icsContent);

// Format for display
console.log(formatParsedData(parsed));

// Access parsed events
parsed.calendars.forEach(calendar => {
  console.log(`Calendar: ${calendar.calname}`);
  calendar.events.forEach(event => {
    console.log(`Event: ${event.summary}`);
    console.log(`Start: ${event.dtstart}`);
    console.log(`End: ${event.dtend}`);
  });
});
```

### Advanced Usage with File Reading

```typescript
import { readUtf8, parseIcsData, formatEventsTable } from '@jalexw/calendar-ics-parser';

async function parseCalendarFile(filePath: string) {
  try {
    // Read the file
    const fileContent = await readUtf8(filePath);

    // Parse with debug info
    const parsed = await parseIcsData(fileContent, true);

    // Check for errors
    if (parsed.metadata.parseErrors.length > 0) {
      console.error('Parse errors:', parsed.metadata.parseErrors);
    }

    // Display events in table format
    const allEvents = parsed.calendars.flatMap(cal => cal.events);
    console.log(formatEventsTable(allEvents));

    return parsed;
  } catch (error) {
    console.error('Failed to parse calendar:', error);
    throw error;
  }
}

// Usage
parseCalendarFile('path/to/calendar.ics');
```

### Type Validation

```typescript
import { icsEventSchema, type IcsEvent } from '@jalexw/calendar-ics-parser';

// Validate event data
const eventData: unknown = {
  uid: 'test@example.com',
  dtstamp: '20231201T120000Z',
  dtstart: '20231215T140000Z',
  dtend: '20231215T150000Z',
  summary: 'Test Event'
};

try {
  const validEvent: IcsEvent = icsEventSchema.parse(eventData);
  console.log('Valid event:', validEvent);
} catch (error) {
  console.error('Validation failed:', error);
}
```

## 📋 Supported ICS Components

### ✅ Fully Supported
- **VCALENDAR** - Calendar container with all standard properties
- **VEVENT** - Events with full property support including recurrence, attendees, organizers
- **VTODO** - Todo items with status, priority, completion tracking
- **VJOURNAL** - Journal entries
- **VFREEBUSY** - Free/busy information
- **VTIMEZONE** - Timezone definitions (stored as raw data)

### 🔧 Properties Supported
- All standard date/time properties (DTSTART, DTEND, DTSTAMP, etc.)
- Recurrence rules (RRULE, EXDATE, RDATE)
- Person properties (ORGANIZER, ATTENDEE with full parameter support)
- Classification (PUBLIC, PRIVATE, CONFIDENTIAL)
- Status tracking (CONFIRMED, TENTATIVE, CANCELLED, etc.)
- Priority levels (0-9)
- Categories and custom properties (X- prefixed)
- Geographic coordinates (GEO)
- Attachments and URLs
- Comments and contacts

## 🐛 Error Handling

The parser includes comprehensive error handling:

```typescript
const parsed = await parseIcsData(icsContent);

// Check for parsing errors
if (parsed.metadata.parseErrors.length > 0) {
  console.error('Critical errors:', parsed.metadata.parseErrors);
}

// Check for warnings
if (parsed.metadata.parseWarnings.length > 0) {
  console.warn('Warnings:', parsed.metadata.parseWarnings);
}

// Parser continues even with errors, providing partial results
console.log(`Successfully parsed ${parsed.metadata.totalEvents} events`);
```

## 🔧 Development

```bash
# Install dependencies
bun install

# Run CLI on sample file
bun run src/cli.ts transform ./samples/sample.ics --debug

# Test with different formats
bun run src/cli.ts transform ./samples/sample.ics --format table
bun run src/cli.ts transform ./samples/sample.ics --format json
```

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines and submit pull requests to the main branch.

## 🙏 Acknowledgments

- Built with [Zod](https://github.com/colinhacks/zod) for runtime type validation
- Follows [RFC 5545](https://tools.ietf.org/html/rfc5545) iCalendar specification
- CLI powered by [Commander.js](https://github.com/tj/commander.js/)
