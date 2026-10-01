import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const refs={
  ocean:['National Geographic：Ocean Currents','https://education.nationalgeographic.org/resource/ocean-currents/','fact'],
  climate:['National Geographic：All About Climate','https://education.nationalgeographic.org/resource/all-about-climate/','fact'],
  plates:['National Geographic：Plate Tectonics','https://education.nationalgeographic.org/resource/plate-tectonics-video/','fact'],
  urban:['世界銀行：都市人口比例的定義','https://databank.worldbank.org/metadataglossary/world-development-indicators/series/SP.URB.TOTL.IN.ZS','fact'],
  water:['世界銀行：每人內部可再生淡水資源','https://databank.worldbank.org/metadataglossary/sustainable-development-goals-%28sdgs%29/series/ER.H2O.INTR.PC','fact'],
  igeo:['iGeo：讀圖與問題解決題型設計','https://geoolympiad.org/wp-content/uploads/2025/04/Test-Guidelines-revised-2025.pdf','design'],
  seterra:['Seterra：全球地理測驗題型設計','https://www.geoguessr.com/es/l/wor','design'],
};
for(const [key,id,name] of [['angkor',668,'吳哥'],['machu',274,'馬丘比丘'],['serengeti',156,'塞倫蓋提'],['venice',394,'威尼斯與潟湖'],['reef',154,'大堡礁']])refs[key]=[`UNESCO：${name}`,`https://whc.unesco.org/en/list/${id}/`,'fact'];
const rows=[];
const levels={1:'旅行新手',2:'城市旅人',3:'洲際領隊',4:'環球旅行家'};
function add(id,source, demand, family, subtopic, region,q,options,fact,fictional=false,level=levels[demand]){
  if(options.length!==4||new Set(options).size!==4)throw Error(id+' needs four unique options');
  if (demand === 3 && ['population-balance','machu-values','map-river-network'].includes(id)) level='環球旅行家';
  const grades=level==='環球旅行家' ? demand===4 ? ['大三','大四','研一','研二'] : ['高一','高二','高三','大一','大二'] : [];
  rows.push({id:'source:'+id,sourceGroup:source==='igeo'?'iGeo':source==='seterra'?'Seterra':['urban','water'].includes(source)?'World Bank':['ocean','climate','plates'].includes(source)?'National Geographic':'UNESCO',level,demand,family,subtopic,region,q,options,answer:0,fact,kind:'choice',category:['angkor','machu','serengeti','venice','reef'].includes(source)?'世界遺產':'世界地理',questionType:'world-fact',grades,fictionalScenario:fictional,reviewedAt:'2026-10-01',references:[{title:refs[source][0],url:refs[source][1],role:refs[source][2]}]});
}
add('ocean-motion','ocean',1,'ocean-motion','oceans-coasts-islands','全球／通用','漂流物隨海水持續朝某方向移動，與海面上下起伏不同。這種水體的定向流動稱為？',['洋流','潮差','降水','海拔'],'洋流指海水的定向流動；浪、潮汐與洋流是不同但可能互相影響的海洋現象。');
add('weather-sample','climate',2,'climate-time-scale','climate-polar','北美洲','研究加拿大某城是否有雨季，甲資料是一週天氣，乙資料是多年各月雨量。哪份更適合回答這個問題？',['乙，能比較多年季節分布','甲，一週足以代表所有年份','兩份都只需看最高一天雨量','兩份只要城市名稱相同就等價'],'氣候需要較長時間的統計；這個題定資料比較不是加拿大某城的實際雨量紀錄。',true);
add('rainshadow-reversal','climate',3,'rainshadow-process','climate-polar','全球／通用','假設山脈兩側海拔相近，濕潤氣流從西向東，西坡雨量多、東坡少。若濕潤氣流方向改為東向西，其他條件相同，最合理的預期是？',['較多降雨的一側可能轉為東坡','東坡一定永久乾燥','兩側雨量只由國界決定','風向改變只能影響氣溫'],'迎風坡的抬升與凝結可增加降雨；迎風方向改變時，雨影分布也可能改變，不表示任何地點必然有固定雨量。',true);
add('ocean-density','ocean',4,'ocean-density-evidence','oceans-coasts-islands','南極洲','南極海洋教學實驗：甲樣本低溫高鹽、乙高溫低鹽，甲密度較高。研究者想分辨溫度與鹽度各自的作用。下一組實驗如何最能補足證據？',['固定鹽度比較溫度，再固定溫度比較鹽度','只再測一次甲乙，便能分開兩個因素','只增加樣本容量，不控制任何條件','以取樣國家的名稱解釋密度'],'溫度與鹽度都可能影響海水密度；原比較同時改變兩因素，不能拆開各自作用。需要控制變因，題內樣本為假設。',true);
add('seafloor-evidence','plates',4,'tectonic-evidence','mountains-volcanoes','全球／通用','教學資料：海底山脊兩側岩石年齡都隨離脊距離增加，且形成大致對稱的年代帶。這組證據較支持哪項解釋，仍須避免哪個過度推論？',['支持海底擴張；不能僅憑年齡帶預測下一次地震日期','支持海底擴張；能精確推定下一次地震日期','支持海底靜止；年代差完全證明沒有板塊運動','支持海底靜止；只需知道最近城市名稱'],'張裂邊界可形成新洋殼；兩側年齡與位置的關係支持擴張過程，並不是地震日期預測工具。年代帶是教學用資料。',true);

