/* This worker owns only this textbook's cache. A failed update keeps the old edition. */
importScripts('./offline-assets.js');
const {version,assets}=self.HISTORY_OFFLINE;
const PREFIX='history-era-offline-';
const CACHE=PREFIX+version;
const absolute=path=>new URL(path,self.registration.scope).href;
const urls=assets.map(asset=>absolute(asset.path));
// CDN redirects must not become redirected navigation or module responses offline.
function localResponse(response){const headers=new Headers(response.headers);headers.delete('content-encoding');headers.delete('content-length');return new Response(response.body,{status:response.status,statusText:response.statusText,headers});}
async function announce(message){for(const client of await self.clients.matchAll({includeUncontrolled:true,type:'window'}))client.postMessage(message);}
async function status(){const cache=await caches.open(CACHE);const keys=new Set((await cache.keys()).map(request=>request.url));const done=urls.filter(url=>keys.has(url)).length;return {type:'offline-status',version,done,total:urls.length,ready:done===urls.length};}
async function prepare(){
 const cache=await caches.open(CACHE);let done=0,next=0;
 async function download(){while(next<assets.length){const asset=assets[next++],url=absolute(asset.path);let response=await cache.match(url);if(!response){response=await fetch(url,{cache:'no-store',credentials:'same-origin'});if(!response.ok)throw new Error(`保存できません：${asset.path}（${response.status}）`);const type=response.headers.get('content-type')||'';if(asset.kind==='image'&&!type.startsWith('image/'))throw new Error(`画像を保存できません：${asset.path}（${type}）`);if(asset.kind==='script'&&!/(javascript|ecmascript)/i.test(type))throw new Error(`教材を保存できません：${asset.path}（${type}）`);await cache.put(url,localResponse(response));}done++;if(done===1||done%4===0||done===assets.length)await announce({type:'offline-progress',done,total:assets.length});}}
 await Promise.all(Array.from({length:4},download));
 const result=await status();if(!result.ready)throw new Error('教材の保存が完了していません');
}
self.addEventListener('install',event=>event.waitUntil(prepare().then(()=>self.skipWaiting()).catch(async error=>{await announce({type:'offline-error',message:error.message});throw error;})));
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==CACHE)await caches.delete(name);await announce(await status());})()));
self.addEventListener('message',event=>{if(event.data?.type==='offline-status')event.waitUntil(status().then(result=>event.ports[0]?.postMessage(result)));});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
 if(request.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=request.mode==='navigate'?await cache.match(absolute('./index.html')):await cache.match(request,{ignoreSearch:true});return cached?localResponse(cached):fetch(request);})());
});
