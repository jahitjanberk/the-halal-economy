/**
 * Investment-deal table with edition/scope/text filters, plus the static
 * list of publicly listed Sharia-compliant vehicles.
 */
import { el } from '../core/dom.js';
import { deals, listed } from '../data/markets.js';

/** Values below $1B read better in millions. */
const money = v => v == null ? '—' : (v >= 1 ? '$' + v + 'B' : '$' + Math.round(v * 1000) + 'M');

export function initDeals(){
  const ed = document.getElementById('dealEd');
  const sc = document.getElementById('dealScope');
  const q = document.getElementById('dealQ');

  [...new Set(deals.map(d => d.ed))].forEach(v => ed.append(el('option', {}, v)));
  [...new Set(deals.map(d => d.scope))].forEach(v => sc.append(el('option', {}, v)));

  function render(){
    const rows = deals.filter(d =>
      (!ed.value || d.ed === ed.value) &&
      (!sc.value || d.scope === sc.value) &&
      (!q.value || (d.item + d.note).toLowerCase().includes(q.value.toLowerCase()))
    );
    document.querySelector('#dealTable tbody').innerHTML = rows.map(d =>
      `<tr><td>${d.ed}</td><td>${d.scope}</td><td>${d.item}</td>` +
      `<td class="num">${d.n ?? '—'}</td><td class="num">${money(d.v)}</td>` +
      `<td style="color:var(--muted);font-size:12.5px">${d.note}</td></tr>`
    ).join('') || '<tr><td colspan="6" style="color:var(--muted)">No rows match.</td></tr>';
  }

  [ed, sc, q].forEach(e => e.addEventListener('input', render));
  render();

  document.querySelector('#listedTable tbody').innerHTML = listed.map(r =>
    `<tr><td>${r[0]}</td><td style="color:var(--muted)">${r[1]}</td><td style="font-size:13px">${r[2]}</td></tr>`
  ).join('');
}