add('angkor-system','angkor',2,'heritage-water-system','historic-sites','亞洲','吳哥的古代城市除了寺廟，還有水庫、渠道與堤壩。若研究古城如何運作，哪組資料較完整？',['寺廟、聚落與水利設施的關係','只記錄寺廟最高屋頂','只比較現代門票價格','只數紀念品店的招牌'],'UNESCO 的吳哥資料同時記錄寺廟、城市布局、水利設施與居住聚落；理解古城不能只看單座建築。');
add('machu-values','machu',3,'mixed-heritage-values','heritage-conservation','南美洲','馬丘比丘同時具有文化與自然遺產價值。假設保存計畫只修復石造建築，卻未評估周邊山地棲地與步道影響，主要缺少什麼？',['自然環境與建築保存的整合評估','只缺更多建築名稱的翻譯','文化價值會自動取代自然價值','只要建築修好就能證明全部價值已保存'],'UNESCO 將馬丘比丘列為文化與自然兼具的複合遺產；題定計畫仍需評估兩類價值之間的關係。',true);
add('serengeti-corridor','serengeti',3,'migration-connectivity','ecology-parks','非洲','塞倫蓋提的動物遷移跨越大片草原。假設新道路把遷移路線分成兩段，保護目標是維持動物取得草地與水源的移動，評估道路時應優先納入？',['道路對遷移路線連通性的影響','道路是否方便拍攝車牌','僅看國家公園入口的遊客數','只計算道路離售票亭多遠'],'UNESCO 強調塞倫蓋提遷移生態系的完整性；園界內外的連通都會影響動物移動，題定道路不是實際已核定工程。',true);
add('venice-metrics','venice',4,'living-city-evaluation','heritage-conservation','歐洲','威尼斯教學案例：觀光收入上升，但常住居民與日常商店減少。市府以收入上升宣稱「文化保存已全面改善」。哪項評估最能檢驗這個主張？',['同時追蹤居民生活功能、建築狀況與收入，分開判讀','只把觀光收入改用另一種貨幣','只比較不同年份的廣告曝光','收入上升本身足以證明所有保存目標'],'UNESCO 指出觀光壓力可能改變威尼斯居住與生活功能；單一收入指標不能證明整體文化與社會完整性。數據趨勢為題定情境。',true);
add('reef-catchment','reef',4,'ecosystem-boundary','ecology-parks','大洋洲','大堡礁教學情境：管理單位嚴格限制海上活動，但流域的土地利用改變使入海水質惡化。若目標是改善生態系整體狀況，哪種推論與措施較合理？',['海域管制仍有價值，但需結合上游流域與水質管理','海上活動受管制即可證明上游不會影響珊瑚','只把保護區面積重新換算成公頃','只禁止拍攝水面就能消除陸地來源壓力'],'UNESCO 的大堡礁說明涵蓋鄰近流域、海岸與海洋的連結；生態過程不完全受行政或保護區邊界限制。情境不是最新水質監測報告。',true);

