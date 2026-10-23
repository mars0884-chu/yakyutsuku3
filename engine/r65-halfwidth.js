/* r65/r66：半形英文／混合姓名的本機字形比對；不使用 AI 或答案清單。 */
(function(){'use strict';
let pack=null,raw=null,chars=null;const letters=new Map();
async function init(){if(pack)return true;const r=await fetch('./engine/claude-glyphs-16.json');if(!r.ok)throw Error('半形字形資料載入失敗');
 pack=await r.json();raw=Uint8Array.from(atob(pack.data),c=>c.charCodeAt(0));chars=[...pack.chars];return true}
const isLatin=ch=>/[A-Za-z.]/.test(ch);
function prepFull(ch){const k='F'+ch;if(letters.has(k))return letters.get(k);const i=chars.indexOf(ch);if(i<0){letters.set(k,null);return null}
 const g=raw.subarray(i*256,(i+1)*256);let ink=0;for(let j=0;j<256;j++)if(g[j]>70)ink++;if(!ink){letters.set(k,null);return null}
 const o={t:Float32Array.from(g),w:16,full:true};letters.set(k,o);return o}
function prep(ch){if(!isLatin(ch))return prepFull(ch);if(letters.has(ch))return letters.get(ch);const i=chars.indexOf(ch);if(i<0){letters.set(ch,null);return null}
 const g=raw.subarray(i*256,(i+1)*256);let l=16,r=-1;for(let x=0;x<16;x++)for(let y=0;y<16;y++)if(g[y*16+x]>70){l=Math.min(l,x);r=Math.max(r,x)}
 if(r<l){letters.set(ch,null);return null}
 const w=r-l+3,t=new Float32Array(16*w);for(let y=0;y<16;y++)for(let x=0;x<w;x++){const sx=l-1+x;t[y*w+x]=(sx>=0&&sx<16)?g[y*16+sx]:0}
 const o={t,w};letters.set(ch,o);return o}
function ncc(a,b){let ma=0,mb=0;for(let i=0;i<a.length;i++){ma+=a[i];mb+=b[i]}ma/=a.length;mb/=b.length;let s=0,ea=0,eb=0;for(let i=0;i<a.length;i++){const x=a[i]-ma,y=b[i]-mb;s+=x*y;ea+=x*x;eb+=y*y}return s/Math.sqrt(ea*eb+1e-9)}
const win=(g,x0,w,dy)=>{const v=new Float32Array(16*w);for(let y=0;y<16;y++){const yy=Math.max(0,Math.min(15,y+dy));for(let x=0;x<w;x++)v[y*w+x]=g[yy*280+Math.min(279,x0+x)]}return v};
function score(g,name){const L=[...name].map(prep);if(L.some(x=>!x))return -1;let best=-1;
 for(const dy of [-1,0,1]){let cur=new Map();for(let x=36;x<=44;x++)cur.set(x,ncc(win(g,x,L[0].w,dy),L[0].t));
  for(let i=1;i<L.length;i++){const nx=new Map();for(const [x,s] of cur)for(const gap of (L[i].full||L[i-1].full?(L[i].full&&L[i-1].full?[-1,0,1]:[-1,0,1,2,3]):[-1,0,1,2])){const x2=x+L[i-1].w-1+(L[i-1].full?1:0)+gap;if(x2>175)continue;const sc=s+ncc(win(g,x2,L[i].w,dy),L[i].t);if(!nx.has(x2)||nx.get(x2)<sc)nx.set(x2,sc)}cur=nx}
  for(const [x,s] of cur){const end=x+L[L.length-1].w;let ink=0;for(let y=2;y<14;y++)for(let xx=end+3;xx<Math.min(200,end+23);xx++)if(g[y*280+xx]>150)ink++;const avg=s/L.length-(ink>=14?.3:0);if(avg>best)best=avg}}
 return best}
function grayOf(canvas){const c=canvas.width===280&&canvas.height===16?canvas:(()=>{const e=document.createElement('canvas');e.width=280;e.height=16;e.getContext('2d',{willReadFrequently:true}).drawImage(canvas,0,0,canvas.width,canvas.height,0,0,280,16);return e})();
 const d=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,280,16).data,g=new Float32Array(280*16);
 for(let i=0;i<g.length;i++)g[i]=window.yt3ClaudeAlign?.selectedInkLuma?window.yt3ClaudeAlign.selectedInkLuma(d[i*4],d[i*4+1],d[i*4+2]):d[i*4]*.299+d[i*4+1]*.587+d[i*4+2]*.114;return g}
function match(canvas,players,category){if(!pack)return null;const norm=s=>String(s||'').normalize('NFKC').replace(/\s/g,'');
 const pool=players.filter(p=>{const n=norm(p['名前']);return /^[A-Za-z]{2,}$/.test(n)||(/[A-Za-z]/.test(n)&&[...n].length>=3)});if(!pool.length)return null;
 const g=grayOf(canvas),list=pool.map(p=>({p,name:p['名前'],score:score(g,norm(p['名前']))})).filter(x=>x.score>-1).sort((a,b)=>b.score-a.score);
 if(!list.length)return null;const top=list[0],margin=top.score-(list[1]?.score??-1),dup=pool.filter(p=>norm(p['名前'])===norm(top.name)).length;
 const posOk=!category||(top.p._position===category)||(category==='內野手'&&['一壘手','二壘手','三壘手','游擊手'].includes(top.p._position));
 const full=[...norm(top.name)].length,mixed=/[^A-Za-z]/.test(norm(top.name));
 const ok=dup===1&&posOk&&(mixed?(top.score>=.58&&margin*full>=.25):(top.score>=.55&&margin>=.12));
 return{best:ok?{...top,visualScore:top.score}:null,candidates:list.slice(0,3).map(x=>({...x,visualScore:x.score})),margin};}
window.yt3HalfWidthLatin={init,match,_score:score,_prep:prep,_grayOf:grayOf};})();
