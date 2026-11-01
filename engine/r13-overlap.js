/* Offline page overlap, pure image evidence. Total on game footer never used as a target.
   Page order may vary. Ambiguous/weak edges are intentionally left unmerged. */
(function(){
'use strict';
// Cache normalized name masks once per row; pairwise comparisons only touch 32x32 bits.
const maskCache=new WeakMap();
const features=(row)=>{let f=maskCache.get(row.canvas);if(!f){f=cvRowParts(row.canvas,126);maskCache.set(row.canvas,f)}return f};
const sim=(a,b)=>{
  const X=features(a),Y=features(b);let v=0,count=0;
  for(let part=0;part<2;part++)if(X[part]&&Y[part]){
    let both=0,na=0,nb=0;const x=X[part],y=Y[part];
    for(let j=0;j<x.length;j++){both+=x[j]*y[j];na+=x[j];nb+=y[j]}
    v+=2*both/(na+nb+1e-6);count++;
  }
  return count?v/count:0;
};
function chooseOverlap(a,b){
  const max=Math.min(a.length,b.length,11),opts=[];
  for(let k=1;k<=max;k++){
    const values=[];for(let j=0;j<k;j++)values.push(sim(a[a.length-k+j],b[j]));
    const avg=values.reduce((sum,n)=>sum+n,0)/k,min=Math.min(...values);
    if((k===1&&avg>=.745)||(k>=2&&avg>=.67&&min>=.58))opts.push({k,avg,min});
  }
  opts.sort((x,y)=>y.avg-x.avg||y.k-x.k);
  const best=opts[0],next=opts[1],decisive=best&&(best.avg-(next?.avg||0)>=.06||best.avg>=.90);
  return decisive?{k:best.k,avg:best.avg,min:best.min,margin:best.avg-(next?.avg||0)}:{k:0,ambiguous:!!best,best:best||null};
}
function analyze(images){
  const pages=images.map((im,i)=>batchTestRows(im,String(i)));
  const offsets=[];let n=0;for(const pg of pages){offsets.push(n);n+=pg.length}
  const parent=Array.from({length:n},(_,i)=>i);
  const find=x=>parent[x]===x?x:(parent[x]=find(parent[x]));
  const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
  const edges=[];
  for(let i=0;i<pages.length;i++)for(let j=0;j<pages.length;j++){
    if(i===j)continue;const m=chooseOverlap(pages[i],pages[j]);
    if(m.k)edges.push({...m,from:i,to:j});
  }
  edges.sort((a,b)=>b.avg-a.avg||b.k-a.k);
  const inEdge=new Set(),outEdge=new Set(),accepted=[];
  for(const edge of edges){
    const {from,to,k}=edge;
    if(outEdge.has(from)||inEdge.has(to))continue;
    let cursor=to,cycle=false;const seen=new Set();
    while(cursor!=null&&!seen.has(cursor)){
      if(cursor===from){cycle=true;break}
      seen.add(cursor);cursor=accepted.find(e=>e.from===cursor)?.to;
    }
    if(cycle)continue;
    outEdge.add(from);inEdge.add(to);accepted.push(edge);
    for(let h=0;h<k;h++)join(offsets[from]+pages[from].length-k+h,offsets[to]+h);
  }
  const groupMap=new Map();
  for(let p=0;p<pages.length;p++)for(let r=0;r<pages[p].length;r++){
    const ix=offsets[p]+r,root=find(ix),entry={...pages[p][r],imageIndex:p,originalRow:r+1};
    if(!groupMap.has(root))groupMap.set(root,{copies:[],firstImage:p,firstRow:r+1});
    groupMap.get(root).copies.push(entry);
  }
  const groups=[...groupMap.values()];
  return {rawRows:n,uniqueRows:groups.length,groups,overlaps:accepted,
    ambiguousEdges:edges.length-accepted.length};
}
window.yt3OfflineOverlaps=analyze;
window.yt3OverlapPair=chooseOverlap;
})();