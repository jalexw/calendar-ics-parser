import { existsSync } from "fs";
import { readFile } from "fs/promises";

async function readUtf8(path: string): Promise<string> {
  if (!existsSync(path)) {
    throw new Error(".ics file not found at specified path!");
  }
  const data = await readFile(path, { encoding: "utf-8" });
  return data;
}

export default readUtf8;
