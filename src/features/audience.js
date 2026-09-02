/**
 * The perspective switcher. Choosing an audience rewrites every "so what"
 * line, the takeaway cards, and the relevance badges, without touching data.
 */
import { state, writeURL } from '../core/state.js';
import { soWhat, takeaways } from '../content/narrative.js';

const AUDIENCE_NAMES = { public: 'Public', investor: 'Investors', policy: 'Policy', business: 'Business' };

export function applyAudience(){
  const s = soWhat[state.aud];
  Object.keys(s).forEach(k => { const e = document.getElementById('sowhat-' + k); if(e) e.innerHTML = s[k]; });

  const t = takeaways[state.aud];
  document.getElementById('takeTitle').textContent = t.title;
  document.getElementById('takeNote').textContent = t.note;
  document.getElementById('takeGrid').innerHTML = t.cards
    .map(c => `<div class="take"><div class="tag">${c.tag}</div><h3>${c.h}</h3><p>${c.p}</p></div>`).join('');

  document.querySelectorAll('.forwho').forEach(f => {
    const fors = f.dataset.for.split(' ');
    f.innerHTML = fors.map(a =>
      `<span class="${a === state.aud ? 'on' : ''}">${a === state.aud ? 'Relevant to you: ' : ''}${AUDIENCE_NAMES[a]}</span>`
    ).join('');
  });

  document.querySelectorAll('.chip[data-aud]').forEach(c => c.classList.toggle('active', c.dataset.aud === state.aud));

  /* The nav copy is reachable from anywhere; the hero chips are the first-run affordance. */
  const sel = document.getElementById('audSel');
  if(sel) sel.value = state.aud;
  writeURL();
}

export function setAudience(a){ state.aud = a; applyAudience(); }

export function initAudience(){
  document.querySelectorAll('.chip[data-aud]').forEach(ch => ch.addEventListener('click', () => setAudience(ch.dataset.aud)));
  const sel = document.getElementById('audSel');
  if(sel) sel.addEventListener('change', () => setAudience(sel.value));
}
