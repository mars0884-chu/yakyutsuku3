/* やきゅつく3 r18: full roster 16x16 non-AI glyph matching. Never restrict to 8x8 shortlist. */
(function(){'use strict';
let chars=null,glyphs=null;
const cache=new WeakMap();let rosterCache=new WeakMap();
async function init(){if(glyphs)return true;
 const rsp=await fetch('./engine/claude-glyphs-16.json');if(!rsp.ok)throw Error('16x16 字形資料載入失敗');
 const pack=await rsp.json(),raw=atob(pack.data);chars=new Map([...pack.chars].map((c,i)=>[c,i]));glyphs=[];
 for(let i=0;i<[...pack.chars].length;i++){const a=new Float32Array(256);let sum=0;for(let j=0;j<256;j++){a[j]=raw.charCodeAt(i*256+j);sum+=a[j]};let e=0;const mean=sum/256;for(let j=0;j<256;j++){a[j]-=mean;e+=a[j]*a[j]};const inv=1/Math.sqrt(e+1e-8);for(let j=0;j<256;j++)a[j]*=inv;glyphs.push(a)}return true;
}
const canon=s=>String(s||'').normalize('NFKC').replace(/[\s　]/g,'').replaceAll('藪','薮').replaceAll('髙','高').replaceAll('﨑','崎');
function split(name){const seg=String(name||'').normalize('NFKC').trim().split(/[\s　]+/);return [[...canon(seg[0])],[...canon(seg.slice(1).join(''))]]}
function listFor(players,category){let cached=rosterCache.get(players);if(!cached){cached=players.filter(p=>p&&p['名前']).map(p=>{const [S,G]=split(p['名前']);return{p,S,G,name:p['名前'],pos:p._position||p['守備位置']||''}});rosterCache.set(players,cached)}
 if(!category)return cached;const allowed=category==='內野手'?['一壘手','二壘手','三壘手','游擊手']:[category];const filtered=cached.filter(x=>allowed.includes(x.pos));return filtered.length>10?filtered:cached;}
function rowData(src){let found=cache.get(src);if(found)return found;
 const width=Math.max(190,Math.min(370,Math.round(src.width*16/src.height)));
 const can=document.createElement('canvas');can.width=width;can.height=18;const ctx=can.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.drawImage(src,0,0,src.width,src.height,0,0,width,16);
 const d=ctx.getImageData(0,0,width,18).data,gray=new Uint8Array(width*18);for(let i=0;i<gray.length;i++){const k=i*4;gray[i]=Math.round(d[k]*.299+d[k+1]*.587+d[k+2]*.114)}
 const reg=[];for(let y=2;y<14;y++)for(let x=39;x<Math.min(160,width);x+=2)reg.push(gray[y*width+x]);reg.sort((a,b)=>a-b);const median=reg[reg.length>>1]||65;
 if(median>145)for(let i=0;i<gray.length;i++)gray[i]=Math.min(255,Math.max(0,Math.round(75+(median-gray[i])*2)));
 let block=null,st=-1;for(let x=40;x<=Math.min(125,width);x++){let count=0;if(x<width)for(let y=2;y<14;y++)if(gray[y*width+x]>180)count++;const yes=count/12>.58;if(yes&&st<0)st=x;if((!yes||x===125)&&st>=0){if(x-st>=7&&(!block||x-st>block[1]-block[0]))block=[st,x];st=-1}}
 const origin=(l,r)=>{let sum=0;for(let y=0;y<16;y++)for(let x=l;x<r;x++)sum+=gray[y*width+x];const th=sum/Math.max(1,16*(r-l))+30;for(let x=l;x<r;x++)for(let y=0;y<16;y++)if(gray[y*width+x]>th)return x;return -1};
 found={gray,width,block,left:origin(39,Math.min(width,block?block[0]-2:160)),right:block?origin(block[1]+2,Math.min(width,160)):-1,features:new Map(),scores:new Map()};cache.set(src,found);return found;}
function feature(row,side,k,off,dy){const key=`${side}/${k}/${off}/${dy}`;let v=row.features.get(key);if(v)return v;
 v=new Float32Array(256);const x0=(side==='R'?row.right:row.left)+off+16*k-1;let sum=0;for(let y=0;y<16;y++)for(let x=0;x<16;x++){const ax=Math.max(0,Math.min(row.width-1,x0+x)),ay=Math.max(0,Math.min(17,y+dy));const vv=row.gray[ay*row.width+ax];v[y*16+x]=vv;sum+=vv}const mean=sum/256;let energy=0;for(let j=0;j<256;j++){v[j]-=mean;energy+=v[j]*v[j]}const inv=1/Math.sqrt(energy+1e-8);for(let j=0;j<256;j++)v[j]*=inv;row.features.set(key,v);return v;}
function cs(row,side,k,off,dy,ch){const idx=chars.get(ch);if(idx===undefined)return -.35;const key=`${side}/${k}/${off}/${dy}`;let scores=row.scores.get(key);if(!scores){scores=new Float32Array(glyphs.length);row.scores.set(key,scores)}const found=scores[idx];if(found)return found-2;const a=feature(row,side,k,off,dy),g=glyphs[idx];let s=0;for(let i=0;i<256;i++)s+=a[i]*g[i];scores[idx]=s+2;return s;}
function endInk(row,side,k,off,dy,threshold){const origin=side==='R'?row.right:row.left,x0=origin+off+16*k-1;if(x0<0||x0+16>Math.min(row.width-1,161))return 0;if(side==='L'&&row.block&&x0+14>=row.block[0])return 0;let ink=0;for(let y=0;y<16;y++)for(let x=0;x<16;x++){const ax=x0+x,ay=Math.max(0,Math.min(17,y+dy));if(row.gray[ay*row.width+ax]>threshold)ink++}return ink;}
function seq(row,side,word,dy,threshold){if(!word.length)return -1;let best=-4;for(const off of [-2,-1,0,1,2]){let sum=0;for(let i=0;i<word.length;i++)sum+=cs(row,side,i,off,dy,word[i]);const score=sum/word.length-(endInk(row,side,word.length,off,dy,threshold)>=12?.25:0);best=Math.max(best,score)}return best;}
function handFeature(row,x0,dy){const v=new Float32Array(256);let sum=0;for(let yy=0;yy<16;yy++)for(let xx=0;xx<16;xx++){const x=Math.max(0,Math.min(row.width-1,x0+xx)),y=Math.max(0,Math.min(17,yy+dy));const a=row.gray[y*row.width+x];v[yy*16+xx]=a;sum+=a;}let en=0;const mean=sum/256;for(let k=0;k<256;k++){v[k]-=mean;en+=v[k]*v[k]}const inv=1/Math.sqrt(en+1e-8);for(let k=0;k<256;k++)v[k]*=inv;return v;}
function readHand(row,threshold){if(row.width<270)return null;let o=-1;for(let x=205;x<267;x++){let n=0;for(let y=2;y<14;y++)if(row.gray[y*row.width+x]>threshold)n++;if(n>=2){o=x;break}}if(o<0)return null;
 const labels=['右','左','両'];const classify=x=>{let best=[];for(const ch of labels){const t=glyphs[chars.get(ch)];if(!t)continue;let sc=-9;for(const dx of [-2,-1,0,1,2]){const a=handFeature(row,x+dx-1,0);let v=0;for(let k=0;k<256;k++)v+=a[k]*t[k];sc=Math.max(sc,v)}best.push({ch,sc})}best.sort((a,b)=>b.sc-a.sc);return{v:best[0]?.ch||'',s:best[0]?.sc||0,margin:(best[0]?.sc||0)-(best[1]?.sc||0)}};
 const a=classify(o),b=classify(o+24);return{guess:a.v+'/'+b.v,first:a,second:b,origin:o,reliable:a.s>=.55&&b.s>=.55&&a.margin>=.07&&b.margin>=.07};}
function match(canvas,players,category){if(!glyphs)throw Error('離線 16x16 字形尚未載入');const row=rowData(canvas);const eligible=listFor(players,category);
 let n=0,brightness=0;for(let y=2;y<14;y++)for(let x=39;x<160;x+=2){brightness+=row.gray[y*row.width+x];n++}const threshold=brightness/n+38;
 const hand=readHand(row,threshold);const scored=[];const canSplit=!!row.block&&row.left>=0&&row.right>=0;
 for(const t of eligible){const {S,G}=t;if(!S.length)continue;if(canSplit){if(!G.length||Math.abs(row.block[0]-(row.left+16*S.length+3.5))>10)continue}else if(S.length+G.length>9||row.left<0)continue;
  let score=-4;for(const dy of [-1,0,1]){let s;if(canSplit){const l=seq(row,'L',S,dy,threshold),r=seq(row,'R',G,dy,threshold);s=(l*S.length+r*G.length)/(S.length+G.length)}else s=seq(row,'L',S.concat(G),dy,threshold);score=Math.max(score,s)}
  if(Number.isFinite(score)&&score>-.7){const handed=String(t.p['投/打']||'').replace('／','/');const handAdjustment=hand?.reliable&&(handed==='右/右'||handed==='左/右'||handed==='右/左'||handed==='左/左'||handed==='右/両'||handed==='左/両')?(handed===hand.guess?.06:-.06):0;scored.push({p:t.p,name:t.name,score:score+handAdjustment,visualScore:score,handScore:handAdjustment});}
 }
 scored.sort((a,b)=>b.score-a.score);const top=scored.slice(0,5),best=top[0],second=top[1],margin=(best?.score??-9)-(second?.score??-9);
 const duplicates=best?eligible.filter(x=>canon(x.name)===canon(best.name)).length:0;
 const confident=!!best&&best.score>=.60&&margin>=.14&&duplicates===1;
 row.features.clear();row.scores.clear();cache.delete(canvas); // release large per-row CV caches before next photo
 return{candidates:top,match:confident?best:null,margin,hand,method:'Claude 16x16 full-roster direct'};
}
window.yt3ClaudeGlyph={init,match};})();