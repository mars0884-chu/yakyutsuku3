import fs from 'node:fs/promises';

const players=JSON.parse(await fs.readFile(new URL('../data/players.json',import.meta.url),'utf8'));
const calibration=JSON.parse(await fs.readFile(new URL('../data/calibration.json',import.meta.url),'utf8'));
const roster=players.map(p=>String(p['名前']||'').normalize('NFKC').replace(/\s+/g,' ').trim());
const names=new Set(roster);const counts=new Map();for(const n of roster)counts.set(n,(counts.get(n)||0)+1);
const labels=[...new Set(calibration.entries.flatMap(e=>e.names||[]))];
const missing=labels.filter(n=>!names.has(String(n).normalize('NFKC').replace(/\s+/g,' ').trim()));
console.log('calibration entries:',calibration.entries.length);
console.log('calibration unique names:',labels.length);
console.log('roster names:',names.size);
function lev(a,b){a=[...a];b=[...b];const d=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=0;i<=a.length;i++)d[i][0]=i;for(let j=0;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]}
const ambiguous=labels.filter(n=>(counts.get(String(n).normalize('NFKC').replace(/\s+/g,' ').trim())||0)>1);console.log('calibration ambiguous roster names:',ambiguous.length?ambiguous:'none');
if(missing.length){
  console.error('Calibration names missing from roster:',missing);
  for(const m of missing){
    const given=m.split(/\s+/).slice(1).join('');
    const pool=roster.filter(n=>!given||n.includes(given)).length?roster.filter(n=>n.includes(given)):roster;
    console.error('Nearest for',m,':',pool.map(n=>[lev(m,n),n]).sort((a,b)=>a[0]-b[0]).slice(0,12));
  }
  process.exit(1);
}
console.log('Calibration roster validation OK');
