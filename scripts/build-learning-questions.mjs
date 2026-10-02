import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cases as geographyCases } from "./geography-editorial-cases.mjs";
import { cases as travelCases } from "./travel-editorial-cases.mjs";
import { cases as advancedCases } from './travel-advanced-cases.mjs';
const cases = [...geographyCases.filter(item => item.band !== 'advanced'), ...travelCases.filter(item => item.band !== 'advanced' || item.index < 12), ...advancedCases];

// 原創地理理解題，情境不是現地公告；不以純計算或換數字擴增題庫。
const root = resolve(import.meta.dirname, "..");
const rows = [];
const grades = ["小一", "小二", "小三", "小四", "小五", "小六", "國一", "國二", "國三", "高一", "高二", "高三", "大一", "大二", "大三", "大四", "研一", "研二"];
function add(id, level, demand, family, subtopic, q, options, fact, allowedGrades = []) {
  if (new Set(options).size !== 4) throw Error(`Repeated options: ${id}`);
  rows.push({ id: `learning:${id}`, level, demand, family, subtopic, q, options, answer: 0, fact,
    region: "全球／通用", category: "旅行知識", travelFocus: true,
    ...(/雙子星塔/.test(q) ? {landmark:'雙子星塔',landmarkDetail:'馬來西亞・吉隆坡'} : {}),
    questionType: "world-fact", grades: allowedGrades,
    ...(/雙子星塔/.test(q) ? {references:[{title:'雙子星塔官方：參觀體驗',url:'https://www.petronastwintowers.com.my/',role:'fact'}]} : /日本.*溫泉/.test(q) ? {references:[{title:'日本觀光局：溫泉禮儀',url:'https://faq.japan-travel.jnto.go.jp/en/guide/how-to-best-enjoy-onsen/',role:'fact'}]} : /新加坡.*小販/.test(q) ? {references:[{title:'UNESCO：新加坡小販文化',url:'https://ich.unesco.org/en/RL/hawker-culture-in-singapore-community-dining-and-culinary-practices-in-a-multicultural-urban-context-01568',role:'fact'}]} : /佛朗明哥/.test(q) ? {references:[{title:'西班牙觀光局：佛朗明哥',url:'https://www.spain.info/en/discover-spain/flamenco-spain/',role:'fact'}]} : /龍坡邦/.test(q) ? {references:[{title:'UNESCO：龍坡邦古城',url:'https://whc.unesco.org/en/list/479/',role:'fact'}]} : /馬丘比丘/.test(q) ? {references:[{title:'UNESCO：馬丘比丘',url:'https://whc.unesco.org/en/list/274/',role:'fact'}]} : /威尼斯/.test(q) ? {references:[{title:'義大利觀光局：威尼斯',url:'https://www.italia.it/it/veneto/venezia',role:'fact'}]} : {}) });
}
const basics = [
  ["map", "coordinates-time", "地圖圖例的主要用途是？", ["解釋符號代表的事物", "保證每條路都暢通", "顯示即時天氣", "決定交通票價"], "圖例說明地圖上的符號意義；即時路況、天氣與票價需要其他資訊。"],
  ["scale", "coordinates-time", "地圖比例尺用來表示什麼關係？", ["圖上距離與實際距離", "氣溫與降雨", "遊客數與票價", "人口與面積"], "比例尺連結圖上距離與地面距離。"],
  ["river", "rivers-lakes-waterfalls", "河流的上游與下游，主要依什麼區分？", ["河水流動方向", "地圖的左右方向", "城市人口多寡", "是否有橋梁"], "上游到下游依河水流動方向定義，不能只看地圖左右。"],
  ["lake", "rivers-lakes-waterfalls", "與河流相比，湖泊通常有哪項特徵？", ["水體聚集在相對固定的盆地", "一定沒有任何出水口", "一定是鹹水", "一定通往海洋"], "湖泊是聚集於盆地中的水體；鹽度與出入水口因湖而異。"],
  ["weather", "climate-polar", "今天下雨與某地多年雨季的描述，分別屬於？", ["天氣與氣候", "氣候與天氣", "兩者都只是氣候", "兩者都只是天氣"], "天氣描述短期狀態，氣候描述長期統計特徵。"],
  ["season", "climate-polar", "南北半球的主要季節通常有何關係？", ["夏冬大致相反", "永遠完全相同", "只有北半球有季節", "只由經度決定"], "地球軸傾斜使南北半球在同一時期接受的日照條件不同。"],
  ["fossil", "historic-sites", "考古遺址的文物位置為何需要記錄？", ["位置關係有助於理解歷史脈絡", "所有文物都應先移走再研究", "位置只影響拍照效果", "只要知道重量就足夠"], "文物與周遭地層、建物及其他物件的關係，也是證據的一部分。"],
  ["museum", "museums-arts", "博物館展品標籤上的年代，主要幫助了解什麼？", ["展品所處的歷史時間", "今天的開館時間", "觀眾入場順序", "照片檔案大小"], "年代提供展品的時間脈絡，與當天入場或照片資訊不同。"],
  ["habitat", "ecology-parks", "「棲地」主要指什麼？", ["生物生活並取得資源的環境", "任何人工展示櫃", "只有動物睡覺的位置", "只有完全沒有人的地方"], "棲地包含生物生活、繁殖及取得資源的環境。"],
  ["wetland", "ecology-parks", "濕地與一般乾燥地面相比，主要差異是？", ["水分長期或季節性影響土壤與生態", "所有濕地都覆滿海水", "完全不能有植物", "一定比海洋深"], "濕地受積水或土壤飽水影響，並不一定是海水或深水。"],
  ["erosion", "deserts-rocks", "河水把岩土帶離原處，較符合哪種作用？", ["侵蝕與搬運", "岩漿結晶", "城市擴張", "地球自轉"], "流水可以侵蝕岩土並搬運物質。"],
  ["dune", "deserts-rocks", "風將沙粒搬運並堆積成丘，形成的是？", ["沙丘", "冰川", "火山口", "珊瑚礁"], "沙丘由風搬運並堆積沙粒形成。"],
  ["coral", "oceans-coasts-islands", "珊瑚礁與沙灘最主要的差別是？", ["珊瑚礁與造礁生物的生長有關", "珊瑚礁只由沙粒堆成", "沙灘一定有珊瑚", "兩者完全相同"], "造礁生物的生長與骨骼累積參與珊瑚礁形成。"],
  ["tide", "oceans-coasts-islands", "海岸一天內水位有規律地升降，通常稱為？", ["潮汐", "季風", "地形抬升", "火山活動"], "潮汐是海水水位的週期性升降。"],
  ["rail", "ground-transport", "搭火車前，月台號碼與車次應如何核對？", ["兩者一起確認，避免搭錯班次", "只看列車顏色", "只看旁人是否上車", "只確認售票窗口位置"], "同一月台可能有不同班次，車次與月台均須核對。"],
  ["transfer", "ground-transport", "交通行程中的「轉乘」是指？", ["換搭另一班或另一種交通工具", "取消所有交通安排", "只把車票拍照", "一定跨越國境"], "轉乘指更換班次或交通工具，不必然跨境。"],
  ["booking", "planning-itineraries", "預約景點時段時，最需要同時核對什麼？", ["日期、入場時段與人數", "只看照片是否漂亮", "只記住景點英文縮寫", "只看昨天的天氣"], "日期、時段與人數直接決定預約是否適用。"],
  ["buffer", "planning-itineraries", "行程中的「緩衝時間」主要用來？", ["吸收轉乘、排隊等不確定延誤", "增加必去景點數而不需交通時間", "取代所有預約", "讓所有交通費歸零"], "緩衝時間留給不確定延誤，並非額外景點的免費時間。"],
  ["heritage", "heritage-conservation", "文化遺產保存與單純複製外觀的差別是？", ["還重視歷史證據與原有脈絡", "只要顏色更鮮豔就足夠", "完全不需要紀錄", "必須移到新的位置"], "文化遺產保存也關注材料、證據及脈絡，並非只複製外觀。"],
  ["living", "heritage-conservation", "「活的文化傳統」主要強調什麼？", ["由社群持續實踐與傳承", "只能放在玻璃櫃展示", "必須禁止所有變化", "只重視物品尺寸"], "傳統由社群持續實踐與傳承，不能只當成靜態物品。"],
  ["altitude", "mountains-volcanoes", "海拔與山路實際走過的長度有何不同？", ["海拔是相對海平面的高度，路程是走過的距離", "兩者永遠完全相同", "海拔只計算水平距離", "路程只能用角度表示"], "海拔量測高度，路程沿行走路線量測。"],
  ["volcano", "mountains-volcanoes", "火山與一般高山的差別，主要在於？", ["是否與岩漿活動及噴發構造有關", "高度一定超過所有山峰", "必須位於沙漠", "山頂一定長年積雪"], "火山與岩漿活動及噴發構造相關，不能僅依高度或積雪判斷。"],
  ["garden", "gardens-landscapes", "園林的文化價值除了植物種類，還可能包含？", ["布局、歷史與人和環境的關係", "只有停車場大小", "只有票價高低", "只有今天的遊客數"], "園林也反映布局、設計與歷史文化。"],
  ["art", "museums-arts", "比較兩件藝術品時，哪組資訊更有助於理解？", ["年代、材料與創作背景", "只有相框售價", "只有觀眾排隊順序", "只有照片像素"], "年代、材料與創作背景共同提供藝術作品的脈絡。"],
];
const practicalTopics = new Set(['ground-transport','planning-itineraries','culture-etiquette','digital-equipment','museums-arts']);
basics.filter(([,sub])=>practicalTopics.has(sub)).forEach(([id, sub, q, choices, fact]) => add(`basic-${id}`, "城市旅人", 2, sub, sub, q, choices, fact, ["小四", "小五"]));

