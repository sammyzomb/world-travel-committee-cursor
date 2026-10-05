import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'data/landmark-static-manifest.json'), 'utf8')).entries;
const grades = ['小一','小二','小三','小四','小五','小六','國一','國二','國三','高一','高二','高三','大一','大二','大三','大四','研一','研二'];
const levels = ['旅行新手','城市旅人','國家達人','洲際領隊','環球旅行家'];
const rows = [];
function add(id, band, puzzleType, q, options, answer, fact, extra = {}) {
  const ranges = [[0,2],[2,4],[4,6],[7,8],[8,13],[14,17]];
  const [lo, hi] = ranges[band];
  rows.push({id:`puzzle:${id}`,level:levels[Math.min(band,4)],demand:band===0?1:band<3?2:band===5?4:3,
    family:`puzzle:${puzzleType}:${id}`,subtopic:puzzleType==='看圖認景點'?'monuments-landmarks':'planning-itineraries',
    region:'世界旅行',category:'旅行知識',questionType:'world-fact',travelFocus:true,puzzleType,
    grades:grades.slice(lo,hi+1),q,options,answer,fact,...extra});
}
const names = Object.entries(manifest).filter(([name,e])=> !e.imageRejected && (!e.provider || e.imageReviewedAt) && !['太平洋','旅遊地標'].includes(name)).map(([name])=>name);
// 圖片本身是題目的線索；名稱、地區、來源連結只在揭曉後提供。
names.forEach((name,i)=>{
  const band=i<44?0:i<92?1:2;
  const wrong=names.filter(n=>n!==name).sort((a,b)=>Math.abs(a.length-name.length)-Math.abs(b.length-name.length)||a.localeCompare(b)).slice(0,3);
  const options=[name,...wrong];
  add(`photo-${i}`,band,'看圖認景點','觀察照片中的建築或景觀，這張旅行明信片拍的是哪個景點？',options,0,
    `照片中的景點是${name}。可從外形、周圍景觀與建築細節辨識；圖片來源可在揭曉後查閱。`,{landmark:name,visualClue:true});
});
function permutations(xs) {return xs.length<2?[xs]:xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>j!==i)).map(t=>[x,...t]));}
const perms=permutations([0,1,2,3]);
const cities=['京都','巴黎','里斯本','伊斯坦堡','布拉格','首爾','吉隆坡','新加坡','墨西哥城','布宜諾斯艾利斯','雪梨','溫哥華','曼谷','清邁','河內','會安','羅馬','佛羅倫斯','巴塞隆納','馬德里','阿姆斯特丹','哥本哈根','赫爾辛基','斯德哥爾摩','雷克雅維克','開羅','馬拉喀什','奈洛比','東京','倫敦','柏林','維也納'];
const activities=[['市集','花園','展館','夜景'],['老街','陶藝','茶屋','劇場'],['碼頭','咖啡','藝廊','音樂'],['早餐','手作','公園','燈會'],['散步','書店','餐館','表演'],['運河','繪畫','點心','夕照'],['庭院','染布','茶點','演奏']];
function choicesFor(valid, i) {
  const wrong=perms.filter(p=>!valid(p));
  const right=perms.find(valid);
  if(!right || wrong.length<3) throw Error('No unique solution');
  const selected=[right,wrong[i%wrong.length],wrong[(i+7)%wrong.length],wrong[(i+14)%wrong.length]];
  if(new Set(selected.map(p=>p.join())).size!==4) throw Error('Duplicate permutation');
  // 每一選項使用完全相同的詞，只改順序或配對，字數不構成線索。
  return selected;
}
for(let band=3;band<=5;band++) {
  const n=band===5?28:band===4?32:24;
  for(let i=0;i<n;i++) {
    const city=cities[i], a=activities[(i+band)%activities.length];
    const target=perms[(i*5+band)%24];
    const before=(p,x,y)=>p.indexOf(x)<p.indexOf(y);
    const advanced=band===5;
    const pairs=advanced?[[target[0],target[1]],[target[1],target[2]],[target[2],target[3]]]:[[target[0],target[2]],[target[1],target[3]]];
    const validOrder=p=>pairs.every(([x,y])=>before(p,x,y));
    let choices=choicesFor(validOrder,i);
    add(`order-${band}-${i}`,band,'行程排序',`${city}散步解謎（題目設定，非現地行程）：四站都要去一次。${pairs.map(([x,y])=>`「${a[x]}」須在「${a[y]}」之前`).join('；')}。哪個順序符合全部線索？`,
      choices.map(p=>p.map(x=>a[x]).join(' → ')),0,`逐一核對先後關係即可。符合本題全部線索的選項是：${choices[0].map(x=>a[x]).join(' → ')}。`);
    const edges=target.slice(0,3).map((x,j)=>[x,target[j+1]]);
    if(advanced) edges.push([target[2],target[0]],[target[3],target[1]]);
    const validPath=p=>p.every((x,j)=>j===3||edges.some(([from,to])=>from===x&&to===p[j+1]));
    choices=choicesFor(validPath,i+1);
    add(`path-${band}-${i}`,band,'路線推理',`${city}旅遊路線謎題（示意路線）：只可沿箭頭行走，四站各去一次。路線為 ${edges.map(([x,y])=>`${a[x]}→${a[y]}`).join('、')}。哪條路能走完四站？`,
      choices.map(p=>p.map(x=>a[x]).join(' → ')),0,`每一步都必須是題目給定的箭頭，並且不能重訪。可行路線是${choices[0].map(x=>a[x]).join(' → ')}。示意箭頭不代表真實城市交通。`);
    const people=['小安','小樂','小米','小禾'];
    const conditions=advanced?[[0,target[0],true],[1,target[0],false],[1,target[2],false],[2,target[0],false],[2,target[3],false]]:[[0,target[0],true],[1,target[1],true],[2,target[2],true]];
    const validMatch=p=>conditions.every(([person,act,is])=>is?p[person]===act:p[person]!==act);
    choices=choicesFor(validMatch,i+2);
    add(`match-${band}-${i}`,band,'旅伴配對',`${city}旅行日記謎題：四人各選一項體驗，不能重複。${conditions.map(([p,x,is])=>`${people[p]}${is?'選':'沒選'}${a[x]}`).join('；')}。哪一份名單符合所有線索？`,
      choices.map(p=>p.map((x,j)=>`${people[j]}：${a[x]}`).join('／')),0,`先固定已確定的體驗，再排除不符合的配對；每項體驗只能分配一次。正確名單是${choices[0].map((x,j)=>`${people[j]}：${a[x]}`).join('／')}。`);
    const venues=['甲館','乙館','丙館','丁館'];
    const attrs=[['室內','戶外'],['手作','導覽'],['需預約','免預約'],['上午開放','下午開放']];
    const bits=[i%16,(i+5)%16,(i+10)%16,(i+15)%16];
    const wanted=bits[i%4];
    const filters=advanced?[0,1,2,3]:[0,1,2];
    const validVenue=v=>filters.every(j=>((bits[v]>>j)&1)===((wanted>>j)&1));
    const solutions=[0,1,2,3].filter(validVenue);
    if(solutions.length!==1) throw Error('Ambiguous venue');
    const descriptions=bits.map((b,j)=>`${venues[j]}：${attrs.map((pair,k)=>pair[(b>>k)&1]).join('、')}`);
    add(`clue-${band}-${i}`,band,'線索解謎',`${city}體驗館選擇（題目設定）：${descriptions.join('；')}。想找${filters.map(j=>attrs[j][(wanted>>j)&1]).join('、')}的體驗，應選哪一館？`,venues,solutions[0],
      `把需求逐項與四館資料交叉比對，只有${venues[solutions[0]]}全部符合。題中條件為解謎設定，並非現地店家資訊。`);
    rows.at(-1).options=venues.map(v=>`參訪${v}`);
  }
}
// 短選項文化題：同一層次、同一語法的干擾選項；解析與來源在回答後顯示。
const culture=[
 ['onsen','在日本泡溫泉前，一般先在哪裡清洗身體？',['洗身區','浴池內','更衣櫃','休息室'],'通常先在洗身區洗淨，再進入公共浴池；個別設施規則仍須確認。','https://faq.japan-travel.jnto.go.jp/en/guide/how-to-best-enjoy-onsen/'],
 ['hawker','想體驗新加坡小販文化，哪個場所最貼近這項傳統？',['小販中心','歌劇劇院','高山牧場','皇室宮殿'],'小販中心匯集不同背景的食物與共同用餐文化。','https://ich.unesco.org/en/RL/hawker-culture-in-singapore-community-dining-and-culinary-practices-in-a-multicultural-urban-context-01568'],
 ['flamenco','在西班牙欣賞佛朗明哥，最可能感受到哪組表演元素？',['歌唱與舞蹈','歌唱與雜技','舞蹈與魔術','舞蹈與皮影'],'佛朗明哥結合歌唱、舞蹈與音樂。','https://www.spain.info/en/discover-spain/flamenco-spain/'],
 ['venice','想從威尼斯水面欣賞沿岸建築，下列哪項最符合當地旅行體驗？',['搭乘貢多拉','搭乘雪橇車','搭乘熱氣球','搭乘纜索車'],'貢多拉是威尼斯運河的傳統船隻；不是每段水路都適用同一種交通。','https://www.italia.it/it/veneto/venezia'],
 ['petronas','參觀吉隆坡雙子星塔時，連接兩棟塔樓的設施稱為什麼？',['空中橋梁','地下隧道','海底隧道','山頂吊橋'],'雙子星塔的空中橋梁連接兩棟塔樓，是其參觀體驗之一。','https://www.petronastwintowers.com.my/'],
 ['machu','馬丘比丘的旅遊特色最符合哪組畫面？',['山地與石造遺跡','平原與鋼造高塔','沙漠與玻璃宮殿','海港與木造風車'],'馬丘比丘的印加遺跡與山地自然環境共同構成其特色。','https://whc.unesco.org/en/list/274/'],
 ['angkor','遊覽吳哥時，哪類景觀最能串起這個遺產的特色？',['寺廟與水利遺跡','城堡與冰川景觀','燈塔與海港景觀','風車與牧場景觀'],'吳哥包含寺廟、城市遺跡與水利系統。','https://whc.unesco.org/en/list/668/'],
 ['luang','想感受龍坡邦古城的特色，哪組景觀最適合慢慢觀察？',['寺廟與傳統街屋','風車與運河船屋','冰屋與極地港口','金字塔與沙漠營地'],'龍坡邦保留寺廟與傳統建築，也呈現不同建築文化的融合。','https://whc.unesco.org/en/list/479/'],
];
culture.forEach(([id,q,options,fact,url],i)=>add(`culture-${id}`,i<4?1:2,'異國文化',q,options,0,fact,{subtopic:'culture-etiquette',references:[{title:'文化與景點資料來源',url,role:'fact'}]}));
const sites=[
 ['佩特拉古城','岩壁雕刻與峽谷古城',326],['泰姬瑪哈陵','白色大理石紀念陵墓',252],
 ['凡爾賽宮','法國王室宮殿與園林',83],['巨石陣','史前巨石環形排列',373],
 ['黃石國家公園','間歇泉與地熱景觀',28],['加拉帕戈斯群島','巨龜與獨特島嶼生物',1],
 ['摩艾石像','復活節島巨大人形石雕',715],['大堡礁','珊瑚礁與海洋生物',154],
 ['馬丘比丘','安地斯山地的印加石城',274],['吳哥窟','高棉寺廟與水利遺跡',668],
 ['威尼斯古城','潟湖城市與水上街景',394],['塞倫蓋蒂國家公園','草原與野生動物遷徙',156],
];
sites.slice(0,8).forEach(([name,feature,code],i)=>{
 const choices=[sites[i],sites[(i+3)%12],sites[(i+6)%12],sites[(i+9)%12]].map(s=>s[0]);
 add(`heritage-clue-${i}`,i<4?1:2,'旅行線索',`旅行明信片寫著「${feature}」。下列哪個景點最符合這組特色？`,choices,0,
 `${name}的特色包含${feature}；這是景點體驗線索，不是國家或首都定位題。`,{landmark:name,subtopic:'heritage-conservation',references:[{title:`UNESCO：${name}`,url:`https://whc.unesco.org/en/list/${code}/`,role:'fact'}]});
});
// 四個景點都出現在每一選項，僅配對不同；不能用最長景點名稱猜題。
for(let i=0;i<24;i++) {
 const selected=[sites[i%12],sites[(i+2)%12],sites[(i+5)%12],sites[(i+9)%12]];
 const order=perms[(i*7)%24];
 const shuffled=order.map(j=>selected[j]);
 const answerOptions=[shuffled,...[3,8,14].map(offset=>perms[((i*7)+offset)%24].map(j=>selected[j]))];
 add(`album-${i}`,i<12?4:5,'旅行線索',`四張旅行明信片依序記下：${shuffled.map((s,j)=>`${String.fromCharCode(65+j)}「${s[1]}」`).join('；')}。哪列景點與 A、B、C、D 的線索依序吻合？`,
 answerOptions.map(items=>items.map(s=>s[0]).join('／')),0,
 shuffled.map((s,j)=>`${String.fromCharCode(65+j)} 是${s[0]}：${s[1]}`).join('；')+'。',
 {subtopic:'heritage-conservation',references:selected.map(s=>({title:`UNESCO：${s[0]}`,url:`https://whc.unesco.org/en/list/${s[2]}/`,role:'fact'}))});
}
for(const r of rows) {
  if(new Set(r.options).size!==4) throw Error(`Repeated options ${r.id}`);
  if(r.q.includes(r.options[r.answer])) throw Error(`Answer in stem ${r.id}`);
}
writeFileSync(resolve(root,'data/travel-puzzles.json'),JSON.stringify(rows,null,2)+'\n');
const counts={};for(const r of rows)counts[r.puzzleType]=(counts[r.puzzleType]??0)+1;
writeFileSync(resolve(root,'data/travel-puzzle-catalog.json'),JSON.stringify({total:rows.length,photoCount:names.length,types:counts},null,2)+'\n');
console.log({total:rows.length,types:counts});
