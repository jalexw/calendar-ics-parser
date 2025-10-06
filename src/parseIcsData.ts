import type { ParsedIcsData } from "@/types/ParsedIcsData";
import type { IcsCalendar } from "@/types/IcsCalendar";
import type { IcsEvent } from "@/types/IcsEvent";
import { icsCalendarSchema } from "@/types/IcsCalendar";
import { icsEventSchema } from "@/types/IcsEvent";
import {
  unfoldLines,
  parsePropertyLine,
  parsePersonProperty,
  splitCommaSeparated,
  formatEventSummary,
  validatePropertyFormat,
} from "@/utils/icsUtils";

interface ComponentBlock {
  type: string;
  properties: Array<{
    name: string;
    parameters: Record<string, string>;
    value: string;
  }>;
  subComponents: ComponentBlock[];
}

export default async function parseIcsData(
  data: string,
  debug: boolean = false,
): Promise<ParsedIcsData> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const calendars: IcsCalendar[] = [];

  try {
    if (debug) {
      console.log("Raw ICS data:");
      console.log(data);
      console.log("\n" + "=".repeat(50) + "\n");
    }

    // Step 1: Unfold lines and split into individual lines
    const lines = unfoldLines(data);

    if (debug) {
      console.log("Unfolded lines:");
      lines.forEach((line, index) => {
        console.log(`${index + 1}: ${line}`);
      });
      console.log("\n" + "=".repeat(50) + "\n");
    }

    // Step 2: Parse into component blocks
    const rootBlocks = parseIntoBlocks(lines, debug);

    if (debug) {
      console.log("Parsed component blocks:");
      console.log(JSON.stringify(rootBlocks, null, 2));
      console.log("\n" + "=".repeat(50) + "\n");
    }

    // Step 3: Process each VCALENDAR block
    for (const block of rootBlocks) {
      if (block.type === "VCALENDAR") {
        try {
          const calendar = parseCalendarBlock(block, debug);
          calendars.push(calendar);
        } catch (error) {
          const errorMsg = `Failed to parse calendar: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          if (debug) {
            console.error(errorMsg);
          }
        }
      } else {
        warnings.push(`Unexpected root component: ${block.type}`);
      }
    }

    // Step 4: Calculate metadata
    const metadata = {
      totalEvents: calendars.reduce((sum, cal) => sum + cal.events.length, 0),
      totalTodos: calendars.reduce((sum, cal) => sum + cal.todos.length, 0),
      totalJournals: calendars.reduce(
        (sum, cal) => sum + cal.journals.length,
        0,
      ),
      totalFreebusys: calendars.reduce(
        (sum, cal) => sum + cal.freebusys.length,
        0,
      ),
      totalTimezones: calendars.reduce(
        (sum, cal) => sum + cal.timezones.length,
        0,
      ),
      parseErrors: errors,
      parseWarnings: warnings,
    };

    const result: ParsedIcsData = {
      calendars,
      metadata,
    };

    if (debug) {
      console.log("Final parsed result:");
      console.log(JSON.stringify(result, null, 2));
      console.log("\n" + "=".repeat(50) + "\n");

      console.log("Human-readable events:");
      calendars.forEach((calendar, calIndex) => {
        console.log(`\nCalendar ${calIndex + 1}:`);
        console.log(`  Product ID: ${calendar.prodid}`);
        console.log(`  Version: ${calendar.version}`);
        if (calendar.calname) console.log(`  Name: ${calendar.calname}`);
        if (calendar.caldesc) console.log(`  Description: ${calendar.caldesc}`);

        console.log(`\nEvents (${calendar.events.length}):`);
        calendar.events.forEach((event, eventIndex) => {
          console.log(`\n  Event ${eventIndex + 1}:`);
          console.log(`    UID: ${event.uid}`);
          console.log(
            `    ${formatEventSummary(event).split("\n").join("\n    ")}`,
          );
        });
      });
    }

    return result;
  } catch (error) {
    const errorMsg = `Critical parsing error: ${error instanceof Error ? error.message : String(error)}`;
    errors.push(errorMsg);

    return {
      calendars: [],
      metadata: {
        totalEvents: 0,
        totalTodos: 0,
        totalJournals: 0,
        totalFreebusys: 0,
        totalTimezones: 0,
        parseErrors: errors,
        parseWarnings: warnings,
      },
    };
  }
}

function parseIntoBlocks(lines: string[], debug: boolean): ComponentBlock[] {
  const blocks: ComponentBlock[] = [];
  const stack: ComponentBlock[] = [];

  function getLastOnStack(): ComponentBlock {
    const lastItem = stack[stack.length - 1];
    if (!lastItem) {
      throw new TypeError("Received falsy component block in stack!");
    }
    return lastItem;
  }

  for (let i = 0; i < lines.length; i++) {
    const raw_line = lines[i];
    if (!raw_line) {
      continue;
    }
    const line: string = raw_line.trim();
    if (!line) {
      continue;
    }

    try {
      if (line.startsWith("BEGIN:")) {
        const componentType = line.substring(6);
        const newBlock: ComponentBlock = {
          type: componentType,
          properties: [],
          subComponents: [],
        };

        if (stack.length === 0) {
          blocks.push(newBlock);
        } else {
          getLastOnStack().subComponents.push(newBlock);
        }

        stack.push(newBlock);
      } else if (line.startsWith("END:")) {
        const componentType = line.substring(4);
        if (stack.length === 0) {
          throw new Error(`Unexpected END:${componentType} at line ${i + 1}`);
        }

        const currentBlock = getLastOnStack();
        if (currentBlock.type !== componentType) {
          throw new Error(
            `Mismatched component: expected END:${currentBlock.type}, got END:${componentType} at line ${i + 1}`,
          );
        }

        stack.pop();
      } else {
        // Property line
        if (stack.length === 0) {
          throw new Error(
            `Property outside of component at line ${i + 1}: ${line}`,
          );
        }

        const property = parsePropertyLine(line);
        getLastOnStack().properties.push(property);
      }
    } catch (error) {
      if (debug) {
        console.warn(
          `Warning at line ${i + 1}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      // Continue parsing despite errors
    }
  }

  if (stack.length > 0) {
    throw new Error(
      `Unclosed components: ${stack.map((b) => b.type).join(", ")}`,
    );
  }

  return blocks;
}

function parseCalendarBlock(
  block: ComponentBlock,
  debug: boolean,
): IcsCalendar {
  const calendar: Partial<IcsCalendar> = {
    events: [],
    todos: [],
    journals: [],
    freebusys: [],
    timezones: [],
    unparsedComponents: [],
    customProperties: {},
  };

  // Parse calendar properties
  for (const prop of block.properties) {
    switch (prop.name) {
      case "VERSION":
        calendar.version = prop.value as "2.0";
        break;
      case "PRODID":
        calendar.prodid = prop.value;
        break;
      case "CALSCALE":
        calendar.calscale = prop.value as "GREGORIAN";
        break;
      case "METHOD":
        calendar.method = prop.value as any;
        break;
      case "X-WR-CALNAME":
        calendar.calname = prop.value;
        break;
      case "X-WR-CALDESC":
        calendar.caldesc = prop.value;
        break;
      case "X-WR-TIMEZONE":
        calendar.timezone = prop.value;
        break;
      case "X-PUBLISHED-TTL":
      case "REFRESH-INTERVAL":
        calendar.refreshInterval = prop.value;
        break;
      default:
        if (prop.name.startsWith("X-")) {
          calendar.customProperties = calendar.customProperties || {};
          calendar.customProperties[prop.name] = prop.value;
        }
        break;
    }
  }

  // Parse sub-components
  for (const subComponent of block.subComponents) {
    switch (subComponent.type) {
      case "VEVENT":
        try {
          const event = parseEventBlock(subComponent);
          calendar.events!.push(event);
        } catch (error) {
          if (debug) {
            console.warn(
              `Failed to parse event: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
        break;
      case "VTODO":
        try {
          const todo = parseTodoBlock(subComponent);
          calendar.todos!.push(todo);
        } catch (error) {
          if (debug) {
            console.warn(
              `Failed to parse todo: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
        break;
      case "VJOURNAL":
        try {
          const journal = parseJournalBlock(subComponent);
          calendar.journals!.push(journal);
        } catch (error) {
          if (debug) {
            console.warn(
              `Failed to parse journal: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
        break;
      case "VFREEBUSY":
        try {
          const freebusy = parseFreebusyBlock(subComponent);
          calendar.freebusys!.push(freebusy);
        } catch (error) {
          if (debug) {
            console.warn(
              `Failed to parse freebusy: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
        break;
      case "VTIMEZONE":
        try {
          const timezone = parseTimezoneBlock(subComponent);
          calendar.timezones!.push(timezone);
        } catch (error) {
          if (debug) {
            console.warn(
              `Failed to parse timezone: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
        break;
      default:
        calendar.unparsedComponents!.push({
          type: subComponent.type,
          rawData: JSON.stringify(subComponent),
        });
        break;
    }
  }

  // Validate with Zod schema
  return icsCalendarSchema.parse(calendar);
}

function parseEventBlock(block: ComponentBlock): IcsEvent {
  const event: Partial<IcsEvent> = {
    customProperties: {},
    attendee: [],
    categories: [],
    comment: [],
    contact: [],
    attach: [],
    exdate: [],
    related: [],
    resources: [],
    rdate: [],
  };

  for (const prop of block.properties) {
    switch (prop.name) {
      case "UID":
        event.uid = prop.value;
        break;
      case "DTSTAMP":
        event.dtstamp = prop.value;
        break;
      case "DTSTART":
        event.dtstart = prop.value;
        break;
      case "DTEND":
        event.dtend = prop.value;
        break;
      case "DURATION":
        event.duration = prop.value;
        break;
      case "SUMMARY":
        event.summary = prop.value;
        break;
      case "DESCRIPTION":
        event.description = prop.value;
        break;
      case "LOCATION":
        event.location = prop.value;
        break;
      case "STATUS":
        event.status = prop.value as any;
        break;
      case "CLASS":
        event.class = prop.value as any;
        break;
      case "TRANSP":
        event.transp = prop.value as any;
        break;
      case "PRIORITY":
        event.priority = parseInt(prop.value, 10);
        break;
      case "SEQUENCE":
        event.sequence = parseInt(prop.value, 10);
        break;
      case "CREATED":
        event.created = prop.value;
        break;
      case "LAST-MODIFIED":
        event.lastModified = prop.value;
        break;
      case "URL":
        event.url = prop.value;
        break;
      case "GEO":
        event.geo = prop.value;
        break;
      case "RECURID":
        event.recurid = prop.value;
        break;
      case "RRULE":
        event.rrule = prop.value;
        break;
      case "ORGANIZER":
        event.organizer = parsePersonProperty(prop.value, prop.parameters);
        break;
      case "ATTENDEE":
        const attendee = parsePersonProperty(prop.value, prop.parameters);
        event.attendee!.push(attendee);
        break;
      case "CATEGORIES":
        const categories = splitCommaSeparated(prop.value);
        event.categories!.push(...categories);
        break;
      case "COMMENT":
        event.comment!.push(prop.value);
        break;
      case "CONTACT":
        event.contact!.push(prop.value);
        break;
      case "ATTACH":
        event.attach!.push(prop.value);
        break;
      case "EXDATE":
        const exdates = splitCommaSeparated(prop.value);
        event.exdate!.push(...exdates);
        break;
      case "RELATED":
        event.related!.push(prop.value);
        break;
      case "RESOURCES":
        const resources = splitCommaSeparated(prop.value);
        event.resources!.push(...resources);
        break;
      case "RDATE":
        const rdates = splitCommaSeparated(prop.value);
        event.rdate!.push(...rdates);
        break;
      default:
        if (prop.name.startsWith("X-")) {
          event.customProperties![prop.name] = prop.value;
        }
        break;
    }
  }

  // Clean up empty arrays
  if (event.attendee?.length === 0) delete event.attendee;
  if (event.categories?.length === 0) delete event.categories;
  if (event.comment?.length === 0) delete event.comment;
  if (event.contact?.length === 0) delete event.contact;
  if (event.attach?.length === 0) delete event.attach;
  if (event.exdate?.length === 0) delete event.exdate;
  if (event.related?.length === 0) delete event.related;
  if (event.resources?.length === 0) delete event.resources;
  if (event.rdate?.length === 0) delete event.rdate;
  if (Object.keys(event.customProperties || {}).length === 0)
    delete event.customProperties;

  return icsEventSchema.parse(event);
}

function parseTodoBlock(block: ComponentBlock) {
  const todo: any = { customProperties: {} };

  for (const prop of block.properties) {
    switch (prop.name) {
      case "UID":
        todo.uid = prop.value;
        break;
      case "DTSTAMP":
        todo.dtstamp = prop.value;
        break;
      case "SUMMARY":
        todo.summary = prop.value;
        break;
      case "DESCRIPTION":
        todo.description = prop.value;
        break;
      case "PRIORITY":
        todo.priority = parseInt(prop.value, 10);
        break;
      case "STATUS":
        todo.status = prop.value;
        break;
      case "DUE":
        todo.due = prop.value;
        break;
      case "COMPLETED":
        todo.completed = prop.value;
        break;
      case "PERCENT-COMPLETE":
        todo.percentComplete = parseInt(prop.value, 10);
        break;
      default:
        if (prop.name.startsWith("X-")) {
          todo.customProperties[prop.name] = prop.value;
        }
        break;
    }
  }

  if (Object.keys(todo.customProperties).length === 0)
    delete todo.customProperties;
  return todo;
}

function parseJournalBlock(block: ComponentBlock) {
  const journal: any = { customProperties: {} };

  for (const prop of block.properties) {
    switch (prop.name) {
      case "UID":
        journal.uid = prop.value;
        break;
      case "DTSTAMP":
        journal.dtstamp = prop.value;
        break;
      case "SUMMARY":
        journal.summary = prop.value;
        break;
      case "DESCRIPTION":
        journal.description = prop.value;
        break;
      case "DTSTART":
        journal.dtstart = prop.value;
        break;
      default:
        if (prop.name.startsWith("X-")) {
          journal.customProperties[prop.name] = prop.value;
        }
        break;
    }
  }

  if (Object.keys(journal.customProperties).length === 0)
    delete journal.customProperties;
  return journal;
}

function parseFreebusyBlock(block: ComponentBlock) {
  const freebusy: any = { customProperties: {}, freebusy: [] };

  for (const prop of block.properties) {
    switch (prop.name) {
      case "UID":
        freebusy.uid = prop.value;
        break;
      case "DTSTAMP":
        freebusy.dtstamp = prop.value;
        break;
      case "ORGANIZER":
        freebusy.organizer = prop.value;
        break;
      case "DTSTART":
        freebusy.dtstart = prop.value;
        break;
      case "DTEND":
        freebusy.dtend = prop.value;
        break;
      case "FREEBUSY":
        freebusy.freebusy.push(prop.value);
        break;
      default:
        if (prop.name.startsWith("X-")) {
          freebusy.customProperties[prop.name] = prop.value;
        }
        break;
    }
  }

  if (Object.keys(freebusy.customProperties).length === 0)
    delete freebusy.customProperties;
  if (freebusy.freebusy.length === 0) delete freebusy.freebusy;
  return freebusy;
}

function parseTimezoneBlock(block: ComponentBlock) {
  let tzid = "";
  const properties: string[] = [];

  // Collect TZID and all raw properties
  for (const prop of block.properties) {
    if (prop.name === "TZID") {
      tzid = prop.value;
    }
    properties.push(`${prop.name}:${prop.value}`);
  }

  // Include subcomponents in raw data
  for (const subComp of block.subComponents) {
    properties.push(`BEGIN:${subComp.type}`);
    for (const prop of subComp.properties) {
      properties.push(`${prop.name}:${prop.value}`);
    }
    properties.push(`END:${subComp.type}`);
  }

  return {
    tzid,
    rawData: properties.join("\n"),
  };
}
