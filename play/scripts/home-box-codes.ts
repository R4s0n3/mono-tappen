import fs from "node:fs";
import path from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";

import {
  BoxCodeError,
  commitBoxDrafts,
  generateBoxDrafts,
  voidIssuedBoxCodes,
} from "../src/server/home/box-code";
import { createPrismaBoxStore } from "../src/server/home/box-code-prisma";
import { publishTempExport, renderPrintableHtml, writeTempExport } from "../src/server/home/printable";

const DEFAULT_ORIGIN = "https://play.tappen.app";

function fail(message: string, code = 1): never {
  console.error(message);
  process.exit(code);
}

function readFlag(argv: string[], name: string): string | null {
  const index = argv.indexOf(name);
  if (index === -1) return null;
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) fail(`Missing value for ${name}.`);
  return value;
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name);
}

function usage(): never {
  console.log(`Usage:
  home-box-codes.ts issue --count <n> (--order <homeOrderId> | --unassigned) --export-printable <file.html> [--base-url <origin>]
  home-box-codes.ts void-issued --order <homeOrderId>

Issue writes a secret HTML file of QR codes and stores only hashes.
The export file is required. Codes are not printed to the terminal.
BOX_CODE_PEPPER (at least 32 characters) and DATABASE_URL must be set in the environment.
Do not pass secrets as arguments.`);
  process.exit(0);
}

function pepperFromEnv(): string {
  const pepper = process.env.BOX_CODE_PEPPER ?? "";
  if (pepper.length < 32) {
    fail("BOX_CODE_PEPPER must be set and at least 32 characters.", 2);
  }
  return pepper;
}

function databaseHint(error: unknown): never {
  const code =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : error instanceof BoxCodeError
        ? error.reason
        : "unknown";
  if (code === "pepper") fail("BOX_CODE_PEPPER must be set and at least 32 characters.", 2);
  if (code === "order_missing") fail("No HomeOrder with that id.");
  if (code === "order_not_payable") {
    fail("Codes can be issued only for a PAID or SHIPPED order. Unpaid, cancelled, and refunded orders are refused.");
  }
  if (code === "order_quantity") {
    fail("That order already has a code for every box. Void an unredeemed code before issuing a replacement.");
  }
  if (code === "P1001" || code === "P1012" || code === "P1013") {
    fail("DATABASE_URL is not available to the CLI.", 2);
  }
  fail(`Database error (${code}). No printable file was kept.`);
}

async function issue(argv: string[]): Promise<void> {
  const countRaw = readFlag(argv, "--count");
  const orderId = readFlag(argv, "--order");
  const exportPath = readFlag(argv, "--export-printable");
  const baseOrigin = readFlag(argv, "--base-url") ?? DEFAULT_ORIGIN;
  const unassigned = hasFlag(argv, "--unassigned");
  if (!exportPath) fail("Refusing to issue codes without --export-printable <file.html>.");
  const count = Number(countRaw);
  if (!countRaw || !Number.isInteger(count) || count < 1 || count > 100) {
    fail("--count must be a whole number from 1 to 100.");
  }
  if (Boolean(orderId) === unassigned) {
    fail("Pass either --order <homeOrderId> or --unassigned, not both.");
  }

  const pepper = pepperFromEnv();
  const resolved = path.resolve(exportPath);
  let drafts;
  try {
    drafts = generateBoxDrafts(count, pepper);
  } catch (error) {
    databaseHint(error);
  }

  let html: string;
  try {
    html = await renderPrintableHtml({
      codes: drafts.map((draft) => ({ id: draft.id, code: draft.code })),
      baseOrigin,
    });
  } catch (error) {
    if (error instanceof BoxCodeError && error.reason === "base_url") {
      fail("base-url must be the play origin, with no path. Allowed: https://play.tappen.app, http://play.tappen.local:3001, http://localhost:3001, http://127.0.0.1:3001.");
    }
    fail("Could not render the printable file.");
  }

  let tmp: string;
  try {
    tmp = await writeTempExport(resolved, html);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "export_exists") fail("Export file already exists. Choose a new path.");
    if (message === "export_extension") fail("Printable export must be an .html file.");
    if (message === "export_env" || message === "export_location") {
      fail("Refusing to write the export into git, node_modules, or an env file.");
    }
    fail("Could not write the export. Create the destination directory first.");
  }

  const db = new PrismaClient();
  try {
    await commitBoxDrafts(createPrismaBoxStore(db), {
      drafts,
      homeOrderId: orderId,
      unassigned,
    });
  } catch (error) {
    await fs.promises.unlink(tmp).catch(() => undefined);
    databaseHint(error);
  } finally {
    await db.$disconnect();
  }

  try {
    await publishTempExport(tmp, resolved);
  } catch {
    fail(`Codes were stored, but the printable file could not be moved. It is still at ${tmp}`);
  }

  console.log(`Wrote ${count} printable box codes to ${resolved}`);
}

async function voidIssued(argv: string[]): Promise<void> {
  const orderId = readFlag(argv, "--order");
  if (!orderId) fail("void-issued requires --order <homeOrderId>.");
  pepperFromEnv();
  const db = new PrismaClient();
  try {
    const count = await voidIssuedBoxCodes(createPrismaBoxStore(db), orderId, new Date());
    console.log(`Voided ${count} unredeemed codes for order ${orderId}. Redeemed codes were left in place.`);
  } catch (error) {
    databaseHint(error);
  } finally {
    await db.$disconnect();
  }
}

const argv = process.argv.slice(2);
const command = argv[0];
if (!command || command === "--help" || command === "-h") usage();

if (command === "issue") {
  issue(argv).catch((error: unknown) => {
    databaseHint(error);
  });
} else if (command === "void-issued") {
  voidIssued(argv).catch((error: unknown) => {
    databaseHint(error);
  });
} else {
  fail("Unknown command. Use issue or void-issued.");
}
