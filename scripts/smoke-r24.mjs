import fs from 'node:fs/promises';
import vm from 'node:vm';
const read=async p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const [batch,book,app,version]=await Promise.all(['engine/r18-batch.js','data/guide-book.json','app.js','VERSION'].map(read));
new Function(batch);new Function(app);
const ctx={window:{},document:{getElementById:()=>({})}};
vm.runInNewContext(batch,ctx);
const f=ctx.window.yt3VoteAligned;
function check(ok,msg){if(!ok)throw Error(msg)}
check(typeof f==='function','vote helper not exported');
const roster=[{_uid:'A',名字:'A','名前':'甲 太郎'},{_uid:'B','名前':'乙 二郎'},{_uid:'C','名前':'丙 三郎'},{_uid:'D','名前':'丁 四郎'}];
const row=(primary,runner,ps=.78,rs=.70)=>({score:ps,canvas:{},m:{match:null,margin:ps-rs,candidates:[{p:roster.find(x=>x._uid===primary),score:ps},{p:roster.find(x=>x._uid===runner),score:rs}]}});
const c=f([row('A','B'),row('A','C'),row('A','D'),row('A','B')],roster);
check(c?.m?.match?.p?._uid==='A','independent crop consensus failed');
const ambiguous=f([row('A','B'),row('B','A'),row('A','B'),row('B','A')],roster);
check(!ambiguous?.m?.match,'2-to-2 conflict must remain candidate');
const weak=f([row('A','B',.58,.52),row('A','C',.57,.53),row('A','D',.59,.54),row('A','B',.55,.50)],roster);
check(!weak?.m?.match,'weak text cannot become confirmed');
const chapters=JSON.parse(book),model=chapters.find(x=>x.id==='models_20261005');
check(model.sections.filter(x=>x.title.includes('原型對照')).length===1,'duplicate aliases across sections');
check(!chapters.find(x=>x.id==='start').sections.some(s=>s.title.includes('巴哈 2006')),'ambiguous-era guide still appears as confirmed');
const names=new Set();for(const ch of chapters){let n=0;for(const s of ch.sections||[]){n+=(s.rows?.length||0)+(s.items?.length||0);for(const row of s.rows||[]){const k=JSON.stringify(row.map(x=>String(x??'').normalize('NFKC').trim()));check(!names.has(k),'duplicate guide row '+ch.id);names.add(k)}}check(ch.count===n,'chapter count '+ch.id)}
check(version.trim()===app.match(/APP_VERSION='([^']+)'/)[1],'version mismatch');
console.log('r24 tests OK: aligned consensus accepts consistent crop only; conflicting/weak candidates stay unresolved; '+names.size+' unique guide rows');
