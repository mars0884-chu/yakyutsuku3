import fs from 'node:fs/promises';
const json=async n=>JSON.parse(await fs.readFile(new URL('../data/'+n,import.meta.url),'utf8'));
const [book,sources,status,cheats]=await Promise.all(['guide-book.json','sources.json','research-status.json','cheats.json'].map(json));
const ok=(v,m)=>{if(!v)throw new Error(m)};
ok(book.length===31,'31 consolidated chapters must remain');
ok(sources.length>=103&&new Set(sources.map(x=>x.url)).size===sources.length,'Sources missing/duplicate');
const targets=[
 ['bugs','https://kako.5ch.io/test/read.cgi/gamespo/1178709384',4,'SEGA'],
 ['academy','https://mixi.jp/view_bbs.pl?comm_id=88318&id=5887734',4,'アメリカ'],
 ['tips','https://mixi.jp/view_bbs.pl?comm_id=88318&id=12893530',3,'フォアボール'],
 ['cheap','https://mixi.jp/view_bbs.pl?comm_id=88318&id=13200623',2,'江夏'],
 ['advanced','https://mixi.jp/view_bbs.pl?comm_id=88318&id=16752519',2,'王貞治']
];
for(const [id,url,n,term] of targets){
 const chapter=book.find(c=>c.id===id),section=chapter?.sections.find(s=>s.source===url);
 ok(section?.rows.length===n,'Missing or changed section '+id);
 ok(JSON.stringify(section).includes(term),'Missing original Japanese context '+id);
}
const seen=new Set();for(const chapter of book){
 ok(chapter.count===chapter.sections.reduce((n,s)=>n+(s.rows?.length||0)+(s.items?.length||0),0),'Count mismatch '+chapter.id);
 for(const s of chapter.sections)for(const row of s.rows||[]){
  const k=JSON.stringify(row.map(v=>String(v).normalize('NFKC').replace(/\s+/g,' ').trim()));
  ok(!seen.has(k),'Duplicate guide row '+k.slice(0,80));seen.add(k);
 }
}
ok(JSON.stringify(book.find(c=>c.id==='cheats_20261005'))===JSON.stringify(cheats[0]),'Cheat mirror changed');
ok(status.bahamut_external_20261012_r50?.new_guide_rows===15,'Research audit not synchronized');
const version=(await fs.readFile(new URL('../VERSION',import.meta.url),'utf8')).trim();
const app=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
const sw=await fs.readFile(new URL('../sw.js',import.meta.url),'utf8');
const release=Number(version.split('-r').at(-1));
ok(/^2026\.10\.\d+-r\d+$/.test(version)&&release>=50&&app.includes(`APP_VERSION='${version}'`)&&sw.includes(`CACHE='yt3-v20261023-${release}'`),'PWA version/cache mismatch');
console.log('R50: '+sources.length+' unique sources, 15 new dated bilingual case rows, '+seen.size+' unique guide rows');
