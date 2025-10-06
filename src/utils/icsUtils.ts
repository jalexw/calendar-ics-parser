/**
 * Utility functions for parsing ICS calendar data
 */

import type { IcsEvent } from "../types/IcsEvent";

/**
 * Unfolds ICS content lines by removing CRLF followed by whitespace
 */
export function unfoldLines(content: string): string[] {
  return content
    .replace(/\r\n[ \t]/g, "") // Remove CRLF + whitespace/tab (line folding)
    .replace(/\n[ \t]/g, "") // Also handle LF + whitespace/tab (line folding)
    .replace(/\r?\n/g, "\n") // Normalize line endings
    .split("\n")
    .filter((line) => line.trim().length > 0);
}

/**
 * Parses an ICS property line into name, parameters, and value
 */
export function parsePropertyLine(line: string): {
  name: string;
  parameters: Record<string, string>;
  value: string;
} {
  const colonIndex = line.indexOf(":");
  if (colonIndex === -1) {
    throw new Error(`Invalid property line: ${line}`);
  }

  const propertyPart = line.substring(0, colonIndex);
  const value = line.substring(colonIndex + 1);

  // Parse property name and parameters
  const semicolonIndex = propertyPart.indexOf(";");
  let name: string;
  let parameters: Record<string, string> = {};

  if (semicolonIndex === -1) {
    name = propertyPart;
  } else {
    name = propertyPart.substring(0, semicolonIndex);
    const paramString = propertyPart.substring(semicolonIndex + 1);
    parameters = parseParameters(paramString);
  }

  return {
    name: name.toUpperCase(),
    parameters,
    value: unescapeValue(value),
  };
}

/**
 * Parses property parameters
 */
export function parseParameters(paramString: string): Record<string, string> {
  const parameters: Record<string, string> = {};

  // Split by semicolon, but be careful of quoted values
  const paramPairs = paramString.split(";");

  for (const pair of paramPairs) {
    const equalIndex = pair.indexOf("=");
    if (equalIndex !== -1) {
      const key = pair.substring(0, equalIndex).toUpperCase();
      let value = pair.substring(equalIndex + 1);

      // Remove quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }

      parameters[key] = value;
    }
  }

  return parameters;
}

/**
 * Unescapes ICS text values
 */
export function unescapeValue(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\;/g, ";")
    .replace(/\\,/g, ",")
    .replace(/\\\\/g, "\\");
}

/**
 * Formats an ICS date/datetime for human reading
 */
export function formatIcsDate(dateString: string): string {
  if (!dateString) return "";

  // Handle date-only format (YYYYMMDD)
  if (dateString.length === 8) {
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    return `${year}-${month}-${day}`;
  }

  // Handle datetime format (YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ)
  if (dateString.length >= 15) {
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    const hour = dateString.substring(9, 11);
    const minute = dateString.substring(11, 13);
    const second = dateString.substring(13, 15);
    const isUtc = dateString.endsWith("Z");

    return `${year}-${month}-${day} ${hour}:${minute}:${second}${isUtc ? " UTC" : ""}`;
  }

  return dateString;
}

/**
 * Converts ICS date to JavaScript Date object
 */
export function parseIcsDate(dateString: string): Date {
  if (!dateString) throw new Error("Empty date string");

  // Handle date-only format (YYYYMMDD)
  if (dateString.length === 8) {
    const year = parseInt(dateString.substring(0, 4), 10);
    const month = parseInt(dateString.substring(4, 6), 10) - 1; // JS months are 0-based
    const day = parseInt(dateString.substring(6, 8), 10);
    return new Date(year, month, day);
  }

  // Handle datetime format (YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ)
  if (dateString.length >= 15) {
    const year = parseInt(dateString.substring(0, 4), 10);
    const month = parseInt(dateString.substring(4, 6), 10) - 1;
    const day = parseInt(dateString.substring(6, 8), 10);
    const hour = parseInt(dateString.substring(9, 11), 10);
    const minute = parseInt(dateString.substring(11, 13), 10);
    const second = parseInt(dateString.substring(13, 15), 10);

    if (dateString.endsWith("Z")) {
      return new Date(Date.UTC(year, month, day, hour, minute, second));
    } else {
      return new Date(year, month, day, hour, minute, second);
    }
  }

  throw new Error(`Invalid date format: ${dateString}`);
}

/**
 * Parses an attendee or organizer property value
 */
export function parsePersonProperty(
  value: string,
  parameters: Record<string, string>,
) {
  // Extract email from mailto: URI or direct email
  const email = value.startsWith("mailto:") ? value.substring(7) : value;

  return {
    email,
    commonName: parameters.CN || undefined,
    role: (parameters.ROLE as any) || undefined,
    partstat: (parameters.PARTSTAT as any) || undefined,
    rsvp: parameters.RSVP === "TRUE" || undefined,
  };
}

/**
 * Splits a comma-separated value while respecting escaping
 */
export function splitCommaSeparated(value: string): string[] {
  const result: string[] = [];
  let current = "";
  let escaped = false;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];

    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === "\\") {
      current += char;
      escaped = true;
    } else if (char === ",") {
      result.push(unescapeValue(current.trim()));
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(unescapeValue(current.trim()));
  }

  return result;
}

/**
 * Creates a readable summary of an event for display
 */
export function formatEventSummary(event: IcsEvent): string {
  const parts: string[] = [];

  if (event.summary) {
    parts.push(`Title: ${event.summary}`);
  }

  if (event.dtstart) {
    parts.push(`Start: ${formatIcsDate(event.dtstart)}`);
  }

  if (event.dtend) {
    parts.push(`End: ${formatIcsDate(event.dtend)}`);
  } else if (event.duration) {
    parts.push(`Duration: ${event.duration}`);
  }

  if (event.location) {
    parts.push(`Location: ${event.location}`);
  }

  if (event.description) {
    const truncatedDesc =
      event.description.length > 100
        ? event.description.substring(0, 100) + "..."
        : event.description;
    parts.push(`Description: ${truncatedDesc}`);
  }

  if (event.organizer?.email) {
    const organizerName = event.organizer.commonName || event.organizer.email;
    parts.push(`Organizer: ${organizerName}`);
  }

  if (event.attendee && event.attendee.length > 0) {
    parts.push(`Attendees: ${event.attendee.length}`);
  }

  if (event.status) {
    parts.push(`Status: ${event.status}`);
  }

  if (event.rrule) {
    parts.push(`Recurring: ${event.rrule}`);
  }

  return parts.join("\n  ");
}

/**
 * Validates that a property value matches expected format
 */
export function validatePropertyFormat(name: string, value: string): boolean {
  switch (name) {
    case "DTSTART":
    case "DTEND":
    case "DTSTAMP":
    case "CREATED":
    case "LAST-MODIFIED":
      return /^\d{8}(T\d{6}Z?)?$/.test(value);
    case "PRIORITY":
      const priority = parseInt(value, 10);
      return !isNaN(priority) && priority >= 0 && priority <= 9;
    case "SEQUENCE":
      const sequence = parseInt(value, 10);
      return !isNaN(sequence) && sequence >= 0;
    case "STATUS":
      return ["TENTATIVE", "CONFIRMED", "CANCELLED"].includes(value);
    case "CLASS":
      return ["PUBLIC", "PRIVATE", "CONFIDENTIAL"].includes(value);
    case "TRANSP":
      return ["OPAQUE", "TRANSPARENT"].includes(value);
    default:
      return true; // Don't validate unknown properties
  }
}
