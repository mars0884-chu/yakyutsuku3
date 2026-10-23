/* r14 experimental: image-pixel-only input normalization, no AI/OCR. */
(function(){'use strict';
const original=window.batchTestRows;
function normalize(img){
 const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
 const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);
 const {width:W,height:H}=c,im=g.getImageData(0,0,W,H).data;
 const corner=(i)=>im.slice(i*4,i*4+3).every(v=>v>245);
 if(!(corner(W*H-1)&&corner(W-1)))return img;
 let maxX=0,maxY=0,minX=W,minY=H;
 // All four borders are scanned at 2-pixel increments to ignore sparse JPEG artifacts.
 for(let y=0;y<H;y+=2)for(let x=0;x<W;x+=2){const k=(y*W+x)*4;if(Math.min(im[k],im[k+1],im[k+2])<235){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}
 if(maxX<=minX||maxY<=minY)return img;
 const bw=Math.min(W,maxX+3)-Math.max(0,minX-2),bh=Math.min(H,maxY+3)-Math.max(0,minY-2);
 if(bw/W>.93 && bh/H>.93)return img;
 const scale=bw<600?900/bw:1;
 const out=document.createElement('canvas');out.width=Math.round(bw*scale);out.height=Math.round(bh*scale);
 const ctx=out.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(img,Math.max(0,minX-2),Math.max(0,minY-2),bw,bh,0,0,out.width,out.height);out.yt3WhiteTrimmed=true;
 return out;
}
function hasName(row){const c=row.canvas,w=c.width,h=c.height,g=c.getContext('2d',{willReadFrequently:true});const x0=Math.round(w*.10),x1=Math.round(w*.57),y0=Math.round(h*.12),y1=Math.round(h*.83);
 if(x1<=x0||y1<=y0)return false; const z=g.getImageData(x0,y0,x1-x0,y1-y0).data;let bright=0,mid=0;
 for(let i=0;i<z.length;i+=4){const l=z[i]*.299+z[i+1]*.587+z[i+2]*.114;if(l>138)bright++;if(l>95)mid++}
 const ix=Math.round(w*.008),iw=Math.max(3,Math.round(w*.078));let iconInk=0;const d=g.getImageData(ix,y0,Math.min(iw,w-ix),y1-y0).data;for(let j=0;j<d.length;j+=4){const l=d[j]*.299+d[j+1]*.587+d[j+2]*.114;if(l>145)iconInk++}
 return (bright> (z.length/4)*.027 && mid>(z.length/4)*.065)||(iconInk>(d.length/4)*.12);
}
window.yt3NormalizeCapture=normalize;
window.batchTestRows=function(im,file){const n=normalize(im);let rows=original(n,file).filter(hasName);if(n.yt3WhiteTrimmed&&n.width>=750&&n.width<=950&&rows.length<=3){n.yt3Sparse=true;rows=original(n,file).filter(hasName)}return rows};
})();
/* Active orange tab; based only on screenshot RGB, never on any name answer. */
(function(){
window.yt3CaptureCategory=function(img){
 const im=window.yt3NormalizeCapture(img),g=im.getContext?im.getContext('2d',{willReadFrequently:true}):null;
 const c=g?im:(()=>{const el=document.createElement('canvas');el.width=im.width;el.height=im.height;el.getContext('2d',{willReadFrequently:true}).drawImage(im,0,0);return el})();
 const p=window.detectRows(im).panel,x0=p.x,y0=p.y;
 const w=Math.min(c.width-x0,Math.round(p.w*.68)),h=Math.min(c.height-y0,Math.max(20,Math.round(p.w*.055)));
 if(w<=0||h<=0)return'';
 const d=c.getContext('2d',{willReadFrequently:true}).getImageData(x0,y0,w,h).data;
 const ranges=[[0,.18],[.18,.32],[.32,.50],[.50,.67]],votes=[];
 for(const [a,b] of ranges){let n=0;const start=Math.max(0,Math.round(p.w*a)),end=Math.min(w,Math.round(p.w*b));
   for(let y=0;y<h;y++)for(let x=start;x<end;x++){
    const i=(y*w+x)*4,r=d[i],gg=d[i+1],bl=d[i+2];
    if(r>gg+22&&r>bl+26&&r>100&&gg>40&&gg<175)n++;
   }
   votes.push(n);
 }
 const sorted=votes.map((n,i)=>({n,i})).sort((a,b)=>b.n-a.n);
 return sorted[0].n>=Math.max(20,h*1.5)&&sorted[0].n>=sorted[1].n*1.7?['投手','捕手','內野手','外野手'][sorted[0].i]:'';
};
})();