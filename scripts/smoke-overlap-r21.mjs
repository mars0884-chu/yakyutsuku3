import fs from 'node:fs/promises';
import vm from 'node:vm';
const src=await fs.readFile(new URL('../engine/r14-overlap-r18.js',import.meta.url),'utf8');
const ctx={window:{yt3OverlapPair:()=>null,yt3CaptureCategory:()=>''}};vm.runInNewContext(src,ctx);
const sim=ctx.window.yt3RowPixelSimilarity;
function row(key,bright=false,blank=false){const w=340,h=45,a=new Uint8ClampedArray(w*h*4),bg=bright?243:40,fg=bright?24:230;
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const inChar=x>=45&&x<180&&y>=8&&y<36;const cell=Math.floor((x-45)/11),xx=(x-45)%11,yy=y-8;
const painted=inChar&&!blank&&(cell%5===2?((xx+Math.floor(yy/4)+key)%7<3):((xx*3+yy+cell*7+key)%19<6));const v=painted?fg:bg,k=4*(y*w+x);a[k]=a[k+1]=a[k+2]=v;a[k+3]=255}
return{canvas:{width:w,height:h,getContext:()=>({getImageData:()=>({data:a})})}}}
const a=row(1),b=row(1,true),c=row(9),d=row(0,false,true);
function check(v,m){if(!v)throw Error(m)}
const same=sim(a,b),different=sim(a,c),blank=sim(a,d);
check(same>.85,'Selected bright and dark text must agree '+same);
check(different<same-.05,'Different text must not overmerge '+different);
check(blank===0,'Blank label must never merge '+blank);
console.log('pixel mask smoke OK',JSON.stringify({same,different,blank}));
