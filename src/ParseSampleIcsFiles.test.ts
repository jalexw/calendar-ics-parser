import { describe, expect, test } from "bun:test";
import { join, normalize } from "path";
import { existsSync } from "fs";
import parseIcsData from "./parseIcsData";
import readUtf8 from "./readUtf8";

const projectRootDir = normalize(join(__dirname, ".."));
const samplesDir = join(projectRootDir, "samples");
if (!existsSync(samplesDir)) {
  throw new Error("Failed to resolve samples/ directory!");
}

describe("Parsing sample .ics files", () => {
  test("can parse simple sample.ics calendar", async () => {
    const parsed = await parseIcsData(
      await readUtf8(join(samplesDir, "sample.ics")),
    );
    expect(parsed.metadata.totalEvents).toBeNumber();
    expect(parsed.metadata.totalEvents).toBe(7);
  });

  test("can parse more complex complex-sample.ics calendar", async () => {
    const parsed = await parseIcsData(
      await readUtf8(join(samplesDir, "complex-sample.ics")),
    );
    expect(parsed.metadata.totalEvents).toBeNumber();
    expect(parsed.metadata.totalEvents).toBe(5);
  });
});
