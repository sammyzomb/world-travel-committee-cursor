#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "3431221893fa5322f43245c40d1c2abd";

function readOAuthToken() {
  const path = join(homedir(), "AppData/Roaming/xdg.config/.wrangler/config/default.toml");
  if (!existsSync(path)) throw new Error("Not logged in");
  const match = readFileSync(path, "utf8").match(/^oauth_token\s*=\s*"([^"]+)"/m);
  if (!match) throw new Error("No oauth token");
  return match[1];
}

const token = readOAuthToken();
const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/subdomain`,
  { headers: { Authorization: `Bearer ${token}` } },
);
const payload = await response.json();
console.log(JSON.stringify(payload, null, 2));
