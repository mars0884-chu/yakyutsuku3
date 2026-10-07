import fs from 'node:fs/promises';
import vm from 'node:vm';

const code=await fs.readFile(new URL('../krom-profile.js',import.meta.url),'utf8');
new Function(code);
const context=vm.createContext({
  window:{},TextDecoder,Uint8Array,Uint32Array,DataView,Map,Set,Date,Math,JSON,String,Number,Object,Array,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),
  atob:s=>Buffer.from(s,'base64').toString('binary'),
  console
});
vm.runInContext(code,context);
const api=context.window.YT3Krom;
if(!api)throw new Error('YT3Krom missing');

const size=4*1024*1024,u8=new Uint8Array(size),dv=new DataView(u8.buffer);
const putName=(off,name)=>{for(let i=0;i<10;i++)u8[off+i]=i<name.length?name.charCodeAt(i):0};
const entries=[['RESET',0],['ROMDIR',0x60],['EXTINFO',0],['KROM',106095],['ROMVER',14]];
for(let i=0;i<entries.length;i++){const p=i*16;putName(p,entries[i][0]);dv.setUint16(p+10,0,true);dv.setUint32(p+12,entries[i][1],true)}
let off=0;for(const [name,sz] of entries){if(name==='KROM')u8.fill(0xAA,off,off+sz);if(name==='ROMVER'){const txt='0160JC20010704';for(let i=0;i<14;i++)u8[off+i]=txt.charCodeAt(i)}off=(off+sz+15)&~15}
const parsed=api.parseBIOS(u8.buffer);
if(parsed.romver!=='0160JC20010704'||parsed.kromSize!==106095)throw new Error('ROMDIR/KROM parse failed');

const fakeFile={arrayBuffer:async()=>u8.buffer};
const players=Array.from({length:3767},(_,i)=>({
  '名前':i%2?'大谷 翔平':'重田 明仁',
  '年齢':String(18+i%12),
  '投/打':i%2?'右/右':'左/左'
}));
const profile=await api.buildProfile(fakeFile,players);
if(!api.validateProfile(profile))throw new Error('profile validation failed');
if(profile.playerCount!==3767||!profile.words['大谷']||!profile.words['翔平']||!profile.words['重田']||!profile.words['明仁'])throw new Error('Shift-JIS/KROM word profile failed');
if(!profile.tokens.pos['投']||!profile.tokens.age['18']||!profile.tokens.hand['右/右']||!profile.tokens.total['88'])throw new Error('fixed token profile failed');

console.log('KROM smoke OK',profile.id,profile.wordCount);
