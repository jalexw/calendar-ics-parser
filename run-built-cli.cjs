#!/usr/bin/env node

const jalexwCalendarIcsParser = require("@jalexw/calendar-ics-parser");

async function run() {
  await jalexwCalendarIcsParser.runCalendarIcsParserCLI(process.argv);
}

run(process.argv)
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error("Error running @jalexw/calendar-ics-parser: ", e);
    process.exit(1);
  });
