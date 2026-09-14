#!/usr/bin/env node
/**
 * Register account workers.dev subdomain (one-time).
 * Usage: node scripts/register-workers-subdomain.mjs [subdomain]
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const subdomain = process.argv[2] ?? "tcawg";
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "3431221893fa5322f43245c40d1c2abd";

function readOAuthToken() {
  const candidates = [
    join(homedir(), "AppData/Roaming/xdg.config/.wrangler/config/default.toml"),
    join(homedir(), ".config/.wrangler/config/default.toml"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    const match = content.match(/^oauth_token\s*=\s*"([^"]+)"/m);
    if (match) return match[1];
  }
  throw new Error("Run `npx wrangler login` first.");
}

const token = readOAuthToken();
const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subdomain }),
  },
);

const payload = await response.json();
if (!response.ok || !payload.success) {
  console.error("Failed to register subdomain:", JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(`Registered workers.dev subdomain: ${payload.result.subdomain}`);
console.log(`Worker URL will be: https://world-travel-committee.${payload.result.subdomain}.workers.dev`);
