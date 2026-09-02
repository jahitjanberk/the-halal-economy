/**
 * Sector x country rank heatmap. Built as a CSS grid rather than SVG so the
 * cells stay selectable and reflow on small screens.
 */
import { sectorCols, sectorRanks } from '../data/sectors.js';

export function drawHeatmap(){
  const cs=['Malaysia','United Arab Emirates','Indonesia','Saudi Arabia','Türkiye','Bahrain'];
  /* The column count is data; the track sizes are the stylesheet's, so it can
     give them a scrollable minimum on a phone. */
  const h=document.getElementById('heat'); h.style.setProperty('--hn',sectorCols.length);
  const col=r=>r===1?'#1F7A63':r===2?'#5FA88F':r<=4?'#A6D1C1':'#E6EEE9'; const txt=r=>r<=2?'#fff':'#132D28';
  h.innerHTML=`<div class="hh"></div>`+sectorCols.map(s=>`<div class="hh">${s[1]}</div>`).join('')+cs.map(c=>`<div class="hr">${c}</div>`+sectorCols.map(s=>{ const v=(sectorRanks[c]||{})[s[0]]; return v?`<div class="hc" style="background:${col(v[0])};color:${txt(v[0])}" title="${c}, ${s[1]}: #${v[0]} (SGIE ${v[1]})">#${v[0]}<span style="font-size:9.5px;font-weight:500;opacity:.8;margin-left:4px">${v[1]}</span></div>`:`<div class="hc" style="background:#FAFBFA;color:#B7C4BF">—</div>`; }).join('')).join('');
}
