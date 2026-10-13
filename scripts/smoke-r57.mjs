import fs from 'node:fs/promises';
const read=async p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const [b,s,version,app,sw]=await Promise.all(['data/guide-book.json','data/sources.json','VERSION','app.js','sw.js'].map(read));
const book=JSON.parse(b),sources=JSON.parse(s);
const check=(ok,why)=>{if(!ok)throw Error(why)};
check(book.length===31&&sources.length===122,'No extra unverified research sources');
const camp=book.find(c=>c.id==='camp'),skill=book.find(c=>c.id==='skills');
check(camp.sections.some(s=>s.title==='推薦投手教練（エース伝承候選）'&&s.rows.length===12),'Missing original 12 pitcher coaches');
check(camp.sections.some(s=>s.title==='推薦野手教練'&&s.rows.length===16),'Missing original 16 batter coaches');
const section=skill.sections.find(s=>s.title.startsWith('教練技能／コーチスキル：17種'));
check(section?.rows?.length===17&&section.source==='https://gamezukushi.com/yakyutsuku3/camp','Missing fully cited coach skills');
check(section.rows.filter(row=>row[2]==='投手').length===6&&section.rows.filter(row=>row[2]==='野手').length===11,'Coach skill categories');
check(new Set(section.rows.map(row=>row[0])).size===17&&section.rows.every(row=>row.length===5&&row.every(v=>String(v).trim())),'Japanese/original and Chinese descriptions');
check(section.rows.find(row=>row[0]==='エース伝承')?.[3].includes('球速 B')&&section.rows.find(row=>row[0]==='捕手心得')?.[3].includes('配球 B+'),'Effect table drift');
check(section.note.includes('不是球員一定能達到')&&section.note.includes('教練技能與球員持有技能'),'Coach effects and player skills wrongly conflated');
check(skill.count===skill.sections.reduce((n,s)=>n+(s.rows?.length||0)+(s.items?.length||0),0),'Chapter count drift');
const keys=new Set();for(const ch of book)for(const se of ch.sections)for(const row of se.rows||[]){const k=JSON.stringify(row.map(v=>String(v).normalize('NFKC').replace(/\s+/g,' ').trim()));check(!keys.has(k),'Duplicate '+k.slice(0,70));keys.add(k)}
check(app.includes("APP_VERSION='2026.10.12-r57'")&&sw.includes("CACHE='yt3-v20261012-57'")&&version.trim()==='2026.10.12-r57','PWA version drift');
console.log('R57: 17 discoverable coach skills, 28 previously published coach choices, no inflated source count.');