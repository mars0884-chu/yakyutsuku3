import fs from 'node:fs/promises';
import vm from 'node:vm';

const read=async n=>fs.readFile(new URL('../'+n,import.meta.url),'utf8');
const [app,html,sw,version,overlap,batch,fixes]=await Promise.all([
  'app.js','index.html','sw.js','VERSION','engine/r14-overlap-r18.js','engine/r18-batch.js','engine/r66-name-fixes.js'
].map(read));
const check=(x,message)=>{if(!x)throw Error(message)};

check(version.trim()==='2026.10.23-r67','VERSION must be r67');
check(app.includes("APP_VERSION='2026.10.23-r67'")&&sw.includes("CACHE='yt3-v20261023-67'"),'App and SW versions must agree');
check(html.indexOf('engine/r66-name-fixes.js')<html.indexOf('app.js'),'Name correction must load before app');
check(html.indexOf('engine/r65-halfwidth.js')<html.indexOf('engine/r18-batch.js'),'Half-width matcher must load before batch engine');
check(sw.includes('"./engine/r65-halfwidth.js"')&&sw.includes('"./engine/r66-name-fixes.js"'),'New offline engine files missing');
check(batch.includes('window.YT3_LOW_CONFIDENCE=0.5')&&batch.includes('detectRosterTotal')&&batch.includes('capToRosterTotal'),'Low-confidence and page-total guard missing');
check(batch.includes('window.yt3HalfWidthLatin')&&batch.includes('無 AI'),'Local-only recognition guard missing');
check(overlap.includes('px.k>=4?px.avg>=.77&&px.min>=.72'),'Long four-row overlap regression threshold missing');
check(app.includes('未辨識，需人工')&&app.includes('未辨識 ${unrec}（需人工）'),'Low-confidence result must remain visibly unresolved');

const context={window:{}};
vm.createContext(context);
vm.runInContext(fixes,context);
const roster=[
  {'名前':'神埼 孝司','守備':'外野','_position':'外野手','_group':'國內新人'},
  {'名前':'神埼 孝司','守備':'投手','_position':'投手','_group':'國內新人'},
];
const fixed=context.window.yt3NameFixes.apply(roster).players;
check(fixed[0]['名前']==='神崎 孝司'&&fixed[0]._nameOrig==='神埼 孝司','Screenshot-supported roster correction missing');
check(fixed[1]['名前']==='神埼 孝司'&&!fixed[1]._nameOrig,'Position-scoped correction leaked to another row');

console.log('R67: SHINJO half-width route, four-row overlap, screenshot-bounded total, visible unresolved state, and 神崎 correction verified.');
