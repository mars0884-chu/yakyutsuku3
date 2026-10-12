import fs from 'node:fs/promises';
const read=async n=>JSON.parse(await fs.readFile(new URL('../data/'+n,import.meta.url),'utf8'));
const [book,sources,audit,cheats]=await Promise.all(['guide-book.json','sources.json','research-status.json','cheats.json'].map(read));
const ok=(v,m)=>{if(!v)throw Error(m)};
ok(book.length===31&&sources.length>=113,'R52 sources or guide chapters regressed');
ok(new Set(sources.map(s=>s.url)).size===sources.length,'Duplicate URLs');
const cases=[
 ['study','https://mixi.jp/view_bbs.pl?comm_id=88318&id=10575948',3,'カリブローグ'],
 ['history_20261005','https://mixi.jp/view_bbs.pl?comm_id=88318&id=2685129',5,'Ａ・ロードリー'],
 ['tips','https://blog.livedoor.jp/ray_drop/archives/30505401.html',2,'９年目']
];
for(const [id,url,n,key] of cases){
 const c=book.find(c=>c.id===id),part=c?.sections.find(s=>s.source===url);
 ok(part?.rows?.length===n&&JSON.stringify(part).includes(key),'R52 evidence absent '+id);
}
const strong=book.find(c=>c.id==='history_20261005').sections.find(s=>s.source===cases[1][1]);
ok(strong.rows[4][1].includes('DC')&&strong.rows[0][1].includes('技能改變'),'PS2/DC cross-version exclusion lost');
ok(audit.bahamut_external_20261012_r52?.source_after===113&&audit.bahamut_external_20261012_r52?.new_guide_rows===10,'Audit R52 drift');
ok(JSON.stringify(book.find(c=>c.id==='cheats_20261005'))===JSON.stringify(cheats[0]),'Cheat duplicate differs');
const seen=new Set();for(const c of book){
 ok(c.count===c.sections.reduce((n,s)=>n+(s.rows?.length||0)+(s.items?.length||0),0),'Chapter count '+c.id);
 for(const s of c.sections)for(const row of s.rows||[]){
  const key=JSON.stringify(row.map(v=>String(v).normalize('NFKC').replace(/\s+/g,' ').trim()));
  ok(!seen.has(key),'Repeated table row '+key.slice(0,70));seen.add(key);
 }
}
const [v,app,sw]=await Promise.all(['VERSION','app.js','sw.js'].map(n=>fs.readFile(new URL('../'+n,import.meta.url),'utf8')));
const version=v.trim(),n=Number(version.split('-r').at(-1));
ok(/^2026\.10\.12-r\d+$/.test(version)&&n>=52&&app.includes(`APP_VERSION='${version}'`)&&sw.includes(`CACHE='yt3-v20261012-${n}'`),'R52 or later release strings inconsistent');
console.log('R52: '+sources.length+' unique sources, '+seen.size+' unique guide rows, new 10 verified-source case rows.');
