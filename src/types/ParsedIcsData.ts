import { z } from "zod";
import { icsCalendarSchema, type IcsCalendar } from "./IcsCalendar";

const parsedIcsDataSchema = z
  .object({
    calendars: z.array(icsCalendarSchema),
    metadata: z
      .object({
        totalEvents: z.number().int().min(0),
        totalTodos: z.number().int().min(0),
        totalJournals: z.number().int().min(0),
        totalFreebusys: z.number().int().min(0),
        totalTimezones: z.number().int().min(0),
        parseErrors: z.array(z.string()).default([]),
        parseWarnings: z.array(z.string()).default([]),
      })
      .strict(),
  })
  .strict();

export { parsedIcsDataSchema };
export type ParsedIcsData = z.infer<typeof parsedIcsDataSchema>;
