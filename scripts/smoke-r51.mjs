import fs from 'node:fs/promises';
const read=async n=>JSON.parse(await fs.readFile(new URL('../data/'+n,import.meta.url),'utf8'));
const [book,sources,audit,cheats]=await Promise.all(['guide-book.json','sources.json','research-status.json','cheats.json'].map(read));
const ok=(v,m)=>{if(!v)throw Error(m)};
ok(book.length===31&&sources.length>=109,'R51 chapter/source count regression');
ok(new Set(sources.map(s=>s.url)).size===sources.length,'Repeated source URLs');
const targets=[
 ['models_20261005','https://gamezukinahito.bbs.fc2.com/?act=reply&tid=8320615',7,'イザベル','メヒア'],
 ['history_20261005','https://mixi.jp/view_bbs.pl?comm_id=88318&id=5334774',7,'王 貞治','100年間']
];
for(const [id,url,n,term1,term2] of targets){
 const ch=book.find(c=>c.id===id),sect=ch?.sections.find(s=>s.source===url);
 ok(sect?.rows?.length===n&&JSON.stringify(sect.rows).includes(term1)&&JSON.stringify(sect.rows).includes(term2),'R51 original data absent '+id);
}
const mc=book.find(c=>c.id==='models_20261005').sections.find(s=>s.source===targets[0][1]);
ok(mc.rows[0][1].includes('非 SEGA 正式')&&mc.rows[1][1].includes('≠官方'),'Unofficial model links must be qualified');
const hc=book.find(c=>c.id==='history_20261005').sections.find(s=>s.source===targets[1][1]);
ok(hc.rows[0][1].includes('作者自述')&&hc.rows[2][1].includes('同一檔'),'100 year record must be limited to one player's save');
ok(audit.bahamut_external_20261012_r51?.source_after===109&&audit.bahamut_external_20261012_r51?.new_guide_rows===14,'Research source audit drift');
ok(JSON.stringify(book.find(c=>c.id==='cheats_20261005'))===JSON.stringify(cheats[0]),'Cheat mirror diverged');
const seen=new Set();for(const c of book){
 ok(c.count===c.sections.reduce((n,s)=>n+(s.rows?.length||0)+(s.items?.length||0),0),'Chapter count invalid '+c.id);
 for(const s of c.sections)for(const row of s.rows||[]){
  const key=JSON.stringify(row.map(v=>String(v).normalize('NFKC').replace(/\s+/g,' ').trim()));
  ok(!seen.has(key),'Duplicate guide table entry '+key.slice(0,75));seen.add(key);
 }
}
const [version,app,sw]=await Promise.all(['VERSION','app.js','sw.js'].map(n=>fs.readFile(new URL('../'+n,import.meta.url),'utf8')));
ok(version.trim()==='2026.10.12-r51'&&app.includes("APP_VERSION='2026.10.12-r51'")&&sw.includes("CACHE='yt3-v20261012-51'"),'PWA r51 mismatch');
console.log('R51 verified: '+sources.length+' unique sources, 31 chapters, '+seen.size+' unique table rows, 14 player/model additions.');
