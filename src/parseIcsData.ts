import type { ParsedIcsData } from "@/types/ParsedIcsData";

export default async function parseIcsData(
  data: string,
  debug: boolean = false,
): Promise<ParsedIcsData> {
  if (debug) {
    console.log(data);
  }
  throw new Error("Unimplemented");
}
