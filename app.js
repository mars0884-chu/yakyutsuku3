const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const APP_VERSION='2026.10.06-r6';
const state={players:[],guides:[],book:[],cheats:[],sources:[],page:1,pageSize:80,batchFiles:[],batchRows:[],batchRawRows:[],guideTopic:'all',expectedTotal:0,rosterSource:'',ocrReady:false,paddleReady:false,batchSort:'screen',batchSortDir:'asc'};
const HEADER_ZH={"名前":"姓名","年齢":"年齡","成長":"成長型","投/打":"投／打","出身":"出身地","高校":"高中","大学":"大學","社会人":"社會人","タイプ":"投手類型","ランク":"Rank","体力":"體力","球速":"球速","球威":"球威","制球":"控球","精神":"精神","守備":"守備","捕球":"接球","肩力":"臂力","送球":"傳球","スライダー":"滑球","速スラ":"高速滑球","カットB":"卡特球","カーブ":"曲球","Sカーブ":"S曲球","ドロップ":"Drop曲球","シュート":"噴射球","速シュート":"高速噴射球","シンカー":"伸卡球","スクリュー":"螺旋球","速シンカー":"高速伸卡球","サークルC":"圈指變速","2シーム":"二縫線","Cアップ":"變速球","フォーク":"指叉球","SFF":"快速指叉","縦スラ":"縱滑球","パーム":"掌心球","ナックル":"蝴蝶球","スキル1":"技能1","スキル2":"技能2","スキル3":"技能3","モデル":"原型","右巧":"對右巧打","左巧":"對左巧打","長打":"長打","バント":"短打","選球眼":"選球眼","走力":"跑力","走塁":"跑壘","リード":"配球","捕手":"捕手","一塁":"一壘","二塁":"二壘","三塁":"三壘","遊撃":"游擊","外野":"外野","リーグ":"聯盟／地區","アカデミー":"學院"};
const BASE_COLS=['名前','ランク','年齢','成長','投/打','出身','高校','大学','社会人','タイプ','体力','球速','球威','制球','精神','守備','捕球','肩力','送球','右巧','左巧','長打','バント','選球眼','走力','走塁','リード','捕手','一塁','二塁','三塁','遊撃','外野','スライダー','速スラ','カットB','カーブ','Sカーブ','ドロップ','シュート','速シュート','シンカー','スクリュー','速シンカー','サークルC','2シーム','Cアップ','フォーク','SFF','縦スラ','パーム','ナックル','スキル1','スキル2','スキル3','モデル'];
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function norm(v){return String(v??'').normalize('NFKC').toLowerCase().replace(/[\s　・·･,，。\.\/／()（）\-–—_:：;；'"「」『』【】\[\]]/g,'')}
function normName(v){const t=norm(v);return [...t].map(ch=>{const c=ch.charCodeAt(0);return c>=0x30A1&&c<=0x30F6?String.fromCharCode(c-0x60):ch}).join('')}
function debounce(fn,ms=150){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}
async function getJSON(url,opts={}){const r=await fetch(url,{cache:opts.cache||'no-store'});if(!r.ok)throw new Error(`${url} ${r.status}`);return r.json()}
const ROSTER_DB='yakyutsuku3-roster-v1',ROSTER_STORE='kv',ROSTER_KEY='players-3767';
function rosterDB(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window))return reject(new Error('IndexedDB unavailable'));const q=indexedDB.open(ROSTER_DB,1);q.onupgradeneeded=()=>q.result.createObjectStore(ROSTER_STORE);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error||new Error('IndexedDB open failed'))})}
async function rosterCacheGet(){try{const db=await rosterDB();return await new Promise((resolve,reject)=>{const tx=db.transaction(ROSTER_STORE,'readonly'),q=tx.objectStore(ROSTER_STORE).get(ROSTER_KEY);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error)}).finally(()=>db.close())}catch(e){return null}}
async function rosterCachePut(players){if(!Array.isArray(players)||players.length<1000)return;try{const db=await rosterDB();await new Promise((resolve,reject)=>{const tx=db.transaction(ROSTER_STORE,'readwrite');tx.objectStore(ROSTER_STORE).put({players,updatedAt:Date.now()},ROSTER_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}catch(e){console.warn('roster cache',e)}}
function validRoster(x){return Array.isArray(x)&&x.length>=3500&&x.length<=4500&&x.every((p,i)=>i>20||p&&p['名前'])}
async function loadRoster(force=false){
  let netErr=null;
  try{const p=await getJSON(`./data/players.json${force?`?v=${Date.now()}`:''}`);if(!validRoster(p))throw new Error(`名冊筆數異常 ${Array.isArray(p)?p.length:'?'}`);await rosterCachePut(p);return{players:p,source:'網站名冊'}}catch(e){netErr=e}
  const cached=await rosterCacheGet();if(cached&&validRoster(cached.players))return{players:cached.players,source:'手機/瀏覽器快取'};
  const seed=await getJSON('./data/players-seed.json');return{players:seed,source:`Seed（完整名冊尚未取得：${netErr?.message||'offline'}）`};
}
function indexPlayers(players){return players.map((p,i)=>({...p,_uid:p._uid||`${p._slug||'p'}-${i}`,_search:norm(Object.entries(p).filter(([k])=>!k.startsWith('_')).map(([k,v])=>`${k} ${HEADER_ZH[k]||''} ${v}`).join(' ')+' '+(p._group||'')+' '+(p._position||''))}))}
async function loadData(forceRoster=false){
  const roster=await loadRoster(forceRoster);state.players=indexPlayers(roster.players);state.rosterSource=roster.source;
  [state.guides,state.book,state.cheats,state.sources]=await Promise.all([
    getJSON('./data/guides.json'),getJSON('./data/guide-book.json'),getJSON('./data/cheats.json'),getJSON('./data/sources.json')
  ]);
  const guideCount=state.book.reduce((n,ch)=>n+(Number(ch.count)||0),0);$('#dataStatus').textContent=`名冊 ${state.players.length.toLocaleString()} 人｜${state.rosterSource}｜攻略 ${state.book.length} 章／${guideCount.toLocaleString()} 項`;
  renderPlayers();renderGuideTopics();renderGuides();renderCheats();renderSources();
}
function switchView(id){$$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${id}`));$$('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.view===id));if(id==='players')renderPlayers();if(id==='guides')renderGuides();if(id==='cheats')renderCheats()}
$$('.navbtn').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
function filteredPlayers(){const q=norm($('#playerQuery').value),g=$('#filterGroup').value,p=$('#filterPos').value,r=$('#filterRank').value;return state.players.filter(x=>(!q||x._search.includes(q))&&(!g||x._group===g)&&(!p||x._position===p)&&(!r||x['ランク']===r))}
function renderPlayers(){const list=filteredPlayers();const pages=Math.max(1,Math.ceil(list.length/state.pageSize));state.page=Math.min(state.page,pages);const start=(state.page-1)*state.pageSize,rows=list.slice(start,start+state.pageSize);$('#playerCount').textContent=`${list.length.toLocaleString()} 人`;$('#pageInfo').textContent=`${state.page} / ${pages}`;$('#prevPage').disabled=state.page<=1;$('#nextPage').disabled=state.page>=pages;const cols=BASE_COLS.filter(k=>rows.some(x=>x[k]!==undefined&&x[k]!==''));let h='<thead><tr>'+cols.map(k=>`<th>${esc(HEADER_ZH[k]||k)}</th>`).join('')+'<th>守位</th><th>分類</th></tr></thead><tbody>';for(const x of rows){h+='<tr>'+cols.map(k=>k==='名前'?`<td class="name" data-uid="${esc(x._uid)}">${esc(x[k])}</td>`:`<td class="${k==='ランク'?'rank':''}">${esc(x[k]||'—')}</td>`).join('')+`<td>${esc(x._position||'')}</td><td>${esc(x._group||'')}</td></tr>`}h+='</tbody>';$('#playerTable').innerHTML=h;$('#playerTable').querySelectorAll('[data-uid]').forEach(td=>td.onclick=()=>openPlayer(td.dataset.uid))}
$('#playerQuery').addEventListener('input',debounce(()=>{state.page=1;renderPlayers()}));['filterGroup','filterPos','filterRank'].forEach(id=>$('#'+id).onchange=()=>{state.page=1;renderPlayers()});$('#clearPlayer').onclick=()=>{$('#playerQuery').value='';$('#filterGroup').value='';$('#filterPos').value='';$('#filterRank').value='';state.page=1;renderPlayers()};$('#prevPage').onclick=()=>{state.page--;renderPlayers()};$('#nextPage').onclick=()=>{state.page++;renderPlayers()};
function openPlayer(uid){const p=state.players.find(x=>x._uid===uid);if(!p)return;const keys=Object.keys(p).filter(k=>!k.startsWith('_')&&k!=='Source URL'&&p[k]!==''&&p[k]!=null);$('#drawerBody').innerHTML=`<h2 class="detail-title">${esc(p['名前']||'選手資料')}</h2><div class="detail-grid">${keys.map(k=>`<div class="detail-item"><small>${esc(HEADER_ZH[k]||k)}${HEADER_ZH[k]&&HEADER_ZH[k]!==k?`｜${esc(k)}`:''}</small><b>${esc(p[k])}</b></div>`).join('')}</div>${p._source?`<p class="meta">來源：<a href="${esc(p._source)}" target="_blank" rel="noreferrer">${esc(p._source)}</a></p>`:''}`;$('#drawer').classList.add('open');$('#drawer').setAttribute('aria-hidden','false')}
$('#closeDrawer').onclick=$('.shade').onclick=()=>{$('#drawer').classList.remove('open');$('#drawer').setAttribute('aria-hidden','true')};


const GUIDE_CATEGORIES=[
  {id:'all',title:'全部攻略',chapters:[]},
  {id:'start',title:'開局／經營',chapters:['start','economy','facilities','home','idea','recommended','leagueops']},
  {id:'people',title:'找人／契約',chapters:['acquire','cheap','aging','random','academy','models_20261005']},
  {id:'train',title:'養成／能力',chapters:['camp','study','skills','pitch','experiments_20261005','conditioning','created']},
  {id:'play',title:'實戰／模式',chapters:['team','advanced','tips','one','bugs']},
  {id:'deep',title:'深入／考古',chapters:['new_20261005','lastdig_20261005','history_20261005','sources','research']}
];
function guideSectionHTML(sec){
  const title=esc(sec.title||''),note=sec.note?`<div class="guide-note">${esc(sec.note)}</div>`:'',source=sec.source?`<div class="meta"><a href="${esc(sec.source)}" target="_blank" rel="noreferrer">來源</a></div>`:'';
  let body='';
  if(sec.type==='table'){body=`<div class="guide-table-wrap"><table class="guide-table"><thead><tr>${(sec.headers||[]).map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${(sec.rows||[]).map(row=>`<tr>${(row||[]).map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
  else if(sec.type==='facts'){body=`<div class="guide-facts">${(sec.rows||[]).map(r=>`<div class="guide-fact"><b>${esc(r?.[0]||'')}</b><span>${esc(r?.[1]||'')}</span></div>`).join('')}</div>`}
  else if(sec.type==='steps'){body=`<ol class="guide-list">${(sec.items||[]).map(v=>`<li>${esc(v)}</li>`).join('')}</ol>`}
  else{body=`<ul class="guide-list">${(sec.items||[]).map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`}
  return `<section class="guide-section"><h3>${title}</h3>${note}${body}${source}</section>`
}
function guideChapterCard(ch){return `<button class="guide-index-card" data-guide-id="${esc(ch.id)}"><b>${esc(ch.title)}</b><span>${esc(ch.summary||'')}</span><small>${esc(ch.count||ch.sections?.length||0)} 項</small></button>`}
function guideChapterDetail(ch){return `<article class="guide-chapter"><div class="guide-chapter-head"><h2>${esc(ch.title)}</h2><p>${esc(ch.summary||'')}</p></div>${(ch.sections||[]).map(guideSectionHTML).join('')}</article>`}
function visibleGuideBook(){return state.book.filter(ch=>ch.id!=='cheats_20261005')}
function renderGuideTopics(){
  $('#guideTopics').innerHTML=GUIDE_CATEGORIES.map(c=>`<button class="chip ${state.guideTopic===c.id?'active':''}" data-topic="${c.id}">${c.title}</button>`).join('');
  $('#guideTopics').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{state.guideTopic=btn.dataset.topic;renderGuideTopics();renderGuides()})
}
function renderGuides(){
  const q=norm($('#guideQuery').value),root=$('#guideResults'),book=visibleGuideBook();
  if(q){const hits=[];for(const ch of book){const sections=(ch.sections||[]).filter(sec=>norm(JSON.stringify(sec)).includes(q));if(norm(`${ch.title} ${ch.summary||''}`).includes(q)||sections.length)hits.push({...ch,sections:sections.length?sections:(ch.sections||[])})}root.innerHTML=hits.map(guideChapterDetail).join('')||'<div class="card">沒有符合的攻略。</div>';return}
  if(state.guideTopic.startsWith('chapter:')){const id=state.guideTopic.slice(8),ch=book.find(x=>x.id===id);if(ch){root.innerHTML=guideChapterDetail(ch);return}state.guideTopic='all'}
  const cat=GUIDE_CATEGORIES.find(c=>c.id===state.guideTopic)||GUIDE_CATEGORIES[0],list=cat.id==='all'?book:cat.chapters.map(id=>book.find(x=>x.id===id)).filter(Boolean);
  root.innerHTML=list.map(guideChapterCard).join('')||'<div class="card">這個分類目前沒有內容。</div>';
  root.querySelectorAll('[data-guide-id]').forEach(btn=>btn.onclick=()=>{state.guideTopic='chapter:'+btn.dataset.guideId;renderGuideTopics();renderGuides();window.scrollTo({top:0,behavior:'smooth'})})
}
$('#guideQuery').addEventListener('input',debounce(renderGuides));
$('#clearGuide').onclick=()=>{$('#guideQuery').value='';state.guideTopic='all';renderGuideTopics();renderGuides()};

function flattenCheats(){const out=[];for(const ch of state.cheats){for(const sec of ch.sections||[]){if(sec.type==='table'){for(const row of sec.rows||[])out.push({chapter:ch.title,title:sec.title,text:(row||[]).join('｜'),row,headers:sec.headers,source:sec.source})}else if(sec.type==='facts'){for(const row of sec.rows||[])out.push({chapter:ch.title,title:sec.title,text:(row||[]).join('｜'),row,headers:['項目','內容'],source:sec.source})}else for(const item of sec.items||[])out.push({chapter:ch.title,title:sec.title,text:item,source:sec.source})}}return out}
function renderCheats(){const q=norm($('#cheatQuery').value);const rows=flattenCheats().filter(x=>!q||norm(`${x.chapter} ${x.title} ${x.text}`).includes(q)).slice(0,260);$('#cheatResults').innerHTML=rows.map(x=>`<article class="card"><h3>${esc(x.title)}</h3>${x.row?`<table><tr>${x.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr><tr>${x.row.map(v=>`<td>${String(v).includes('\n')||/[0-9A-F]{8}/.test(String(v))?`<pre>${esc(v)}</pre>`:esc(v)}</td>`).join('')}</tr></table>`:`<p>${esc(x.text)}</p>`}${x.source?`<div class="meta"><a href="${esc(x.source)}" target="_blank" rel="noreferrer">來源</a></div>`:''}</article>`).join('')||'<div class="card">沒有符合的金手指資料。</div>'}
$('#cheatQuery').addEventListener('input',debounce(renderCheats));$('#clearCheat').onclick=()=>{$('#cheatQuery').value='';renderCheats()};
function renderSources(){$('#sourceList').innerHTML=state.sources.map(s=>`<article class="card"><h3><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.name)}</a></h3><div class="source-role">${esc(s.role)}</div><div class="source-note">${esc(s.note)}</div><div class="meta">狀態：${esc(s.status)}｜優先級 ${esc(s.priority)}</div></article>`).join('')}
$('#refreshData').onclick=async()=>{const b=$('#refreshData');b.disabled=true;$('#dataStatus').textContent='更新完整名冊…';try{await loadData(true)}catch(e){$('#dataStatus').textContent='名冊更新失敗：'+e.message}finally{b.disabled=false}};

// --- 批次截圖找人：固定版面分列 → 本機同源 OCR → 3,767 人封閉候選 → 依選手 ID 去重。---
$('#batchFiles').onchange=e=>{state.batchFiles=[...e.target.files];state.batchRows=[];state.batchRawRows=[];state.expectedTotal=0;renderBatchPreview();renderBatchResults();$('#batchStatus').textContent=`已選 ${state.batchFiles.length} 張。`};
$('#clearBatch').onclick=()=>{state.batchFiles=[];state.batchRows=[];state.batchRawRows=[];state.expectedTotal=0;$('#batchFiles').value='';renderBatchPreview();renderBatchResults();$('#batchStatus').textContent='可一次選多張 OFFICE MENU 名單截圖。'};
function renderBatchPreview(){$('#batchPreview').innerHTML='';for(const f of state.batchFiles){const u=URL.createObjectURL(f),d=document.createElement('div');d.className='thumb';d.innerHTML=`<img src="${u}"><small>${esc(f.name)}</small>`;d.querySelector('img').onload=()=>setTimeout(()=>URL.revokeObjectURL(u),1000);$('#batchPreview').appendChild(d)}}
function loadImage(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('圖片解碼失敗'))};im.src=u})}
function withTimeout(promise,ms,label='處理逾時'){let t;return Promise.race([promise,new Promise((_,rej)=>t=setTimeout(()=>rej(new Error(label)),ms))]).finally(()=>clearTimeout(t))}

function rowCrops(img,fileName){const ratio=img.naturalWidth/img.naturalHeight;if(ratio<1.65)return[];const x0=.153,x1=.684,y0=.181,y1=.903,rows=11,rh=(y1-y0)/rows,out=[];for(let i=0;i<rows;i++){const y=y0+i*rh,c=document.createElement('canvas'),w=Math.round(img.naturalWidth*(x1-x0)),h=Math.round(img.naturalHeight*rh);c.width=w;c.height=h;c.getContext('2d',{willReadFrequently:true}).drawImage(img,Math.round(img.naturalWidth*x0),Math.round(img.naturalHeight*y),w,h,0,0,w,h);out.push({canvas:c,file:fileName,row:i+1})}return out}
function footerCrop(img,fileName){const c=document.createElement('canvas'),sx=Math.round(img.naturalWidth*.14),sy=Math.round(img.naturalHeight*.895),sw=Math.round(img.naturalWidth*.76),sh=Math.max(1,img.naturalHeight-sy);c.width=sw;c.height=sh;c.getContext('2d',{willReadFrequently:true}).drawImage(img,sx,sy,sw,sh,0,0,sw,sh);return{canvas:c,file:fileName}}
function grayPixels(src){const g=src.getContext('2d',{willReadFrequently:true}),d=g.getImageData(0,0,src.width,src.height),a=new Uint8Array(src.width*src.height);for(let i=0,j=0;i<d.data.length;i+=4,j++)a[j]=Math.round(d.data[i]*.299+d.data[i+1]*.587+d.data[i+2]*.114);return a}
function binaryCanvas(src,threshold=125,{cropName=false,scale=3}={}){let sx=0,sw=src.width;if(cropName){sx=Math.round(src.width*.115);sw=Math.round(src.width*.49)}const tmp=document.createElement('canvas');tmp.width=sw;tmp.height=src.height;tmp.getContext('2d',{willReadFrequently:true}).drawImage(src,sx,0,sw,src.height,0,0,sw,src.height);const g=tmp.getContext('2d',{willReadFrequently:true}),id=g.getImageData(0,0,sw,tmp.height),gray=new Uint8Array(sw*tmp.height);for(let i=0,j=0;i<id.data.length;i+=4,j++)gray[j]=Math.round(id.data[i]*.299+id.data[i+1]*.587+id.data[i+2]*.114);
  // 遊戲姓名欄中間有固定白色方塊。它不是文字；若不移除會被 OCR 當成一個假漢字。
  if(!cropName){const occ=new Float32Array(sw);for(let x=0;x<sw;x++){let n=0;for(let y=0;y<tmp.height;y++)if(gray[y*sw+x]>185)n++;occ[x]=n/tmp.height}let best=null,st=-1;for(let x=0;x<=sw;x++){const ok=x<sw&&x>sw*.18&&x<sw*.45&&occ[x]>.65;if(ok&&st<0)st=x;if((!ok||x===sw)&&st>=0){const en=x,w=en-st;if(w>=8&&(!best||w>best[2]))best=[st,en,w];st=-1}}if(best){const [a,b]=best;let sum=0,n=0;for(let y=0;y<tmp.height;y++)for(let x=Math.max(0,a-9);x<a;x++){sum+=gray[y*sw+x];n++}const bg=n?Math.round(sum/n):75;for(let y=0;y<tmp.height;y++)for(let x=Math.max(0,a-3);x<Math.min(sw,b+3);x++)gray[y*sw+x]=bg}}
  const out=document.createElement('canvas');out.width=sw*scale;out.height=tmp.height*scale;const small=document.createElement('canvas');small.width=sw;small.height=tmp.height;const sg=small.getContext('2d'),od=sg.createImageData(sw,tmp.height);for(let j=0;j<gray.length;j++){const v=gray[j]>threshold?0:255,i=j*4;od.data[i]=od.data[i+1]=od.data[i+2]=v;od.data[i+3]=255}sg.putImageData(od,0,0);const og=out.getContext('2d');og.imageSmoothingEnabled=true;og.drawImage(small,0,0,out.width,out.height);return out}
function binaryRegion(src,rx0,rx1,threshold=128,scale=5){const sx=Math.max(0,Math.round(src.width*rx0)),ex=Math.min(src.width,Math.round(src.width*rx1)),sw=Math.max(1,ex-sx),tmp=document.createElement('canvas');tmp.width=sw;tmp.height=src.height;tmp.getContext('2d',{willReadFrequently:true}).drawImage(src,sx,0,sw,src.height,0,0,sw,src.height);const g=tmp.getContext('2d',{willReadFrequently:true}),id=g.getImageData(0,0,sw,tmp.height),gray=new Uint8Array(sw*tmp.height);let sum=0;for(let i=0,j=0;i<id.data.length;i+=4,j++){gray[j]=Math.round(id.data[i]*.299+id.data[i+1]*.587+id.data[i+2]*.114);sum+=gray[j]}const avg=sum/Math.max(1,gray.length),th=Math.max(95,Math.min(165,threshold+(avg-120)*.18)),small=document.createElement('canvas');small.width=sw;small.height=tmp.height;const sg=small.getContext('2d'),od=sg.createImageData(sw,tmp.height);for(let j=0;j<gray.length;j++){const v=gray[j]>th?0:255,i=j*4;od.data[i]=od.data[i+1]=od.data[i+2]=v;od.data[i+3]=255}sg.putImageData(od,0,0);const out=document.createElement('canvas');out.width=sw*scale;out.height=tmp.height*scale;const og=out.getContext('2d');og.imageSmoothingEnabled=false;og.drawImage(small,0,0,out.width,out.height);return out}
function ocrNamePart(s){return cleanOCR(s).replace(/[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々ヶヵーA-Za-z]/gu,'').trim()}
function splitPlayerName(v){const a=String(v||'').trim().split(/\s+/).filter(Boolean);return{surname:a[0]||'',given:a.slice(1).join('')}}
function detectNameSeparator(canvas){const g=canvas.getContext('2d',{willReadFrequently:true}),id=g.getImageData(0,0,canvas.width,canvas.height).data,x0=Math.floor(canvas.width*.18),x1=Math.floor(canvas.width*.44),y0=Math.floor(canvas.height*.16),y1=Math.floor(canvas.height*.84),occ=[];for(let x=x0;x<x1;x++){let n=0;for(let y=y0;y<y1;y++){const i=(y*canvas.width+x)*4,l=id[i]*.299+id[i+1]*.587+id[i+2]*.114;if(l>178)n++}occ.push(n/Math.max(1,y1-y0))}let best=null,st=-1;for(let i=0;i<=occ.length;i++){const ok=i<occ.length&&occ[i]>.46;if(ok&&st<0)st=i;if((!ok||i===occ.length)&&st>=0){const en=i,w=en-st;if(w>=4&&(!best||w>best.w))best={a:x0+st,b:x0+en,w};st=-1}}return best?{left:best.a/canvas.width,right:best.b/canvas.width}:{left:.285,right:.325}}
function batchUserWords(){if(state._batchUserWords)return state._batchUserWords;const out=new Set();for(const p of state.players){const n=String(p['名前']||'');const q=splitPlayerName(n);if(q.surname)out.add(q.surname);if(q.given)out.add(q.given);if(q.surname&&q.given)out.add(q.surname+q.given)}state._batchUserWords=[...out].join('\n');return state._batchUserWords}
function batchKanjiWhitelist(){if(state._batchKanjiWhitelist)return state._batchKanjiWhitelist;const chars=new Set();for(const p of state.players)for(const ch of String(p['名前']||''))if(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々ヶヵー・]/u.test(ch))chars.add(ch);state._batchKanjiWhitelist=[...chars].join('');return state._batchKanjiWhitelist}
async function recognizeFixedParts(worker,canvas,threshold=125){const sep=detectNameSeparator(canvas),wl=batchKanjiWhitelist();try{await worker.setParameters({tessedit_pageseg_mode:'8',tessedit_char_whitelist:wl,user_words_file:'yt3-user-words.txt'})}catch(e){}const a=await recognizeText(worker,binaryRegion(canvas,.115,Math.max(.18,sep.left-.008),threshold,6)),b=await recognizeText(worker,binaryRegion(canvas,Math.min(.50,sep.right+.008),.575,threshold,6));try{await worker.setParameters({tessedit_pageseg_mode:'10',tessedit_char_whitelist:'投捕一二三遊外'})}catch(e){}const ps=await recognizeText(worker,binaryRegion(canvas,.012,.105,threshold,5));try{await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789歳才'})}catch(e){}const ag=await recognizeText(worker,binaryRegion(canvas,.60,.75,threshold,4));try{await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'右左両/／'})}catch(e){}const hd=await recognizeText(worker,binaryRegion(canvas,.78,.985,threshold,4));try{await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:''})}catch(e){}const age=(cleanOCR(ag.text).match(/(18|19|20|21|22|23|24)/)||[])[1]||'',ht=cleanOCR(hd.text).replace(/石/g,'右').replace(/布/g,'右').replace(/[|｜]/g,'/'),hm=ht.match(/([右左])\s*[\/／]\s*([右左両])/),pos=(cleanOCR(ps.text).match(/[投捕一二三遊外]/)||[])[0]||'';return{surname:ocrNamePart(a.text),given:ocrNamePart(b.text),age,hand:hm?`${hm[1]}/${hm[2]}`:'',pos,confidence:Math.round((a.confidence+b.confidence+ps.confidence+ag.confidence+hd.confidence)/5),raw:`${ps.text}｜${a.text}｜□｜${b.text}｜${ag.text}｜${hd.text}`,separator:sep}}
function dhash(canvas){const c=document.createElement('canvas');c.width=17;c.height=8;const g=c.getContext('2d',{willReadFrequently:true});g.filter='grayscale(1) contrast(1.7)';g.drawImage(canvas,0,0,17,8);const d=g.getImageData(0,0,17,8).data,bits=[];for(let y=0;y<8;y++)for(let x=0;x<16;x++){const a=d[(y*17+x)*4],b=d[(y*17+x+1)*4];bits.push(a>b?1:0)}return bits}
function ham(a,b){let n=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])n++;return n}
async function ensureLocalOCR(){if(window.Tesseract){state.ocrReady=true;return true}return new Promise(resolve=>{const old=document.querySelector('script[data-yt3-ocr]');if(old)old.remove();const s=document.createElement('script');s.dataset.yt3Ocr='1';s.src='./vendor/tesseract/tesseract.min.js';s.onload=()=>{state.ocrReady=!!window.Tesseract;resolve(state.ocrReady)};s.onerror=()=>resolve(false);document.head.appendChild(s)})}
async function ensurePaddleOCR(){
  if(window.YT3PaddleOCR?.PaddleOCR){state.paddleReady=true;return true}
  return new Promise(resolve=>{
    const old=document.querySelector('script[data-yt3-paddle]');if(old)old.remove();
    const sc=document.createElement('script');sc.dataset.yt3Paddle='1';sc.src='./vendor/paddleocr/paddleocr.bundle.js';
    sc.onload=()=>{state.paddleReady=!!window.YT3PaddleOCR?.PaddleOCR;resolve(state.paddleReady)};
    sc.onerror=()=>resolve(false);document.head.appendChild(sc);
  })
}
async function createPaddleOCR(){
  const ok=await ensurePaddleOCR();if(!ok)throw new Error('PaddleOCR 本機引擎檔案無法載入');
  setBatchProgress(4,'載入本機 PaddleOCR 模型…');
  return withTimeout(window.YT3PaddleOCR.PaddleOCR.create({
    textDetectionModelName:'PP-OCRv5_mobile_det',
    textDetectionModelAsset:{url:'./vendor/paddleocr/models/PP-OCRv5_mobile_det_onnx_infer.tar'},
    textRecognitionModelName:'PP-OCRv5_mobile_rec',
    textRecognitionModelAsset:{url:'./vendor/paddleocr/models/PP-OCRv5_mobile_rec_onnx_infer.tar'},
    textDetectionBatchSize:2,textRecognitionBatchSize:8,
    ortOptions:{backend:'wasm',wasmPaths:'./vendor/paddleocr/ort/',numThreads:1,simd:true}
  }),90000,'PaddleOCR 本機模型載入逾時')
}
function setBatchProgress(percent,text){
  const p=Math.max(0,Math.min(100,Math.round(percent||0)));
  $('#batchStatus').textContent=`${text||''}${p? `｜${p}%`:''}`;
}
function nameInkRatio(src){
  const g=src.getContext('2d',{willReadFrequently:true}),x0=Math.floor(src.width*.10),x1=Math.floor(src.width*.59),id=g.getImageData(x0,0,Math.max(1,x1-x0),src.height).data;
  let hi=0,lo=0;for(let i=0;i<id.length;i+=4){const l=id[i]*.299+id[i+1]*.587+id[i+2]*.114;if(l>145)hi++;if(l<95)lo++}
  return Math.min(hi,lo)/Math.max(1,id.length/4)
}
function paddleNameCanvas(src,threshold=122){
  const sep=detectNameSeparator(src),x0=Math.max(0,Math.floor(src.width*.105)),x1=Math.min(src.width,Math.ceil(src.width*.59)),sw=Math.max(1,x1-x0),scale=4;
  const tmp=document.createElement('canvas');tmp.width=sw;tmp.height=src.height;const tg=tmp.getContext('2d',{willReadFrequently:true});tg.drawImage(src,x0,0,sw,src.height,0,0,sw,src.height);
  const id=tg.getImageData(0,0,sw,tmp.height),od=tg.createImageData(sw,tmp.height);
  const sepA=Math.max(0,Math.floor(src.width*sep.left)-x0-2),sepB=Math.min(sw,Math.ceil(src.width*sep.right)-x0+2);
  for(let y=0;y<tmp.height;y++)for(let x=0;x<sw;x++){const i=(y*sw+x)*4,l=id.data[i]*.299+id.data[i+1]*.587+id.data[i+2]*.114;let v=l>threshold?0:255;if(x>=sepA&&x<=sepB)v=255;od.data[i]=od.data[i+1]=od.data[i+2]=v;od.data[i+3]=255}
  tg.putImageData(od,0,0);const out=document.createElement('canvas');out.width=sw*scale;out.height=tmp.height*scale;const og=out.getContext('2d');og.imageSmoothingEnabled=false;og.fillStyle='#fff';og.fillRect(0,0,out.width,out.height);og.drawImage(tmp,0,0,out.width,out.height);return out
}
function paddleResultText(result){
  const items=[...(result?.items||[])].sort((a,b)=>Math.min(...(a.poly||[]).map(p=>p?.[0]??0))-Math.min(...(b.poly||[]).map(p=>p?.[0]??0)));
  const text=items.map(x=>String(x.text||'').trim()).filter(Boolean).join(' ').trim();
  const score=items.length?items.reduce((n,x)=>n+Number(x.score||0),0)/items.length:0;
  return{text,score}
}
function parsedFromNameVariants(variants){
  const cleaned=[...new Set(variants.map(v=>cleanOCR(v.text)).filter(Boolean))],names=[],surnames=[],givens=[];
  for(const t of cleaned){const n=ocrNameOnly(t);if(n)names.push(n);const parts=String(t).trim().split(/\s+/).filter(Boolean);if(parts.length>=2){surnames.push(ocrNamePart(parts[0]));givens.push(ocrNamePart(parts.slice(1).join('')))}}
  return{name:names[0]||'',names:[...new Set(names)],surname:surnames[0]||'',given:givens[0]||'',surnames:[...new Set(surnames)],givens:[...new Set(givens)],age:'',hand:'',pos:'',text:cleaned.join('｜')}
}
async function recognizeNamePaddle(ocr,rowCanvas){
  const canvases=[paddleNameCanvas(rowCanvas,112),paddleNameCanvas(rowCanvas,128),paddleNameCanvas(rowCanvas,145)];
  const results=await ocr.predict(canvases,{textRecScoreThresh:.18,textDetThresh:.18,textDetBoxThresh:.20,textDetUnclipRatio:1.35});
  const vars=(results||[]).map(paddleResultText).filter(x=>x.text);
  const parsed=parsedFromNameVariants(vars),cm=candidateMatch(parsed),vis=visualCandidateMatch(rowCanvas,parsed);
  let chosen=cm;if(vis?.match&&(!cm?.match||vis.match.score>(cm.match?.score||cm.candidates?.[0]?.score||0)+.035))chosen=vis;
  const conf=vars.length?Math.max(...vars.map(x=>x.score)):0;
  return{parsed,cm:chosen,raw:vars.map(x=>`${x.text}(${Math.round(x.score*100)}%)`).join('｜'),confidence:conf}
}
async function recognizeFooterPaddle(ocr,canvas){
  try{const [r]=await ocr.predict(canvas,{textRecScoreThresh:.20,textDetThresh:.18,textDetBoxThresh:.20});return paddleResultText(r).text}catch{return''}
}

function cleanOCR(s){return String(s||'').normalize('NFKC').replace(/[|｜]/g,' ').replace(/\s+/g,' ').trim()}
function lev(a,b){a=norm(a);b=norm(b);const m=a.length,n=b.length,d=Array.from({length:m+1},()=>Array(n+1).fill(0));for(let i=0;i<=m;i++)d[i][0]=i;for(let j=0;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]}
function ocrNameOnly(s){let t=cleanOCR(s).replace(/[0-9A-Za-z]/g,' ').replace(/[／/]/g,' ').replace(/[歳才]/g,' ').replace(/\s+/g,' ').trim();let toks=t.split(' ').filter(Boolean);while(toks.length>2&&['投','捕','一','二','三','遊','外','右','左','両'].includes(toks[0]))toks.shift();return toks.length>=2?toks.slice(-2).join(' '):(toks[0]||t)}
function parseRowText(text,altName=''){const t=cleanOCR(text),age=(t.match(/(18|19|20|21|22|23|24)\s*[歳才誠読講計寺武成]?/)||[])[1]||'',hm=t.match(/([右左])\s*[\/／]\s*([右左両])/),hand=hm?`${hm[1]}/${hm[2]}`:'';let pos='';const leadTokens=t.split(/\s+/).slice(0,4);for(const k of ['投','捕','一','二','三','遊','外'])if(leadTokens.includes(k)){pos=k;break}let before=t;if(age){const ix=t.indexOf(age);if(ix>0)before=t.slice(0,ix)}before=before.replace(/[0-9A-Za-z]/g,' ').replace(/[|｜\/／]/g,' ').replace(/\s+/g,' ').trim();let name=ocrNameOnly(altName||before);return{text:t,age,hand,pos,name,names:[...new Set([name,ocrNameOnly(before),ocrNameOnly(altName)].filter(Boolean))]}}
const POSMAP={投:'投手',捕:'捕手',一:'一壘手',二:'二壘手',三:'三壘手',遊:'游擊手',外:'外野手'};
function nameSimilarity(a,b){a=normName(a);b=normName(b);if(!a||!b)return 0;const d=lev(a,b),ed=1-d/Math.max(a.length,b.length,1);let common=0,bb=[...b];for(const ch of a){const i=bb.indexOf(ch);if(i>=0){common++;bb.splice(i,1)}}const bag=2*common/(a.length+b.length);return Math.max(0,ed*.72+bag*.28)}
function targetWordBitmap(src,rx0,rx1,threshold=108){const sx=Math.max(0,Math.floor(src.width*rx0)),ex=Math.min(src.width,Math.ceil(src.width*rx1)),sw=Math.max(1,ex-sx),g=src.getContext('2d',{willReadFrequently:true}),id=g.getImageData(sx,0,sw,src.height),pts=[];for(let y=0;y<src.height;y++)for(let x=0;x<sw;x++){const i=(y*sw+x)*4,l=id.data[i]*.299+id.data[i+1]*.587+id.data[i+2]*.114;if(l>threshold)pts.push([x,y])}if(!pts.length)return null;let minx=sw,miny=src.height,maxx=0,maxy=0;for(const [x,y] of pts){if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y}minx=Math.max(0,minx-1);miny=Math.max(0,miny-1);maxx=Math.min(sw-1,maxx+1);maxy=Math.min(src.height-1,maxy+1);const w=maxx-minx+1,h=maxy-miny+1,bits=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((miny+y)*sw+(minx+x))*4,l=id.data[i]*.299+id.data[i+1]*.587+id.data[i+2]*.114;bits[y*w+x]=l>threshold?1:0}return{bits,w,h,charCount:Math.max(1,Math.min(4,Math.round(w/Math.max(1,h*1.04))))}}
const VISUAL_FONT_STACK='"Hiragino Sans","Yu Gothic","Meiryo","Noto Sans JP","Noto Sans CJK JP",sans-serif';
const visualTemplateCache=new Map();
function renderedWordBitmap(word,w,h,weight=700){const key=`${word}|${w}x${h}|${weight}`;if(visualTemplateCache.has(key))return visualTemplateCache.get(key);const c=document.createElement('canvas');c.width=220;c.height=64;const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);g.fillStyle='#fff';g.textBaseline='top';g.font=`${weight} 34px ${VISUAL_FONT_STACK}`;g.fillText(word,2,-3);const id=g.getImageData(0,0,c.width,c.height),pts=[];for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(id.data[i]>72)pts.push([x,y])}if(!pts.length)return null;let minx=c.width,miny=c.height,maxx=0,maxy=0;for(const [x,y] of pts){if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y}const src=document.createElement('canvas');src.width=maxx-minx+1;src.height=maxy-miny+1;src.getContext('2d').drawImage(c,minx,miny,src.width,src.height,0,0,src.width,src.height);const out=document.createElement('canvas');out.width=w;out.height=h;const og=out.getContext('2d',{willReadFrequently:true});og.imageSmoothingEnabled=true;og.drawImage(src,0,0,w,h);const od=og.getImageData(0,0,w,h).data,bits=new Uint8Array(w*h);for(let i=0,j=0;i<od.length;i+=4,j++)bits[j]=od[i]>72?1:0;const v={bits,w,h};visualTemplateCache.set(key,v);if(visualTemplateCache.size>9000){const first=visualTemplateCache.keys().next().value;visualTemplateCache.delete(first)}return v}
function bitmapDice(a,b,dx=0,dy=0){let inter=0,na=0,nb=0;for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++){const av=a.bits[y*a.w+x];if(av)na++;const bx=x-dx,by=y-dy,bv=(bx>=0&&bx<b.w&&by>=0&&by<b.h)?b.bits[by*b.w+bx]:0;if(bv)nb++;if(av&&bv)inter++}return(2*inter)/(na+nb+1e-6)}
function visualWordSimilarity(target,word){if(!target||!word)return 0;let best=0;for(const weight of [600,700,800]){const tpl=renderedWordBitmap(word,target.w,target.h,weight);if(!tpl)continue;for(let dy=-1;dy<=1;dy++)for(let dx=-2;dx<=2;dx++){const sc=bitmapDice(target,tpl,dx,dy);if(sc>best)best=sc}}return best}
function visualCandidateMatch(canvas,parsed){const sep=detectNameSeparator(canvas),surnameTarget=targetWordBitmap(canvas,.115,Math.max(.18,sep.left-.008),108),givenTarget=targetWordBitmap(canvas,Math.min(.50,sep.right+.008),.575,108);if(!surnameTarget&&!givenTarget)return null;let pool=state.players;const gates=[];if(parsed.pos)gates.push(p=>p._position===POSMAP[parsed.pos]);if(parsed.hand)gates.push(p=>String(p['投/打']||'').replace('／','/')===parsed.hand);for(const gate of gates){const n=pool.filter(gate);if(n.length)pool=n}if(surnameTarget){const n=pool.filter(p=>Math.abs([...splitPlayerName(p['名前']).surname].length-surnameTarget.charCount)<=1);if(n.length)pool=n}if(givenTarget){const n=pool.filter(p=>Math.abs([...splitPlayerName(p['名前']).given].length-givenTarget.charCount)<=1);if(n.length)pool=n}const scored=pool.map(p=>{const q=splitPlayerName(p['名前']),ss=surnameTarget?visualWordSimilarity(surnameTarget,q.surname):0,gs=givenTarget?visualWordSimilarity(givenTarget,q.given):0,den=(surnameTarget?.45:0)+(givenTarget?.55:0)||1,visual=(ss*.45+gs*.55)/den;let meta=0,bonus=0;if(parsed.pos&&p._position===POSMAP[parsed.pos]){meta++;bonus+=.025}if(parsed.hand&&String(p['投/打']||'').replace('／','/')===parsed.hand){meta++;bonus+=.035}if(parsed.age&&String(p['年齢']||'')===parsed.age)bonus+=.006;return{p,score:Math.min(1,visual+bonus),visualScore:visual,surnameScore:ss,givenScore:gs,nameScore:visual,meta}}).sort((a,b)=>b.score-a.score),best=scored[0],second=scored[1];if(!best)return null;const margin=best.score-(second?.score||0),accept=(best.visualScore>=.78&&margin>=.03)||(best.visualScore>=.71&&best.meta>=1&&margin>=.025)||(best.visualScore>=.67&&best.meta>=2&&margin>=.02);return{match:accept?best:null,candidates:scored.slice(0,12),margin,method:'visual'}}
function mergeParsedNameEvidence(a,b){a=a||{};b=b||{};return{...a,
  name:a.name||b.name||'',
  names:[...new Set([...(a.names||[]),...(b.names||[]),a.name,b.name].filter(Boolean))],
  surname:a.surname||b.surname||'',
  given:a.given||b.given||'',
  surnames:[...new Set([...(a.surnames||[]),...(b.surnames||[]),a.surname,b.surname].filter(Boolean))],
  givens:[...new Set([...(a.givens||[]),...(b.givens||[]),a.given,b.given].filter(Boolean))],
  hand:a.hand||b.hand||'',pos:a.pos||b.pos||'',age:a.age||b.age||'',text:[a.text,b.text].filter(Boolean).join('｜')
}}
function candidateMatch(parsed){const names=parsed.names?.length?parsed.names:[parsed.name],surnames=[...new Set([parsed.surname,...(parsed.surnames||[])].filter(Boolean))],givens=[...new Set([parsed.given,...(parsed.givens||[])].filter(Boolean))];let pool=state.players;const gates=[];if(parsed.pos)gates.push(p=>p._position===POSMAP[parsed.pos]);if(parsed.hand)gates.push(p=>String(p['投/打']||'').replace('／','/')===parsed.hand);for(const gate of gates){const narrowed=pool.filter(gate);if(narrowed.length>=1)pool=narrowed}const scored=pool.map(p=>{const pn=p['名前']||'',parts=splitPlayerName(pn),full=Math.max(...names.map(n=>nameSimilarity(n,pn)),0),sur=surnames.length?Math.max(...surnames.map(n=>nameSimilarity(n,parts.surname)),0):0,giv=givens.length?Math.max(...givens.map(n=>nameSimilarity(n,parts.given)),0):0,den=(surnames.length?0.54:0)+(givens.length?0.46:0)||1,part=(sur*.54+giv*.46)/den,ns=Math.max(full,part);let score=ns*.88,meta=0;if(parsed.hand&&String(p['投/打']||'').replace('／','/')===parsed.hand){score+=.055;meta++}if(parsed.pos&&p._position===POSMAP[parsed.pos]){score+=.04;meta++}if(parsed.age&&String(p['年齢']||'')===parsed.age)score+=.008;const sl=surnames[0]?.length||0,gl=givens[0]?.length||0;if(sl&&Math.abs([...parts.surname].length-[...surnames[0]].length)>1)score-=.06;if(gl&&Math.abs([...parts.given].length-[...givens[0]].length)>1)score-=.06;return{p,score,nameScore:ns,fullScore:full,surnameScore:sur,givenScore:giv,meta}}).sort((a,b)=>b.score-a.score),best=scored[0],second=scored[1];if(!best)return{match:null,candidates:[]};const margin=best.score-(second?.score||0),splitStrong=(surnames.length&&givens.length&&best.surnameScore>=.72&&best.givenScore>=.64);const accept=(best.nameScore>=.90&&margin>=.018)||(splitStrong&&margin>=.02)||(best.nameScore>=.74&&best.meta>=1&&margin>=.025)||(best.nameScore>=.68&&best.meta>=2&&margin>=.02);return{match:accept?best:null,candidates:scored.slice(0,12),margin}}
function parseExpectedTotal(text){const t=cleanOCR(text);let m=t.match(/(?:合計|含計|会計|馬軒)[^0-9]{0,8}(\d{2,3})\s*人/);if(m)return +m[1];const nums=[...t.matchAll(/(\d{2,3})\s*人/g)].map(x=>+x[1]).filter(n=>n>=20&&n<=200);return nums.length?Math.max(...nums):0}
function mergeEvidence(a,b){const pa=a.parsed||{},pb=b.parsed||{},parsed={...pa,names:[...new Set([...(pa.names||[]),...(pb.names||[])].filter(Boolean))],surnames:[...new Set([pa.surname,...(pa.surnames||[]),pb.surname,...(pb.surnames||[])].filter(Boolean))],givens:[...new Set([pa.given,...(pa.givens||[]),pb.given,...(pb.givens||[])].filter(Boolean))]};if(!parsed.age)parsed.age=pb.age;if(!parsed.hand)parsed.hand=pb.hand;if(!parsed.pos)parsed.pos=pb.pos;const cm=candidateMatch(parsed),keep=(b.ocrConfidence||0)>(a.ocrConfidence||0)?b:a;return{...keep,parsed,raw:[a.raw,b.raw].filter(Boolean).join(' || '),ocrConfidence:Math.max(a.ocrConfidence||0,b.ocrConfidence||0),match:cm.match,candidates:cm.candidates,score:cm.match?.score||cm.candidates?.[0]?.score||0,firstIndex:Math.min(a.firstIndex??9999,b.firstIndex??9999),sources:[...(a.sources||[`${a.file}#${a.row}`]),...(b.sources||[`${b.file}#${b.row}`])]}}
function consolidateRows(raw,expected=0){const clusters=[];for(const r0 of raw){const r={...r0},h=r.hash||dhash(binaryRegion(r.canvas,.105,.585,126,2));r.hash=h;let idx=-1,best=999;for(let i=0;i<clusters.length;i++){const d=ham(h,clusters[i].hash);if(d<best&&d<=7){best=d;idx=i}}if(idx>=0)clusters[idx]=mergeEvidence(clusters[idx],r);else clusters.push({...r,sources:[`${r.file}#${r.row}`]})}clusters.sort((a,b)=>(a.firstIndex??9999)-(b.firstIndex??9999));let out=clusters;if(expected&&out.length>expected)out=[...out].sort((a,b)=>(b.match?.score||b.candidates?.[0]?.score||0)-(a.match?.score||a.candidates?.[0]?.score||0)).slice(0,expected).sort((a,b)=>(a.firstIndex??9999)-(b.firstIndex??9999));return out}
function resolveUniqueCandidates(rows){for(const r of rows)r.resolved=null;const used=new Set(rows.filter(r=>r.match?.p?._uid).map(r=>r.match.p._uid)),pending=rows.filter(r=>!r.match);for(let guard=0;guard<rows.length;guard++){let pick=null;for(const r of pending){if(r.resolved)continue;const av=(r.candidates||[]).filter(x=>!used.has(x.p._uid));if(!av.length)continue;const a=av[0],b=av[1],gap=a.score-(b?.score||0),quality=a.score+gap*.45+a.meta*.015;if(a.score<.49)continue;if(!pick||quality>pick.quality)pick={r,a,gap,quality}}if(!pick)break;pick.r.resolved=pick.a;pick.r.status=pick.r.status==='確認'?'確認':'推定';used.add(pick.a.p._uid)}return rows}
function dedupeRecognizedRows(rows,expected=0){const seen=new Map(),rest=[];for(const r of rows){const p=r.match?.p||r.resolved?.p;if(p?._uid){const old=seen.get(p._uid),quality=(r.match?.score||r.resolved?.score||r.score||0)+(r.ocrConfidence||0)/5000;if(!old||quality>old.quality)seen.set(p._uid,{row:r,quality})}else rest.push(r)}let out=[...seen.values()].map(x=>x.row).concat(rest);out.sort((a,b)=>(a.firstIndex??9999)-(b.firstIndex??9999));if(expected&&out.length>expected)out=out.slice(0,expected);return out}
function batchDisplayPlayer(r){return r.match?.p||r.resolved?.p||r.candidates?.[0]?.p||null}
const GRADE_SCORE={'SS':15,'S+':14,'S':13,'A+':12,'A':11,'B+':10,'B':9,'C+':8,'C':7,'D+':6,'D':5,'E+':4,'E':3,'F':2,'G':1};
function gradeScore(v){const t=String(v??'').trim().toUpperCase();if(t in GRADE_SCORE)return GRADE_SCORE[t];const n=parseFloat(t);return Number.isFinite(n)?n:-999}
function abilitySortTuple(p,key){if(!p)return[-999,-999];const raw=String(p[key]??'').trim();if(!raw||raw==='—'||raw==='–')return[-999,-999];const parts=raw.split(/[\/／]/).map(x=>x.trim()).filter(Boolean);if(key==='球速'){const nums=parts.map(x=>parseFloat(x)).filter(Number.isFinite);return[nums.length?nums[nums.length-1]:-999,nums.length?nums[0]:-999]}return[gradeScore(parts.length>1?parts[parts.length-1]:parts[0]),gradeScore(parts[0])]}
function batchCompare(a,b,key){const pa=batchDisplayPlayer(a),pb=batchDisplayPlayer(b),rank={S:0,A:1,B:2,C:3,D:4};if(key==='screen')return(a.firstIndex??9999)-(b.firstIndex??9999);if(key==='name')return String(pa?.['名前']||'').localeCompare(String(pb?.['名前']||''),'ja');if(key==='rank')return(rank[pa?.['ランク']]??9)-(rank[pb?.['ランク']]??9)||String(pa?.['名前']||'').localeCompare(String(pb?.['名前']||''),'ja');if(key==='confidence')return(b.match?.score||b.resolved?.score||b.candidates?.[0]?.score||0)-(a.match?.score||a.resolved?.score||a.candidates?.[0]?.score||0);const [a1,a2]=abilitySortTuple(pa,key),[b1,b2]=abilitySortTuple(pb,key);if(a1!==b1)return b1-a1;if(a2!==b2)return b2-a2;return(rank[pa?.['ランク']]??9)-(rank[pb?.['ランク']]??9)}
function sortBatchRows(rows){let out=[...rows].sort((a,b)=>batchCompare(a,b,state.batchSort));if(state.batchSortDir==='desc'&&['screen','name','rank'].includes(state.batchSort))out.reverse();if(state.batchSortDir==='asc'&&!['screen','name','rank'].includes(state.batchSort))out.reverse();return out}
function setBatchSort(key){if(state.batchSort===key)state.batchSortDir=state.batchSortDir==='asc'?'desc':'asc';else{state.batchSort=key;state.batchSortDir=['screen','name','rank'].includes(key)?'asc':'desc'}renderBatchResults()}
function batchGroupName(p){const pos=p?._position||'';if(pos==='投手')return'投手';if(pos==='捕手')return'捕手';if(['一壘手','二壘手','三壘手','游擊手'].includes(pos))return'內野手';if(pos==='外野手')return'外野手';return'其他'}
const BATCH_COMMON=['_screen','_status','名前','ランク','年齢','成長','投/打','出身','高校','大学','社会人','_position'];
const BATCH_PITCH=[...BATCH_COMMON,'タイプ','体力','球速','球威','制球','精神','守備','捕球','肩力','送球','スライダー','速スラ','カットB','カーブ','Sカーブ','ドロップ','シュート','速シュート','シンカー','スクリュー','速シンカー','サークルC','2シーム','Cアップ','フォーク','SFF','縦スラ','パーム','ナックル','スキル1','スキル2','スキル3','モデル'];
const BATCH_BAT=[...BATCH_COMMON,'体力','右巧','左巧','長打','バント','選球眼','走力','走塁','精神','守備','捕球','肩力','送球','リード','捕手','一塁','二塁','三塁','遊撃','外野','スキル1','スキル2','スキル3','モデル'];
function batchHeaderLabel(k){return k==='_screen'?'#':k==='_status'?'狀態':k==='_position'?'守位':(HEADER_ZH[k]||k)}
function batchSortArrow(k){return state.batchSort===k?(state.batchSortDir==='asc'?' ↑':' ↓'):''}
function batchCell(r,p,k,displayIndex){if(k==='_screen')return String(displayIndex+1);if(k==='_status')return r.match?'確認':r.resolved?'推定':'候選';if(k==='_position')return esc(p?._position||POSMAP[r.parsed?.pos]||'—');if(k==='名前'){const alts=(r.candidates||[]).filter(x=>x.p._uid!==p?._uid).slice(0,2),alt=alts.length?`<small class="candidate-note">候選：${alts.map(x=>esc(x.p['名前'])).join(' / ')}</small>`:'';return p?`<span class="name-link" data-uid="${esc(p._uid)}">${esc(p['名前'])}</span>${alt}`:'—'}return esc(p?.[k]||'—')}
function renderBatchGroup(title,rows,cols){const sorted=sortBatchRows(rows),sortable=new Set(['screen','name','rank','年齢','体力','球速','球威','制球','精神','守備','捕球','肩力','送球','右巧','左巧','長打','バント','選球眼','走力','走塁','リード','捕手','一塁','二塁','三塁','遊撃','外野']);let h=`<section class="batch-group"><h3>${esc(title)} <small>${rows.length}</small></h3><div class="table-shell"><table class="data-table batch-detail-table"><thead><tr>`;for(const k of cols){const sk=k==='_screen'?'screen':k==='名前'?'name':k==='ランク'?'rank':k;h+=sortable.has(sk)?`<th class="sortable" data-sort="${esc(sk)}">${esc(batchHeaderLabel(k))}${batchSortArrow(sk)}</th>`:`<th>${esc(batchHeaderLabel(k))}</th>`}h+='</tr></thead><tbody>';sorted.forEach((r,i)=>{const p=batchDisplayPlayer(r);h+='<tr>'+cols.map(k=>`<td class="${k==='名前'?'name':''} ${k==='_status'?(r.match?'good':r.resolved?'estimate':'unresolved'):''}">${batchCell(r,p,k,i)}</td>`).join('')+'</tr>'});h+='</tbody></table></div></section>';return h}
async function recognizeText(worker,canvas){const r=await worker.recognize(canvas);return{text:cleanOCR(r?.data?.text||''),confidence:Number(r?.data?.confidence||0)}}
async function runBatch(){
  if(!state.batchFiles.length){alert('請先選擇截圖。');return}
  if(state.players.length<1000){$('#batchStatus').textContent='完整名冊尚未載入，請先到「資料」按更新名冊。';return}
  $('#runBatch').disabled=true;let paddle=null,worker=null;
  try{
    const screens=[],all=[];setBatchProgress(1,'分析固定版面…');
    for(const f of state.batchFiles){const im=await loadImage(f),rows=rowCrops(im,f.name).filter(r=>nameInkRatio(r.canvas)>.006);screens.push({file:f.name,footer:footerCrop(im,f.name)});all.push(...rows)}
    state.batchRawRows=all.map((r,i)=>({...r,firstIndex:i,status:'待辨識',raw:'',parsed:null,match:null,candidates:[],ocrConfidence:0,score:0}));state.batchRows=[];state.expectedTotal=0;renderBatchResults();

    let paddleError=null;
    try{paddle=await createPaddleOCR()}catch(e){paddleError=e;console.warn('PaddleOCR init',e)}
    if(paddle){
      let totals=[];for(const sc of screens){const t=await recognizeFooterPaddle(paddle,sc.footer.canvas),n=parseExpectedTotal(t);if(n)totals.push(n)}state.expectedTotal=totals.length?Math.max(...totals):0;
      for(let i=0;i<state.batchRawRows.length;i++){
        const row=state.batchRawRows[i];setBatchProgress(5+63*(i/Math.max(1,state.batchRawRows.length)),`PaddleOCR 姓名辨識 ${i+1}/${state.batchRawRows.length}`);
        try{const rr=await recognizeNamePaddle(paddle,row.canvas);row.raw='P:'+rr.raw;row.ocrConfidence=Math.round(rr.confidence*100);row.parsed=rr.parsed;row.match=rr.cm?.match||null;row.candidates=rr.cm?.candidates||[];row.score=row.match?.score||row.candidates?.[0]?.score||0;row.status=row.match?'確認':'候選'}catch(e){row.status='失敗';row.raw=String(e.message||e)}
        if(i%5===0){state.batchRows=consolidateRows(state.batchRawRows.slice(0,i+1),0);renderBatchResults()}
      }

      const uncertain=state.batchRawRows.filter(r=>!r.match||r.score<.82||((r.candidates?.[0]?.score||0)-(r.candidates?.[1]?.score||0))<.035);
      if(uncertain.length){
        setBatchProgress(70,`第二引擎複核 ${uncertain.length} 個不確定姓名…`);
        const ok=await ensureLocalOCR();
        if(ok){
          try{worker=await withTimeout(Tesseract.createWorker('jpn',1,{workerPath:'./vendor/tesseract/worker.min.js',corePath:'./vendor/tesseract-core',langPath:'./vendor/lang'}),35000,'Tesseract 複核載入逾時');
            try{await worker.writeText('yt3-user-words.txt',batchUserWords());await worker.setParameters({tessedit_pageseg_mode:'7',preserve_interword_spaces:'1',user_words_file:'yt3-user-words.txt'})}catch{}
            for(let i=0;i<uncertain.length;i++){const row=uncertain[i];setBatchProgress(70+22*(i/Math.max(1,uncertain.length)),`Tesseract 複核 ${i+1}/${uncertain.length}`);
              try{const np=await recognizeFixedParts(worker,row.canvas,125),tp={name:`${np.surname} ${np.given}`.trim(),names:[`${np.surname} ${np.given}`.trim()].filter(Boolean),surname:np.surname,given:np.given,surnames:[np.surname].filter(Boolean),givens:[np.given].filter(Boolean),age:np.age,hand:np.hand,pos:np.pos,text:np.raw},parsed=mergeParsedNameEvidence(row.parsed,tp),cm=candidateMatch(parsed),vis=visualCandidateMatch(row.canvas,parsed);let chosen=cm;if(vis?.match&&(!cm.match||vis.match.score>(cm.match?.score||cm.candidates?.[0]?.score||0)+.03))chosen=vis;row.parsed=parsed;row.raw+=`｜T:${np.raw}`;row.ocrConfidence=Math.max(row.ocrConfidence,np.confidence);row.match=chosen?.match||row.match;row.candidates=chosen?.candidates?.length?chosen.candidates:row.candidates;row.score=row.match?.score||row.candidates?.[0]?.score||row.score;row.status=row.match?'確認':'候選'}catch(e){row.raw+=`｜TERR:${e.message||e}`}
            }
          }catch(e){console.warn('Tesseract verify',e)}
        }
      }
    }else{
      setBatchProgress(8,`PaddleOCR 無法啟動，切換 Tesseract 備援：${paddleError?.message||''}`);
      const ok=await ensureLocalOCR();if(!ok)throw new Error('兩個本機辨識引擎都無法載入');
      worker=await withTimeout(Tesseract.createWorker('jpn',1,{workerPath:'./vendor/tesseract/worker.min.js',corePath:'./vendor/tesseract-core',langPath:'./vendor/lang'}),35000,'Tesseract 備援載入逾時');
      try{await worker.writeText('yt3-user-words.txt',batchUserWords());await worker.setParameters({tessedit_pageseg_mode:'7',preserve_interword_spaces:'1',user_words_file:'yt3-user-words.txt'})}catch{}
      for(let i=0;i<state.batchRawRows.length;i++){const row=state.batchRawRows[i];setBatchProgress(10+82*(i/Math.max(1,state.batchRawRows.length)),`Tesseract 備援 ${i+1}/${state.batchRawRows.length}`);
        try{const np=await recognizeFixedParts(worker,row.canvas,125),parsed={name:`${np.surname} ${np.given}`.trim(),names:[`${np.surname} ${np.given}`.trim()].filter(Boolean),surname:np.surname,given:np.given,surnames:[np.surname].filter(Boolean),givens:[np.given].filter(Boolean),age:np.age,hand:np.hand,pos:np.pos,text:np.raw},cm=candidateMatch(parsed);row.raw='T:'+np.raw;row.ocrConfidence=np.confidence;row.parsed=parsed;row.match=cm.match;row.candidates=cm.candidates;row.score=cm.match?.score||cm.candidates?.[0]?.score||0;row.status=row.match?'確認':'候選'}catch(e){row.status='失敗';row.raw=String(e.message||e)}
      }
    }
    let rows=resolveUniqueCandidates(consolidateRows(state.batchRawRows,state.expectedTotal));rows=dedupeRecognizedRows(rows,state.expectedTotal);state.batchRows=rows;
    const matched=rows.filter(r=>r.match).length,inferred=rows.filter(r=>!r.match&&r.resolved).length;
    setBatchProgress(100,`完成：${rows.length} 人${state.expectedTotal?`／畫面名單上限 ${state.expectedTotal}`:''}；確認 ${matched}，推定 ${inferred}，候選 ${rows.length-matched-inferred}`);
    renderBatchResults();
  }catch(e){console.error(e);$('#batchStatus').textContent='批次找人失敗：'+(e.message||e)}
  finally{if(paddle)try{await paddle.dispose()}catch{}if(worker)try{await worker.terminate()}catch{}$('#runBatch').disabled=false}
}
$('#runBatch').onclick=runBatch;
function renderBatchResults(){
  const matched=state.batchRows.filter(r=>r.match).length,inferred=state.batchRows.filter(r=>!r.match&&r.resolved).length;
  $('#batchSummary').textContent=state.batchRows.length?`結果 ${state.batchRows.length}${state.expectedTotal?` / 最多 ${state.expectedTotal}`:''}｜確認 ${matched}｜推定 ${inferred}｜候選 ${state.batchRows.length-matched-inferred}`:'';
  const groups={投手:[],捕手:[],內野手:[],外野手:[],其他:[]};for(const r of state.batchRows){const p=batchDisplayPlayer(r);groups[batchGroupName(p)].push(r)}
  let h='';for(const key of ['投手','捕手','內野手','外野手','其他'])if(groups[key].length)h+=renderBatchGroup(key,groups[key],key==='投手'?BATCH_PITCH:BATCH_BAT);
  $('#batchTable').innerHTML=h;
  $('#batchTable').querySelectorAll('[data-uid]').forEach(td=>td.onclick=()=>openPlayer(td.dataset.uid));
  $('#batchTable').querySelectorAll('th[data-sort]').forEach(th=>th.onclick=()=>setBatchSort(th.dataset.sort));
}


let deferredPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').classList.remove('hidden')});$('#installBtn').onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').classList.add('hidden')};

async function remoteVersion(){try{const r=await fetch(`./VERSION?t=${Date.now()}`,{cache:'no-store'});return r.ok?(await r.text()).trim():''}catch{return''}}
function showUpdateBar(text,percent=0,action=true){const bar=$('#updateBar');if(!bar)return;bar.classList.remove('hidden');$('#updateText').textContent=text;$('#updateProgress').value=percent;$('#applyUpdate').classList.toggle('hidden',!action)}
function hideUpdateBar(){const bar=$('#updateBar');if(bar)bar.classList.add('hidden')}
async function checkAppUpdate(manual=false){
  if(manual)showUpdateBar('檢查最新版…',8,false);
  const v=await remoteVersion();
  if(v&&v!==APP_VERSION){showUpdateBar(`有新版 ${v}（目前 ${APP_VERSION}）`,12,true);return true}
  if(manual){showUpdateBar(`已是最新版 ${APP_VERSION}`,100,false);setTimeout(hideUpdateBar,1200)}
  return false
}
async function applyAppUpdate(){
  try{
    showUpdateBar('更新程式與離線快取…',18,false);
    if('serviceWorker'in navigator){const regs=await navigator.serviceWorker.getRegistrations();for(const reg of regs)try{await reg.update()}catch{}}
    $('#updateProgress').value=45;
    const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('yt3-')).map(k=>caches.delete(k)));
    $('#updateProgress').value=72;
    await fetch(`./index.html?t=${Date.now()}`,{cache:'reload'});await fetch(`./app.js?t=${Date.now()}`,{cache:'reload'});
    $('#updateProgress').value=100;$('#updateText').textContent='更新完成，重新載入…';
    setTimeout(()=>location.replace(`./?updated=${Date.now()}`),350);
  }catch(e){showUpdateBar('更新失敗：'+(e.message||e),0,true)}
}
$('#updateBtn').onclick=()=>checkAppUpdate(true);$('#applyUpdate').onclick=applyAppUpdate;
window.addEventListener('load',()=>{setTimeout(()=>checkAppUpdate(false),900);setInterval(()=>checkAppUpdate(false),15*60*1000)});

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
loadData().catch(e=>{$('#dataStatus').textContent='資料載入失敗：'+e.message;console.error(e)});