/**
 * Display formatting utilities for parsed calendar data
 */

import type { ParsedIcsData } from "../types/ParsedIcsData";
import type {
  IcsCalendar,
  IcsTodo,
  IcsJournal,
  IcsFreeBusy,
} from "../types/IcsCalendar";
import type { IcsEvent } from "../types/IcsEvent";
import { formatIcsDate, parseIcsDate } from "./icsUtils";

/**
 * Formats the entire parsed ICS data for display
 */
export function formatParsedData(
  data: ParsedIcsData,
  options: {
    includeRawData?: boolean;
    maxDescriptionLength?: number;
    showMetadata?: boolean;
  } = {},
): string {
  const {
    includeRawData = false,
    maxDescriptionLength = 200,
    showMetadata = true,
  } = options;

  const sections: string[] = [];

  // Header
  sections.push("🗓️  CALENDAR PARSER RESULTS");
  sections.push("═".repeat(50));

  // Metadata
  if (showMetadata) {
    sections.push(formatMetadata(data.metadata));
    sections.push("");
  }

  // Calendar data
  data.calendars.forEach((calendar, index) => {
    sections.push(
      formatCalendar(calendar, index, { maxDescriptionLength, includeRawData }),
    );
    sections.push("");
  });

  return sections.join("\n");
}

/**
 * Formats metadata section
 */
export function formatMetadata(metadata: ParsedIcsData["metadata"]): string {
  const lines: string[] = [];

  lines.push("📊 SUMMARY");
  lines.push("─".repeat(20));
  lines.push(`📅 Events: ${metadata.totalEvents}`);
  lines.push(`✅ Todos: ${metadata.totalTodos}`);
  lines.push(`📔 Journals: ${metadata.totalJournals}`);
  lines.push(`🕐 Free/Busy: ${metadata.totalFreebusys}`);
  lines.push(`🌍 Timezones: ${metadata.totalTimezones}`);

  if (metadata.parseErrors.length > 0) {
    lines.push("");
    lines.push("❌ ERRORS:");
    metadata.parseErrors.forEach((error) => {
      lines.push(`   • ${error}`);
    });
  }

  if (metadata.parseWarnings.length > 0) {
    lines.push("");
    lines.push("⚠️  WARNINGS:");
    metadata.parseWarnings.forEach((warning) => {
      lines.push(`   • ${warning}`);
    });
  }

  return lines.join("\n");
}

/**
 * Formats a single calendar
 */
export function formatCalendar(
  calendar: IcsCalendar,
  index: number,
  options: { maxDescriptionLength?: number; includeRawData?: boolean } = {},
): string {
  const { maxDescriptionLength = 200, includeRawData = false } = options;
  const lines: string[] = [];

  // Calendar header
  lines.push(`📋 CALENDAR ${index + 1}`);
  lines.push("─".repeat(30));

  // Calendar properties
  lines.push(`Product: ${calendar.prodid}`);
  lines.push(`Version: ${calendar.version}`);

  if (calendar.calname) lines.push(`Name: ${calendar.calname}`);
  if (calendar.caldesc) lines.push(`Description: ${calendar.caldesc}`);
  if (calendar.method) lines.push(`Method: ${calendar.method}`);
  if (calendar.calscale) lines.push(`Calendar Scale: ${calendar.calscale}`);
  if (calendar.timezone) lines.push(`Timezone: ${calendar.timezone}`);

  // Custom properties
  if (
    calendar.customProperties &&
    Object.keys(calendar.customProperties).length > 0
  ) {
    lines.push("");
    lines.push("🔧 Custom Properties:");
    Object.entries(calendar.customProperties).forEach(([key, value]) => {
      lines.push(`   ${key}: ${value}`);
    });
  }

  // Events
  if (calendar.events.length > 0) {
    lines.push("");
    lines.push(`📅 EVENTS (${calendar.events.length})`);
    lines.push("─".repeat(25));

    calendar.events.forEach((event, eventIndex) => {
      lines.push(
        formatEvent(event, eventIndex, {
          maxDescriptionLength,
          includeRawData,
        }),
      );
      if (eventIndex < calendar.events.length - 1) lines.push("");
    });
  }

  // Todos
  if (calendar.todos.length > 0) {
    lines.push("");
    lines.push(`✅ TODOS (${calendar.todos.length})`);
    lines.push("─".repeat(25));

    calendar.todos.forEach((todo, todoIndex) => {
      lines.push(formatTodo(todo, todoIndex));
      if (todoIndex < calendar.todos.length - 1) lines.push("");
    });
  }

  // Journals
  if (calendar.journals.length > 0) {
    lines.push("");
    lines.push(`📔 JOURNALS (${calendar.journals.length})`);
    lines.push("─".repeat(25));

    calendar.journals.forEach((journal, journalIndex) => {
      lines.push(formatJournal(journal, journalIndex));
      if (journalIndex < calendar.journals.length - 1) lines.push("");
    });
  }

  // Free/Busy
  if (calendar.freebusys.length > 0) {
    lines.push("");
    lines.push(`🕐 FREE/BUSY (${calendar.freebusys.length})`);
    lines.push("─".repeat(25));

    calendar.freebusys.forEach((freebusy, index) => {
      lines.push(formatFreeBusy(freebusy, index));
      if (index < calendar.freebusys.length - 1) lines.push("");
    });
  }

  return lines.join("\n");
}

