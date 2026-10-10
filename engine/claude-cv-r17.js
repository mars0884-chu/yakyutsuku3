/* Claude original 16x16 glyph re-ranking; pure deterministic local image matching. */
(function(){'use strict';
const base=window.yt3ClaudeGlyph;
let chars=null,glyphs=null;
const cache=new WeakMap();
async function init(){await base.init();if(glyphs)return true;
 const rsp=await fetch('./engine/claude-glyphs-16.json');if(!rsp.ok)throw Error('16x16 字形資料載入失敗');
 const pack=await rsp.json();const raw=atob(pack.data);chars=new Map([...pack.chars].map((c,i)=>[c,i]));glyphs=[];
 for(let i=0;i<pack.chars.length;i++){const a=new Float32Array(256);let sum=0;for(let j=0;j<256;j++){a[j]=raw.charCodeAt(i*256+j);sum+=a[j]};let energy=0;const avg=sum/256;for(let j=0;j<256;j++){a[j]-=avg;energy+=a[j]*a[j]};const scale=1/Math.sqrt(energy+1e-8);for(let j=0;j<256;j++)a[j]*=scale;glyphs.push(a)}
 return true;
}
const cleanup=s=>String(s||'').normalize('NFKC').replace(/[\s　]/g,'').replaceAll('藪','薮').replaceAll('髙','高').replaceAll('﨑','崎');
function split(name){const seg=String(name||'').normalize('NFKC').trim().split(/[\s　]+/);return [cleanup(seg[0]),cleanup(seg.slice(1).join(''))]}
function rowData(src){let cached=cache.get(src);if(cached)return cached;
 const width=Math.max(190,Math.min(370,Math.round(src.width*16/src.height)));
 const can=document.createElement('canvas');can.width=width;can.height=18;
 const ctx=can.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;
 ctx.drawImage(src,0,0,src.width,src.height,0,0,width,16);
 const d=ctx.getImageData(0,0,width,18).data;const gray=new Uint8Array(width*18);
 for(let i=0;i<gray.length;i++){const k=i*4;gray[i]=Math.round(d[k]*.299+d[k+1]*.587+d[k+2]*.114)}
 const region=[];for(let y=2;y<14;y++)for(let x=39;x<Math.min(160,width);x+=2)region.push(gray[y*width+x]);region.sort((a,b)=>a-b);
 const median=region[Math.floor(region.length*.5)]||65;
 if(median>145)for(let i=0;i<gray.length;i++)gray[i]=Math.min(255,Math.max(0,Math.round(75+(median-gray[i])*2)));
 let block=null,st=-1;
 for(let x=40;x<=Math.min(125,width);x++){
  let count=0;if(x<width)for(let y=2;y<14;y++)if(gray[y*width+x]>180)count++;
  const yes=count/12>.58;
  if(yes&&st<0)st=x;
  if((!yes||x===125)&&st>=0){if(x-st>=7&&(!block||x-st>block[1]-block[0]))block=[st,x];st=-1}
 }
 const origin=(l,r)=>{let sum=0;for(let y=0;y<16;y++)for(let x=l;x<r;x++)sum+=gray[y*width+x];const th=sum/Math.max(1,16*(r-l))+30;
  for(let x=l;x<r;x++)for(let y=0;y<16;y++)if(gray[y*width+x]>th)return x;return -1};
 cached={gray,width,block,left:origin(39,Math.min(width,block?block[0]-2:160)),right:block?origin(block[1]+2,Math.min(width,160)):-1,features:new Map(),scores:new Map()};cache.set(src,cached);return cached;
}
function feature(row,side,k,offset,dy){const key=`${side}/${k}/${offset}/${dy}`;let v=row.features.get(key);if(v)return v;
 v=new Float32Array(256);const origin=(side==='R'?row.right:row.left),x0=origin+offset+16*k-1;
 let mean=0;for(let y=0;y<16;y++)for(let x=0;x<16;x++){const ax=Math.max(0,Math.min(row.width-1,x0+x)),ay=Math.max(0,Math.min(17,y+dy));const vv=row.gray[ay*row.width+ax];v[y*16+x]=vv;mean+=vv}
 mean/=256;let energy=0;for(let i=0;i<256;i++){v[i]-=mean;energy+=v[i]*v[i]}const inv=1/Math.sqrt(energy+1e-8);for(let i=0;i<256;i++)v[i]*=inv;
 row.features.set(key,v);return v;
}
function charScore(row,side,k,off,dy,ch){const id=chars.get(ch);if(id===undefined)return -.35;
 const key=`${side}/${k}/${off}/${dy}/${id}`;let value=row.scores.get(key);if(value!==undefined)return value;
 const v=feature(row,side,k,off,dy),ref=glyphs[id];let score=0;for(let j=0;j<256;j++)score+=v[j]*ref[j];row.scores.set(key,score);return score;
}
function endInk(row,side,k,off,dy){const origin=(side==='R'?row.right:row.left);const x0=origin+off+16*k-1;
  if(x0<0||x0+16>Math.min(row.width-1,161))return 0;
  if(side==='L'&&row.block&&x0+14>=row.block[0])return 0;
  let all=0;for(let y=2;y<14;y++)for(let x=39;x<160;x+=2)all+=row.gray[y*row.width+x];const threshold=all/(12*61)+38;
  let ink=0;for(let y=0;y<16;y++)for(let x=0;x<16;x++){const ax=x0+x,ay=Math.max(0,Math.min(17,y+dy));if(row.gray[ay*row.width+ax]>threshold)ink++}return ink;
}
function seq(row,side,word,dy){if(!word)return -1;let best=-4;
 for(const off of [-2,-1,0,1,2]){let sum=0;for(let i=0;i<word.length;i++)sum+=charScore(row,side,i,off,dy,word[i]);best=Math.max(best,sum/word.length-(endInk(row,side,word.length,off,dy)>=12?.25:0))}return best;
}
function finalScore(row,S,G){const ds=[-1,0,1];let best=-4;
 if(row.block){if(!G||row.left<0||row.right<0||Math.abs(row.block[0]-(row.left+16*S.length+3.5))>10)return -4;
  for(const dy of ds){const a=seq(row,'L',S,dy),b=seq(row,'R',G,dy);best=Math.max(best,(a*S.length+b*G.length)/(S.length+G.length))}
 }else if(row.left>=0&&S.length+G.length<=9){for(const dy of ds)best=Math.max(best,seq(row,'L',S+G,dy))}
 return best;
}
function match(canvas,players,category){if(!glyphs)throw Error('16×16 字形尚未載入');
 const coarse=base.match(canvas,players,category),candidates=coarse.candidates.slice(0,160);
 const row=rowData(canvas);for(const x of candidates){const [S,G]=split(x.name);x.originalScore=x.score;x.score=finalScore(row,[...S],[...G]);if(!Number.isFinite(x.score))x.score=-4;}
 candidates.sort((a,b)=>b.score-a.score);
 const top=candidates.slice(0,5),best=top[0],second=top[1],margin=(best?.score??-9)-(second?.score??-9);
 const doubles=best?players.filter(p=>cleanup(p['名前'])===cleanup(best.name)).length:0;
 const confident=!!best&&Number.isFinite(best.score)&&best.score>=.60&&margin>=.14&&doubles===1;
 return{candidates:top,match:confident?best:null,margin,method:'Claude 16x16 source glyph'};
}
window.yt3ClaudeGlyph={init,match};
})();