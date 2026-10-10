import fs from 'node:fs/promises';
const read=async p=>JSON.parse(await fs.readFile(new URL('../data/'+p,import.meta.url),'utf8'));
const [book,cheats,sources,status]=await Promise.all(['guide-book.json','cheats.json','sources.json','research-status.json'].map(read));
const ok=(v,m)=>{if(!v)throw Error(m)};
ok(book.length===31,'Expected 31 unique guide chapters');
const ids=book.map(x=>x.id);ok(new Set(ids).size===ids.length,'Duplicated chapter ids');
let rows=0;const seen=new Set();
for(const ch of book){
  const count=ch.sections.reduce((n,s)=>n+(s.rows?.length||0)+(s.items?.length||0),0);
  ok(ch.count===count,'Wrong count: '+ch.id);
  for(const s of ch.sections)for(const row of (s.rows||[])){
    const key=JSON.stringify(row.map(x=>String(x).normalize('NFKC').replace(/\\s+/g,' ').trim()));
    ok(!seen.has(key),'Duplicate guide row in '+ch.id+' : '+key.slice(0,90));
    seen.add(key);rows++;
  }
}
const ch=book.find(x=>x.id==='cheats_20261005');
ok(JSON.stringify(cheats)===JSON.stringify([ch]),'Cheat tab and guide cheat chapter differ');
const skill=ch.sections.filter(x=>x.title.includes('巴哈 2006：技能數值對照'));
const template=ch.sections.filter(x=>x.title.includes('巴哈 2006：背號指定技能替換'));
ok(skill.length===1&&template.length===1,'Duplicate/missing skill sections');
ok(skill[0].rows.length===107,'Wrong number of skill mappings');
ok(template[0].rows.length===7,'Wrong number of template rows');
const codes=new Set();
for(const [code,jp,zh] of skill[0].rows){
  ok(/^E[0-9A-F]{3}$/.test(code),'Invalid skill code '+code);
  ok(jp.trim()&&zh.trim(),'Missing Japanese/Traditional Chinese '+code);
  ok(!codes.has(code),'Duplicate skill code '+code);
  codes.add(code);
}
const u='https://forum.gamer.com.tw/G2.php?bsn=6035&lorder=2&parent=11&sn=21';
ok(sources.filter(x=>x.url===u).length===1,'Source URL missing or repeated');
ok(status.bahamut_external_20261011_r33?.new_skill_mapping_rows===107,'Incorrect status record');
const ver=(await fs.readFile(new URL('../VERSION',import.meta.url),'utf8')).trim();
ok(ver==='2026.10.11-r33','Incorrect version '+ver);
console.log('r33 guide/cheats: '+rows+' globally unique table rows, 107 mapped skills, 7 setup rows, 31 chapters');
