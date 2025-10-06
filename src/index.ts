/**
 * @jalexw/calendar-ics-parser
 *
 * A comprehensive ICS (iCalendar) parser with TypeScript support and Zod validation.
 * Supports parsing VEVENT, VTODO, VJOURNAL, VFREEBUSY, and VTIMEZONE components.
 */

import runCalendarIcsParserCLI from "./cli";

// Main parsing function
export { default as parseIcsData } from "./parseIcsData";

// CLI interface
export { runCalendarIcsParserCLI } from "./cli";

// Core types
export type { ParsedIcsData } from "./types/ParsedIcsData";
export type {
  IcsCalendar,
  IcsTodo,
  IcsJournal,
  IcsFreeBusy,
  IcsTimezone,
} from "./types/IcsCalendar";
export type { IcsEvent } from "./types/IcsEvent";

// Zod schemas for validation
export { parsedIcsDataSchema } from "./types/ParsedIcsData";
export { icsCalendarSchema } from "./types/IcsCalendar";
export { icsEventSchema } from "./types/IcsEvent";

// Parsing utilities
export {
  unfoldLines,
  parsePropertyLine,
  parseParameters,
  unescapeValue,
  formatIcsDate,
  parseIcsDate,
  parsePersonProperty,
  splitCommaSeparated,
  formatEventSummary,
  validatePropertyFormat,
} from "./utils/icsUtils";

// Display formatting utilities
export {
  formatParsedData,
  formatMetadata,
  formatCalendar,
  formatEvent,
  formatTodo,
  formatJournal,
  formatFreeBusy,
  formatEventsTable,
  formatAsSimpleJson,
} from "./utils/displayFormatter";

// File reading utility
export { default as readUtf8 } from "./readUtf8";

if (require.main === module) {
  runCalendarIcsParserCLI(process.argv)
    .then((): void => {
      process.exit(0);
    })
    .catch((e: unknown): void => {
      console.error("Error running @jalexw/calendar-ics-parser: ", e);
      process.exit(1);
    });
}
