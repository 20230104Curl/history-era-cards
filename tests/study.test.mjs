import test from 'node:test';
import assert from 'node:assert/strict';
import {DATA} from '../dist/data.js';
import {MNEMONICS,MNEMONIC_SOURCES} from '../dist/mnemonics.js';
import {makeTimeline,filterTimeline,timelinePage,paginateTimeline,TIMELINE_LABELS,PERIODS} from '../dist/timeline.js';
test('全80項目に語呂と読みを用意し、数字を順に合わせると教材の年号になる',()=>{
 assert.deepEqual(Object.keys(MNEMONICS).sort(),DATA.map(x=>x.id).sort());
 for(const event of DATA){const m=MNEMONICS[event.id];assert(m.text.length>5,event.id);assert(m.parts.length);assert(m.parts.every(p=>p.reading&&/^\d+$/.test(p.digits)));assert.equal(m.parts.map(x=>x.digits).join(''),String(event.year),event.id);assert(['reference','created'].includes(m.kind));if(m.kind==='reference')assert(MNEMONIC_SOURCES[m.source]?.url.startsWith('https://'));else assert.equal(m.source,null);}
 assert(Object.keys(MNEMONIC_SOURCES).length>=9);
 // 出発1519年、将門の挙兵935年など、別の出来事の語呂に置き換えない。
 assert.match(MNEMONICS.w1522.text,/船隊.*世界一周/);assert.match(MNEMONICS.j939.text,/新皇/);
});
test('年表は77年・80出来事を保持し、日本史は左、世界史は右の同一年に置く',()=>{
 const rows=makeTimeline(DATA);assert.equal(rows.length,77);assert.deepEqual(rows.map(x=>x.year),[...new Set(DATA.map(x=>x.year))].sort((a,b)=>a-b));
 assert.deepEqual(rows.flatMap(x=>[...x.japan,...x.world]).map(x=>x.id).sort(),DATA.map(x=>x.id).sort());
 for(const r of rows){assert(r.japan.every(x=>x.region==='japan'&&x.year===r.year));assert(r.world.every(x=>x.region==='world'&&x.year===r.year));}
 for(const year of [1543,1600,1853]){const row=rows.find(x=>x.year===year);assert.equal(row.japan.length,1);assert.equal(row.world.length,1);}
});
test('同じ年の片側を検索しても反対側の出来事を消さない。年代範囲でも欠落しない',()=>{
 const rows=makeTimeline(DATA),found=filterTimeline(rows,'all','コペルニクス');assert.equal(found.length,1);assert.equal(found[0].year,1543);assert.equal(found[0].japan[0].id,'j1543');
 assert.deepEqual(filterTimeline(rows,'all',' 1789 ').map(x=>x.year),[1789]);assert.equal(filterTimeline(rows,'all','存在しない語').length,0);
 const ranges=PERIODS.slice(1).flatMap(([id])=>filterTimeline(rows,id));assert.deepEqual(ranges.map(x=>x.year),rows.map(x=>x.year));
});
test('年表の見出しが全80項目にあり、短縮名でも元の出来事でも検索できる',()=>{
 assert.deepEqual(Object.keys(TIMELINE_LABELS).sort(),DATA.map(x=>x.id).sort());
 const rows=makeTimeline(DATA);assert.equal(filterTimeline(rows,'all','鉄砲伝来')[0].year,1543);assert.equal(filterTimeline(rows,'all','種子島')[0].year,1543);
});
test('固定行数のページも重複せず全ての年へ到達する',()=>{
 const rows=makeTimeline(DATA);
 for(let size=1;size<=14;size++){
  const first=timelinePage(rows,0,size),seen=[];
  for(let p=0;p<first.pages;p++){const page=timelinePage(rows,p,size);assert.equal(page.page,p);assert(page.rows.length<=size);seen.push(...page.rows.map(x=>x.year));}
  assert.deepEqual(seen,rows.map(x=>x.year));assert.equal(timelinePage(rows,999,size).page,first.pages-1);
 }
 assert.deepEqual(timelinePage([],0,3),{page:0,pages:1,rows:[]});
});
test('文章量に応じた行の高さを詰め、行を重複・欠落させず画面の高さに収める',()=>{
 const rows=makeTimeline(DATA),heights=rows.map((_,i)=>i%7===0?80:45);
 for(const available of [180,320,420,600]){
  const pages=paginateTimeline(rows,heights,available);assert.deepEqual(pages.flatMap(p=>p.rows.map(x=>x.year)),rows.map(x=>x.year));
  for(const p of pages){const total=p.rows.reduce((sum,row)=>sum+heights[rows.indexOf(row)],0);assert(total<=available);}
 }
 assert.equal(paginateTimeline(rows,Array(77).fill(44),352).length,10);
 assert.deepEqual(paginateTimeline([],[],300),[{rows:[]}]);
});
