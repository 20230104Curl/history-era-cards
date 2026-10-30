import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(saved=null){
 const storage=new Map(saved?[['history-era-cards-v1',saved]]:[]),buttons=[{},{}];
 const element=()=>({setAttribute(){},remove(){},classList:{toggle(){}},querySelector:()=>({setAttribute(){}})});
 const app={innerHTML:'',addEventListener(){},querySelector:()=>null},card=element();
 const context=vm.createContext({console,Image:class{},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  document:{activeElement:{tagName:'BODY'},querySelector:selector=>selector==='#app'?app:selector==='#flashcard'?card:null,querySelectorAll:()=>buttons,createElement:element,body:{append(){}},documentElement:{style:{setProperty(){}}},addEventListener(){}},
  window:{innerHeight:768,addEventListener(){}},prepareOffline:async()=>{},paintOffline(){}});
 const modules=['data','mnemonics','illustrations','timeline','rewards','engine','celebration','study','app'];
 vm.runInContext(modules.map(name=>fs.readFileSync(new URL('../dist/'+name+'.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'')).join('\n'),context);
 return {run:code=>vm.runInContext(code,context),storage,app,buttons};
}
test('study starts from the event, grading requires revealing the answer, next card hides it again',()=>{
 const h=setup();h.run('action("view","study")');
 assert.equal(h.run('state.flipped'),true);
 assert.match(h.app.innerHTML,/何年の出来事？/);
 assert.doesNotMatch(h.app.innerHTML.match(/id="flashcard"[^>]+/)[0],/478年/);
 h.run('action("remember","known")');assert.equal(h.run('Object.keys(progress.cards).length'),0);
 h.run('action("flip")');assert.equal(h.run('state.flipped'),false);assert.equal(h.buttons[0].disabled,false);
 h.run('action("remember","known")');assert.equal(h.run('progress.cards.j478'),'known');assert.equal(h.run('state.flipped'),true);
 h.run('action("flip");action("remember","review")');assert.equal(h.run('progress.cards.j593'),'review');assert.equal(h.run('state.flipped'),true);
 const restored=setup(h.storage.get('history-era-cards-v1'));assert.equal(restored.run('progress.cards.j478'),'known');
});
test('timeline opens the mnemonic; study navigation, selection, and region changes open the event',()=>{
 const h=setup();h.run('action("open-card","w1498")');assert.equal(h.run('state.flipped'),false);
 assert.match(h.app.innerHTML,/<strong class="historical-term">ガマ<\/strong>/);
 h.run('action("view","study")');assert.equal(h.run('state.flipped'),true);
 h.run('action("open-card","j1787");action("next")');assert.equal(h.run('state.flipped'),true);
 h.run('action("flip");action("prev")');assert.equal(h.run('state.flipped'),true);
 h.run('action("flip");action("pick","0")');assert.equal(h.run('state.flipped'),true);
 h.run('action("flip");action("region","world")');assert.equal(h.run('state.flipped'),true);
});
test('remembered-card filtering advances without skipping the remaining cards',()=>{
 const h=setup();h.run('action("view","study");state.filter="unlearned";action("flip");action("remember","known")');
 assert.equal(h.run('visibleDeck()[state.index].id'),'j593');assert.equal(h.run('state.flipped'),true);
});
