/* Safari / Chrome / Edge independent recognition. AI-free deterministic 16x16 glyph matching,
   Claude header alignment, no Tesseract, no PaddleOCR, no roster-total clipping. */
(function(){'use strict';
 const byId=id=>document.getElementById(id),runButton=byId('runBatch');if(!runButton)return;
 // Restrict tables to a useful overview; the name opens complete player details.
 if(typeof window.renderBatchGroup==='function'){
  const wide=window.renderBatchGroup;
  window.renderBatchGroup=(title,rows)=>wide(title,rows,['_screen','_status','名前','ランク','年齢','_position','投/打']);
 }
 // Use a task yield instead of RAF: Safari can pause requestAnimationFrame when the bookmark is backgrounded.
 const frame=()=>new Promise(resolve=>setTimeout(resolve,0));
 const update=(num,message)=>{byId('batchStatus').textContent=`${message}｜${Math.min(100,Math.round(num))}%`};
 const rowCanvas=(img,n,dy)=>{const c=document.createElement('canvas');c.width=280;c.height=16;const y=Math.round(41+15.9*(n-1))-1+dy;c.getContext('2d',{willReadFrequently:true}).drawImage(img,0,y,280,16,0,0,280,16);return c};
  // Cross-check the same printed name through independent vertical row crops.
 // This is deterministic pixel evidence; no learned answer list, APIs, or confidence relaxation.
 function voteAligned(attempts,players){
  const valid=attempts.filter(a=>a?.m?.candidates?.length&&Number.isFinite(a.score));
  if(!valid.length)return null;
  const best=valid.reduce((a,b)=>b.score>a.score?b:a);
  if(best.m.match||valid.length<3)return best;
  const byId=new Map();
  for(const attempt of valid){
   for(const cand of attempt.m.candidates.slice(0,5)){
    const uid=cand.p?._uid;if(!uid)continue;
    if(!byId.has(uid))byId.set(uid,{p:cand.p,uid,first:cand,topVotes:0});
   }
   const top=attempt.m.candidates[0]?.p?._uid;
   if(top&&byId.has(top))byId.get(top).topVotes++;
  }
  const pooled=[];
  for(const item of byId.values()){
   const samples=valid.map(a=>{
    const cs=a.m.candidates,match=cs.find(x=>x.p?._uid===item.uid);
    return match?.score??((cs[cs.length-1]?.score??-1)-.12);
   });
   const avg=samples.reduce((sum,s)=>sum+s,0)/valid.length;
   pooled.push({...item.first,score:avg,topVotes:item.topVotes});
  }
  pooled.sort((a,b)=>b.score-a.score);
  const top=pooled[0],second=pooled[1],gap=(top?.score??-9)-(second?.score??-9);
  if(!top||top.topVotes<Math.max(3,Math.ceil(valid.length*.75))||top.score<.66||gap<.145)return best;
  const clean=s=>String(s||'').normalize('NFKC').replace(/[\\s　]/g,'').replaceAll('藪','薮').replaceAll('髙','高').replaceAll('﨑','崎');
  // One visual name must not accidentally represent multiple roster records.
  if(players.filter(p=>clean(p['名前'])===clean(top.p['名前'])).length!==1)return best;
  const supporting=valid.filter(a=>a.m.candidates[0]?.p?._uid===top.p._uid).sort((a,b)=>b.score-a.score)[0];
  const match={...top,score:top.score};
  return{...supporting,score:top.score,m:{...supporting.m,candidates:pooled.slice(0,5),match,margin:gap,method:'4-shift pixel consensus'}};
 }
 window.yt3VoteAligned=voteAligned;

 function matchAligned(aligned,number,players,category){let best=null,confirmed=null,attempts=[];
  for(const dy of [-2,-1,0,1]){
   const c=rowCanvas(aligned,number,dy),m=yt3ClaudeGlyph.match(c,players,category),sc=m.candidates?.[0]?.score;
   if(!Number.isFinite(sc))continue;
   const v={canvas:c,m,score:sc};attempts.push(v);
   if(!best||sc>best.score)best=v;
   if(m.match&&(!confirmed||sc>confirmed.score))confirmed=v;
   if(dy===-2&&m.match&&sc>=.70&&m.margin>=.18)return v;
  }
  // A slightly higher raw score must not discard an already-confirmed name
  // when both alignments agree on the same top identity.
  if(best&&!best.m.match&&confirmed&&confirmed.score>=best.score-.055&&
     best.m.candidates?.[0]?.p?._uid===confirmed.m.match?.p?._uid)return confirmed;
  return voteAligned(attempts,players)||best;
 }
 const output=(r,i)=>({canvas:r.canvas,file:r.file,row:r.row,firstIndex:i,
    parsed:{pos:({投手:'投',捕手:'捕',內野手:'一',外野手:'外'})[r.category]||''},sources:r.sources||[],
    match:r.match||null,resolved:null,candidates:r.candidates||[],score:r.candidates?.[0]?.score||0,
    raw:r.mode,status:r.match?'確認':'候選'});
 runButton.onclick=async()=>{
  if(!state.batchFiles.length){alert('請先選擇截圖');return}
  if(state.players.length<1000){byId('batchStatus').textContent='完整名冊尚未載入，請先到「資料」更新';return}
  runButton.disabled=true;
  // Release previous batch canvases/results before allocating a new set.
  state.batchRows=[];state.batchRawRows=[];
  try{
   update(1,'載入本機版面與日文字形範本');await Promise.all([yt3ClaudeGlyph.init(),yt3ClaudeAlign.init()]);
   const images=[],aligned=[];
   for(let i=0;i<state.batchFiles.length;i++){
    const file=state.batchFiles[i],im=await loadImage(file);images.push({image:im,name:file.name});
    const norm=yt3ClaudeAlign.normalize(im);aligned.push(norm);
    update(3+10*(i+1)/state.batchFiles.length,'分析遊戲表頭 '+(i+1)+' / '+state.batchFiles.length);
    await frame();
   }
   update(14,'以實際影像比對跨頁重複');const grouped=yt3OfflineOverlapsV14(images);
   const selected=grouped.groups.map(g=>{
     const chosen=g.copies.reduce((a,b)=>{const sa=(aligned[a.imageIndex]?.valid&&aligned[a.imageIndex]?.loc?.score>=.65?1000000000:0)+a.canvas.width*a.canvas.height;const sb=(aligned[b.imageIndex]?.valid&&aligned[b.imageIndex]?.loc?.score>=.65?1000000000:0)+b.canvas.width*b.canvas.height;return sb>sa?b:a});
     return {chosen,copies:g.copies,category:chosen.screenCategory||''};
   });
   const results=[];
   for(let i=0;i<selected.length;i++){
    const s=selected[i],copy=s.chosen,info=aligned[copy.imageIndex],number=copy.originalRow;
    let item=null;
    if(info?.valid&&info.loc.score>=.65&&number>=1&&number<=11)
     item=matchAligned(info.canvas,number,state.players,s.category);
    // Missing/weak first pass: retry only the same row from its source image,
    // never shift to a different physical player or use answer labels.
    if(item&&s.category&&(!item.m.match||(item.m.margin||0)<.16||(item.score||0)<.67)){
      // Position tabs are visual hints, not hard truth: retry the entire roster only for uncertain rows.
      const full=yt3ClaudeGlyph.match(item.canvas,state.players,'');
      const fs=full.candidates?.[0]?.score??-9;
      if(full.candidates?.length&&(fs>=item.score+.02||(!item.m.match&&full.match)))
        item={canvas:item.canvas,m:full,score:fs};
    }
    if(!item||!item.m?.candidates?.length){const m=yt3ClaudeGlyph.match(copy.canvas,state.players,'');item={canvas:copy.canvas,m,score:m.candidates?.[0]?.score||-9}}
    if((!item.m?.match||!item.m?.candidates?.length||(item.m.candidates[0]?.score??-9)<.65)&&s.copies.length>1){
      for(const other of s.copies){if(other===copy)continue;
        const a=aligned[other.imageIndex];let attempt=null;
        if(a?.valid&&a.loc?.score>=.65&&other.originalRow>=1&&other.originalRow<=11)attempt=matchAligned(a.canvas,other.originalRow,state.players,s.category);
        if(!attempt||!attempt.m?.candidates?.length){const m=yt3ClaudeGlyph.match(other.canvas,state.players,'');attempt={canvas:other.canvas,m,score:m.candidates?.[0]?.score||-9}}
        if((attempt.m?.candidates?.length||0)>0){
          const same=attempt.m.candidates[0]?.p?._uid===item.m?.candidates?.[0]?.p?._uid;
          if(!item.m?.candidates?.length||attempt.score>item.score+.055||
            (attempt.m.match&&!item.m.match&&same&&attempt.score>=item.score-.055))item=attempt;
        }
      }
    }
    const m=item.m;
    results.push(output({canvas:item.canvas,file:copy.file,row:number,category:s.category,
      candidates:m.candidates,match:m.match,mode:info?.valid?'Claude r18 全名冊 16×16・對齊 CV':'Claude r18 全名冊 16×16・備援 CV',
      sources:s.copies.map(c=>({file:c.file,screen:c.imageIndex,row:c.originalRow}))},i));
    update(15+80*(i+1)/Math.max(1,selected.length),'非 AI 姓名比對 '+(i+1)+' / '+selected.length);
    if(i%2===1)await frame();
   }
   // Two unrelated row groups cannot both be confirmed as the exact same player.
   const byName=new Map();for(const row of results)if(row.match){const n=row.match.p['名前'];const a=byName.get(n)||[];a.push(row);byName.set(n,a)}
   for(const rows of byName.values())if(rows.length>1)for(const r of rows){r.match=null;r.status='候選'}
   state.batchRawRows=results;state.batchRows=results;state.expectedTotal=0;renderBatchResults();
   const confirmed=results.filter(r=>r.match).length;
   const failed=aligned.filter(x=>!x.valid||x.loc.score<.65).length;
   const overlapCount=grouped.overlaps.reduce((n,e)=>n+e.k,0);
   update(100,`完成：${grouped.rawRows} 原始列 → ${grouped.uniqueRows} 個不同列位（跨頁去重 ${overlapCount}）；確認 ${confirmed}、候選 ${results.length-confirmed}${failed?'；'+failed+' 張表頭改用備援':''}｜全程本機、無 AI`);
  }catch(error){console.error(error);byId('batchStatus').textContent='辨識未完成：'+String(error?.message||error)}
  finally{runButton.disabled=false}
 };
})();