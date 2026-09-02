/**
 * Sector spend bars. The x scale is fixed across both years so switching
 * 2024 -> 2029 reads as growth rather than a rescale.
 */
import { state, writeURL } from '../core/state.js';
import { showTip, hideTip, reduceMotion, fmtB, isNarrow } from '../core/dom.js';
import { MUTED, GOLD_FILL } from '../core/palette.js';
import { sectors, shortName } from '../data/sectors.js';

export function drawSectorBars(){
  const svg=d3.select('#sectorBars'); svg.selectAll('*').remove(); const year=state.year;
  /* Narrow: the chart is redrawn at phone width so the labels keep their size,
     which only leaves room for the shortened sector names. */
  const narrow=isNarrow();
  const W=narrow?340:520,H=narrow?300:300,mL=narrow?112:160,mR=narrow?58:70,rowH=44;
  svg.attr('viewBox',`0 0 ${W} ${H}`);
  const data=sectors.slice().sort((a,b)=>b['v'+year]-a['v'+year]);
  const x=d3.scaleLinear().domain([0,2150]).range([mL,W-mR]);
  const rows=svg.append('g').selectAll('g').data(data,d=>d.key).join('g').attr('transform',(d,i)=>`translate(0,${12+i*rowH})`);
  rows.append('text').attr('class','bar-label').attr('x',mL-12).attr('y',18).attr('text-anchor','end').text(d=>narrow?shortName(d.name):d.name);
  rows.append('rect').attr('x',mL).attr('y',6).attr('height',18).attr('rx',4).attr('fill','#DDEDE6').attr('width',x(2150)-mL);
  rows.append('rect').attr('x',mL).attr('y',6).attr('height',18).attr('rx',4).attr('fill',d=>d.key==='travel'?GOLD_FILL:'#1F7A63').attr('width',0).transition().duration(reduceMotion?0:700).ease(d3.easeCubicOut).attr('width',d=>x(d['v'+year])-mL);
  rows.append('text').attr('class','bar-val').attr('x',d=>x(d['v'+year])+8).attr('y',19).text(d=>fmtB(d['v'+year]));
  rows.on('mousemove',(e,d)=>showTip(`<b>${d.name}</b><br>2024: ${fmtB(d.v2024)}<br>2029: ${fmtB(d.v2029)}<br>Growth: ${d.cagr}% a year`,e.clientX,e.clientY)).on('mouseleave',hideTip);
  svg.append('text').attr('x',narrow?0:mL).attr('y',H-8).attr('fill',MUTED).attr('font-size',11).text(narrow?'Gold: fastest-growing sector. Scale fixed.':'Gold: fastest-growing sector. Scale fixed so the two years compare directly.');
  svg.attr('aria-label',`Bar chart of Muslim consumer spend by sector, ${year}. `+data.map(d=>`${d.name} ${fmtB(d['v'+year])}`).join(', '));
}

export function setYear(y){ state.year=y; document.querySelectorAll('#yearSeg button').forEach(x=>x.classList.toggle('active',+x.dataset.year===y)); drawSectorBars(); writeURL(); }

export function initYearSwitcher(){
  document.querySelectorAll('#yearSeg button').forEach(b => b.addEventListener('click', () => setYear(+b.dataset.year)));
}
