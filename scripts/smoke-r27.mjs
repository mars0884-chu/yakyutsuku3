import fs from 'node:fs/promises';
const book=JSON.parse(await fs.readFile(new URL('../data/guide-book.json',import.meta.url),'utf8'));
function check(ok,msg){if(!ok)throw Error(msg)}
const ch=id=>book.find(c=>c.id===id),sections=id=>ch(id).sections;
check(!sections('idea').some(s=>s.rows?.some(r=>r[0]==='住民からの苦情')),'HomeTown fact still repeated in planning');
check(sections('home').some(s=>s.rows?.some(r=>r[0]==='住民からの苦情')),'canonical HomeTown fact removed');
const advanced=sections('advanced').find(s=>s.title==='球隊構成與比賽面');
check(!advanced.rows.some(r=>['捕手優先級','中線守備','盜壘門檻'].includes(r[0])),'duplicated defense rule');
check(!sections('new_20261005').some(s=>s.title==='本次最值得先看的 8 個新增重點'),'repeated highlight section');
const extra=sections('research').find(s=>s.title.startsWith('另外值得追蹤'));
check(extra.rows.length===2,'historical-only research source list incorrect');
check(sections('sources').some(s=>s.title==='核心公開來源'),'canonical full source list missing');
const names=new Set();
for(const c of book){
 let n=0;for(const s of c.sections||[]){n+=(s.rows?.length||0)+(s.items?.length||0);for(const row of s.rows||[]){const k=JSON.stringify(row.map(x=>String(x??'').normalize('NFKC').trim()));check(!names.has(k),'duplicate table row '+c.id);names.add(k)}}
 check(c.count===n,'chapter count mismatch '+c.id);
}
console.log('r27 semantic dedup OK: HomeTown, defense, source inventory, duplicate overview; '+names.size+' table records');
