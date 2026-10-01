import questionBank from "../data/questions.json";
import overrides from "../data/question-classification-overrides.json";

export const QUESTION_SUBTOPICS = {
  "population-urban": { topic: "政治與區域地理", label: "人口、都市與遷移" },
  "resources-development": { topic: "自然地理", label: "資源與發展指標" },
  "hazards-risk": { topic: "自然地理", label: "災害、風險與土地利用" },
  "continent-location": { topic: "政治與區域地理", label: "洲別與區域定位" },
  "country-location": { topic: "政治與區域地理", label: "國家與城市位置" },
  capitals: { topic: "政治與區域地理", label: "首都與行政中心" },
  "country-records": { topic: "政治與區域地理", label: "國土與國家紀錄" },
  "coordinates-time": { topic: "政治與區域地理", label: "經緯度與時區" },
  "mountains-volcanoes": { topic: "自然地理", label: "山岳與火山" },
  "rivers-lakes-waterfalls": { topic: "自然地理", label: "河流、湖泊與瀑布" },
  "oceans-coasts-islands": { topic: "自然地理", label: "海洋、海岸與島嶼" },
  "deserts-rocks": { topic: "自然地理", label: "沙漠與特殊地形" },
  "ecology-parks": { topic: "自然地理", label: "生態與國家公園" },
  "climate-polar": { topic: "自然地理", label: "氣候、冰川與極地" },
  "religious-sites": { topic: "文化與地標", label: "宗教建築與聖地" },
  "palaces-castles": { topic: "文化與地標", label: "宮殿與城堡" },
  "historic-sites": { topic: "文化與地標", label: "古城、古蹟與考古遺址" },
  "museums-arts": { topic: "文化與地標", label: "博物館與表演藝術" },
  "monuments-landmarks": { topic: "文化與地標", label: "現代建築與紀念地標" },
  "heritage-conservation": { topic: "文化與地標", label: "世界遺產與保存" },
  "gardens-landscapes": { topic: "文化與地標", label: "園林與文化景觀" },
  "landmark-general": { topic: "文化與地標", label: "地標綜合（待細分）" },
  "aviation-airports": { topic: "旅行實務", label: "航空、機場與轉機" },
  "baggage-security": { topic: "旅行實務", label: "行李與安檢" },
  "documents-entry": { topic: "旅行實務", label: "護照、簽證與入境" },
  "ground-transport": { topic: "旅行實務", label: "鐵路與陸路交通" },
  "cruises-boats": { topic: "旅行實務", label: "郵輪與船舶交通" },
  "money-shopping": { topic: "旅行實務", label: "換匯、支付與購物退稅" },
  "health-food": { topic: "旅行實務", label: "健康、飲食與藥品" },
  "safety-emergencies": { topic: "旅行實務", label: "旅行安全與緊急應變" },
  "insurance-rights": { topic: "旅行實務", label: "保險、契約與旅客權益" },
  "culture-etiquette": { topic: "旅行實務", label: "文化與參訪禮儀" },
  accommodation: { topic: "旅行實務", label: "住宿與旅館" },
  "planning-itineraries": { topic: "旅行實務", label: "行程規劃與團體旅遊" },
  "digital-equipment": { topic: "旅行實務", label: "通訊與旅行設備" },
  "general-geography": { topic: "地理綜合", label: "地理綜合知識" },
} as const;

export type QuestionSubtopic = keyof typeof QUESTION_SUBTOPICS;
export type QuestionClassification = {
  version: 1;
  topic: string;
  subtopic: QuestionSubtopic;
  subtopicLabel: string;
  tags: string[];
  geography: { regions: string[]; countries: string[]; basis: "region" | "subject" | "general" | "manual" | "unresolved" };
  assignment: "rule" | "manual" | "fallback";
  reviewRequired: boolean;
};

type ClassificationInput = {
  id: string;
  q: string;
  region: string;
  category?: string;
  questionType: string;
  kind?: string;
  landmark?: string;
};

const referenceFacts = [...questionBank.expandedFacts, ...questionBank.heritageFacts];
const countryRegions = new Map(referenceFacts.map(([, country, region]) => [country, region]));
const cityCountryCandidates = new Map<string, Set<string>>();
for (const [city, country] of referenceFacts) {
  const candidates = cityCountryCandidates.get(city) ?? new Set<string>();
  candidates.add(country);
  cityCountryCandidates.set(city, candidates);
}
// 同名城市出現在多個國家時，保留待確認，不用最後一筆覆蓋。
const cityCountries = new Map([...cityCountryCandidates]
  .filter(([, countries]) => countries.size === 1)
  .map(([city, countries]) => [city, [...countries][0]]));
const geographicRegions = ["亞洲", "歐洲", "非洲", "北美洲", "南美洲", "大洋洲", "南極洲"];

