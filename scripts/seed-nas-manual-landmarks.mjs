#!/usr/bin/env node
/** 將高信心 NAS 路徑寫入 data/nas-landmark-map.json entries。 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const mapPath = resolve(root, "data/nas-landmark-map.json");

const manualPaths = {
  紅場:
    "\\\\192.168.3.3\\【行程總彙】\\1-4北極光\\@照片圖庫\\@領隊\\20260123 摩爾曼斯克11日-馬筠家\\照片\\D3莫斯科(克里姆林宮、紅場、莫斯科地鐵)\\LINE_ALBUM_20260125_260213_54.jpg",
  科隆大教堂:
    "\\\\192.168.3.3\\【行程總彙】\\4-1.歐洲\\●中西南歐\\德國\\科隆Cologne\\主教堂\\科隆主教座堂_shutterstock_675990700.jpg",
  班夫國家公園:
    "\\\\192.168.3.3\\【行程總彙】\\4-2.北美洲\\1.加拿大行程\\@照片圖庫\\@領隊\\20180901加拿大黃刀鎮14日-江上易\\班夫\\IMG_E4084.JPG",
  貝加爾湖:
    "\\\\192.168.3.3\\【行程總彙】\\1-3西伯利亞鐵路+俄羅斯\\@照片圖庫\\20240622貝加爾湖 奧利洪島 烏什卡尼島 8 + 1日-劉志鵬\\DAY3\\貝加爾湖-奧利洪島往烏斯季巴爾古津船-領隊劉志鵬 (10).JPEG",
  米爾福德峽灣:
    "\\\\192.168.3.3\\【行程總彙】\\3.大洋洲-紐 澳 帛琉 南太\\1-紐西蘭行程\\@照片圖庫\\20250206紐西蘭20日-陳妍方\\0209 米爾福德峽灣(遊船) 皇后鎮\\米爾福德峽灣\\米爾福德峽灣的風景 (10).jpg",
  托雷斯德爾潘恩:
    "\\\\192.168.3.3\\【行程總彙】\\0-1主推行程2025\\北極80度-斯瓦巴14+19日\\官網提供\\前进号\\前进号Fram图\\外观\\Torres_del_Paine_NP_Chile_HGR_149248_1920_Photo_Genna_Roland.jpg",
  藍湖:
    "\\\\192.168.3.3\\【行程總彙】\\0-0-EDM+影片\\2025\\2025-10月\\1013冰島極光\\藍湖shutterstock_497026909.jpg",
  婆羅浮屠:
    "\\\\192.168.3.3\\【行程總彙】\\0-0-EDM+影片\\2024\\2024-6月-年度重點\\2爪哇汶萊8日 ✔️\\BWN08A_爪哇婆羅浮屠佛塔 婆羅摩火山 汶萊王國東方杜拜 小資 8日.jpg",
  下龍灣:
    "\\\\192.168.3.3\\【行程總彙】\\0-0-EDM+影片\\2025\\2025-5月\\20250513 北越下龍灣 海上VILLA 5日.jpg",
  塞倫蓋蒂國家公園:
    "\\\\192.168.3.3\\【行程總彙】\\5-非洲\\@照片圖庫\\@領隊\\2013-0716肯亞維多利亞16日-阿貴\\肯亞\\723塞倫蓋蒂國家公園\\IMG_5372.JPG",
  奈洛比國家公園:
    "\\\\192.168.3.3\\【行程總彙】\\5-非洲\\@照片圖庫\\@領隊\\2013-0716肯亞維多利亞16日-阿貴\\肯亞\\730奈洛比市區\\IMG_6523.JPG",
  新天鵝堡:
    "\\\\192.168.3.3\\【行程總彙】\\4-1.歐洲\\●中西南歐\\德國\\新天鵝堡Schloss Neuschwanstein\\新天鵝堡shutterstock_1344676493.jpg",
  布蘭登堡門:
    "\\\\192.168.3.3\\【行程總彙】\\4-1.歐洲\\●中西南歐\\德國\\柏林Berlin\\布蘭登堡門_巴黎廣場\\布蘭登堡門shutterstock_490048132.jpg",
};

const map = JSON.parse(readFileSync(mapPath, "utf8"));
map.entries = { ...(map.entries ?? {}) };
for (const [landmark, absolutePath] of Object.entries(manualPaths)) {
  map.entries[landmark] = { absolutePath, credit: map.defaults?.credit ?? "行程總彙圖庫" };
}
writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`, "utf8");
console.log(`Updated ${Object.keys(manualPaths).length} manual NAS entries in ${mapPath}`);
