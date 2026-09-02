/**
 * The Hajj pilgrim line used by story mode. Unlike the dashboard charts this
 * one is revealed progressively, so it returns a handle whose `show(upto)`
 * redraws the series up to a given year.
 */
import { isNarrow } from '../core/dom.js';
import { hajj } from '../data/series.js';

export function buildStoryChart(){
  const svg=d3.select('#storyChart'); svg.selectAll('*').remove();
  const narrow=isNarrow();
  const W=narrow?360:800,H=narrow?300:420,mL=narrow?38:56,mR=narrow?14:30,mT=narrow?26:30,mB=narrow?36:44;
  svg.attr('viewBox',`0 0 ${W} ${H}`);
  const x=d3.scaleLinear().domain([2012,2026]).range([mL,W-mR]); const y=d3.scaleLinear().domain([0,3.5]).range([H-mB,mT]);
  svg.append('g').attr('class','grid').selectAll('line').data(y.ticks(7)).join('line').attr('x1',mL).attr('x2',W-mR).attr('y1',d=>y(d)).attr('y2',d=>y(d));
  svg.append('g').attr('class','axis').attr('transform',`translate(0,${H-mB})`).call(d3.axisBottom(x).tickValues(narrow?hajj.map(d=>d.y).filter((_,i)=>i%2===0):hajj.map(d=>d.y)).tickFormat(d3.format('d')).tickSize(0)).select('.domain').remove();
  svg.append('g').attr('class','axis').attr('transform',`translate(${mL},0)`).call(d3.axisLeft(y).ticks(7).tickFormat(d=>d+'M').tickSize(0)).select('.domain').remove();
  svg.append('text').attr('x',narrow?0:mL).attr('y',narrow?12:16).attr('font-size',12).attr('fill','#6E837D').text(narrow?'Hajj pilgrims per year, millions':'Hajj pilgrims per year, millions (GASTAT)');
  const line=d3.line().x(d=>x(d.y)).y(d=>y(d.v)).curve(d3.curveMonotoneX);
  const path=svg.append('path').attr('fill','none').attr('stroke','#1F7A63').attr('stroke-width',3);
  const dots=svg.append('g'); const labels=svg.append('g');
  return { show(upto){ const d=hajj.filter(p=>p.y<=upto); path.attr('d',line(d)); dots.selectAll('circle').data(d,p=>p.y).join('circle').attr('cx',p=>x(p.y)).attr('cy',p=>y(p.v)).attr('r',6).attr('fill',p=>p.y===upto?'#B8912F':'#1F7A63').attr('stroke','#fff').attr('stroke-width',2); labels.selectAll('text').data(d.filter(p=>[2012,2019,2020,2023,2026].includes(p.y)),p=>p.y).join('text').attr('x',p=>x(p.y)).attr('y',p=>y(p.v)-14).attr('text-anchor','middle').attr('font-size',12).attr('font-weight',600).attr('fill','#3C5450').text(p=>p.v>=1?p.v.toFixed(2)+'M':Math.round(p.v*1000)+'k'); }};
}
