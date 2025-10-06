import { Command } from "commander";
import readUtf8 from "./readUtf8";
import parseIcsData from "./parseIcsData";
import {
  formatParsedData,
  formatEventsTable,
  formatAsSimpleJson,
} from "./utils/displayFormatter";

const cli = new Command();

cli
  .name("calendar-ics-parser")
  .description(
    "Parse a .ics calendar data file and convert/transform the data!",
  );

cli
  .command("transform")
  .description("Parse a .ics calendar data file and write into a new format!")
  .argument("<input_filepath>", "Path to .ics file")
  .option("--debug", "Enable additional debug logging")
  .option(
    "--format <type>",
    "Output format: pretty, table, json, raw",
    "pretty",
  )
  .option("--no-metadata", "Hide metadata in pretty format")
  .option("--max-desc <length>", "Maximum description length", "200")
  .action(async function transformAction(
    input_filepath: string,
    options: unknown,
  ): Promise<void> {
    if (typeof input_filepath !== "string" || input_filepath.length === 0) {
      console.error(
        "Expected first argument to be the file path to input .ics file!",
      );
      process.exit(1);
    }
    let fileData: string;
    try {
      fileData = await readUtf8(input_filepath);
    } catch (e: unknown) {
      console.error("Failed to read input .ics file into UTF-8 string: ", e);
      process.exit(1);
    }

    const debug: boolean =
      typeof options === "object" &&
      !!options &&
      "debug" in options &&
      !!options.debug;

    const format: string =
      typeof options === "object" &&
      !!options &&
      "format" in options &&
      typeof options.format === "string"
        ? options.format
        : "pretty";

    const showMetadata: boolean =
      typeof options === "object" && !!options && "metadata" in options
        ? !!options.metadata
        : true;

    const maxDescLength: number =
      typeof options === "object" &&
      !!options &&
      "maxDesc" in options &&
      typeof options.maxDesc === "string"
        ? parseInt(options.maxDesc, 10) || 200
        : 200;

    const parsed = await parseIcsData(fileData, debug);

    if (!debug) {
      // Only show formatted output if not in debug mode
      switch (format.toLowerCase()) {
        case "pretty":
          console.log(
            formatParsedData(parsed, {
              showMetadata,
              maxDescriptionLength: maxDescLength,
            }),
          );
          break;
        case "table":
          const allEvents = parsed.calendars.flatMap((cal) => cal.events);
          console.log("📅 EVENTS TABLE");
          console.log("═".repeat(50));
          console.log(formatEventsTable(allEvents));
          break;
        case "json":
          console.log(formatAsSimpleJson(parsed));
          break;
        case "raw":
        default:
          console.log(JSON.stringify(parsed, null, 2));
          break;
      }
    } else {
      // In debug mode, show raw data as before
      console.log(JSON.stringify(parsed, null, 2));
    }
  });

async function runCalendarIcsParserCLI(argv: readonly string[]): Promise<void> {
  await cli.parseAsync(argv);
}

export { runCalendarIcsParserCLI, runCalendarIcsParserCLI as default };

if (require.main === module) {
  await runCalendarIcsParserCLI(process.argv);
}
