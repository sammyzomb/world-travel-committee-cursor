import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const projectRoot = root;
export const outputDir = resolve(root, "public/landmarks");
export const manifestPath = resolve(root, "data/landmark-static-manifest.json");

export const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export function fileKey(landmark) {
  return createHash("sha256").update(landmark, "utf8").digest("hex").slice(0, 12);
}

export function loadManifest() {
  if (!existsSync(manifestPath)) {
    return { version: 1, generatedAt: null, entries: {} };
  }
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

export function saveManifest(entries) {
  mkdirSync(outputDir, { recursive: true });
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    entries,
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

export function publicPathForLandmark(landmark, sourcePath) {
  const ext = extname(sourcePath).toLowerCase();
  const safeExt = IMAGE_EXTENSIONS.has(ext) ? ext : ".jpg";
  return `/landmarks/${fileKey(landmark)}${safeExt}`;
}

export function resolvePublicFile(relativePath) {
  return resolve(root, "public", relativePath.replace(/^\//, ""));
}
