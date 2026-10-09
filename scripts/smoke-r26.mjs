import fs from 'node:fs/promises';
import vm from 'node:vm';
const read=async p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const [batch,glyph,app,version]=await Promise.all(['engine/r18-batch.js','engine/claude-cv-r18.js','app.js','VERSION'].map(read));
new Function(batch);new Function(glyph);new Function(app);
const ctx={window:{},document:{getElementById:()=>({})}};vm.runInNewContext(batch,ctx);
function ok(v,m){if(!v)throw Error(m)}
const f=ctx.window.yt3ReconcileRowCrops;
ok(typeof f==='function','missing original crop comparator');
const players=[{_uid:'a','名前':'甲 太郎'},{_uid:'b','名前':'乙 太郎'}];
const row=(i,s,g,confirmed=false)=>({score:s,m:{candidates:[{p:players[i],score:s}],margin:g,match:confirmed?{p:players[i],score:s}:null}});
ok(f(row(0,.75,.11),row(0,.74,.12),players).m.match?.p?._uid==='a','strong two-crop agreement not confirmed');
ok(!f(row(0,.75,.11),row(1,.74,.12),players).m.match,'disagreement must stay pending');
ok(!f(row(0,.57,.07),row(0,.75,.12),players).m.match,'weak crop must stay pending');
ok(!f(row(0,.75,.11),row(0,.74,.12),[players[0],{...players[0],_uid:'c'}]).m.match,'duplicate names must stay pending');
ok(glyph.includes('options.recovery?24:10')&&glyph.includes('options.recovery?12:9'),'fallback name segmentation absent');
ok(version.trim()===app.match(/APP_VERSION='([^']+)'/)[1],'version mismatch');
console.log('r26 tests passed: local original crop, strict margins, ambiguous name recovery, version');