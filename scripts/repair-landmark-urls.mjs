import { writeFileSync } from "node:fs";
import { landmarkImages } from "../lib/landmark-images.ts";

function toUploadUrl(thumburl) {
  if (!thumburl) return null;
  const clean = thumburl.split("?")[0];
  return clean.replace("thumb.wikimedia.org", "upload.wikimedia.org");
}

async function urlOk(url) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "WorldTravelCommittee/1.0 (image repair)" },
      signal: AbortSignal.timeout(20000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function resolveImage(search) {
  const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrsearch", search);
  endpoint.searchParams.set("gsrnamespace", "6");
  endpoint.searchParams.set("prop", "imageinfo");
  endpoint.searchParams.set("iiprop", "url");
  endpoint.searchParams.set("iiurlwidth", "960");
  endpoint.searchParams.set("format", "json");
  const response = await fetch(endpoint, {
    headers: { "User-Agent": "WorldTravelCommittee/1.0 (image repair)" },
  });
  if (!response.ok) throw new Error(`API ${response.status}`);
  const payload = await response.json();
  const pages = Object.values(payload.query?.pages ?? {});
  const first = pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0];
  const info = first?.imageinfo?.[0];
  const url = toUploadUrl(info?.thumburl) ?? info?.url?.split("?")[0];
  if (!url) throw new Error("no url");
  const title = first?.title?.replace(/^File:/, "") ?? search;
  return { url, title };
}

const entries = Object.entries(landmarkImages);
const broken = [];
const ok = [];

for (const [name, image] of entries) {
  if (await urlOk(image.url)) {
    ok.push(name);
  } else {
    broken.push({ name, url: image.url });
  }
  await new Promise((r) => setTimeout(r, 400));
}

console.log("OK:", ok.length, "Broken:", broken.length);
broken.forEach((item) => console.log("BROKEN", item.name));

const repaired = { ...landmarkImages };
for (const item of broken) {
  try {
    const image = await resolveImage(item.name);
    if (!(await urlOk(image.url))) throw new Error("resolved url still broken");
    repaired[item.name] = {
      url: image.url,
      credit: `Wikimedia Commons / ${image.title}`,
    };
    console.log("FIXED", item.name, "->", image.url);
  } catch (error) {
    console.log("STILL BROKEN", item.name, error);
  }
  await new Promise((r) => setTimeout(r, 1200));
}

const baseKeys = new Set(
  Object.keys(landmarkImages).filter((key) => !key.includes("古城") && !key.includes("國家公園")),
);
// split output: heritage vs base by checking original heritage file keys
import { heritageLandmarkImages } from "../lib/landmark-images-heritage.ts";
const heritageKeys = new Set(Object.keys(heritageLandmarkImages));

const baseOut = {};
const heritageOut = {};
for (const [name, image] of Object.entries(repaired)) {
  if (heritageKeys.has(name)) heritageOut[name] = image;
  else baseOut[name] = image;
}

function emitObject(name, images) {
  const lines = Object.entries(images).map(([key, image]) => {
    return `  ${JSON.stringify(key)}: {\n    url: ${JSON.stringify(image.url)},\n    credit: ${JSON.stringify(image.credit)},\n  },`;
  });
  return lines.join("\n");
}

const heritageFile = `type HeritageLandmarkImage = {
  url: string;
  credit: string;
};

/** 世界遺產擴充題庫用地標圖（Wikimedia Commons，由 scripts/repair-landmark-urls.mjs 驗證）。 */
export const heritageLandmarkImages: Record<string, HeritageLandmarkImage> = {
${emitObject("heritage", heritageOut)}
};
`;

const baseHeader = `import { heritageLandmarkImages } from "./landmark-images-heritage";

/** Wikimedia Commons 免費圖片，可商用（依各檔案 CC 授權）。 */
export type LandmarkImage = {
  url: string;
  credit: string;
};

const baseLandmarkImages: Record<string, LandmarkImage> = {
${emitObject("base", baseOut)}
};

export const landmarkImages: Record<string, LandmarkImage> = {
  ...baseLandmarkImages,
  ...heritageLandmarkImages,
};

export function getLandmarkImage(landmark: string): LandmarkImage | undefined {
  return landmarkImages[landmark];
}

/** 經本站代理載入，避免瀏覽器直接連 Wikimedia 失敗。 */
export function getLandmarkImageSrc(landmark: string): string | undefined {
  if (!landmarkImages[landmark]) return undefined;
  return \`/api/landmark-image?name=\${encodeURIComponent(landmark)}\`;
}
`;

writeFileSync(new URL("../lib/landmark-images-heritage.ts", import.meta.url), heritageFile, "utf8");
writeFileSync(new URL("../lib/landmark-images.ts", import.meta.url), baseHeader, "utf8");
console.log("Wrote repaired landmark image files.");
