import { LENGTHS, MODES } from './rewards.js?v=20261027-8';
// A celebration belongs to one newly earned perfect record, never a replay or review.
export function celebrationFor(result){
 if(!result||result.review||!result.earned||!result.answers?.length||result.answers.some(x=>!x.correct))return null;
 const {length,mode,count}=result.earned;
 if(length!==result.courseLength||result.answers.length!==length||!LENGTHS.includes(length)||!MODES.includes(mode)||mode!==result.mode||![1,2,3].includes(count))return null;
 return {kind:count===3?(length===LENGTHS.at(-1)?'final':'stage'):'mode',length,mode,count};
}
