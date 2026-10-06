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
// Square app icons: keep title/central field area visible rather than stretching.
for(const size of [192,512]){
  await sharp(input).resize(size,size,{fit:'cover',position:'centre'}).png().toFile(path.join(ASSETS,`icon-${size}.png`));
}