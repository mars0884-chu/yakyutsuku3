import fs from 'node:fs/promises';
const read=async p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const [match,batch,app,book,version]=await Promise.all(['engine/claude-cv-r18.js','engine/r18-batch.js','app.js','data/guide-book.json','VERSION'].map(read));
for(const src of [match,batch,app])new Function(src);
function check(ok,msg){if(!ok)throw Error(msg)}
check(match.includes('seqAdjusted(')&&match.includes('fineCandidate('),'fine spacing matching unavailable');
check(match.includes('for(const t of eligible)'),'all roster must be checked before fine spacing');
check(batch.includes('confirmed.score>=best.score-.055'),'matched shift may be discarded');
check(batch.includes('s.copies.length>1'),'duplicate copy retry missing');
check(!batch.includes('fetch('),'recognition may not use network requests');
const chapters=JSON.parse(book),all=new Set();let rows=0;
for(const ch of chapters){let n=0;for(const sec of ch.sections||[]){n+=(sec.rows?.length||0)+(sec.items?.length||0);for(const row of sec.rows||[]){const key=JSON.stringify(row.map(x=>String(x??'').normalize('NFKC').trim()));check(!all.has(key),'repeated guide row '+ch.id+' '+sec.title);all.add(key);rows++}}check(ch.count===n,'chapter count mismatch '+ch.id)}
const idea=chapters.find(x=>x.id==='idea');check(!idea.sections.some(x=>x.title==='經營企劃組合表（條件・組合・結果）'),'old repeated 75-row planning list still present');
check(version.trim()===app.match(/APP_VERSION='([^']+)'/)[1],'version mismatch');
console.log('r22 smoke OK: fine glyph spacing, confirmed shift preservation, '+rows+' nonduplicate table rows');
