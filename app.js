const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const APP_VERSION='2026.10.09-r18';
const state={players:[],guides:[],book:[],cheats:[],sources:[],page:1,pageSize:80,batchFiles:[],batchRows:[],batchRawRows:[],guideTopic:'all',expectedTotal:0,rosterSource:'',ocrReady:false,paddleReady:false,batchSort:'screen',batchSortDir:'asc'};
const HEADER_ZH={"名前":"姓名","年齢":"年齡","成長":"成長型","投/打":"投／打","出身":"出身地","高校":"高中","大学":"大學","社会人":"社會人","タイプ":"投手類型","ランク":"Rank","体力":"體力","球速":"球速","球威":"球威","制球":"控球","精神":"精神","守備":"守備","捕球":"接球","肩力":"臂力","送球":"傳球","スライダー":"滑球","速スラ":"高速滑球","カットB":"卡特球","カーブ":"曲球","Sカーブ":"S曲球","ドロップ":"Drop曲球","シュート":"噴射球","速シュート":"高速噴射球","シンカー":"伸卡球","スクリュー":"螺旋球","速シンカー":"高速伸卡球","サークルC":"圈指變速","2シーム":"二縫線","Cアップ":"變速球","フォーク":"指叉球","SFF":"快速指叉","縦スラ":"縱滑球","パーム":"掌心球","ナックル":"蝴蝶球","スキル1":"技能1","スキル2":"技能2","スキル3":"技能3","モデル":"原型","右巧":"對右巧打","左巧":"對左巧打","長打":"長打","バント":"短打","選球眼":"選球眼","走力":"跑力","走塁":"跑壘","リード":"配球","捕手":"捕手","一塁":"一壘","二塁":"二壘","三塁":"三壘","遊撃":"游擊","外野":"外野","リーグ":"聯盟／地區","アカデミー":"學院"};
const BASE_COLS=['名前','ランク','年齢','成長','投/打','出身','高校','大学','社会人','タイプ','体力','球速','球威','制球','精神','守備','捕球','肩力','送球','右巧','左巧','長打','バント','選球眼','走力','走塁','リード','捕手','一塁','二塁','三塁','遊撃','外野','スライダー','速スラ','カットB','カーブ','Sカーブ','ドロップ','シュート','速シュート','シンカー','スクリュー','速シンカー','サークルC','2シーム','Cアップ','フォーク','SFF','縦スラ','パーム','ナックル','スキル1','スキル2','スキル3','モデル'];
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function norm(v){return String(v??'').normalize('NFKC').toLowerCase().replace(/[\s　・·･,，。\.\/／()（）\-–—_:：;；'"「」『』【】\[\]]/g,'')}
function normName(v){const variants={'薮':'藪','澤':'沢','髙':'高','﨑':'崎','邉':'辺','邊':'辺','濵':'浜','濱':'浜','齋':'斎','齊':'斉','國':'国','廣':'広','神':'神'};const t=norm(v);return [...t].map(ch=>{const c=ch.charCodeAt(0),x=c>=0x30A1&&c<=0x30F6?String.fromCharCode(c-0x60):ch;return variants[x]||x}).join('')}
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
function renderPlayers(){const list=filteredPlayers();const pages=Math.max(1,Math.ceil(list.length/state.pageSize));state.page=Math.min(state.page,pages);const start=(state.page-1)*state.pageSize,rows=list.slice(start,start+state.pageSize);$('#playerCount').textContent=`${list.length.toLocaleString()} 人`;$('#pageInfo').textContent=`${state.page} / ${pages}`;$('#prevPage').disabled=state.page<=1;$('#nextPage').disabled=state.page>=pages;const cols=['名前','ランク','年齢','成長','投/打','体力','球速','右巧','左巧','長打','走力'].filter(k=>rows.some(x=>x[k]!==undefined&&x[k]!==''));let h='<thead><tr>'+cols.map(k=>`<th>${esc(HEADER_ZH[k]||k)}</th>`).join('')+'<th>守位</th><th>分類</th></tr></thead><tbody>';for(const x of rows){h+='<tr>'+cols.map(k=>k==='名前'?`<td class="name" data-uid="${esc(x._uid)}">${esc(x[k])}</td>`:`<td class="${k==='ランク'?'rank':''}">${esc(x[k]||'—')}</td>`).join('')+`<td>${esc(x._position||'')}</td><td>${esc(x._group||'')}</td></tr>`}h+='</tbody>';$('#playerTable').innerHTML=h;$('#playerTable').querySelectorAll('[data-uid]').forEach(td=>td.onclick=()=>openPlayer(td.dataset.uid))}
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
  const title=esc(sec.title||''),note=sec.note?`<div class="guide-note">${esc(sec.note)}</div>`:'',source=sec.source?`<details class="guide-source"><summary>資料來源</summary><a href="${esc(sec.source)}" target="_blank" rel="noreferrer">開啟原文</a></details>`:'';
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
  const chapterId=state.guideTopic.startsWith('chapter:')?state.guideTopic.slice(8):'',activeCat=chapterId?(GUIDE_CATEGORIES.find(c=>c.chapters.includes(chapterId))?.id||'all'):state.guideTopic;
  $('#guideTopics').innerHTML=GUIDE_CATEGORIES.map(c=>`<button class="chip ${activeCat===c.id?'active':''}" data-topic="${c.id}">${c.title}</button>`).join('');
  $('#guideTopics').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{state.guideTopic=btn.dataset.topic;renderGuideTopics();renderGuides()})
}
function guideQueryForms(v){
  const raw=norm(v),forms=new Set([raw]);
  const pairs=[['引越し屋','引っ越し屋'],['球團','球団'],['企劃','企画'],['プラ原型球員','プラモデル'],['木彫り的熊','木彫りの熊'],['自由的女神','自由の女神'],['鳥的巣','鳥の巣'],['絵的具','絵の具']];
  for(const [a,b] of pairs){const na=norm(a),nb=norm(b);if(raw.includes(na))forms.add(raw.replace(na,nb));if(raw.includes(nb))forms.add(raw.replace(nb,na))}
  return [...forms].filter(Boolean)
}
function guideRowSearch(book,query){
  const qs=guideQueryForms(query),hits=[];
  const has=v=>{const t=norm(String(v??''));return qs.some(q=>t.includes(q))};
  for(const ch of book)for(const sec of ch.sections||[]){
    if(sec.rows?.length){
      for(const row of sec.rows){const joined=(row||[]).join('｜');if(has(joined)||has(sec.title)||has(ch.title))hits.push({kind:'row',chapter:ch.title,section:sec.title,headers:sec.headers||[],row,source:sec.source})}
    }else{
      for(const item of sec.items||[])if(has(item)||has(sec.title)||has(ch.title))hits.push({kind:'item',chapter:ch.title,section:sec.title,item,source:sec.source})
    }
  }
  const priority=x=>x.section==='經營企劃完整逆引：條件／需求道具／取得地／組合／效果'?0:x.section==='Idea Memo 68 種'?1:x.section==='出張依頼完整規則／出差委託'?2:3;
  hits.sort((a,b)=>priority(a)-priority(b));
  const seen=new Set(),out=[];
  for(const x of hits){const key=x.kind==='row'?(x.chapter+'|'+String(x.row?.[0]||'')):(x.chapter+'|'+x.section+'|'+x.item);if(seen.has(key))continue;seen.add(key);out.push(x)}
  return out
}
function renderGuideSearchHits(hits){
  return hits.slice(0,180).map(x=>{
    if(x.kind==='row'){
      const heads=x.headers?.length?x.headers:x.row.map((_,i)=>i===0?'項目':'內容');
      const cells=x.row.map((v,i)=>'<div class="guide-search-cell"><small>'+esc(heads[i]||'內容')+'</small><b>'+esc(v||'—')+'</b></div>').join('');
      return '<article class="card guide-search-hit"><div class="meta">'+esc(x.chapter)+' › '+esc(x.section)+'</div><div class="guide-search-grid">'+cells+'</div>'+(x.source?'<div class="meta"><a href="'+esc(x.source)+'" target="_blank" rel="noreferrer">來源</a></div>':'')+'</article>';
    }
    return '<article class="card guide-search-hit"><div class="meta">'+esc(x.chapter)+' › '+esc(x.section)+'</div><p>'+esc(x.item)+'</p>'+(x.source?'<div class="meta"><a href="'+esc(x.source)+'" target="_blank" rel="noreferrer">來源</a></div>':'')+'</article>';
  }).join('')
}

const originalGuideSectionHTML=guideSectionHTML;
const originalGuideRowSearch=guideRowSearch;
function guideSectionCompact(sec){
  const title=String(sec.title||'');
  if(title==='經營企劃組合表（條件・組合・結果）'){
    return `<section class="guide-section"><details class="guide-legacy-repeat"><summary>舊版組合簡表 ${sec.rows?.length||0} 筆（已整合至「完整逆引」，點此對照原表）</summary>${originalGuideSectionHTML(sec)}</details></section>`;
  }
  if(title==='經營企劃完整逆引：條件／需求道具／取得地／組合／效果'){
    const names=sec.headers||[];
    return `<section class="guide-section"><h3>${esc(title)}（${sec.rows?.length||0} 筆）</h3><div class="guide-plan-grid">${(sec.rows||[]).map(row=>{
      const extras=row.slice(2).map((value,index)=>`<div class="guide-plan-extra"><small>${esc(names[index+2]||'內容')}</small><span>${esc(value||'—')}</span></div>`).join('');
      return `<details class="guide-plan-entry" ${state.guideExpandAll?'open':''}><summary><strong>${esc(row[0]||'—')}</strong><span>${esc(row[1]||'—')}</span></summary>${extras}</details>`;
    }).join('')}</div>${sec.source?`<details class="guide-source"><summary>資料來源</summary><a href="${esc(sec.source)}" target="_blank" rel="noreferrer">原文</a></details>`:''}</section>`;
  }
  return originalGuideSectionHTML(sec);
}
function guideChapterCompact(ch){
 const expand=ch.id==='idea'?`<button type="button" class="guide-expand-all" data-expand-idea>${state.guideExpandAll?'全部收合':'全部展開'}</button>`:'';
 const intro=ch.id==='idea'?'原始 289 筆收錄；其中 75 筆簡表與完整逆引重疊，已合併顯示。保留兩份原文可供對照。':ch.summary||'';
 return `<article class="guide-chapter"><div class="guide-chapter-head"><h2>${esc(ch.title)}</h2>${expand}<p>${esc(intro)}</p></div>${(ch.sections||[]).map(guideSectionHTML).join('')}</article>`;
}
function guideRowClean(book,query){return originalGuideRowSearch(book,query).filter(x=>x.section!=='經營企劃組合表（條件・組合・結果）');}
function guideSearchCompact(hits){
 return hits.slice(0,180).map(x=>{
 const heads=x.headers||[];
 const special=x.kind==='row'&&heads[0]==='No.'&&x.row?.[1];
 const title=x.kind==='row'?(special?x.row[1]:x.row?.[0]):x.item;
 const fields=x.kind==='row'?(x.row||[]).slice(special?2:1).map((v,i)=>`<span><strong>${esc(heads[i+(special?2:1)]||'內容')}：</strong>${esc(v||'—')}</span>`).join(''):'';
 return `<article class="guide-quick-item"><div class="guide-quick-heading"><b>${esc(title||'—')}</b><small>${esc(x.chapter)} › ${esc(x.section)}</small></div>${fields?`<div class="guide-quick-data">${fields}</div>`:''}${x.source?`<div class="guide-source"><a href="${esc(x.source)}" target="_blank" rel="noreferrer">來源</a></div>`:''}</article>`;
 }).join('');
}
guideSectionHTML=guideSectionCompact;
guideChapterDetail=guideChapterCompact;
guideRowSearch=guideRowClean;
renderGuideSearchHits=guideSearchCompact;

function renderGuides(){
  const q=$('#guideQuery').value.trim(),root=$('#guideResults'),book=visibleGuideBook();
  if(q){
    const hits=guideRowSearch(book,q);
    root.innerHTML=hits.length?'<div class="guide-search-summary">找到 '+hits.length+' 筆；以下直接顯示命中的條件／組合／取得地／效果。</div>'+renderGuideSearchHits(hits):'<div class="card">沒有符合的攻略。</div>';
    return
  }
  if(state.guideTopic.startsWith('chapter:')){const id=state.guideTopic.slice(8),ch=book.find(x=>x.id===id);if(ch){root.innerHTML=guideChapterDetail(ch);const e=root.querySelector('[data-expand-idea]');if(e)e.onclick=()=>{state.guideExpandAll=!state.guideExpandAll;renderGuides()};return}state.guideTopic='all'}
  const cat=GUIDE_CATEGORIES.find(c=>c.id===state.guideTopic)||GUIDE_CATEGORIES[0];
  if(cat.id==='all'){
    root.innerHTML=GUIDE_CATEGORIES.slice(1).map(c=>{const list=c.chapters.map(id=>book.find(x=>x.id===id)).filter(Boolean);return list.length?'<section class="guide-index-group"><h2>'+esc(c.title)+'</h2><div class="guide-index-grid">'+list.map(guideChapterCard).join('')+'</div></section>':''}).join('')||'<div class="card">目前沒有攻略內容。</div>';
  }else{
    const list=cat.chapters.map(id=>book.find(x=>x.id===id)).filter(Boolean);root.innerHTML=list.map(guideChapterCard).join('')||'<div class="card">這個分類目前沒有內容。</div>';
  }
  root.querySelectorAll('[data-guide-id]').forEach(btn=>btn.onclick=()=>{state.guideTopic='chapter:'+btn.dataset.guideId;renderGuideTopics();renderGuides();window.scrollTo({top:0,behavior:'smooth'})})
}
let guideSearchBackup='';
$('#showIdeaAll').onclick=()=>{guideSearchBackup=$('#guideQuery').value;$('#guideQuery').value='';state.guideTopic='chapter:idea';state.guideExpandAll=true;$('#showIdeaAll').classList.add('hidden');$('#backGuideSearch').classList.remove('hidden');renderGuideTopics();renderGuides();window.scrollTo({top:0,behavior:'smooth'})};
$('#backGuideSearch').onclick=()=>{$('#guideQuery').value=guideSearchBackup||'';state.guideTopic='all';$('#backGuideSearch').classList.add('hidden');$('#showIdeaAll').classList.remove('hidden');renderGuideTopics();renderGuides();window.scrollTo({top:0,behavior:'smooth'})};
$('#guideQuery').addEventListener('input',debounce(renderGuides));
$('#clearGuide').onclick=()=>{$('#guideQuery').value='';guideSearchBackup='';state.guideTopic='all';$('#backGuideSearch').classList.add('hidden');$('#showIdeaAll').classList.remove('hidden');renderGuideTopics();renderGuides()};

function flattenCheats(){const out=[];for(const ch of state.cheats){for(const sec of ch.sections||[]){if(sec.type==='table'){for(const row of sec.rows||[])out.push({chapter:ch.title,title:sec.title,text:(row||[]).join('｜'),row,headers:sec.headers,source:sec.source})}else if(sec.type==='facts'){for(const row of sec.rows||[])out.push({chapter:ch.title,title:sec.title,text:(row||[]).join('｜'),row,headers:['項目','內容'],source:sec.source})}else for(const item of sec.items||[])out.push({chapter:ch.title,title:sec.title,text:item,source:sec.source})}}return out}
function renderCheats(){const q=norm($('#cheatQuery').value);const rows=flattenCheats().filter(x=>!q||norm(`${x.chapter} ${x.title} ${x.text}`).includes(q)).slice(0,260);$('#cheatResults').innerHTML=rows.map(x=>`<article class="card"><h3>${esc(x.title)}</h3>${x.row?`<table><tr>${x.headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr><tr>${x.row.map(v=>`<td>${String(v).includes('\n')||/[0-9A-F]{8}/.test(String(v))?`<pre>${esc(v)}</pre>`:esc(v)}</td>`).join('')}</tr></table>`:`<p>${esc(x.text)}</p>`}${x.source?`<div class="meta"><a href="${esc(x.source)}" target="_blank" rel="noreferrer">來源</a></div>`:''}</article>`).join('')||'<div class="card">沒有符合的金手指資料。</div>'}
$('#cheatQuery').addEventListener('input',debounce(renderCheats));$('#clearCheat').onclick=()=>{$('#cheatQuery').value='';renderCheats()};
function renderSources(){$('#sourceList').innerHTML=state.sources.map(s=>`<article class="card"><h3><a href="${esc(s.url)}" target="_blank" rel="noreferrer">${esc(s.name)}</a></h3><div class="source-role">${esc(s.role)}</div><div class="source-note">${esc(s.note)}</div><div class="meta">狀態：${esc(s.status)}｜優先級 ${esc(s.priority)}</div></article>`).join('')}
$('#refreshData').onclick=async()=>{const b=$('#refreshData');b.disabled=true;$('#dataStatus').textContent='更新完整名冊…';try{await loadData(true)}catch(e){$('#dataStatus').textContent='名冊更新失敗：'+e.message}finally{b.disabled=false}};

// --- 批次截圖找人：固定版面分列 → 本機 OCR 獨立讀字 → 再與完整球員資料庫比對；不使用特定截圖／特定姓名校準表。---
$('#batchFiles').onchange=e=>{state.batchFiles=[...e.target.files];state.batchRows=[];state.batchRawRows=[];state.expectedTotal=0;renderBatchPreview();renderBatchResults();$('#batchStatus').textContent=`已選 ${state.batchFiles.length} 張。`};
$('#clearBatch').onclick=()=>{state.batchFiles=[];state.batchRows=[];state.batchRawRows=[];state.expectedTotal=0;$('#batchFiles').value='';renderBatchPreview();renderBatchResults();$('#batchStatus').textContent='可一次選多張 OFFICE MENU 名單截圖。'};
function renderBatchPreview(){$('#batchPreview').innerHTML='';for(const f of state.batchFiles){const u=URL.createObjectURL(f),d=document.createElement('div');d.className='thumb';d.innerHTML=`<img src="${u}"><small>${esc(f.name)}</small>`;d.querySelector('img').onload=()=>setTimeout(()=>URL.revokeObjectURL(u),1000);$('#batchPreview').appendChild(d)}}
function loadImage(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=()=>{URL.revokeObjectURL(u);rej(new Error('圖片解碼失敗'))};im.src=u})}
function withTimeout(promise,ms,label='處理逾時'){let t;return Promise.race([promise,new Promise((_,rej)=>t=setTimeout(()=>rej(new Error(label)),ms))]).finally(()=>clearTimeout(t))}


