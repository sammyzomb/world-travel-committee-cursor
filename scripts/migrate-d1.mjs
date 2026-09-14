#!/usr/bin/env node
/**
 * Apply Drizzle SQL migrations to Cloudflare D1.
 * Usage:
 *   node scripts/migrate-d1.mjs --local   # local Miniflare state (default)
 *   node scripts/migrate-d1.mjs --remote  # production D1 (requires wrangler auth)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const drizzleDir = resolve(root, "drizzle");
const wranglerBin = resolve(root, "node_modules/wrangler/bin/wrangler.js");
const sitesEnv = resolve(root, "scripts/sites-env.mjs");
const wranglerConfig = resolve(root, "dist/server/wrangler.json");

const remote = process.argv.includes("--remote");
const binding = "DB";

function runMigration(filePath) {
  const args = [
    "--import",
    pathToFileURL(sitesEnv).href,
    wranglerBin,
    "d1",
    "execute",
    binding,
    remote ? "--remote" : "--local",
    "--config",
    wranglerConfig,
    "--persist-to",
    resolve(root, ".wrangler/state"),
    "--file",
    filePath,
  ];
  console.log(`Applying ${filePath} (${remote ? "remote" : "local"})...`);
  const result = spawnSync(process.execPath, args, { stdio: "pipe", cwd: root, encoding: "utf8" });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status !== 0) {
    if (output.includes("already exists")) {
      console.warn(`Skipped ${filePath} (already applied).`);
      continue;
    }
    console.error(output);
    process.exit(result.status ?? 1);
  }
  console.log(output.trim());
}

if (!existsSync(wranglerConfig)) {
  console.error("Missing dist/server/wrangler.json — run `npm run build` first.");
  process.exit(1);
}

const sqlFiles = readdirSync(drizzleDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (sqlFiles.length === 0) {
  console.error("No SQL files in drizzle/");
  process.exit(1);
}

for (const file of sqlFiles) {
  runMigration(resolve(drizzleDir, file));
}

console.log(`Applied ${sqlFiles.length} migration(s) to D1 (${remote ? "remote" : "local"}).`);
