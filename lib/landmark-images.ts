import { heritageLandmarkImages } from "./landmark-images-heritage";

/** Wikimedia Commons 免費圖片，可商用（依各檔案 CC 授權）。 */
export type LandmarkImage = {
  url: string;
  credit: string;
};

const baseLandmarkImages: Record<string, LandmarkImage> = {
  "艾菲爾鐵塔": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/960px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg",
    credit: "Wikimedia Commons / Benh",
  },
  "大笨鐘": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Clock_Tower_-_Palace_of_Westminster%2C_London_-_May_2007.jpg/960px-Clock_Tower_-_Palace_of_Westminster%2C_London_-_May_2007.jpg",
    credit: "Wikimedia Commons / Diliff",
  },
  "羅馬競技場": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Colosseo_2020.jpg/960px-Colosseo_2020.jpg",
    credit: "Wikimedia Commons / Livioandronico2013",
  },
  "普拉多博物館": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Museo_del_Prado_-_Madrid.jpg/960px-Museo_del_Prado_-_Madrid.jpg",
    credit: "Wikimedia Commons / Alonso de Mendoza",
  },
  "布蘭登堡門": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Brandenburger_Tor_abends.jpg/960px-Brandenburger_Tor_abends.jpg",
    credit: "Wikimedia Commons / Thomas Wolf",
  },
  "美泉宮": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Schoenbrunn_Wien_2012.jpg/960px-Schoenbrunn_Wien_2012.jpg",
    credit: "Wikimedia Commons / Thomas Wolf",
  },
  "國會大廈": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Hungarian_Parliament_Building_from_across_the_Danube.jpg/960px-Hungarian_Parliament_Building_from_across_the_Danube.jpg",
    credit: "Wikimedia Commons / Jorge Láscar",
  },
  "吉薩金字塔群": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/All_Gizah_Pyramids.jpg/960px-All_Gizah_Pyramids.jpg",
    credit: "Wikimedia Commons / Ricardo Liberato",
  },
  "奈洛比國家公園": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Nairobi_National_Park_-_zebras.jpg/960px-Nairobi_National_Park_-_zebras.jpg",
    credit: "Wikimedia Commons / Sutha Kamal",
  },
  "桌山": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Table_Mountain_from_robben_island.jpg/960px-Table_Mountain_from_robben_island.jpg",
    credit: "Wikimedia Commons / Abu Shawka",
  },
  "庫圖比亞清真寺": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Koutoubia_Mosque.jpg/960px-Koutoubia_Mosque.jpg",
    credit: "Wikimedia Commons / Donarreiskoffer",
  },
  "自由女神像": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Statue_of_Liberty_7.jpg/960px-Statue_of_Liberty_7.jpg",
    credit: "Wikimedia Commons / Sue Waters",
  },
  "國會山莊": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Parliament_Hill%2C_Ottawa%2C_Canada.jpg/960px-Parliament_Hill%2C_Ottawa%2C_Canada.jpg",
    credit: "Wikimedia Commons / Wladyslaw",
  },
  "太陽金字塔": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Teotihuacan_Pyramid_of_the_Sun.jpg/960px-Teotihuacan_Pyramid_of_the_Sun.jpg",
    credit: "Wikimedia Commons / Hajor",
  },
  "基督像": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Christ_the_Redeemer_-_Cristo_Redentor.jpg/960px-Christ_the_Redeemer_-_Cristo_Redentor.jpg",
    credit: "Wikimedia Commons / Chensiyuan",
  },
  "馬丘比丘": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Machu_Picchu%2C_Peru.jpg/960px-Machu_Picchu%2C_Peru.jpg",
    credit: "Wikimedia Commons / Martin St-Amant",
  },
  "富士山": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Mount_Fuji_at_night.jpg/960px-Mount_Fuji_at_night.jpg",
    credit: "Wikimedia Commons / Mount Fuji at night.jpg",
  },
  "太平洋": {
    url: "https://upload.wikimedia.org/wikipedia/commons/c/c4/Pacific_Ocean.png",
    credit: "Wikimedia Commons / Pacific Ocean.png",
  },
  "聖克里斯托瓦爾山": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Virgin_Mary_statue%2C_San_Cristobal_Hill%2C_Santiago%2C_Chile.jpg/960px-Virgin_Mary_statue%2C_San_Cristobal_Hill%2C_Santiago%2C_Chile.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "五月廣場": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Plaza_de_Mayo%2C_Buenos_Aires%2C_Argentina.jpg/960px-Plaza_de_Mayo%2C_Buenos_Aires%2C_Argentina.jpg",
    credit: "Wikimedia Commons / Luis Argerich",
  },
  "月亮谷": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Valle_de_la_Luna%2C_La_Paz%2C_Bolivia.jpg/960px-Valle_de_la_Luna%2C_La_Paz%2C_Bolivia.jpg",
    credit: "Wikimedia Commons / Anouchka Unel",
  },
  "雪梨歌劇院": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Sydney_Opera_House_Sails.jpg/960px-Sydney_Opera_House_Sails.jpg",
    credit: "Wikimedia Commons / Bjørn Christian Tørrissen",
  },
  "紐西蘭國會大廈": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/New_Zealand_Parliament_House_and_the_Beehive.jpg/960px-New_Zealand_Parliament_House_and_the_Beehive.jpg",
    credit: "Wikimedia Commons / Phillip Capper",
  },
  "大皇宮": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/The_Grand_Palace%2C_Bangkok.jpg/960px-The_Grand_Palace%2C_Bangkok.jpg",
    credit: "Wikimedia Commons / Vyacheslav Argenberg",
  },
  "景福宮": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Gyeonghoeru_%28Royal_Banquet_Hall%29_at_Gyeongbokgung_Palace%2C_Seoul.jpg/960px-Gyeonghoeru_%28Royal_Banquet_Hall%29_at_Gyeongbokgung_Palace%2C_Seoul.jpg",
    credit: "Wikimedia Commons / Gyeonghoeru (Royal Banquet Hall) at Gyeongbokgung Palace, Seoul.jpg",
  },
  "濱海灣金沙": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Marina_Bay_Sands_in_the_evening_-_20101120.jpg/960px-Marina_Bay_Sands_in_the_evening_-_20101120.jpg",
    credit: "Wikimedia Commons / Someformofhuman",
  },
  "清水寺": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Osaka_Kiyomizu-dera_2009-04-19.jpg/960px-Osaka_Kiyomizu-dera_2009-04-19.jpg",
    credit: "Wikimedia Commons / 663highland",
  },
  "東大寺": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Todai-ji_Daibutsuden2005G.jpg/960px-Todai-ji_Daibutsuden2005G.jpg",
    credit: "Wikimedia Commons / 663highland",
  },
  "泰姬瑪哈陵": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Taj_Mahal_in_India_-_Kristian_Bertel.jpg/960px-Taj_Mahal_in_India_-_Kristian_Bertel.jpg",
    credit: "Wikimedia Commons / Kristian Bertel",
  },
  "聖索菲亞大教堂": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Hagia_Sophia_Mars_2013.jpg/960px-Hagia_Sophia_Mars_2013.jpg",
    credit: "Wikimedia Commons / Arild Vågen",
  },
  "哈里法塔": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Burj_Khalifa.jpg/960px-Burj_Khalifa.jpg",
    credit: "Wikimedia Commons / Donaldytong",
  },
  "紅場": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Moscow_Red_Square.jpg/960px-Moscow_Red_Square.jpg",
    credit: "Wikimedia Commons / Alvesgaspar",
  },
  "帕德嫩神廟": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/The_Parthenon_in_Athens.jpg/960px-The_Parthenon_in_Athens.jpg",
    credit: "Wikimedia Commons / Steve Swayne",
  },
  "查理大橋": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Prague_07-2016_view_from_Lesser_Town_Tower_of_Charles_Bridge_03.jpg/960px-Prague_07-2016_view_from_Lesser_Town_Tower_of_Charles_Bridge_03.jpg",
    credit: "Wikimedia Commons / Diliff",
  },
  "藍湖": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Blue_Lagoon%2C_Iceland%2C_2013-08-12%2C_DD_03.JPG/960px-Blue_Lagoon%2C_Iceland%2C_2013-08-12%2C_DD_03.JPG",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "庫肯霍夫花園": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Keukenhof%2C_tulip_fields.jpg/960px-Keukenhof%2C_tulip_fields.jpg",
    credit: "Wikimedia Commons / Rene Cortin",
  },
  "金門大橋": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/GoldenGateBridge-001.jpg/960px-GoldenGateBridge-001.jpg",
    credit: "Wikimedia Commons / Rich Niewiroski",
  },
  "奇琴伊察": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Chichen_Itza_3.jpg/960px-Chichen_Itza_3.jpg",
    credit: "Wikimedia Commons / Bjørn Christian Tørrissen",
  },
  "伊瓜蘇瀑布": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Iguazu_Cataratas2.jpg/960px-Iguazu_Cataratas2.jpg",
    credit: "Wikimedia Commons / SF Brit",
  },
  "迦太基古城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Carthage_Roman_Villas.jpg/960px-Carthage_Roman_Villas.jpg",
    credit: "Wikimedia Commons / Dennis Jarvis",
  },
  "雙子星塔": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Petronas_Panorama_I.jpg/960px-Petronas_Panorama_I.jpg",
    credit: "Wikimedia Commons / Someformofhuman",
  },
  "維多利亞港": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Victoria_Harbour_Aerial_View.jpg/960px-Victoria_Harbour_Aerial_View.jpg",
    credit: "Wikimedia Commons / Base64",
  },
  "聖馬可廣場": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Venice_Piazza_San_Marco.jpg/960px-Venice_Piazza_San_Marco.jpg",
    credit: "Wikimedia Commons / Wolfgang Moroder",
  },
  "聖母百花大教堂": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Florence_Duomo_seen_from_Michelangelo_hill.jpg/960px-Florence_Duomo_seen_from_Michelangelo_hill.jpg",
    credit: "Wikimedia Commons / Jebulon",
  },
  "吳哥窟": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Angkor_Wat.jpg/960px-Angkor_Wat.jpg",
    credit: "Wikimedia Commons / Bjørn Christian Tørrissen",
  },
  "佩特拉古城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Treasury_petra_crop.jpeg/960px-Treasury_petra_crop.jpeg",
    credit: "Wikimedia Commons / Berthold Werner",
  },
  "聖家堂": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Sagrada_Familia_01.jpg/960px-Sagrada_Familia_01.jpg",
    credit: "Wikimedia Commons / Bernard Gagnon",
  },
  "婆羅浮屠": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Pradaraksa_Borobudur_Temple_Park_from_Pratayangan%2C_25_June_2018.jpg/960px-Pradaraksa_Borobudur_Temple_Park_from_Pratayangan%2C_25_June_2018.jpg",
    credit: "Wikimedia Commons / Pradaraksa",
  },
  "獅子岩": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Shishiiwa_Onigajo_Shichirimihama.jpg/960px-Shishiiwa_Onigajo_Shichirimihama.jpg",
    credit: "Wikimedia Commons / Shishiiwa Onigajo Shichirimihama.jpg",
  },
  "雷吉斯坦廣場": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Registan_01.jpg/960px-Registan_01.jpg",
    credit: "Wikimedia Commons / Registan 01.jpg",
  },
  "哈瓦那舊城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Museum_of_Revolution_Cuba.jpg/960px-Museum_of_Revolution_Cuba.jpg",
    credit: "Wikimedia Commons / Museum of Revolution Cuba.jpg",
  },
  "下龍灣": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Ha_Long_Bay_in_2011.jpg/960px-Ha_Long_Bay_in_2011.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "大金塔": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Shwedagon_Pagoda_2017.jpg/960px-Shwedagon_Pagoda_2017.jpg",
    credit: "Wikimedia Commons / Wagaung",
  },
  "少女峰": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Jungfraujoch%2C_Switzerland.jpg/960px-Jungfraujoch%2C_Switzerland.jpg",
    credit: "Wikimedia Commons / Michael Gäbler",
  },
  "塞倫蓋蒂國家公園": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Serengeti_Landscape_2012_01.jpg/960px-Serengeti_Landscape_2012_01.jpg",
    credit: "Wikimedia Commons / Ikiwaner",
  },
  "天使瀑布": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Salto_Angel%2C_Venezuela.jpg/960px-Salto_Angel%2C_Venezuela.jpg",
    credit: "Wikimedia Commons / Paolo Costa Baldi",
  },
  "珠穆朗瑪峰": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg/960px-Everest_North_Face_toward_Base_Camp_Tibet_Luca_Galuzzi_2006.jpg",
    credit: "Wikimedia Commons / Luca Galuzzi",
  },
  "孫德爾邦": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Sundarban_Tiger.jpg/960px-Sundarban_Tiger.jpg",
    credit: "Wikimedia Commons / Brian Gratwicke",
  },
  "拉合爾城堡": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Lahore_Fort_front_level.jpg/960px-Lahore_Fort_front_level.jpg",
    credit: "Wikimedia Commons / Waqas Usman",
  },
  "伊瑪目清真寺": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Imam_Mosque_Isfahan_April_2018.jpg/960px-Imam_Mosque_Isfahan_April_2018.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "哭牆": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Western_Wall_Jerusalem_01.jpg/960px-Western_Wall_Jerusalem_01.jpg",
    credit: "Wikimedia Commons / Wilson44691",
  },
  "王國中心塔": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Kingdom_Centre_Tower.jpg/960px-Kingdom_Centre_Tower.jpg",
    credit: "Wikimedia Commons / Ammar Shaker",
  },
  "伊斯蘭藝術博物館": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Museum_of_Islamic_Art_Doha_%28cropped%29.jpg/960px-Museum_of_Islamic_Art_Doha_%28cropped%29.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "普西山": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Phousi_hill_Luang_Prabang.jpg/960px-Phousi_hill_Luang_Prabang.jpg",
    credit: "Wikimedia Commons / Basile Morin",
  },
  "碧瑤": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Baguio_City_Hall.jpg/960px-Baguio_City_Hall.jpg",
    credit: "Wikimedia Commons / Ramon FVelasquez",
  },
  "奧馬爾清真寺": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Umayyad_Mosque_Damascus_2009.jpg/960px-Umayyad_Mosque_Damascus_2009.jpg",
    credit: "Wikimedia Commons / Bernard Gagnon",
  },
  "成吉思汗廣場": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/S%C3%BCkhbaatar_Square_2014.jpg/960px-S%C3%BCkhbaatar_Square_2014.jpg",
    credit: "Wikimedia Commons / Zazou2k11",
  },
  "巴伊傑列克塔": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Baiterek_Tower_Astana.jpg/960px-Baiterek_Tower_Astana.jpg",
    credit: "Wikimedia Commons / Ken and Nyetta",
  },
  "和平橋": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Bridge_of_Peace%2C_Tbilisi%2C_Georgia.jpg/960px-Bridge_of_Peace%2C_Tbilisi%2C_Georgia.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "維格蘭雕塑公園": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/The_Monolith_Vigeland_Park.jpg/960px-The_Monolith_Vigeland_Park.jpg",
    credit: "Wikimedia Commons / Bjørn Erik Pedersen",
  },
  "赫爾辛基大教堂": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Helsinki_cathedral_and_Statue.jpg/960px-Helsinki_cathedral_and_Statue.jpg",
    credit: "Wikimedia Commons / Jorge Láscar",
  },
  "市政廳": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Stockholm_Stadshus_mars_2013.jpg/960px-Stockholm_Stadshus_mars_2013.jpg",
    credit: "Wikimedia Commons / Arild Vågen",
  },
  "美人魚雕像": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Edvard_Eriksen%27s_mermaid_%28cropped%29.jpg/960px-Edvard_Eriksen%27s_mermaid_%28cropped%29.jpg",
    credit: "Wikimedia Commons / Avda",
  },
  "老城廣場": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Warsaw_Old_Town_Market_Square_2019.jpg/960px-Warsaw_Old_Town_Market_Square_2019.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "聖三一學院": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Trinity_College_Dublin_The_Campanile.jpg/960px-Trinity_College_Dublin_The_Campanile.jpg",
    credit: "Wikimedia Commons / William Murphy",
  },
  "貝倫塔": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Torre_Belem_Lisbon.jpg/960px-Torre_Belem_Lisbon.jpg",
    credit: "Wikimedia Commons / Alvesgaspar",
  },
  "原子球塔": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Atomium_Brussels_2017.jpg/960px-Atomium_Brussels_2017.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "卡列梅格丹城堡": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Kalemegdan_Fortress_Belgrade.jpg/960px-Kalemegdan_Fortress_Belgrade.jpg",
    credit: "Wikimedia Commons / Petar Milošević",
  },
  "拉利貝拉岩刻教堂": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Church_of_St_George%2C_Lalibela.jpg/960px-Church_of_St_George%2C_Lalibela.jpg",
    credit: "Wikimedia Commons / Bernard Gagnon",
  },
  "索蘇斯佛雷沙漠": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Dune_45_Sossusvlei.jpg/960px-Dune_45_Sossusvlei.jpg",
    credit: "Wikimedia Commons / Ikiwaner",
  },
  "維多利亞瀑布": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Victoria_Falls%2C_Zimbabwe.jpg/960px-Victoria_Falls%2C_Zimbabwe.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "良知之父紀念碑": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Kwame_Nkrumah_Mausoleum_and_Memorial_Park.jpg/960px-Kwame_Nkrumah_Mausoleum_and_Memorial_Park.jpg",
    credit: "Wikimedia Commons / Stig Nygaard",
  },
  // Bogotá's Museo del Oro: the previous URL showed New Taipei's Gold Museum.
  // Leave unmapped until a verified, licensed photograph is selected.
  "加拉帕戈斯群島": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Gal%C3%A1pagos_Islands_ESA23188644.jpeg/960px-Gal%C3%A1pagos_Islands_ESA23188644.jpeg",
    credit: "Wikimedia Commons / Galápagos Islands ESA23188644.jpeg",
  },
  "獨立廣場": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Plaza_Independencia_Montevideo.jpg/960px-Plaza_Independencia_Montevideo.jpg",
    credit: "Wikimedia Commons / Jimmy Baikovicius",
  },
  "鄧恩河瀑布": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Dunn%27s_River_Falls%2C_Jamaica.jpg/960px-Dunn%27s_River_Falls%2C_Jamaica.jpg",
    credit: "Wikimedia Commons / Paul Mannix",
  },
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
  return `/api/landmark-image?name=${encodeURIComponent(landmark)}`;
}
