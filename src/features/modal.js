/**
 * The changelog dialog. The only true modal on the page, so it holds focus
 * while open and hands it back on close.
 */
import { changelog } from '../content/changelog.js';
import { captureFocus } from '../core/dialog.js';

export function initChangelogModal(){
  const modal = document.getElementById('modal');
  const trigger = document.getElementById('changelog');
  let release = null;

  function close(){
    modal.classList.remove('show');
    if(release){ release(); release = null; }
  }

  function open(){
    document.getElementById('modalTitle').textContent = 'Data and dashboard changelog';
    document.getElementById('modalBody').innerHTML =
      '<ul>' + changelog.map(c => `<li><b>${c[0]}.</b> ${c[1]}</li>`).join('') + '</ul>' +
      '<p style="font-size:13px;color:var(--muted)">SGIE publishes annually (mid-year); IFSB in May; GASTAT after each Hajj. Next expected refresh: SGIE 2026/27, mid-2027.</p>';
    modal.classList.add('show');
    release = captureFocus(modal, close, trigger);
  }

  document.getElementById('changelog').addEventListener('click', open);
  document.getElementById('modalClose').addEventListener('click', close);
  modal.addEventListener('click', e => { if(e.target.id === 'modal') close(); });
}
