/**
 * GIEI league table and the bump chart of top-five positions over time.
 * Country names in the table are buttons that pin the map (see main.js).
 */
import { showTip, hideTip, popFmt, attr, isNarrow } from '../core/dom.js';
import { MUTED, GOLD_FILL } from '../core/palette.js';
import { countries, rankHistory } from '../data/countries.js';

export function drawRankings(){
  const tb=document.querySelector('#rankTable tbody'); const top=countries.filter(c=>c.giei).sort((a,b)=>a.rank-b.rank);
  tb.innerHTML=top.map(c=>`<tr><td><span class="rk">${String(c.rank).padStart(2,'0')}</span></td><td><button class="mini" style="border:none;padding:0;font-weight:500" data-act="pin" data-scroll="1" data-c="${attr(c.label)}">${c.label}</button></td><td><div style="display:flex;align-items:center;gap:10px"><div class="scorebar" style="width:${(c.giei/165.1)*100}%"></div><span style="font-size:12.5px" class="num">${c.giei}</span></div></td><td class="num">${popFmt(c.pop)}</td></tr>`).join('');
  const svg=d3.select('#bump'); svg.selectAll('*').remove();
  const narrow=isNarrow();
  const W=narrow?340:520,H=narrow?280:300,mL=narrow?30:40,mR=narrow?92:150,mT=24,mB=30;
  svg.attr('viewBox',`0 0 ${W} ${H}`);
  const x=d3.scalePoint().domain(rankHistory.editions).range([mL,W-mR]); const y=d3.scaleLinear().domain([1,5]).range([mT,H-mB]);
  const cols={'Malaysia':'#1F7A63','Saudi Arabia':GOLD_FILL,'Indonesia':'#5FA88F','United Arab Emirates':'#132D28','Bahrain':'#C9A24B'};
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-mB+6})`).call(d3.axisBottom(x).tickSize(0)).select('.domain').remove();
  svg.append('g').attr('class','axis').attr('transform',`translate(${mL-10},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d=>'#'+d).tickSize(0)).select('.domain').remove();
  const line=d3.line().x((d,i)=>x(rankHistory.editions[i])).y(d=>y(d)).curve(d3.curveMonotoneX);
  rankHistory.rows.forEach(r=>{ svg.append('path').attr('d',line(r.r)).attr('fill','none').attr('stroke',cols[r.c]).attr('stroke-width',2.5).attr('opacity',.9); svg.append('g').selectAll('circle').data(r.r).join('circle').attr('cx',(d,i)=>x(rankHistory.editions[i])).attr('cy',d=>y(d)).attr('r',5).attr('fill',cols[r.c]).attr('stroke','#fff').attr('stroke-width',1.5).on('mousemove',(e,d)=>showTip(`<b>${r.c}</b><br>#${d}`,e.clientX,e.clientY)).on('mouseleave',hideTip); svg.append('text').attr('x',x(rankHistory.editions.at(-1))+(narrow?9:12)).attr('y',y(r.r.at(-1))+4).attr('font-size',12).attr('fill',cols[r.c]).attr('font-weight',600).text(r.c.replace('United Arab Emirates','UAE')); });
  svg.append('text').attr('x',mL).attr('y',12).attr('font-size',11).attr('fill',MUTED).text(narrow?'Intermediate editions not shown.':'Gap between 2019/20 and 2023/24: intermediate editions not shown.');
  svg.attr('aria-label','Bump chart of top-five GIEI positions. Malaysia first throughout; UAE rose from 4th to 2nd in 2025/26; Saudi Arabia 2nd to 3rd.');
}
