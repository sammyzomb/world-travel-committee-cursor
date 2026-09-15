#!/usr/bin/env node
/**
 * 從 NAS 匯入地標圖至 public/landmarks，並更新 data/landmark-static-manifest.json。
 *
 * 用法：
 *   npm run scan:nas-landmarks
 *   npm run import:landmark-images:nas
 *   npm run import:landmark-images:nas -- --dry-run
 *   npm run import:landmark-images:nas -- --landmark 富士山 --file "\\\\192.168.3.3\\【行程總彙】\\path\\to\\photo.jpg"
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { landmarkImages } from "../lib/landmark-images.ts";
import {
  IMAGE_EXTENSIONS,
  loadManifest,
  outputDir,
  projectRoot,
  publicPathForLandmark,
  resolvePublicFile,
  saveManifest,
} from "./lib/landmark-static-manifest.mjs";

const mapPath = resolve(projectRoot, "data/nas-landmark-map.json");
const scanOutputPath = resolve(projectRoot, "data/nas-landmark-scan.json");
const filesCachePath = resolve(projectRoot, "data/nas-landmark-files.json");
const aliasesPath = resolve(projectRoot, "data/nas-landmark-aliases.json");

const STRIP_SUFFIXES = [
  "國家森林公園",
  "國家公園",
  "歷史中心",
  "国家公园",
  "世界遺產",
  "風車群",
  "紀念公園",
  "紀念碑",
  "大教堂",
  "清真寺",
  "博物館",
  "美術館",
  "競技場",
  "神廟",
  "皇宮",
  "鹽礦",
  "盐矿",
  "瀑布",
  "群島",
  "廣場",
  "广场",
  "大橋",
  "山口",
  "古城",
  "教堂",
  "鐵塔",
  "沙漠",
  "冰川",
  "花園",
  "谷地",
  "沙漠",
];

const STOP_TOKENS = new Set([
  "古城",
  "公園",
  "博物館",
  "教堂",
  "清真寺",
  "國家",
  "世界",
  "旅遊",
  "中心",
  "廣場",
  "群島",
  "山",
  "湖",
  "谷",
  "峰",
  "島",
]);

function parseArgs(argv) {
  const options = {
    dryRun: false,
    scanOnly: false,
    suggestOnly: false,
    indexOnly: false,
    rematchOnly: false,
    fullScan: false,
    rescan: false,
    nasRoot: null,
    mapFile: mapPath,
    landmark: null,
    file: null,
    limit: 5000,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--scan") options.scanOnly = true;
    else if (arg === "--suggest") options.suggestOnly = true;
    else if (arg === "--index-only") options.indexOnly = true;
    else if (arg === "--rematch") options.rematchOnly = true;
    else if (arg === "--full-scan") options.fullScan = true;
    else if (arg === "--rescan") options.rescan = true;
    else if (arg === "--nas-root") options.nasRoot = argv[++index];
    else if (arg === "--map") options.mapFile = resolve(projectRoot, argv[++index]);
    else if (arg === "--landmark") options.landmark = argv[++index];
    else if (arg === "--file") options.file = argv[++index];
    else if (arg === "--limit") options.limit = Number(argv[++index]);
  }
  return options;
}

function loadMap(options) {
  const map = JSON.parse(readFileSync(options.mapFile, "utf8"));
  if (options.nasRoot) map.nasRoot = options.nasRoot;
  return map;
}

function loadAliasMap() {
  if (!existsSync(aliasesPath)) return {};
  try {
    return JSON.parse(readFileSync(aliasesPath, "utf8"));
  } catch {
    return {};
  }
}

function loadFilesCache() {
  if (!existsSync(filesCachePath)) return null;
  try {
    const payload = JSON.parse(readFileSync(filesCachePath, "utf8"));
    if (!Array.isArray(payload.files) || payload.files.length === 0) return null;
    const files = payload.files.filter((file) => existsSync(file));
    return files.length > 0 ? files : null;
  } catch {
    return null;
  }
}

function saveFilesCache(map, files) {
  const payload = {
    generatedAt: new Date().toISOString(),
    nasRoot: map.nasRoot,
    scannedRoots: collectScanRoots(map),
    fileCount: files.length,
    files,
  };
  writeFileSync(filesCachePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function loadScanCandidates() {
  if (!existsSync(scanOutputPath)) return null;
  const report = JSON.parse(readFileSync(scanOutputPath, "utf8"));
  if (!Array.isArray(report.suggestions)) return null;
  const candidates = new Map();
  for (const item of report.suggestions) {
    if (item.status === "candidate" && item.sourcePath) {
      candidates.set(item.landmark, item.sourcePath);
    }
  }
  return candidates.size > 0 ? candidates : null;
}

function normalizeToken(value) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function resolveNasPath(map, entry) {
  if (entry.absolutePath) return entry.absolutePath;
  if (!entry.relativePath) return null;
  return join(map.nasRoot, entry.relativePath);
}

function walkImages(rootDir, maxDepth, maxFiles, depth = 0, results = []) {
  if (depth > maxDepth || results.length >= maxFiles) return results;
  let entries;
  try {
    entries = readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      walkImages(fullPath, maxDepth, maxFiles, depth + 1, results);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;
    results.push(fullPath);
    if (results.length >= maxFiles) return results;
  }
  return results;
}

function collectScanRoots(map) {
  const roots = Array.isArray(map.scanSubdirs) ? map.scanSubdirs.filter(Boolean) : [];
  if (roots.length === 0) return [map.nasRoot];
  return roots.map((relative) =>
    relative.includes(":\\") || relative.startsWith("\\\\") ? relative : join(map.nasRoot, relative),
  );
}

function buildImageIndex(files) {
  const byBasename = new Map();
  for (const file of files) {
    const base = basename(file, extname(file));
    const normBase = normalizeToken(base);
    if (!byBasename.has(normBase)) byBasename.set(normBase, []);
    byBasename.get(normBase).push(file);
  }
  return { byBasename, files };
}

function generateSearchTokens(landmark, aliasMap, minTokenLength = 3) {
  const tokens = new Set();
  const add = (value) => {
    const token = normalizeToken(value);
    if (token.length < minTokenLength) return;
    if (STOP_TOKENS.has(token)) return;
    tokens.add(token);
  };

  add(landmark);
  for (const alias of aliasMap[landmark] ?? []) add(alias);

  let core = landmark;
  for (const suffix of STRIP_SUFFIXES) {
    if (core.endsWith(suffix) && core.length > suffix.length + 1) {
      add(core.slice(0, -suffix.length));
      core = core.slice(0, -suffix.length);
    }
  }

  for (const part of landmark.split(/[・、/\\+\s]+/)) {
    if (part.length >= minTokenLength) add(part);
  }

  return [...tokens].sort((left, right) => right.length - left.length);
}

function buildLandmarkTokenMap(landmarks, aliasMap, minTokenLength = 3) {
  const tokenMap = new Map();
  for (const landmark of landmarks) {
    tokenMap.set(landmark, generateSearchTokens(landmark, aliasMap, minTokenLength));
  }
  return tokenMap;
}

function buildPathContainsIndex(
  landmarkTokenMap,
  files,
  minTokenLength = 3,
  maxCandidatesPerLandmark = 80,
) {
  const index = new Map([...landmarkTokenMap.keys()].map((landmark) => [landmark, []]));
  for (const file of files) {
    const normPath = normalizeToken(file);
    const normBase = normalizeToken(basename(file, extname(file)));
    for (const [landmark, tokens] of landmarkTokenMap) {
      const bucket = index.get(landmark);
      if (bucket.length >= maxCandidatesPerLandmark) continue;
      for (const token of tokens) {
        if (token.length < minTokenLength) continue;
        if (normPath.includes(token) || normBase.includes(token)) {
          bucket.push(file);
          break;
        }
      }
    }
  }
  return index;
}

function findPathContainsMatches(landmark, pathContainsIndex) {
  return pathContainsIndex?.get(landmark) ?? [];
}

function scoreCandidate(tokens, filePath) {
  const normPath = normalizeToken(filePath);
  const normBase = normalizeToken(basename(filePath, extname(filePath)));
  let score = 0;
  for (const token of tokens) {
    if (normBase.includes(token)) score += token.length * 4;
    else if (normPath.includes(token)) score += token.length;
  }
  return score;
}

function pickBestCandidate(landmark, candidates, tokens) {
  if (!candidates?.length) return null;
  const searchTokens = tokens ?? [normalizeToken(landmark)];
  const ranked = [...new Set(candidates)].sort((left, right) => {
    const leftScore = scoreCandidate(searchTokens, left);
    const rightScore = scoreCandidate(searchTokens, right);
    if (leftScore !== rightScore) return rightScore - leftScore;
    return statSync(right).size - statSync(left).size;
  });
  return ranked[0];
}

function resolveSourcePath(map, landmark, autoIndex, pathContainsIndex, landmarkTokenMap) {
  const manual = map.entries?.[landmark];
  if (manual) {
    const resolved = resolveNasPath(map, manual);
    if (resolved && existsSync(resolved)) return { path: resolved, via: "manual", credit: manual.credit };
  }

  if (!map.autoMatch?.enabled || !autoIndex) return null;

  const tokens =
    landmarkTokenMap?.get(landmark) ??
    generateSearchTokens(landmark, loadAliasMap(), map.autoMatch?.minTokenLength ?? 3);
  if (map.autoMatch.matchBasename) {
    const basenameCandidates = [];
    for (const token of tokens) {
      const bucket = autoIndex.byBasename.get(token);
      if (bucket) basenameCandidates.push(...bucket);
    }
    const fromBase = pickBestCandidate(landmark, basenameCandidates, tokens);
    if (fromBase) return { path: fromBase, via: "basename", credit: map.defaults?.credit };
  }
  if (map.autoMatch.matchPathContains && pathContainsIndex) {
    const fromPath = pickBestCandidate(
      landmark,
      findPathContainsMatches(landmark, pathContainsIndex),
      tokens,
    );
    if (fromPath) return { path: fromPath, via: "path-contains", credit: map.defaults?.credit };
  }
  return null;
}

function importLandmark(landmark, sourcePath, credit, previousEntry, dryRun) {
  const publicPath = publicPathForLandmark(landmark, sourcePath);
  const targetPath = resolvePublicFile(publicPath);
  const sourceStat = statSync(sourcePath);

  if (
    previousEntry?.path === publicPath &&
    previousEntry?.source === "nas" &&
    previousEntry?.sourcePath === sourcePath &&
    previousEntry?.bytes === sourceStat.size &&
    existsSync(targetPath)
  ) {
    return { landmark, entry: previousEntry, skipped: true };
  }

  if (!dryRun) {
    copyFileSync(sourcePath, targetPath);
  }

  const entry = {
    path: publicPath,
    source: "nas",
    sourcePath,
    sourceUrl: sourcePath,
    credit: credit ?? "行程總彙圖庫",
    bytes: sourceStat.size,
    failed: false,
  };
  return { landmark, entry, skipped: false, dryRun };
}

function writeScanReport(map, files, autoIndex, aliasMap, existingPathContainsIndex = null) {
  const landmarks = Object.keys(landmarkImages);
  const minTokenLength = map.autoMatch?.minTokenLength ?? 3;
  const landmarkTokenMap = buildLandmarkTokenMap(landmarks, aliasMap, minTokenLength);
  const pathContainsIndex =
    existingPathContainsIndex ??
    (map.autoMatch?.matchPathContains
      ? buildPathContainsIndex(
          landmarkTokenMap,
          files,
          minTokenLength,
          map.autoMatch?.maxCandidatesPerLandmark ?? 80,
        )
      : null);
  const suggestions = [];
  for (const landmark of landmarks) {
    const resolved = resolveSourcePath(map, landmark, autoIndex, pathContainsIndex, landmarkTokenMap);
    if (!resolved) {
      suggestions.push({ landmark, status: "missing" });
      continue;
    }
    suggestions.push({
      landmark,
      status: "candidate",
      via: resolved.via,
      sourcePath: resolved.path,
      relativePath: resolved.path.startsWith(map.nasRoot)
        ? resolved.path.slice(map.nasRoot.length).replace(/^\\/, "")
        : null,
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    nasRoot: map.nasRoot,
    scannedFiles: files.length,
    suggestions,
    manualEntries: map.entries ?? {},
  };
  writeFileSync(scanOutputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  if (files.length > 0) saveFilesCache(map, files);
  return payload;
}

function scanNasFiles(map, scanRoots, maxDepth, maxFilesPerSubdir) {
  const files = [];
  console.log(
    `Scanning NAS images (${scanRoots.length} roots, maxDepth=${maxDepth}, maxFilesPerSubdir=${maxFilesPerSubdir}) ...`,
  );
  for (const scanRoot of scanRoots) {
    const batch = [];
    console.log(`  root: ${scanRoot}`);
    walkImages(scanRoot, maxDepth, maxFilesPerSubdir, 0, batch);
    files.push(...batch);
    console.log(`    +${batch.length} files`);
  }
  console.log(`Found ${files.length} image files total.`);
  return files;
}

mkdirSync(outputDir, { recursive: true });

const options = parseArgs(process.argv.slice(2));
const map = loadMap(options);
const aliasMap = loadAliasMap();

if (!existsSync(map.nasRoot)) {
  console.error(`NAS root not found: ${map.nasRoot}`);
  process.exit(1);
}

const maxDepth = map.autoMatch?.maxDepth ?? 5;
const maxFilesPerSubdir = map.autoMatch?.maxFilesPerSubdir ?? map.autoMatch?.maxFiles ?? 2000;
const configuredSubdirs = Array.isArray(map.scanSubdirs) ? map.scanSubdirs.filter(Boolean) : [];
const scanRoots = collectScanRoots(map);
const files = [];

const singleImport = Boolean(options.landmark && options.file);
const scanCandidates =
  !options.rescan &&
  !options.scanOnly &&
  !options.rematchOnly &&
  !options.indexOnly &&
  !singleImport
    ? loadScanCandidates()
    : null;

if (configuredSubdirs.length === 0 && !options.fullScan && (options.scanOnly || options.suggestOnly)) {
  console.log(`Listing top-level folders under ${map.nasRoot} (configure scanSubdirs to scan deeper) ...`);
  let topLevel = [];
  try {
    topLevel = readdirSync(map.nasRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    console.error(`Unable to read NAS root: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
  const payload = {
    generatedAt: new Date().toISOString(),
    nasRoot: map.nasRoot,
    hint: "將要掃描的子資料夾填入 data/nas-landmark-map.json 的 scanSubdirs，或執行 --full-scan",
    topLevelFolders: topLevel,
    suggestions: [],
  };
  writeFileSync(scanOutputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${scanOutputPath} (${topLevel.length} folders).`);
  process.exit(0);
}

let autoIndex = { byBasename: new Map(), files: [] };
const landmarks = Object.keys(landmarkImages);
const minTokenLength = map.autoMatch?.minTokenLength ?? 3;
const landmarkTokenMap = buildLandmarkTokenMap(landmarks, aliasMap, minTokenLength);

if (options.rematchOnly) {
  const cachedFiles = loadFilesCache();
  if (!cachedFiles) {
    console.error(`No file cache at ${filesCachePath}. Run npm run index:nas-landmark-files first.`);
    process.exit(1);
  }
  console.log(`Rematching ${landmarks.length} landmarks against ${cachedFiles.length} cached files ...`);
  files.push(...cachedFiles);
  autoIndex = buildImageIndex(files);
} else if (!singleImport && !scanCandidates) {
  files.push(...scanNasFiles(map, scanRoots, maxDepth, maxFilesPerSubdir));
  autoIndex = buildImageIndex(files);
  if (files.length > 0) saveFilesCache(map, files);
} else if (scanCandidates) {
  console.log(`Using ${scanCandidates.size} candidates from ${scanOutputPath} (pass --rescan to refresh).`);
}

let pathContainsIndex = null;
if (!singleImport && !scanCandidates && map.autoMatch?.matchPathContains && files.length > 0) {
  console.log("Building landmark path index ...");
  pathContainsIndex = buildPathContainsIndex(
    landmarkTokenMap,
    files,
    minTokenLength,
    map.autoMatch?.maxCandidatesPerLandmark ?? 80,
  );
}

if (options.indexOnly) {
  console.log(`Wrote ${filesCachePath} (${files.length} files).`);
  process.exit(0);
}

if (options.scanOnly || options.suggestOnly || options.rematchOnly) {
  const report = writeScanReport(map, files, autoIndex, aliasMap, pathContainsIndex);
  const candidates = report.suggestions.filter((item) => item.status === "candidate").length;
  const missing = report.suggestions.length - candidates;
  console.log(`Wrote ${scanOutputPath}`);
  console.log(`Candidates: ${candidates}, missing: ${missing}`);
  process.exit(0);
}

if (options.rescan && files.length > 0) {
  const report = writeScanReport(map, files, autoIndex, aliasMap, pathContainsIndex);
  const candidates = report.suggestions.filter((item) => item.status === "candidate").length;
  const missing = report.suggestions.length - candidates;
  console.log(`Wrote ${scanOutputPath} (candidates: ${candidates}, missing: ${missing})`);
}

const previous = loadManifest();
const entries = { ...previous.entries };
let imported = 0;
let skipped = 0;
const failures = [];

if (options.landmark && options.file) {
  if (!landmarkImages[options.landmark]) {
    console.error(`Unknown landmark: ${options.landmark}`);
    process.exit(1);
  }
  if (!existsSync(options.file)) {
    console.error(`File not found: ${options.file}`);
    process.exit(1);
  }
  const result = importLandmark(
    options.landmark,
    options.file,
    map.defaults?.credit,
    previous.entries[options.landmark],
    options.dryRun,
  );
  entries[options.landmark] = result.entry;
  if (result.skipped) skipped += 1;
  else imported += 1;
  console.log(`${options.dryRun ? "[dry-run] " : ""}${options.landmark} -> ${result.entry.path}`);
} else {
  const landmarks = Object.keys(landmarkImages);
  for (let index = 0; index < landmarks.length; index += 1) {
    const landmark = landmarks[index];
    const manual = map.entries?.[landmark];
    const manualPath = manual ? resolveNasPath(map, manual) : null;
    const cachedPath = scanCandidates?.get(landmark);
    const resolved =
      manualPath && existsSync(manualPath)
        ? { path: manualPath, via: "manual", credit: manual.credit ?? map.defaults?.credit }
        : cachedPath && existsSync(cachedPath)
          ? { path: cachedPath, via: "scan-cache", credit: map.defaults?.credit }
          : resolveSourcePath(map, landmark, autoIndex, pathContainsIndex, landmarkTokenMap);
    if (!resolved) {
      failures.push({ landmark, error: "no NAS mapping or auto-match candidate" });
      continue;
    }
    try {
      const result = importLandmark(
        landmark,
        resolved.path,
        resolved.credit,
        previous.entries[landmark],
        options.dryRun,
      );
      entries[landmark] = result.entry;
      if (result.skipped) {
        skipped += 1;
        continue;
      }
      imported += 1;
      console.log(
        `[${index + 1}/${landmarks.length}] ${options.dryRun ? "[dry-run] " : ""}${landmark} (${resolved.via}) -> ${result.entry.path}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ landmark, error: message });
      console.error(`[${index + 1}/${landmarks.length}] FAIL ${landmark}: ${message}`);
    }
  }
}

if (!options.dryRun) {
  saveManifest(entries);
}

console.log(`Done: imported ${imported}, skipped ${skipped}, unresolved ${failures.length}`);
if (failures.length > 0) {
  console.log("Tip: run `npm run scan:nas-landmarks` and edit data/nas-landmark-map.json entries.");
}