add('urban-ratio','urban',2,'population-denominator','population-urban','全球／通用','教學用甲國有 1,000 萬人，其中 600 萬住在都市；乙國有 200 萬人，其中 160 萬住在都市。哪個判讀同時區分比例與人數？',['乙的都市人口比例較高，甲的都市人口數較多','乙的都市人口比例與人數都較高','甲的都市人口比例與人數都較高','兩國都市人口比例相同'],'甲的比例為 60%、乙為 80%；都市人口數分別是 600 萬與 160 萬。數字是教學假設，不代表任何真實國家。',true);
add('urban-definition','urban',4,'cross-country-definition','population-urban','全球／通用','比較兩國都市人口比例時，甲按行政區劃界定都市，乙按人口密度界定，資料年份也不同。要評估「乙一定更都市化」，最合理的下一步是？',['確認分類定義與年份，建立可比較口徑後再判讀','只把百分比的小數位增加','把國土面積較小者直接視為更都市化','只要兩者都有百分號就能直接下結論'],'世界銀行說明都市人口採各國統計機關定義，跨國口徑可能不同；年份差異也需要另行處理。');
add('water-flow','water',2,'water-resource-definition','resources-development','全球／通用','「每人內部可再生淡水資源」是年度水資源量除以人口。這個指標能直接當成每戶每天自來水供應量嗎？',['不能，資源量與輸配、可近性及實際供水不同','能，所有年度水資源都會立即送入每戶','能，只要改寫成公升就代表每天供水','能，人口較少就能證明每戶從未缺水'],'世界銀行的這項指標描述內部年度可再生水資源與人口的比值，並不是自來水服務或每戶用水量。',false,'國家達人');
add('water-denominator','water',3,'resource-denominator-change','resources-development','全球／通用','教學假設：某國年度內部可再生淡水總量不變，人口由 500 萬增至 1,000 萬。每人資源指標減半，能單憑這項變化說總水資源量也減半嗎？',['不能，人口分母增加即可使每人指標下降','能，每人值減半必定代表總量減半','能，人口變化不會影響任何每人指標','不能，因為所有每人指標都沒有用途'],'總量除以人口；分母加倍、分子不變，比值減半。需把指標變化與其分子、分母的變化分開。',true);
add('weighted-water','water',4,'weighted-country-comparison','resources-development','全球／通用','假設甲國人口 100 萬、每人年度內部可再生淡水 1,000 立方公尺；乙國人口 900 萬、每人 100 立方公尺。合併後的每人值是多少，且能否由此推定兩國供水服務相同？',['190 立方公尺；不能推定服務相同','550 立方公尺；不能推定服務相同','190 立方公尺；能推定服務相同','550 立方公尺；能推定服務相同'],'先還原總量：10 億加 9 億立方公尺，再除以 1,000 萬人口，得到 190。資源指標不是供水服務指標；數字均為教學假設。',true);

add('tourism-causality','igeo',4,'tourism-policy-evidence','planning-itineraries','全球／通用','假設古城分流措施上路後，中心遊客數下降，鄰鎮遊客增加；同時有新鐵路開通。研究者想知道分流措施的效果，哪種設計能較好處理這個問題？',['比較多地上路前後趨勢，納入鐵路變化與未實施地區','只拍一張中心街道照片','只比較兩地目前的紀念品售價','把同時發生的新鐵路視為不可能有影響'],'分流與鐵路變化同時出現，不能只用前後差當成單一措施的因果效果。這是原創情境，參考 iGeo 的資料分析與問題解決設計，並非原試題。',true);
add('urban-access','igeo',3,'urban-accessibility','ground-transport','全球／通用','教學路網：旅館到博物館甲線 15 分但必經階梯，乙線 20 分且全程無階梯。同行者使用輪椅，題定要求全程無階梯，再選耗時最短的合格路線，應選？',['乙線，20 分','甲線，15 分','兩線都不合格','只依地圖直線距離，無法使用題定資料'],'先檢查無階梯的硬性條件，再比較合格路線耗時。這是原創路網情境，不代表任何城市的現地無障礙資訊。',true);
add('flood-exposure','igeo',4,'hazard-exposure-vulnerability','hazards-risk','全球／通用','教學洪災評估：甲區淹水機率較高，但住戶少且撤離容易；乙區機率較低，住戶多且撤離困難。兩區沒有損失或脆弱度的量化資料。能否只依機率決定哪區總風險較高？',['不能；還需暴露量、脆弱度與損失資料','能；機率較高者的所有風險一定較高','能；只比較兩區名稱長短即可','不能；這表示洪災機率完全沒有用途'],'危害機率、暴露與脆弱度共同影響風險；給定資訊不足以排列總風險。參考 iGeo 危害管理與證據分析主題，情境為原創。',true);
add('population-balance','igeo',3,'population-components','population-urban','全球／通用','假設某城一年出生 8,000 人、死亡 5,000 人、移入 2,000 人、移出 6,000 人，不計其他變動。人口淨變化及較合理的解釋是？',['減少 1,000 人；自然增加被淨移出抵銷','增加 3,000 人；只需計算出生與死亡','增加 10,000 人；只需計算出生與移入','減少 4,000 人；只需計算移入與移出'],'自然增加 3,000 人，淨移出 4,000 人，合計減少 1,000 人。所有數字為教學假設，題型參考 iGeo 人口變化主題。',true);
add('landuse-control','igeo',4,'land-use-study-design','hazards-risk','全球／通用','假設流域甲新增大量硬鋪面後洪峰上升，但同年暴雨也比以前強。流域乙未新增硬鋪面。要檢驗土地利用的作用，哪組資料最有幫助？',['兩流域多年降雨、流量與土地利用資料，確認可比較條件','只有甲流域本年度洪峰的一張照片','只有兩流域遊客人數','直接把甲全部洪峰變化歸因於硬鋪面'],'降雨強度與土地利用可能共同改變逕流；需要比較資料與控制條件，不能由單一前後變化直接分離因素。情境為原創，iGeo 是題型參考。',true);

