import { z } from "zod";
import { icsEventSchema, type IcsEvent } from "./IcsEvent";

// Calendar scale values
const calscaleSchema = z.enum([
  "GREGORIAN"
]).default("GREGORIAN");

// Method values for calendar
const methodSchema = z.enum([
  "PUBLISH",
  "REQUEST",
  "REPLY",
  "ADD",
  "CANCEL",
  "REFRESH",
  "COUNTER",
  "DECLINECOUNTER"
]);

// Version schema - currently only 2.0 is supported
const versionSchema = z.literal("2.0");

// Product ID schema
const prodidSchema = z.string().min(1);

// Timezone component schema (simplified)
const icsTimezoneSchema = z.object({
  tzid: z.string(),
  // Simplified - in reality this has STANDARD/DAYLIGHT components
  rawData: z.string(), // Store raw timezone data for now
});

// Todo component schema (simplified)
const icsTodoSchema = z.object({
  uid: z.string(),
  dtstamp: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  priority: z.number().int().min(0).max(9).optional(),
  status: z.enum(["NEEDS-ACTION", "COMPLETED", "IN-PROCESS", "CANCELLED"]).optional(),
  due: z.string().optional(),
  completed: z.string().optional(),
  percentComplete: z.number().int().min(0).max(100).optional(),
  customProperties: z.record(z.string(), z.string()).optional(),
});

// Journal component schema (simplified)
const icsJournalSchema = z.object({
  uid: z.string(),
  dtstamp: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  dtstart: z.string().optional(),
  customProperties: z.record(z.string(), z.string()).optional(),
});

// Free/busy component schema (simplified)
const icsFreebusySchema = z.object({
  uid: z.string(),
  dtstamp: z.string(),
  organizer: z.string().optional(),
  dtstart: z.string().optional(),
  dtend: z.string().optional(),
  freebusy: z.array(z.string()).optional(),
  customProperties: z.record(z.string(), z.string()).optional(),
});

// Main ICS Calendar schema
const icsCalendarSchema = z.object({
  // Required properties
  version: versionSchema,
  prodid: prodidSchema,

  // Optional properties
  calscale: calscaleSchema.optional(),
  method: methodSchema.optional(),

  // Common extension properties
  calname: z.string().optional(), // X-WR-CALNAME
  caldesc: z.string().optional(), // X-WR-CALDESC
  timezone: z.string().optional(), // X-WR-TIMEZONE
  refreshInterval: z.string().optional(), // X-PUBLISHED-TTL or REFRESH-INTERVAL

  // Components
  events: z.array(icsEventSchema).default([]),
  todos: z.array(icsTodoSchema).default([]),
  journals: z.array(icsJournalSchema).default([]),
  freebusys: z.array(icsFreebusySchema).default([]),
  timezones: z.array(icsTimezoneSchema).default([]),

  // Custom properties (X- prefixed)
  customProperties: z.record(z.string(), z.string()).optional(),

  // Raw unparsed components (for components we don't handle yet)
  unparsedComponents: z.array(z.object({
    type: z.string(),
    rawData: z.string(),
  })).default([]),
}).strict();

export { icsCalendarSchema };
export type IcsCalendar = z.infer<typeof icsCalendarSchema>;
export type IcsTodo = z.infer<typeof icsTodoSchema>;
export type IcsJournal = z.infer<typeof icsJournalSchema>;
export type IcsFreeBusy = z.infer<typeof icsFreebusySchema>;
export type IcsTimezone = z.infer<typeof icsTimezoneSchema>;
