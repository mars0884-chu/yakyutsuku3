/* PS2 やきゅつく3 — Claude Code fixed glyph adaptation for Safari/Chrome/Edge.
 * Local deterministic pixels only. Does not access AI, OCR APIs or ground-truth labels.
 * Glyph pack is derived from the user's 16x16 templates, downsampled to 8x8.
 * Conservative confidence; unsupported / uncertain rows remain candidates.
 */
(function(){'use strict';
 let glyphs=null,index=null,meta=null;
 const cache=new WeakMap();
 async function init(){
  if(glyphs)return true;
  const response=await fetch('./engine/claude-glyphs.json');if(!response.ok)throw Error('無法載入離線字形資料');
  meta=await response.json();const bytes=atob(meta.data.join(''));
  index=new Map([...meta.chars].map((c,i)=>[c,i]));glyphs=[];
  for(let i=0;i<meta.chars.length;i++){
   const v=new Float32Array(64);let sum=0;
   for(let k=0;k<64;k++){const b=bytes.charCodeAt(i*32+(k>>1));v[k]=(k&1)?(b&15):(b>>4);sum+=v[k]}
   const m=sum/64;let varSum=0;for(let k=0;k<64;k++){v[k]-=m;varSum+=v[k]*v[k]}
   const inv=1/Math.sqrt(varSum+1e-6);for(let k=0;k<64;k++)v[k]*=inv;
   glyphs.push(v);
  }
  return true;
 }
 const normalizeName=s=>String(s||'').normalize('NFKC').replace(/[\s　]/g,'').replaceAll('藪','薮').replaceAll('髙','高').replaceAll('﨑','崎');
 function splitName(name){const seg=String(name||'').normalize('NFKC').trim().split(/[\s　]+/);return [seg[0]||'',seg.slice(1).join('')]}
 function prepare(canvas){
  if(cache.has(canvas))return cache.get(canvas);
  const width=Math.max(190,Math.min(370,Math.round(canvas.width*16/canvas.height))),height=18;
  const c=document.createElement('canvas');c.width=width;c.height=height;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;
  ctx.drawImage(canvas,0,0,canvas.width,canvas.height,0,0,width,16);
  const d=ctx.getImageData(0,0,width,height).data,gray=new Float32Array(width*height);
  for(let i=0;i<gray.length;i++){const j=i*4;gray[i]=d[j]*.299+d[j+1]*.587+d[j+2]*.114}
  // A selected menu row has dark letters on bright background.
  const region=[];for(let y=2;y<14;y++)for(let x=39;x<Math.min(160,width);x+=2)region.push(gray[y*width+x]);
  region.sort((a,b)=>a-b);const bg=region[Math.floor(region.length*.5)]||65;
  if(bg>145){for(let i=0;i<gray.length;i++)gray[i]=Math.max(0,Math.min(255,75+(bg-gray[i])*2))}
  const sample=Array.from({length:width},(_,x)=>{let n=0;for(let y=2;y<14;y++)if(gray[y*width+x]>180)n++;return n/12});
  let block=null,st=-1;for(let x=40;x<=Math.min(125,width);x++){
   const ok=x<width&&sample[x]>.58;
   if(ok&&st<0)st=x;
   if((!ok||x===125)&&st>=0){const n=x-st;if(n>=7&&(!block||n>block[1]-block[0]))block=[st,x];st=-1}
  }
  const xOrigin=(l,r)=>{let b=0;for(let y=0;y<16;y++)for(let x=l;x<r;x++)b+=gray[y*width+x];const median=b/Math.max(1,16*(r-l));const threshold=median+30;
   for(let x=l;x<r;x++){let count=0;for(let y=0;y<16;y++)if(gray[y*width+x]>threshold)count++;if(count>=1)return x}return -1};
  const left=xOrigin(39,Math.min(width,block?block[0]-2:160));
  const right=block?xOrigin(block[1]+2,Math.min(width,160)):-1;
  const v={gray,width,block,left,right,featureCache:new Map(),scoreCache:new Map()};cache.set(canvas,v);return v;
 }
 function feature(row,side,k,off,dy){
  const key=`${side}/${k}/${off}/${dy}`;if(row.featureCache.has(key))return row.featureCache.get(key);
  const x0=(side==='R'?row.right:row.left)+off+16*k-1;
  const v=new Float32Array(64);let mean=0;
  for(let yy=0;yy<8;yy++)for(let xx=0;xx<8;xx++){
   const x=x0+2*xx,y=dy+2*yy;let acc=0;
   for(let py=0;py<2;py++)for(let px=0;px<2;px++)acc+=row.gray[Math.max(0,Math.min(17,y+py))*row.width+Math.max(0,Math.min(row.width-1,x+px))];
   v[yy*8+xx]=acc*.25;mean+=acc*.25;
  }
  mean/=64;let energy=0;for(let j=0;j<64;j++){v[j]-=mean;energy+=v[j]*v[j]}
  const inv=1/Math.sqrt(energy+1e-6);for(let j=0;j<64;j++)v[j]*=inv;
  row.featureCache.set(key,v);return v;
 }
 function matchChar(row,side,k,off,dy,ch){
  const id=index.get(ch);if(id===undefined)return -.35;
  const key=`${side}/${k}/${off}/${dy}/${id}`;
  if(row.scoreCache.has(key))return row.scoreCache.get(key);
  const v=feature(row,side,k,off,dy),glyph=glyphs[id];let dot=0;for(let j=0;j<64;j++)dot+=v[j]*glyph[j];
  row.scoreCache.set(key,dot);return dot;
 }
 function scoreSeq(row,side,word,dy){
  if(!word)return -1;
  let best=-5;
  for(const off of [-2,-1,0,1,2]){
   let sum=0;for(let k=0;k<word.length;k++)sum+=matchChar(row,side,k,off,dy,word[k]);
   const v=sum/word.length;if(v>best)best=v;
  }
  return best;
 }
 function bestScore(row,S,G,dy){
  if(row.block){if(!G||row.left<0||row.right<0)return -2;
   if(Math.abs(row.block[0]-(row.left+16*S.length+3.5))>10)return -2;
   return (scoreSeq(row,'L',S,dy)*S.length+scoreSeq(row,'R',G,dy)*G.length)/(S.length+G.length)
  }
  return row.left<0||S.length+G.length>9?-2:scoreSeq(row,'L',S+G,dy);
 }
 const cleanPosition=p=>p._position||p['守備位置']||'';
 function match(canvas,players,category){
  if(!glyphs)throw Error('字形資料尚未載入');const row=prepare(canvas),items=[];
  let list=players;
  if(category){const allowed=category==='內野手'?['一壘手','二壘手','三壘手','游擊手']:[category];const sub=players.filter(p=>allowed.includes(cleanPosition(p)));if(sub.length>10)list=sub}
  for(const p of list){const [sa,ga]=splitName(p['名前']);const S=[...normalizeName(sa)],G=[...normalizeName(ga)];if(!S.length)continue;
   const score=bestScore(row,S,G,0);if(score >-.8)items.push({p,name:p['名前'],score});
  }
  items.sort((a,b)=>b.score-a.score);
  // Rescore only short-list, including ±1 vertical drift, never probe the answer.
  for(const item of items.slice(0,12)){
   const [sa,ga]=splitName(item.name),S=[...normalizeName(sa)],G=[...normalizeName(ga)];
   item.score=Math.max(item.score,bestScore(row,S,G,-1),bestScore(row,S,G,1));
  }
  const top=items.slice(0,160).sort((a,b)=>b.score-a.score).slice(0,160);
  const best=top[0],second=top[1],margin=(best?.score??-1)-(second?.score??-1);
  const duplicates=best?players.filter(p=>normalizeName(p['名前'])===normalizeName(best.name)).length:0;
  // Absolute threshold AND rank gap AND uniqueness. Anything uncertain remains an explicit candidate.
  const confident=!!best&&best.score>=.77&&margin>=.13&&duplicates===1;
  return {candidates:top,match:confident?best:null,margin,method:'Claude 8x8 static glyph'};
 }
 window.yt3ClaudeGlyph={init,match};
})();