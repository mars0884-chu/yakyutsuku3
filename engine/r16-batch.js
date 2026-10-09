/* やきゅつく3 local-only browser recognizer.
 * No AI models, OCR engines, ground-truth files, server inference, or hidden clipping to footer count.
 * Requires app.js, cv_dice, geometry, overlap modules, Claude static glyph pack.
 */
(function(){'use strict';
 const byId=id=>document.getElementById(id),runButton=byId('runBatch');
 if(!runButton)return;
 // On both desktop and Safari, the full player/ability details remain one tap away.
 if(typeof window.renderBatchGroup==='function'){
  const wide=window.renderBatchGroup;
  window.renderBatchGroup=function(title,rows){return wide(title,rows,['_screen','_status','名前','ランク','年齢','_position','投/打'])};
 }
 const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 const update=(num,message)=>{byId('batchStatus').textContent=`${message}｜${Math.round(num)}%`};
 const progressRow=(r,i)=>{
  const top=r.candidates||[],matched=r.match||null;
  return {canvas:r.canvas,file:r.file,row:r.row,firstIndex:i,parsed:{pos:({投手:'投',捕手:'捕',內野手:'一',外野手:'外'})[r.category]||''},
   sources:r.sources||[],match:matched,resolved:null,candidates:top,score:top[0]?.score||0,
   raw:'Claude Code 固定字形・本機 CV',status:matched?'確認':'候選'};
 };
 const byPriority=(a,b)=>{
   if(a.category!==b.category)return 0;
   return (b.gap||0)-(a.gap||0)
 };
 runButton.onclick=async()=>{
  if(!state.batchFiles.length){alert('請先選擇截圖');return}
  if(state.players.length<1000){byId('batchStatus').textContent='完整名冊尚未載入，請先到「資料」更新';return}
  runButton.disabled=true;
  try{
   update(1,'載入本機字形範本');await yt3ClaudeGlyph.init();
   const images=[];
   for(let i=0;i<state.batchFiles.length;i++){
    const file=state.batchFiles[i],img=await loadImage(file);
    images.push({image:img,name:file.name});update(2+Math.round(10*(i+1)/state.batchFiles.length),'讀取截圖');
    await frame();
   }
   update(13,'影像切列與跨頁重複檢查');
   const grouped=yt3OfflineOverlapsV14(images);
   const selected=grouped.groups.map((g,i)=>{
    const chosen=g.copies.reduce((a,b)=>b.canvas.width*b.canvas.height>a.canvas.width*a.canvas.height?b:a);
    return {chosen,copies:g.copies,index:i,category:chosen.screenCategory||''};
   });
   const result=[];
   for(let i=0;i<selected.length;i++){
    const s=selected[i],m=yt3ClaudeGlyph.match(s.chosen.canvas,state.players,s.category);
    result.push({...progressRow({...m,canvas:s.chosen.canvas,file:s.chosen.file,row:s.chosen.originalRow,category:s.category,
       sources:s.copies.map(c=>({file:c.file,screen:c.imageIndex,row:c.originalRow}))},i),gap:m.margin});
    update(15+80*(i+1)/Math.max(1,selected.length),'純本機字形比對 '+(i+1)+' / '+selected.length);
    if(i%2===1){await frame()}
   }
   // A duplicate confirmed name across different image groups is ambiguous until checked by the user.
   const groups=new Map();for(const r of result){if(r.match){const n=r.match.p['名前'];if(!groups.has(n))groups.set(n,[]);groups.get(n).push(r)}}
   for(const rows of groups.values())if(rows.length>1)for(const row of rows){row.match=null;row.status='候選'}
   state.batchRawRows=result;state.batchRows=result;state.expectedTotal=0;
   renderBatchResults();
   const confirmed=result.filter(r=>r.match).length;
   update(100,`完成：${grouped.rawRows} 列 → ${grouped.uniqueRows} 個不同列位｜確認 ${confirmed}，候選 ${result.length-confirmed}｜非 AI・本機辨識`);
  }catch(error){console.error(error);byId('batchStatus').textContent='批次找人未完成：'+String(error?.message||error)}
  finally{runButton.disabled=false}
 };
})();