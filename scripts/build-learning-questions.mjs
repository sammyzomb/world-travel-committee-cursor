import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// 情境均為教學用假設，規則及數據完整列在題內，不套用真實票價、簽證或安全規定。
const root = resolve(import.meta.dirname, "..");
const rows = [];
const grades = ["小一", "小二", "小三", "小四", "小五", "小六", "國一", "國二", "國三", "高一", "高二", "高三", "大一", "大二", "大三", "大四", "研一", "研二"];
function add(id, level, demand, family, subtopic, q, options, fact, allowedGrades = []) {
  if (new Set(options).size !== 4) throw Error(`Repeated options: ${id}`);
  rows.push({ id: `learning:${id}`, level, demand, family, subtopic, q, options, answer: 0, fact,
    region: "全球／通用", category: subtopic.includes("transport") || /planning|aviation|accommodation/.test(subtopic) ? "旅行知識" : "世界地理",
    questionType: "world-fact", grades: allowedGrades });
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
basics.forEach(([id, sub, q, choices, fact]) => add(`basic-${id}`, "旅行新手", 1, sub, sub, q, choices, fact));

const concepts = [
  ["rainshadow", "climate-polar", "山脈迎風坡雨量多、背風坡雨量少。若風向與海拔條件維持不變，較合理的解釋是？", ["氣流抬升後水氣凝結，越山後水氣減少", "所有高山兩側雨量必然相同", "背風坡因看不到太陽而乾燥", "經度是唯一決定降雨的因素"], "迎風坡氣流抬升形成降雨，越山後常較乾燥。"],
  ["watershed", "rivers-lakes-waterfalls", "兩條支流匯入同一主流。上游污染可能影響哪些地方？", ["沿水流方向的下游水域", "只影響地圖左邊的區域", "只影響距離最近的山頂", "不可能影響任何其他河段"], "在其他條件相同下，污染可能隨水流向下游傳輸。"],
  ["urban", "climate-polar", "同一夜晚，密集建築區比鄰近綠地更熱。哪項因素較能解釋這個差異？", ["鋪面與建築蓄熱及植被差異", "兩地必然位於不同大洲", "綠地一定海拔高數千公尺", "夜晚的地球停止自轉"], "鋪面蓄熱、植被及人為熱源均可能影響都市熱環境。"],
  ["scale-compare", "coordinates-time", "同一張紙上，1:10,000 與 1:100,000 地圖相比，前者通常如何？", ["呈現較小範圍但更多細節", "涵蓋十倍範圍且細節不變", "每公分代表較遠距離", "比例尺與細節完全無關"], "1:10,000 是較大比例尺，每公分代表較短實際距離。"],
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
  ["park-count", "ecology-parks", "兩個公園各拍到十隻鳥，但觀察時間分別是半小時與兩小時。直接說鳥一樣多，有何不足？", ["觀察努力不同，不能只比原始數量", "觀察時間永遠沒有影響", "鳥類只能在同一分鐘出現", "照片數量一定等於族群總量"], "需要考慮觀察時間、範圍及其他條件。"],
  ["gardens-water", "gardens-landscapes", "乾燥季節的園林需要節水，哪項做法較符合這個目標？", ["依植物需求與土壤水分調整灌溉", "所有區域全天持續灌溉", "只增加硬鋪面就視為達標", "只記錄售票收入"], "依實際需求與水分狀態調整用水，比持續灌溉更符合節水目標。"],
  ["digital-map", "digital-equipment", "山區可能沒有行動網路。出發前下載離線地圖的主要用途是？", ["在沒有連線時仍可查看已下載範圍", "保證道路與天氣永遠不變", "取代所有導航判斷", "讓手機永遠不會沒電"], "離線地圖可提供已下載資料，但仍需注意路況、電量及判斷。"],
  ["local-culture", "culture-etiquette", "某社群希望祭典部分活動不公開拍攝。參訪安排較應如何處理？", ["事先確認公開範圍並尊重社群決定", "所有傳統都必須完全公開", "只以相機設備決定拍攝範圍", "只要買票就可改變所有規定"], "參訪需要尊重社群對活動及影像公開範圍的決定。"],
];
for (const level of ["城市旅人", "國家達人"]) {
  concepts.forEach(([id, sub, q, choices, fact], i) => {
    // 兩層使用不同知識題，補足理解題而非複製同一題改難度標籤。
    if (level === "城市旅人" && i % 2) return;
    if (level === "國家達人" && !(i % 2)) return;
    add(`concept-${id}`, level, 2, sub, sub, q, choices, fact);
  });
}

const time = minutes => `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
// 每組三種認知層級使用不同數據及不同解題條件；family 讓抽題能限制同一類情境。
for (let v = 0; v < 12; v++) {
  for (const demand of [3, 4]) {
    const level = demand === 3 && v % 3 === 0 ? "洲際領隊" : "環球旅行家";
    const allowed = level === "洲際領隊" ? [] : demand === 3 ? grades.slice(9, 14) : grades.slice(14);
    const prefix = `scenario-${demand}-${v}`;
    const n = 12 + v, c = 70 + v * 5;
    const emit = (key, family, sub, q, opts, fact) => add(`${prefix}-${key}`, level, demand, family, sub, q, opts, fact, allowed);

    const aCost = c * 3 + 40, bCost = c * 3 + 20, cap = 80 + v;
    emit("route", "route-tradeoff", "ground-transport",
      `比較三條交通路線：甲費用 ${aCost} 元、${cap - 5} 分、碳排 ${demand === 4 ? 18 : 12} 單位；乙 ${bCost} 元、${cap + 5} 分、碳排 8；丙 ${aCost + 20} 元、${cap - 8} 分、碳排 9。必須在 ${cap} 分內抵達${demand === 4 ? "且碳排不超過 10" : ""}，再選費用最低者。應選哪條？`,
      [demand === 4 ? "丙" : "甲", demand === 4 ? "甲" : "丙", "乙", "三條都不合格"],
      demand === 4 ? "甲的碳排超標，乙超時，只有丙符合兩項硬性限制。" : "乙超時；甲與丙都符合時間限制，甲費用較低。");

    const departure = 9 * 60 + v * 5, flight = 150 + v * 3, origin = 8, dest = demand === 4 ? -4 : 2;
    const arrival = departure + flight + (dest - origin) * 60;
    const finalMinutes = arrival + (demand === 4 ? 65 : 0);
    const nextDay = finalMinutes < 0 ? "前一日 " : finalMinutes >= 1440 ? "次日 " : "同日 ";
    const ansTime = ((finalMinutes % 1440) + 1440) % 1440;
    emit("clock", "timezone-calculation", "coordinates-time",
      `出發地使用 UTC+8，目的地使用 UTC${dest >= 0 ? "+" : ""}${dest}，兩地均不採夏令時間。當地 ${time(departure)} 起飛，飛行 ${flight} 分鐘。${demand === 4 ? "落地後辦理入境需 35 分，前往車站再需 30 分。最早何時到達車站？" : "目的地鐘面何時抵達？"}`,
      [nextDay + time(ansTime), nextDay + time(ansTime + 60), nextDay + time(ansTime + 120), nextDay + time((ansTime + 1440 - 60) % 1440)],
      `先換算時區：出發鐘面加飛行時間，再加目的地與出發地的 UTC 偏移差${demand === 4 ? "，最後加 65 分鐘地面作業" : ""}，得到 ${nextDay}${time(ansTime)}。`);

    const people = n * 3 + 1, vehicle = 9 + v % 3, fee = 400 + v * 30;
    const trips = Math.ceil(people / vehicle), shuttleCost = trips * fee;
    const rebate = demand === 4 ? Math.floor(people / 10) * 90 : 0;
    const railCost = people * 65 - rebate;
    const correctMode = shuttleCost < railCost ? "包車" : "鐵路";
    emit("ticket", "transport-cost", "ground-transport",
      `${people} 人同行；一輛包車可載 ${vehicle} 人，每輛 ${fee} 元，必須一次把所有人送到目的地。鐵路每人 65 元${demand === 4 ? "；每滿 10 人整團總費用折 90 元，可累計，不足 10 人不折。除此無其他折扣" : ""}。較便宜的方式與總費用為？`,
      [`${correctMode}，${Math.min(shuttleCost, railCost)} 元`, `${correctMode === "包車" ? "鐵路" : "包車"}，${Math.max(shuttleCost, railCost)} 元`, `包車，${(trips - 1) * fee} 元`, `鐵路，${railCost + fee} 元`],
      `包車需要向上取整為 ${trips} 輛，費用 ${shuttleCost} 元；鐵路原價 ${people * 65} 元${rebate ? `，扣除 ${Math.floor(people / 10)} 組折抵共 ${rebate} 元` : ""}，實付 ${railCost} 元，較便宜的是${correctMode}。`);

    const deadline = 13 * 60 + v * 5, walk = 18 + v, visit = 45 + v, buffer = demand === 4 ? 20 : 10;
    const latest = deadline - walk - visit - buffer;
    emit("schedule", "schedule-backward", "planning-itineraries",
      `博物館參觀需 ${visit} 分鐘，再步行 ${walk} 分鐘到車站；火車 ${time(deadline)} 出發，規劃規則要求提早 ${buffer} 分鐘到站。最晚何時開始參觀才能符合全部條件？`,
      [time(latest), time(latest + 5), time(latest + 10), time(latest + 15)],
      `從 ${time(deadline)} 倒推 ${buffer}+${walk}+${visit} 分鐘，最晚 ${time(latest)} 開始參觀。`);

    const visitors = 90 + v * 6, dwell = demand === 4 ? 45 : 30, slots = 3, simultaneous = 40 + v * 2;
    const interval = demand === 4 ? 30 : 40, overlap = dwell > interval ? 2 : 1;
    const perSlot = Math.floor(simultaneous / overlap), totalAdmission = perSlot * slots;
    emit("capacity", "site-capacity", "heritage-conservation",
      `古蹟每批停留 ${dwell} 分鐘，每 ${interval} 分鐘安排一批，批次人數相同。任一時刻在場人數不可超過 ${simultaneous} 人；當日只開放三批。${visitors} 人申請，這種排程最多可接受多少人？`,
      [`${Math.min(visitors, totalAdmission)} 人`, `${simultaneous} 人`, `${Math.min(visitors, totalAdmission) + 3} 人`, `${Math.min(visitors, totalAdmission) - 3} 人`],
      `最多有 ${overlap} 批重疊；每批最多 ${perSlot} 人，三批共 ${totalAdmission} 個名額，且不能超過申請人數 ${visitors}。`);

    const rainA = 30 + v * 5, rainB = 90 + v * 4;
    if (demand === 4) {
      const weight = 4 + v * 2;
      const scoreA = rainA + weight * (30 - 20), scoreB = rainB + weight * (22 - 20);
      if (scoreA === scoreB) throw Error('climate score tie');
      const chosen = scoreA < scoreB ? "甲" : "乙";
      emit("climate", "climate-comparison", "climate-polar",
        `教學情境：甲、乙兩地年雨量均為 1,200 毫米。旅行月甲降雨 ${rainA} 毫米、平均氣溫 30°C；乙 ${rainB} 毫米、22°C。兩地都符合不超過 32°C 的限制。再依題定指標「月雨量＋${weight}×超過 20°C 的度數」選數值較低者，應選哪地及指標值？`,
        [`${chosen}，${Math.min(scoreA,scoreB)}`, `${chosen === "甲" ? "乙" : "甲"}，${Math.max(scoreA,scoreB)}`, `甲，${rainA}`, `乙，${rainB}`],
        `甲為 ${rainA}+${weight}×10=${scoreA}；乙為 ${rainB}+${weight}×2=${scoreB}，選${chosen}。這是題定加權指標，並非通用的氣候舒適度標準。`);
    } else {
      emit("climate", "climate-comparison", "climate-polar",
        `兩地年雨量均為 1,200 毫米。旅行月份甲地雨量 ${rainA} 毫米、平均氣溫 30°C；乙地 ${rainB} 毫米、平均氣溫 22°C。旅客要求平均氣溫不超過 32°C，符合後再選該月雨量較少者。應如何選擇？`,
        ["選甲；氣溫均合格且甲較少雨", "選乙；只看年雨量", "年雨量相同，所以各月份也完全相同", "缺少經度，所以完全不能依所給條件比較"],
        "兩地均在 32°C 以下；比較旅行月份雨量，甲較少。年雨量不能代替月分布。");
    }

    const units = 4 + v % 4, groupA = 8 + v, groupB = 3 + v % 3;
    const hoursImpactA = demand === 4 ? 2 : 1, hoursImpactB = demand === 4 ? 4 : 1;
    const aImpact = groupA * units * hoursImpactA, bImpact = groupB * (units + 3) * hoursImpactB;
    const chosen = aImpact < bImpact ? "甲" : "乙";
    emit("ecology", "environment-indicators", "ecology-parks",
      `保護區規劃規則把「人數×每人每小時擾動單位×時數」當作總擾動指標。甲團 ${groupA} 人、每人每小時 ${units} 單位、停留 ${hoursImpactA} 小時；乙團 ${groupB} 人、每人每小時 ${units + 3} 單位、停留 ${hoursImpactB} 小時。${demand === 4 ? "兩團路線相同，僅就此指標" : "依題定指標"}，哪團總擾動較低？`,
      [`${chosen}，總量 ${Math.min(aImpact, bImpact)}`, `${chosen === "甲" ? "乙" : "甲"}，總量 ${Math.max(aImpact, bImpact)}`, "只比較每人數值就一定選甲", "人數不同，所以題定指標無法計算"],
      `甲為 ${groupA}×${units}×${hoursImpactA}=${aImpact}；乙為 ${groupB}×${units + 3}×${hoursImpactB}=${bImpact}。只按題定指標，${chosen}較低，不據此宣稱全部環境影響都相同。`);

    const length = 3 + v % 5, scale = 25000 + v * 5000, distance = length * scale / 100000;
    const travelMinutes = demand === 4 ? (distance / 2 / 3 + distance / 2 / 6) * 60 : distance / 5 * 60;
    const stop = demand === 4 ? 18 : 0;
    const duration = Math.round((travelMinutes + stop) * 10) / 10;
    emit("map", "map-scale", "coordinates-time",
      `比例尺 1:${scale} 的地圖上，路線量得 ${length} 公分。假設路線距離依比例尺換算、${demand === 4 ? "前半段距離速度 3 公里／小時，後半段 6 公里／小時，途中停留 18 分鐘" : "全程速度固定 5 公里／小時"}，全程需多少分鐘？`,
      [`${duration} 分鐘`, `${duration + 10} 分鐘`, `${duration + 20} 分鐘`, `${duration + 30} 分鐘`],
      `實際距離 ${length}×${scale} 公分＝${distance} 公里；${stop ? "兩半段分別除以各自速度，乘 60，再加 18 分鐘停留" : "距離除速度再乘 60"}，共 ${duration} 分鐘。`);

    const observedA = 12 + v * 2, hoursA = 2, observedB = 9 + v, hoursB = 3;
    emit("evidence", "observation-evidence", "ecology-parks",
      `相同面積與觀察方法下，甲區 ${hoursA} 小時記錄 ${observedA} 次鳥類出現，乙區 ${hoursB} 小時記錄 ${observedB} 次。${demand === 4 ? "每次記錄可能重複拍到同一隻鳥；哪項結論最有根據？" : "比較每小時的記錄率，何者較高？"}`,
      [demand === 4 ? "甲的記錄率較高，但不能直接等同獨立個體數較多" : "甲較高", demand === 4 ? "甲必然有較多獨立個體" : "乙較高", "兩區記錄率必然完全相同", "乙觀察更久，所以每小時記錄率必然較高"],
      `甲每小時 ${observedA / hoursA} 次，乙每小時 ${observedB / hoursB} 次；這是記錄率，若個體可重複出現，不能直接推定族群個體數。`);

    const opening = 10 * 60 + v * 5, tideEnd = opening + 100, segment = 30 + v, returnTrip = 30 + v, wait = demand === 4 ? 25 : 10;
    const windowStart = opening + wait, finish = windowStart + segment + returnTrip;
    emit("coast", "coast-window", "oceans-coasts-islands",
      `教學情境：海岸步道只允許在 ${time(opening)} 至 ${time(tideEnd)} 的指定時窗通行；入場前排隊 ${wait} 分鐘，去程與回程各需 ${segment} 分。若 ${time(opening)} 到入口並立即排隊，何時回到入口，是否仍在時窗內？`,
      [`${time(finish)}，${finish <= tideEnd ? "在時窗內" : "已超出時窗"}`, `${time(finish - wait)}，在時窗內`, `${time(finish + 30)}，在時窗內`, `${time(finish - segment)}，已超出時窗`],
      `完成時間是 ${time(opening)} 加排隊 ${wait} 分及往返 ${segment * 2} 分，得到 ${time(finish)}，再與 ${time(tideEnd)} 比較。此為題定時窗，不能代替真實潮汐與現地安全公告。`);

    const A = 40 + v * 2, B = 20 + v, transfer = demand === 4 ? 25 : 5, direct = A + B + 10;
    emit("itinerary", "connection-comparison", "planning-itineraries",
      `前往景點有兩條路：直達共 ${direct} 分鐘；轉乘路線第一段 ${A} 分、第二段 ${B} 分，兩段間需 ${transfer} 分候車。所有條件已列出，不計其他延誤。哪條路線總時間較短，差多少？`,
      [demand === 4 ? "直達較短，差 15 分" : "轉乘較短，差 5 分", demand === 4 ? "轉乘較短，差 15 分" : "直達較短，差 5 分", "兩條完全相同", "轉乘較短，差 10 分"],
      `轉乘共 ${A}+${B}+${transfer}=${A + B + transfer} 分；直達 ${direct} 分，${demand === 4 ? "直達短 15 分" : "轉乘短 5 分"}。`);

    const residual = 60 + v * 2, measures = [demand === 4 ? residual + 3 : residual - 5, residual + 5, demand === 4 ? residual + 8 : residual - 8];
    emit("heritage", "conservation-decision", "heritage-conservation",
      `古建築修復的題定規則是：保留原材料至少 ${residual}%，並可移除新增部分而不傷原件；合格後選成本最低。甲保留 ${measures[0]}%、${demand === 4 ? "不可移除" : "可移除"}、成本 80；乙保留 ${measures[1]}%、可移除、成本 100；丙保留 ${measures[2]}%、可移除、成本 ${demand === 4 ? 110 : 60}。${demand === 4 ? "應選哪方案？" : "哪方案合格？"}`,
      [demand === 4 ? "乙" : "只有乙", demand === 4 ? "甲" : "甲與乙", demand === 4 ? "丙" : "只有丙", "三方案都合格且成本相同"],
      demand === 4 ? "甲不符合可移除條件；乙、丙保留比例及可移除條件均合格，乙成本較低，故選乙。" : "先檢查硬性保存條件；甲、丙保留比例不足，只有乙合格。低成本不能抵銷保存條件不符。實務保存仍需專業評估。" );
  }
}

// 國中以單一步驟應用題承接理解題，使用獨立情境而非地標冷知識。
for (let v = 0; v < 48; v++) {
  const topic = v % 6, n = 12 + v;
  const level = v < 24 ? "城市旅人" : "國家達人";
  const sub = ["coordinates-time", "ground-transport", "planning-itineraries", "heritage-conservation", "ecology-parks", "climate-polar"][topic];
  const family = ["map-scale", "transport-cost", "schedule-backward", "site-capacity", "observation-evidence", "climate-comparison"][topic];
  const specs = [
    [`地圖比例尺為 1:100,000，圖上兩點距離 ${n} 公分，換算實際距離是多少？`, [`${n} 公里`, `${n * 10} 公里`, `${n * 100} 公里`, `${n / 10} 公里`], "比例尺中圖上 1 公分代表地面 100,000 公分，即 1 公里。"],
    [`巴士單程每人 ${n} 元，${n + 2} 人一起搭車，所有人票價相同且無折扣，總票價多少？`, [`${n * (n + 2)} 元`, `${n * (n + 2) + n} 元`, `${n * (n + 2) - n} 元`, `${n + n + 2} 元`], `人數乘單價為 ${n + 2}×${n}=${n * (n + 2)} 元。`],
    [`博物館 ${time(12 * 60 + n)} 開始導覽，從車站步行需 ${n} 分鐘，且需提早 10 分鐘抵達。最晚何時離開車站？`, ["11:50", "12:00", "12:10", "12:20"], "開始時間減步行時間，再減提早報到的 10 分，為 11:50。"],
    [`古蹟每批最多 ${n} 人，同時只接待一批。${n * 2 + 1} 人至少需分幾批才能全數參觀？`, ["3 批", "2 批", "4 批", "1 批"], "兩批只能容納總人數減一人，因此須分三批。"],
    [`相同觀察範圍與方法下，${n} 小時記錄 ${n * 3} 次鳥類出現，平均每小時多少次？`, ["3 次", "2 次", "4 次", `${n} 次`], "記錄總數除以觀察時數，得到每小時 3 次；不代表有 3 個獨立個體。"],
    [`某地旅行月份中，甲月降雨 ${n} 毫米，乙月 ${n * 3} 毫米。其他條件相同，只依雨量選較乾燥的月份應選？`, ["甲月", "乙月", "兩月雨量完全相同", "雨量資料不可能用來比較"], "比較給定月雨量，甲月較少；不宣稱當月每一天都無雨。"],
  ][topic];
  add(`apply-${v}`, level, 2, family, sub, ...specs);
}

// 以上算術與條件題的「正解」均由題內資料定義，逐題保留推導，避免為湊題量拼接城市與地標。
writeFileSync(resolve(root, "data/learning-questions.json"), JSON.stringify(rows, null, 2) + "\n");
const path = resolve(root, "data/question-classification-overrides.json");
const classifications = JSON.parse(readFileSync(path, "utf8"));
for (const q of rows) classifications[q.id] = { subtopic: q.subtopic, geography: { regions: ["全球／通用"] }, note: "教學用情境，條件完整列於題內；認知層級與題目推導分開記錄。" };
writeFileSync(path, JSON.stringify(classifications, null, 2) + "\n");
console.log(`Wrote ${rows.length} learning questions with explicit conditions and explanations.`);
