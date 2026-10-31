import {UNITS} from './units.js';
export function makeEngine(CARDS){
const byId=new Map(CARDS.map(card=>[card.id,card]));
const QUIZ_SIZE=5;
const GOAL=5;
// Reuse the unit boundaries so the comprehensive quiz follows the study menu.
const region=CARDS[0]?.region;
const quizGroups=UNITS.filter(u=>u.region===region&&!u.requires.length).map(u=>CARDS.filter(c=>c.region===u.region&&c.year>=u.min&&c.year<=u.max).map(c=>c.id));
const balanceGroups=CARDS.every(c=>c.region===region)&&quizGroups.length===(region==='japan'?3:2)&&quizGroups.every(ids=>ids.length>=QUIZ_SIZE);
const specialCount=region==='japan'?1:3;
function groupCounts(ids){return quizGroups.map(group=>ids.filter(id=>group.includes(id)).length);}
function balancedQuestion(ids){return validQuestion(ids)&&groupCounts(ids).every(count=>count===specialCount||count===2);}
function shuffle(items,random=Math.random){
 const result=[...items];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
function validQuestion(ids){return Array.isArray(ids)&&ids.length===QUIZ_SIZE&&new Set(ids).size===QUIZ_SIZE&&ids.every(id=>byId.has(id));}
function isCorrect(ids,question){
 if(!validQuestion(ids)||!validQuestion(question)||ids.some(id=>!question.includes(id)))return false;
 return ids.every((id,index)=>index===0||byId.get(ids[index-1]).year<byId.get(id).year);
}
function unsorted(ids,random){const result=shuffle(ids,random);if(isCorrect(result,result))result.push(result.shift());return result;}
function makeQuestion(random=Math.random){return balanceGroups?makeSessionPlan(random)[0]:unsorted(shuffle(CARDS.map(c=>c.id),random).slice(0,QUIZ_SIZE),random);}
function makeBalancedPlan(random,anchorIndex,anchor){
 const keepAnchor=balancedQuestion(anchor),specialOrder=shuffle(quizGroups.map((_,i)=>i),random);
 if(keepAnchor){
  const target=groupCounts(anchor).indexOf(specialCount),slot=anchorIndex%quizGroups.length,index=specialOrder.indexOf(target);
  [specialOrder[slot],specialOrder[index]]=[specialOrder[index],specialOrder[slot]];
 }
 // Reserve the restored question first; every other event is used only once.
 const used=new Set(keepAnchor?anchor:[]),plan=[];
 for(let round=0;round<GOAL;round++){
  if(keepAnchor&&round===anchorIndex){plan.push([...anchor]);continue;}
  const selected=quizGroups.flatMap((ids,group)=>shuffle(ids.filter(id=>!used.has(id)),random).slice(0,group===specialOrder[round%quizGroups.length]?specialCount:2));
  selected.forEach(id=>used.add(id));plan.push(unsorted(selected,random));
 }
 return plan;
}
function makeSessionPlan(random=Math.random,anchorIndex=0,anchor=null){
 if(balanceGroups)return makeBalancedPlan(random,anchorIndex,anchor);
 const ids=CARDS.map(c=>c.id),counts=new Map(ids.map(id=>[id,0]));
 let plan=[];
 for(let round=0;round<GOAL;round++){
  const previous=plan[round-1]||[];
  const selected=shuffle(ids.filter(id=>!previous.includes(id)),random).sort((a,b)=>counts.get(a)-counts.get(b)).slice(0,QUIZ_SIZE);
  selected.forEach(id=>counts.set(id,counts.get(id)+1));plan.push(selected);
 }
 if(validQuestion(anchor)){
  const source=plan[anchorIndex],target=shuffle(anchor,random);
  const otherSource=CARDS.map(c=>c.id).filter(id=>!source.includes(id));
  const otherTarget=shuffle(CARDS.map(c=>c.id).filter(id=>!anchor.includes(id)),random);
  const rename=new Map([...source.map((id,i)=>[id,target[i]]),...otherSource.map((id,i)=>[id,otherTarget[i]])]);
  plan=plan.map(question=>question.map(id=>rename.get(id)));
 }
 plan=plan.map(question=>unsorted(question,random));
 if(validQuestion(anchor))plan[anchorIndex]=[...anchor];
 return plan;
}
function validPlan(plan){
 if(!Array.isArray(plan)||plan.length!==GOAL||!plan.every(validQuestion))return false;
 if(balanceGroups){
  if(!plan.every(balancedQuestion))return false;
  if(region==='world'&&plan.some((ids,i)=>i>0&&groupCounts(ids).indexOf(3)===groupCounts(plan[i-1]).indexOf(3)))return false;
  const totals=quizGroups.map((_,i)=>plan.reduce((sum,ids)=>sum+groupCounts(ids)[i],0));
  if(Math.max(...totals)-Math.min(...totals)>1)return false;
 }

 const counts=new Map(CARDS.map(c=>[c.id,0]));
 for(let i=0;i<plan.length;i++){
  if(i>0&&plan[i].some(id=>plan[i-1].includes(id)))return false;
  for(const id of plan[i])counts.set(id,counts.get(id)+1);
 }
 return [...counts.values()].every(count=>count>=Math.floor(GOAL*QUIZ_SIZE/CARDS.length)&&count<=Math.ceil(GOAL*QUIZ_SIZE/CARDS.length));
}
function createQuiz(random=Math.random,previous=[]){
 const specialGroup=balanceGroups?Math.floor(random()*quizGroups.length):0;
 const anchor=previous.length?unsorted(balanceGroups?quizGroups.flatMap((ids,i)=>shuffle(ids.filter(id=>!previous.includes(id)),random).slice(0,i===specialGroup?specialCount:2)):shuffle(CARDS.map(c=>c.id).filter(id=>!previous.includes(id)),random).slice(0,QUIZ_SIZE),random):null;
 const plan=makeSessionPlan(random,0,anchor),question=[...plan[0]];
 return {solved:0,question,order:[...question],accepted:false,plan};
}
function restoreQuiz(raw,random=Math.random){
 if(!raw||!Number.isInteger(raw.solved)||raw.solved<0||raw.solved>GOAL||!validQuestion(raw.question)||!validQuestion(raw.order)||raw.order.some(id=>!raw.question.includes(id)))return createQuiz(random);
 const accepted=raw.accepted===true&&isCorrect(raw.order,raw.question);
 if((raw.solved===GOAL&&!accepted)||(accepted&&raw.solved===0))return createQuiz(random);
 const index=accepted?raw.solved-1:raw.solved;
 if(balanceGroups&&!balancedQuestion(raw.question)){
  const plan=makeSessionPlan(random),question=[...plan[index]];
  const order=accepted?[...question].sort((a,b)=>byId.get(a).year-byId.get(b).year):[...question];
  return {solved:raw.solved,question,order,accepted,plan};
 }
 const keepPlan=validPlan(raw.plan)&&raw.plan[index].every(id=>raw.question.includes(id));
 const plan=keepPlan?raw.plan.map(question=>[...question]):makeSessionPlan(random,index,raw.question);
 return {solved:raw.solved,question:[...raw.question],order:[...raw.order],accepted,plan};
}
function submitQuiz(quiz){
 if(quiz.accepted)return {quiz,correct:true,newlyAccepted:false};
 if(!isCorrect(quiz.order,quiz.question))return {quiz:createQuiz(Math.random,quiz.question),correct:false,newlyAccepted:false};
 return {quiz:{...quiz,solved:Math.min(GOAL,quiz.solved+1),accepted:true},correct:true,newlyAccepted:true};
}
function nextQuiz(quiz,random=Math.random){
 if(!quiz.accepted||quiz.solved>=GOAL)return quiz;
 const plan=validPlan(quiz.plan)?quiz.plan:makeSessionPlan(random,quiz.solved-1,quiz.question);
 const question=[...plan[quiz.solved]];
 return {solved:quiz.solved,question,order:[...question],accepted:false,plan};
}

return {GOAL,QUIZ_SIZE,createQuiz,restoreQuiz,submitQuiz,nextQuiz,isCorrect,validQuestion,makeQuestion};
}