/**
 * Formats a single event
 */
export function formatEvent(
  event: IcsEvent,
  index: number,
  options: { maxDescriptionLength?: number; includeRawData?: boolean } = {},
): string {
  const { maxDescriptionLength = 200, includeRawData = false } = options;
  const lines: string[] = [];

  // Event header
  const title = event.summary || "Untitled Event";
  const statusIcon = getStatusIcon(event.status);
  lines.push(`${index + 1}. ${statusIcon} ${title}`);

  // Basic info
  const indent = "   ";
  lines.push(`${indent}UID: ${event.uid}`);

  if (event.dtstart) {
    lines.push(`${indent}📅 Start: ${formatIcsDate(event.dtstart)}`);
  }

  if (event.dtend) {
    lines.push(`${indent}🏁 End: ${formatIcsDate(event.dtend)}`);
  } else if (event.duration) {
    lines.push(`${indent}⏱️  Duration: ${event.duration}`);
  }

  if (event.location) {
    lines.push(`${indent}📍 Location: ${event.location}`);
  }

  if (event.description) {
    const desc =
      event.description.length > maxDescriptionLength
        ? event.description.substring(0, maxDescriptionLength) + "..."
        : event.description;
    lines.push(`${indent}📝 Description: ${desc}`);
  }

  // Organizer
  if (event.organizer) {
    const name = event.organizer.commonName || event.organizer.email;
    lines.push(`${indent}👤 Organizer: ${name}`);
  }

  // Attendees
  if (event.attendee && event.attendee.length > 0) {
    lines.push(`${indent}👥 Attendees (${event.attendee.length}):`);
    event.attendee.forEach((attendee) => {
      const name = attendee.commonName || attendee.email;
      const status = attendee.partstat ? ` (${attendee.partstat})` : "";
      const role = attendee.role ? ` [${attendee.role}]` : "";
      lines.push(`${indent}   • ${name}${role}${status}`);
    });
  }

  // Additional properties
  if (event.priority !== undefined) {
    const priorityDesc = getPriorityDescription(event.priority);
    lines.push(`${indent}⭐ Priority: ${event.priority} (${priorityDesc})`);
  }

  if (event.status) {
    lines.push(`${indent}📊 Status: ${event.status}`);
  }

  if (event.class) {
    lines.push(`${indent}🔒 Class: ${event.class}`);
  }

  if (event.transp) {
    lines.push(`${indent}👻 Transparency: ${event.transp}`);
  }

  if (event.url) {
    lines.push(`${indent}🔗 URL: ${event.url}`);
  }

  if (event.categories && event.categories.length > 0) {
    lines.push(`${indent}🏷️  Categories: ${event.categories.join(", ")}`);
  }

  if (event.rrule) {
    lines.push(`${indent}🔄 Recurrence: ${formatRecurrenceRule(event.rrule)}`);
  }

  // Dates
  if (event.created) {
    lines.push(`${indent}📅 Created: ${formatIcsDate(event.created)}`);
  }

  if (event.lastModified) {
    lines.push(`${indent}✏️  Modified: ${formatIcsDate(event.lastModified)}`);
  }

  // Custom properties
  if (
    event.customProperties &&
    Object.keys(event.customProperties).length > 0
  ) {
    lines.push(`${indent}🔧 Custom Properties:`);
    Object.entries(event.customProperties).forEach(([key, value]) => {
      lines.push(`${indent}   ${key}: ${value}`);
    });
  }

  return lines.join("\n");
}

/**
 * Formats a single todo
 */
export function formatTodo(todo: IcsTodo, index: number): string {
  const lines: string[] = [];
  const title = todo.summary || "Untitled Todo";
  const statusIcon = getTodoStatusIcon(todo.status);

  lines.push(`${index + 1}. ${statusIcon} ${title}`);

  const indent = "   ";
  lines.push(`${indent}UID: ${todo.uid}`);

  if (todo.description) {
    lines.push(`${indent}📝 Description: ${todo.description}`);
  }

  if (todo.due) {
    lines.push(`${indent}📅 Due: ${formatIcsDate(todo.due)}`);
  }

  if (todo.priority !== undefined) {
    lines.push(
      `${indent}⭐ Priority: ${todo.priority} (${getPriorityDescription(todo.priority)})`,
    );
  }

  if (todo.percentComplete !== undefined) {
    lines.push(`${indent}📊 Progress: ${todo.percentComplete}%`);
  }

  if (todo.status) {
    lines.push(`${indent}📊 Status: ${todo.status}`);
  }

  return lines.join("\n");
}

/**
 * Formats a single journal entry
 */
