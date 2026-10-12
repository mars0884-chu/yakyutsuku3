import fs from 'node:fs/promises';
const read=async n=>JSON.parse(await fs.readFile(new URL('../data/'+n,import.meta.url),'utf8'));
const [book,sources,status]=await Promise.all(['guide-book.json','sources.json','research-status.json'].map(read));
const ok=(v,m)=>{if(!v)throw Error(m)};
ok(book.length===31&&sources.length>=95&&new Set(sources.map(x=>x.url)).size===sources.length,'Counts or source URL uniqueness');
const thread='https://kako.5ch.io/test/read.cgi/gamespo/1123809103';
ok(sources.filter(x=>x.url===thread).length===1,'No duplicate source');
const chapter=book.find(x=>x.id==='one');
const sec=chapter.sections.find(x=>x.title.startsWith('2005 PS2 第20年原串：一年模式對左投'));
ok(sec?.rows.length===6&&sec.source===thread,'Missing sourced year-mode roster');
ok(sec.rows[1][1].includes('ロッテ')&&sec.rows[1][1].includes('ダイエー'),'Left-hand target list missing');
ok(sec.rows[1][2].includes('巨人')&&sec.rows[1][2].includes('撤回'),'Uncorrected source rumor');
ok(sec.rows[4][1].includes('森野')&&sec.rows[5][1].includes('川村'),'Positions missing');
const set=new Set();for(const ch of book){ok(ch.count===ch.sections.reduce((n,s)=>n+(s.items?.length||0)+(s.rows?.length||0),0),'Count invalid '+ch.id);for(const s of ch.sections)for(const row of s.rows||[]){const k=JSON.stringify(row.map(x=>String(x).normalize('NFKC').replace(/\s+/g,' ').trim()));ok(!set.has(k),'Duplicate guide row '+k.slice(0,60));set.add(k)}}
ok(status.bahamut_external_20261012_r45?.new_yearmode_rows===6,'Source audit missing');
ok(/^2026\.10\.12-r\d+$/.test((await fs.readFile(new URL('../VERSION',import.meta.url),'utf8')).trim())&&Number((await fs.readFile(new URL('../VERSION',import.meta.url),'utf8')).trim().split('-r').at(-1))>=45,'Expected r45 or newer');
console.log('R45 OK: one-year mode 6 rows, corrected giants rumor, '+sources.length+' source URLs, '+set.size+' unique guide rows');
