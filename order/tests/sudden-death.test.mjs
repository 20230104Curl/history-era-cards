import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {UNITS,cardsForUnit} from '../dist/units.js';
import {makeEngine} from '../dist/engine.js';
for(const unit of UNITS)test(unit.name+' resets after any error and needs five fresh consecutive answers',()=>{
 const cards=cardsForUnit(unit.id),e=makeEngine(cards);
 for(let failAt=0;failAt<5;failAt++){
  let q=e.createQuiz();
  const solve=()=>{q.order.sort((a,b)=>cards.find(c=>c.id===a).year-cards.find(c=>c.id===b).year);q=e.submitQuiz(q).quiz;};
  for(let n=0;n<failAt;n++){solve();q=e.nextQuiz(q);}
  const old=q.question;q=e.submitQuiz(q).quiz;
  assert.equal(q.solved,0);assert.equal(q.accepted,false);
  assert.ok(q.question.every(id=>!old.includes(id)));
  assert.equal(e.restoreQuiz(q).solved,0);
  for(let n=1;n<=5;n++){solve();assert.equal(q.solved,n);q=e.nextQuiz(q);}
 }
});
function setup(saved={}){
 const callbacks=new Map(),timers=new Map();let serial=0;
 const storage=new Map(Object.entries(saved));const app={innerHTML:'',addEventListener:(type,cb)=>callbacks.set(type,cb)};
 const ctx=vm.createContext({console,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
 document:{querySelector:()=>app,documentElement:{style:{setProperty(){}}}},
 window:{innerWidth:1024,visualViewport:null,addEventListener(){}},innerHeight:768,
 setTimeout:cb=>{timers.set(++serial,cb);return serial;},clearTimeout:id=>timers.delete(id)});
 const code=['data','units','engine','study','glossary','app'].map(name=>fs.readFileSync(new URL('../dist/'+name+'.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'')).join('\n');
 vm.runInContext(code,ctx);
 const run=code=>vm.runInContext(code,ctx);
 const click=(action,value)=>callbacks.get('click')({target:{closest:()=>({disabled:false,dataset:{action,value}})}});
 const flush=()=>{const pending=[...timers.values()];timers.clear();pending.forEach(cb=>cb());};
 const correct=()=>{run('record.quiz.order.sort((a,b)=>byId.get(a).year-byId.get(b).year)');click('judge');};
 return {run,click,flush,correct,storage,app,timers};
}
test('study starts with the event, hides the answer year and only grades after revealing it',()=>{
 const h=setup();h.click('view','cards');
 assert.equal(h.run('state.flipped'),true);
 assert.doesNotMatch(h.app.innerHTML,/class="(?:card-year|back-year|mnemonic-text)"/);
 assert.match(h.app.innerHTML,/data-action="remember" disabled/);
 h.click('remember');assert.equal(h.run('record.known.length'),0);
 h.click('flip');assert.equal(h.run('state.flipped'),false);
 assert.match(h.app.innerHTML,/class="historical-term"/);
 assert.doesNotMatch(h.app.innerHTML,/data-action="remember" disabled/);
 h.click('remember');assert.equal(h.run('record.known.length'),1);assert.equal(h.run('state.flipped'),true);
 h.click('card-prev');assert.equal(h.run('state.flipped'),true);
 h.click('open-card','j593');assert.equal(h.run('state.flipped'),false);
 h.click('flip');assert.match(h.app.innerHTML,/用語メモ/);assert.match(h.app.innerHTML,/天皇が幼いとき/);
 assert.match(h.app.innerHTML,/aria-describedby="event-glossary"/);
 h.click('flip');assert.doesNotMatch(h.app.innerHTML,/event-glossary|天皇が幼いとき/);
 h.click('view','cards');assert.equal(h.run('state.flipped'),true);
 h.click('units');h.click('select-unit','world-early');assert.equal(h.run('state.flipped'),true);
});
test('every mnemonic keeps its wording and selected glossary entries belong to real cards',()=>{
 const h=setup();
 assert.equal(h.run('ALL_CARDS.length'),80);
 assert.equal(h.run('ALL_CARDS.every(c=>highlightMnemonic(c.id,c.mnemonic).replace(/<[^>]+>/g, "")===esc(c.mnemonic))'),true);
 assert.equal(h.run('ALL_CARDS.every(c=>highlightMnemonic(c.id,c.mnemonic).includes("historical-term"))'),true);
 assert.equal(h.run('Object.keys(GLOSSARY).length'),28);
 assert.equal(h.run('Object.keys(GLOSSARY).every(id=>ALL_CARDS.some(c=>c.id===id))'),true);
});
test('automatic progression, duplicate clicks, error reset and final circle',()=>{
 const h=setup();h.click('view','quiz');
 h.correct();assert.equal(h.run('record.quiz.solved'),1);assert.ok(h.app.innerHTML.includes('correct-overlay'));
 h.click('judge');assert.equal(h.run('record.quiz.solved'),1);
 h.flush();assert.equal(h.run('record.quiz.accepted'),false);assert.equal(h.run('state.transition'),false);
 h.click('judge');assert.equal(h.run('record.quiz.solved'),0);assert.equal(h.run('record.cleared'),false);
 h.click('judge');assert.equal(h.run('record.quiz.solved'),0);h.flush();
 for(let n=1;n<=5;n++){
  h.correct();assert.equal(h.run('record.quiz.solved'),n);
  assert.ok(h.app.innerHTML.includes('correct-overlay'));h.flush();
 }
 assert.equal(h.run('record.cleared'),true);assert.ok(h.app.innerHTML.includes('UNIT COMPLETED'));
 assert.equal(h.run('isUnlocked("jp-all",records)'),false);
});
test('navigation settles automatic progress without altering another unit',()=>{
 const h=setup();h.click('view','quiz');h.correct();h.click('units');h.click('select-unit','jp-edo');h.flush();
 assert.equal(h.run('record.quiz.solved'),0);
 assert.equal(h.run('records["jp-ancient"].quiz.solved'),1);
 assert.equal(h.run('records["jp-ancient"].quiz.accepted'),false);
});
test('old clear flags reset while remembered cards survive; new saves resume',()=>{
 const e=makeEngine(cardsForUnit('jp-ancient'));
 const old={'jp-ancient':{known:[cardsForUnit('jp-ancient')[0].id],cleared:true,quiz:e.createQuiz()}};
 const h=setup({'history-order-seven-v1':JSON.stringify(old)});
 assert.equal(h.run('record.known.length'),1);assert.equal(h.run('record.cleared'),false);
 h.click('view','quiz');h.correct();
 const resumed=setup(Object.fromEntries(h.storage));
 assert.equal(resumed.run('record.quiz.solved'),1);assert.equal(resumed.run('record.quiz.accepted'),false);
 resumed.click('view','quiz');resumed.click('judge');resumed.flush();
 const afterError=setup(Object.fromEntries(resumed.storage));assert.equal(afterError.run('record.quiz.solved'),0);
});
