import fs from 'node:fs/promises';
const read=async name=>JSON.parse(await fs.readFile(new URL('../data/'+name,import.meta.url),'utf8'));
const [book,cheats,sources,status]=await Promise.all(['guide-book.json','cheats.json','sources.json','research-status.json'].map(read));
const ok=(v,m)=>{if(!v)throw Error(m)};
ok(book.length===31&&sources.length>=95,'Unexpected guide/source count');
ok(new Set(sources.map(s=>s.url)).size===sources.length,'Duplicate source URL');
const home=book.find(c=>c.id==='home').sections.find(s=>s.title.startsWith('2012 第52年原串：一般城市建築'));
ok(home?.rows.length===1&&home.rows[0][1].includes('月初')&&home.rows[0][1].includes('例外'),'Monthly building boundary absent');
const ch=book.find(c=>c.id==='cheats_20261005');ok(JSON.stringify(ch)===JSON.stringify(cheats[0]),'Cheats standalone copy differs');
const row=ch.sections.find(s=>s.title.startsWith('Trade／HomeTown')).rows.find(r=>r[0]==='Trade 全選手可選');
ok(row[3].includes('存檔資料損毀')&&row[3].includes('#765')&&row[3].includes('玩家個案'),'Missing concrete save-corruption warning');
let seen=new Set();for(const c of book){ok(c.count===c.sections.reduce((n,s)=>n+(s.rows?.length||0)+(s.items?.length||0),0),'Bad chapter '+c.id);for(const sec of c.sections)for(const row of sec.rows||[]){const key=JSON.stringify(row.map(x=>String(x).normalize('NFKC').replace(/\s+/g,' ').trim()));ok(!seen.has(key),'Duplicate guide row '+key.slice(0,70));seen.add(key)}}
ok(status.bahamut_external_20261012_r48?.existing_code_warning_strengthened===1,'Research audit missing');
ok((await fs.readFile(new URL('../VERSION',import.meta.url),'utf8')).trim()==='2026.10.12-r48','Wrong release VERSION');
console.log('R48: 1 new historical city timing FAQ, 1 stronger trade code warning, '+seen.size+' unique table rows');
