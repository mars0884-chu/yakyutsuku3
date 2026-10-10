/* PS2 やきゅつく3 r14 -- deterministic local pixel overlap, no AI or answer lookups.
   Must be loaded AFTER r13-overlap.js and r14-capture.js for fallback evidence. */
(function(){'use strict';
const oldPair=window.yt3OverlapPair;
const maskCache=new WeakMap();
const W=170,H=24;
/* Match actual text, not a selected row's bright rectangular background.
   Read source pixels and deterministically resize in JavaScript (same on Safari/Chrome/Edge). */
function mask(row){
 let cached=maskCache.get(row.canvas);if(cached)return cached;
 const c=row.canvas,sw=c.width,sh=c.height,ctx=c.getContext('2d',{willReadFrequently:true});
 const rgba=ctx.getImageData(0,0,sw,sh).data,gray=new Uint8Array(W*H);
 const left=sw*.108,right=sw*.575,top=sh*.08,bottom=sh*.85;
 const lum=(x,y)=>{const k=(y*sw+x)*4;return Math.round(rgba[k]*.299+rgba[k+1]*.587+rgba[k+2]*.114)};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   const fx=left+(x+.5)*(right-left)/W-.5,fy=top+(y+.5)*(bottom-top)/H-.5;
   const ax=Math.max(0,Math.min(sw-1,Math.floor(fx))),ay=Math.max(0,Math.min(sh-1,Math.floor(fy)));
   const bx=Math.min(sw-1,ax+1),by=Math.min(sh-1,ay+1);
   const u=Math.max(0,Math.min(1,fx-ax)),v=Math.max(0,Math.min(1,fy-ay));
   gray[y*W+x]=Math.round((lum(ax,ay)*(1-u)+lum(bx,ay)*u)*(1-v)+(lum(ax,by)*(1-u)+lum(bx,by)*u)*v);
 }
 const hist=new Uint16Array(256);for(const p of gray)hist[p]++;
 // Median means selected (bright) rows become dark-on-light, ordinary rows light-on-dark.
 let acc=0,bg=0;for(let b=0;b<256;b++){acc+=hist[b];if(acc>=gray.length*.5){bg=b;break}}
 const bright=bg>=140,bits=new Uint8Array(W*H),delta=bright?Math.max(27,Math.min(52,bg*.19)):Math.max(29,Math.min(58,(255-bg)*.17));
 let ink=0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const k=y*W+x,lit=gray[k];
  if(bright?lit<bg-delta:lit>bg+delta){bits[k]=1;ink++}
 }
 // Empty/filled bands are not unique names and must never create overlap evidence.
 if(ink<36||ink>bits.length*.46){bits.fill(0);ink=0}
 cached={bits,ink};maskCache.set(row.canvas,cached);return cached;
}
function pixelMatch(row1,row2){
 const a=mask(row1),b=mask(row2);if(!a.ink||!b.ink)return 0;
 const A=a.bits,B=b.bits,den=a.ink+b.ink;let best=0,bestY=0;
 const score=(dx,dy)=>{let hit=0;const x0=Math.max(0,dx),x1=Math.min(W,W+dx),y0=Math.max(0,dy),y1=Math.min(H,H+dy);
   for(let y=y0;y<y1;y++){const off=y*W,boff=(y-dy)*W;for(let x=x0;x<x1;x++)hit+=A[off+x]&B[boff+x-dx]}
   return 2*hit/den;
 };
 // Vertical drift between photographed screenshots is usually <=3 normalized pixels.
 for(let dy=-3;dy<=3;dy++){const v=score(0,dy);if(v>best){best=v;bestY=dy}}
 if(best<.53)return best;
 for(let dy=Math.max(-3,bestY-1);dy<=Math.min(3,bestY+1);dy++)for(const dx of [-4,-2,-1,1,2,4]){
  const v=score(dx,dy);if(v>best)best=v;
 }
 return best;
}
function choosePixel(a,b,debug=false){
 const max=Math.min(11,a.length,b.length),opts=[],all=[];
 for(let k=1;k<=max;k++){
  let total=0,min=1;
  for(let j=0;j<k;j++){const s=pixelMatch(a[a.length-k+j],b[j]);total+=s;if(s<min)min=s;if(min<.69 && j>=1)break}
  const avg=total/k;all.push({k,avg,min});
  if((k===1&&avg>=.89)||(k>=2&&avg>=.77&&min>=.72))opts.push({k,avg,min});
 }
 if(debug)return all.sort((a,b)=>b.avg-a.avg).slice(0,6);
 return opts.sort((a,b)=>(b.avg+Math.min(.025,b.k*.004))-(a.avg+Math.min(.025,a.k*.004))||b.k-a.k)[0]||null;
}
// Each ZIP/folder is an independent capture sequence. Never infer that the
// bottom of one archive continues at the top of another archive.
function batchSource(name){
 const text=String(name||'');
 const m=/^(.+?)__/.exec(text);
 return m?m[1]:'單張截圖';
}
function naturalCompare(a,b){return String(a||'').localeCompare(String(b||''),'en',{numeric:true,sensitivity:'base'})}
function analyze(inputs,aligned=[]){
 // Name/number sorting is not an answer source. It only reconstructs screenshot traversal.
 const mapped=inputs.map((x,i)=>({im:x.image||x,name:x.name||x.yt3Filename||String(i),original:i}));
 const ordered=mapped.every(x=>x.name)?[...mapped].sort((a,b)=>naturalCompare(a.name,b.name)):mapped;
 const categories=ordered.map(({im})=>yt3CaptureCategory(im));
 const pages=ordered.map(({im,original},i)=>{
  const rows=batchTestRows(im,String(i));
  const normal=aligned[original];
  if(!normal?.valid||!window.yt3RowInkGate)return rows;
  // A badge/icon, gridline or empty player slot must not enter roster comparison.
  // Preserve originalRow: only the physical rows with printed NAME ink can overlap.
  return rows.filter(r=>{
   const decision=window.yt3RowInkGate(normal.canvas,r.row);
   return decision.hasName||decision.uncertain;
  });
 });
 const offsets=[];let n=0;for(const pg of pages){offsets.push(n);n+=pg.length}
 const parent=Array.from({length:n},(_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i])),join=(i,j)=>{i=find(i);j=find(j);if(i!==j)parent[j]=i};
 const edges=[];
 for(let i=0;i<pages.length-1;i++){
  const a=pages[i],b=pages[i+1],sameBatch=batchSource(ordered[i].name)===batchSource(ordered[i+1].name),sameTab=!categories[i]||!categories[i+1]||categories[i]===categories[i+1];
  if(!sameBatch||!sameTab)continue;
  // Scores near the threshold vary across JPEG/canvas decoders on Safari/Edge.
  // Ambiguous boundaries are safer left unmerged than silently deleting players.
  const px=choosePixel(a,b),alternatives=choosePixel(a,b,true);
  const runner=px?alternatives.find(q=>q.k!==px.k&&q.avg>=.65):null;
  const decisive=px&&
    (px.k===1?px.avg>=.925:px.avg>=.805&&px.min>=.75)&&
    (!runner||px.avg-runner.avg>=.055||px.avg>=.94);
  const safePixel=decisive?px:null;
  const fallback=oldPair(a,b);
  let chosen=safePixel;
  if(!chosen&&fallback?.k&&(!px||!runner||px.avg-runner.avg>=.055)){
    const k=fallback.k;let trusted=fallback.avg>=.81&&fallback.min>=.76;
    // Weak row masks alone are insufficient; require two independent matching pairs.
    if(!trusted&&k===1&&fallback.avg>=.76){
      const direct=pixelMatch(a[a.length-1],b[0]);
      const nearA=a.length>1?pixelMatch(a[a.length-2],b[0]):0;
      const nearB=b.length>1?pixelMatch(a[a.length-1],b[1]):0;
      trusted=direct>=.79&&direct-Math.max(nearA,nearB)>=.055;
    }
    if(!trusted&&k>=2&&fallback.avg>=.70&&fallback.min>=.60){
      let sum=0;for(let j=0;j<k;j++)sum+=pixelMatch(a[a.length-k+j],b[j]);
      trusted=sum/k>=.68;
    }
    if(trusted)chosen={k,avg:fallback.avg,min:fallback.min,method:'shape+pixel'};
  }
  if(chosen){edges.push({from:i,to:i+1,method:chosen.method||'pixel',...chosen});
    for(let j=0;j<chosen.k;j++)join(offsets[i]+a.length-chosen.k+j,offsets[i+1]+j)}
 }
 const groups=new Map();for(let p=0;p<pages.length;p++)for(let j=0;j<pages[p].length;j++){
  const key=find(offsets[p]+j),entry={...pages[p][j],imageIndex:ordered[p].original,originalRow:pages[p][j].row||j+1,file:ordered[p].name,screenCategory:categories[p],screenBatch:batchSource(ordered[p].name)};
  if(!groups.has(key))groups.set(key,{copies:[],firstImage:ordered[p].original,firstRow:pages[p][j].row||j+1});groups.get(key).copies.push(entry);
 }
 return {rawRows:n,uniqueRows:groups.size,groups:[...groups.values()],
  overlaps:edges,sequenceGroups:[...new Set(ordered.map(x=>batchSource(x.name)))],
  // All cross-ZIP boundaries are explicit non-merge boundaries.
  boundaryPolicy:'archive-isolated; marginal edges unmerged'};
}
window.yt3OfflineOverlapsV14=analyze;
window.yt3PixelOverlap=choosePixel;
window.yt3PixelOverlapDebug=(a,b)=>choosePixel(a,b,true);
window.yt3RowPixelSimilarity=(a,b)=>pixelMatch(a,b);
})();