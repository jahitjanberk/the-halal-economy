/**
 * Consumer spend and Islamic finance assets, 2018-2029. Solid to the last
 * actual year, dashed into the forecast, with the forecast band shaded.
 */
import { showTip, hideTip, isNarrow } from '../core/dom.js';
import { MUTED, EMERALD, INK } from '../core/palette.js';
import { consumerSpend, islamicFinance } from '../data/series.js';

export function drawTrajectory(){
  const svg=d3.select('#lineChart'); svg.selectAll('*').remove();
  /* At 1060 wide this is the chart that suffers most on a phone: it would
     render at a third scale. Narrow trades width for height instead. */
  const narrow=isNarrow();
  const W=narrow?340:1060,H=narrow?320:340,mL=narrow?40:50,mR=narrow?24:60,mT=20,mB=narrow?34:40;
  svg.attr('viewBox',`0 0 ${W} ${H}`);
  const x=d3.scaleLinear().domain([2018,2029]).range([mL,W-mR]); const y=d3.scaleLinear().domain([0,10]).range([H-mB,mT]);
  svg.append('rect').attr('x',x(2024)).attr('width',x(2029)-x(2024)).attr('y',mT).attr('height',H-mB-mT).attr('fill','#F1F5F2');
  svg.append('text').attr('x',x(2026.5)).attr('y',mT+12).attr('text-anchor','middle').attr('fill',MUTED).attr('font-size',11).text('Forecast');
  svg.append('g').attr('class','grid').selectAll('line').data(y.ticks(5)).join('line').attr('x1',mL).attr('x2',W-mR).attr('y1',d=>y(d)).attr('y2',d=>y(d));
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-mB})`).call(d3.axisBottom(x).tickValues(narrow?[2018,2021,2024,2029]:[2018,2021,2022,2023,2024,2029]).tickFormat(d3.format('d')).tickSize(0)).select('.domain').remove();
  svg.append('g').attr('class','axis').attr('transform',`translate(${mL},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d=>'$'+d+'T').tickSize(0)).select('.domain').remove();
  const line=d3.line().x(d=>x(d.y)).y(d=>y(d.v));
  function series(data,color,label){
    const solid=data.filter(d=>!d.proj), last2=data.slice(-2);
    svg.append('path').attr('d',line(solid)).attr('fill','none').attr('stroke',color).attr('stroke-width',2.5);
    svg.append('path').attr('d',line(last2)).attr('fill','none').attr('stroke',color).attr('stroke-width',2.5).attr('stroke-dasharray','6 5');
    svg.append('g').selectAll('circle').data(data).join('circle').attr('cx',d=>x(d.y)).attr('cy',d=>y(d.v)).attr('r',5).attr('fill',d=>d.proj?'#fff':color).attr('stroke',color).attr('stroke-width',2.5).attr('tabindex',0).attr('aria-label',d=>`${label} ${d.y}: $${d.v}T`)
      .on('mousemove focus',(e,d)=>{const b=e.target.getBoundingClientRect(); showTip(`<b>${label}, ${d.y}</b><br>$${d.v.toFixed(2)}T${d.proj?' (forecast)':''}`,b.left+b.width/2,b.top);}).on('mouseleave blur',hideTip);
    /* Narrow has no right-hand gutter, so the end label sits above its point. */
    const last=data[data.length-1];
    svg.append('text').attr('x',narrow?x(2029)-2:x(2029)+10).attr('y',narrow?y(last.v)-11:y(last.v)+4)
      .attr('text-anchor',narrow?'end':'start').attr('fill',color).attr('font-size',12).attr('font-weight',600).text('$'+last.v+'T');
  }
  series(consumerSpend,EMERALD,'Consumer spend'); series(islamicFinance,INK,'Islamic finance assets');
  // annotation
  const ax=x(2023.5), ay=y(5.46); svg.append('line').attr('x1',ax).attr('x2',ax+40).attr('y1',ay).attr('y2',ay-40).attr('stroke',MUTED).attr('stroke-width',1);
  svg.append('text').attr('x',narrow?W-4:ax+44).attr('y',ay-44).attr('text-anchor',narrow?'end':'start').attr('font-size',11.5).attr('fill','#3C5450').attr('font-weight',600).text(narrow?'+$1.06T in one year':'+$1.06T in a single year');
  svg.attr('aria-label','Line chart. Consumer spend rose from $2.2T in 2018 to $2.6T in 2024, forecast $3.56T by 2029. Islamic finance assets rose from $3.96T in 2021 to $5.99T in 2024, forecast $9.72T by 2029.');
}
