import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
const ROOT=path.resolve(new URL('..',import.meta.url).pathname);
const OUT=path.join(ROOT,'data');
const sources=[
['rookie-pitcher1','國內新人','投手',479],['rookie-pitcher2','國內新人','投手',425],['rookie-catcher','國內新人','捕手',198],['rookie-first','國內新人','一壘手',200],['rookie-second','國內新人','二壘手',205],['rookie-third','國內新人','三壘手',196],['rookie-shortstop','國內新人','游擊手',200],['rookie-outfielder','國內新人','外野手',498],['foreign-pitcher','外國人','投手',416],['foreign-catcher','外國人','捕手',142],['foreign-first','外國人','一壘手',137],['foreign-second','外國人','二壘手',143],['foreign-third','外國人','三壘手',147],['foreign-shortstop','外國人','游擊手',138],['foreign-outfielder','外國人','外野手',243]
];
const clean=s=>String(s??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
async function fetchText(url){for(let n=0;n<4;n++){try{const r=await fetch(url,{headers:{'user-agent':'yakyutsuku3-static-index/1.0'}});if(!r.ok)throw new Error(`${r.status}`);return await r.text()}catch(e){if(n===3)throw e;await new Promise(r=>setTimeout(r,900*(n+1)))}}}
function parse(html,meta){const $=cheerio.load(html);let best=null;for(const table of $('table').toArray()){const rows=$(table).find('tr').toArray();if(!rows.length)continue;const headers=$(rows[0]).find('th,td').map((_,e)=>clean($(e).text())).get();if(headers.includes('名前')&&(!best||headers.length>best.headers.length))best={rows,headers};}if(!best)throw new Error(`${meta.slug}: 選手表格不存在`);const out=[];for(const tr of best.rows.slice(1)){const cells=$(tr).find('th,td').map((_,e)=>clean($(e).text())).get();if(!cells.length)continue;const row={};best.headers.forEach((h,i)=>row[h]=cells[i]??'');if(!row['名前'])continue;row._group=meta.group;row._position=meta.position;row._slug=meta.slug;row._source=`https://gamezukushi.com/yakyutsuku3/${meta.slug}`;out.push(row)}return out}
await fs.mkdir(OUT,{recursive:true});let all=[];let report=[];
for(const [slug,group,position,expected] of sources){const meta={slug,group,position,expected};const api=`https://gamezukushi.com/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=content,link,title`;const raw=JSON.parse(await fetchText(api));if(!Array.isArray(raw)||!raw[0]?.content?.rendered)throw new Error(`${slug}: WordPress API 無內容`);const rows=parse(raw[0].content.rendered,meta);if(rows.length!==expected)throw new Error(`${slug}: ${rows.length}/${expected}，停止部署避免不完整名冊`);all.push(...rows);report.push({slug,count:rows.length,expected,url:meta._source});console.log(`${slug}: ${rows.length}/${expected}`)}
if(all.length!==3767)throw new Error(`名冊總數 ${all.length}/3767，停止部署`);
await fs.writeFile(path.join(OUT,'players.json'),JSON.stringify(all),'utf8');
await fs.writeFile(path.join(OUT,'players-meta.json'),JSON.stringify({count:all.length,updatedAt:new Date().toISOString(),sources:report},null,2),'utf8');
console.log(`players.json: ${all.length}`);