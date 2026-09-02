/**
 * Type-ahead country search above the map. Selecting a result pins it.
 */
import { popFmt } from '../core/dom.js';
import { countries } from '../data/countries.js';
import { pinCountry } from './map-panel.js';

export function initSearch(){
  const sIn = document.getElementById('search');
  const sList = document.getElementById('searchList');

  sIn.addEventListener('input', () => {
    const q = sIn.value.trim().toLowerCase();
    if(!q){ sList.classList.remove('show'); return; }
    const hits = countries.filter(c => c.label.toLowerCase().includes(q)).slice(0, 8);
    sList.innerHTML = hits.map(c =>
      `<button role="option">${c.label} <span style="color:var(--muted)">· ${popFmt(c.pop)} Muslims${c.rank ? ' · GIEI #' + c.rank : ''}</span></button>`
    ).join('') || '<button disabled>No match</button>';
    sList.classList.toggle('show', true);
    [...sList.querySelectorAll('button')].forEach((b, i) => b.addEventListener('click', () => {
      pinCountry(hits[i].label);
      sIn.value = '';
      sList.classList.remove('show');
    }));
  });

  sIn.addEventListener('keydown', e => {
    if(e.key === 'ArrowDown'){ const f = sList.querySelector('button'); if(f) f.focus(); e.preventDefault(); }
    if(e.key === 'Escape') sList.classList.remove('show');
  });

  document.addEventListener('click', e => { if(!e.target.closest('.search')) sList.classList.remove('show'); });
}
