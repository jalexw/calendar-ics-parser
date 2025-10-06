import { z } from "zod";

// Date-time value schema - ICS uses YYYYMMDDTHHMMSSZ format
const icsDateTimeSchema = z.string().regex(/^\d{8}T\d{6}Z?$/);

// Date value schema - ICS uses YYYYMMDD format
const icsDateSchema = z.string().regex(/^\d{8}$/);

// Date or date-time schema
const icsDateOrDateTimeSchema = z.union([icsDateSchema, icsDateTimeSchema]);

// Recurrence rule schema
const rruleSchema = z.string().regex(/^FREQ=/);

// Geographic position schema (latitude;longitude)
const geoSchema = z.string().regex(/^-?\d+\.?\d*;-?\d+\.?\d*$/);

// Priority schema (0-9, with 0 = undefined, 1 = highest, 9 = lowest)
const prioritySchema = z.number().int().min(0).max(9);

// Status values for events
const eventStatusSchema = z.enum([
  "TENTATIVE",
  "CONFIRMED",
  "CANCELLED"
]);

// Class values for events
const classSchema = z.enum([
  "PUBLIC",
  "PRIVATE",
  "CONFIDENTIAL"
]);

// Transparency values
const transparencySchema = z.enum([
  "OPAQUE",
  "TRANSPARENT"
]);

// Attendee schema - simplified for now
const attendeeSchema = z.object({
  email: z.string().email(),
  commonName: z.string().optional(),
  role: z.enum(["CHAIR", "REQ-PARTICIPANT", "OPT-PARTICIPANT", "NON-PARTICIPANT"]).optional(),
  partstat: z.enum(["NEEDS-ACTION", "ACCEPTED", "DECLINED", "TENTATIVE", "DELEGATED"]).optional(),
  rsvp: z.boolean().optional(),
});

// Organizer schema
const organizerSchema = z.object({
  email: z.string().email(),
  commonName: z.string().optional(),
});

// Main ICS Event schema
const icsEventSchema = z.object({
  // Required properties
  uid: z.string().min(1),
  dtstamp: icsDateTimeSchema,

  // Required if no METHOD property in calendar
  dtstart: icsDateOrDateTimeSchema.optional(),

  // Optional properties that MUST NOT occur more than once
  class: classSchema.optional(),
  created: icsDateTimeSchema.optional(),
  description: z.string().optional(),
  dtend: icsDateOrDateTimeSchema.optional(),
  duration: z.string().optional(), // ISO 8601 duration format
  geo: geoSchema.optional(),
  lastModified: icsDateTimeSchema.optional(),
  location: z.string().optional(),
  organizer: organizerSchema.optional(),
  priority: prioritySchema.optional(),
  sequence: z.number().int().min(0).optional(),
  status: eventStatusSchema.optional(),
  summary: z.string().optional(),
  transp: transparencySchema.optional(),
  url: z.string().url().optional(),
  recurid: icsDateOrDateTimeSchema.optional(),

  // Optional property that SHOULD NOT occur more than once
  rrule: rruleSchema.optional(),

  // Optional properties that MAY occur more than once
  attach: z.array(z.string()).optional(),
  attendee: z.array(attendeeSchema).optional(),
  categories: z.array(z.string()).optional(),
  comment: z.array(z.string()).optional(),
  contact: z.array(z.string()).optional(),
  exdate: z.array(icsDateOrDateTimeSchema).optional(),
  related: z.array(z.string()).optional(),
  resources: z.array(z.string()).optional(),
  rdate: z.array(icsDateOrDateTimeSchema).optional(),

  // Custom properties (X- prefixed)
  customProperties: z.record(z.string(), z.string()).optional(),
}).strict();

// Refinement to ensure either dtend or duration is present, but not both
const refinedIcsEventSchema = icsEventSchema.refine(
  (data) => {
    const hasDtend = data.dtend !== undefined;
    const hasDuration = data.duration !== undefined;
    return !(hasDtend && hasDuration);
  },
  {
    message: "DTEND and DURATION cannot both be present in the same event",
  }
);

export { refinedIcsEventSchema as icsEventSchema };
export type IcsEvent = z.infer<typeof refinedIcsEventSchema>;
