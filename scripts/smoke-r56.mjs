import fs from 'node:fs/promises';
const read=async n=>fs.readFile(new URL('../'+n,import.meta.url),'utf8');
const [br,sr,ar,v,a,w]=await Promise.all(['data/guide-book.json','data/sources.json','data/research-status.json','VERSION','app.js','sw.js'].map(read));
const book=JSON.parse(br),src=JSON.parse(sr),audit=JSON.parse(ar),ok=(v,m)=>{if(!v)throw Error(m)};
ok(src.length>=122&&new Set(src.map(x=>x.url)).size===src.length,'R56 sources');
const ids=['12614263410','12694435608','12797935897','12604284042','12684804119','12792016879'];
for(const id of ids)ok(src.some(s=>s.url.endsWith('entry-'+id+'.html')&&s.status.includes('explicit_ps2_3')),'Missing PS2-only article '+id);
const skills=book.find(x=>x.id==='skills'),section=skills?.sections.at(-1);
ok(section?.rows?.length===6&&section.title.includes('PS2 三代'),'R56 skill comparison table');
ok(section.rows.some(r=>r[0]==='浅間 敬太'&&r[1]==='WSカーブ'),'R56 seed confirmation');
ok(section.rows.every(r=>r[2].includes('三代')||r[2].includes('本專案')),'R56 PS2 scope notes');
ok(skills.count===skills.sections.reduce((t,s)=>t+(s.rows?.length||0)+(s.items?.length||0),0),'Guide count');
const rows=new Set();for(const ch of book)for(const se of ch.sections)for(const row of se.rows||[]){const k=JSON.stringify(row.map(x=>String(x).normalize('NFKC').replace(/\s+/g,' ').trim()));ok(!rows.has(k),'Duplicate '+k.slice(0,60));rows.add(k)}
ok(audit.bahamut_external_20261012_r56?.source_after===122,'R56 audit');
const release=Number(v.trim().split('-r').at(-1));ok(release>=56&&a.includes(`APP_VERSION='${v.trim()}'`)&&w.includes(`CACHE='yt3-v20261012-${release}'`),'PWA cache/version mismatch');
console.log('R56: '+src.length+' distinct tracked sources, 6 PS2-third-game player skill crosschecks, '+rows.size+' unique rows');