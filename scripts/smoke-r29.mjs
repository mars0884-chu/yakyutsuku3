import fs from 'node:fs/promises';
import vm from 'node:vm';
const read=async p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8');
const [align,glyph,batch,book,app,sw,version]=await Promise.all(
 ['engine/claude-align-r17.js','engine/claude-cv-r18.js','engine/r18-batch.js','data/guide-book.json','app.js','sw.js','VERSION'].map(read));
for(const [name,code] of [['align',align],['glyph',glyph],['batch',batch],['app',app],['sw',sw]]){
 try{new Function(code)}catch(e){throw Error(name+' syntax: '+e.message)}
}
const context={window:{},document:{getElementById:()=>({})}};
vm.runInNewContext(align,context);vm.runInNewContext(batch,context);
const ok=(x,msg)=>{if(!x)throw Error(msg)};
const rgb=context.window.yt3ClaudeAlign.selectedInkLuma;
ok(typeof rgb==='function','pure local selected row color-restoration missing');
// These neutral/navy RGB samples were recorded from a real user-supplied selected
// roster screenshot. No name labels or answer data enter production recognition.
for(const [input,minimum] of [
 [[21,21,53],200],[[24,24,56],210],[[38,38,64],175]]){
 ok(rgb(...input)>=minimum,'selected dark navy pixel not restored '+input);
}
for(const input of [[80,80,80],[174,174,174],[63,63,63]]){
 ok(rgb(...input)===input[0],'neutral roster pixel changed '+input);
}
const sky=[150,181,223],lum=Math.round(sky[0]*.299+sky[1]*.587+sky[2]*.114);
ok(rgb(...sky)===lum,'non-text blue UI panel must remain unchanged');
ok(align.includes('src=getPixels(image,true)'),'restoration must precede deterministic resampling');
ok(glyph.includes('window.yt3ClaudeAlign.selectedInkLuma'),'raw-crop fallback must also restore navy ink');
const candidate=context.window.yt3TentativeCandidate;
ok(typeof candidate==='function','推定 status helper missing');
const a={_uid:'a','名前':'木村 一郎'},b={_uid:'b','名前':'鈴木 一郎'};
const item=(p,score,visualScore)=>({p,score,visualScore});
ok(candidate([item(a,.67,.61),item(b,.57,.58)],[a,b])?.p===a,'strong unresolved evidence should show a tentative player');
ok(candidate([item(a,.61,.60),item(b,.59,.58)],[a,b])===null,'close candidates must stay unresolved');
ok(candidate([item(a,.52,.51),item(b,.43,.41)],[a,b])===null,'weak candidates must not be inferred');
ok(candidate([item(a,.67,.61),item(b,.57,.58)],[a,b,{...a,_uid:'c'}])===null,'duplicate roster names must remain ambiguous');
const chapters=JSON.parse(book),newSection=chapters.find(c=>c.id==='advanced')?.sections?.find(s=>s.title.startsWith('PS2 三代進階挑戰玩法'));
ok(newSection?.rows?.length===4,'new PS2 fulltext source not integrated into proper chapter');
const seen=new Set();
for(const ch of chapters){let n=0;for(const sec of ch.sections||[]){
 n+=(sec.rows?.length||0)+(sec.items?.length||0);
 for(const row of sec.rows||[]){const key=JSON.stringify(row.map(x=>String(x??'').normalize('NFKC').trim()));
  ok(!seen.has(key),'duplicate table row '+ch.id+':'+sec.title);seen.add(key)}
}ok(ch.count===n,'guide count mismatch '+ch.id)}
ok(version.trim()===app.match(/APP_VERSION='([^']+)'/)[1],'UI version mismatch');
ok(sw.includes('yt3-v20261010-'+version.trim().split('-r')[1]),'service worker cache does not match VERSION');
console.log('r29 tests pass: real selected-row RGB pixels, unaffected normal rows, tentative safety, unique '+seen.size+' guide facts');
