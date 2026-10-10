import fs from 'node:fs/promises';
const read=async p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const [app,batch,match,html,sw,book,version]=await Promise.all(['app.js','engine/r18-batch.js','engine/claude-cv-r18.js','index.html','sw.js','data/guide-book.json','VERSION'].map(read));
function check(b,m){if(!b)throw Error(m)}
for(const src of [app,batch,match,sw])new Function(src);
check(batch.includes('runButton.onclick=async()=>'),'r18 handler missing');
check(html.indexOf('engine/claude-cv-r18.js')<html.indexOf('engine/r18-batch.js'),'glyph script order');
check((batch.includes('yt3OfflineOverlapsV14(images)')||batch.includes('yt3OfflineOverlapsV14(images,aligned)'))&&batch.includes('yt3ClaudeGlyph.match('),'pixel engine not wired');
check(!batch.includes('fetch(')&&!batch.includes('https://'),'r18 matching cannot call remote APIs');
check(match.includes('for(const t of eligible)')&&!match.includes('await base.init()'),'full roster / unused 8x8 glyph pack');
check(sw.includes('YT3_CACHE_PROGRESS')&&app.includes('YT3_CACHE_PROGRESS'),'real cache progress missing');
check(!sw.includes('c.navigate(c.url)')&&!sw.includes('then(()=>self.skipWaiting())'),'SW cannot reload active recognition');
check(version.trim()===app.match(/APP_VERSION='([^']+)'/)[1],'version mismatch');
check(JSON.parse(book).find(x=>x.id==='idea')?.sections.some(x=>x.title.startsWith('經營企劃完整逆引')),'deduped guide missing');
console.log('r18 smoke OK: active pixel CV, Safari update progress, safe SW, guide records');