export function formatJournal(journal: IcsJournal, index: number): string {
  const lines: string[] = [];
  const title = journal.summary || "Untitled Journal";

  lines.push(`${index + 1}. 📔 ${title}`);

  const indent = "   ";
  lines.push(`${indent}UID: ${journal.uid}`);

  if (journal.dtstart) {
    lines.push(`${indent}📅 Date: ${formatIcsDate(journal.dtstart)}`);
  }

  if (journal.description) {
    lines.push(`${indent}📝 Entry: ${journal.description}`);
  }

  return lines.join("\n");
}

/**
 * Formats a single free/busy entry
 */
export function formatFreeBusy(freebusy: IcsFreeBusy, index: number): string {
  const lines: string[] = [];

  lines.push(`${index + 1}. 🕐 Free/Busy Information`);

  const indent = "   ";
  lines.push(`${indent}UID: ${freebusy.uid}`);

  if (freebusy.organizer) {
    lines.push(`${indent}👤 Organizer: ${freebusy.organizer}`);
  }

  if (freebusy.dtstart) {
    lines.push(`${indent}📅 Start: ${formatIcsDate(freebusy.dtstart)}`);
  }

  if (freebusy.dtend) {
    lines.push(`${indent}🏁 End: ${formatIcsDate(freebusy.dtend)}`);
  }

  if (freebusy.freebusy && freebusy.freebusy.length > 0) {
    lines.push(`${indent}⏰ Busy Times:`);
    freebusy.freebusy.forEach((time) => {
      lines.push(`${indent}   • ${time}`);
    });
  }

  return lines.join("\n");
}

/**
 * Helper functions
 */
function getStatusIcon(status?: string): string {
  switch (status) {
    case "CONFIRMED":
      return "✅";
    case "TENTATIVE":
      return "❓";
    case "CANCELLED":
      return "❌";
    default:
      return "📅";
  }
}

function getTodoStatusIcon(status?: string): string {
  switch (status) {
    case "COMPLETED":
      return "✅";
    case "IN-PROCESS":
      return "🔄";
    case "CANCELLED":
      return "❌";
    case "NEEDS-ACTION":
    default:
      return "📋";
  }
}

function getPriorityDescription(priority: number): string {
  if (priority === 0) return "Undefined";
  if (priority <= 3) return "High";
  if (priority <= 6) return "Medium";
  return "Low";
}

function formatRecurrenceRule(rrule: string): string {
  // Basic RRULE formatting - could be expanded for more detailed parsing
  const parts = rrule.split(";");
  const formatted: string[] = [];

  parts.forEach((part) => {
    const [key, value] = part.split("=");
    if (!value) {
      throw new TypeError(
        "Expected recurrence rule value after '=' to be truthy!",
      );
    }
    switch (key) {
      case "FREQ":
        formatted.push(`Every ${value.toLowerCase()}`);
        break;
      case "INTERVAL":
        formatted.push(`interval ${value}`);
        break;
      case "BYDAY":
        formatted.push(`on ${value}`);
        break;
      case "BYMONTH":
        formatted.push(`in month ${value}`);
        break;
      case "BYMONTHDAY":
        formatted.push(`on day ${value}`);
        break;
      case "COUNT":
        formatted.push(`${value} times`);
        break;
      case "UNTIL":
        formatted.push(`until ${formatIcsDate(value)}`);
        break;
    }
  });

  return formatted.length > 0 ? formatted.join(", ") : rrule;
}

/**
 * Creates a simple table-like view of events
 */
export function formatEventsTable(events: IcsEvent[]): string {
  if (events.length === 0) return "No events found.";

  const lines: string[] = [];

  // Header
  lines.push(
    "┌─────────────────────┬─────────────────────┬──────────────────────────────┬─────────────────────┐",
  );
  lines.push(
    "│ Start Date          │ End Date            │ Title                        │ Status              │",
  );
  lines.push(
    "├─────────────────────┼─────────────────────┼──────────────────────────────┼─────────────────────┤",
  );

  // Events
  events.forEach((event) => {
    const start = event.dtstart
      ? formatIcsDate(event.dtstart).padEnd(19)
      : "                   ";
    const end = event.dtend
      ? formatIcsDate(event.dtend).padEnd(19)
      : "                   ";
    const title = (event.summary || "Untitled").substring(0, 28).padEnd(28);
    const status = (event.status || "").padEnd(19);

    lines.push(`│ ${start} │ ${end} │ ${title} │ ${status} │`);
  });

  lines.push(
    "└─────────────────────┴─────────────────────┴──────────────────────────────┴─────────────────────┘",
  );

  return lines.join("\n");
}

/**
 * Exports calendar data as simplified JSON
 */
export function formatAsSimpleJson(data: ParsedIcsData): string {
  const simplified = data.calendars.map((calendar) => ({
    name: calendar.calname || "Unnamed Calendar",
    description: calendar.caldesc,
    events: calendar.events.map((event) => ({
      title: event.summary,
      start: event.dtstart ? formatIcsDate(event.dtstart) : null,
      end: event.dtend ? formatIcsDate(event.dtend) : null,
      location: event.location,
      description: event.description,
      status: event.status,
      organizer: event.organizer?.commonName || event.organizer?.email,
      attendeeCount: event.attendee?.length || 0,
    })),
  }));

  return JSON.stringify(simplified, null, 2);
}
