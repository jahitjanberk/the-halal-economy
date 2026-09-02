/**
 * Side-by-side country comparison. Up to three countries; the strongest
 * value in each row is highlighted where "strongest" is meaningful.
 */
import { state, writeURL } from '../core/state.js';
import { toast, reduceMotion } from '../core/dom.js';
import { countries, byLabel } from '../data/countries.js';
import { cmpRows } from '../data/metrics.js';
import { renderTable } from './exports.js';

let cSel = [];

export function renderCompare(){
  const cs = state.cmp.filter(Boolean).map(l => byLabel[l]).filter(Boolean);
  cSel.forEach((s, i) => { s.value = state.cmp[i] || ''; });

  const g = document.getElementById('cmpGrid');
  g.style.setProperty('--n', cs.length);

  let html = `<div class="k"></div>` + cs.map(c => `<div class="h">${c.label}</div>`).join('');
  cmpRows.forEach(r => {
    const vals = cs.map(c => r.f(c));
    const nums = vals.filter(v => typeof v === 'number');
    const best = r.best && nums.length > 1 ? (r.best === 'max' ? Math.max(...nums) : Math.min(...nums)) : null;
    html += `<div class="k">${r.k}</div>` + vals.map(v =>
      `<div class="${v === best ? 'best' : ''}">` +
      (v == null ? `<span style="color:#B7C4BF">—</span>` : `<span class="cmp-num">${r.fmt(v)}</span>`) +
      (r.bar && typeof v === 'number' ? `<div class="pillbar"><i style="width:${Math.min(100, v / r.bar * 100)}%"></i></div>` : '') +
      `</div>`
    ).join('');
  });
  g.innerHTML = html;

  const w = document.getElementById('tbl-compare');
  if(w.classList.contains('show')) w.innerHTML = renderTable('compare');
  writeURL();
}

/** Add a country to the first free slot, replacing the third if all are taken. */
export function addToCompare(label){
  if(state.cmp.includes(label)){
    toast(label + ' is already in the comparison.');
  } else {
    const i = state.cmp.indexOf('');
    if(i >= 0) state.cmp[i] = label; else state.cmp[2] = label;
  }
  renderCompare();
  document.getElementById('compare').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}

export function initCompare(){
  cSel = [document.getElementById('c1'), document.getElementById('c2'), document.getElementById('c3')];
  const sortedLabels = countries.map(c => c.label).sort();
  cSel.forEach((s, i) => {
    s.innerHTML = (i === 2 ? '<option value="">+ third country</option>' : '') +
      sortedLabels.map(l => `<option>${l}</option>`).join('');
    s.addEventListener('change', () => { state.cmp[i] = s.value; renderCompare(); });
  });
  document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
    const p = b.dataset.preset.split(',');
    state.cmp = [p[0], p[1], p[2] || ''];
    renderCompare();
  }));
}
