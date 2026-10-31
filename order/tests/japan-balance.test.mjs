import test from 'node:test';
import assert from 'node:assert/strict';
import {cardsForUnit} from '../dist/units.js';
import {makeEngine} from '../dist/engine.js';
const cards=cardsForUnit('jp-all'),e=makeEngine(cards);
const groups=['jp-ancient','jp-medieval','jp-edo'].map(id=>new Set(cardsForUnit(id).map(c=>c.id)));
const counts=q=>groups.map(g=>q.filter(id=>g.has(id)).length);
const check=plan=>{
 assert.equal(plan.length,5);
 for(const q of plan){assert.equal(new Set(q).size,5);assert.deepEqual(counts(q).sort(),[1,2,2]);}
 assert.equal(new Set(plan.flat()).size,25);
 const totals=groups.map((_,i)=>plan.reduce((sum,q)=>sum+counts(q)[i],0)).sort();
 assert.deepEqual(totals,[8,8,9]);
};
const sorted=q=>[...q].sort((a,b)=>cards.find(c=>c.id===a).year-cards.find(c=>c.id===b).year);
function rng(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
test('5000 seeded comprehensive sessions always cover each unit with 2/2/1, no repeats',()=>{
 const singleSeen=new Set();
 for(let n=0;n<5000;n++){
  const q=e.createQuiz(rng(n));check(q.plan);
  for(const question of q.plan)assert.equal(e.isCorrect(question,question),false);
  singleSeen.add(counts(q.question).indexOf(1));
 }
 assert.equal(singleSeen.size,3);
});
test('restart after wrong answer remains balanced and excludes the preceding five events',()=>{
 for(let n=0;n<300;n++){
  const before=e.createQuiz(rng(n)),after=e.submitQuiz(before).quiz;
  check(after.plan);assert.equal(after.solved,0);
  assert.ok(after.question.every(id=>!before.question.includes(id)));
  assert.equal(e.isCorrect(after.question,after.question),false);
 }
});
test('restore replaces old Edo-heavy questions at every progress position without losing progress',()=>{
 const question=[...cardsForUnit('jp-edo').slice(0,4),cardsForUnit('jp-ancient')[0]].map(c=>c.id);
 for(let solved=0;solved<=5;solved++){
  for(const accepted of [false,true]){
   if(accepted&&solved===0||!accepted&&solved===5)continue;
   const q=e.restoreQuiz({solved,accepted,question,order:accepted?sorted(question):question},rng(solved));
   assert.equal(q.solved,solved);assert.equal(q.accepted,accepted);check(q.plan);
   assert.deepEqual(counts(q.question).sort(),[1,2,2]);
   assert.equal(e.isCorrect(q.order,q.question),accepted);
   if(accepted&&solved<5)check(e.nextQuiz(q).plan);
  }
 }
});
test('restore keeps an already balanced question and repairs its missing plan at every position',()=>{
 const source=e.createQuiz(rng(12)).question;
 for(let solved=0;solved<=5;solved++){
  for(const accepted of [false,true]){
   if(accepted&&solved===0||!accepted&&solved===5)continue;
   const q=e.restoreQuiz({solved,accepted,question:source,order:accepted?sorted(source):source},rng(solved));
   assert.deepEqual(q.question,source);assert.equal(q.solved,solved);check(q.plan);
  }
 }
});
test('standalone question generator also covers all three units',()=>{
 for(let n=0;n<100;n++)assert.deepEqual(counts(e.makeQuestion(rng(n))).sort(),[1,2,2]);
});