add('coordinate-reading','seterra',1,'hemisphere-reading','coordinates-time','全球／通用','觀測點 P 的資料為北緯 20 度、東經 30 度。它位於哪一組半球？',['北半球與東半球','北半球與西半球','南半球與東半球','南半球與西半球'],'北緯表示赤道以北，東經表示本初子午線以東。觀測點為假設；參考 Seterra 的全球地圖學習方式。',true);
add('map-route-heading','seterra',2,'relative-map-position','coordinates-time','全球／通用','假設地圖北方朝上，甲點在北緯 10 度、東經 20 度；乙點在北緯 20 度、東經 30 度，兩點距離不跨日期變更線。乙在甲的哪個方位？',['東北方','西北方','東南方','西南方'],'乙的緯度往北增加、經度往東增加，因此相對方位為東北；座標是教學假設。',true);
add('map-river-network','seterra',3,'drainage-network','rivers-lakes-waterfalls','全球／通用','教學河網：水流依 A→B→D 入海，另一支流依 C→D 入海，且沒有逆流。若污染物從 B 隨水向下游傳輸，哪個判讀符合這張河網？',['D 可能受影響，但不能由箭頭推出 A 或 C 也受影響','A 一定先受影響，因為字母排在前面','C 一定受影響，因為它也在同一張圖上','所有點必定同時受影響'],'先讀水流方向再判斷連通路徑；D 在 B 下游，圖定方向沒有從 B 回到 A 或轉入 C 的路徑。河網為原創示意。',true);
add('map-path-comparison','seterra',3,'network-route-choice','ground-transport','全球／通用','教學路網，線段數字代表公里：A–B 為 3、B–D 為 8、A–C 為 6、C–D 為 2，除此沒有道路。若從 A 到 D 只比較總路程，哪條路較短，差多少？',['經 C，短 3 公里','經 B，短 3 公里','經 C，短 6 公里','兩條相同'],'經 B 是 3＋8＝11 公里，經 C 是 6＋2＝8 公里，差 3 公里；圖為原創教學路網，不是實際道路。',true);
add('map-sampling','seterra',4,'map-generalization','coordinates-time','全球／通用','假設全球概覽地圖省略小島與狹窄水道，區域詳圖保留它們。研究者僅因概覽圖上看不到連接水道，就宣稱兩片水域完全不相通。哪種查核最合理？',['檢查比例尺、圖例與省略規則，再以詳圖核對連通','只把概覽圖放大，便能恢復原本省略的資料','只比較兩張圖的檔案大小','只要概覽圖涵蓋全球，其細節一定比區域圖完整'],'概覽圖會概括與省略細節，放大顯示不會補回沒有收錄的資料。情境原創；Seterra 用作全球地圖題型參考。',true);

const classifications=JSON.parse(readFileSync(resolve(root,'data/question-classification-overrides.json'),'utf8'));
for(const q of rows)classifications[q.id]={subtopic:q.subtopic,geography:{regions:[q.region]},note:'來源逐題記錄；fact 為概念或案例依據，design 僅為題型參考。假設資料不當成官方統計。'};
writeFileSync(resolve(root,'data/source-questions.json'),JSON.stringify(rows,null,2)+'\n');
writeFileSync(resolve(root,'data/question-classification-overrides.json'),JSON.stringify(classifications,null,2)+'\n');
console.log(`Wrote ${rows.length} individually authored questions across five source groups.`);
