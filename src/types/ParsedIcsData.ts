import { z } from "zod";
const parsedIcsDataSchema = z.object({}).required({}).strict();

export type ParsedIcsData = z.infer<typeof parsedIcsDataSchema>;
