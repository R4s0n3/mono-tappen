/**
 * Increments app.identity.json buildNumber and writes it into the Xcode project.
 * Run this before every new TestFlight upload. App Store Connect rejects a repeat.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { applyIdentity, readIdentity } from "./apply-identity.mjs";

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app.identity.json");
const identity = readIdentity(file);
identity.buildNumber += 1;
fs.writeFileSync(file, `${JSON.stringify(identity, null, 2)}\n`);
applyIdentity(identity);
console.log(`build number is now ${identity.buildNumber}`);
