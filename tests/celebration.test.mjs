import test from 'node:test';
import assert from 'node:assert/strict';
import {celebrationFor} from '../dist/celebration.js';
const result=(length,count)=>({courseLength:length,mode:'random',answers:Array.from({length},()=>({correct:true})),earned:{length,mode:'random',count}});
test('新しく獲得した満点だけをモード・ステージ・全体クリアに分ける',()=>{
 for(const n of [3,6,10])for(const count of [1,2,3])assert.equal(celebrationFor(result(n,count)).kind,count===3?(n===10?'final':'stage'):'mode');
});
test('復習・未クリア・獲得済み・途中終了では獲得演出を出さない',()=>{
 assert.equal(celebrationFor(null),null);
 const r=result(3,1);
 for(const changed of [{review:true},{earned:null},{answers:[{correct:true}]},{answers:[{correct:false},...r.answers.slice(1)]},{courseLength:6}])assert.equal(celebrationFor({...r,...changed}),null);
});
