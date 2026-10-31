import {highlightMnemonic} from './study.js?v=20261031-1';
import {GLOSSARY} from './glossary.js?v=20261031-1';
import {UNITS,cardsForUnit,isUnlocked} from './units.js';
import {makeEngine} from './engine.js';
const KEY='history-order-seven-sudden-death-v2';
const app=document.querySelector('#app');
let canSave=true,unitId='jp-ancient',records={};
for(const u of UNITS){const e=makeEngine(cardsForUnit(u.id));records[u.id]={known:[],cleared:false,quiz:e.createQuiz()};}
try{
 const raw=JSON.parse(localStorage.getItem(KEY)||'null');
 const previous=raw?null:JSON.parse(localStorage.getItem('history-order-seven-v1')||'null');
 const legacy=raw||previous?null:JSON.parse(localStorage.getItem('history-order-japan1-v1')||'null');
 for(const u of UNITS){
  const saved=raw?.[u.id]||previous?.[u.id]||(u.id==='jp-ancient'?legacy:null);if(!saved)continue;
  const cards=cardsForUnit(u.id),e=makeEngine(cards),q=raw?e.nextQuiz(e.restoreQuiz(saved.quiz)):e.createQuiz();
  records[u.id]={known:Array.isArray(saved.known)?[...new Set(saved.known.filter(id=>cards.some(c=>c.id===id)))]:[],cleared:!!raw&&(saved.cleared===true||q.solved===5),quiz:q};
 }
}catch{canSave=false;}
let CARDS=cardsForUnit(unitId),engine=makeEngine(CARDS),record=records[unitId],byId=new Map(CARDS.map(c=>[c.id,c]));
const GOAL=5,QUIZ_SIZE=5;
const createQuiz=()=>engine.createQuiz(),submitQuiz=q=>engine.submitQuiz(q),nextQuiz=q=>engine.nextQuiz(q);
function selectedUnit(){return UNITS.find(u=>u.id===unitId);}
function selectUnit(id){if(!UNITS.some(u=>u.id===id))return;unitId=id;CARDS=cardsForUnit(id);engine=makeEngine(CARDS);record=records[id];byId=new Map(CARDS.map(c=>[c.id,c]));state.page=0;state.index=0;state.flipped=true;state.message='';state.view=state.returnView||'timeline';if(state.view==='quiz'&&!isUnlocked(id,records))state.view='timeline';render();}
const state={returnView:'timeline',view:'units',page:0,index:0,flipped:true,message:'',celebrating:false,transition:false,failedQuiz:null,drag:null};
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{localStorage.setItem(KEY,JSON.stringify(records));}catch{canSave=false;}}
function progressDots(){return '<div class="progress-dots" aria-label="'+record.quiz.solved+'問連続正解">'+Array.from({length:GOAL},(_,i)=>'<span class="progress-dot '+(i<record.quiz.solved?'filled':'')+'">'+(i<record.quiz.solved?'✓':i+1)+'</span>').join('')+'</div>';}
function nav(){return '<nav aria-label="学習メニュー">'+[['timeline','01','年表'],['cards','02','暗記カード'],['quiz','03','並べ替え']].map(([id,n,label])=>'<button class="nav-button" data-action="view" data-value="'+id+'" '+(state.view===id?'aria-current="page"':'')+'><span class="nav-number">'+n+'</span>'+label+'</button>').join('')+'</nav>';}
function shell(body){
 const titles={timeline:['流れをつかむ、'+CARDS.length+'の出来事。','年表で順番を確認。出来事をタッチすると暗記カードへ。'],cards:['出来事から、年号を思い出そう。','めくって年号・語呂を確認し、覚えたかどうかチェックします。'],quiz:['５枚を、古い順に。','５問連続正解で、この区分を達成。年号は正解後に表示します。']};
 const title=state.view==='units'?['学ぶ区分を選ぼう。','各区分は５問連続正解で達成。総合は基本区分をすべて達成すると解放されます。']:titles[state.view];
 return '<div class="shell"><header class="header"><div class="brand"><span class="brand-icon" aria-hidden="true">↕</span><div><div class="brand-title">高校受験 年代順トレーニング</div><div class="brand-sub">ORDER THE PAST, UNDERSTAND THE FLOW.</div></div></div>'+nav()+'</header><main class="main"><div class="unit-switch"><button class="btn" data-action="units">▦ ７単元から選ぶ</button><span>日本史３区分・世界史２区分 ＋ 総合２つ</span></div><div class="hero"><div><div class="unit-tag">'+esc(selectedUnit().name)+'　／　'+CARDS[0].year+'–'+CARDS.at(-1).year+'年</div><h1>'+title[0]+'</h1><p>'+title[1]+'</p></div><div class="unit-count"><strong>'+CARDS.length+'</strong>の出来事</div></div>'+(!canSave?'<div class="save-note">このブラウザでは記録を保存できません。画面を閉じるまで練習できます。</div>':'')+body+'</main><footer class="footer"><span>'+esc(selectedUnit().name)+'</span><span>'+(record.cleared?'✓ 区分クリア済み':'暗記 '+record.known.length+' / '+CARDS.length+'　・　並べ替え '+record.quiz.solved+' / 5問')+'</span></footer></div>';
}
function timeline(){
 const start=state.page*5,rows=CARDS.slice(start,start+5);
 return '<section class="panel"><div class="panel-top"><span class="small-label">'+esc(selectedUnit().name)+'の年表</span><span class="status-pill">出来事をタッチで暗記へ</span></div><div class="timeline-head"><span>西暦</span><span>出来事</span></div><div class="timeline-list">'+rows.map(c=>'<button class="timeline-row" data-action="open-card" data-value="'+c.id+'" aria-label="'+c.year+'年、'+esc(c.event)+'の暗記カード"><span class="timeline-year">'+c.year+'<small>年</small></span><span class="timeline-event">'+esc(c.event)+'</span><span class="row-arrow" aria-hidden="true">›</span></button>').join('')+'</div><div class="pager"><button class="btn" data-action="timeline-prev" '+(state.page===0?'disabled':'')+'>‹ 前へ</button><span class="page-indicator"><strong>'+(state.page+1)+'</strong> / '+Math.ceil(CARDS.length/5)+' ページ<small>'+(start+1)+'–'+(start+rows.length)+' / '+CARDS.length+'項目</small></span><button class="btn" data-action="timeline-next" '+(state.page===Math.ceil(CARDS.length/5)-1?'disabled':'')+'>次へ ›</button></div></section>';
}
function study(){
 const c=CARDS[state.index],known=record.known.includes(c.id),note=GLOSSARY[c.id];
 const glossary=note?'<div class="event-glossary" id="event-glossary"><span class="glossary-label">用語メモ</span><strong>'+esc(note.term)+'</strong><span>'+esc(note.text)+'</span></div>':'';
 const face=state.flipped?'<div class="event-back"><small>何年の出来事？</small><h2>'+esc(c.event)+'</h2>'+glossary+'<p class="card-hint">タッチして年号と語呂を確認</p></div>':'<div class="art-frame"><img class="card-image" src="./art/'+c.id+'.webp" alt="'+esc(c.art.description)+'" width="1536" height="1024"></div><div class="card-copy"><div class="card-copy-top"><div class="card-copy-label">年号と語呂で答え合わせ</div><div class="card-year">'+c.year+'<small>年</small></div></div><div class="mnemonic-box"><strong class="mnemonic-cue">'+esc(c.art.cue)+'</strong><span class="mnemonic-text">'+highlightMnemonic(c.id,c.mnemonic)+'</span></div><div class="parts" aria-label="読みと数字の対応">'+c.parts.map(p=>'<span>'+esc(p.reading)+' ＝ '+esc(p.digits)+'</span>').join('')+'</div><div class="card-hint">タッチして出来事へ戻る ↻</div></div>';
 return '<section class="panel"><div class="study-toolbar"><span class="small-label">'+(state.index+1)+' / '+CARDS.length+'枚　'+(known?'✓ 覚えた':'')+'</span><div class="step-dots" aria-hidden="true">'+CARDS.map((x,i)=>'<i class="'+(i===state.index?'current':record.known.includes(x.id)?'known':'')+'"></i>').join('')+'</div></div><button class="flashcard '+(state.flipped?'back':'')+'" data-action="flip" aria-label="'+(state.flipped?esc(c.event)+'。タッチして年号と語呂を確認':c.year+'年、出来事を見る')+'" aria-pressed="'+state.flipped+'" '+(state.flipped&&note?'aria-describedby="event-glossary"':'')+'>'+face+'</button><div class="study-actions"><button class="btn" data-action="card-prev" aria-label="前のカード">‹</button><button class="btn remember" data-action="review" '+(state.flipped?'disabled':'')+'>↻ もう一度</button><button class="btn primary remember" data-action="remember" '+(state.flipped?'disabled':'')+'>✓ 覚えた</button><button class="btn" data-action="card-next" aria-label="次のカード">›</button></div><div class="study-bottom"><span class="small-label">覚えた '+record.known.length+' / '+CARDS.length+'</span><span class="credit">'+(c.source?'出典：'+esc(c.source):'語呂：作例')+'</span></div></section>';
}
function complete(){
 return '<section class="panel complete-panel"><div class="confetti">UNIT COMPLETED</div><div class="complete-seal" aria-hidden="true"><span>５問連続正解</span><strong>✓</strong><span>CLEAR</span></div><h2>'+esc(selectedUnit().name)+' クリア！</h2><p>この区分の並べ替えを、５問連続で正解しました。<br>出来事の流れを、しっかりつかめましたね。</p><span class="status-pill done">✓ この区分の達成を記録しました</span><div class="complete-actions"><button class="btn" data-action="units">区分を選ぶ</button><button class="btn" data-action="view" data-value="timeline">年表を見返す</button><button class="btn primary" data-action="restart">もう一度５問に挑戦</button></div></section>';
}
function quiz(){
 if(!isUnlocked(unitId,records))return '<section class="panel complete-panel"><h2>🔒 総合トレーニング</h2><p>先に'+selectedUnit().requires.length+'つの基本区分をクリアしてください。</p><button class="btn primary" data-action="units">区分を選ぶ</button></section>';
 const q=state.failedQuiz||record.quiz;
 if(q.solved===GOAL&&!state.transition)return complete();
 const accepted=q.accepted,blocked=accepted||state.transition;
 let feedback='<span>５問連続正解で達成。１問でも間違えると最初から。ドラッグ・↑↓で移動。</span>';
 if(accepted)feedback='<span class="feedback-mark">○</span><span><strong>正解！ '+q.solved+' / 5問連続正解</strong>上から古い順に並んでいます。</span>';
 else if(state.message==='wrong')feedback='<span class="feedback-mark">↻</span><span><strong>不正解。１問目から再挑戦！</strong>連続正解は０に戻ります。自動で１問目から再スタートします。</span>';
 return '<section class="panel quiz-panel"><div class="panel-top"><div class="quiz-progress">'+progressDots()+'<span class="progress-text">'+record.quiz.solved+' / 5問連続正解</span></div><span class="status-pill">第'+(accepted?q.solved:q.solved+1)+'問</span></div><div class="direction-bar"><strong>↑ 古い出来事</strong><span>５枚すべてを年代順に</span><strong>新しい出来事 ↓</strong></div><ol class="sort-list" aria-label="年代順に並べ替える５枚">'+q.order.map((id,i)=>{
 const c=byId.get(id);
 return '<li class="sort-row '+(accepted?'correct':'')+'" data-id="'+id+'"><button class="drag-handle" data-action="drag" aria-label="'+esc(c.event)+'をドラッグして移動" '+(blocked?'disabled':'')+'><span aria-hidden="true">⠿</span></button><span class="sort-number" aria-hidden="true">'+(i+1)+'</span><span class="sort-event">'+esc(c.event)+(accepted?'<span class="revealed-year">'+c.year+'年</span>':'')+'</span><div class="move-buttons"><button class="move-button" data-action="up" data-value="'+id+'" aria-label="'+esc(c.event)+'を上へ" '+(blocked||i===0?'disabled':'')+'>↑</button><button class="move-button" data-action="down" data-value="'+id+'" aria-label="'+esc(c.event)+'を下へ" '+(blocked||i===QUIZ_SIZE-1?'disabled':'')+'>↓</button></div></li>';
 }).join('')+'</ol><div class="feedback '+(accepted?'success':state.message==='wrong'?'error':'')+'" role="status" aria-live="polite">'+feedback+'</div><div class="quiz-bottom"><button class="btn primary" data-action="judge" '+(blocked?'disabled':'')+'>'+(state.message==='wrong'?'１問目から再開します…':accepted?(q.solved===GOAL?'達成画面へ進みます…':'自動で次の問題へ…'):'この順番で答える')+'</button></div></section>';
}

