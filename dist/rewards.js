export const LENGTHS = [3,6,10];
export const MODES = ['world-japan','japan-world','random'];
export const REWARDS = {
  3:{name:'3問スタンプ',label:'スタンプ獲得',theme:'three',icon:'stamp'},
  6:{name:'6問バッジ',label:'バッジ獲得',theme:'six',icon:'badge'},
  10:{name:'10問トロフィー',label:'トロフィー獲得',theme:'ten',icon:'trophy'}
};
export function normaliseRewards(raw){
 const result={version:3,stages:{3:{},6:{},10:{}}};
 // 旧版の「完走した回数」は満点・モードの証拠がないため引き継がない。
 if(![2,3].includes(raw?.version))return result;
 // 旧５・10・15問の満点記録は、順番どおり３・６・10問へ移行する。
 const sourceLengths=raw.version===2?[5,10,15]:LENGTHS;
 for(let i=0;i<LENGTHS.length;i++){
  const n=LENGTHS[i];
  if(i>0&&Object.keys(result.stages[LENGTHS[i-1]]).length<3)break;
  for(const mode of MODES){const item=raw.stages?.[sourceLengths[i]]?.[mode];if(item?.perfect===true)result.stages[n][mode]={perfect:true,earnedAt:typeof item.earnedAt==='string'?item.earnedAt:''};}
 }
 return result;
}
export const stageCount=(raw,length)=>Object.keys(normaliseRewards(raw).stages[length]||{}).length;
export function isUnlocked(raw,length){
 const i=LENGTHS.indexOf(length);if(i<0)return false;
 return i===0||stageCount(raw,LENGTHS[i-1])===3;
}
export const hasCleared=(raw,length,mode)=>!!normaliseRewards(raw).stages[length]?.[mode];
export const isAllClear=raw=>stageCount(raw,10)===3;
export function nextChallenge(raw,length=3){
 const current=LENGTHS.includes(length)?length:3;
 const ordered=[...LENGTHS.filter(n=>n>=current),...LENGTHS.filter(n=>n<current)];
 for(const n of ordered)if(isUnlocked(raw,n)){const mode=MODES.find(m=>!hasCleared(raw,n,m));if(mode)return {length:n,mode};}
 return null;
}
export function awardCompletion(previous,{length,mode,correct,completed,review=false,now=new Date().toISOString()}){
 const rewards=normaliseRewards(previous);
 const result={rewards,earned:null,unlocked:null,allClear:isAllClear(rewards),reason:'invalid'};
 if(review)return {...result,reason:'review'};
 if(!LENGTHS.includes(length)||!MODES.includes(mode)||completed!==length||!Number.isInteger(correct)||correct<0||correct>length)return result;
 if(!isUnlocked(rewards,length))return {...result,reason:'locked'};
 if(correct!==length)return {...result,reason:'not-perfect'};
 if(hasCleared(rewards,length,mode))return {...result,reason:'already-cleared'};
 rewards.stages[length][mode]={perfect:true,earnedAt:now};
 const count=stageCount(rewards,length);
 return {rewards,earned:{length,mode,count},unlocked:count===3&&length!==10?LENGTHS[LENGTHS.indexOf(length)+1]:null,allClear:isAllClear(rewards),reason:'earned'};
}
export function scoreMessage(correct,total){return correct===total?'満点クリア':'未クリア。満点でのクリアを目指して再挑戦してください。';}
