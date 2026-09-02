/**
 * The three Islamic finance panels: asset composition, segment growth and
 * the country concentration of assets.
 */
import { showTip, hideTip, reduceMotion } from '../core/dom.js';
import { finComposition, finGrowth, finShareCountries } from '../data/series.js';

export function drawCompositionDonut(){
  const svg=d3.select('#donut'); const W=320,H=260,R=90; const g=svg.append('g').attr('transform',`translate(${W/2},${H/2-10})`);
  const cols=['#1F7A63','#B8912F','#8FC3B2']; const arc=d3.arc().innerRadius(R-30).outerRadius(R).padAngle(.02).cornerRadius(3); const pie=d3.pie().value(d=>d.v).sort(null)(finComposition);
  g.selectAll('path').data(pie).join('path').attr('d',arc).attr('fill',(d,i)=>cols[i]).on('mousemove',(e,d)=>showTip(`<b>${d.data.name}</b><br>${d.data.v}% of assets`,e.clientX,e.clientY)).on('mouseleave',hideTip);
  g.append('text').attr('text-anchor','middle').attr('y',-4).attr('font-family','Fraunces, Georgia, serif').attr('font-weight',600).attr('font-size',30).attr('fill','#132D28').text('$5.99T');
  g.append('text').attr('text-anchor','middle').attr('y',18).attr('font-size',11.5).attr('fill','#6E837D').text('total assets, 2024');
  const lg=svg.append('g').attr('transform',`translate(16,${H-16})`); finComposition.forEach((d,i)=>{ const it=lg.append('g').attr('transform',`translate(${i*100},0)`); it.append('rect').attr('width',10).attr('height',10).attr('rx',2).attr('fill',cols[i]); it.append('text').attr('x',14).attr('y',9).attr('font-size',10.5).attr('fill','#3C5450').text(`${d.name.split(' ')[0]} ${d.v}%`); });
  svg.attr('aria-label','Donut: Islamic banking 71.6%, sukuk 23.3%, funds and takaful 5.1% of $5.99T.');
}

export function drawSegmentGrowth(){
  const svg=d3.select('#segGrowth'); const W=320,H=260,mL=20,rowH=64,top=20; const x=d3.scaleLinear().domain([0,30]).range([mL,W-60]);
  const rows=svg.append('g').selectAll('g').data(finGrowth).join('g').attr('transform',(d,i)=>`translate(0,${top+i*rowH})`);
  rows.append('text').attr('class','bar-label').attr('x',mL).attr('y',12).text(d=>d.name);
  rows.append('rect').attr('x',mL).attr('y',22).attr('height',16).attr('rx',4).attr('fill','#DDEDE6').attr('width',x(30)-mL);
  rows.append('rect').attr('x',mL).attr('y',22).attr('height',16).attr('rx',4).attr('fill',(d,i)=>i===0?'#B8912F':'#1F7A63').attr('width',0).transition().duration(reduceMotion?0:800).attr('width',d=>x(d.v)-mL);
  rows.append('text').attr('class','bar-val').attr('x',d=>x(d.v)+8).attr('y',35).text(d=>'+'+d.v+'%');
  svg.append('text').attr('x',0).attr('y',H-14).attr('font-size',10.5).attr('fill','#6E837D').text('IFSB Stability Report 2025. Sukuk = issuance volume.');
  svg.attr('aria-label','Bars: sukuk issuance +25.6%, Islamic banking +17.1%, takaful +16.9% in 2024.');
}

export function drawFinanceShare(){
  const svg=d3.select('#finShare'); const W=320,H=260,mL=78,rowH=22,top=8; const x=d3.scaleLinear().domain([0,30]).range([mL,W-44]);
  const rows=svg.append('g').selectAll('g').data(finShareCountries).join('g').attr('transform',(d,i)=>`translate(0,${top+i*rowH})`);
  rows.append('text').attr('x',mL-8).attr('y',13).attr('text-anchor','end').attr('font-size',11.5).attr('fill','#132D28').text(d=>d.name);
  rows.append('rect').attr('x',mL).attr('y',4).attr('height',12).attr('rx',3).attr('fill','#132D28').attr('fill-opacity',(d,i)=>1-i*.07).attr('width',0).transition().duration(reduceMotion?0:800).delay((d,i)=>i*40).attr('width',d=>x(d.v)-mL);
  rows.append('text').attr('x',d=>x(d.v)+6).attr('y',14).attr('font-size',11).attr('fill','#3C5450').attr('font-weight',600).text(d=>'~'+d.v+'%');
  svg.append('text').attr('x',0).attr('y',H-14).attr('font-size',10.5).attr('fill','#6E837D').text('Ten countries hold about 95% of global assets.');
  svg.attr('aria-label','Bars of approximate share of Islamic finance assets: Saudi Arabia 27%, Iran 27%, Malaysia 12%, UAE 10%, others smaller.');
}

export function drawFinanceCharts(){
  drawCompositionDonut();
  drawSegmentGrowth();
  drawFinanceShare();
}
