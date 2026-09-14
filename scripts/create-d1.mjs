#!/usr/bin/env node
/**
 * Create a Cloudflare D1 database and write cloudflare.json (local only, not committed).
 * Usage: npm run db:create
 */
import { existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { readCloudflareConfig } from "./read-cloudflare-config.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(root, "cloudflare.json");
const sitesEnv = resolve(root, "scripts/sites-env.mjs");
const wranglerBin = resolve(root, "node_modules/wrangler/bin/wrangler.js");
const dbName = process.argv[2] ?? "world-travel-committee-d1";

const existing = readCloudflareConfig();
if (existing.d1DatabaseId) {
  console.log("cloudflare.json already configured:");
  console.log(JSON.stringify(existing, null, 2));
  process.exit(0);
}

console.log(`Creating D1 database "${dbName}"...`);
const result = spawnSync(
  process.execPath,
  ["--import", pathToFileURL(sitesEnv).href, wranglerBin, "d1", "create", dbName],
  { cwd: root, encoding: "utf8" },
);
const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
console.log(output.trim());

if (result.status !== 0) {
  if (output.includes("not authenticated") || output.includes("login")) {
    console.error("\n請先登入 Cloudflare：");
    console.error("  npx wrangler login");
  }
  process.exit(result.status ?? 1);
}

const idMatch =
  output.match(/"database_id"\s*:\s*"([a-f0-9-]+)"/i) ??
  output.match(/database_id\s*=\s*([a-f0-9-]+)/i);
if (!idMatch) {
  console.error("Could not parse database_id from wrangler output.");
  process.exit(1);
}

const payload = {
  d1DatabaseName: dbName,
  d1DatabaseId: idMatch[1],
  workerName: "world-travel-committee",
};
writeFileSync(configPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`\nWrote ${configPath}`);
console.log("Next steps:");
console.log("  1. npm run build");
console.log("  2. npm run db:migrate:remote");
console.log("  3. npm run deploy:cloudflare");
