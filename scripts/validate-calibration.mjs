import fs from 'node:fs/promises';

const players=JSON.parse(await fs.readFile(new URL('../data/players.json',import.meta.url),'utf8'));
const calibration=JSON.parse(await fs.readFile(new URL('../data/calibration.json',import.meta.url),'utf8'));
const names=new Set(players.map(p=>String(p['名前']||'').normalize('NFKC').replace(/\s+/g,' ').trim()));
const labels=[...new Set(calibration.entries.flatMap(e=>e.names||[]))];
const missing=labels.filter(n=>!names.has(String(n).normalize('NFKC').replace(/\s+/g,' ').trim()));
console.log('calibration entries:',calibration.entries.length);
console.log('calibration unique names:',labels.length);
console.log('roster names:',names.size);
if(missing.length){
  console.error('Calibration names missing from roster:',missing);
  process.exit(1);
}
console.log('Calibration roster validation OK');