const concepts = [
  ["rainshadow", "climate-polar", "山脈迎風坡雨量多、背風坡雨量少。若風向與海拔條件維持不變，較合理的解釋是？", ["氣流抬升後水氣凝結，越山後水氣減少", "所有高山兩側雨量必然相同", "背風坡因看不到太陽而乾燥", "經度是唯一決定降雨的因素"], "迎風坡氣流抬升形成降雨，越山後常較乾燥。"],
  ["watershed", "rivers-lakes-waterfalls", "兩條支流匯入同一主流。上游污染可能影響哪些地方？", ["沿水流方向的下游水域", "只影響地圖左邊的區域", "只影響距離最近的山頂", "不可能影響任何其他河段"], "在其他條件相同下，污染可能隨水流向下游傳輸。"],
  ["urban", "climate-polar", "同一夜晚，密集建築區比鄰近綠地更熱。哪項因素較能解釋這個差異？", ["鋪面與建築蓄熱及植被差異", "兩地必然位於不同大洲", "綠地一定海拔高數千公尺", "夜晚的地球停止自轉"], "鋪面蓄熱、植被及人為熱源均可能影響都市熱環境。"],
  ["scale-compare", "coordinates-time", "同樣大小的紙上，街區詳圖與全國概覽圖相比，街區詳圖通常如何？", ["呈現較小範圍但更多細節", "涵蓋十倍範圍且細節不變", "每公分代表較遠距離", "比例尺與細節完全無關"], "街區詳圖通常呈現較小範圍與更多地方細節，概覽圖則涵蓋較大範圍。"],
  ["sediment", "deserts-rocks", "河流進入平緩地區後流速降低。哪種變化較可能出現？", ["部分搬運物質沉積", "所有物質立即汽化", "河流一定改成向上流", "流速越慢必定侵蝕越強"], "搬運能力下降時，部分沉積物較容易沉積。"],
  ["glacier", "deserts-rocks", "山谷有寬闊谷底與較陡谷壁，並有過去冰川活動證據。較支持哪種形成過程？", ["冰川侵蝕塑造谷形", "只由當天一次降雨形成", "所有山谷皆為人工挖掘", "只因城市人口增加"], "寬闊 U 形谷及冰川活動證據支持冰川侵蝕作用。"],
  ["corridor", "ecology-parks", "道路把同一物種的棲地切成兩塊。設置生態通道主要想改善什麼？", ["棲地間連通與生物移動", "讓道路車速無限制提高", "使兩塊棲地完全隔離", "把所有動物集中到售票口"], "生態通道主要改善棲地連通性。"],
  ["wetland-buffer", "ecology-parks", "河岸濕地可暫時蓄水。保留它較可能改善哪項功能？", ["減緩部分逕流並提供棲地", "保證任何暴雨都不會淹水", "讓所有河流永久乾涸", "完全消除所有污染源"], "濕地可能緩衝部分逕流與提供棲地，但不是絕對防洪保證。"],
  ["coast", "oceans-coasts-islands", "海岸某段持續流失沙量。只看一次低潮照片就認定沙灘變大，有何問題？", ["潮位差會影響可見沙灘範圍", "照片不可能記錄海岸", "潮位永遠不變", "所有沙灘都只會擴大"], "比較海岸變化時需要控制潮位等觀測條件。"],
  ["heritage-original", "heritage-conservation", "修復古建築前先記錄材料、裂縫與歷史痕跡，主要是為了？", ["建立後續判斷與修復依據", "讓原有證據更容易被丟棄", "保證只用最新材料", "省略所有專業評估"], "調查與記錄是修復判斷的重要依據。"],
  ["heritage-context", "historic-sites", "考古物件與地層關係被移動後才拍照，最可能失去哪類資訊？", ["原始位置與共存關係的證據", "物件是否可以被照相", "照片的所有顏色", "任何人都不再能看見物件"], "移動前的地層與物件關係往往無法完全重建。"],
  ["heritage-community", "heritage-conservation", "古城同時是居民的生活空間。只增加遊客數而不考慮居民需求，有何限制？", ["可能忽略生活功能與保存目標的衝突", "遊客數能代表所有保存成果", "居民完全不是利害關係人", "只要售票就一定保存成功"], "生活中的古城需要同時考慮保存、居民與遊客需求。"],
  ["museum-provenance", "museums-arts", "兩件外觀相似的文物，來源記錄完整的一件通常更利於研究什麼？", ["原始用途、時間與流通脈絡", "保證藝術價值一定更高", "保證從未修復", "不需要再進行任何研究"], "來源記錄有助理解脈絡，但不能代替所有研究或保證價值。"],
  ["route-direct", "ground-transport", "直達車車程較長，轉乘車車程較短但有候車時間。比較總旅時應如何做？", ["把候車與轉乘時間一起算入", "只比較車上行駛時間", "忽略抵達時間", "只看站名字數"], "總旅時包含行駛、候車與轉乘等時間。"],
  ["booking-capacity", "planning-itineraries", "景點採分時預約，並限定同時在場人數。最符合限制的安排是？", ["依各時段容量分批入場", "同時在開門前集中全部人", "把各時段名額全部當成同時容量", "不需確認預約時段"], "分時容量與同時在場上限不能混為一談。"],
  ["accessibility", "ground-transport", "一條路線最短，另一條較長但無階梯。輪椅旅客選路時最應納入哪項條件？", ["無障礙連通與實際可通行性", "只看地圖直線距離", "只看路線顏色", "只看照片的解析度"], "適用路線需符合旅客的通行條件，而非只最短。"],
  ["timezone", "coordinates-time", "同一瞬間，甲地時鐘比乙地早三小時，這表示什麼？", ["兩地採用不同的時間基準", "甲地一天只有二十一小時", "乙地時間停止", "一定是兩地季節不同"], "時區採不同時間基準，同一瞬間可有不同鐘面時間。"],
  ["latitude", "coordinates-time", "緯度接近但海拔、距海距離不同的兩地，氣候一定相同嗎？", ["不一定，還需考慮其他氣候因素", "一定完全相同", "只由地名長短決定", "海拔完全沒有影響"], "緯度之外，海拔、海陸位置及環流等因素也會影響氣候。"],
  ["seasonal-rain", "climate-polar", "年雨量相同的兩地，一地雨量集中於兩個月，另一地全年均勻。規劃旅行時應比較？", ["各月份雨量分布", "只比較年雨量即可", "只比較經度", "只比較飯店樓層"], "年總量相同並不代表旅行月份的降雨條件相同。"],
  ["mountain-route", "mountains-volcanoes", "兩條山路水平距離相同，一條爬升較大。只依水平距離判定耗時，有何不足？", ["忽略爬升與地形條件", "水平距離能決定所有耗時", "海拔不可能改變", "坡度只能影響海上航線"], "路程估計還需考慮爬升、坡度與路況。"],
  ["park-count", "ecology-parks", "兩個公園記錄到相近數量的鳥，但一處觀察時間較長。直接說兩地鳥一樣多，有何不足？", ["觀察努力不同，不能只比原始數量", "觀察時間永遠沒有影響", "鳥類只能在同一分鐘出現", "照片數量一定等於族群總量"], "需要考慮觀察時間、範圍及其他條件。"],
  ["gardens-water", "gardens-landscapes", "乾燥季節的園林需要節水，哪項做法較符合這個目標？", ["依植物需求與土壤水分調整灌溉", "所有區域全天持續灌溉", "只增加硬鋪面就視為達標", "只記錄售票收入"], "依實際需求與水分狀態調整用水，比持續灌溉更符合節水目標。"],
  ["digital-map", "digital-equipment", "山區可能沒有行動網路。出發前下載離線地圖的主要用途是？", ["在沒有連線時仍可查看已下載範圍", "保證道路與天氣永遠不變", "取代所有導航判斷", "讓手機永遠不會沒電"], "離線地圖可提供已下載資料，但仍需注意路況、電量及判斷。"],
  ["local-culture", "culture-etiquette", "某社群希望祭典部分活動不公開拍攝。參訪安排較應如何處理？", ["事先確認公開範圍並尊重社群決定", "所有傳統都必須完全公開", "只以相機設備決定拍攝範圍", "只要買票就可改變所有規定"], "參訪需要尊重社群對活動及影像公開範圍的決定。"],
];
for (const level of ["城市旅人", "國家達人"]) {
  concepts.forEach(([id, sub, q, choices, fact], i) => {
    // 兩層使用不同知識題，補足理解題而非複製同一題改難度標籤。
    if (level === "城市旅人" && i % 2) return;
    if (level === "國家達人" && !(i % 2)) return;
    if(practicalTopics.has(sub) && id !== 'museum-provenance') add(`concept-${id}`, level, 2, sub, sub, q, choices, fact, level === "城市旅人" ? ["小五"] : ["小六", "國一"]);
  });
}

