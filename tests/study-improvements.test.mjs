import test from 'node:test';
import assert from 'node:assert/strict';
import {DATA} from '../dist/data.js';
import {MNEMONICS} from '../dist/mnemonics.js';
import {HISTORICAL_TERMS,highlightMnemonic} from '../dist/study.js';
import {TIMELINE_LABELS,makeTimeline,filterTimeline} from '../dist/timeline.js';

test('all 80 mnemonics highlight actual historical terms without changing wording',()=>{
 assert.deepEqual(Object.keys(HISTORICAL_TERMS).sort(),DATA.map(c=>c.id).sort());
 for(const item of DATA){
  const text=MNEMONICS[item.id].text,html=highlightMnemonic(item.id,text);
  assert.ok(HISTORICAL_TERMS[item.id].every(term=>text.includes(term)),item.id);
  assert.match(html,/<strong class="historical-term">/,item.id);
  assert.equal(html.replace(/<\/?strong[^>]*>/g,''),text,item.id);
 }
});
test('highlighting escapes HTML and never injects text as markup',()=>{
 assert.equal(highlightMnemonic('j794','<平安京>&"'), '&lt;<strong class="historical-term">平安京</strong>&gt;&amp;&quot;');
 assert.equal(highlightMnemonic('missing','<script>'), '&lt;script&gt;');
});
test('timeline names are readable without inferring a missing family name',()=>{
 const names={w1498:'バスコ・ダ・ガマ',j1588:'豊臣秀吉',j1603:'徳川家康',j1716:'徳川吉宗',j1787:'松平定信',j1841:'水野忠邦',j1867:'徳川慶喜'};
 for(const [id,name] of Object.entries(names)){
  assert.ok(TIMELINE_LABELS[id].includes(name),id);
  assert.ok(filterTimeline(makeTimeline(DATA),'all',name).some(row=>[...row.japan,...row.world].some(c=>c.id===id)),name);
 }
});
