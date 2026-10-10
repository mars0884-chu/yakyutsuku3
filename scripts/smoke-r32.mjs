import fs from 'node:fs/promises';
import vm from 'node:vm';
const code=await fs.readFile(new URL('../engine/claude-align-r17.js',import.meta.url),'utf8');
new Function(code);
const samples=[];
for(let i=0;i<64;i++){const x=(i*37)%260,y=19+(i*13)%18;const pixel=20+(i*79)%210;samples.push([x,y,pixel]);}
const world={window:{},fetch:async()=>({ok:true,json:async()=>({coarse:samples,fine:samples})})};
vm.runInNewContext(code,world);
await world.window.yt3ClaudeAlign.init();
const w=2000,h=900,data=new Uint8ClampedArray(w*h*4);
for(let i=0;i<w*h;i++){data[i*4]=data[i*4+1]=data[i*4+2]=96;data[i*4+3]=255}
const x=740,y=234,s=1.94;
for(const [xx,yy,val] of samples){const a=Math.round(x+xx*s),b=Math.round(y+(yy-19)*s),off=(b*w+a)*4;data[off]=data[off+1]=data[off+2]=val}
const image={width:w,height:h,getContext:()=>({getImageData:()=>({data})})};
const loc=world.window.yt3ClaudeAlign.locate(image);
function check(ok,msg){if(!ok)throw Error(msg)}
check(loc.score>.98,'synthetic inset PS2 header not found, score '+loc.score);
check(Math.abs(loc.x-x)<10&&Math.abs(loc.y-y)<10,'wrong embedded location '+JSON.stringify(loc));
check(loc.search==='inset-editor','large-image fallback was not activated');
console.log('r32 inset-editor deterministic pixel-mask locator PASS',loc);
