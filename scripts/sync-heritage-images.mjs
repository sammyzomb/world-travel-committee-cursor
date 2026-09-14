import { writeFileSync } from "node:fs";
import { heritageLandmarkImages } from "../lib/landmark-images-heritage.ts";

const searchByLandmark = {
  萬里長城: "Great Wall of China",
  紫禁城: "Forbidden City Beijing",
  兵馬俑: "Terracotta Army China",
  莫高窟: "Mogao Caves",
  樂山大佛: "Leshan Giant Buddha",
  張家界國家森林公園: "Zhangjiajie National Forest Park",
  黃山: "Huangshan China",
  麗江古城: "Lijiang Old Town China",
  布達拉宮: "Potala Palace",
  嚴島神社: "Itsukushima torii",
  姬路城: "Himeji Castle",
  佛國寺: "Bulguksa temple Korea",
  會安古城: "Hoi An ancient town",
  金邊皇宮: "Royal Palace Phnom Penh",
  加德滿都谷地: "Kathmandu Durbar Square",
  琥珀堡: "Amber Palace Jaipur",
  藍色清真寺: "Blue Mosque Istanbul",
  卡帕多奇亞: "Cappadocia balloons",
  耶路撒冷古城: "Jerusalem Old City",
  杰拉什古城: "Jerash Jordan",
  新天鵝堡: "Neuschwanstein Castle",
  凡爾賽宮: "Palace of Versailles",
  聖米歇爾山: "Mont Saint Michel",
  阿爾罕布拉宮: "Alhambra Granada",
  塞哥維亞古城: "Aqueduct of Segovia",
  雅典衛城: "Acropolis Athens",
  龐貝古城: "Pompeii forum",
  威尼斯古城: "Grand Canal Venice",
  烏菲茲美術館: "Uffizi Gallery Florence",
  威斯敏斯特宮: "Palace of Westminster",
  巨石陣: "Stonehenge",
  布拉格城堡: "Prague Castle",
  維利奇卡鹽礦: "Wieliczka salt mine",
  辛格韋德利爾國家公園: "Thingvellir National Park",
  克里姆林宮: "Moscow Kremlin",
  冬宮博物館: "Hermitage Museum Saint Petersburg",
  杜布羅夫尼克古城: "Dubrovnik walls",
  大峽谷國家公園: "Grand Canyon",
  優勝美地國家公園: "Yosemite Valley",
  黃石國家公園: "Grand Prismatic Spring",
  尼加拉瀑布: "Niagara Falls",
  瓦哈卡歷史中心: "Oaxaca city Mexico",
  薩爾瓦多歷史中心: "Pelourinho Salvador Brazil",
  莫雷諾冰川: "Perito Moreno Glacier",
  庫斯科古城: "Cusco Plaza de Armas",
  摩艾石像: "Ahu Tongariki Easter Island",
  大堡礁: "Great Barrier Reef",
  烏魯魯: "Uluru Australia",
  乞力馬扎羅山: "Mount Kilimanjaro",
  馬拉喀什老城: "Marrakesh Medina",
  羅本島: "Robben Island",
  阿布辛貝神廟: "Abu Simbel",
  魁北克古城: "Quebec City skyline",
  小孩堤防風車群: "Kinderdijk windmills",
  波斯波利斯古城: "Persepolis Iran",
  旅遊地標: "Earth from Apollo 17",
};

function toUploadUrl(thumburl) {
  if (!thumburl) return null;
  const clean = thumburl.split("?")[0];
  if (clean.includes("upload.wikimedia.org")) return clean;
  return clean.replace("thumb.wikimedia.org", "upload.wikimedia.org");
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
    headers: { "User-Agent": "WorldTravelCommittee/1.0 (heritage sync)" },
  });
  if (!response.ok) throw new Error(`API ${response.status} for ${search}`);
  const payload = await response.json();
  const pages = Object.values(payload.query?.pages ?? {});
  const first = pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0];
  const info = first?.imageinfo?.[0];
  const url = toUploadUrl(info?.thumburl) ?? info?.url;
  if (!url) throw new Error(`No image for ${search}`);
  const title = first?.title?.replace(/^File:/, "") ?? search;
  return { url, title };
}

const resolved = {};
const failures = [];

for (const [landmark, search] of Object.entries(searchByLandmark)) {
  try {
    const image = await resolveImage(search);
    resolved[landmark] = {
      url: image.url,
      credit: `Wikimedia Commons / ${image.title}`,
    };
    console.log("OK", landmark);
  } catch (error) {
    failures.push({ landmark, error: String(error) });
    resolved[landmark] = heritageLandmarkImages[landmark];
    console.log("FAIL", landmark, error);
  }
  await new Promise((r) => setTimeout(r, 900));
}

const lines = [
  "type HeritageLandmarkImage = {",
  "  url: string;",
  "  credit: string;",
  "};",
  "",
  "/** 世界遺產擴充題庫用地標圖（Wikimedia Commons，由 scripts/sync-heritage-images.mjs 同步）。 */",
  "export const heritageLandmarkImages: Record<string, HeritageLandmarkImage> = {",
];

for (const [landmark, image] of Object.entries(resolved)) {
  lines.push(`  ${JSON.stringify(landmark)}: {`);
  lines.push(`    url: ${JSON.stringify(image.url)},`);
  lines.push(`    credit: ${JSON.stringify(image.credit)},`);
  lines.push("  },");
}
lines.push("};");
lines.push("");

writeFileSync(new URL("../lib/landmark-images-heritage.ts", import.meta.url), lines.join("\n"), "utf8");
console.log("\nResolved:", Object.keys(resolved).length, "Failures:", failures.length);
