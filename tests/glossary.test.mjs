import test from 'node:test';
import assert from 'node:assert/strict';
import {DATA} from '../dist/data.js';
import {GLOSSARY} from '../dist/glossary.js';
test('glossary selectively supports existing cards with one short sentence and no answer dates',()=>{
 assert.equal(Object.keys(GLOSSARY).length,28);
 assert.ok(Object.keys(GLOSSARY).length<DATA.length);
 for(const [id,note] of Object.entries(GLOSSARY)){
  assert.ok(DATA.some(c=>c.id===id),id);
  assert.ok(note.term.length>0&&note.term.length<=20,id);
  assert.equal((note.text.match(/。/g)||[]).length,1,id);
  assert.ok(note.text.endsWith('。')&&note.text.length<=65,id);
  assert.doesNotMatch(note.text+note.term,/[0-9０-９]|https?:|<|>/,id);
 }
 assert.equal(GLOSSARY.j593.text,GLOSSARY.j1016.text);
 assert.equal(GLOSSARY.j710,undefined);
});
