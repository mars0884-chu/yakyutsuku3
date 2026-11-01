/* Safari / Chrome / Edge independent recognition. AI-free deterministic 16x16 glyph matching,
   Claude header alignment, no Tesseract, no PaddleOCR, no roster-total clipping. */
(function(){'use strict';
 const byId=id=>document.getElementById(id),runButton=byId('runBatch');if(!runButton)return;
 // Restrict tables to a useful overview; the name opens complete player details.
 if(typeof window.renderBatchGroup==='function'){
  const wide=window.renderBatchGroup;
  window.renderBatchGroup=(title,rows)=>wide(title,rows,['_screen','_status','名前','ランク','年齢','_position','投/打']);
 }
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const update=(num,message)=>{byId('batchStatus').textContent=`${message}｜${Math.min(100,Math.round(num))}%`};
 const rowCanvas=(img,n,dy)=>{const c=document.createElement('canvas');c.width=280;c.height=16;const y=Math.round(41+15.9*(n-1))-1+dy;c.getContext('2d',{willReadFrequently:true}).drawImage(img,0,y,280,16,0,0,280,16);return c};
 function matchAligned(aligned,number,players,category){let best=null;
  for(const dy of [-2,-1,0,1]){
   const c=rowCanvas(aligned,number,dy),m=yt3ClaudeGlyph.match(c,players,category),sc=m.candidates?.[0]?.score;
   if(!Number.isFinite(sc))continue;
   if(!best||sc>best.score)best={canvas:c,m,score:sc};
  }
  return best;
 }
 const output=(r,i)=>({canvas:r.canvas,file:r.file,row:r.row,firstIndex:i,
    parsed:{pos:({投手:'投',捕手:'捕',內野手:'一',外野手:'外'})[r.category]||''},sources:r.sources||[],
    match:r.match||null,resolved:null,candidates:r.candidates||[],score:r.candidates?.[0]?.score||0,
    raw:r.mode,status:r.match?'確認':'候選'});
 runButton.onclick=async()=>{
  if(!state.batchFiles.length){alert('請先選擇截圖');return}
  if(state.players.length<1000){byId('batchStatus').textContent='完整名冊尚未載入，請先到「資料」更新';return}
  runButton.disabled=true;
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
     const chosen=g.copies.reduce((a,b)=>b.canvas.width*b.canvas.height>a.canvas.width*a.canvas.height?b:a);
     return {chosen,copies:g.copies,category:chosen.screenCategory||''};
   });
   const results=[];
   for(let i=0;i<selected.length;i++){
    const s=selected[i],copy=s.chosen,info=aligned[copy.imageIndex],number=copy.originalRow;
    let item=null;
    if(info?.valid&&info.loc.score>=.65&&number>=1&&number<=11)
     item=matchAligned(info.canvas,number,state.players,s.category);
    // Fallback remains deterministic; never run neural/AI OCR and never invent an identity.
    if(!item){const m=yt3ClaudeGlyph.match(copy.canvas,state.players,s.category);item={canvas:copy.canvas,m,score:m.candidates?.[0]?.score||0}}
    const m=item.m;
    results.push(output({canvas:item.canvas,file:copy.file,row:number,category:s.category,
      candidates:m.candidates,match:m.match,mode:info?.valid?'Claude 原始 16×16・對齊 CV':'Claude 16×16・備援 CV',
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
   update(100,`完成：${grouped.rawRows} 原始列 → ${grouped.uniqueRows} 個不同列位；確認 ${confirmed}、候選 ${results.length-confirmed}${failed?'；'+failed+' 張表頭改用備援':''}｜全程本機、無 AI`);
  }catch(error){console.error(error);byId('batchStatus').textContent='辨識未完成：'+String(error?.message||error)}
  finally{runButton.disabled=false}
 };
})();