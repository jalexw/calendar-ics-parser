const { runCalendarIcsParserCLI } = require("./dist-cjs/index.cjs");

async function run() {
  await runCalendarIcsParserCLI(process.argv);
}

run(process.argv)
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error("Error running @jalexw/calendar-ics-parser: ", e);
    process.exit(1);
  });
