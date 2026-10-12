import fs from 'node:fs/promises';
const read=async p=>JSON.parse(await fs.readFile(new URL('../data/'+p,import.meta.url),'utf8'));
const [book,sources,status]=await Promise.all(['guide-book.json','sources.json','research-status.json'].map(read));
const ok=(v,m)=>{if(!v)throw Error(m)};
ok(book.length===31&&sources.length>=95,'Unexpected chapter/source count');
ok(new Set(sources.map(x=>x.url)).size===sources.length,'Source URL duplicates');
const url='https://n2ch.net/r/FbB------F/gamespo/1317196650/1-?guid=ON';
ok(sources.filter(s=>s.url===url).length===1,'Missing/duplicate primary mirror');
const home=book.find(x=>x.id==='home').sections.find(x=>x.title.startsWith('2012 玩家 FAQ：駅の再誘致'));
const strategy=book.find(x=>x.id==='advanced').sections.find(x=>x.title.startsWith('2012 玩家 FAQ：無条件交代'));
ok(home?.rows.length===1&&strategy?.rows.length===2,'Missing three new player FAQ entries');
ok(home.source===url&&strategy.source===url,'Wrong provenance URL');
ok(strategy.rows[1][1].includes('可能')&&strategy.rows[1][1].includes('沒有受控實驗'),'No player hypothesis caution');
const unique=new Set();for(const c of book){ok(c.count===c.sections.reduce((n,s)=>n+(s.rows?.length||0)+(s.items?.length||0),0),'Bad count '+c.id);for(const s of c.sections)for(const row of s.rows||[]){const k=JSON.stringify(row.map(v=>String(v).normalize('NFKC').replace(/\s+/g,' ').trim()));ok(!unique.has(k),'Duplicate guide table row '+k.slice(0,70));unique.add(k)}}
ok(status.bahamut_external_20261012_r47?.new_guide_rows===3,'Missing source research audit');
ok((await fs.readFile(new URL('../VERSION',import.meta.url),'utf8')).trim()==='2026.10.12-r47','Wrong VERSION');
console.log('R47: 3 sourced FAQ items, 31 chapters, '+unique.size+' unique guide rows, '+sources.length+' indexed sources');
