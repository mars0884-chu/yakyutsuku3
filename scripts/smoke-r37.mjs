import fs from 'node:fs/promises';
const read=async name=>JSON.parse(await fs.readFile(new URL('../data/'+name,import.meta.url),'utf8'));
const [book,sources,status]=await Promise.all(['guide-book.json','sources.json','research-status.json'].map(read));
function ok(b,m){if(!b)throw Error(m)}
ok(book.length===31&&sources.length>=73,'Expected 31 chapters and 73 sources');
ok(new Set(sources.map(x=>x.url)).size===sources.length,'Duplicate source URL');
const f=book.find(x=>x.id==='facilities'),r=book.find(x=>x.id==='research');
ok(f.sections.find(x=>x.title.startsWith('Crazyboys 2007：'))?.rows.length===4,'Missing facilities tips');
const index=r.sections.find(x=>x.title.startsWith('2006～2009 曾被推薦'));
ok(index?.rows.length===4,'Missing historical site names');
for(const name of ['やきゅつく攻略メモ','やきゅつく３徹底攻略','プロ野球チームをつくろう・攻略式','たなぼたとやきゅぼた３'])ok(index.rows.some(x=>x[0]===name),'Missing '+name);
const seen=new Set();
for(const ch of book){ok(ch.count===ch.sections.reduce((n,x)=>n+(x.items?.length||0)+(x.rows?.length||0),0),'Wrong '+ch.id);for(const sec of ch.sections)for(const row of sec.rows||[]){const k=JSON.stringify(row.map(v=>String(v).normalize('NFKC').replace(/\s+/g,' ').trim()));ok(!seen.has(k),'Duplicate row '+k.slice(0,40));seen.add(k)}}
ok(status.bahamut_external_20261011_r37?.source_count===73,'Missing research record');
ok(/^2026\.10\.11-r\d+$/.test((await fs.readFile(new URL('../VERSION',import.meta.url),'utf8')).trim())&&Number((await fs.readFile(new URL('../VERSION',import.meta.url),'utf8')).trim().split('-r').at(-1))>=37,'Expected r37 or newer');
console.log('R37 OK: 73 sources; 4 verified historical names; 4 practical tips; '+seen.size+' unique table rows');
