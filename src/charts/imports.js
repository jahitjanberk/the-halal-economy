/**
 * OIC halal-related imports, actuals through 2024 and the 2028 forecast.
 */
import { showTip, hideTip, isNarrow } from '../core/dom.js';
import { oicImports } from '../data/series.js';

export function drawImportsChart(){
  const svg=d3.select('#imports'); svg.selectAll('*').remove();
  const narrow=isNarrow();
  const W=narrow?340:520,H=narrow?250:260,mL=narrow?40:50,mR=narrow?30:30,mT=20,mB=36;
  svg.attr('viewBox',`0 0 ${W} ${H}`); const x=d3.scaleLinear().domain([2022,2028]).range([mL,W-mR]); const y=d3.scaleLinear().domain([0,650]).range([H-mB,mT]);
  svg.append('rect').attr('x',x(2024)).attr('width',x(2028)-x(2024)).attr('y',mT).attr('height',H-mB-mT).attr('fill','#F1F5F2');
  svg.append('g').attr('class','grid').selectAll('line').data(y.ticks(4)).join('line').attr('x1',mL).attr('x2',W-mR).attr('y1',d=>y(d)).attr('y2',d=>y(d));
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-mB})`).call(d3.axisBottom(x).tickValues([2022,2023,2024,2028]).tickFormat(d3.format('d')).tickSize(0)).select('.domain').remove();
  svg.append('g').attr('class','axis').attr('transform',`translate(${mL},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d=>'$'+d+'B').tickSize(0)).select('.domain').remove();
  const line=d3.line().x(d=>x(d.y)).y(d=>y(d.v)); const solid=oicImports.filter(d=>!d.proj);
  svg.append('path').attr('d',line(solid)).attr('fill','none').attr('stroke','#1F7A63').attr('stroke-width',2.5);
  svg.append('path').attr('d',line(oicImports.slice(-2))).attr('fill','none').attr('stroke','#1F7A63').attr('stroke-width',2.5).attr('stroke-dasharray','6 5');
  svg.append('g').selectAll('circle').data(oicImports).join('circle').attr('cx',d=>x(d.y)).attr('cy',d=>y(d.v)).attr('r',5).attr('fill',d=>d.proj?'#fff':'#1F7A63').attr('stroke','#1F7A63').attr('stroke-width',2.5).on('mousemove',(e,d)=>showTip(`<b>${d.y}${d.proj?' (forecast)':''}</b><br>$${d.v}B`,e.clientX,e.clientY)).on('mouseleave',hideTip);
  svg.append('g').selectAll('text').data(oicImports).join('text').attr('x',d=>x(d.y)).attr('y',d=>y(d.v)-12).attr('text-anchor','middle').attr('font-size',11.5).attr('font-weight',600).attr('fill','#3C5450').text(d=>'$'+d.v+'B');
  svg.append('text').attr('x',x(2026)).attr('y',mT+14).attr('text-anchor','middle').attr('fill','#6E837D').attr('font-size',11).text('Forecast ~8% a year');
  svg.attr('aria-label','OIC halal imports: $359B 2022, $408B 2023, $421.5B 2024, forecast $608B 2028.');
}
