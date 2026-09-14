type HeritageLandmarkImage = {
  url: string;
  credit: string;
};

/** 世界遺產擴充題庫用地標圖（Wikimedia Commons，由 scripts/repair-landmark-urls.mjs 驗證）。 */
export const heritageLandmarkImages: Record<string, HeritageLandmarkImage> = {
  "萬里長城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Badaling_China_Great-Wall-of-China-01.jpg/960px-Badaling_China_Great-Wall-of-China-01.jpg",
    credit: "Wikimedia Commons / Badaling China Great-Wall-of-China-01.jpg",
  },
  "紫禁城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Sunset_of_the_Forbidden_City_2006.JPG/960px-Sunset_of_the_Forbidden_City_2006.JPG",
    credit: "Wikimedia Commons / Sunset of the Forbidden City 2006.JPG",
  },
  "兵馬俑": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Xian_China_Terracotta-Army-Museum-01.jpg/960px-Xian_China_Terracotta-Army-Museum-01.jpg",
    credit: "Wikimedia Commons / Xian China Terracotta-Army-Museum-01.jpg",
  },
  "莫高窟": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Mogao_Caves%2C_cave_159_musicians.jpg/960px-Mogao_Caves%2C_cave_159_musicians.jpg",
    credit: "Wikimedia Commons / Mogao Caves, cave 159 musicians.jpg",
  },
  "樂山大佛": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Leshan_Giant_Buddha%2C_20161102.jpg/960px-Leshan_Giant_Buddha%2C_20161102.jpg",
    credit: "Wikimedia Commons / Leshan Giant Buddha, 20161102.jpg",
  },
  "張家界國家森林公園": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Zhangjiajie_National_Forest_Park.jpg/960px-Zhangjiajie_National_Forest_Park.jpg",
    credit: "Wikimedia Commons / Zhangjiajie National Forest Park.jpg",
  },
  "黃山": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Mount-huangshan_53319729912.jpg/960px-Mount-huangshan_53319729912.jpg",
    credit: "Wikimedia Commons / Mount-huangshan 53319729912.jpg",
  },
  "麗江古城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/1_lijiang_old_town_night.jpg/960px-1_lijiang_old_town_night.jpg",
    credit: "Wikimedia Commons / 1 lijiang old town night.jpg",
  },
  "布達拉宮": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Potala_Palace.JPG/960px-Potala_Palace.JPG",
    credit: "Wikimedia Commons / Potala Palace.JPG",
  },
  "嚴島神社": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Itsukushima-jinja_torii_at_sunset%2C_Miyajima%2C_Japan%2C_20240816_1812_4144.jpg/960px-Itsukushima-jinja_torii_at_sunset%2C_Miyajima%2C_Japan%2C_20240816_1812_4144.jpg",
    credit: "Wikimedia Commons / Itsukushima-jinja torii at sunset, Miyajima, Japan, 20240816 1812 4144.jpg",
  },
  "姬路城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Himeji_castle_in_may_2015.jpg/960px-Himeji_castle_in_may_2015.jpg",
    credit: "Wikimedia Commons / Reggaeman",
  },
  "佛國寺": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Bulguksa_03.jpg/960px-Bulguksa_03.jpg",
    credit: "Wikimedia Commons / Steve46814",
  },
  "會安古城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Hoi_An_ancient_town_Vietnam.jpg/960px-Hoi_An_ancient_town_Vietnam.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "金邊皇宮": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Royal_Palace_Phnom_Penh.jpg/960px-Royal_Palace_Phnom_Penh.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "加德滿都谷地": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Kathmandu_Durbar_Square.jpg/960px-Kathmandu_Durbar_Square.jpg",
    credit: "Wikimedia Commons / chensiyuan",
  },
  "琥珀堡": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Amber_Palace_Jaipur_2019.jpg/960px-Amber_Palace_Jaipur_2019.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "藍色清真寺": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Blue_Mosque%2C_Istanbul%2C_Turkey.jpg/960px-Blue_Mosque%2C_Istanbul%2C_Turkey.jpg",
    credit: "Wikimedia Commons / Arild Vågen",
  },
  "卡帕多奇亞": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Cappadocia_balloons.jpg/960px-Cappadocia_balloons.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "耶路撒冷古城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Jerusalem_Western_Wall_and_Dome_of_the_Rock.jpg/960px-Jerusalem_Western_Wall_and_Dome_of_the_Rock.jpg",
    credit: "Wikimedia Commons / Andrew Shiva",
  },
  "杰拉什古城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Jerash_South_Theatre.jpg/960px-Jerash_South_Theatre.jpg",
    credit: "Wikimedia Commons / Bernard Gagnon",
  },
  "新天鵝堡": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Neuschwanstein_Castle_LOC_Look_down_from_Schloss.jpg/960px-Neuschwanstein_Castle_LOC_Look_down_from_Schloss.jpg",
    credit: "Wikimedia Commons / Softeis",
  },
  "凡爾賽宮": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Chateau_Versailles_Galerie_des_Glaces.jpg/960px-Chateau_Versailles_Galerie_des_Glaces.jpg",
    credit: "Wikimedia Commons / Myrabella",
  },
  "聖米歇爾山": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/MSM_sunset_02.JPG/960px-MSM_sunset_02.JPG",
    credit: "Wikimedia Commons / MSM sunset 02.JPG",
  },
  "阿爾罕布拉宮": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Pavillon_Cour_des_Lions_Alhambra_Granada_Spain.jpg/960px-Pavillon_Cour_des_Lions_Alhambra_Granada_Spain.jpg",
    credit: "Wikimedia Commons / Pavillon Cour des Lions Alhambra Granada Spain.jpg",
  },
  "塞哥維亞古城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Acueducto_de_Segovia_01.jpg/960px-Acueducto_de_Segovia_01.jpg",
    credit: "Wikimedia Commons / Acueducto de Segovia 01.jpg",
  },
  "雅典衛城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Attica_06-13_Athens_50_View_from_Philopappos_-_Acropolis_Hill.jpg/960px-Attica_06-13_Athens_50_View_from_Philopappos_-_Acropolis_Hill.jpg",
    credit: "Wikimedia Commons / Attica 06-13 Athens 50 View from Philopappos - Acropolis Hill.jpg",
  },
  "龐貝古城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Building_of_Eumachia%2C_Pompeii_Forum%2C_Entrance.jpg/960px-Building_of_Eumachia%2C_Pompeii_Forum%2C_Entrance.jpg",
    credit: "Wikimedia Commons / Building of Eumachia, Pompeii Forum, Entrance.jpg",
  },
  "威尼斯古城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Panorama_of_Canal_Grande_and_Ponte_di_Rialto%2C_Venice_-_September_2017.jpg/960px-Panorama_of_Canal_Grande_and_Ponte_di_Rialto%2C_Venice_-_September_2017.jpg",
    credit: "Wikimedia Commons / Panorama of Canal Grande and Ponte di Rialto, Venice - September 2017.jpg",
  },
  "烏菲茲美術館": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Uffizi_Gallery_-_Daughter_of_Niobe_bent_by_terror.jpg/960px-Uffizi_Gallery_-_Daughter_of_Niobe_bent_by_terror.jpg",
    credit: "Wikimedia Commons / Uffizi Gallery - Daughter of Niobe bent by terror.jpg",
  },
  "威斯敏斯特宮": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Westminster_palace.jpg/960px-Westminster_palace.jpg",
    credit: "Wikimedia Commons / Westminster palace.jpg",
  },
  "巨石陣": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Stonehenge_Heel_Stone.jpg/960px-Stonehenge_Heel_Stone.jpg",
    credit: "Wikimedia Commons / Stonehenge Heel Stone.jpg",
  },
  "布拉格城堡": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Guard_at_the_Prague_castle%2C_Prague_-_7620_%28cropped%29.jpg/960px-Guard_at_the_Prague_castle%2C_Prague_-_7620_%28cropped%29.jpg",
    credit: "Wikimedia Commons / Guard at the Prague castle, Prague - 7620 (cropped).jpg",
  },
  "維利奇卡鹽礦": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Wieliczka%2C_Jana_Matejki%3B_Kopalnia_soli-_kierat_konny_w%C4%99gierski%3B_A-580%3B_01.jpg/960px-Wieliczka%2C_Jana_Matejki%3B_Kopalnia_soli-_kierat_konny_w%C4%99gierski%3B_A-580%3B_01.jpg",
    credit: "Wikimedia Commons / Wieliczka, Jana Matejki; Kopalnia soli- kierat konny węgierski; A-580; 01.jpg",
  },
  "辛格韋德利爾國家公園": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Thingvellir_National_Park.jpg/960px-Thingvellir_National_Park.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "克里姆林宮": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Moscow_Kremlin_2019.jpg/960px-Moscow_Kremlin_2019.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "冬宮博物館": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Hermitage_Museum_winter_palace.jpg/960px-Hermitage_Museum_winter_palace.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "杜布羅夫尼克古城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Dubrovnik_-_Walls.jpg/960px-Dubrovnik_-_Walls.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "大峽谷國家公園": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Grand_Canyon_view_from_Pima_Point_2010.jpg/960px-Grand_Canyon_view_from_Pima_Point_2010.jpg",
    credit: "Wikimedia Commons / Chensiyuan",
  },
  "優勝美地國家公園": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Yosemite_Valley_from_Wawona_Tunnel_view%2C_early_spring_2013.jpg/960px-Yosemite_Valley_from_Wawona_Tunnel_view%2C_early_spring_2013.jpg",
    credit: "Wikimedia Commons / Diliff",
  },
  "黃石國家公園": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Grand_Prismatic_Spring_and_Midway_Geyser_Basin_from_above.jpg/960px-Grand_Prismatic_Spring_and_Midway_Geyser_Basin_from_above.jpg",
    credit: "Wikimedia Commons / Brocken Inaglory",
  },
  "尼加拉瀑布": {
    url: "https://upload.wikimedia.org/wikipedia/commons/3/3b/Niagara_watervallen_canada.jpg",
    credit: "Wikimedia Commons / Niagara watervallen canada.jpg",
  },
  "瓦哈卡歷史中心": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Oaxaca_city_panorama.jpg/960px-Oaxaca_city_panorama.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "薩爾瓦多歷史中心": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Salvador_Bahia_Pelourinho.jpg/960px-Salvador_Bahia_Pelourinho.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "莫雷諾冰川": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Perito_Moreno_Glacier_Patagonia_Argentina_Luca_Galuzzi_2007.jpg/960px-Perito_Moreno_Glacier_Patagonia_Argentina_Luca_Galuzzi_2007.jpg",
    credit: "Wikimedia Commons / Luca Galuzzi",
  },
  "庫斯科古城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Cusco_Plaza_de_Armas.jpg/960px-Cusco_Plaza_de_Armas.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "摩艾石像": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Ahu_Tongariki.jpg/960px-Ahu_Tongariki.jpg",
    credit: "Wikimedia Commons / Aurbina",
  },
  "大堡礁": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Great_Barrier_Reef.jpg/960px-Great_Barrier_Reef.jpg",
    credit: "Wikimedia Commons / NASA",
  },
  "烏魯魯": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Uluru%2C_Northern_Territory.jpg/960px-Uluru%2C_Northern_Territory.jpg",
    credit: "Wikimedia Commons / Weyf",
  },
  "乞力馬扎羅山": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Mount_Kilimanjaro_from_Amboseli.jpg/960px-Mount_Kilimanjaro_from_Amboseli.jpg",
    credit: "Wikimedia Commons / Mila Zinkova",
  },
  "馬拉喀什老城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Marrakesh_Medina.jpg/960px-Marrakesh_Medina.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "羅本島": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Robben_Island.jpg/960px-Robben_Island.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "阿布辛貝神廟": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/RamsesII_at_Abu_Simbel.jpg/960px-RamsesII_at_Abu_Simbel.jpg",
    credit: "Wikimedia Commons / Hajor",
  },
  "魁北克古城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Quebec_City_skyline.jpg/960px-Quebec_City_skyline.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "小孩堤防風車群": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Kinderdijk_windmills.jpg/960px-Kinderdijk_windmills.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "波斯波利斯古城": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Persepolis_24.jpg/960px-Persepolis_24.jpg",
    credit: "Wikimedia Commons / Diego Delso",
  },
  "旅遊地標": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/960px-The_Earth_seen_from_Apollo_17.jpg",
    credit: "Wikimedia Commons / NASA",
  },
};
