import fs from 'node:fs/promises';
import vm from 'node:vm';

const src=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
new Function(src);

function assert(cond,msg){if(!cond)throw new Error(msg)}
const start=src.indexOf('async function runBatch(){');
const end=src.indexOf("\n$('#runBatch').onclick=runBatch;",start);
assert(start>=0&&end>start,'runBatch not found');
const run=src.slice(start,end);
const cvAt=run.indexOf('await cvAnalyzeRows(state.batchRawRows)');
const branchAt=run.indexOf('const ios=isIOSLike()');
assert(cvAt>=0,'shared CV call missing');
assert(branchAt>cvAt,'platform split occurs before shared CV');

const iosStart=run.indexOf('if(ios){',branchAt);
const desktopStart=run.indexOf('}else{',iosStart);
assert(iosStart>=0&&desktopStart>iosStart,'mobile/desktop split missing');
const mobile=run.slice(iosStart,desktopStart);
const desktop=run.slice(desktopStart);
assert(!mobile.includes('createPaddleOCR('),'mobile branch must not start PaddleOCR');
assert(desktop.includes('createPaddleOCR('),'desktop optional PaddleOCR branch missing');
assert(src.includes('function footerTotalCrop('),'footer total crop missing');
assert(src.includes('function cvFooterTotal('),'CV total reader missing');

const m=src.match(/function isIOSLike\(\)\{[^}]+\}/);
assert(m,'isIOSLike not found');
function device(nav){
  const ctx=vm.createContext({navigator:nav});
  vm.runInContext(m[0],ctx);
  return vm.runInContext('isIOSLike()',ctx);
}
assert(device({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',platform:'iPhone',maxTouchPoints:5})===true,'iPhone must use mobile branch');
assert(device({userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)',platform:'iPad',maxTouchPoints:5})===true,'iPad must use mobile branch');
assert(device({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15',platform:'MacIntel',maxTouchPoints:5})===true,'touch iPad desktop UA must use mobile branch');
assert(device({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/140.0',platform:'Win32',maxTouchPoints:0})===false,'Windows Edge must use desktop branch');
assert(device({userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Chrome/140.0',platform:'MacIntel',maxTouchPoints:0})===false,'Mac desktop must use desktop branch');

console.log('recognition smoke OK: shared CV + mobile/desktop coexistence');
