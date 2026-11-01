/* PS2 やきゅつく3 r14 -- deterministic local pixel overlap, no AI or answer lookups.
   Must be loaded AFTER r13-overlap.js and r14-capture.js for fallback evidence. */
(function(){'use strict';
const oldPair=window.yt3OverlapPair;
const maskCache=new WeakMap();
const W=170,H=24;
function mask(row){
 let a=maskCache.get(row.canvas);if(a)return a;
 const c=row.canvas,sw=c.width,sh=c.height,src=c.getContext('2d',{willReadFrequently:true});
 const sx=Math.round(sw*.108),ex=Math.round(sw*.575),sy=Math.round(sh*.08),ey=Math.round(sh*.85);
 const cv=document.createElement('canvas');cv.width=W;cv.height=H;const g=cv.getContext('2d',{willReadFrequently:true});
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality='medium';g.drawImage(c,sx,sy,Math.max(1,ex-sx),Math.max(1,ey-sy),0,0,W,H);
 const d=g.getImageData(0,0,W,H).data,b=new Uint8Array(W*H);let n=0;
 for(let i=0,j=0;j<b.length;i+=4,j++){const v=d[i]*.299+d[i+1]*.587+d[i+2]*.114;if(v>138){b[j]=1;n++}}
 a={bits:b,ink:n};maskCache.set(row.canvas,a);return a;
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
function naturalCompare(a,b){return String(a||'').localeCompare(String(b||''),'en',{numeric:true,sensitivity:'base'})}
function analyze(inputs){
 // Name/number sorting is not an answer source. It only reconstructs screenshot traversal.
 const mapped=inputs.map((x,i)=>({im:x.image||x,name:x.name||x.yt3Filename||String(i),original:i}));
 const ordered=mapped.every(x=>x.name)?[...mapped].sort((a,b)=>naturalCompare(a.name,b.name)):mapped;
 const categories=ordered.map(({im})=>yt3CaptureCategory(im));
 const pages=ordered.map(({im},i)=>batchTestRows(im,String(i)));
 const offsets=[];let n=0;for(const pg of pages){offsets.push(n);n+=pg.length}
 const parent=Array.from({length:n},(_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i])),join=(i,j)=>{i=find(i);j=find(j);if(i!==j)parent[j]=i};
 const edges=[];
 for(let i=0;i<pages.length-1;i++){
  const a=pages[i],b=pages[i+1],px=choosePixel(a,b),fallback=oldPair(a,b);
  let chosen=px;
  if(!chosen&&fallback?.k){
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
  const key=find(offsets[p]+j),entry={...pages[p][j],imageIndex:ordered[p].original,originalRow:j+1,file:ordered[p].name,screenCategory:categories[p]};
  if(!groups.has(key))groups.set(key,{copies:[],firstImage:ordered[p].original,firstRow:j+1});groups.get(key).copies.push(entry);
 }
 return {rawRows:n,uniqueRows:groups.size,groups:[...groups.values()],overlaps:edges};
}
window.yt3OfflineOverlapsV14=analyze;
window.yt3PixelOverlap=choosePixel;
window.yt3PixelOverlapDebug=(a,b)=>choosePixel(a,b,true);
})();