import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const dir = resolve(root, "work/landmark-repair");
const articles = JSON.parse(readFileSync(resolve(root, "data/landmark-repair-articles.json"), "utf8"));
const manifestPath = resolve(root, "data/landmark-static-manifest.json");
const sharp = createRequire(realpathSync(resolve(root, "node_modules/next/package.json")))("sharp");
const ua = "WorldTravelCommittee/1.0 (educational landmark image maintenance)";
mkdirSync(dir, { recursive: true });
function plain(value = "") { return value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(); }
async function request(url) {
  let error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await fetch(url, { headers: { "User-Agent": ua }, signal: AbortSignal.timeout(25000) });
      if (!result.ok) throw new Error(`HTTP ${result.status}: ${url}`);
      return result;
    } catch (err) {
      error = err;
      await new Promise(done => setTimeout(done, 1000 * (attempt + 1)));
    }
  }
  throw error;
}

if (process.argv.includes("--apply")) {
  const records = JSON.parse(readFileSync(resolve(dir, "candidates.json"), "utf8"));
  const approval = JSON.parse(readFileSync(resolve(dir, "visual-review.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  let applied = 0;
  for (const record of records) {
    if (!record.file || approval[record.landmark] !== true) continue;
    const output = await sharp(resolve(dir, record.file)).rotate().resize({width:1280,height:1280,fit:"inside",withoutEnlargement:true}).jpeg({quality:84}).toBuffer();
    const filename = record.file.replace(/\.[^.]+$/, ".jpg");
    writeFileSync(resolve(root, "public/landmarks", filename), output);
    const previous = manifest.entries[record.landmark] ?? {};
    manifest.entries[record.landmark] = {
      path: `/landmarks/${filename}`, sourceUrl: record.filePage, credit: `${record.provider === "unsplash" ? "Unsplash" : "Wikimedia Commons"} / ${record.artist} (${record.license}；縮圖)`,
      provider: record.provider ?? "commons", photoId: record.photoId, bytes: output.length, failed: false,
      downloadUrl: record.downloadUrl, license: record.license, licenseUrl: record.licenseUrl,
      articleUrl: record.articleUrl, imageReviewedAt: new Date().toISOString(),
      ...(previous.rejectedPhotoIds ? { rejectedPhotoIds: previous.rejectedPhotoIds } : {}),
    };
    applied++;
  }
  manifest.generatedAt = new Date().toISOString();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Applied ${applied} visually reviewed, licensed images.`);
  process.exit(0);
}

const results = [];
for (const [landmark, article] of Object.entries(articles)) {
  const cacheKey = createHash("sha256").update(landmark).digest("hex").slice(0, 12);
  const cached = resolve(dir, `${cacheKey}.json`);
  if (existsSync(cached)) {
    const prior = JSON.parse(readFileSync(cached, "utf8"));
    if (prior.file && !process.argv.includes("--refresh")) { results.push(prior); continue; }
  }
  const record = { landmark, article, articleUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(article.replaceAll(" ", "_"))}` };
  try {
    const articlePage = { html: await (await request(record.articleUrl)).text() };
    const imageTags = articlePage.html.match(/<img[^>]+>/g) ?? [];
    const imageNames = imageTags.filter(tag => tag.includes("/wikipedia/commons/") && Number(tag.match(/data-file-width="(\d+)"/)?.[1]) >= 500).map(tag => tag.match(/resource="[^"]*?File:([^"]+)"/)?.[1] ?? decodeURIComponent(tag.match(/\/wikipedia\/commons\/(?:thumb\/)?[a-f0-9]\/[a-f0-9]{2}\/([^/?"]+)/)?.[1] ?? "")).filter(Boolean);
    const selectedFiles = JSON.parse(readFileSync(resolve(root, "data/landmark-repair-files.json"), "utf8"));
    const excluded = /View_from_Bayterek|Menarag|Pavillon_Menar|Sossusvlei_Dune|Panorama_Oaxaca/i;
    const usable = imageNames.filter(name => !excluded.test(name));
    const page = { pageimage: selectedFiles[landmark] ?? usable[0] };
    if (!page.pageimage) throw new Error("No lead image on verified subject article");
    const filePage = 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(page.pageimage);
    const html = (await (await request(filePage)).text()).replaceAll('&#95;', '_');
    const license = plain(html.match(/class="licensetpl_short"[^>]*>([\s\S]*?)<\/span>/)?.[1]);
    if (!/CC BY|CC0|Public domain|PD-|^FAL$/i.test(license)) throw new Error('Unsupported license: ' + license);
    const url = html.match(/class="fullImageLink"[^>]*><a href="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&');
    if (!url) throw new Error('No original image');
    const metadata = { Artist: {value: html.match(/id="fileinfotpl_aut"[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/)?.[1] ?? 'See source file page'}, LicenseUrl: {value: plain(html.match(/class="licensetpl_link"[^>]*>([\s\S]*?)<\/span>/)?.[1])} };
    const info = {url, descriptionurl: filePage};
    let downloadUrl = info.url.split("?")[0];
    let response;
    try { response = await request(`https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(page.pageimage)}?width=960`); downloadUrl = response.url; }
    catch (err) {
      if (!info.thumburl) throw err;
      downloadUrl = info.thumburl;
      response = await request(downloadUrl);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/") || /svg/.test(contentType)) throw new Error(`Not a raster photo: ${contentType}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 5000) throw new Error("Image too small");
    const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
    Object.assign(record, { file: `${cacheKey}.${extension}`, bytes: bytes.length, artist: plain(metadata.Artist?.value),
      license, licenseUrl: metadata.LicenseUrl?.value || "https://commons.wikimedia.org/wiki/Commons:Copyright_rules_by_territory",
      filePage: info.descriptionurl, downloadUrl, imageTitle: page.pageimage,
      description: plain(metadata.ImageDescription?.value), reviewed: false });
    writeFileSync(resolve(dir, record.file), bytes);
    console.log(`Downloaded: ${landmark} | ${page.pageimage} | ${license}`);
  } catch (err) { record.error = String(err); console.log(`Pending: ${landmark} | ${record.error}`); }
  writeFileSync(cached, JSON.stringify(record, null, 2));
  results.push(record);
  writeFileSync(resolve(dir, "candidates.json"), JSON.stringify(results, null, 2));
}
writeFileSync(resolve(dir, "candidates.json"), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify({ candidates: results.length, downloaded: results.filter(row => row.file).length, pending: results.filter(row => !row.file).map(row => row.landmark) }));
