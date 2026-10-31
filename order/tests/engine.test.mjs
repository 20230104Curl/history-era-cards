import test from 'node:test';
import assert from 'node:assert/strict';
import {UNITS,cardsForUnit,isUnlocked} from '../dist/units.js';
import {makeEngine} from '../dist/engine.js';
test('seven scopes contain exactly the original 80 events',()=>{
 assert.deepEqual(UNITS.map(u=>cardsForUnit(u.id).length),[15,16,19,50,15,15,30]);
 assert.equal(new Set(UNITS.filter(u=>!u.requires.length).flatMap(u=>cardsForUnit(u.id).map(c=>c.id))).size,80);
});
test('totals require all own basic units',()=>{
 const r={};assert.equal(isUnlocked('jp-all',r),false);assert.equal(isUnlocked('world-all',r),false);
 for(const id of ['jp-ancient','jp-medieval','jp-edo'])r[id]={cleared:true};
 assert.equal(isUnlocked('jp-all',r),true);assert.equal(isUnlocked('world-all',r),false);
 r['world-early']={cleared:true};assert.equal(isUnlocked('world-all',r),false);
 r['world-late']={cleared:true};assert.equal(isUnlocked('world-all',r),true);
});
for(const unit of UNITS)test(unit.name+' balanced, restorable five-question sessions',()=>{
 const cards=cardsForUnit(unit.id),e=makeEngine(cards);
 for(let n=0;n<100;n++){
  let q=e.createQuiz();const counts={};
  for(const question of q.plan){assert.equal(new Set(question).size,5);for(const id of question){assert.ok(cards.some(c=>c.id===id));counts[id]=(counts[id]||0)+1;}}
  assert.equal(Object.keys(counts).length,Math.min(25,cards.length));
  assert.ok(Math.max(...Object.values(counts))<=Math.ceil(25/cards.length));
  for(let i=1;i<5;i++)assert.ok(q.plan[i].every(id=>!q.plan[i-1].includes(id)));
  assert.equal(e.submitQuiz(q).correct,false);
  for(let i=0;i<5;i++){
   q.order.sort((a,b)=>cards.find(c=>c.id===a).year-cards.find(c=>c.id===b).year);
   const result=e.submitQuiz(q);assert.ok(result.newlyAccepted);q=result.quiz;
   assert.equal(e.submitQuiz(q).newlyAccepted,false);
   q=e.restoreQuiz(JSON.parse(JSON.stringify(q)));assert.equal(q.solved,i+1);q=e.nextQuiz(q);
  }assert.equal(q.solved,5);
 }
});
test('legacy ancient save and malformed save',()=>{
 const e=makeEngine(cardsForUnit('jp-ancient'));let q=e.createQuiz();delete q.plan;
 assert.deepEqual(e.restoreQuiz(q).order,q.order);
 assert.equal(e.restoreQuiz({solved:5,question:['bad']}).solved,0);
});
