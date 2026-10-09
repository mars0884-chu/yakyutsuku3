import fs from 'node:fs/promises';
const b=JSON.parse(await fs.readFile(new URL('../data/guide-book.json',import.meta.url),'utf8'));
function check(v,s){if(!v)throw Error(s)}
const idea=b.find(x=>x.id==='idea'),acq=b.find(x=>x.id==='acquire');
const inverse=idea.sections.find(x=>x.title.startsWith('經營企劃完整逆引'));
const extras=idea.sections.find(x=>x.title.startsWith('經營企劃規則補充'));
check(extras&&inverse,'planning missing');
for(const r of extras.rows)check(!inverse.rows.some(x=>x[0]===r[0]),'duplicate planning entry '+r[0]);
check(acq.sections.filter(s=>s.source?.includes('snA=159')).length===1,'duplicated trade source');
for(const c of b)check(c.count===c.sections.reduce((n,s)=>n+(s.rows?.length||0)+(s.items?.length||0),0),'count mismatch '+c.id);
const sources=JSON.parse(await fs.readFile(new URL('../data/sources.json',import.meta.url),'utf8'));
check(sources.some(x=>x.status==='cross_version_excluded'),'cross-version exclusion not recorded');
console.log('r23 planning / PS2 trade / cross-gen guide dedup passed');
