import { DATA } from './data.js';
import { LENGTHS } from './rewards.js?v=20261027-8';

export function shuffle(items, random = Math.random) {
  const copy = [...items];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}
  return copy;
}
export const decade = year => [Math.floor(year/10)*10,Math.floor(year/10)*10+9];
export function distanceRange(a,b){
  const [al,ah]=decade(a),[bl,bh]=decade(b);
  return {min:Math.max(0,al-bh,bl-ah),max:Math.max(Math.abs(al-bh),Math.abs(ah-bl))};
}
export function policy(year){
  if(year<1000)return {radius:130,margin:40};
  if(year<1400)return {radius:120,margin:25};
  if(year<1700)return {radius:60,margin:15};
  if(year<1800)return {radius:45,margin:12};
  return {radius:35,margin:12};
}

// ３・６問は全教材内で最も近い相手を含める。10問はその相手を除き、
// ４択内で最も近い出来事を選ぶ。最短距離が同じ相手はすべて同じ扱い。
export function nearestPartners(source,data=DATA){
 const pool=data.filter(x=>x.region!==source.region);
 const minimum=Math.min(...pool.map(x=>Math.abs(x.year-source.year)));
 return pool.filter(x=>Math.abs(x.year-source.year)===minimum);
}
export function levelFor(count){
 if(!LENGTHS.includes(count))throw new RangeError('問題数は３・６・10問から選んでください');
 return count===10?'transfer':'near';
}
export function blueprintsFor(source,data=DATA,level='near'){
 if(!['near','transfer'].includes(level))throw new RangeError('出題段階が正しくありません');
 const partners=new Set(nearestPartners(source,data).map(x=>x.id));
 const pool=data.filter(x=>x.region!==source.region&&(level==='near'||!partners.has(x.id)));
 const {radius,margin}=policy(source.year);
 return pool.filter(answer=>(level==='transfer'||partners.has(answer.id))&&Math.abs(answer.year-source.year)<=radius).map(answer=>{
   const worst=distanceRange(source.year,answer.year).max;
   const distractors=pool.filter(x=>x.id!==answer.id&&distanceRange(source.year,x.year).min>=worst+margin);
   return {source,answer,distractors,margin,level};
 }).filter(x=>x.distractors.length>=3);
}
export function makeQuestion(blueprint,random=Math.random){
  const {source,answer,distractors,margin}=blueprint;
  const near=[...distractors].sort((a,b)=>Math.abs(a.year-source.year)-Math.abs(b.year-source.year));
  // 二つは近めの候補群から、一つは全候補から選ぶ。
  const chosen=shuffle(near.slice(0,Math.min(8,near.length)),random).slice(0,2);
  chosen.push(shuffle(distractors.filter(x=>!chosen.some(c=>c.id===x.id)),random)[0]);
  return {source,answer,options:shuffle([answer,...chosen],random),margin,level:blueprint.level};
}
export const BLUEPRINTS_BY_LEVEL={near:DATA.flatMap(source=>blueprintsFor(source,DATA,'near')),transfer:DATA.flatMap(source=>blueprintsFor(source,DATA,'transfer'))};
export const BLUEPRINTS=Object.values(BLUEPRINTS_BY_LEVEL).flat();
export function buildSession(mode,count,random=Math.random){
  if(!['world-japan','japan-world','random'].includes(mode))throw new RangeError('出題モードが正しくありません');
  const blueprints=BLUEPRINTS_BY_LEVEL[levelFor(count)];
  const region=mode==='world-japan'?'world':mode==='japan-world'?'japan':null;
  const sourcePools={world:shuffle(DATA.filter(x=>x.region==='world'&&blueprints.some(b=>b.source.id===x.id)),random),japan:shuffle(DATA.filter(x=>x.region==='japan'&&blueprints.some(b=>b.source.id===x.id)),random)};
  const positions={world:0,japan:0},queue=[];
  let initial=random()<.5?'world':'japan';
  for(let i=0;i<count;i++){
    const side=region || (i%2===0?initial:(initial==='world'?'japan':'world'));
    const pool=sourcePools[side];
    if(!pool.length)throw new Error('出題できる教材がありません');
    const source=pool[positions[side]++%pool.length];
    const candidates=blueprints.filter(x=>x.source.id===source.id);
    queue.push(makeQuestion(candidates[Math.floor(random()*candidates.length)],random));
  }
  return queue;
}
