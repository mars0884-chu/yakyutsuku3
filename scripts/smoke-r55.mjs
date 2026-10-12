import fs from 'node:fs/promises';
const read=async x=>fs.readFile(new URL('../'+x,import.meta.url),'utf8');
const [b,s,r,v,a,w]=await Promise.all(['data/guide-book.json','data/sources.json','data/research-status.json','VERSION','app.js','sw.js'].map(read));
const book=JSON.parse(b),sources=JSON.parse(s),status=JSON.parse(r);
const assert=(v,m)=>{if(!v)throw Error(m)};
assert(sources.length>=116&&new Set(sources.map(s=>s.url)).size===sources.length,'R55+ unique public sources');
assert(sources.some(s=>s.url.includes('pcgame.blog.shinobi.jp/')&&s.status.startsWith('verified_fulltext')),'R55 2015 PS2 original missing');
assert(sources.some(s=>s.url.includes('/67623/')&&s.status.includes('search_index')),'R55 source access status wrong');
for(const [id,n] of [['acquire',2],['bugs',2],['economy',2]]){
const chapter=book.find(x=>x.id===id);assert(chapter,'R55 chapter '+id);
const section=chapter.sections.at(-1);assert(section.rows.length===n&&section.source,'R55 source-backed bilingual rows '+id);
assert(chapter.count===chapter.sections.reduce((sum,s)=>sum+(s.rows?.length||0)+(s.items?.length||0),0),'Bad chapter count '+id);
}
const rows=new Set();
for(const chapter of book)for(const section of chapter.sections)for(const row of section.rows||[]){
const key=JSON.stringify(row.map(x=>String(x).normalize('NFKC').replace(/\s+/g,' ').trim()));
assert(!rows.has(key),'Duplicate row '+key.slice(0,65));rows.add(key)}
assert(status.bahamut_external_20261012_r55?.source_after===116&&status.bahamut_external_20261012_r55?.new_guide_rows===6,'R55 research audit');
const n=Number(v.trim().split('-r').at(-1));assert(n>=55&&a.includes(`APP_VERSION='${v.trim()}'`)&&w.includes(`CACHE='yt3-v20261012-${n}'`),'R55+ PWA cache mismatch');
console.log('R55: 116 unique sources, '+rows.size+' source-backed guide rows, 6 new entries with uncertainty preserved.');