function geographyFor(input: ClassificationInput): QuestionClassification["geography"] {
  // Only the subject text is inspected. Distractor options never contribute geography.
  const mentionedCountries = [...countryRegions.keys()].filter(country => {
    const position = input.q.indexOf(country);
    if (position < 0) return false;
    // 印度河、墨西哥灣等地名不等同於國家本身。
    return !/^[河海灣山島]/.test(input.q.slice(position + country.length)) &&
      !input.q.slice(position + country.length).startsWith("半島");
  });
  const longestCountries = mentionedCountries.filter(country =>
    !mentionedCountries.some(other => other !== country && other.includes(country)));
  const mentionedCities = [...cityCountries.keys()].filter(city => input.q.includes(city));
  const longestCities = mentionedCities.filter(city =>
    !mentionedCities.some(other => other !== city && other.includes(city)));
  const countries = [...new Set([...longestCountries, ...longestCities.map(city => cityCountries.get(city)!)])].sort();
  const regions = geographicRegions.filter(region => input.region.includes(region));
  if (input.region.includes("中亞")) regions.push("亞洲");
  if (input.region.includes("極地")) regions.push("極地");
  if (regions.length) return { regions: [...new Set(regions)], countries, basis: "region" };
  const textRegions = geographicRegions.filter(region => input.q.includes(region));
  if (/西歐|東歐|北歐|南歐/.test(input.q)) textRegions.push("歐洲");
  if (input.q.includes("北美")) textRegions.push("北美洲");
  if (input.q.includes("南美")) textRegions.push("南美洲");
  if (textRegions.length) return { regions: [...new Set(textRegions)], countries, basis: "subject" };
  const subjectRegions = [...new Set(countries.map(country => countryRegions.get(country)!))].sort();
  if (subjectRegions.length) return { regions: subjectRegions, countries, basis: "subject" };
  if (/北極|南極|極地/.test(input.q)) return { regions: ["極地"], countries, basis: "subject" };
  if (input.category === "旅行知識" || /世界|全球|地球|國際換日線|經度|緯度|緯線|赤道|子午線|內陸國|國家數量最多|海岸線最長|最多時區|氣候|氣溫|高壓帶|降水/.test(input.q)) {
    return { regions: ["全球／通用"], countries, basis: "general" };
  }
  return { regions: [], countries, basis: "unresolved" };
}

const travelRules: [QuestionSubtopic, RegExp][] = [
  ["insurance-rights", /保險|契約|合約|旅客權益|旅行社.*閱讀/],
  ["culture-etiquette", /禮儀|小費|禁忌|參訪|參觀清真寺/],
  ["safety-emergencies", /安全|緊急|事故|求救|警報|地震|海嘯|雪崩|颱風|雷雨|迷路|遭竊|失溫|中暑|救生|遺失護照|護照與現金|保管|野生動物|火山.*避免/],
  ["health-food", /健康|食物|飲食|飲水|自來水|中毒|藥|疫區|疫苗|暈船|紫外線|高山症|高原症|生理現象/],
  ["baggage-security", /行李|登機箱|安檢|行動電源|液體.*攜帶|隨身.*限制/],
  ["documents-entry", /護照|簽證|入境|出境|身分證明|申報|海關|ESTA|ETA|免簽/],
  ["money-shopping", /貨幣|換匯|退稅|免稅店|購物|信用卡|ATM|提款|現金|支付/],
  ["coordinates-time", /時差|時區/],
  ["ground-transport", /鐵路|火車|高速鐵路|租車|駕照|地鐵|巴士/],
  ["cruises-boats", /郵輪|渡輪|登船|乘船/],
  ["digital-equipment", /無線網路|通訊|SIM|漫遊|電子設備|電壓|插頭|插座/],
  ["aviation-airports", /航班|航空|航權|機場|轉機|飛機|登機|長程航/],
  ["accommodation", /旅館|民宿|住宿|入住|退房/],
  ["planning-itineraries", /行程|旅行規劃|旺季|團體|集合|預約|備份|衣物準備|旅行前|旅遊保險/],
];

