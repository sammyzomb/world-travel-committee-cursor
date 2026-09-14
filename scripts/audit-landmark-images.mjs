import { warmupQuestions, allQuestions } from "../lib/questions.ts";
import { landmarkImages } from "../lib/landmark-images.ts";

const all = [...warmupQuestions, ...allQuestions].filter((q) => q.auditStatus === "approved");
const usedLabels = new Set();
const mapFallback = new Set();
const noVisual = [];

for (const q of all) {
  if (!q.visual) {
    noVisual.push({ id: q.id, q: q.q });
    continue;
  }
  usedLabels.add(q.visual.label);
  if (q.visual.type === "map") mapFallback.add(q.visual.label);
}

const missingKeys = [...mapFallback].filter((label) => !landmarkImages[label]).sort();
const orphanKeys = Object.keys(landmarkImages).filter((key) => !usedLabels.has(key)).sort();

console.log("Approved questions:", all.length);
console.log("No visual:", noVisual.length);
console.log("Map fallback (no photo):", mapFallback.size);
console.log("Missing landmarkImages keys:", missingKeys.length);
missingKeys.forEach((key) => console.log("  MISSING", key));

const entries = Object.entries(landmarkImages);
const broken = [];
const ok = [];

for (const [name, image] of entries) {
  try {
    const response = await fetch(image.url, {
      method: "HEAD",
      headers: { "User-Agent": "WorldTravelCommittee/1.0 (image audit)" },
      signal: AbortSignal.timeout(15000),
    });
    if (response.ok) ok.push(name);
    else broken.push({ name, status: response.status, url: image.url });
  } catch (error) {
    broken.push({ name, status: "error", url: image.url, message: String(error) });
  }
  await new Promise((resolve) => setTimeout(resolve, 120));
}

console.log("\nImage URLs OK:", ok.length);
console.log("Image URLs broken:", broken.length);
broken.forEach((item) => console.log(`  BROKEN ${item.status} ${item.name}`));

if (orphanKeys.length) {
  console.log("\nUnused landmark keys:", orphanKeys.length);
}
