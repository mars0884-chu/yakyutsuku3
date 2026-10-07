(()=>{
'use strict';

const PROFILE_VERSION=1;
const SJIS_RANGES=[
[0x8140,0x817e],[0x8180,0x81ac],[0x81b8,0x81bf],[0x81c8,0x81ce],[0x81da,0x81e8],[0x81f0,0x81f7],[0x81fc,0x81fc],
[0x824f,0x8258],[0x8260,0x8279],[0x8281,0x829a],[0x829f,0x82f1],[0x8340,0x837e],[0x8380,0x8396],[0x839f,0x83b6],
[0x83bf,0x83d6],[0x8440,0x8460],[0x8470,0x847e],[0x8480,0x8491],[0x849f,0x84be],[0x889f,0x88fc],[0x8940,0x897e],
[0x8980,0x89fc],[0x8a40,0x8a7e],[0x8a80,0x8afc],[0x8b40,0x8b7e],[0x8b80,0x8bfc],[0x8c40,0x8c7e],[0x8c80,0x8cfc],
[0x8d40,0x8d7e],[0x8d80,0x8dfc],[0x8e40,0x8e7e],[0x8e80,0x8efc],[0x8f40,0x8f7e],[0x8f80,0x8ffc],[0x9040,0x907e],
[0x9080,0x90fc],[0x9140,0x917e],[0x9180,0x91fc],[0x9240,0x927e],[0x9280,0x92fc],[0x9340,0x937e],[0x9380,0x93fc],
[0x9440,0x947e],[0x9480,0x94fc],[0x9540,0x957e],[0x9580,0x95fc],[0x9640,0x967e],[0x9680,0x96fc],[0x9740,0x977e],
[0x9780,0x97fc],[0x9840,0x9872]
];
const KROM_DOUBLE_BYTES=3489*30;
const KROM_ASCII_OFFSET=0x198de;
const KROM_MIN_SIZE=KROM_ASCII_OFFSET+95*15;
let unicodeToSjis=null;
const vecCache=new Map();

function align16(n){return (n+15)&~15}
function ascii(u8,off,n){let s='';for(let i=0;i<n&&off+i<u8.length;i++){const c=u8[off+i];if(!c)break;if(c<0x20||c>0x7e)break;s+=String.fromCharCode(c)}return s}
function parseBIOS(arrayBuffer){
  const u8=new Uint8Array(arrayBuffer),dv=new DataView(arrayBuffer);let dir=-1;
  const max=Math.min(u8.length-48,0x800000);
  for(let i=0;i<=max;i+=16){
    if(ascii(u8,i,10)==='RESET'&&ascii(u8,i+16,10)==='ROMDIR'&&ascii(u8,i+32,10)==='EXTINFO'){dir=i;break}
  }
  if(dir<0)throw new Error('找不到 PS2 BIOS 的 ROMDIR');
  const entries=[];let fileOffset=0;
  for(let p=dir;p+16<=u8.length;p+=16){
    const name=ascii(u8,p,10);if(!name)break;
    const ext=dv.getUint16(p+10,true),size=dv.getUint32(p+12,true);
    entries.push({name,ext,size,offset:fileOffset});fileOffset+=align16(size);
    if(entries.length>512)throw new Error('ROMDIR 結構異常');
  }
  const kromEntry=entries.find(e=>e.name==='KROM');if(!kromEntry)throw new Error('此 BIOS 找不到 KROM');
  if(kromEntry.offset+kromEntry.size>u8.length||kromEntry.size<KROM_MIN_SIZE)throw new Error('KROM 大小異常');
  const krom=u8.slice(kromEntry.offset,kromEntry.offset+kromEntry.size);
  const romverEntry=entries.find(e=>e.name==='ROMVER');
  const romver=romverEntry?ascii(u8,romverEntry.offset,14):'';
  return{krom,romver,kromSize:kromEntry.size,entries}
}
function makeUnicodeToSjis(){
  if(unicodeToSjis)return unicodeToSjis;
  const map=new Map(),dec=new TextDecoder('shift_jis',{fatal:false});
  for(let c=0x20;c<=0x7e;c++)map.set(String.fromCharCode(c),c);
  for(let c=0xa1;c<=0xdf;c++){const ch=dec.decode(new Uint8Array([c]));if(ch&&ch!=='�')map.set(ch,c)}
  for(const [a,b] of SJIS_RANGES)for(let c=a;c<=b;c++){const ch=dec.decode(new Uint8Array([c>>8,c&255]));if(ch&&ch!=='�'&&!map.has(ch))map.set(ch,c)}
  unicodeToSjis=map;return map
}
function doubleIndex(code){
  let off=0;
  for(const [a,b] of SJIS_RANGES){if(code>=a&&code<=b)return off+(code-a);off+=b-a+1}
  return-1
}
function glyph(krom,ch){
  if(ch===' ')return{w:8,h:15,bits:new Uint8Array(8*15)};
  const map=makeUnicodeToSjis(),code=map.get(ch);if(code==null)return null;
  if(code<=0x7f){
    if(code<33||code>127)return{w:8,h:15,bits:new Uint8Array(8*15)};
    const off=KROM_ASCII_OFFSET+(code-33)*15;if(off+15>krom.length)return null;
    const bits=new Uint8Array(8*15);
    for(let y=0;y<15;y++){const v=krom[off+y];for(let x=0;x<8;x++)bits[y*8+x]=(v&(0x80>>x))?1:0}
    return{w:8,h:15,bits}
  }
  const idx=doubleIndex(code);if(idx<0)return null;const off=idx*30;if(off+30>krom.length)return null;
  const bits=new Uint8Array(16*15);
  for(let y=0;y<15;y++){const a=krom[off+y*2],b=krom[off+y*2+1];for(let x=0;x<8;x++)bits[y*16+x]=(a&(0x80>>x))?1:0;for(let x=0;x<8;x++)bits[y*16+8+x]=(b&(0x80>>x))?1:0}
  return{w:16,h:15,bits}
}
function dilateX(bm){
  const out=new Uint8Array(bm.bits.length);
  for(let y=0;y<bm.h;y++)for(let x=0;x<bm.w;x++)if(bm.bits[y*bm.w+x]){out[y*bm.w+x]=1;if(x+1<bm.w)out[y*bm.w+x+1]=1}
  return{w:bm.w,h:bm.h,bits:out}
}
function render(krom,text,{spacing=0,bold=false}={}){
  const gs=[];let w=0;
  for(const ch of [...String(text||'')]){let g=glyph(krom,ch);if(!g)return null;if(bold)g=dilateX(g);gs.push(g);w+=g.w}
  if(gs.length>1)w+=spacing*(gs.length-1);w=Math.max(1,w);
  const bits=new Uint8Array(w*15);let ox=0;
  for(const g of gs){for(let y=0;y<15;y++)for(let x=0;x<g.w;x++)if(g.bits[y*g.w+x]){const xx=ox+x;if(xx>=0&&xx<w)bits[y*w+xx]=1}ox+=g.w+spacing}
  return{w,h:15,bits}
}
function bboxMask(bm){
  let minx=bm.w,miny=bm.h,maxx=-1,maxy=-1;
  for(let y=0;y<bm.h;y++)for(let x=0;x<bm.w;x++)if(bm.bits[y*bm.w+x]){if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y}
  if(maxx<minx)return null;
  const w=maxx-minx+1,h=maxy-miny+1,bits=new Uint8Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)bits[y*w+x]=bm.bits[(miny+y)*bm.w+minx+x];
  return{w,h,bits}
}
function normalize(bm,W=80,H=20){
  const box=bboxMask(bm);if(!box)return null;
  const scale=Math.min((W-2)/box.w,(H-2)/box.h),dw=Math.max(1,Math.round(box.w*scale)),dh=Math.max(1,Math.round(box.h*scale)),ox=Math.floor((W-dw)/2),oy=Math.floor((H-dh)/2),bits=new Uint8Array(W*H);
  for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){const sx=Math.min(box.w-1,Math.floor(x/scale)),sy=Math.min(box.h-1,Math.floor(y/scale));if(box.bits[sy*box.w+sx])bits[(oy+y)*W+ox+x]=1}
  return{w:W,h:H,bits,ratio:box.w/box.h}
}
function descriptor(bm){
  const n=normalize(bm);if(!n)return null;const v=[];
  for(let gy=0;gy<4;gy++)for(let gx=0;gx<8;gx++){let c=0;for(let y=gy*5;y<(gy+1)*5;y++)for(let x=gx*10;x<(gx+1)*10;x++)c+=n.bits[y*80+x];v.push(Math.round(255*c/50))}
  for(let y=0;y<20;y++){let c=0;for(let x=0;x<80;x++)c+=n.bits[y*80+x];v.push(Math.round(255*c/80))}
  for(let bx=0;bx<20;bx++){let c=0;for(let y=0;y<20;y++)for(let x=bx*4;x<(bx+1)*4;x++)c+=n.bits[y*80+x];v.push(Math.round(255*c/80))}
  const u8=new Uint8Array(v);let str='';for(let i=0;i<u8.length;i+=4096)str+=String.fromCharCode(...u8.subarray(i,i+4096));
  return{r:Math.round(n.ratio*1000),v:btoa(str)}
}
function decodeVector(s){
  if(vecCache.has(s))return vecCache.get(s);const raw=atob(s),v=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)v[i]=raw.charCodeAt(i);if(vecCache.size>12000)vecCache.clear();vecCache.set(s,v);return v
}
function descSimilarity(a,b){
  if(!a||!b)return 0;const av=decodeVector(a.v),bv=decodeVector(b.v);if(av.length!==bv.length)return 0;let d=0;for(let i=0;i<av.length;i++)d+=Math.abs(av[i]-bv[i]);const shape=Math.max(0,1-d/(255*av.length)),ra=Math.max(.05,a.r/1000),rb=Math.max(.05,b.r/1000),aspect=Math.exp(-Math.abs(Math.log(ra/rb))*.12);return shape*.90+aspect*.10
}
function wordVariants(krom,word){
  const out=[];
  for(const cfg of [{spacing:0,bold:false},{spacing:1,bold:false},{spacing:-1,bold:false},{spacing:0,bold:true}]){
    const bm=render(krom,word,cfg),d=bm&&descriptor(bm);if(d)out.push(d)
  }
  return out
}
function bestWordSim(target,variants){let best=0;for(const d of variants||[])best=Math.max(best,descSimilarity(target,d));return best}
function splitName(v){const a=String(v||'').trim().split(/\s+/).filter(Boolean);return{surname:a[0]||'',given:a.slice(1).join('')}}
function profileWords(krom,players,onProgress){
  const words=new Set();for(const p of players){const q=splitName(p['名前']);if(q.surname)words.add(q.surname);if(q.given)words.add(q.given)}
  const out={},list=[...words];let skipped=0;
  for(let i=0;i<list.length;i++){const ds=wordVariants(krom,list[i]);if(ds.length)out[list[i]]=ds;else skipped++;if(onProgress&&i%25===0)onProgress(8+Math.round(78*i/Math.max(1,list.length)),'建立姓名指紋 '+(i+1)+'/'+list.length)}
  return{words:out,skipped,total:list.length}
}
function uniqueValues(players,key,convert=x=>x){return[...new Set(players.map(p=>convert(p[key])).filter(Boolean))]}
function buildTokens(krom,players){
  const token={pos:{},age:{},hand:{},total:{}};
  for(const v of ['投','捕','一','二','三','遊','外'])token.pos[v]=wordVariants(krom,v);
  for(const v of uniqueValues(players,'年齢',x=>(String(x).match(/\d+/)||[])[0]))token.age[v]=wordVariants(krom,v+'歳');
  for(const v of uniqueValues(players,'投/打',x=>String(x||'').normalize('NFKC').replace('／','/').replace(/\s+/g,'')))token.hand[v]=wordVariants(krom,v);
  for(let n=20;n<=200;n++)token.total[n]=wordVariants(krom,'合計：'+n+'人');
  return token
}
function fingerprint(str){
  let h=2166136261>>>0;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h.toString(16).padStart(8,'0')
}
async function buildProfile(file,players,onProgress){
  if(!file)throw new Error('未選擇 BIOS');if(!Array.isArray(players)||players.length<3500)throw new Error('完整 3,767 人名冊尚未載入');
  onProgress?.(2,'讀取 PS2 BIOS…');const bios=parseBIOS(await file.arrayBuffer());onProgress?.(6,'找到 BIOS KROM，建立固定字形指紋…');
  const pw=profileWords(bios.krom,players,onProgress),tokens=buildTokens(bios.krom,players);
  const profile={format:'yt3-krom-profile',version:PROFILE_VERSION,source:'PS2 BIOS KROM',romver:bios.romver,kromSize:bios.kromSize,createdAt:new Date().toISOString(),playerCount:players.length,wordCount:Object.keys(pw.words).length,skippedWords:pw.skipped,words:pw.words,tokens};
  const sig=JSON.stringify({romver:profile.romver,kromSize:profile.kromSize,wordCount:profile.wordCount,keys:Object.keys(profile.words).slice(0,200)});
  profile.id='krom-'+fingerprint(sig);onProgress?.(100,'PS2 字形庫建立完成');return profile
}
function validateProfile(p){return!!(p&&p.format==='yt3-krom-profile'&&p.version===PROFILE_VERSION&&p.words&&p.tokens&&p.playerCount>=3500)}
function percentileFromHist(hist,total,q){let n=0,target=total*q;for(let i=0;i<256;i++){n+=hist[i];if(n>=target)return i}return 128}
function canvasMask(src,rx0,rx1,{y0=.08,y1=.92}={}){
  const sx=Math.max(0,Math.floor(src.width*rx0)),ex=Math.min(src.width,Math.ceil(src.width*rx1)),sy=Math.max(0,Math.floor(src.height*y0)),ey=Math.min(src.height,Math.ceil(src.height*y1)),w=Math.max(1,ex-sx),h=Math.max(1,ey-sy),g=src.getContext('2d',{willReadFrequently:true}),id=g.getImageData(sx,sy,w,h).data,hist=new Uint32Array(256);
  for(let i=0;i<id.length;i+=4){const l=Math.max(0,Math.min(255,Math.round(id[i]*.299+id[i+1]*.587+id[i+2]*.114)));hist[l]++}
  const total=w*h,p50=percentileFromHist(hist,total,.50),p88=percentileFromHist(hist,total,.88),th=Math.max(92,Math.min(190,Math.round((p50+p88)/2))),bits=new Uint8Array(w*h),occ=new Float32Array(w);
  for(let x=0;x<w;x++){let c=0;for(let y=0;y<h;y++){const i=(y*w+x)*4,l=id[i]*.299+id[i+1]*.587+id[i+2]*.114;if(l>th)c++}occ[x]=c/h}
  let ink=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,l=id[i]*.299+id[i+1]*.587+id[i+2]*.114,v=(l>th&&occ[x]<.78)?1:0;bits[y*w+x]=v;ink+=v}
  if(ink<3)return null;return{w,h,bits,ink:ink/(w*h)}
}
function canvasDescriptor(src,rx0,rx1,opts){const m=canvasMask(src,rx0,rx1,opts);return m?{desc:descriptor(m),ink:m.ink}:null}
function detectSeparator(canvas){
  const g=canvas.getContext('2d',{willReadFrequently:true}),id=g.getImageData(0,0,canvas.width,canvas.height).data,x0=Math.floor(canvas.width*.12),x1=Math.floor(canvas.width*.27),y0=Math.floor(canvas.height*.08),y1=Math.floor(canvas.height*.92);let best=null,st=-1;
  for(let x=x0;x<=x1;x++){let occ=0;if(x<x1)for(let y=y0;y<y1;y++){const i=(y*canvas.width+x)*4,l=id[i]*.299+id[i+1]*.587+id[i+2]*.114;if(l>172)occ++}const ok=x<x1&&occ/Math.max(1,y1-y0)>.62;if(ok&&st<0)st=x;if((!ok||x===x1)&&st>=0){const en=x,w=en-st;if(w>=3&&(!best||w>best.w))best={a:st,b:en,w};st=-1}}
  return best?{left:best.a/canvas.width,right:best.b/canvas.width}:{left:.158,right:.218}
}
function classify(desc,map){let a=null,b=null;for(const [label,variants] of Object.entries(map||{})){const score=bestWordSim(desc,variants),x={label,score};if(!a||score>a.score){b=a;a=x}else if(!b||score>b.score)b=x}return a?{...a,margin:a.score-(b?.score||0),second:b}:null}
function mapPosChar(c){return{投:'投手',捕:'捕手',一:'一壘手',二:'二壘手',三:'三壘手',遊:'游擊手',外:'外野手'}[c]||''}
function normHand(x){return String(x||'').normalize('NFKC').replace('／','/').replace(/\s+/g,'')}
function recognizeRow(canvas,players,profile){
  if(!validateProfile(profile))throw new Error('PS2 字形庫尚未建立');
  const sep=detectSeparator(canvas),sur=canvasDescriptor(canvas,.055,Math.max(.10,sep.left-.008)),giv=canvasDescriptor(canvas,Math.min(.30,sep.right+.008),.46),posD=canvasDescriptor(canvas,.006,.072),ageD=canvasDescriptor(canvas,.53,.705),handD=canvasDescriptor(canvas,.755,.965);
  const ink=(sur?.ink||0)+(giv?.ink||0);if(ink<.012)return{blank:true,candidates:[],fontScore:0};
  const pos=posD&&classify(posD.desc,profile.tokens.pos),age=ageD&&classify(ageD.desc,profile.tokens.age),hand=handD&&classify(handD.desc,profile.tokens.hand);
  let pool=players;
  if(pos&&pos.score>=.63&&pos.margin>=.012){const pv=mapPosChar(pos.label),n=pool.filter(p=>p._position===pv);if(n.length)pool=n}
  if(age&&age.score>=.63&&age.margin>=.010){const n=pool.filter(p=>String(p['年齢']||'').match(/\d+/)?.[0]===age.label);if(n.length)pool=n}
  if(hand&&hand.score>=.63&&hand.margin>=.010){const n=pool.filter(p=>normHand(p['投/打'])===hand.label);if(n.length)pool=n}
  const sCache=new Map(),gCache=new Map();
  const scored=pool.map(p=>{const q=splitName(p['名前']),sv=profile.words[q.surname],gv=profile.words[q.given],ss=sur&&sv?(sCache.has(q.surname)?sCache.get(q.surname):(sCache.set(q.surname,bestWordSim(sur.desc,sv)),sCache.get(q.surname))):0,gs=q.given?(giv&&gv?(gCache.has(q.given)?gCache.get(q.given):(gCache.set(q.given,bestWordSim(giv.desc,gv)),gCache.get(q.given))):0):(giv?.ink<.01?.75:0);let meta=0,bonus=0;if(pos&&p._position===mapPosChar(pos.label)){meta++;bonus+=Math.max(0,pos.score-.55)*.05}if(age&&String(p['年齢']||'').match(/\d+/)?.[0]===age.label){meta++;bonus+=Math.max(0,age.score-.55)*.03}if(hand&&normHand(p['投/打'])===hand.label){meta++;bonus+=Math.max(0,hand.score-.55)*.04}const nameScore=q.given?ss*.48+gs*.52:ss,score=Math.min(1,nameScore*.94+bonus);return{p,score,nameScore,surnameScore:ss,givenScore:gs,meta}}).sort((a,b)=>b.score-a.score);
  const a=scored[0],b=scored[1],margin=(a?.score||0)-(b?.score||0),fontParts=[pos?.score,age?.score,hand?.score].filter(Number.isFinite),fontScore=fontParts.length?fontParts.reduce((x,y)=>x+y,0)/fontParts.length:0;
  const accept=!!a&&fontScore>=.62&&((a.nameScore>=.78&&margin>=.028)||(a.nameScore>=.73&&a.meta>=2&&margin>=.035));
  return{blank:false,match:accept?a:null,candidates:scored.slice(0,12),margin,fontScore,meta:{pos,age,hand},separator:sep}
}
function recognizeTotal(img,profile){
  if(!validateProfile(profile))return 0;
  const c=document.createElement('canvas'),sx=Math.round(img.naturalWidth*.785),sy=Math.round(img.naturalHeight*.89),sw=Math.max(1,Math.round(img.naturalWidth*.205)),sh=Math.max(1,Math.round(img.naturalHeight*.095));c.width=sw;c.height=sh;c.getContext('2d',{willReadFrequently:true}).drawImage(img,sx,sy,sw,sh,0,0,sw,sh);
  const d=canvasDescriptor(c,0,1,{y0:0,y1:1});if(!d)return 0;const x=classify(d.desc,profile.tokens.total);return x&&x.score>=.67&&x.margin>=.012?Number(x.label):0
}
function calibrationScore(results){const xs=results.map(r=>r.fontScore).filter(x=>x>0);if(!xs.length)return 0;xs.sort((a,b)=>a-b);return xs[Math.floor(xs.length/2)]}

window.YT3Krom={PROFILE_VERSION,parseBIOS,buildProfile,validateProfile,recognizeRow,recognizeTotal,calibrationScore};
})();