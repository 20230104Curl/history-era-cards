import test from 'node:test';
import assert from 'node:assert/strict';
import {LENGTHS,MODES,normaliseRewards,stageCount,isUnlocked,hasCleared,isAllClear,nextChallenge,awardCompletion} from '../dist/rewards.js';
const clear=(state,length,mode)=>awardCompletion(state,{length,mode,correct:length,completed:length,now:'2026-10-27T12:00:00Z'});
function finishStage(state,length){for(const mode of MODES)state=clear(state,length,mode).rewards;return state;}
const entries=modes=>Object.fromEntries(modes.map(m=>[m,{perfect:true,earnedAt:'2026-10-27T12:00:00Z'}]));
test('初期状態は３問だけ解放し、旧完走報酬では進級しない',()=>{
 const initial=normaliseRewards({5:{count:100,best:5},10:{count:100,best:10},15:{count:100,best:15}});
 assert.deepEqual(LENGTHS,[3,6,10]);assert.equal(stageCount(initial,3),0);assert(isUnlocked(initial,3));assert(!isUnlocked(initial,6));assert(!isUnlocked(initial,10));assert(!isAllClear(initial));
});
test('１問でも間違えれば、スタンプ・バッジ・トロフィーは増えない',()=>{
 let state=normaliseRewards();
 for(const length of LENGTHS){for(const mode of MODES)for(let correct=0;correct<length;correct++){
  const r=awardCompletion(state,{length,mode,correct,completed:length});assert.equal(r.earned,null);assert.equal(stageCount(r.rewards,length),0);assert.equal(r.reason,'not-perfect');
 }state=finishStage(state,length);}
});
test('同じモードを繰り返しても１つまで。３方向すべて満点で６・10問を解放',()=>{
 let state=normaliseRewards();state=clear(state,3,MODES[0]).rewards;
 for(let n=0;n<5;n++){const duplicate=clear(state,3,MODES[0]);assert.equal(duplicate.reason,'already-cleared');assert.equal(duplicate.earned,null);state=duplicate.rewards;}
 assert.equal(stageCount(state,3),1);assert(!isUnlocked(state,6));
 state=clear(state,3,MODES[1]).rewards;assert(!isUnlocked(state,6));
 const third=clear(state,3,MODES[2]);assert.equal(third.unlocked,6);assert.equal(stageCount(third.rewards,3),3);assert(isUnlocked(third.rewards,6));assert(!isUnlocked(third.rewards,10));
 assert.deepEqual(nextChallenge(third.rewards,3),{length:6,mode:MODES[0]});
 state=finishStage(third.rewards,6);assert(isUnlocked(state,10));
});
test('９つの満点を順番に達成したときだけ完全クリアになる',()=>{
 let state=normaliseRewards();
 for(const length of LENGTHS)for(const [i,mode] of MODES.entries()){
  const r=clear(state,length,mode);assert(r.earned);assert.equal(r.allClear,length===10&&i===2);state=r.rewards;
 }
 assert(isAllClear(state));assert.equal(nextChallenge(state),null);
 for(const n of LENGTHS)for(const m of MODES)assert(hasCleared(state,n,m));
 assert.deepEqual(normaliseRewards(JSON.parse(JSON.stringify(state))),state);
});
test('ロック中・途中終了・誤答の復習では解放条件を満たせない',()=>{
 for(const args of [{length:6,mode:MODES[0],correct:6,completed:6},{length:10,mode:MODES[0],correct:10,completed:10},{length:3,mode:MODES[0],correct:2,completed:2},{length:3,mode:MODES[0],correct:3,completed:3,review:true}]){
  const r=awardCompletion({},args);assert.equal(r.earned,null);assert.equal(stageCount(r.rewards,3),0);assert(!isUnlocked(r.rewards,6));
 }
});
test('旧５・10・15問の満点記録を３・６・10問へ重複なく移行して再保存できる',()=>{
 for(const [completed,partial] of [[0,1],[1,2],[2,1],[3,0]]){
  const old={version:2,stages:{5:{},10:{},15:{}}},oldLengths=[5,10,15];
  for(let i=0;i<3;i++)old.stages[oldLengths[i]]=entries(i<completed?MODES:i===completed?MODES.slice(0,partial):[]);
  const migrated=normaliseRewards(old);assert.equal(migrated.version,3);
  for(let i=0;i<3;i++)assert.equal(stageCount(migrated,LENGTHS[i]),i<completed?3:i===completed?partial:0);
  assert.deepEqual(normaliseRewards(JSON.parse(JSON.stringify(migrated))),migrated);
  if(completed<3){const r=clear(migrated,LENGTHS[completed],MODES[partial]);assert(r.earned);assert.equal(stageCount(r.rewards,LENGTHS[completed]),partial+1);}
 }
});
test('新旧どちらでも下位が未達なら上位の記録だけは採用しない',()=>{
 for(const version of [2,3]){const lengths=version===2?[5,10,15]:LENGTHS,raw={version,stages:{[lengths[0]]:entries(MODES.slice(0,1)),[lengths[1]]:entries(MODES),[lengths[2]]:entries(MODES)}};
 const restored=normaliseRewards(raw);assert.equal(stageCount(restored,3),1);assert.equal(stageCount(restored,6),0);assert.equal(stageCount(restored,10),0);assert(!isAllClear(restored));}
});
