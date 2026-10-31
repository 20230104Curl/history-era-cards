import {ALL_CARDS} from './data.js';
export const UNITS=[
{id:'jp-ancient',name:'日本史【古代】',region:'japan',min:0,max:1184,requires:[]},
{id:'jp-medieval',name:'日本史【鎌倉～安土桃山】',region:'japan',min:1185,max:1600,requires:[]},
{id:'jp-edo',name:'日本史【江戸】',region:'japan',min:1601,max:9999,requires:[]},
{id:'jp-all',name:'日本史総合',region:'japan',min:0,max:9999,requires:['jp-ancient','jp-medieval','jp-edo']},
{id:'world-early',name:'世界史【古代～大航海時代】',region:'world',min:0,max:1522,requires:[]},
{id:'world-late',name:'世界史【近代への歩み】',region:'world',min:1523,max:9999,requires:[]},
{id:'world-all',name:'世界史総合',region:'world',min:0,max:9999,requires:['world-early','world-late']}
];
export function cardsForUnit(id){const u=UNITS.find(u=>u.id===id);return u?ALL_CARDS.filter(c=>c.region===u.region&&c.year>=u.min&&c.year<=u.max):[];}
export function isUnlocked(id,records){const u=UNITS.find(u=>u.id===id);return !!u&&u.requires.every(key=>records[key]?.cleared===true);}
