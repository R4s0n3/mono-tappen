import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import QRCode from "qrcode";

import { boxRedeemUrl } from "@/server/home/box-code";

export type PrintableCode = {
  id: string;
  code: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function assertExportPath(filePath: string): string {
  const resolved = path.resolve(filePath);
  if (!resolved.endsWith(".html")) {
    throw new Error("export_extension");
  }
  const base = path.basename(resolved);
  if (base.startsWith(".env") || base === ".env") {
    throw new Error("export_env");
  }
  const parts = resolved.split(path.sep);
  if (parts.includes(".git") || parts.includes("node_modules")) {
    throw new Error("export_location");
  }
  return resolved;
}

export async function renderPrintableHtml(input: {
  codes: readonly PrintableCode[];
  baseOrigin: string;
}): Promise<string> {
  const cards = await Promise.all(
    input.codes.map(async (entry, index) => {
      const url = boxRedeemUrl(input.baseOrigin, entry.code);
      const svg = await QRCode.toString(url, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#14151f", light: "#ffffff" },
      });
      return `<article class="card">
        <p class="kicker">Tappen Home · box ${index + 1} of ${input.codes.length}</p>
        <h1>One account</h1>
        <p>Scan, sign in, and confirm the account. This permanently unlocks Tappen Premium and the Premium card skin for that account.</p>
        <div class="qr">${svg}</div>
        <p class="url">${escapeHtml(url)}</p>
        <p class="id">Code id ${escapeHtml(entry.id)}</p>
      </article>`;
    }),
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Tappen Home box codes</title>
  <style>
    body { margin: 0; font-family: sans-serif; color: #14151f; }
    .card { min-height: 100vh; box-sizing: border-box; padding: 18mm; page-break-after: always; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; }
    .kicker { letter-spacing: 0.14em; text-transform: uppercase; font-size: 12px; }
    h1 { font-size: 42px; margin: 0; }
    .qr svg { width: 72mm; height: 72mm; }
    .url { font-size: 12px; word-break: break-all; max-width: 140mm; }
    .id { color: #555; font-size: 12px; }
  </style>
</head>
<body>
  <p class="card">Secret print file. One code per physical box. Delete this file after it has been printed. The database stores only a hash.</p>
  ${cards.join("\n")}
</body>
</html>`;
}

export async function writeTempExport(finalPath: string, html: string): Promise<string> {
  const resolved = assertExportPath(finalPath);
  const dir = path.dirname(resolved);
  await fs.promises.access(dir);
  try {
    await fs.promises.access(resolved);
    throw new Error("export_exists");
  } catch (error) {
    if (error instanceof Error && error.message === "export_exists") throw error;
  }
  const tmp = path.join(dir, `.${path.basename(resolved)}.${crypto.randomUUID()}.tmp`);
  await fs.promises.writeFile(tmp, html, { encoding: "utf8", mode: 0o600, flag: "wx" });
  return tmp;
}

export async function publishTempExport(tmpPath: string, finalPath: string): Promise<void> {
  const resolved = assertExportPath(finalPath);
  await fs.promises.rename(tmpPath, resolved);
  await fs.promises.chmod(resolved, 0o600);
}
