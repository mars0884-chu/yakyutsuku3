const CACHE='yt3-v20261006-8';
const CORE=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./VERSION','./assets/icon.svg','./assets/game-cover.jpg','./assets/icon-192-r2.png','./assets/icon-512-r2.png','./data/players-seed.json','./data/guides.json','./data/guide-book.json','./data/cheats.json','./data/sources.json','./data/research-status.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(xs=>Promise.all(xs.filter(x=>x.startsWith('yt3-')&&x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
async function networkFirst(req){const cache=await caches.open(CACHE);try{const r=await fetch(req,{cache:'no-store'});if(r&&r.ok)cache.put(req,r.clone());return r}catch(e){return(await cache.match(req))||Response.error()}}
async function cacheFirst(req){const cache=await caches.open(CACHE),hit=await cache.match(req);if(hit)return hit;const r=await fetch(req);if(r&&r.ok)cache.put(req,r.clone());return r}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);if(u.origin!==location.origin)return;
  const p=u.pathname;
  if(e.request.mode==='navigate'||/\/(?:index\.html|app\.js|styles\.css|VERSION)$/.test(p)||/\/data\/(?:guide-book|cheats|sources|research-status|players)\.json$/.test(p)){e.respondWith(networkFirst(e.request));return}
  if(/\/vendor\/(?:paddleocr|tesseract|tesseract-core|lang)\//.test(p)){e.respondWith(cacheFirst(e.request));return}
  e.respondWith(networkFirst(e.request));
});