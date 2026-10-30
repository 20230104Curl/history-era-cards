export function makeTimeline(data){
 const years=new Map();
 for(const event of data){if(!years.has(event.year))years.set(event.year,{year:event.year,japan:[],world:[]});years.get(event.year)[event.region].push(event);}
 return [...years.values()].sort((a,b)=>a.year-b.year);
}
export const PERIODS=[['all','すべての年代',-Infinity,Infinity],['early','375–999年',375,999],['middle','1000–1499年',1000,1499],['earlymodern','1500–1699年',1500,1699],['late','1700–1867年',1700,1867]];
export function filterTimeline(rows,period='all',query=''){
 const range=PERIODS.find(x=>x[0]===period)||PERIODS[0],q=query.trim().toLowerCase();
 return rows.filter(row=>row.year>=range[2]&&row.year<=range[3]&&(!q||`${row.year} ${[...row.japan,...row.world].map(x=>`${x.event} ${TIMELINE_LABELS[x.id]||''}`).join(' ')}`.toLowerCase().includes(q)));
}
// Fixed-capacity fallback; pages never repeat a row.
export function timelinePage(rows,page,size){
 const capacity=Math.max(1,Math.floor(size)||1),pages=Math.max(1,Math.ceil(rows.length/capacity));
 const current=Math.min(Math.max(0,Math.floor(page)||0),pages-1);
 return {page:current,pages,rows:rows.slice(current*capacity,(current+1)*capacity)};
}
// Greedy packing uses actual measured text heights; long rows do not enlarge every row.
export function paginateTimeline(rows,heights,available){
 const limit=Math.max(1,available),pages=[];let current=[],used=0;
 rows.forEach((row,i)=>{const height=Math.max(1,Number(heights[i])||44);if(current.length&&used+height>limit){pages.push({rows:current});current=[];used=0;}current.push(row);used+=height;});
 if(current.length||!pages.length)pages.push({rows:current});return pages;
}
// Only tighten near-fitting world labels. Keep long labels wrapped and preserve
// at least 90% of the normal size (and 16px on narrow screens).
export function fitTimelineLabels(container){
 const sizes={};
 for(const label of container.querySelectorAll('.world .timeline-event')){
  const style=getComputedStyle(label),base=parseFloat(style.fontSize);
  const available=label.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  const range=document.createRange();range.selectNodeContents(label);
  if(range.getClientRects().length<2)continue;
  label.style.whiteSpace='nowrap';
  const width=range.getBoundingClientRect().width;
  const size=Math.floor(base*(available-1)/width*10)/10;
  if(width>available&&size>=Math.max(16,base*.9)&&size<base){
   label.style.fontSize=size+'px';
   if(range.getBoundingClientRect().width<=available)sizes[label.dataset.value]=size;
   else label.style.removeProperty('font-size');
  }
  label.style.removeProperty('white-space');
 }
 return sizes;
}
export const TIMELINE_LABELS={
 w375:'ゲルマン民族の大移動',w476:'西ローマ帝国滅亡',w589:'隋の中国統一',w610:'ムハンマド、イスラム教を開く',w676:'新羅の朝鮮半島統一',w800:'カール大帝の戴冠',w936:'高麗の朝鮮半島統一',w1096:'第１回十字軍',w1215:'マグナ・カルタ制定',w1453:'東ローマ帝国滅亡',w1492:'コロンブス、西インド諸島へ',w1498:'バスコ・ダ・ガマ、インド到達',w1512:'ミケランジェロ、システィーナ礼拝堂の天井画完成',w1517:'ルターの宗教改革',w1522:'マゼラン船隊の世界一周',w1543:'コペルニクス『天球の回転について』刊行',w1600:'イギリス東インド会社設立',w1642:'ピューリタン革命',w1688:'名誉革命',w1748:'モンテスキュー『法の精神』',w1762:'ルソー『社会契約論』',w1776:'アメリカ独立宣言',w1789:'フランス革命',w1804:'ナポレオン皇帝に',w1815:'ウィーン会議終了',w1840:'アヘン戦争',w1851:'太平天国の乱',w1853:'クリミア戦争',w1857:'インド大反乱',w1861:'アメリカ南北戦争',
 j478:'倭王武、宋に使節派遣',j593:'聖徳太子が摂政に',j607:'小野妹子を隋に派遣',j645:'大化の改新',j663:'白村江の戦い',j672:'壬申の乱',j701:'大宝律令',j710:'平城京に遷都',j743:'墾田永年私財法',j794:'平安京に遷都',j894:'遣唐使の派遣停止',j939:'平将門、新皇を名のる',j1016:'藤原道長が摂政に',j1086:'白河上皇の院政開始',j1167:'平清盛が太政大臣に',j1185:'守護・地頭の設置',j1221:'承久の乱',j1232:'御成敗式目',j1334:'建武の新政',j1404:'日明貿易（勘合貿易）',j1428:'正長の土一揆',j1467:'応仁の乱',j1485:'山城国一揆',j1488:'加賀の一向一揆',j1543:'鉄砲伝来',j1549:'ザビエル、キリスト教伝来',j1573:'室町幕府滅亡',j1582:'本能寺の変',j1588:'豊臣秀吉の刀狩令',j1592:'文禄の役',j1600:'関ヶ原の戦い',j1603:'徳川家康、江戸幕府を開く',j1615:'武家諸法度',j1635:'参勤交代の制度化',j1637:'島原・天草一揆',j1639:'ポルトガル船の来航禁止・鎖国完成',j1709:'新井白石の政治',j1716:'徳川吉宗の享保の改革',j1742:'公事方御定書',j1772:'田沼意次が老中に',j1774:'『解体新書』刊行',j1787:'松平定信の寛政の改革',j1792:'ラクスマン来航',j1825:'異国船打払令',j1837:'大塩平八郎の乱',j1841:'水野忠邦の天保の改革',j1853:'ペリー来航',j1858:'日米修好通商条約',j1860:'桜田門外の変',j1867:'徳川慶喜の大政奉還'
};
