import fs from 'node:fs/promises';
import vm from 'node:vm';
const rd=async p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const [cv,batch,book,source,app,version]=await Promise.all(
 ['engine/claude-cv-r18.js','engine/r18-batch.js','data/guide-book.json','data/sources.json','app.js','VERSION'].map(rd));
for(const src of [cv,batch,app])new Function(src);
const ctx={window:{},document:{getElementById:()=>({})}};vm.runInNewContext(batch,ctx);
const f=ctx.window.yt3CompareFlatCrops;
const ok=(v,m)=>{if(!v)throw Error(m)};
ok(typeof f==='function','flat crop corroboration not available');
const a={_uid:'A','名前':'田中 太郎'},b={_uid:'B','名前':'鈴木 次郎'};
const players=[a,b],item=(p,canvas,score=.84,margin=.24)=>({
 canvas,score,m:{candidates:[{p,score,visualScore:.79}],match:{p,score},margin}});
const base={canvas:{},score:.49,m:{candidates:[{p:b,score:.49}],match:null,margin:.03}};
let aa=item(a,{}),bb=item(a,{});
ok(f(base,aa,bb,players).m.match?.p?._uid==='A','two independent strong crops should recover player');
ok(!f(base,aa,item(b,{}),players).m.match,'different names must stay candidate');
ok(!f(base,aa,item(a,aa.canvas),players).m.match,'same canvas is not independent proof');
ok(!f(base,aa,bb,[a,{...a,_uid:'C'},b]).m.match,'duplicate names must remain candidates');
ok(cv.includes('flatLeft:origin('),'split-free raw origin missing');
ok(cv.includes('!options.forceFlat&&!!row.block'),'forceFlat still relies on detected separator');
ok(cv.includes('options.forceFlat?best.score>=.78'),'strict second-pass threshold missing');
ok(batch.includes('if(!item.m?.match&&item.m?.candidates?.length)'),'fallback must only run for unresolved rows');
const chapters=JSON.parse(book),skills=chapters.find(x=>x.id==='skills');
ok(!skills.sections.some(s=>s.title==='技能傳承：特殊限制與 20 年樣本'),'duplicate skills section persisted');
ok(skills.sections.find(s=>s.title==='20年技能傳承觀察樣本')?.rows?.length===8,'skill sample lost');
const historical=JSON.parse(source).find(x=>x.url==='http://ya3.tsukuclear.com/');
ok(historical?.status==='historical_reference_unavailable','unreadable external site mislabeled');
const seen=new Set();let total=0;
for(const ch of chapters){
 let n=0;
 for(const s of ch.sections||[]){
  n+=(s.rows?.length||0)+(s.items?.length||0);
  for(const r of s.rows||[]){
   const key=JSON.stringify(r.map(x=>String(x??'').normalize('NFKC').trim()));
   ok(!seen.has(key),'duplicate guide row in '+ch.id);seen.add(key);total++;
  }
 }
 ok(ch.count===n,'chapter count wrong '+ch.id);
}
ok(version.trim()===app.match(/APP_VERSION='([^']+)'/)[1],'version mismatch');
console.log('r28 smoke passed: separator-free second pass, independent crop agreement, unresolved conflicts, '+total+' unique rows');