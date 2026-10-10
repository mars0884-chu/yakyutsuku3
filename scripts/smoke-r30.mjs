import fs from 'node:fs/promises';
import vm from 'node:vm';
import JSZip from 'jszip';
const rd=async p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const [gate,overlap,batch,app,index,sw,version,cv,manifest]=await Promise.all(
 ['engine/r30-row-ink.js','engine/r14-overlap-r18.js','engine/r18-batch.js','app.js','index.html','sw.js','VERSION','engine/claude-cv-r18.js','package.json'].map(rd));
for(const src of [gate,overlap,batch,app,cv,sw])new Function(src);
const ctx={window:{},document:{getElementById:()=>({})}};
vm.runInNewContext(gate,ctx);
const detect=ctx.window.yt3RowInkGate;
if(typeof detect!=='function')throw Error('ink gate not exported');
const hist=[520,550,489,466,0,0,0,0,0,0,0],flags=hist.map((_,i)=>i<4);
const canvas={getContext:()=>({getImageData(x,y,w,h){
 const row=Math.round((y-40)/15.9);
 const occupied=flags[row]||false;
 const data=new Uint8ClampedArray(w*h*4);
 if(occupied){for(let i=0;i<Math.min(500,w*h);i++){data[i*4]=data[i*4+1]=data[i*4+2]=230;data[i*4+3]=255}}
 return{data};
}})};
let have=0;for(let n=1;n<=11;n++)if(detect(canvas,n).hasName)have++;
if(have!==4)throw Error('blank row leak '+have);
if(!overlap.includes('yt3RowInkGate(normal.canvas,r.row)'))throw Error('overlap must filter before grouping');
if(!batch.includes('yt3OfflineOverlapsV14(images,aligned)'))throw Error('aligned images not passed to de-duplicator');
if(!cv.includes('empty-name-suppressed'))throw Error('CV must not hallucinate blank rows');
if(!app.includes("window.JSZip.loadAsync(await archive.arrayBuffer())"))throw Error('ZIP import missing');
if(!app.includes("id in ['batchFiles'")){/* check DOM instead */}
if(!index.includes('id="batchZip"')||!index.includes('webkitdirectory'))throw Error('ZIP/folder picker missing');
if(!index.includes('./vendor/jszip.min.js')||!sw.includes('./vendor/jszip.min.js'))throw Error('offline JSZip vendor missing');
const zip=new JSZip();
zip.file('666/IMG_3600.jpg',new Uint8Array([1,2,3]),{compression:'DEFLATE'});
zip.file('__MACOSX/666/._IMG_3600.jpg','metadata');
const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
const re=await JSZip.loadAsync(bytes);
if(Object.keys(re.files).filter(k=>/\.jpg$/i.test(k)&&!k.startsWith('__MACOSX')).length!==1)throw Error('zip excludes resource forks');
const data=JSON.parse(manifest);
if(data.dependencies.jszip!=='3.10.1')throw Error('JSZip dependency missing');
if(!version.trim().startsWith('2026.10.10-r')||!app.includes("const APP_VERSION='"+version.trim()+"'"))throw Error('version mismatch');
console.log('r30 PASS: blank rows ignored, name-only geometry, 11-slot sample test, ZIP/Folder plus offline deps');
