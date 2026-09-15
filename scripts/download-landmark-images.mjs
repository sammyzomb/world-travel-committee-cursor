#!/usr/bin/env node
/**
 * 建置前下載地標圖至 public/landmarks，並更新 data/landmark-static-manifest.json。
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { landmarkImages } from "../lib/landmark-images.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = resolve(root, "public/landmarks");
const manifestPath = resolve(root, "data/landmark-static-manifest.json");
const USER_AGENT = "WorldTravelCommittee/1.0 (landmark image download)";
const REQUEST_DELAY_MS = 1200;
const MAX_ATTEMPTS = 3;

function fileKey(landmark) {
  return createHash("sha256").update(landmark, "utf8").digest("hex").slice(0, 12);
}

function extensionFromContentType(contentType, url) {
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("webp")) return ".webp";
  if (contentType?.includes("gif")) return ".gif";
  const fromUrl = extname(new URL(url).pathname).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(fromUrl)) return fromUrl;
  return ".jpg";
}

function loadManifest() {
  if (!existsSync(manifestPath)) {
    return { version: 1, generatedAt: null, entries: {} };
  }
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function sleep(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function fetchWithRetry(url) {
  let lastError = "unknown";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(30000),
      });
      if (response.ok) return response;
      lastError = `HTTP ${response.status}`;
      if (response.status === 429 || response.status === 503) {
        await sleep(3000 * attempt);
        continue;
      }
      if (response.status === 404 || response.status === 410) {
        throw new Error(lastError);
      }
      throw new Error(lastError);
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < MAX_ATTEMPTS) {
        await sleep(1500 * attempt);
        continue;
      }
    }
  }
  throw new Error(lastError);
}

async function downloadOne(landmark, image, previous) {
  const existing = previous?.entries?.[landmark];
  if (
    !forceRedownload &&
    existing?.sourceUrl === image.url &&
    existing?.failed &&
    !existing?.path
  ) {
    return { landmark, entry: existing, skipped: true };
  }
  if (
    existing?.sourceUrl === image.url &&
    existing?.path &&
    existsSync(resolve(root, "public", existing.path.replace(/^\//, "")))
  ) {
    return { landmark, entry: existing, skipped: true };
  }

  const response = await fetchWithRetry(image.url);
  const buffer = Buffer.from(await response.arrayBuffer());
  const ext = extensionFromContentType(response.headers.get("content-type"), image.url);
  const filename = `${fileKey(landmark)}${ext}`;
  const filePath = resolve(outputDir, filename);
  writeFileSync(filePath, buffer);

  const entry = {
    path: `/landmarks/${filename}`,
    sourceUrl: image.url,
    credit: image.credit,
    bytes: buffer.length,
  };
  return { landmark, entry, skipped: false };
}

if (process.env.LANDMARK_DOWNLOAD_SKIP === "1") {
  console.log("Skipping landmark download (LANDMARK_DOWNLOAD_SKIP=1).");
  process.exit(0);
}

mkdirSync(outputDir, { recursive: true });
const previous = loadManifest();
const items = Object.entries(landmarkImages);
const startedAt = Date.now();
const forceRedownload = process.env.LANDMARK_DOWNLOAD_FORCE === "1";

console.log(`Downloading ${items.length} landmark images to public/landmarks ...`);

const entries = { ...previous.entries };
const failures = [];
let downloaded = 0;
let skipped = 0;

for (let index = 0; index < items.length; index += 1) {
  const [landmark, image] = items[index];
  try {
    const result = await downloadOne(landmark, image, previous);
    entries[result.landmark] = result.entry;
    if (result.skipped) {
      skipped += 1;
      continue;
    }
    downloaded += 1;
    console.log(`[${index + 1}/${items.length}] ${landmark}`);
    await sleep(REQUEST_DELAY_MS);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({ landmark, error: message });
    console.error(`[${index + 1}/${items.length}] FAIL ${landmark}: ${message}`);
    entries[landmark] = {
      sourceUrl: image.url,
      credit: image.credit,
      failed: true,
      lastError: message,
    };
    if (previous.entries?.[landmark]?.path) {
      entries[landmark] = previous.entries[landmark];
    }
    await sleep(REQUEST_DELAY_MS);
  }
}

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  entries,
};

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`Done in ${elapsed}s: downloaded ${downloaded}, skipped ${skipped}, failed ${failures.length}`);

if (failures.length > 0) {
  console.warn("Some landmark images failed; missing entries will use /api/landmark-image fallback.");
}
