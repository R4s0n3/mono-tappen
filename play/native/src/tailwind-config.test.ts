import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const nativeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const loadConfigModule = require("tailwindcss/lib/public/load-config.js") as {
  default: (configPath: string) => {
    theme?: { extend?: { colors?: Record<string, Record<string, string>> } };
    plugins?: unknown[];
  };
};
const loadConfig = loadConfigModule.default;

describe("native tailwind config", () => {
  it("does not load play's Tailwind config", () => {
    const source = fs.readFileSync(path.join(nativeRoot, "tailwind.config.ts"), "utf8");
    assert.doesNotMatch(source, /from ["']\.\.\/tailwind\.config["']/);
    assert.match(source, /from ["']\.\.\/tailwind\.shared["']/);
  });

  it("loads the brand colors from the shared theme", () => {
    const config = loadConfig(path.join(nativeRoot, "tailwind.config.ts"));
    assert.equal(config.theme?.extend?.colors?.["tappen-blue"]?.["500"], "#1d1f2f");
    assert.equal(config.plugins?.length, 1);
  });
});
