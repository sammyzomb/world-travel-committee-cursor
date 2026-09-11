/**
 * 題庫匯入工具
 *
 * 用法：
 *   node scripts/import-questions.mjs merge          # 合併 imported 資料至 questions.json
 *   node scripts/import-questions.mjs fetch-opentdb  # 從 OpenTDB 抓取地理題（英文草稿）
 *   node scripts/import-questions.mjs fetch-countries # 從 REST Countries 產生擴充草稿
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bankPath = join(root, "data", "questions.json");
const importedDir = join(root, "data", "imported");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function factKey(fact) {
  return `${fact[1]}|${fact[4]}`;
}

function questionKey(q) {
  return q.q;
}

function decodeHtml(text) {
  return text
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&eacute;", "é")
    .replaceAll("&uuml;", "ü")
    .replaceAll("&ntilde;", "ñ");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeImported() {
  const bank = readJson(bankPath);
  const expansion = readJson(join(importedDir, "restcountries-expansion.json"));
  const opentdb = readJson(join(importedDir, "opentdb-geography-zh.json"));
  const tour = readJson(join(importedDir, "tcawg-tour-questions.json"));

  const existingFacts = new Set(bank.expandedFacts.map(factKey));
  let addedFacts = 0;
  for (const fact of expansion) {
    if (!existingFacts.has(factKey(fact))) {
      bank.expandedFacts.push(fact);
      existingFacts.add(factKey(fact));
      addedFacts += 1;
    }
  }

  const existingQuestions = new Set(bank.questions.map(questionKey));
  let addedQuestions = 0;
  for (const question of opentdb) {
    const { source, ...rest } = question;
    if (!existingQuestions.has(rest.q)) {
      bank.questions.push(rest);
      existingQuestions.add(rest.q);
      addedQuestions += 1;
    }
  }

  if (!bank.tourQuestions) bank.tourQuestions = [];
  const existingTour = new Set(bank.tourQuestions.map(questionKey));
  let addedTour = 0;
  for (const question of tour) {
    const entry = { ...question };
    if (entry.level === "旅行知識") entry.level = "國家達人";
    if (!existingTour.has(entry.q)) {
      bank.tourQuestions.push(entry);
      existingTour.add(entry.q);
      addedTour += 1;
    }
  }

  writeJson(bankPath, bank);
  console.log(`✓ 已合併至 data/questions.json`);
  console.log(`  - expandedFacts +${addedFacts}（共 ${bank.expandedFacts.length} 組）`);
  console.log(`  - questions +${addedQuestions}（共 ${bank.questions.length} 題）`);
  console.log(`  - tourQuestions +${addedTour}（共 ${bank.tourQuestions.length} 題）`);
}

async function fetchOpenTdb() {
  mkdirSync(importedDir, { recursive: true });
  const difficulties = ["easy", "medium", "hard"];
  const collected = [];

  for (const difficulty of difficulties) {
    const url = `https://opentdb.com/api.php?amount=15&category=22&difficulty=${difficulty}&type=multiple`;
    const response = await fetch(url);
    const payload = await response.json();
    if (payload.response_code !== 0) {
      console.warn(`OpenTDB ${difficulty} 失敗:`, payload.response_code);
      continue;
    }
    for (const item of payload.results) {
      collected.push({
        difficulty,
        question: decodeHtml(item.question),
        correct_answer: decodeHtml(item.correct_answer),
        incorrect_answers: item.incorrect_answers.map(decodeHtml),
        source: "OpenTDB",
      });
    }
    await sleep(5500);
  }

  const outPath = join(importedDir, "opentdb-raw-en.json");
  writeJson(outPath, collected);
  console.log(`✓ 已抓取 ${collected.length} 題英文地理題 → ${outPath}`);
  console.log("  請翻譯後加入 opentdb-geography-zh.json，再執行 merge");
}

const REGION_ZH = {
  Asia: "亞洲",
  Europe: "歐洲",
  Africa: "非洲",
  Oceania: "大洋洲",
  Americas: "美洲",
};

const CURATED_LANDMARKS = {
  Afghanistan: ["喀布爾", "喀布爾", "巴米揚大佛"],
  Albania: ["地拉那", "地拉那", "地拉那城堡"],
  Algeria: ["阿爾及爾", "阿爾及爾", "卡斯巴古城"],
  Armenia: ["葉里溫", "葉里溫", "加爾尼神廟"],
  Azerbaijan: ["巴庫", "巴庫", "火焰塔"],
  Bahrain: ["麥納瑪", "麥納瑪", "巴林堡"],
  Belarus: ["明斯克", "明斯克", "勝利廣場"],
  Benin: ["科托努", "波多諾伏", "彭戈彭戈瀑布"],
  Botswana: ["嘉柏隆里", "哈博羅內", "奧卡萬戈三角洲"],
  Bulgaria: ["索菲亞", "索菲亞", "亞歷山大涅夫斯基大教堂"],
  Croatia: ["札格瑞布", "札格瑞布", "杜布羅夫尼克古城"],
  Cyprus: ["尼科西亞", "尼科西亞", "庫里安遺址"],
  Dominican: ["聖多明哥", "聖多明哥", "殖民區"],
  Estonia: ["塔林", "塔林", "塔林老城"],
  Fiji: ["蘇瓦", "蘇瓦", "瑪瑪努卡群島"],
  Ghana: ["阿克拉", "阿克拉", "良知之父紀念碑"],
  Guatemala: ["瓜地馬拉市", "瓜地馬拉市", "蒂卡爾遺跡"],
  Honduras: ["德古西加巴", "德古西加巴", "科潘遺跡"],
  Iraq: ["巴格達", "巴格達", "巴比倫遺跡"],
  Jordan: ["安曼", "安曼", "佩特拉古城"],
  Kuwait: ["科威特市", "科威特市", "科威特塔"],
  Latvia: ["里加", "里加", "里加老城"],
  Lebanon: ["貝魯特", "貝魯特", "巴勒貝克神廟"],
  Lithuania: ["維爾紐斯", "維爾紐斯", "維爾紐斯老城"],
  Luxembourg: ["盧森堡市", "盧森堡市", "盧森堡老城"],
  Madagascar: ["安塔那那利佛", "安塔那那利佛", "猴面包樹大道"],
  Malawi: ["利隆圭", "利隆圭", "馬拉威湖"],
  Malta: ["瓦萊塔", "瓦萊塔", "瓦萊塔古城"],
  Moldova: ["基希涅夫", "基希涅夫", "修道院酒窖"],
  Monaco: ["摩納哥", "摩納哥", "蒙特卡羅"],
  Montenegro: ["波德戈里察", "波德戈里察", "科托爾灣"],
  Mozambique: ["馬普托", "馬普托", "巴扎魯托群島"],
  Panama: ["巴拿馬城", "巴拿馬城", "巴拿馬運河"],
  Paraguay: ["亞松森", "亞松森", "伊瓜蘇瀑布"],
  Romania: ["布加勒斯特", "布加勒斯特", "布蘭城堡"],
  Rwanda: ["基加利", "基加利", "火山國家公園"],
  Senegal: ["達卡", "達喀爾", "戈雷島"],
  Slovakia: ["布拉提斯拉瓦", "布拉提斯拉瓦", "布拉提斯拉瓦城堡"],
  Slovenia: ["盧比安納", "盧比安納", "布萊德湖"],
  Sudan: ["喀土穆", "喀土穆", "尼羅河匯流點"],
  Suriname: ["巴拉馬利波", "巴拉馬利波", "中央蘇利南自然保護區"],
  Syria: ["大馬士革", "大馬士革", "烏馬亞德清真寺"],
  Taiwan: ["台北", "台灣", "台北101"],
  Tajikistan: ["杜尚別", "杜尚別", "帕米爾高原"],
  Turkmenistan: ["阿什哈巴德", "阿什哈巴德", "尼雅扎古城"],
  Uganda: ["坎帕拉", "坎帕拉", "布溫迪森林"],
  Venezuela: ["加拉加斯", "加拉加斯", "天使瀑布"],
  Zambia: ["路沙卡", "路沙卡", "維多利亞瀑布"],
};

async function fetchCountriesDraft() {
  mkdirSync(importedDir, { recursive: true });
  const bank = readJson(bankPath);
  const existing = new Set(bank.expandedFacts.map((f) => f[1]));
  const response = await fetch(
    "https://restcountries.com/v3.1/all?fields=name,capital,region,subregion,translations",
  );
  const countries = await response.json();
  const draft = [];

  for (const country of countries) {
    const enName = country.name?.common;
    const zhName = country.translations?.zho?.common ?? enName;
    if (existing.has(zhName)) continue;

    const curated = CURATED_LANDMARKS[enName];
    if (!curated) continue;

    const [city, capital, landmark] = curated;
    let continent = REGION_ZH[country.region] ?? "亞洲";
    if (country.region === "Americas") {
      continent = country.subregion?.includes("South") ? "南美洲" : "北美洲";
    }

    draft.push([city, zhName, continent, capital, landmark]);
    if (draft.length >= 50) break;
  }

  const outPath = join(importedDir, "restcountries-draft.json");
  writeJson(outPath, draft);
  console.log(`✓ 已產生 ${draft.length} 組 REST Countries 草稿 → ${outPath}`);
  console.log("  校對中文地名後可複製至 restcountries-expansion.json，再執行 merge");
}

const command = process.argv[2] ?? "merge";

if (command === "merge") {
  mergeImported();
} else if (command === "fetch-opentdb") {
  await fetchOpenTdb();
} else if (command === "fetch-countries") {
  await fetchCountriesDraft();
} else {
  console.log("用法: node scripts/import-questions.mjs [merge|fetch-opentdb|fetch-countries]");
  process.exit(1);
}
