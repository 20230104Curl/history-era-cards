import test from 'node:test';
import assert from 'node:assert/strict';
import {DATA} from '../dist/data.js';
import {BLUEPRINTS,BLUEPRINTS_BY_LEVEL,blueprintsFor,nearestPartners,makeQuestion,buildSession,distanceRange,policy,levelFor} from '../dist/engine.js';
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
test('合意済み80項目と修正内容が保持される',()=>{
 assert.equal(DATA.length,80);assert.equal(DATA.filter(x=>x.region==='world').length,30);assert.equal(DATA.filter(x=>x.region==='japan').length,50);
 assert.equal(new Set(DATA.map(x=>x.id)).size,80);
 for(const region of ['world','japan'])assert.equal(new Set(DATA.filter(x=>x.region===region).map(x=>x.year)).size,DATA.filter(x=>x.region===region).length);
 for(const id of ['w313','w1689','j1804','j1590','j1333'])assert(!DATA.some(x=>x.id===id));
 for(const id of ['w1748','w1762','j1772','j1592','j1334'])assert(DATA.some(x=>x.id===id));
 assert.match(DATA.find(x=>x.id==='j1639').event,/鎖国の完成/);
});
test('３・６問は全80項目で、最も近い相手を正解に含める',()=>{
 for(const source of DATA){const b=blueprintsFor(source);assert(b.length>0,source.id);const ids=nearestPartners(source).map(x=>x.id);for(const item of b)assert(ids.includes(item.answer.id));}
 assert.equal(levelFor(3),'near');assert.equal(levelFor(6),'near');assert.equal(levelFor(10),'transfer');
});
test('10問は定番の最短ペアを４択すべてから外す。同距離の相手も除く',()=>{
 const represented=new Set();
 for(const b of BLUEPRINTS_BY_LEVEL.transfer){represented.add(b.source.id);const forbidden=nearestPartners(b.source).map(x=>x.id);assert(!forbidden.includes(b.answer.id));assert(b.distractors.every(x=>!forbidden.includes(x.id)));for(let n=0;n<4;n++)assert(makeQuestion(b,seeded(n)).options.every(x=>!forbidden.includes(x.id)));}
 assert.equal(represented.size,71);
 // 除外後に無理な年代差になる古代などは、10問の問題文に使わない。
 assert(!represented.has('w375'));
 for(const region of ['world','japan'])assert(DATA.filter(x=>x.region===region&&represented.has(x.id)).length>=10);
 for(const id of ['j1016','j1334'])assert.equal(nearestPartners(DATA.find(x=>x.id===id)).length,2);
});
test('すべての段階・組合せで、10年単位の知識でも正解が一意になる',()=>{
 const rand=seeded(19);
 for(const b of BLUEPRINTS)for(let n=0;n<15;n++){
  const q=makeQuestion(b,rand);assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(x=>x.id)).size,4);assert(q.options.every(x=>x.region!==q.source.region));
  const correct=Math.abs(q.answer.year-q.source.year);assert(correct<=policy(q.source.year).radius);
  for(const x of q.options.filter(x=>x.id!==q.answer.id)){assert(correct<Math.abs(x.year-q.source.year));assert(distanceRange(q.source.year,x.year).min>=distanceRange(q.source.year,q.answer.year).max+q.margin);}
 }
});
test('フランス革命と寛政の改革は、３・６問で含め10問で除外する（双方向）',()=>{
 for(const [sourceId,partnerId] of [['w1789','j1787'],['j1787','w1789']]){
  const near=BLUEPRINTS_BY_LEVEL.near.filter(x=>x.source.id===sourceId),advanced=BLUEPRINTS_BY_LEVEL.transfer.filter(x=>x.source.id===sourceId);
  assert(near.length);assert(near.every(x=>x.answer.id===partnerId));assert(advanced.length>1);
  assert(new Set(advanced.map(x=>x.answer.id)).size>1);
  for(const b of advanced)assert(makeQuestion(b,seeded(9)).options.every(x=>x.id!==partnerId));
 }
});
test('３・６・10問の全モードで段階・出題方向・問題数・重複なしを確認',()=>{
 for(const count of [3,6,10])for(const mode of ['world-japan','japan-world','random'])for(let seed=0;seed<80;seed++){
  const questions=buildSession(mode,count,seeded(seed));assert.equal(questions.length,count);
  if(mode==='world-japan')assert(questions.every(x=>x.source.region==='world'));
  if(mode==='japan-world')assert(questions.every(x=>x.source.region==='japan'));
  if(mode==='random')assert(Math.abs(questions.filter(x=>x.source.region==='world').length-questions.filter(x=>x.source.region==='japan').length)<=1);
  assert.equal(new Set(questions.map(x=>x.source.id)).size,count);
  for(const q of questions){const nearest=nearestPartners(q.source).map(x=>x.id);assert.equal(q.level,levelFor(count));if(count===10)assert(q.options.every(x=>!nearest.includes(x.id)));else assert(nearest.includes(q.answer.id));}
 }
 for(const count of [0,5,15,20])assert.throws(()=>buildSession('random',count),RangeError);
});
