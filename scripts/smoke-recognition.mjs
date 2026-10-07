import fs from 'node:fs/promises';

const src=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
new Function(src);
function assert(cond,msg){if(!cond)throw new Error(msg)}
const start=src.indexOf('async function runBatch(){');
const end=src.indexOf("\n$('#runBatch').onclick=runBatch;",start);
assert(start>=0&&end>start,'runBatch not found');
const run=src.slice(start,end);
assert(run.includes('YT3Krom.recognizeRow'),'KROM row matcher missing');
assert(run.includes('YT3Krom.recognizeTotal'),'KROM footer matcher missing');
assert(run.includes('YT3Krom.calibrationScore'),'font calibration gate missing');
assert(!run.includes('createPaddleOCR('),'PaddleOCR must not participate in name recognition');
assert(!run.includes('Tesseract.createWorker('),'Tesseract must not participate in name recognition');
assert(!run.includes('isIOSLike('),'desktop/mobile must share identical recognition path');
assert(!run.includes('cvAnalyzeRows('),'browser-font CV must not be used');
assert(src.includes("$('#biosFile').onchange"),'desktop BIOS profile builder missing');
assert(src.includes("$('#fontProfileFile').onchange"),'mobile profile import missing');
assert(src.includes("$('#exportFontProfile').onclick"),'profile export missing');
assert(src.includes("function templateConsolidateRows"),'template dedupe missing');
assert(src.includes('if(cal<.62)'),'font mismatch fail-closed gate missing');
console.log('recognition smoke OK: one exact KROM fingerprint path on desktop and mobile');
