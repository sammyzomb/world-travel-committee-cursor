import {readFileSync,writeFileSync,mkdirSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const path='data/landmark-static-manifest.json';
const manifest=JSON.parse(readFileSync(path,'utf8'));
const rejected=[];
for(const [name,entry] of Object.entries(manifest.entries)) {
 if(entry.provider && !entry.imageReviewedAt) {entry.imageRejected=true;entry.lastError='Unreviewed stock image: subject not verified';rejected.push(name);}
}
// 原檔名是地標雜湊，可能沿用舊快取；替換圖片改用內容雜湊。
const url='https://upload.wikimedia.org/wikipedia/commons/8/85/Petronas_Panorama_II.jpg';
const response=await fetch(url);if(!response.ok)throw Error(`Petronas download ${response.status}`);
const bytes=Buffer.from(await response.arrayBuffer());
const sharp=createRequire(realpathSync('node_modules/next/package.json'))('sharp');
const output=await sharp(bytes).rotate().resize({width:1280,height:1280,fit:'inside'}).jpeg({quality:84}).toBuffer();
const filename=`petronas-${createHash('sha256').update(output).digest('hex').slice(0,12)}.jpg`;
mkdirSync('work/travel-image-review',{recursive:true});mkdirSync('public/landmarks',{recursive:true});
writeFileSync(`work/travel-image-review/${filename}`,output);
writeFileSync(`public/landmarks/${filename}`,output);
// 只在實際檢視後另行加上 imageReviewedAt。
const priorTower=manifest.entries['雙子星塔'];
const reviewed=priorTower?.path===`/landmarks/${filename}`&&!priorTower.imageRejected&&priorTower.imageReviewedAt;
manifest.entries['雙子星塔']={path:`/landmarks/${filename}`,sourceUrl:'https://commons.wikimedia.org/wiki/File:Petronas_Panorama_II.jpg',downloadUrl:url,credit:'Wikimedia Commons / Someformofhuman (CC BY-SA 4.0；縮圖)',provider:'commons',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',bytes:output.length,failed:false,imageRejected:!reviewed,...(reviewed?{imageReviewedAt:priorTower.imageReviewedAt}:{})};
writeFileSync(path,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({rejected,candidate:`work/travel-image-review/${filename}`},null,2));
