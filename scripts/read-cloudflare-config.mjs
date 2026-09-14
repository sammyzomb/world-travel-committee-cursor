import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(root, "cloudflare.json");

export function readCloudflareConfig() {
  if (!existsSync(configPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(configPath, "utf8"));
  } catch {
    console.warn("cloudflare.json exists but could not be parsed.");
    return {};
  }
}

export function requireCloudflareD1Config() {
  const config = readCloudflareConfig();
  if (!config.d1DatabaseId) {
    console.error(
      "Missing cloudflare.json with d1DatabaseId.\n" +
        "Run: npm run db:create\n" +
        "Or copy cloudflare.json.example → cloudflare.json and fill in your D1 database_id.",
    );
    process.exit(1);
  }
  return config;
}
