import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import vm from 'node:vm';
import {DATA} from '../dist/data.js';
const root=new URL('../dist/',import.meta.url);
function manifest(){const self={};vm.runInNewContext(readFileSync(new URL('offline-assets.js',root),'utf8'),{self});return JSON.parse(JSON.stringify(self.HISTORY_OFFLINE));}
function harness({failedPath=null,offline=false,redirected=false}={}){
 const info=manifest(),handlers={},stores=new Map(),sent=[],storedRedirects=[];let networkCalls=0,skip=false,claimed=false;
 function key(request){return typeof request==='string'?request:request.url;}
 const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {async keys(){return [...map.keys()].map(url=>({url}));},async put(request,response){storedRedirects.push(response.redirected);map.set(key(request),response.clone());},async match(request,options={}){let url=key(request);if(options.ignoreSearch)url=url.split('?')[0];const response=[...map.entries()].find(([stored])=>(options.ignoreSearch?stored.split('?')[0]:stored)===url)?.[1];return response?.clone();}};},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);}};
 const self={registration:{scope:'https://textbook.example/lesson/'},clients:{async matchAll(){return [{postMessage:m=>sent.push(m)}];},async claim(){claimed=true;}},async skipWaiting(){skip=true;},addEventListener(type,callback){handlers[type]=callback;}};
 const context={self,caches,URL,Response,Request,Headers,importScripts(){self.HISTORY_OFFLINE=info;},async fetch(request){networkCalls++;if(offline)throw new Error('Network is disconnected');const url=key(request),relative=url.replace(self.registration.scope,'');if(relative===failedPath)return new Response('failed',{status:503});const kind=info.assets.find(asset=>asset.path==='./'+relative)?.kind;const type=kind==='image'?'image/webp':kind==='script'?'text/javascript':'text/html';const response=new Response('content:'+relative,{headers:{'content-type':type,'content-encoding':'gzip'}});if(redirected){Object.defineProperty(response,'redirected',{value:true});Object.defineProperty(response,'url',{value:'https://cdn.example/'+relative});}return response;}};
 vm.runInNewContext(readFileSync(new URL('sw.js',root),'utf8'),context);
 async function event(type,extra={}){let promise;handlers[type]({...extra,waitUntil:p=>{promise=p;},respondWith:p=>{promise=p;}});return promise;}
 return {info,stores,caches,sent,storedRedirects,event,setOffline:()=>{offline=true;networkCalls=0;},get networkCalls(){return networkCalls;},get skipped(){return skip;},get claimed(){return claimed;}};
}
test('offline bundle includes every runtime file and all 80 illustrations',()=>{
 const info=manifest(),paths=new Set(info.assets.map(x=>x.path));
 for(const item of DATA)assert.ok(paths.has(`./art/${item.id}.webp`));
 const actual=[];function walk(dir,prefix='./'){for(const name of readdirSync(dir)){const url=new URL(name,dir);if(statSync(url).isDirectory())walk(new URL(name+'/',dir),prefix+name+'/');else if(!['sw.js','offline-assets.js'].includes(name)&&!name.startsWith('qa-'))actual.push(prefix+name);}}walk(root);
 assert.deepEqual([...paths].sort(),actual.sort());
 for(const asset of info.assets){const text=asset.kind==='script'?readFileSync(new URL(asset.path,root),'utf8'):'';for(const match of text.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)){const dependency=new URL(match[1],new URL(asset.path,root));assert.ok(paths.has('./'+dependency.pathname.slice(root.pathname.length)),`${asset.path} dependency ${match[1]}`);}}
});
test('after preparation, all 80 images, navigation and query-versioned modules work with zero network',async()=>{
 const h=harness();await h.event('install');assert.equal(h.skipped,true);await h.event('activate');assert.equal(h.claimed,true);h.setOffline();
 for(const asset of h.info.assets){const response=await h.event('fetch',{request:{method:'GET',mode:'cors',url:'https://textbook.example/lesson/'+asset.path.slice(2)+'?v=old-edition'}});assert.equal(response.status,200,asset.path);}
 const page=await h.event('fetch',{request:{method:'GET',mode:'navigate',url:'https://textbook.example/lesson/?from=bookmark'}});assert.match(await page.text(),/index.html/);assert.equal(h.networkCalls,0);
 let result;await h.event('message',{data:{type:'offline-status'},ports:[{postMessage:m=>{result=m;}}]});assert.equal(result.ready,true);assert.equal(result.done,h.info.assets.length);
});
test('an interrupted or failed download never reports ready or replaces the prior offline edition',async()=>{
 const h=harness({failedPath:'art/j478.webp'});h.stores.set('history-era-offline-previous',new Map([['old',new Response('old')]]));h.stores.set('another-app',new Map());await assert.rejects(h.event('install'));assert.equal(h.skipped,false);assert.ok(h.stores.has('history-era-offline-previous'));assert.ok(h.sent.some(x=>x.type==='offline-error'));
 let result;await h.event('message',{data:{type:'offline-status'},ports:[{postMessage:m=>{result=m;}}]});assert.equal(result.ready,false);
});
test('activating a fully prepared edition cleans only this textbook cache',async()=>{
 const h=harness();h.stores.set('history-era-offline-previous',new Map());h.stores.set('another-app',new Map());await h.event('install');await h.event('activate');assert.ok(!h.stores.has('history-era-offline-previous'));assert.ok(h.stores.has('another-app'));
});

test('CDN-delivered resources become non-redirected local responses for offline navigation and imports',async()=>{
 const h=harness({redirected:true});await h.event('install');await h.event('activate');assert.equal(h.storedRedirects.length,h.info.assets.length);assert.ok(h.storedRedirects.every(value=>value===false));h.setOffline();
 for(const [path,mode] of [['','navigate'],['engine.js?v=edition','same-origin']]){const response=await h.event('fetch',{request:{method:'GET',mode,redirect:'manual',url:'https://textbook.example/lesson/'+path}});assert.equal(response.redirected,false);assert.equal(response.url,'');assert.equal(response.headers.has('content-encoding'),false);assert.equal(response.status,200);}
 assert.equal(h.networkCalls,0);
});
