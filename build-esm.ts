import { build } from "bun";

await build({
  entrypoints: [
    "src/index.ts",
    "src/cli.ts",
    "src/readUtf8.ts",
    "src/parseIcsData.ts",
  ],
  outdir: "dist-esm",
  splitting: true,
  format: "esm",
  target: "node",
});