const subjectRules: [QuestionSubtopic, RegExp][] = [
  ["climate-polar", /氣候|氣溫|降雨|降水|雨季|乾季|季風|高壓帶|洋流|寒流|灣流/],
  ["coordinates-time", /經度|緯度|緯線|經緯|時區|換日線|日期變更線|赤道|子午線/],
  ["country-records", /世界.*(?:最大|最小).*國|國土|國家.*面積|面積.*國家|內陸國|人口.*國|國家.*人口|海岸線最長/],
  ["climate-polar", /冰川|冰河|極光|北極|南極|極地|氣候|氣溫|降雨|雨季|乾季|季風/],
  ["ecology-parks", /國家公園|野生動物|生態|濕地|雨林|森林|孫德爾邦|保護區/],
  ["rivers-lakes-waterfalls", /河流|河川|瀑布|湖泊|淡水|鹽湖|死海|里海|尼羅河|亞馬遜河|多瑙河|伏爾加河|密西西比河|湄公河|巴拉那河|印度河|育空河|萊茵河|五大湖|貝加爾湖|藍湖|天空之鏡|長江|黃河/],
  ["oceans-coasts-islands", /海洋|海域|水域|大洋|太平洋|大西洋|印度洋|海峽|運河|海灣|峽灣|島嶼|群島|海岸|珊瑚|大堡礁|好望角|海岬|格陵蘭島|羅本島|維多利亞港|半島|波羅的海|日本海|波斯灣|黑海|阿拉伯海|北海|下龍灣/],
  ["mountains-volcanoes", /火山|山岳|山脈|高山|高原|彩虹山|最高.*山|富士山|黃山|珠穆朗瑪|少女峰|乞力馬扎羅|聖克里斯托瓦爾山|桌山|普西山/],
  ["deserts-rocks", /沙漠|峽谷|裂谷|岩石|地形|地質|石灰岩|鹽礦|卡帕多奇亞|月亮谷|烏魯魯/],
  ["religious-sites", /教堂|清真寺|神社|神廟|佛寺|聖地|哭牆|寺廟|寺院|大佛|瑪哈陵|聖家堂|大金塔|婆羅浮屠|虎穴寺|金閣寺|東大寺|清水寺|佛國寺/],
  ["museums-arts", /博物館|美術館|羅浮宮|歌劇院|藝術博物|雕塑公園|聖三一學院/],
  ["palaces-castles", /宮|城堡|古堡|紫禁城|姬路城|琥珀堡|新天鵝堡/],
  ["historic-sites", /古城|舊城|老城|歷史中心|衛城|遺跡|遺址|古蹟|考古|金字塔|長城|競技場|馬丘比丘|納斯卡線|吳哥窟|莫高窟|摩艾|奇琴伊察|獅子岩|兵馬俑|巨石陣/],
  ["gardens-landscapes", /花園|園林/],
  ["monuments-landmarks", /鐵塔|斜塔|星塔|大橋|和平橋|中心塔|貝倫塔|風車群|大廈|摩天|大樓|雕像|紀念|廣場|紅場|市政廳|國會|大笨鐘|布蘭登堡門|自由女神|基督像|濱海灣金沙|原子球塔|巴伊傑列克塔|哈里法塔/],
  ["heritage-conservation", /世界遺產|UNESCO|文化遺產|自然遺產|保存|保護文物/],
];

function inferSubtopic(input: ClassificationInput): QuestionSubtopic {
  const travelText = `${input.q} ${input.region}`;
  const travelQuestion = input.category === "旅行知識" || /機場|航班|航空/.test(input.q);
  if (travelQuestion) {
    const matched = travelRules.find(([, pattern]) => pattern.test(travelText));
    if (matched) return matched[0];
  }
  if (input.questionType === "capital" || input.questionType === "reverse-capital" || input.q.includes("首都")) return "capitals";
  if (input.questionType === "continent") return "continent-location";
  // Prefer the tested subject over an illustration that may only supply context.
  const subject = input.questionType === "landmark-city" ? `${input.q} ${input.landmark ?? ""}` : input.q;
  const matched = subjectRules.find(([, pattern]) => pattern.test(subject));
  if (matched) return matched[0];
  if (travelQuestion) return "planning-itineraries";
  if (input.questionType === "country-pick" || input.questionType === "city-pick") return "country-location";
  if (input.questionType === "landmark-city") return "landmark-general";
  return "general-geography";
}

export function classifyQuestion(input: ClassificationInput): QuestionClassification {
  const manual = (overrides as Record<string, {
    subtopic?: QuestionSubtopic;
    geography?: { regions: string[]; countries?: string[] };
    note?: string;
    sources?: string[];
  }>)[input.id];
  const subtopic = manual?.subtopic ?? inferSubtopic(input);
  const definition = QUESTION_SUBTOPICS[subtopic];
  if (!definition) throw new Error(`Unknown question subtopic: ${subtopic} (${input.id})`);
  const geography: QuestionClassification["geography"] = manual?.geography
    ? { regions: manual.geography.regions, countries: manual.geography.countries ?? [], basis: "manual" }
    : geographyFor(input);
  const fallback = subtopic === "general-geography" || subtopic === "landmark-general";
  return {
    version: 1,
    topic: definition.topic,
    subtopic,
    subtopicLabel: definition.label,
    tags: [
      ...(input.category === "世界遺產" ? ["世界遺產"] : []),
      ...(input.kind === "tf" ? ["暖身／是非"] : []),
      ...(input.region.includes("行程") ? ["旅遊行程"] : []),
    ],
    geography,
    assignment: manual ? "manual" : fallback ? "fallback" : "rule",
    reviewRequired: fallback || geography.basis === "unresolved",
  };
}
