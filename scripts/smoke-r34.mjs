import fs from 'node:fs/promises';
const read=async x=>JSON.parse(await fs.readFile(new URL('../data/'+x,import.meta.url),'utf8'));
const [book,sources,status,guides]=await Promise.all(['guide-book.json','sources.json','research-status.json','guides.json'].map(read));
function check(v,s){if(!v)throw Error(s)}
check(book.length===31&&guides.length===742,'Unexpected chapter/flat guide count');
const sec=id=>book.find(x=>x.id===id).sections;
for(const title of ['指定 Idea Memo 的流程','已知固定範例','指定新人／外國人、FA／Staff 名單的實用讀檔流程'])check(!sec('random').some(x=>x.title===title),'Repeated steps '+title);
check(!sec('new_20261005').some(x=>x.title.startsWith('新人／FA／Staff')),'Repeated FA guide');
check(!sec('idea').some(x=>x.title==='取得 Memo 的實戰規則'),'Repeated Memo callout');
check(sec('idea').some(x=>x.title.startsWith('出張依頼完整規則')),'Canonical Memo rules missing');
check(sec('random').some(x=>x.title.startsWith('FA／Staff 列表換表流程')),'FA rules missing');
check(sec('acquire').some(x=>x.title==='取得／交易／契約實戰技巧'),'Acquire rules missing');
let unique=new Set();
for(const c of book){const n=c.sections.reduce((n,x)=>n+(x.items?.length||0)+(x.rows?.length||0),0);check(c.count===n,'Bad count '+c.id);for(const s of c.sections)for(const row of s.rows||[]){let k=JSON.stringify(row.map(x=>String(x).normalize('NFKC').replace(/\s+/g,' ').trim()));check(!unique.has(k),'Duplicate row '+k.slice(0,60));unique.add(k)}}
const urls=['http://yakyutsuku.net/itinenmode.html','http://www.gamerkaihathu.com/yakyu/yakyu3.htm','http://versus.s52.xrea.com/game/yakyutsuku/index.php','http://members2.jcom.home.ne.jp/akihiko-9392/'];
for(const u of urls)check(sources.filter(s=>s.url===u&&s.status==='historical_reference_unavailable').length===1,'Missing historical URL '+u);
const audit=status.bahamut_external_20261011_r34;
check(audit?.dedup_removed_sections===5&&audit?.dedup_removed_rows===19&&audit?.dedup_removed_display_entries===38,'Wrong audit');
check((await fs.readFile(new URL('../VERSION',import.meta.url),'utf8')).trim()==='2026.10.11-r34','Wrong version');
console.log('R34 source-index and semantic guide dedup OK: '+unique.size+' unique rows');
