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
  const clean=s=>String(s||'').normalize('NFKC').replace(/\s/g,'').replaceAll('藪','薮').replaceAll('髙','高').replaceAll('﨑','崎');
  // One visual name must not accidentally represent multiple roster records.
  if(players.filter(p=>clean(p['名前'])===clean(top.p['名前'])).length!==1)return best;
  const supporting=valid.filter(a=>a.m.candidates[0]?.p?._uid===top.p._uid).sort((a,b)=>b.score-a.score)[0];
  const match={...top,score:top.score};
  return{...supporting,score:top.score,m:{...supporting.m,candidates:pooled.slice(0,5),match,margin:gap,method:'4-shift pixel consensus'}};
 }
 window.yt3VoteAligned=voteAligned;


 // Only accept weak-name corroboration when the original row crop agrees.
 function reconcileRowCrops(primary,alternate,players){
  if(!alternate?.m?.candidates?.length)return primary;
  if(!primary?.m?.candidates?.length)return alternate;
  if(primary.m.match)return primary;
  const a=primary.m.candidates[0],b=alternate.m.candidates[0];
  if(a.p?._uid!==b.p?._uid)return primary;
  if(alternate.m.match&&alternate.score>=primary.score-.04)return alternate;
  if(primary.score<.68||alternate.score<.68||(primary.m.margin||0)<.105||(alternate.m.margin||0)<.105)return primary;
  const norm=s=>String(s||'').normalize('NFKC').replace(/\s/g,'');
  if(players.filter(p=>norm(p['名前'])===norm(a.p['名前'])).length!==1)return primary;
  return{...primary,m:{...primary.m,match:a,method:'independent crop corroboration'}};
 }
 window.yt3ReconcileRowCrops=reconcileRowCrops;

 // Separator-free search runs on unresolved rows only; both independent crops
 // must agree before upgrading a candidate to a confirmed name.
 function compareFlatCrops(base,aligned,raw,players){
   const a=aligned?.m,b=raw?.m;
   const first=a?.candidates?.[0],second=b?.candidates?.[0];
   if(!first?.p?._uid||first.p._uid!==second?.p?._uid)return base;
   const uid=first.p._uid;
   const uniqueName=s=>String(s||'').normalize('NFKC').replace(/\s/g,'');
   const unique=players.filter(x=>uniqueName(x['名前'])===uniqueName(first.p['名前'])).length===1;
   if(!unique)return base;
   const independent=!!aligned?.canvas&&!!raw?.canvas&&aligned.canvas!==raw.canvas;
   const bothConfirm=independent&&a.match?.p?._uid===uid&&b.match?.p?._uid===uid&&
     Math.abs((first.score||0)-(second.score||0))<=.12;
   if(bothConfirm&&!base?.m?.match){
     const stronger=aligned.score>=raw.score?aligned:raw;
     return{...stronger,m:{...stronger.m,method:'two independent separator-free crops'}};
   }
   // Rank a stable, previously excluded name as a candidate without making
   // unsupported accuracy claims.
   if(!base?.m?.match&&first.score>=.66&&second.score>=.66&&
     (base?.score??-9)<Math.min(first.score,second.score)-.06){
     const candidate={...first,score:Math.min(first.score,second.score)};
     const tail=(base?.m?.candidates||[]).filter(x=>x.p?._uid!==uid).slice(0,4);
     return{...aligned,score:candidate.score,m:{...aligned.m,match:null,
       candidates:[candidate,...tail],method:'unresolved separator-free candidate'}};
   }
   return base;
 }
 window.yt3CompareFlatCrops=compareFlatCrops;

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
 // High-scoring first guesses are useful as tentative lookups, not confirmed IDs.
 function tentativeCandidate(candidates,players){
  const first=candidates?.[0],second=candidates?.[1];
  if(!first?.p||!second)return null;
  if(first.score<.57||first.score-second.score<.075||(first.visualScore??first.score)<.52)return null;
  const norm=s=>String(s||'').normalize('NFKC').replace(/\s/g,'');
  return players.filter(p=>norm(p['名前'])===norm(first.p['名前'])).length===1?first:null;
 }
 window.yt3TentativeCandidate=tentativeCandidate;

 const batchGroupOf=name=>String(name||'').match(/^(.+?)__/)?.[1]||'單張截圖';
 const output=(r,i)=>({canvas:r.canvas,file:r.file,row:r.row,batchGroup:batchGroupOf(r.file),firstIndex:i,
    parsed:{pos:({投手:'投',捕手:'捕',內野手:'一',外野手:'外'})[r.category]||''},sources:r.sources||[],
    match:r.match||null,resolved:r.match?null:tentativeCandidate(r.candidates,state.players),candidates:r.candidates||[],score:r.candidates?.[0]?.score||0,
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
   update(14,'以實際影像比對跨頁重複');const grouped=yt3OfflineOverlapsV14(images,aligned);
   const selected=grouped.groups.map(g=>{
     const chosen=g.copies.reduce((a,b)=>{const sa=(aligned[a.imageIndex]?.valid&&aligned[a.imageIndex]?.loc?.score>=.65?1000000000:0)+a.canvas.width*a.canvas.height;const sb=(aligned[b.imageIndex]?.valid&&aligned[b.imageIndex]?.loc?.score>=.65?1000000000:0)+b.canvas.width*b.canvas.height;return sb>sa?b:a});
     return {chosen,copies:g.copies,category:chosen.screenCategory||''};
   });
   const results=[];
   for(let i=0;i<selected.length;i++){
    const s=selected[i],copy=s.chosen,info=aligned[copy.imageIndex],number=copy.originalRow;
    let item=null;
    // Do not attempt to identify empty printed slots, even if geometry fallback
    // included them. Blank rows can otherwise hallucinate the same short name.
    if(info?.valid&&window.yt3RowInkGate){
      const ink=window.yt3RowInkGate(info.canvas,number);
      if(!ink.hasName&&!ink.uncertain)continue;
    }
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
    if(item&&!item.m.match&&item.m.candidates?.length){
      const raw=yt3ClaudeGlyph.match(copy.canvas,state.players,'');
      item=reconcileRowCrops(item,{canvas:copy.canvas,m:raw,score:raw.candidates?.[0]?.score??-9},state.players);
      if(!item.m.match&&item.score>=.4){
        const alt=yt3ClaudeGlyph.match(item.canvas,state.players,'',{recovery:true});
        if(alt.match&&alt.candidates?.[0]?.p?._uid===item.m.candidates?.[0]?.p?._uid&&
          alt.candidates[0].score>=item.score-.04)item={canvas:item.canvas,m:alt,score:alt.candidates[0].score};
      }
    }
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
    if(!item.m?.match&&item.m?.candidates?.length){
      const flatAligned=yt3ClaudeGlyph.match(item.canvas,state.players,'',{forceFlat:true});
      const flatOriginal=yt3ClaudeGlyph.match(copy.canvas,state.players,'',{forceFlat:true});
      item=compareFlatCrops(item,
       {canvas:item.canvas,m:flatAligned,score:flatAligned.candidates?.[0]?.score??-9},
       {canvas:copy.canvas,m:flatOriginal,score:flatOriginal.candidates?.[0]?.score??-9},
       state.players);
    }
    const m=item.m;
    results.push(output({canvas:item.canvas,file:copy.file,row:number,category:s.category,
      candidates:m.candidates,match:m.match,mode:info?.valid?'本機全名冊 16×16 字形比對':'本機全名冊 16×16 原始列備援',
      sources:s.copies.map(c=>({file:c.file,screen:c.imageIndex,row:c.originalRow}))},i));
    update(15+80*(i+1)/Math.max(1,selected.length),'非 AI 姓名比對 '+(i+1)+' / '+selected.length);
    if(i%2===1)await frame();
   }
   // Two unrelated row groups cannot both be confirmed as the exact same player.
   // A player can legitimately appear in different ZIP/season rosters. Only
   // duplicated names inside the SAME capture sequence require collision review.
   const byName=new Map();
   for(const row of results)if(row.match){
     const key=row.batchGroup+'|'+String(row.match.p['名前']).normalize('NFKC').replace(/\s/g,'');
     const group=byName.get(key)||[];group.push(row);byName.set(key,group);
   }
   for(const group of byName.values())if(group.length>1){
     for(const row of group){row.match=null;row.status='候選'}
   }
   const confirmedIds=new Set(results.filter(r=>r.match).map(r=>r.batchGroup+'|'+r.match.p?._uid));
   for(const row of results)if(row.resolved&&confirmedIds.has(row.batchGroup+'|'+row.resolved.p?._uid))row.resolved=null;
   state.batchRawRows=results;state.batchRows=results;state.expectedTotal=0;renderBatchResults();
   const confirmed=results.filter(r=>r.match).length;
   const actualRows=results.length;
   const inferred=results.filter(r=>!r.match&&r.resolved).length;
   // Compact, collapsed provenance breakdown helps compare Safari and desktop
   // WITHOUT treating four independent saves as one continuous team roster.
   const perArchive=new Map();
   const slot=group=>{
     if(!perArchive.has(group))perArchive.set(group,{raw:0,unique:0,confirmed:0,tentative:0,pending:0});
     return perArchive.get(group);
   };
   for(const group of grouped.groups||[]){
     const key=batchGroupOf(group.copies?.[0]?.file);
     const n=slot(key);n.raw+=group.copies.length;n.unique++;
   }
   for(const row of results){
     const n=slot(row.batchGroup);
     if(row.match)n.confirmed++;else if(row.resolved)n.tentative++;else n.pending++;
   }
   const oldBreakdown=document.getElementById('batchArchiveDetails');if(oldBreakdown)oldBreakdown.remove();
   if(perArchive.size>1){
     const detail=document.createElement('details');detail.id='batchArchiveDetails';detail.className='batch-archive-breakdown';
     const htmlEscape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
     detail.innerHTML='<summary>展開各 ZIP／資料夾的辨識統計</summary>'+
       '<div class="compare-scroll"><table class="guide-table"><thead><tr><th>來源</th><th>姓名列</th><th>不同列</th><th>確認</th><th>推定</th><th>候選</th></tr></thead><tbody>'+
       [...perArchive].map(([name,n])=>'<tr><td>'+htmlEscape(name)+'</td><td>'+n.raw+'</td><td>'+n.unique+'</td><td>'+n.confirmed+'</td><td>'+n.tentative+'</td><td>'+n.pending+'</td></tr>').join('')+'</tbody></table></div>';
     byId('batchSummary').after(detail);
   }

   const failed=aligned.filter(x=>!x.valid||x.loc.score<.65).length;
   const overlapCount=grouped.overlaps.reduce((n,e)=>n+e.k,0);
   update(100,`完成：${grouped.rawRows} 有姓名原始列 → ${results.length} 個不同列位（跨頁去重 ${overlapCount}）；確認 ${confirmed}、推定 ${inferred}、候選 ${results.length-confirmed-inferred}；來源群組 ${grouped.sequenceGroups?.length||1}${failed?'；'+failed+' 張表頭改用備援':''}｜各來源獨立去重・全程本機、無 AI`);
  }catch(error){console.error(error);byId('batchStatus').textContent='辨識未完成：'+String(error?.message||error)}
  finally{runButton.disabled=false}
 };
})();