function childSubtopic(q) {
  if (/餐|料理|食材|早餐|香料|小販/.test(q)) return 'health-food';
  if (/雙子|地標|建築|高塔|夜景/.test(q)) return 'monuments-landmarks';
  if (/旅館|住宿|民宿|飯店|溫泉/.test(q)) return 'accommodation';
  if (/手作|工藝|紋樣/.test(q)) return 'culture-etiquette';
  if (/照片|攝影|記錄|網路|手機/.test(q)) return 'digital-equipment';
  if (/船|港|碼頭/.test(q)) return 'cruises-boats';
  if (/古蹟|古城|古建築|修復|石牆/.test(q)) return "heritage-conservation";
  if (/博物館|展品|文物/.test(q)) return "museums-arts";
  if (/傳統|語言|招牌|習慣|飲食|節慶|編織|祭典|文化/.test(q)) return "culture-etiquette";
  if (/候鳥|濕地|森林|植物|樹木|野生|鳥|棲地|生態|動物|紅樹林/.test(q)) return "ecology-parks";
  if (/雨|季|晴|氣溫|涼|日曬|冰|乾燥|熱/.test(q)) return "climate-polar";
  if (/海|浪|沙灘|湖邊/.test(q)) return "oceans-coasts-islands";
  if (/山|高低|坡/.test(q)) return "mountains-volcanoes";
  if (/河|水質|上游|下游/.test(q)) return "rivers-lakes-waterfalls";
  if (/地圖|圖例|方向|路標/.test(q)) return "coordinates-time";
  if (/車|火車|輪椅|道路|路線|泥濘/.test(q)) return "ground-transport";
  if (/沙丘|沙漠/.test(q)) return "deserts-rocks";
  if (/都市|街道|農村|農田/.test(q)) return "population-urban";
  return "planning-itineraries";
}
for (const item of cases) {
  if(/網站|題庫|旅行問答|旅遊問答/.test(item.q)) continue;
  if(item.family.startsWith('child-') && /蓄熱|砍除|評估時|植物種類|緯度|曾有冰川|濕地能|主要可能改善|水質為何|河流跨越/.test(item.q)) continue;
  if (item.band !== 'advanced' && /填平|永久變大|地形變化|蓄熱|生態通道|泥沙|修復前|文物來自|上游排入|濕地可以|地面起伏|地面的高低|哪種地方通常|這種地方稱為|沙粒堆成|仍在實踐/.test(item.q)) continue;
  let {family, subtopic, index, band, q, options, fact} = item;
  let demand, level, allowed;
  if (band === "advanced") {
    demand = index < 12 ? 3 : 4;
    level = index < 4 ? "洲際領隊" : "環球旅行家";
    allowed = index < 4 ? grades.slice(7, 9) : index < 12 ? grades.slice(9, 14) : grades.slice(14);
  } else {
    subtopic = childSubtopic(q);
    family = `primary-${subtopic}`;
    demand = band === "early" ? 1 : 2;
    level = band === "early" ? "旅行新手" : band === "middle" ? "城市旅人" : "國家達人";
    allowed = band === "early" ? grades.slice(0, 3) : band === "middle" ? grades.slice(2, 5) : grades.slice(4, 7);
  }
  add(`geo-${item.family}-${index}`, level, demand, family, subtopic, q, options, fact, allowed);
}

writeFileSync(resolve(root, "data/learning-questions.json"), JSON.stringify(rows, null, 2) + "\n");
const path = resolve(root, "data/question-classification-overrides.json");
const classifications = JSON.parse(readFileSync(path, "utf8"));
for (const id of Object.keys(classifications)) if (id.startsWith("learning:")) delete classifications[id];
for (const q of rows) classifications[q.id] = { subtopic: q.subtopic, geography: { regions: ["全球／通用"] }, note: "原創旅行情境；適用年級逐題明列，旅行深度來自體驗與判斷。" };
writeFileSync(path, JSON.stringify(classifications, null, 2) + "\n");
console.log(`Wrote ${rows.length} travel questions with explicit grade ranges.`);
