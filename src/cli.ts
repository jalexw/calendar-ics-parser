import { Command } from "commander";
import readUtf8 from "./readUtf8";
import parseIcsData from "./parseIcsData";

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

    const parsed = await parseIcsData(fileData, debug);
    console.log(parsed);
  });

async function runCalendarIcsParserCLI(argv: readonly string[]): Promise<void> {
  await cli.parseAsync(argv);
}

export { runCalendarIcsParserCLI, runCalendarIcsParserCLI as default };

if (require.main === module) {
  await runCalendarIcsParserCLI(process.argv);
}
