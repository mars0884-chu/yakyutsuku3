function detectPanel(img){
 const W=img.naturalWidth||img.width,H=img.naturalHeight||img.height,sw=240,sh=Math.max(80,Math.round(H*sw/W));
 const c=document.createElement('canvas');c.width=sw;c.height=sh;
 const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;g.drawImage(img,0,0,sw,sh);
 const d=g.getImageData(0,0,sw,sh).data,n=sw*sh,mask=new Uint8Array(n),seen=new Uint8Array(n),stack=new Int32Array(n);
 for(let i=0,j=0;i<d.length;i+=4,j++){const l=d[i]*.299+d[i+1]*.587+d[i+2]*.114;mask[j]=l<90?1:0}
 let best=null;
 for(let sy=0;sy<sh;sy++)for(let sx=0;sx<sw;sx++){
  const seed=sy*sw+sx;if(!mask[seed]||seen[seed])continue;
  let top=0,area=0,minx=sx,maxx=sx,miny=sy,maxy=sy;stack[top++]=seed;seen[seed]=1;
  while(top){const q=stack[--top],y=Math.floor(q/sw),x=q-y*sw;area++;if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;const add=qq=>{if(qq>=0&&qq<n&&mask[qq]&&!seen[qq]){seen[qq]=1;stack[top++]=qq}};if(x>0)add(q-1);if(x+1<sw)add(q+1);if(y>0)add(q-sw);if(y+1<sh)add(q+sw)}
  const bw=maxx-minx+1,bh=maxy-miny+1,aspect=bw/Math.max(1,bh);if(miny>sh*.2||aspect<1.35||area<sw*sh*.08||bw>sw*.92)continue;
  if(!best||area>best.area)best={area,minx,miny,bw,bh};
 }
 if(!best)return{x:0,y:0,w:W,h:H};
 const x=Math.round(best.minx*W/sw),y=Math.round(best.miny*H/sh),w=Math.round(best.bw*W/sw),h=Math.round(best.bh*H/sh),pad=Math.max(1,Math.round(w*.008)),xx=Math.max(0,x-pad);
 return{x:xx,y:Math.max(0,y),w:Math.min(W-xx,w+pad*2),h:Math.min(H-y,h)};
}
function detectRows(img){
 const panel=detectPanel(img);let {x,y,w,h}=panel;
 // Crop/zoom variants can clip the panel edge. Infer the name-table origin
 // from the continuous dark left guard column, then restore native row scale.
 if(x===0 && w>=img.width-1){
  const probe=document.createElement('canvas');probe.width=img.width;probe.height=img.height;
  probe.getContext('2d').drawImage(img,0,0);
  const d=probe.getContext('2d',{willReadFrequently:true}).getImageData(0,Math.floor(img.height*.25),img.width,Math.max(1,Math.floor(img.height*.45))).data;
  const ph=Math.max(1,Math.floor(img.height*.45)),threshold=ph*.62;
  let found=-1,run=0;
  for(let xx=0;xx<Math.min(img.width*.45,450);xx++){
   let count=0;for(let yy=0;yy<ph;yy++){
    const q=(yy*img.width+xx)*4,l=d[q]*.299+d[q+1]*.587+d[q+2]*.114;
    if(l<100)count++
   }
   if(count>threshold){if(++run>=7){found=xx-run+1;break}}
   else run=0;
  }
  if(found>=0){x=Math.max(0,found-8);w=Math.max(w,img.width+90-x);panel.x=x;panel.w=w;panel.partial=true}
 }
 const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0);
 const ctx=c.getContext('2d',{willReadFrequently:true});
 const tw=Math.max(1,Math.round(w*.60)),th=Math.max(1,Math.round(h*.20));
 const t=ctx.getImageData(x,y,tw,th).data,tabVotes=[];
 for(let yy=0;yy<th;yy++){let count=0;for(let xx=0;xx<tw;xx++){const q=(yy*tw+xx)*4,r=t[q],g=t[q+1],b=t[q+2];if(r>g+20&&r>b+25&&r>75)count++}tabVotes.push(count)}
 const valid=tabVotes.map((v,i)=>v>Math.min(w*.04,25)?i:-1).filter(i=>i>=0),tabBottom=valid.length?y+valid[valid.length-1]:null;
 const xs=x+Math.round(w*.11),xe=x+Math.round(w*.59),qw=Math.max(1,xe-xs),r=ctx.getImageData(xs,y,qw,h).data;
 const vals=new Float64Array(h),smoothed=new Float64Array(h),z=new Float64Array(h);
 for(let yy=0;yy<h;yy++){let count=0;for(let xx=0;xx<qw;xx++){const q=(yy*qw+xx)*4,l=r[q]*.299+r[q+1]*.587+r[q+2]*.114;if(l>140)count++}vals[yy]=count/qw}
 let sumWeights=0;const weights=[];for(let k=-24;k<=24;k++){const weight=Math.exp(-.5*(k/8)**2);weights.push(weight);sumWeights+=weight}
 for(let yy=0;yy<h;yy++){let sum=0;for(let k=-24;k<=24;k++){const v=yy+k;if(v>=0&&v<h)sum+=vals[v]*weights[k+24]}smoothed[yy]=sum/sumWeights;z[yy]=vals[yy]-smoothed[yy]}
 const lo=Math.floor(h*.27),hi=Math.floor(h*.90);let pitch=36,best=-1;
 for(let p=25;p<=55;p++){let ab=0,aa=0,bb=0;for(let q=lo;q<hi-p;q++){const a=z[q],b=z[q+p];ab+=a*b;aa+=a*a;bb+=b*b}const s=ab/Math.sqrt(Math.max(1e-9,aa*bb));if(s>best){best=s;pitch=p}}
 if(panel.partial){w=pitch*25;panel.w=w;} else {const geometricalPitch=w/24.8;if(Math.abs(geometricalPitch-pitch)<1.6)pitch=Math.round(geometricalPitch);}
 const first=tabBottom==null?y+Math.round(h*.2):tabBottom+Math.round(pitch*1.18);
 const rows=[];for(let i=0;i<11;i++){const start=first+Math.round(i*pitch);if(start+pitch>y+h+3)break;rows.push({start,end:start+pitch})}
 return{panel,tabBottom,pitch,rows,score:best};
}
window.detectRows=detectRows;