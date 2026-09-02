/**
 * Per-chart export controls: the underlying figures as an HTML table, and the
 * SVG itself as SVG or PNG.
 *
 * Charts are drawn with CSS classes, so exporting means inlining the computed
 * styles onto the clone — otherwise the file renders unstyled elsewhere.
 */
import { el, download, toast } from '../core/dom.js';
import { state } from '../core/state.js';
import { sectors } from '../data/sectors.js';
import { consumerSpend, islamicFinance, oicImports } from '../data/series.js';
import { countries, byLabel } from '../data/countries.js';
import { deals } from '../data/markets.js';
import { cmpRows } from '../data/metrics.js';

const CREDIT = 'Source: DinarStandard SGIE 2025/26 & 2024/25; IFSB 2025; GASTAT. Compiled Sept 2026.';

/** Each key builds {cols, rows} on demand, so tables reflect current state. */
const tableData = {
  sectors: () => ({ cols: ['Sector', '2024 ($B)', '2029 forecast ($B)', 'CAGR %'], rows: sectors.map(s => [s.name, s.v2024, s.v2029, s.cagr]) }),
  trajectory: () => ({
    cols: ['Year', 'Consumer spend ($T)', 'Islamic finance assets ($T)'],
    rows: [2018, 2021, 2022, 2023, 2024, 2029].map(y => [
      y + (y === 2029 ? ' (forecast)' : ''),
      (consumerSpend.find(d => d.y === y) || {}).v ?? '',
      (islamicFinance.find(d => d.y === y) || {}).v ?? '',
    ]),
  }),
  rank: () => ({ cols: ['Rank', 'Country', 'GIEI 2024/25', 'Muslims (M)'], rows: countries.filter(c => c.giei).sort((a, b) => a.rank - b.rank).map(c => [c.rank, c.label, c.giei, c.pop]) }),
  imports: () => ({ cols: ['Year', 'OIC halal-related imports ($B)'], rows: oicImports.map(d => [d.y + (d.proj ? ' (forecast)' : ''), d.v]) }),
  deals: () => ({ cols: ['Edition', 'Scope', 'Item', 'Deals', 'Value ($B)', 'Note'], rows: deals.map(d => [d.ed, d.scope, d.item, d.n ?? '', d.v ?? '', d.note]) }),
  compare: () => {
    const cs = state.cmp.filter(Boolean).map(l => byLabel[l]);
    return { cols: ['Metric', ...cs.map(c => c.label)], rows: cmpRows.map(r => [r.k, ...cs.map(c => r.f(c) ?? '')]) };
  },
};

export function renderTable(key){
  const t = tableData[key]();
  return `<table><thead><tr>${t.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>` +
    t.rows.map(r => `<tr>${r.map(v => `<td class="${typeof v === 'number' ? 'num' : ''}">${v}</td>`).join('')}</tr>`).join('') +
    `</tbody></table>`;
}

/** Clone an on-page SVG into a standalone, self-styled document string. */
function svgToString(svgEl, title){
  const clone = svgEl.cloneNode(true);
  const vb = svgEl.getAttribute('viewBox').split(' ').map(Number);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', vb[2]);
  clone.setAttribute('height', vb[3] + 36);
  clone.setAttribute('viewBox', `0 0 ${vb[2]} ${vb[3] + 36}`);

  const src = svgEl.querySelectorAll('*'), dst = clone.querySelectorAll('*');
  src.forEach((s, i) => {
    const cs = getComputedStyle(s), d = dst[i];
    ['fill', 'stroke', 'stroke-width', 'font-family', 'font-size', 'font-weight', 'opacity', 'stroke-dasharray'].forEach(p => {
      const v = cs.getPropertyValue(p);
      if(v && v !== 'none' || p === 'fill' || p === 'stroke') d.style.setProperty(p, v);
    });
  });

  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', vb[2]); bg.setAttribute('height', vb[3] + 36); bg.setAttribute('fill', '#fff');
  clone.insertBefore(bg, clone.firstChild);

  /* The extra 36px of height is this source credit strip. */
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', 12); t.setAttribute('y', vb[3] + 24);
  t.setAttribute('font-family', 'Scoutie Sans, Arial, sans-serif');
  t.setAttribute('font-size', '11'); t.setAttribute('fill', '#6E837D');
  t.textContent = `${title} · ${CREDIT}`;
  clone.appendChild(t);

  return new XMLSerializer().serializeToString(clone);
}

export function exportSVG(id, name){
  download(name + '.svg', svgToString(document.getElementById(id), name), 'image/svg+xml');
}

export function exportPNG(id, name){
  const svgEl = document.getElementById(id);
  const s = svgToString(svgEl, name);
  const vb = svgEl.getAttribute('viewBox').split(' ').map(Number);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml;charset=utf-8' }));
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = vb[2] * 2; c.height = (vb[3] + 36) * 2;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    c.toBlob(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = name + '.png';
      a.click();
    });
  };
  img.onerror = () => toast('PNG export blocked here; SVG export still works.');
  img.src = url;
}

export function initExports(){
  document.querySelectorAll('.exports').forEach(x => {
    const svg = x.dataset.svg, name = x.dataset.name, tbl = x.dataset.table;
    if(svg){
      const b1 = el('button', {}, 'SVG'); b1.onclick = () => exportSVG(svg, name);
      const b2 = el('button', {}, 'PNG'); b2.onclick = () => exportPNG(svg, name);
      x.append(b1, b2);
    }
    if(tbl){
      const b3 = el('button', { 'aria-expanded': 'false' }, 'Table');
      b3.onclick = () => {
        const w = document.getElementById('tbl-' + tbl);
        if(!w.classList.contains('show')) w.innerHTML = renderTable(tbl);
        w.classList.toggle('show');
        b3.setAttribute('aria-expanded', w.classList.contains('show'));
      };
      x.append(b3);
    }

    reserveSpaceFor(x);
  });

  /* Buttons measured before the webfont arrives can grow afterwards, which
     would put the cluster back over the controls row. Measure again once the
     real font is in. */
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(() => document.querySelectorAll('.exports').forEach(reserveSpaceFor));
  }
}

/**
 * The export cluster is absolutely positioned in the card's top-right corner,
 * so the card's first row — a heading or a controls strip — has to keep clear
 * of it. The stylesheet carries a fallback; this replaces it with the width
 * actually measured, which differs between two- and three-button cards.
 *
 * No-op without a layout engine, leaving the CSS fallback in place.
 */
function reserveSpaceFor(exportsEl){
  const card = exportsEl.closest('.card');
  if(!card || !exportsEl.offsetWidth) return;
  card.style.setProperty('--exports-clear', (exportsEl.offsetWidth + 14) + 'px');
}
