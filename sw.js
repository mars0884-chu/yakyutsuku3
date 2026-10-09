const CACHE='yt3-v20261009-20';
const CORE=["./","./index.html","./styles.css","./app.js","./engine/r16-layout.css","./engine/r18-layout.css","./engine/cv_dice.js","./engine/geometry-fixed.js","./engine/r13-overlap.js","./engine/r14-capture.js","./engine/r14-overlap-r18.js","./engine/claude-cv-coarse.js","./engine/claude-align-r17.js","./engine/claude-cv-r18.js","./engine/r18-batch.js","./engine/claude-header-r17.json","./engine/claude-glyphs-16.json","./manifest.webmanifest","./VERSION","./assets/icon.svg","./assets/game-cover.jpg","./assets/icon-192-r2.png","./data/players-seed.json","./data/guides.json","./data/guide-book.json","./data/cheats.json","./data/sources.json","./data/research-status.json"];
async function reportCache(done,total){const cs=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const c of cs)c.postMessage({type:'YT3_CACHE_PROGRESS',done,total})}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);let next=0,done=0;const workers=Array.from({length:4},()=> (async()=>{while(next<CORE.length){const path=CORE[next++];await cache.add(path);await reportCache(++done,CORE.length)}})());await Promise.all(workers)})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(key=>key.startsWith('yt3-')&&key!==CACHE).map(key=>caches.delete(key)));await self.clients.claim()})()));
function cacheKey(req){const u=new URL(req.url);u.searchParams.delete('t');u.searchParams.delete('updated');return new Request(u.href)}
async function networkFirst(req){const cache=await caches.open(CACHE);try{const r=await fetch(req,{cache:'no-store'});if(r&&r.ok)cache.put(cacheKey(req),r.clone());return r}catch(e){return(await cache.match(cacheKey(req)))||Response.error()}}
async function cacheFirst(req){const cache=await caches.open(CACHE),hit=await cache.match(cacheKey(req));if(hit)return hit;const r=await fetch(req);if(r&&r.ok)cache.put(cacheKey(req),r.clone());return r}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);if(u.origin!==location.origin)return;
  const p=u.pathname;
  if(e.request.mode==='navigate'||/\/(?:index\.html|app\.js|styles\.css|VERSION)$/.test(p)||/\/data\/(?:guide-book|cheats|sources|research-status|players)\.json$/.test(p)){e.respondWith(networkFirst(e.request));return}
  if(/\/vendor\/(?:paddleocr|tesseract|tesseract-core|lang)\//.test(p)){e.respondWith(cacheFirst(e.request));return}
  e.respondWith(networkFirst(e.request));
});