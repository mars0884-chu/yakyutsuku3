import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const ROOT=path.resolve(new URL('..',import.meta.url).pathname);
const ASSETS=path.join(ROOT,'assets');
await fs.mkdir(ASSETS,{recursive:true});
const url='https://www.gavas.jp/upload/save_image/12595.jpg';
let input;
try{
  const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 (GitHub Pages build; Yakyutsuku3 reference thumbnail)'}});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  input=Buffer.from(await r.arrayBuffer());
  await fs.writeFile(path.join(ASSETS,'game-cover.jpg'),input);
  console.log('Downloaded game cover reference thumbnail',input.length);
}catch(e){
  console.warn('Cover download failed; using local fallback SVG:',e.message);
  input=await fs.readFile(path.join(ASSETS,'icon.svg'));
  await sharp(input).jpeg({quality:90}).toFile(path.join(ASSETS,'game-cover.jpg'));
}
// PWA icon: remove the shop-photo white mat first, then fill the square.
let iconSource=input;
try{
  iconSource=await sharp(input).flatten({background:'#ffffff'}).trim({background:'#ffffff',threshold:18}).jpeg({quality:96}).toBuffer();
}catch(e){console.warn('Icon trim fallback:',e.message)}
for(const size of [192,512]){
  const out=path.join(ASSETS,`icon-${size}-r2.png`);
  await sharp(iconSource).resize(size,size,{fit:'cover',position:'centre'}).png().toFile(out);
  console.log('icon',size,out);
}