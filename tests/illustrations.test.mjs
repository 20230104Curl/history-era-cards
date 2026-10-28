import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { DATA } from '../dist/data.js';
import { MNEMONICS } from '../dist/mnemonics.js';
import { ILLUSTRATIONS } from '../dist/illustrations.js';

test('all 80 authoritative cards have a distinct, packaged anime image',()=>{
  assert.equal(DATA.length,80);
  assert.deepEqual(Object.keys(ILLUSTRATIONS).sort(),DATA.map(card=>card.id).sort());
  const hashes=new Set();let total=0;
  for(const {id} of DATA){
    const art=ILLUSTRATIONS[id];
    assert.equal(art.src,`./art/${id}.webp`);
    const bytes=readFileSync(new URL(`../dist/art/${id}.webp`,import.meta.url));
    assert.equal(bytes.toString('ascii',0,4),'RIFF',`${id}: WebP container`);
    assert.equal(bytes.toString('ascii',8,12),'WEBP',`${id}: WebP image`);
    assert.ok(bytes.length>10000,`${id}: full illustration, not a placeholder`);
    assert.ok(bytes.length<600000,`${id}: web-sized delivery`);
    hashes.add(createHash('sha256').update(bytes).digest('hex'));total+=bytes.length;
    assert.ok(MNEMONICS[id]);
    assert.ok(art.description.length>=12,`${id}: meaningful scene description`);
    assert.ok(art.cue.length>=3&&art.cue.length<=13,`${id}: concise cue`);
  }
  assert.equal(hashes.size,80,'each card uses its own illustration');
  assert.ok(total<35000000,'only the current image is requested, with a bounded overall package');
});

test('year and mnemonic lettering remain live, accessible HTML',()=>{
  const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
  assert.match(app,/class="anime-art" src="\$\{esc\(art.src\)\}"/);
  assert.match(app,/alt="\$\{esc\(art.description\)\}"/);
  assert.match(app,/class="year-number">\$\{item.year\}/);
  assert.match(app,/class="mnemonic-cue">\$\{esc\(art.cue\)\}/);
  assert.match(app,/aria-label="読みと数字の対応"/);
  assert.doesNotMatch(app,/art\.svg/);
});

test('approved mnemonic hooks remain unchanged',()=>{
  for(const [id,cue] of [['w375','みんなでGO！'],['j593','コックさん'],['j607','群れなして'],['j1086','入れ歯ムズムズ'],['j1582','いちごパンツ'],['j1774','いいな、梨！'],['j1787','いいな、花！']])assert.equal(ILLUSTRATIONS[id].cue,cue);
});
