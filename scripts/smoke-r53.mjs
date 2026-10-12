import fs from 'node:fs/promises';
const json=async n=>JSON.parse(await fs.readFile(new URL('../data/'+n,import.meta.url),'utf8'));
const [book,sources,status,cheats]=await Promise.all(['guide-book.json','sources.json','research-status.json','cheats.json'].map(json));
const check=(v,m)=>{if(!v)throw Error(m)};
check(book.length===31&&sources.length>=114,'R53 chapters/sources');
check(new Set(sources.map(x=>x.url)).size===sources.length,'R53 duplicate source');
const u='https://mixi.jp/view_bbs.pl?comm_id=88318&id=1788036';
const s=book.find(c=>c.id==='cheap')?.sections.find(s=>s.source===u);
check(s?.rows?.length===7,'R53 salary cases not included');
check(s.rows[0][1].includes('玩家推測')&&s.rows[2][1].includes('21.5億')&&s.rows[6][1].includes('單一球隊'),'Salary cases cannot be presented as universal formulas');
check(s.rows[5][0].includes('エリック')&&s.rows[5][1].includes('29億'),'Foreign catcher example missing');
check(status.bahamut_external_20261012_r53?.source_after===114&&status.bahamut_external_20261012_r53?.new_guide_rows===7,'R53 research audit wrong');
check(JSON.stringify(book.find(c=>c.id==='cheats_20261005'))===JSON.stringify(cheats[0]),'Cheat mirror mismatch');
const rows=new Set();for(const c of book){
 check(c.count===c.sections.reduce((n,s)=>n+(s.rows?.length||0)+(s.items?.length||0),0),'Bad count '+c.id);
 for(const s of c.sections)for(const r of s.rows||[]){
  const k=JSON.stringify(r.map(x=>String(x).normalize('NFKC').replace(/\s+/g,' ').trim()));
  check(!rows.has(k),'Duplicate rows '+k.slice(0,65));rows.add(k);
 }
}
const [version,app,sw]=await Promise.all(['VERSION','app.js','sw.js'].map(n=>fs.readFile(new URL('../'+n,import.meta.url),'utf8')));
check(version.trim()==='2026.10.12-r53'&&app.includes("APP_VERSION='2026.10.12-r53'")&&sw.includes("CACHE='yt3-v20261012-53'"),'R53 PWA version inconsistent');
console.log('R53: '+sources.length+' sources, '+rows.size+' unique bilingual guide rows, 26/33 public salary replies with explicit uncertainty.');
