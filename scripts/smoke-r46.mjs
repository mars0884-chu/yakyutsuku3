import fs from 'node:fs/promises';
const read=async p=>JSON.parse(await fs.readFile(new URL('../data/'+p,import.meta.url),'utf8'));
const [book,sources,status]=await Promise.all(['guide-book.json','sources.json','research-status.json'].map(read));
const ok=(v,m)=>{if(!v)throw Error(m)};
ok(book.length===31&&sources.length>=95&&new Set(sources.map(x=>x.url)).size===sources.length,'Guide chapters or unique source URLs broken');
const idea=book.find(x=>x.id==='idea');
const table=idea.sections.find(x=>x.title.startsWith('經營企劃完整逆引'));
const ball=table.rows.find(x=>x[0]==='ボールボーイ募集');
ok(ball?.[2]==='バスケットボール＋サッカーボール','Ball-boy must take exactly two Memo items');
ok(!ball[3].includes('バス：'),'Old bus item still in recipe provenance');
const s=idea.sections.find(x=>x.title.startsWith('引っ越し屋／搬家店：3地已交叉確認'));
ok(s?.rows.length===6,'Lost complete regional list');
for(const area of ['関東','近畿','九州・沖縄'])ok(s.rows.find(x=>x[0]===area)?.[2].includes('確認')||s.rows.find(x=>x[0]===area)?.[2].includes('明確'),'Known shop formula wrongly uncertain '+area);
ok(s.rows.find(x=>x[0]==='北海道・東北')[2].includes('失敗'),'Historical failed experiment warning removed');
let keys=new Set();for(const c of book){ok(c.count===c.sections.reduce((n,x)=>n+(x.rows?.length||0)+(x.items?.length||0),0),'Bad count '+c.id);for(const x of c.sections)for(const r of x.rows||[]){let k=JSON.stringify(r.map(v=>String(v).normalize('NFKC').replace(/\s+/g,' ').trim()));ok(!keys.has(k),'Exact table dup');keys.add(k)}}
ok(status.bahamut_external_20261012_r46?.source_url_growth===0,'Crosscheck audit missing');
ok(/^2026\.10\.12-r\d+$/.test((await fs.readFile(new URL('../VERSION',import.meta.url),'utf8')).trim())&&Number((await fs.readFile(new URL('../VERSION',import.meta.url),'utf8')).trim().split('-r').at(-1))>=46,'Expected r46 or newer');
console.log('R46: 2-card ball-boy, 3 corroborated shop regions, 3 outstanding regions, '+keys.size+' unique rows');
