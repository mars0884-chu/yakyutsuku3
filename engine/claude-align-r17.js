/* Pixel-only screenshot header locator. Original Claude Code template 262x18; no OCR, AI or answer text. */
(function(){'use strict';let ref=null;
async function init(){if(ref)return;const r=await fetch('./engine/claude-header-r17.json');if(!r.ok)throw Error('畫面對齊範本讀取失敗');ref=await r.json();}
function getPixels(im){let ctx,c;if(im.getContext){c=im;ctx=c.getContext('2d',{willReadFrequently:true})}else{c=document.createElement('canvas');c.width=im.naturalWidth||im.width;c.height=im.naturalHeight||im.height;ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0)}
const d=ctx.getImageData(0,0,c.width,c.height).data,z=new Uint8Array(c.width*c.height);for(let i=0;i<z.length;i++){const k=i*4;z[i]=Math.round(d[k]*.299+d[k+1]*.587+d[k+2]*.114)}return{gray:z,w:c.width,h:c.height}}
function prep(samples){let m=0,v=0;for(const s of samples)m+=s[2];m/=samples.length;for(const s of samples)v+=(s[2]-m)**2;return{samples,mean:m,var:v}}
function correlation(src,template,x,y,scale){const {gray,w,h}=src,{samples,mean,var:refVar}=template,n=samples.length;let sum=0,sum2=0,cross=0;
for(let i=0;i<n;i++){const a=samples[i],xx=Math.round(x+a[0]*scale),yy=Math.round(y+(a[1]-19)*scale);if(xx<0||xx>=w||yy<0||yy>=h)return -1;const val=gray[yy*w+xx];sum+=val;sum2+=val*val;cross+=val*(a[2]-mean)}
const sourceVar=sum2-sum*sum/n;return cross/Math.sqrt(Math.max(1e-6,sourceVar*refVar));}
function locate(image){if(!ref)throw Error('未載入版面字形範本');const src=getPixels(image),coarse=prep(ref.coarse),fine=prep(ref.fine);
// A known fixed game header is left/top on all supported roster screenshots, even with screenshot borders.
const scales=[];for(let s=.8;s<=3.41;s+=.10)if(s*262<src.w-4&&s*37<src.h)scales.push(+s.toFixed(2));
let top=[];for(const s of scales){const xmax=Math.min(320,src.w-s*262-2),ymax=Math.min(126,src.h-s*18-2);
for(let y=0;y<=ymax;y+=5)for(let x=0;x<=xmax;x+=7){const sc=correlation(src,coarse,x,y,s);if(sc<.15)continue;
if(top.length<18||sc>top[top.length-1].score){top.push({x,y,s,score:sc});top.sort((a,b)=>b.score-a.score);if(top.length>18)top.pop()}}}
let best={score:-1};for(const b of top){for(let ds=-.10;ds<=.10;ds+=.025){const s=b.s+ds;if(s<=0||s*262>src.w)continue;
for(let dy=-6;dy<=6;dy+=2)for(let dx=-9;dx<=9;dx+=3){const x=b.x+dx,y=b.y+dy;if(x<0||y<0)continue;const score=correlation(src,fine,x,y,s);if(score>best.score)best={score,s,x,y};}}
}
return best;
}
function normalize(image){const loc=locate(image);if(loc.score<.35)return{canvas:null,loc,valid:false};const {s,x,y}=loc;
const out=document.createElement('canvas');out.width=405;out.height=252;
const ctx=out.getContext('2d',{willReadFrequently:true}),src=getPixels(image),pixels=ctx.createImageData(405,252);
const sample=(ix,iy)=>src.gray[Math.max(0,Math.min(src.h-1,iy))*src.w+Math.max(0,Math.min(src.w-1,ix))];
// Deterministic grayscale resampling instead of browser-specific Canvas interpolation.
for(let oy=0;oy<252;oy++)for(let ox=0;ox<405;ox++){
 const fx=x+(ox+.5)*s-.5,fy=y-19*s+(oy+.5)*s-.5;
 const xx=Math.floor(fx),yy=Math.floor(fy),u=fx-xx,v=fy-yy;
 const a=sample(xx,yy)*(1-u)+sample(xx+1,yy)*u,b=sample(xx,yy+1)*(1-u)+sample(xx+1,yy+1)*u;
 const z=Math.max(0,Math.min(255,Math.round(a*(1-v)+b*v))),i=(oy*405+ox)*4;
 pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=z;pixels.data[i+3]=255;
}
ctx.putImageData(pixels,0,0);
return{canvas:out,loc,valid:true};}
window.yt3ClaudeAlign={init,locate,normalize};})();