function unitMenu(){
 return '<section class="panel units-panel"><div class="units-grid">'+UNITS.map(u=>{
 const cards=cardsForUnit(u.id),r=records[u.id],open=isUnlocked(u.id,records),locked=state.returnView==='quiz'&&!open;
 return '<button class="unit-option '+(u.requires.length?'total-unit ':'')+(locked?'locked':'')+'" data-action="select-unit" data-value="'+u.id+'" '+(locked?'disabled':'')+'><span class="unit-option-name">'+esc(u.name)+'</span><span>'+cards.length+'項目　'+cards[0].year+'–'+cards.at(-1).year+'年</span><strong>'+(r.cleared?'✓ 達成済み':!open?'🔒 並べ替えは基本'+u.requires.length+'区分達成で解放':r.quiz.solved+' / 5問連続正解')+'</strong></button>';
 }).join('')+'</div><p class="menu-note">年表・暗記カードは全区分を自由に見られます。並べ替えの総合は、各教科の基本区分達成後に挑戦できます。</p></section>';
}

function render(){app.innerHTML=shell(state.view==='units'?unitMenu():state.view==='timeline'?timeline():state.view==='cards'?study():quiz())+(state.celebrating?'<div class="correct-overlay" aria-hidden="true"><div class="correct-ring"></div><strong>正解！</strong></div>':'');}
let transitionTimer;
function finishTransition(){
 clearTimeout(transitionTimer);
 if(!state.transition)return;
 if(record.quiz.accepted)record.quiz=nextQuiz(record.quiz);
 state.transition=false;state.failedQuiz=null;state.celebrating=false;state.message='';save();
}
function startTransition(correct){
 state.transition=true;state.celebrating=correct;render();
 clearTimeout(transitionTimer);
 transitionTimer=setTimeout(()=>{finishTransition();render();},correct?1600:2400);
}
function moveCard(id,direction){
 if(record.quiz.accepted||state.transition)return;
 const index=record.quiz.order.indexOf(id),target=index+direction;if(index<0||target<0||target>=QUIZ_SIZE)return;
 [record.quiz.order[index],record.quiz.order[target]]=[record.quiz.order[target],record.quiz.order[index]];
 state.message='';save();render();
 const button=app.querySelector('[data-action="'+(direction<0?'up':'down')+'"][data-value="'+id+'"]');if(button&&!button.disabled)button.focus({preventScroll:true});
}
app.addEventListener('click',event=>{
 const b=event.target.closest('button[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,value=b.dataset.value;
 if(['units','select-unit','view','open-card'].includes(action))finishTransition();
 if(state.transition&&['judge','restart','up','down'].includes(action))return;
 if(action==='units'){state.returnView=state.view==='units'?'timeline':state.view;state.view='units';render();return;}
 if(action==='select-unit'){if(state.returnView==='quiz'&&!isUnlocked(value,records))return;selectUnit(value);return;}
 if(['judge','restart','next-question','up','down'].includes(action)&&!isUnlocked(unitId,records))return;
 if(action==='view'){state.view=value;state.message='';state.flipped=true;render();return;}
 if(action==='timeline-prev'||action==='timeline-next'){state.page+=action==='timeline-next'?1:-1;render();return;}
 if(action==='open-card'){state.index=CARDS.findIndex(c=>c.id===value);state.view='cards';state.flipped=false;render();return;}
 if(action==='flip'){state.flipped=!state.flipped;render();return;}
 if(['card-prev','card-next','review','remember'].includes(action)){
  if(state.flipped&&['review','remember'].includes(action))return;
  const id=CARDS[state.index].id;
  if(action==='remember'&&!record.known.includes(id))record.known.push(id);
  if(action==='review')record.known=record.known.filter(x=>x!==id);
  state.index=(state.index+(action==='card-prev'?-1:1)+CARDS.length)%CARDS.length;state.flipped=true;save();render();return;
 }
 if(action==='up'||action==='down'){moveCard(value,action==='up'?-1:1);return;}
 if(action==='judge'){
  const attempted=record.quiz,result=submitQuiz(attempted);record.quiz=result.quiz;
  state.message=result.correct?'':'wrong';state.failedQuiz=result.correct?null:attempted;
  if(result.newlyAccepted&&record.quiz.solved===GOAL)record.cleared=true;
  save();if(result.newlyAccepted||!result.correct)startTransition(result.correct);else render();return;
 }
 if(action==='restart'){record.quiz=createQuiz();state.message='';save();render();}
});
app.addEventListener('pointerdown',event=>{
 const handle=event.target.closest('[data-action="drag"]');if(!handle||handle.disabled||state.transition||event.button!==0)return;
 const list=handle.closest('.sort-list'),row=handle.closest('.sort-row');
 state.drag={id:row.dataset.id,pointerId:event.pointerId,startY:event.clientY,moved:false,list,row};
 list.setPointerCapture(event.pointerId);
 event.preventDefault();
});
app.addEventListener('pointermove',event=>{
 const drag=state.drag;if(!drag||event.pointerId!==drag.pointerId)return;
 if(!drag.moved&&Math.abs(event.clientY-drag.startY)<6)return;
 drag.moved=true;drag.row.classList.add('dragging');
 const other=[...drag.list.children].filter(row=>row!==drag.row);
 const next=other.find(row=>event.clientY<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2);
 drag.list.insertBefore(drag.row,next||null);
 [...drag.list.children].forEach((row,i)=>{row.querySelector('.sort-number').textContent=i+1;});
 event.preventDefault();
});
function finishDrag(event){const drag=state.drag;if(!drag||event.pointerId!==drag.pointerId)return;record.quiz.order=[...drag.list.children].map(row=>row.dataset.id);state.drag=null;if(drag.list.hasPointerCapture(event.pointerId))drag.list.releasePointerCapture(event.pointerId);state.message='';save();render();}
app.addEventListener('pointerup',finishDrag);
app.addEventListener('pointercancel',finishDrag);
function fit(){const w=window.innerWidth,h=window.visualViewport?.height||innerHeight;const sw=Math.max(768,w),sh=Math.max(650,h),scale=Math.min(w/sw,h/sh);const style=document.documentElement.style;style.setProperty('--stage-width',sw+'px');style.setProperty('--stage-height',sh+'px');style.setProperty('--stage-scale',scale);}
window.addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
save();fit();render();
