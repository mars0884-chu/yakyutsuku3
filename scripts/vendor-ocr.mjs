import fs from 'node:fs/promises';
import path from 'node:path';
const ROOT=path.resolve(new URL('..',import.meta.url).pathname);
async function save(url,dst){await fs.mkdir(path.dirname(dst),{recursive:true});for(let n=0;n<4;n++){try{const r=await fetch(url);if(!r.ok)throw new Error(`${r.status} ${url}`);const b=Buffer.from(await r.arrayBuffer());await fs.writeFile(dst,b);console.log(path.relative(ROOT,dst),b.length);return}catch(e){if(n===3)throw e;await new Promise(r=>setTimeout(r,1000*(n+1)))}}}
const jobs=[
['https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js','vendor/tesseract/tesseract.min.js'],
['https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js','vendor/tesseract/worker.min.js'],
...['tesseract-core.wasm.js','tesseract-core-simd.wasm.js','tesseract-core-lstm.wasm.js','tesseract-core-simd-lstm.wasm.js'].map(f=>[`https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/${f}`,`vendor/tesseract-core/${f}`]),
['https://tessdata.projectnaptha.com/4.0.0/jpn.traineddata.gz','vendor/lang/jpn.traineddata.gz']
];
for(const [u,d] of jobs)await save(u,path.join(ROOT,d));