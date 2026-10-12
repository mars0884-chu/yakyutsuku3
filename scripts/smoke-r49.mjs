import fs from 'node:fs/promises';
const read=async p=>JSON.parse(await fs.readFile(new URL('../data/'+p,import.meta.url),'utf8'));
const [book,sources,status,cheats]=await Promise.all(['guide-book.json','sources.json','research-status.json','cheats.json'].map(read));
const ok=(v,m)=>{if(!v)throw Error(m)};
ok(book.length===31&&sources.length>=95,'Source/guide count regressed');
ok(new Set(sources.map(x=>x.url)).size===sources.length,'Duplicate URL');
const url='https://mixi.jp/view_bbs.pl?comm_id=88318&id=1578351';
const source=sources.find(s=>s.url===url);
ok(source?.status==='readable_public_24_of_287_comments_remaining_login_required','Mixi access limitation not recorded');
const skills=book.find(x=>x.id==='skills').sections.find(x=>x.title.startsWith('mixi 2005～2013 開放留言'));
ok(skills?.rows.length===3&&skills.source===url,'Three sourced old skill entries missing');
ok(skills.rows[2][1].includes('2012')&&skills.rows[2][1].includes('8格'),'Contradictory total skills must be qualified');
ok(JSON.stringify(book.find(x=>x.id==='cheats_20261005'))===JSON.stringify(cheats[0]),'Cheats mirror out of sync');
const seen=new Set();for(const ch of book){ok(ch.count===ch.sections.reduce((n,s)=>n+(s.rows?.length||0)+(s.items?.length||0),0),'Bad chapter count '+ch.id);for(const s of ch.sections)for(const row of s.rows||[]){const k=JSON.stringify(row.map(x=>String(x).normalize('NFKC').replace(/\s+/g,' ').trim()));ok(!seen.has(k),'Duplicate guide row '+k.slice(0,65));seen.add(k)}}
ok(status.bahamut_external_20261012_r49?.new_guide_rows===3,'Research audit missing');
ok(/^2026\.10\.12-r\d+$/.test((await fs.readFile(new URL('../VERSION',import.meta.url),'utf8')).trim())&&Number((await fs.readFile(new URL('../VERSION',import.meta.url),'utf8')).trim().split('-r').at(-1))>=49,'Expected r49 or newer');
console.log('R49: 24/287 publicly accessible mixi comments, 3 hypotheses tracked, 31 chapters, '+seen.size+' unique guide rows');
