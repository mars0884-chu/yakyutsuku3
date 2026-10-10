import fs from 'node:fs/promises';
import vm from 'node:vm';
const read=async p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const [overlap,batch,app,html,css,book,version,sw,sources]=await Promise.all(
 ['engine/r14-overlap-r18.js','engine/r18-batch.js','app.js','index.html','styles.css','data/guide-book.json','VERSION','sw.js','data/sources.json'].map(read));
const assert=(condition,msg)=>{if(!condition)throw Error(msg)};
for(const file of [overlap,batch,app,sw])new Function(file);
const mockedCanvas=()=>({width:280,height:16,getContext:()=>({getImageData:()=>({data:new Uint8ClampedArray(280*16*4)})})});
const ctx={window:{yt3OverlapPair:()=>({k:1,avg:.96,min:.96})},
 batchTestRows:(image,file)=>[{canvas:mockedCanvas(),row:1,file}],
 yt3CaptureCategory:()=>''};
vm.runInNewContext(overlap,ctx);
const fn=ctx.window.yt3OfflineOverlapsV14;
assert(typeof fn==='function','pixel overlap engine not available');
const cross=fn([{image:{},name:'222__222__2.png'},
 {image:{},name:'封存__IMG_3536.jpg'}]);
assert(cross.rawRows===2&&cross.uniqueRows===2&&cross.overlaps.length===0,
 'different ZIPs must never collapse into one physical player');
const intra=fn([{image:{},name:'222__222__2.png'},
 {image:{},name:'222__222__3.png'}]);
assert(intra.uniqueRows===1&&intra.overlaps.length===1,
 'same-ZIP neighboring screenshots must keep pixel-overlap detection');
assert(overlap.includes('px.avg-runner.avg>=.055')&&overlap.includes('sameBatch'),'weak overlap conflict check missing');
assert(batch.includes('batchArchiveDetails'),'per-ZIP statistics missing');
assert(batch.includes("row.batchGroup+'|'")&&batch.includes("const confirmedIds=new Set(results.filter(r=>r.match).map(r=>r.batchGroup"),
 'a player occurring in two ZIPs must not lose both confirmations');
assert(html.includes('id="comparePanel"')&&app.includes('function renderComparePanel()')&&
 app.includes('const compareUids=new Set()')&&app.includes('compareUids.size>=4'),
 'player comparison with 4-player cap is missing');
assert(app.includes('data-compare-add')&&app.includes('drawerCompare'),
 'must support compare from search and player details');
assert(css.includes('.compare-scroll{overflow:auto')&&css.includes('position:sticky'),
 'phone comparison needs horizontal scrolling and sticky attribute');
assert(/^2026[.]10[.][0-9]{2}-r[0-9]+$/.test(version.trim())&&app.includes("const APP_VERSION='"+version.trim()+"'"),
 'version mismatch');
assert(sw.includes("yt3-v"+version.trim().split('-r')[0].split('.').join('')+"-"+version.trim().split('-r')[1]),'offline update version mismatch');
const chapters=JSON.parse(book),d=chapters.find(c=>c.id==='advanced')?.sections?.find(s=>s.title.includes('横浜ベイスターズ長期實戰'));
assert(d?.rows?.length===3,'PS2 3 firsthand notes not imported once');
const set=new Set();for(const ch of chapters){
 let n=0;for(const sec of ch.sections||[]){
 n+=(sec.rows?.length||0)+(sec.items?.length||0);
 for(const row of sec.rows||[]){const key=JSON.stringify(row.map(x=>String(x??'').normalize('NFKC').trim()));
 assert(!set.has(key),'duplicate guide row '+ch.id+':'+sec.title);set.add(key)}
 }
 assert(ch.count===n,'chapter count wrong '+ch.id);
}
const verified=JSON.parse(sources);
assert(verified.some(x=>x.url.includes('bsn=6035&snA=121')&&x.status.includes('crosschecked')),'Bahamut PS2 article audit missing');
console.log('r31 smoke passed: ZIP isolation, within-ZIP overlap, duplicates, 4-player comparison, guide and source audit; '+set.size+' unique guide facts');