function locateRosterPanel(img){
  const W=img.naturalWidth||img.width,H=img.naturalHeight||img.height,sw=240,sh=Math.max(80,Math.round(H*sw/W));
  const c=document.createElement('canvas');c.width=sw;c.height=sh;
  const g=c.getContext('2d',{willReadFrequently:true});g.imageSmoothingEnabled=false;g.drawImage(img,0,0,sw,sh);
  const d=g.getImageData(0,0,sw,sh).data,n=sw*sh,mask=new Uint8Array(n),seen=new Uint8Array(n),stack=new Int32Array(n);
  for(let i=0,j=0;i<d.length;i+=4,j++){const l=d[i]*.299+d[i+1]*.587+d[i+2]*.114;mask[j]=l<90?1:0}
  let best=null;
  for(let sy=0;sy<sh;sy++)for(let sx=0;sx<sw;sx++){
    const seed=sy*sw+sx;if(!mask[seed]||seen[seed])continue;
    let top=0,area=0,minx=sx,maxx=sx,miny=sy,maxy=sy;stack[top++]=seed;seen[seed]=1;
    while(top){
      const q=stack[--top],y=Math.floor(q/sw),x=q-y*sw;area++;if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;
      const add=(qq)=>{if(qq>=0&&qq<n&&mask[qq]&&!seen[qq]){seen[qq]=1;stack[top++]=qq}};
      if(x>0)add(q-1);if(x+1<sw)add(q+1);if(y>0)add(q-sw);if(y+1<sh)add(q+sw);
    }
    const bw=maxx-minx+1,bh=maxy-miny+1,aspect=bw/Math.max(1,bh);
    if(miny>sh*.2||aspect<1.35||area<sw*sh*.08||bw>sw*.92)continue;
    if(!best||area>best.area)best={area,minx,miny,bw,bh};
  }
  if(!best)return{x:0,y:0,w:W,h:H};
  const x=Math.round(best.minx*W/sw),y=Math.round(best.miny*H/sh),w=Math.round(best.bw*W/sw),h=Math.round(best.bh*H/sh),pad=Math.max(1,Math.round(w*.008));
  return{x:Math.max(0,x-pad),y:Math.max(0,y),w:Math.min(W-Math.max(0,x-pad),w+pad*2),h:Math.min(H-y,h)};
}
function rowCrops(img,fileName){
  const p=locateRosterPanel(img),body0=p.y+Math.round(p.h*.19),body1=p.y+Math.round(p.h*.995),rows=11,rh=(body1-body0)/rows,out=[];
  const sx=p.x,sw=Math.max(1,Math.round(p.w*.69));
  for(let i=0;i<rows;i++){
    const y0=Math.round(body0+i*rh),y1=Math.round(body0+(i+1)*rh),h=Math.max(1,y1-y0),c=document.createElement('canvas');
    c.width=sw;c.height=h;c.getContext('2d',{willReadFrequently:true}).drawImage(img,sx,y0,sw,h,0,0,sw,h);
    out.push({canvas:c,file:fileName,row:i+1});
  }
  return out
}
function footerCrop(img,fileName){
  const p=locateRosterPanel(img),W=img.naturalWidth||img.width,H=img.naturalHeight||img.height,sx=p.x,sy=Math.min(H-1,p.y+p.h+Math.max(1,Math.round(p.h*.008))),sw=Math.max(1,Math.min(W-sx,Math.round(p.w*.99))),sh=Math.max(1,Math.min(H-sy,Math.round(p.h*.16))),c=document.createElement('canvas');
  c.width=sw;c.height=sh;c.getContext('2d',{willReadFrequently:true}).drawImage(img,sx,sy,sw,sh,0,0,sw,sh);return{canvas:c,file:fileName}
}
function footerTotalCrop(img,fileName){
  const p=locateRosterPanel(img),W=img.naturalWidth||img.width,H=img.naturalHeight||img.height,sx=Math.max(0,p.x+Math.round(p.w*.67)),sy=Math.min(H-1,p.y+p.h+Math.max(1,Math.round(p.h*.008))),sw=Math.max(1,Math.min(W-sx,Math.round(p.w*.31))),sh=Math.max(1,Math.min(H-sy,Math.round(p.h*.16))),c=document.createElement('canvas');
  c.width=sw;c.height=sh;c.getContext('2d',{willReadFrequently:true}).drawImage(img,sx,sy,sw,sh,0,0,sw,sh);return{canvas:c,file:fileName}
}

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
async function recognizeFixedParts(worker,canvas,threshold=125){const sep=detectNameSeparator(canvas);try{await worker.setParameters({tessedit_pageseg_mode:'8',tessedit_char_whitelist:''})}catch(e){}const a=await recognizeText(worker,binaryRegion(canvas,.115,Math.max(.18,sep.left-.008),threshold,6)),b=await recognizeText(worker,binaryRegion(canvas,Math.min(.50,sep.right+.008),.575,threshold,6));try{await worker.setParameters({tessedit_pageseg_mode:'10',tessedit_char_whitelist:'投捕一二三遊外'})}catch(e){}const ps=await recognizeText(worker,binaryRegion(canvas,.012,.105,threshold,5));try{await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789歳才'})}catch(e){}const ag=await recognizeText(worker,binaryRegion(canvas,.60,.75,threshold,4));try{await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'右左両/／'})}catch(e){}const hd=await recognizeText(worker,binaryRegion(canvas,.78,.985,threshold,4));try{await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:''})}catch(e){}const age=(cleanOCR(ag.text).match(/(18|19|20|21|22|23|24)/)||[])[1]||'',ht=cleanOCR(hd.text).replace(/石/g,'右').replace(/布/g,'右').replace(/[|｜]/g,'/'),hm=ht.match(/([右左])\s*[\/／]\s*([右左両])/),pos=(cleanOCR(ps.text).match(/[投捕一二三遊外]/)||[])[0]||'';return{surname:ocrNamePart(a.text),given:ocrNamePart(b.text),age,hand:hm?`${hm[1]}/${hm[2]}`:'',pos,confidence:Math.round((a.confidence+b.confidence+ps.confidence+ag.confidence+hd.confidence)/5),raw:`${ps.text}｜${a.text}｜□｜${b.text}｜${ag.text}｜${hd.text}`,separator:sep}}
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
function paddlePartCanvas(src,part,threshold=122){
  const sep=detectNameSeparator(src);
  const rx0=part==='surname'?.115:Math.min(.50,sep.right+.008),rx1=part==='surname'?Math.max(.18,sep.left-.008):.575;
  const x0=Math.max(0,Math.floor(src.width*rx0)),x1=Math.min(src.width,Math.ceil(src.width*rx1)),sw=Math.max(1,x1-x0),scale=5;
  const tmp=document.createElement('canvas');tmp.width=sw;tmp.height=src.height;const g=tmp.getContext('2d',{willReadFrequently:true});g.drawImage(src,x0,0,sw,src.height,0,0,sw,src.height);
  const id=g.getImageData(0,0,sw,tmp.height),od=g.createImageData(sw,tmp.height);
  for(let y=0;y<tmp.height;y++)for(let x=0;x<sw;x++){const i=(y*sw+x)*4,l=id.data[i]*.299+id.data[i+1]*.587+id.data[i+2]*.114,v=l>threshold?0:255;od.data[i]=od.data[i+1]=od.data[i+2]=v;od.data[i+3]=255}
  g.putImageData(od,0,0);const out=document.createElement('canvas');out.width=sw*scale;out.height=tmp.height*scale;const og=out.getContext('2d');og.imageSmoothingEnabled=false;og.fillStyle='#fff';og.fillRect(0,0,out.width,out.height);og.drawImage(tmp,0,0,out.width,out.height);return out
}
function paddleResultText(result){
  const items=[...(result?.items||[])].sort((a,b)=>Math.min(...(a.poly||[]).map(p=>p?.[0]??0))-Math.min(...(b.poly||[]).map(p=>p?.[0]??0)));
  const text=items.map(x=>String(x.text||'').trim()).filter(Boolean).join('').trim();
  const score=items.length?items.reduce((n,x)=>n+Number(x.score||0),0)/items.length:0;
  return{text,score}
}
async function recognizeNamePaddle(ocr,rowCanvas){
  const thresholds=[112,128,145],canvases=[];
  for(const th of thresholds){canvases.push(paddlePartCanvas(rowCanvas,'surname',th));canvases.push(paddlePartCanvas(rowCanvas,'given',th))}
  const results=await ocr.predict(canvases,{textRecScoreThresh:.18,textDetThresh:.18,textDetBoxThresh:.20,textDetUnclipRatio:1.30});
  const surnames=[],givens=[],raw=[],scores=[];
  for(let i=0;i<(results||[]).length;i++){const x=paddleResultText(results[i]),part=i%2===0?'S':'G';if(x.text){const v=ocrNamePart(x.text);if(v){(part==='S'?surnames:givens).push(v);raw.push(part+':'+v+'('+Math.round(x.score*100)+'%)');scores.push(x.score)}}}
  const su=[...new Set(surnames)],gi=[...new Set(givens)],names=[];for(const a of su)for(const b of gi)names.push((a+' '+b).trim());
  const parsed={name:names[0]||'',names:[...new Set(names)],surname:su[0]||'',given:gi[0]||'',surnames:su,givens:gi,age:'',hand:'',pos:'',text:raw.join('｜')};
  const cm=candidateMatch(parsed),vis=visualCandidateMatch(rowCanvas,parsed);
  let chosen=cm;if(vis?.match&&(!cm?.match||vis.match.score>(cm.match?.score||cm.candidates?.[0]?.score||0)+.035))chosen=vis;
  return{parsed,cm:chosen,raw:raw.join('｜'),confidence:scores.length?Math.max(...scores):0}
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
function visualCandidateMatch(canvas,parsed){
  const sep=detectNameSeparator(canvas),surnameTarget=targetWordBitmap(canvas,.115,Math.max(.18,sep.left-.008),108),givenTarget=targetWordBitmap(canvas,Math.min(.50,sep.right+.008),.575,108);
  if(!surnameTarget&&!givenTarget)return null;
  let pool=state.players;const gates=[];
  if(parsed.pos)gates.push(p=>p._position===POSMAP[parsed.pos]);
  if(parsed.hand)gates.push(p=>String(p['投/打']||'').replace('／','/')===parsed.hand);
  for(const gate of gates){const n=pool.filter(gate);if(n.length)pool=n}
  const surnameTexts=[...new Set([parsed.surname,...(parsed.surnames||[])].filter(Boolean))];
  if(surnameTexts.length){
    const scored=pool.map(p=>{const q=splitPlayerName(p['名前']),t=Math.max(...surnameTexts.map(x=>nameSimilarity(x,q.surname)),0);return{p,t}}).sort((a,b)=>b.t-a.t);
    const best=scored[0]?.t||0;if(best>=.48){const n=scored.filter(x=>x.t>=Math.max(.42,best-.08)).map(x=>x.p);if(n.length&&n.length<=220)pool=n}
  }
  if(surnameTarget){const n=pool.filter(p=>Math.abs([...splitPlayerName(p['名前']).surname].length-surnameTarget.charCount)<=1);if(n.length)pool=n}
  if(givenTarget){const n=pool.filter(p=>Math.abs([...splitPlayerName(p['名前']).given].length-givenTarget.charCount)<=1);if(n.length)pool=n}
  const givenTexts=[...new Set([parsed.given,...(parsed.givens||[])].filter(Boolean))];
  const scored=pool.map(p=>{
    const q=splitPlayerName(p['名前']),ss=surnameTarget?visualWordSimilarity(surnameTarget,q.surname):0,gs=givenTarget?visualWordSimilarity(givenTarget,q.given):0,den=(surnameTarget?.45:0)+(givenTarget?.55:0)||1,visual=(ss*.45+gs*.55)/den;
    const ts=surnameTexts.length?Math.max(...surnameTexts.map(x=>nameSimilarity(x,q.surname)),0):0,tg=givenTexts.length?Math.max(...givenTexts.map(x=>nameSimilarity(x,q.given)),0):0,textBonus=(ts*.035+tg*.025);
    let meta=0,bonus=textBonus;if(parsed.pos&&p._position===POSMAP[parsed.pos]){meta++;bonus+=.025}if(parsed.hand&&String(p['投/打']||'').replace('／','/')===parsed.hand){meta++;bonus+=.035}if(parsed.age&&String(p['年齢']||'')===parsed.age)bonus+=.006;
    return{p,score:Math.min(1,visual+bonus),visualScore:visual,surnameScore:ss,givenScore:gs,nameScore:visual,meta,textSurname:ts,textGiven:tg}
  }).sort((a,b)=>b.score-a.score),best=scored[0],second=scored[1];
  if(!best)return null;const margin=best.score-(second?.score||0),accept=(best.visualScore>=.78&&margin>=.03)||(best.visualScore>=.71&&best.meta>=1&&margin>=.025)||(best.visualScore>=.67&&best.meta>=2&&margin>=.02);
  return{match:accept?best:null,candidates:scored.slice(0,12),margin,method:'visual'}
}

const CV_FONT_CANDIDATES=['"Hiragino Sans"','"Yu Gothic"','"Meiryo"','"Noto Sans JP"', 'sans-serif','serif'];
const cvGlyphTemplateCache=new Map();
function isIOSLike(){const ua=navigator.userAgent||'';return /iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
function cvAvailableFonts(){if(state._cvFonts)return state._cvFonts;const out=[];for(const f of CV_FONT_CANDIDATES){try{if(f==='sans-serif'||f==='serif'||document.fonts?.check?.('24px '+f))out.push(f)}catch{}}state._cvFonts=[...new Set(out)].slice(0,3);if(!state._cvFonts.length)state._cvFonts=['sans-serif'];return state._cvFonts}
function cvMaskRegion(src,rx0,rx1,threshold=108){
  const sx=Math.max(0,Math.floor(src.width*rx0)),ex=Math.min(src.width,Math.ceil(src.width*rx1)),sw=Math.max(1,ex-sx),g=src.getContext('2d',{willReadFrequently:true}),id=g.getImageData(sx,0,sw,src.height).data,pts=[];
  for(let y=0;y<src.height;y++)for(let x=0;x<sw;x++){const i=(y*sw+x)*4,l=id[i]*.299+id[i+1]*.587+id[i+2]*.114;if(l>threshold)pts.push([x,y])}
  if(!pts.length)return null;let minx=sw,miny=src.height,maxx=0,maxy=0;for(const [x,y] of pts){if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y}
  minx=Math.max(0,minx-1);miny=Math.max(0,miny-1);maxx=Math.min(sw-1,maxx+1);maxy=Math.min(src.height-1,maxy+1);
  const w=maxx-minx+1,h=maxy-miny+1,bits=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((miny+y)*sw+(minx+x))*4,l=id[i]*.299+id[i+1]*.587+id[i+2]*.114;bits[y*w+x]=l>threshold?1:0}
  return{bits,w,h,splitCache:new Map(),ratio:w/Math.max(1,h)}
}
function cvNormalizeCell(bits,w,h,size=20){
  let minx=w,miny=h,maxx=-1,maxy=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(bits[y*w+x]){if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y}
  const out=new Uint8Array(size*size);if(maxx<minx||maxy<miny)return{bits:out,w:size,h:size};
  const bw=maxx-minx+1,bh=maxy-miny+1,scale=Math.min((size-2)/bw,(size-2)/bh),dw=Math.max(1,Math.round(bw*scale)),dh=Math.max(1,Math.round(bh*scale)),ox=Math.floor((size-dw)/2),oy=Math.floor((size-dh)/2);
  for(let yy=0;yy<dh;yy++)for(let xx=0;xx<dw;xx++){const sx=minx+Math.min(bw-1,Math.floor(xx/Math.max(scale,.001))),sy=miny+Math.min(bh-1,Math.floor(yy/Math.max(scale,.001)));if(bits[sy*w+sx])out[(oy+yy)*size+ox+xx]=1}
  return{bits:out,w:size,h:size}
}
function cvDescriptor(bm){
  const n=bm.w,feat=[];for(let y=0;y<n;y++){let v=0;for(let x=0;x<n;x++)v+=bm.bits[y*n+x];feat.push(v/n)}
  for(let x=0;x<n;x++){let v=0;for(let y=0;y<n;y++)v+=bm.bits[y*n+x];feat.push(v/n)}
  const z=4,cell=n/z;for(let gy=0;gy<z;gy++)for(let gx=0;gx<z;gx++){let v=0;for(let y=Math.floor(gy*cell);y<Math.floor((gy+1)*cell);y++)for(let x=Math.floor(gx*cell);x<Math.floor((gx+1)*cell);x++)v+=bm.bits[y*n+x];feat.push(v/(cell*cell))}
  let ink=0;for(const b of bm.bits)ink+=b;feat.push(ink/(n*n));return feat
}
function cvFeatureSimilarity(a,b){if(!a||!b||a.length!==b.length)return 0;let d=0;for(let i=0;i<a.length;i++)d+=Math.abs(a[i]-b[i]);return Math.max(0,1-d/a.length)}
function cvRenderedGlyphFeatures(ch){
  if(cvGlyphTemplateCache.has(ch))return cvGlyphTemplateCache.get(ch);const out=[];
  for(const family of cvAvailableFonts()){
    const c=document.createElement('canvas');c.width=52;c.height=52;const g=c.getContext('2d',{willReadFrequently:true});g.fillStyle='#000';g.fillRect(0,0,52,52);g.fillStyle='#fff';g.textBaseline='middle';g.textAlign='center';g.font='700 36px '+family;g.fillText(ch,26,26);
    const id=g.getImageData(0,0,52,52).data,bits=new Uint8Array(52*52);for(let i=0,j=0;i<id.length;i+=4,j++)bits[j]=id[i]>80?1:0;out.push(cvDescriptor(cvNormalizeCell(bits,52,52,20)))
  }
  cvGlyphTemplateCache.set(ch,out);return out
}
function cvSplitFeatures(target,count){
  count=Math.max(1,Math.min(12,count|0));if(!target)return[];if(target.splitCache.has(count))return target.splitCache.get(count);
  const out=[],step=target.w/count;for(let i=0;i<count;i++){const x0=Math.floor(i*step),x1=i===count-1?target.w:Math.floor((i+1)*step),w=Math.max(1,x1-x0),bits=new Uint8Array(w*target.h);for(let y=0;y<target.h;y++)for(let x=0;x<w;x++)bits[y*w+x]=target.bits[y*target.w+x0+x];out.push(cvDescriptor(cvNormalizeCell(bits,w,target.h,20)))}target.splitCache.set(count,out);return out
}
function cvWordScore(target,word){
  const chars=[...String(word||'').replace(/\s+/g,'')];if(!target||!chars.length||chars.length>12)return 0;const tf=cvSplitFeatures(target,chars.length);let sum=0,min=1;
  for(let i=0;i<chars.length;i++){let best=0;for(const tpl of cvRenderedGlyphFeatures(chars[i]))best=Math.max(best,cvFeatureSimilarity(tf[i],tpl));sum+=best;if(best<min)min=best}
  const mean=sum/chars.length,expected=Math.max(.7,chars.length*.86),aspect=Math.exp(-Math.abs(Math.log(Math.max(.15,target.ratio)/expected))*.26);return(Math.max(0,mean*.78+min*.22))*aspect
}
function cvClassifyFinite(src,rx0,rx1,labels,threshold=108){
  const target=cvMaskRegion(src,rx0,rx1,threshold);if(!target)return{value:'',score:0,margin:0};const arr=labels.map(v=>({value:v,score:cvWordScore(target,v)})).sort((a,b)=>b.score-a.score),a=arr[0],b=arr[1];if(!a)return{value:'',score:0,margin:0};return{value:a.value,score:a.score,margin:a.score-(b?.score||0)}
}
function cvParsedMeta(canvas){
  const pos=cvClassifyFinite(canvas,.012,.105,['投','捕','一','二','三','遊','外'],105);
  const age=cvClassifyFinite(canvas,.60,.75,['18歳','19歳','20歳','21歳','22歳','23歳','24歳','18','19','20','21','22','23','24'],105);
  const hand=cvClassifyFinite(canvas,.78,.985,['右/右','右/左','左/左','左/右','右/両','左/両','右／右','右／左','左／左','左／右','右／両','左／両'],105);
  const cleanAge=(String(age.value).match(/(18|19|20|21|22|23|24)/)||[])[1]||'',cleanHand=String(hand.value).replace('／','/');
  return{pos:pos.score>=.53&&pos.margin>=.018?pos.value:'',age:age.score>=.55&&age.margin>=.015?cleanAge:'',hand:hand.score>=.54&&hand.margin>=.015?cleanHand:'',_cvMeta:{pos,age,hand}}
}
function cvCandidateMatch(canvas){
  const sep=detectNameSeparator(canvas),surnameTarget=cvMaskRegion(canvas,.115,Math.max(.18,sep.left-.008),106),givenTarget=cvMaskRegion(canvas,Math.min(.50,sep.right+.008),.575,106),parsed=cvParsedMeta(canvas);
  if(!surnameTarget&&!givenTarget)return{parsed,match:null,candidates:[],margin:0,method:'cv'};
  let pool=state.players;
  const pm=parsed._cvMeta?.pos,hm=parsed._cvMeta?.hand;
  if(parsed.pos&&pm?.score>=.64&&pm?.margin>=.03){const n=pool.filter(p=>p._position===POSMAP[parsed.pos]);if(n.length>30)pool=n}
  if(parsed.hand&&hm?.score>=.66&&hm?.margin>=.03){const n=pool.filter(p=>String(p['投/打']||'').replace('／','/')===parsed.hand);if(n.length>20)pool=n}
  const sr=surnameTarget?.ratio||0,gr=givenTarget?.ratio||0,sGuess=sr?Math.max(1,Math.round(sr/.86)):0,gGuess=gr?Math.max(1,Math.round(gr/.86)):0;
  let lengthPool=pool;if(sGuess||gGuess){const n=pool.filter(p=>{const q=splitPlayerName(p['名前']),sl=[...q.surname].length,gl=[...q.given].length;return(!sGuess||Math.abs(sl-sGuess)<=1)&&(!gGuess||Math.abs(gl-gGuess)<=1)});if(n.length>=80)lengthPool=n}
  const rough=lengthPool.map(p=>{const q=splitPlayerName(p['名前']),sl=[...q.surname].length,gl=[...q.given].length;let penalty=0;if(sr)penalty+=Math.abs(sr-sl*.86)*.035;if(gr)penalty+=Math.abs(gr-gl*.86)*.03;let meta=0,bonus=0;if(parsed.pos&&p._position===POSMAP[parsed.pos]){meta++;bonus+=.018}if(parsed.hand&&String(p['投/打']||'').replace('／','/')===parsed.hand){meta++;bonus+=.022}if(parsed.age&&String(p['年齢']||'')===parsed.age){meta++;bonus+=.012}return{p,q,rough:bonus-penalty,meta,bonus}}).sort((a,b)=>b.rough-a.rough).slice(0,Math.min(700,lengthPool.length));
  const scache=new Map(),gcache=new Map(),scoreWord=(target,word,cache)=>{if(!target)return 0;if(cache.has(word))return cache.get(word);const v=cvWordScore(target,word);cache.set(word,v);return v};
  const scored=rough.map(x=>{const ss=scoreWord(surnameTarget,x.q.surname,scache),gs=scoreWord(givenTarget,x.q.given,gcache),den=(surnameTarget?.46:0)+(givenTarget?.54:0)||1,visual=(ss*.46+gs*.54)/den,score=Math.max(0,Math.min(1,visual*.94+x.bonus));return{p:x.p,score,visualScore:visual,surnameScore:ss,givenScore:gs,nameScore:visual,meta:x.meta}}).sort((a,b)=>b.score-a.score);
  const best=scored[0],second=scored[1],margin=(best?.score||0)-(second?.score||0);
  const accept=!!best&&((best.visualScore>=.79&&margin>=.055)||(best.visualScore>=.75&&best.meta>=2&&margin>=.045)||(best.visualScore>=.73&&best.meta>=3&&margin>=.038));
  const candidates=(best?.visualScore||0)>=.48?scored.slice(0,12):[];
  return{parsed,match:accept?best:null,candidates,margin,method:'cv'}
}
async function cvAnalyzeRows(rows){
  for(let i=0;i<rows.length;i++){const row=rows[i];setBatchProgress(4+56*(i/Math.max(1,rows.length)),'本機固定版面 CV '+(i+1)+'/'+rows.length);try{const r=cvCandidateMatch(row.canvas);row.parsed=r.parsed;row.match=r.match||null;row.candidates=r.candidates;row.score=row.match?.score||r.candidates?.[0]?.score||0;row.status=row.match?'確認':'候選';row.raw='CV';row.cvMargin=r.margin}catch(e){row.raw='CVERR:'+String(e.message||e);row.candidates=[]}if(i%6===0){state.batchRows=consolidateRows(rows.slice(0,i+1),0);renderBatchResults();await new Promise(requestAnimationFrame)}}
}
function cvFooterTotal(totalCanvas){
  const labels=[];for(let n=20;n<=200;n++)labels.push(String(n)+'人');
  const votes=[];
  for(const th of [92,108,124]){const target=cvMaskRegion(totalCanvas,0,1,th);if(!target)continue;const scored=labels.map(v=>({v,score:cvWordScore(target,v)})).sort((a,b)=>b.score-a.score),a=scored[0],b=scored[1];if(a)votes.push({n:parseInt(a.v,10),score:a.score,margin:a.score-(b?.score||0)})}
  if(!votes.length)return 0;const groups=new Map();for(const v of votes){const g=groups.get(v.n)||[];g.push(v);groups.set(v.n,g)}
  const ranked=[...groups.entries()].map(([n,vs])=>({n,agree:vs.length,score:vs.reduce((a,x)=>a+x.score,0)/vs.length,margin:vs.reduce((a,x)=>a+x.margin,0)/vs.length})).sort((a,b)=>b.agree-a.agree||b.score-a.score||b.margin-a.margin),best=ranked[0];
  return best&&best.agree===3&&best.score>=.58&&best.margin>=.02?best.n:0
}
function mergeRowOCR(row,parsed,cm,raw,confidence=0){
  const merged=mergeParsedNameEvidence(row.parsed,parsed),textCM=candidateMatch(merged),vis=visualCandidateMatch(row.canvas,merged);
  const options=[row.match?{match:row.match,candidates:row.candidates||[]}:null,cm,textCM,vis].filter(Boolean),quality=o=>o.match?.score||o.candidates?.[0]?.score||0;
  options.sort((a,b)=>quality(b)-quality(a));const best=options[0]||{match:null,candidates:row.candidates||[]};
  row.parsed=merged;row.match=best.match||null;row.candidates=best.candidates?.length?best.candidates:(row.candidates||[]);row.score=row.match?.score||row.candidates?.[0]?.score||0;row.ocrConfidence=Math.max(row.ocrConfidence||0,confidence||0);row.raw=[row.raw,raw].filter(Boolean).join('｜');row.status=row.match?'確認':'候選';
}
function grayRegion(src,rx0,rx1,scale=5,contrast=1.8){
  const sx=Math.max(0,Math.round(src.width*rx0)),ex=Math.min(src.width,Math.round(src.width*rx1)),sw=Math.max(1,ex-sx),tmp=document.createElement('canvas');
  tmp.width=sw;tmp.height=src.height;const g=tmp.getContext('2d',{willReadFrequently:true});g.drawImage(src,sx,0,sw,src.height,0,0,sw,src.height);
  const id=g.getImageData(0,0,sw,tmp.height);for(let i=0;i<id.data.length;i+=4){const l=id.data[i]*.299+id.data[i+1]*.587+id.data[i+2]*.114,v=Math.max(0,Math.min(255,Math.round((l-128)*contrast+128)));id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=255}g.putImageData(id,0,0);
  const out=document.createElement('canvas');out.width=sw*scale;out.height=tmp.height*scale;const og=out.getContext('2d');og.imageSmoothingEnabled=true;og.drawImage(tmp,0,0,out.width,out.height);return out
}
async function recognizeNameTesseractFast(worker,canvas,threshold=125,mode='binary'){
  const sep=detectNameSeparator(canvas),mk=(a,b)=>mode==='gray'?grayRegion(canvas,a,b,5,1.8):binaryRegion(canvas,a,b,threshold,5);
  const a=await recognizeText(worker,mk(.115,Math.max(.18,sep.left-.008)));
  const b=await recognizeText(worker,mk(Math.min(.50,sep.right+.008),.575));
  const surname=ocrNamePart(a.text),given=ocrNamePart(b.text),name=(surname+' '+given).trim();
  return{parsed:{name,names:[name].filter(Boolean),surname,given,surnames:[surname].filter(Boolean),givens:[given].filter(Boolean),age:'',hand:'',pos:'',text:[a.text,b.text].filter(Boolean).join('｜')},raw:(mode==='gray'?'G:':'B:')+'S:'+a.text+'｜G:'+b.text,confidence:Math.round(((a.confidence||0)+(b.confidence||0))/2)}
}

async function tesseractFooterTotal(worker,screens){
  const totals=[];try{await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789人合計投手野手'})}catch{}
  for(const sc of screens){
    try{
      let r=await recognizeText(worker,grayRegion(sc.footer.canvas,0,1,3,1.35)),n=parseExpectedTotal(r.text);
      if(!(n>=20&&n<=200)){r=await recognizeText(worker,binaryCanvas(sc.footer.canvas,125,{scale:3}));n=parseExpectedTotal(r.text)}
      if(n>=20&&n<=200)totals.push(n)
    }catch{}
  }
  try{await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:''})}catch{}return chooseExpectedTotal(totals,state.expectedTotal)
}

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
function chooseExpectedTotal(values,fallback=0){
  const xs=(values||[]).map(Number).filter(n=>Number.isInteger(n)&&n>=20&&n<=200);
  if(!xs.length)return fallback||0;
  const freq=new Map();for(const n of xs)freq.set(n,(freq.get(n)||0)+1);
  const ranked=[...freq.entries()].sort((a,b)=>b[1]-a[1]||Math.abs(a[0]-(fallback||a[0]))-Math.abs(b[0]-(fallback||b[0]))||a[0]-b[0]);
  if(ranked[0][1]>=2)return ranked[0][0];
  if(fallback&&xs.some(n=>Math.abs(n-fallback)<=2))return fallback;
  const sorted=[...xs].sort((a,b)=>a-b),mid=sorted[Math.floor(sorted.length/2)];
  return mid;
}
function parseExpectedTotal(text){const t=cleanOCR(text);let m=t.match(/(?:合計|含計|会計|馬軒)[^0-9]{0,8}(\d{2,3})\s*人/);if(m)return +m[1];const nums=[...t.matchAll(/(\d{2,3})\s*人/g)].map(x=>+x[1]).filter(n=>n>=20&&n<=200);return nums.length?Math.max(...nums):0}
function mergeEvidence(a,b){const pa=a.parsed||{},pb=b.parsed||{},parsed={...pa,names:[...new Set([...(pa.names||[]),...(pb.names||[])].filter(Boolean))],surnames:[...new Set([pa.surname,...(pa.surnames||[]),pb.surname,...(pb.surnames||[])].filter(Boolean))],givens:[...new Set([pa.given,...(pa.givens||[]),pb.given,...(pb.givens||[])].filter(Boolean))]};if(!parsed.age)parsed.age=pb.age;if(!parsed.hand)parsed.hand=pb.hand;if(!parsed.pos)parsed.pos=pb.pos;const hasText=parsed.names.length||parsed.surnames.length||parsed.givens.length,cm=hasText?candidateMatch(parsed):null,qa=(a.match?.score||a.candidates?.[0]?.score||0),qb=(b.match?.score||b.candidates?.[0]?.score||0),keep=qb>qa?b:a;const cq=(cm?.match?.score||cm?.candidates?.[0]?.score||0),chosen=cm?.candidates?.length&&cq>Math.max(qa,qb)?cm:{match:keep.match||null,candidates:keep.candidates||[]};return{...keep,parsed,raw:[a.raw,b.raw].filter(Boolean).join(' || '),ocrConfidence:Math.max(a.ocrConfidence||0,b.ocrConfidence||0),match:chosen.match||null,candidates:chosen.candidates||[],score:chosen.match?.score||chosen.candidates?.[0]?.score||0,firstIndex:Math.min(a.firstIndex??9999,b.firstIndex??9999),sources:[...(a.sources||[`${a.file}#${a.row}`]),...(b.sources||[`${b.file}#${b.row}`])]}}
function rowNameSignature(canvas){
  const sep=detectNameSeparator(canvas);
  const parts=[
    cvMaskRegion(canvas,.115,Math.max(.18,sep.left-.008),108),
    cvMaskRegion(canvas,Math.min(.50,sep.right+.008),.575,108)
  ];
  return parts.map(p=>p?cvDescriptor(cvNormalizeCell(p.bits,p.w,p.h,28)):null)
}
function rowNameSimilarity(a,b){
  const sa=a._nameSig||(a._nameSig=rowNameSignature(a.canvas)),sb=b._nameSig||(b._nameSig=rowNameSignature(b.canvas));
  let sum=0,n=0,min=1;
  for(let i=0;i<2;i++)if(sa[i]&&sb[i]){const v=cvFeatureSimilarity(sa[i],sb[i]);sum+=v;n++;if(v<min)min=v}
  if(!n)return 0;
  const mean=sum/n;
  return n===2?mean*.85+min*.15:mean*.90
}
function rowCandidateAgreement(a,b){
  const ida=a.match?.p?._uid||a.resolved?.p?._uid,idb=b.match?.p?._uid||b.resolved?.p?._uid;
  if(ida&&idb&&ida===idb)return 1;
  const A=new Set((a.candidates||[]).slice(0,5).map(x=>x.p?._uid).filter(Boolean)),B=(b.candidates||[]).slice(0,5).map(x=>x.p?._uid).filter(Boolean);
  if(B.some(x=>A.has(x)))return .72;
  const pa=a.parsed||{},pb=b.parsed||{};
  if(pa.pos&&pb.pos&&pa.pos!==pb.pos)return -.35;
  if(pa.hand&&pb.hand&&pa.hand!==pb.hand)return -.35;
  return 0
}
function rowOverlapScore(a,b){
  const visual=rowNameSimilarity(a,b),agree=rowCandidateAgreement(a,b);
  return {visual,agree,score:Math.max(0,Math.min(1.15,visual+Math.max(0,agree)*.12))};
}
function pageOverlapCandidates(prev,next){
  const max=Math.min(10,prev.length,next.length),out=[{k:0,score:0,min:1,strict:true}];
  for(let k=1;k<=max;k++){
    const ss=[];let agree=0,bad=false;
    for(let i=0;i<k;i++){const z=rowOverlapScore(prev[prev.length-k+i],next[i]);ss.push(z.score);agree+=z.agree;if(z.agree<0)bad=true}
    const mean=ss.reduce((a,x)=>a+x,0)/k,min=Math.min(...ss),avgAgree=agree/k;
    const strict=!bad&&(k===1?mean>=.985:(mean>=.90&&min>=.79));
    const supported=!bad&&k>=2&&mean>=.77&&min>=.68&&avgAgree>=.18;
    if(strict||supported)out.push({k,score:mean+(supported&&!strict?-.035:0),min,strict,supported,avgAgree});
  }
  return out.sort((a,b)=>(b.strict?1:0)-(a.strict?1:0)||b.score-a.score||b.k-a.k)
}
function choosePageOverlaps(pages,expected=0){
  const pairs=[];for(let i=0;i+1<pages.length;i++)pairs.push(pageOverlapCandidates(pages[i],pages[i+1]));
  const need=expected?Math.max(0,pages.reduce((n,p)=>n+p.length,0)-expected):0;
  if(need){
    let dp=new Map([[0,{score:0,ks:[]}]]);
    for(const opts of pairs){
      const nx=new Map();
      for(const [sum,st] of dp)for(const o of opts){
        const ns=sum+o.k;if(ns>need)continue;
        const bonus=o.k?o.score*o.k:0,v={score:st.score+bonus,ks:[...st.ks,o.k]},old=nx.get(ns);
        if(!old||v.score>old.score)nx.set(ns,v)
      }
      dp=nx;
    }
    if(dp.has(need))return dp.get(need).ks;
  }
  return pairs.map(opts=>opts.find(o=>o.k>0)?.k||0)
}
function consolidateRows(raw,expected=0){
  if(!raw.length)return[];
  const pages=[];let cur=null;
  for(const r of raw){if(!cur||cur.file!==r.file){cur={file:r.file,rows:[]};pages.push(cur)}cur.rows.push(r)}
  const ks=choosePageOverlaps(pages.map(p=>p.rows),expected),parent=raw.map((_,i)=>i),index=new Map(raw.map((r,i)=>[r,i]));
  const find=x=>parent[x]===x?x:(parent[x]=find(parent[x])),join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
  for(let p=0;p<ks.length;p++){const k=ks[p]||0,A=pages[p].rows,B=pages[p+1].rows;for(let i=0;i<k;i++)join(index.get(A[A.length-k+i]),index.get(B[i]))}
  const groups=new Map();
  for(let i=0;i<raw.length;i++){const root=find(i),g=groups.get(root)||[];g.push(raw[i]);groups.set(root,g)}
  const out=[];
  for(const g of groups.values()){let row={...g[0],sources:[g[0].file+'#'+g[0].row]};for(let i=1;i<g.length;i++)row=mergeEvidence(row,g[i]);out.push(row)}
  out.sort((a,b)=>(a.firstIndex??9999)-(b.firstIndex??9999));
  return out
}
function resolveUniqueCandidates(rows){for(const r of rows)r.resolved=null;const used=new Set(rows.filter(r=>r.match?.p?._uid).map(r=>r.match.p._uid)),pending=rows.filter(r=>!r.match);for(let guard=0;guard<rows.length;guard++){let pick=null;for(const r of pending){if(r.resolved)continue;const av=(r.candidates||[]).filter(x=>!used.has(x.p._uid));if(!av.length)continue;const a=av[0],b=av[1],gap=a.score-(b?.score||0),quality=a.score+gap*.45+a.meta*.015;const safe=(a.score>=.72&&gap>=.035)||(a.score>=.67&&a.meta>=1&&gap>=.04)||(a.score>=.64&&a.meta>=2&&gap>=.045);if(!safe)continue;if(!pick||quality>pick.quality)pick={r,a,gap,quality}}if(!pick)break;pick.r.resolved=pick.a;pick.r.status='推定';used.add(pick.a.p._uid)}return rows}
function dedupeRecognizedRows(rows,expected=0){const seen=new Map(),rest=[];for(const r of rows){const p=r.match?.p||r.resolved?.p;if(p?._uid){const old=seen.get(p._uid),quality=(r.match?.score||r.resolved?.score||r.score||0)+(r.ocrConfidence||0)/5000;if(!old||quality>old.quality)seen.set(p._uid,{row:r,quality})}else rest.push(r)}let out=[...seen.values()].map(x=>x.row).concat(rest);out.sort((a,b)=>(a.firstIndex??9999)-(b.firstIndex??9999));if(expected&&out.length>expected)out=out.slice(0,expected);return out}
function batchDisplayPlayer(r){return r.match?.p||r.resolved?.p||null}
const GRADE_SCORE={'SS':15,'S+':14,'S':13,'A+':12,'A':11,'B+':10,'B':9,'C+':8,'C':7,'D+':6,'D':5,'E+':4,'E':3,'F':2,'G':1};
function gradeScore(v){const t=String(v??'').trim().toUpperCase();if(t in GRADE_SCORE)return GRADE_SCORE[t];const n=parseFloat(t);return Number.isFinite(n)?n:-999}
function abilitySortTuple(p,key){if(!p)return[-999,-999];const raw=String(p[key]??'').trim();if(!raw||raw==='—'||raw==='–')return[-999,-999];const parts=raw.split(/[\/／]/).map(x=>x.trim()).filter(Boolean);if(key==='球速'){const nums=parts.map(x=>parseFloat(x)).filter(Number.isFinite);return[nums.length?nums[nums.length-1]:-999,nums.length?nums[0]:-999]}return[gradeScore(parts.length>1?parts[parts.length-1]:parts[0]),gradeScore(parts[0])]}
function batchCompare(a,b,key){const pa=batchDisplayPlayer(a),pb=batchDisplayPlayer(b),rank={S:0,A:1,B:2,C:3,D:4};if(key==='screen')return(a.firstIndex??9999)-(b.firstIndex??9999);if(key==='name')return String(pa?.['名前']||'').localeCompare(String(pb?.['名前']||''),'ja');if(key==='rank')return(rank[pa?.['ランク']]??9)-(rank[pb?.['ランク']]??9)||String(pa?.['名前']||'').localeCompare(String(pb?.['名前']||''),'ja');if(key==='confidence')return(b.match?.score||b.resolved?.score||b.candidates?.[0]?.score||0)-(a.match?.score||a.resolved?.score||a.candidates?.[0]?.score||0);const [a1,a2]=abilitySortTuple(pa,key),[b1,b2]=abilitySortTuple(pb,key);if(a1!==b1)return b1-a1;if(a2!==b2)return b2-a2;return(rank[pa?.['ランク']]??9)-(rank[pb?.['ランク']]??9)}
function sortBatchRows(rows){let out=[...rows].sort((a,b)=>batchCompare(a,b,state.batchSort));if(state.batchSortDir==='desc'&&['screen','name','rank'].includes(state.batchSort))out.reverse();if(state.batchSortDir==='asc'&&!['screen','name','rank'].includes(state.batchSort))out.reverse();return out}
function setBatchSort(key){if(state.batchSort===key)state.batchSortDir=state.batchSortDir==='asc'?'desc':'asc';else{state.batchSort=key;state.batchSortDir=['screen','name','rank'].includes(key)?'asc':'desc'}renderBatchResults()}
function batchGroupName(p,r){const pos=p?._position||POSMAP[r?.parsed?.pos]||'';if(pos==='投手')return'投手';if(pos==='捕手')return'捕手';if(['一壘手','二壘手','三壘手','游擊手'].includes(pos))return'內野手';if(pos==='外野手')return'外野手';return'其他'}
const BATCH_COMMON=['_screen','_status','名前','ランク','年齢','成長','投/打','出身','高校','大学','社会人','_position'];
const BATCH_PITCH=[...BATCH_COMMON,'タイプ','体力','球速','球威','制球','精神','守備','捕球','肩力','送球','スライダー','速スラ','カットB','カーブ','Sカーブ','ドロップ','シュート','速シュート','シンカー','スクリュー','速シンカー','サークルC','2シーム','Cアップ','フォーク','SFF','縦スラ','パーム','ナックル','スキル1','スキル2','スキル3','モデル'];
const BATCH_BAT=[...BATCH_COMMON,'体力','右巧','左巧','長打','バント','選球眼','走力','走塁','精神','守備','捕球','肩力','送球','リード','捕手','一塁','二塁','三塁','遊撃','外野','スキル1','スキル2','スキル3','モデル'];
function batchHeaderLabel(k){return k==='_screen'?'#':k==='_status'?'狀態':k==='_position'?'守位':(HEADER_ZH[k]||k)}
function batchSortArrow(k){return state.batchSort===k?(state.batchSortDir==='asc'?' ↑':' ↓'):''}
function batchCell(r,p,k,displayIndex){if(k==='_screen')return String(displayIndex+1);if(k==='_status')return r.match?'確認':r.resolved?'推定':'候選';if(k==='_position')return esc(p?._position||POSMAP[r.parsed?.pos]||'—');if(k==='名前'){if(!p){const c=(r.candidates||[]).filter(x=>x?.p?.['名前']).slice(0,3);if(!c.length)return '未辨識';const link=x=>`<span class="name-link" data-uid="${esc(x.p._uid||'')}">${esc(x.p['名前'])}</span>`;return `<span class="candidate-only">${link(c[0])}<small class="candidate-note">待確認${c.length>1?'｜備選：'+c.slice(1).map(link).join(' ／ '):''}</small></span>`}const alts=(r.candidates||[]).filter(x=>x.p._uid!==p._uid).slice(0,2),alt=alts.length?`<small class="candidate-note">次選：${alts.map(x=>esc(x.p['名前'])).join(' / ')}</small>`:'';return `<span class="name-link" data-uid="${esc(p._uid)}">${esc(p['名前'])}</span>${alt}`}return esc(p?.[k]||'—')}
function renderBatchGroup(title,rows,cols){const sorted=sortBatchRows(rows),sortable=new Set(['screen','name','rank','年齢','体力','球速','球威','制球','精神','守備','捕球','肩力','送球','右巧','左巧','長打','バント','選球眼','走力','走塁','リード','捕手','一塁','二塁','三塁','遊撃','外野']);let h=`<section class="batch-group"><h3>${esc(title)} <small>${rows.length}</small></h3><div class="table-shell"><table class="data-table batch-detail-table"><thead><tr>`;for(const k of cols){const sk=k==='_screen'?'screen':k==='名前'?'name':k==='ランク'?'rank':k;h+=sortable.has(sk)?`<th class="sortable" data-sort="${esc(sk)}">${esc(batchHeaderLabel(k))}${batchSortArrow(sk)}</th>`:`<th>${esc(batchHeaderLabel(k))}</th>`}h+='</tr></thead><tbody>';sorted.forEach((r,i)=>{const p=batchDisplayPlayer(r);h+='<tr>'+cols.map(k=>`<td class="${k==='名前'?'name':''} ${k==='_status'?(r.match?'good':r.resolved?'estimate':'unresolved'):''}">${batchCell(r,p,k,i)}</td>`).join('')+'</tr>'});h+='</tbody></table></div></section>';return h}
async function recognizeText(worker,canvas){const r=await worker.recognize(canvas);return{text:cleanOCR(r?.data?.text||''),confidence:Number(r?.data?.confidence||0)}}
async function runBatch(){
  $('#batchStatus').textContent='本機非 AI 引擎正在載入；請重新整理頁面後再試。';return;
  if(!state.batchFiles.length){alert('請先選擇截圖。');return}
  if(state.players.length<1000){$('#batchStatus').textContent='完整名冊尚未載入，請先到「資料」按更新名冊。';return}
  $('#runBatch').disabled=true;let paddle=null,worker=null,mobileNameOCR=false;
  try{
    const screens=[],all=[];setBatchProgress(1,'分析固定版面…');
    for(const f of state.batchFiles){const im=await loadImage(f),rows=rowCrops(im,f.name).filter(r=>nameInkRatio(r.canvas)>.006);screens.push({file:f.name,footer:footerCrop(im,f.name),total:footerTotalCrop(im,f.name)});all.push(...rows)}
    state.batchRawRows=all.map((r,i)=>({...r,firstIndex:i,status:'待辨識',raw:'',parsed:null,match:null,candidates:[],ocrConfidence:0,score:0}));state.batchRows=[];state.expectedTotal=0;const cvTotals=screens.map(sc=>cvFooterTotal(sc.total.canvas)).filter(n=>n>=20&&n<=200);if(cvTotals.length){const freq=new Map();for(const n of cvTotals)freq.set(n,(freq.get(n)||0)+1);state.expectedTotal=[...freq.entries()].sort((a,b)=>b[1]-a[1]||b[0]-a[0])[0][0]}renderBatchResults();

    // 所有平台先跑同一套固定版面 CV；不需要 PaddleOCR / Tesseract 才能產生候選。
    await cvAnalyzeRows(state.batchRawRows);
    state.batchRows=consolidateRows(state.batchRawRows,0);renderBatchResults();

    const ios=isIOSLike();
    if(ios){
      setBatchProgress(62,'手機：CV 主流程完成，載入本機日文 OCR…');
      // iPhone/iPad 不啟動 PaddleOCR；改用本機 Tesseract 複核低信心姓名。
      const ok=await ensureLocalOCR();
      if(ok){
        try{
          worker=await withTimeout(Tesseract.createWorker('jpn',1,{workerPath:'./vendor/tesseract/worker.min.js',corePath:'./vendor/tesseract-core',langPath:'./vendor/lang'}),45000,'手機 OCR 載入逾時');
          {const n=await tesseractFooterTotal(worker,screens);if(n>=20&&n<=200)state.expectedTotal=n;}
          try{await worker.setParameters({tessedit_pageseg_mode:'8',tessedit_char_whitelist:batchKanjiWhitelist(),user_defined_dpi:'300'})}catch{}
          const uncertain=state.batchRawRows.filter(r=>!r.match||r.score<.84||((r.candidates?.[0]?.score||0)-(r.candidates?.[1]?.score||0))<.045);
          for(let i=0;i<uncertain.length;i++){
            const row=uncertain[i];setBatchProgress(66+18*(i/Math.max(1,uncertain.length)),'手機姓名 OCR '+(i+1)+'/'+uncertain.length);
            try{
              const rr=await recognizeNameTesseractFast(worker,row.canvas,125,'binary');
              mergeRowOCR(row,rr.parsed,null,'M:'+rr.raw,rr.confidence);
              const gap=(row.candidates?.[0]?.score||0)-(row.candidates?.[1]?.score||0);
              if(!row.match&&(row.score<.76||gap<.025)){
                const rr2=await recognizeNameTesseractFast(worker,row.canvas,145,'binary');
                mergeRowOCR(row,rr2.parsed,null,'M2:'+rr2.raw,rr2.confidence);
              }
              mobileNameOCR=true;
            }catch(e){row.raw+='｜MERR:'+String(e.message||e)}
            if(i%3===0){state.batchRows=consolidateRows(state.batchRawRows.slice(0),0);renderBatchResults();await new Promise(requestAnimationFrame)}
          }
          const hard=state.batchRawRows.filter(r=>{const gap=(r.candidates?.[0]?.score||0)-(r.candidates?.[1]?.score||0);return !r.match&&(r.score<.80||gap<.035)});
          if(hard.length){
            try{await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:batchKanjiWhitelist(),user_defined_dpi:'300'})}catch{}
            for(let i=0;i<hard.length;i++){
              const row=hard[i];setBatchProgress(85+10*(i/Math.max(1,hard.length)),'手機灰階 OCR '+(i+1)+'/'+hard.length);
              try{const rr=await recognizeNameTesseractFast(worker,row.canvas,125,'gray');mergeRowOCR(row,rr.parsed,null,'MG:'+rr.raw,rr.confidence);mobileNameOCR=true}catch(e){row.raw+='｜MGERR:'+String(e.message||e)}
              if(i%3===0){state.batchRows=consolidateRows(state.batchRawRows.slice(0),0);renderBatchResults();await new Promise(requestAnimationFrame)}
            }
          }
        }catch(e){console.warn('mobile name OCR',e)}
      }
    }else{
      // 桌機仍與手機共用 CV；PaddleOCR 只做加分複核，不是必要條件。
      setBatchProgress(62,'桌機：CV 主流程完成，嘗試 OCR 複核…');
      try{paddle=await createPaddleOCR()}catch(e){console.warn('PaddleOCR optional',e)}
      if(paddle){
        const totals=[];for(const sc of screens){try{const t=await recognizeFooterPaddle(paddle,sc.footer.canvas),n=parseExpectedTotal(t);if(n)totals.push(n)}catch{}}
        if(totals.length)state.expectedTotal=chooseExpectedTotal(totals,state.expectedTotal);
        const uncertain=state.batchRawRows.filter(r=>!r.match||r.score<.84||((r.candidates?.[0]?.score||0)-(r.candidates?.[1]?.score||0))<.045);
        for(let i=0;i<uncertain.length;i++){const row=uncertain[i];setBatchProgress(64+20*(i/Math.max(1,uncertain.length)),'PaddleOCR 複核 '+(i+1)+'/'+uncertain.length);try{const rr=await recognizeNamePaddle(paddle,row.canvas);mergeRowOCR(row,rr.parsed,rr.cm,'P:'+rr.raw,Math.round(rr.confidence*100))}catch(e){row.raw+='｜PERR:'+String(e.message||e)}}
      }
      // Paddle 沒讀到總數，或仍有大量不確定列時，再用 Tesseract；不會改變 CV 主流程。
      const needTess=!state.expectedTotal||state.batchRawRows.some(r=>!r.match&&r.score<.72);
      if(needTess&&await ensureLocalOCR()){
        try{
          worker=await withTimeout(Tesseract.createWorker('jpn',1,{workerPath:'./vendor/tesseract/worker.min.js',corePath:'./vendor/tesseract-core',langPath:'./vendor/lang'}),35000,'Tesseract 複核載入逾時');
          if(!state.expectedTotal){const n=await tesseractFooterTotal(worker,screens);if(n>=20&&n<=200)state.expectedTotal=n;}
          const uncertain=state.batchRawRows.filter(r=>!r.match&&r.score<.80);
          try{await worker.setParameters({tessedit_pageseg_mode:'7',preserve_interword_spaces:'1',tessedit_char_whitelist:''})}catch{}
          for(let i=0;i<uncertain.length;i++){const row=uncertain[i];setBatchProgress(85+10*(i/Math.max(1,uncertain.length)),'Tesseract 複核 '+(i+1)+'/'+uncertain.length);try{const np=await recognizeFixedParts(worker,row.canvas,125),parsed={name:(np.surname+' '+np.given).trim(),names:[(np.surname+' '+np.given).trim()].filter(Boolean),surname:np.surname,given:np.given,surnames:[np.surname].filter(Boolean),givens:[np.given].filter(Boolean),age:np.age,hand:np.hand,pos:np.pos,text:np.raw},cm=candidateMatch(parsed);mergeRowOCR(row,parsed,cm,'T:'+np.raw,np.confidence)}catch(e){row.raw+='｜TERR:'+String(e.message||e)}}
        }catch(e){console.warn('Tesseract optional',e)}
      }
    }

    let rows=resolveUniqueCandidates(consolidateRows(state.batchRawRows,state.expectedTotal));rows=dedupeRecognizedRows(rows,state.expectedTotal);state.batchRows=rows;
    const matched=rows.filter(r=>r.match).length,inferred=rows.filter(r=>!r.match&&r.resolved).length;
    const mode=ios?(mobileNameOCR?'手機 CV＋本機 OCR':'手機 CV（姓名 OCR 未完成）'):'桌機 CV＋可用時 OCR 複核';
    setBatchProgress(100,'完成：'+rows.length+' 人'+(state.expectedTotal?'／畫面名單上限 '+state.expectedTotal:'')+'；確認 '+matched+'，推定 '+inferred+'，候選 '+(rows.length-matched-inferred)+'｜'+mode);
    renderBatchResults();
  }catch(e){console.error(e);$('#batchStatus').textContent='批次找人失敗：'+(e.message||e)}
  finally{if(paddle)try{await paddle.dispose()}catch{}if(worker)try{await worker.terminate()}catch{}$('#runBatch').disabled=false}
}
$('#runBatch').onclick=runBatch;
function renderBatchResults(){
  const matched=state.batchRows.filter(r=>r.match).length,inferred=state.batchRows.filter(r=>!r.match&&r.resolved).length;
  $('#batchSummary').textContent=state.batchRows.length?`結果 ${state.batchRows.length}${state.expectedTotal?` / 最多 ${state.expectedTotal}`:''}｜確認 ${matched}｜推定 ${inferred}｜候選 ${state.batchRows.length-matched-inferred}`:'';
  const groups={投手:[],捕手:[],內野手:[],外野手:[],其他:[]};for(const r of state.batchRows){const p=batchDisplayPlayer(r);groups[batchGroupName(p,r)].push(r)}
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
async function waitForSWState(sw,target='installed',ms=12000){if(!sw||sw.state===target)return;await withTimeout(new Promise(resolve=>sw.addEventListener('statechange',()=>{if(sw.state===target||sw.state==='activated'||sw.state==='redundant')resolve()},{once:false})),ms,'Service Worker 更新逾時')}
async function applyAppUpdate(){
  const started=Date.now();
  const clock=setInterval(()=>{const el=$('#updateText');if(!el)return;const base=el.textContent.replace(/｜已等待 \d+ 秒.*$/,'');if(!/失敗|已是最新版/.test(base))el.textContent=base+'｜已等待 '+Math.floor((Date.now()-started)/1000)+' 秒（網路下載無法預估剩餘時間）';},1000);
  try{
    showUpdateBar('取得最新版…',15,false);
    let changed=false;
    if('serviceWorker'in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      for(const reg of regs){
        try{
          await withTimeout(reg.update(),25000,'Safari 快取檢查逾時');$('#updateProgress').value=45;
          if(reg.installing)await waitForSWState(reg.installing);
          const waiting=reg.waiting;if(waiting){changed=true;waiting.postMessage({type:'SKIP_WAITING'})}
        }catch(e){console.warn('sw update',e)}
      }
    }
    $('#updateProgress').value=70;
    await withTimeout(Promise.all([
      fetch(`./VERSION?t=${Date.now()}`,{cache:'no-store'}),
      fetch(`./index.html?t=${Date.now()}`,{cache:'no-store'}),
      fetch(`./app.js?t=${Date.now()}`,{cache:'no-store'})
    ]),30000,'更新檔案下載超過 30 秒');
    $('#updateProgress').value=92;$('#updateText').textContent='套用新版…';
    if(changed&&'serviceWorker'in navigator){
      await Promise.race([new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true})),new Promise(resolve=>setTimeout(resolve,1800))]);
    }
    $('#updateProgress').value=100;location.replace(`./?updated=${Date.now()}`);
  }catch(e){showUpdateBar('更新失敗：'+(e.message||e)+'｜可以再次按「立即更新」',0,true)}
  finally{clearInterval(clock)}
}
$('#updateBtn').onclick=()=>checkAppUpdate(true);$('#applyUpdate').onclick=applyAppUpdate;
window.addEventListener('load',()=>{setTimeout(()=>checkAppUpdate(false),700);setInterval(()=>checkAppUpdate(false),10*60*1000)});

if('serviceWorker'in navigator)window.addEventListener('load',async()=>{try{const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await reg.update()}catch(e){console.warn('service worker',e)}});
loadData().catch(e=>{$('#dataStatus').textContent='資料載入失敗：'+e.message;console.error(e)});