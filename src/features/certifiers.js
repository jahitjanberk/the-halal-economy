/**
 * Filterable directory of halal certification and accreditation bodies.
 */
import { certBodies } from '../data/markets.js';

export function renderCerts(q = ''){
  const l = q.toLowerCase();
  document.getElementById('certDir').innerHTML = certBodies
    .filter(c => !l || c.c.toLowerCase().includes(l) || c.b.toLowerCase().includes(l))
    .map(c => `<div class="d"><b>${c.c}</b>${c.b}<br><span>${c.n}</span></div>`)
    .join('') || '<p style="color:var(--muted)">No match.</p>';
}

export function initCertifiers(){
  document.getElementById('certFilter').addEventListener('input', e => renderCerts(e.target.value));
  renderCerts();
}
