/**
 * Growth rate against absolute gain, bubble area = 2024 size.
 * The shaded quadrant marks "fast and large"; the dashed line is the
 * all-sector average growth rate.
 */
import { showTip, hideTip, fmtB, isNarrow } from '../core/dom.js';
import { MUTED, GOLD_INK } from '../core/palette.js';
import { sectors, shortName } from '../data/sectors.js';

export function drawGrowthScatter(){
  const svg=d3.select('#growthScatter'); svg.selectAll('*').remove();
  const narrow=isNarrow();
  const W=narrow?340:520,H=narrow?290:300,mL=narrow?42:50,mR=narrow?30:20,mT=16,mB=narrow?40:44;
  svg.attr('viewBox',`0 0 ${W} ${H}`);
  const x=d3.scaleLinear().domain([0,600]).range([mL,W-mR]); const y=d3.scaleLinear().domain([4,12.5]).range([H-mB,mT]); const r=d3.scaleSqrt().domain([0,1530]).range([narrow?5:6,narrow?22:30]);
  svg.append('rect').attr('x',x(300)).attr('y',mT).attr('width',W-mR-x(300)).attr('height',y(6.5)-mT).attr('fill','#F1F5F2');
  svg.append('text').attr('x',W-mR-6).attr('y',mT+14).attr('text-anchor','end').attr('fill',MUTED).attr('font-size',11).text('fast and large');
  svg.append('g').attr('class','grid').selectAll('line').data(y.ticks(5)).join('line').attr('x1',mL).attr('x2',W-mR).attr('y1',d=>y(d)).attr('y2',d=>y(d));
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-mB})`).call(d3.axisBottom(x).ticks(narrow?4:6).tickFormat(d=>'+$'+d+'B').tickSize(0)).select('.domain').remove();
  svg.append('g').attr('class','axis').attr('transform',`translate(${mL},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d=>d+'%').tickSize(0)).select('.domain').remove();
  svg.append('text').attr('x',W-mR).attr('y',H-8).attr('text-anchor','end').attr('fill',MUTED).attr('font-size',11).text('Absolute gain 2024–2029');
  svg.append('text').attr('x',mL).attr('y',10).attr('fill',MUTED).attr('font-size',11).text('Growth rate to 2029');
  svg.append('line').attr('x1',mL).attr('x2',W-mR).attr('y1',y(6.5)).attr('y2',y(6.5)).attr('stroke',GOLD_INK).attr('stroke-dasharray','4 4').attr('stroke-width',1.5);
  const pts=svg.append('g').selectAll('g').data(sectors).join('g');
  pts.append('circle').attr('cx',d=>x(d.v2029-d.v2024)).attr('cy',d=>y(d.cagr)).attr('r',d=>r(d.v2024)).attr('fill','#1F7A63').attr('fill-opacity',.75).attr('stroke','#fff').attr('stroke-width',1.5)
    .on('mousemove',(e,d)=>showTip(`<b>${d.name}</b><br>${fmtB(d.v2024)} in 2024<br>+${fmtB(d.v2029-d.v2024)} by 2029<br>${d.cagr}% a year`,e.clientX,e.clientY)).on('mouseleave',hideTip);
  /* Narrow leaves no room to the right of a bubble sitting past the midpoint,
     so those labels flip to its left. */
  const flip=d=>narrow&&x(d.v2029-d.v2024)>W/2;
  pts.append('text').attr('class','bar-label')
    .attr('x',d=>flip(d)?x(d.v2029-d.v2024)-r(d.v2024)-6:x(d.v2029-d.v2024)+r(d.v2024)+6)
    .attr('text-anchor',d=>flip(d)?'end':'start')
    .attr('y',d=>y(d.cagr)+4).text(d=>shortName(d.name));
  svg.attr('aria-label','Scatter of sector growth rate against absolute gain. Travel is fastest at 11.2%; food adds the most, over $500B.');
}
