/**
 * Hover/focus tooltips for the inline provenance markers (.src) and
 * glossary terms (.gl). Delegated, so dynamically rendered markers work too.
 *
 * A marker names its cited source (`data-s`), what kind of figure it is
 * (`data-k`), and which datasets it covers (`data-d`). The last of these is
 * what lets the tooltip state whether those figures were actually checked,
 * rather than leaving that distinction to the footer.
 */
import { showTip, hideTip } from '../core/dom.js';
import { verificationIcon } from '../core/icons.js';
import { sources, kinds, glossary } from '../data/sources.js';
import { verificationLine, statusFor, statusForIds } from '../data/verification.js';

/** Dataset keys a marker covers, from `data-d="sectors consumerSpend"`. */
const keysOf = elm => (elm.dataset.d || '').split(/\s+/).filter(Boolean);

/**
 * Specific figure ids, from `data-fig="consumerSpend.2024.v"`.
 * A marker sitting on a single number reports on that number rather than on
 * the whole series behind it — the hero KPI for $2.60T is confirmed even though
 * the 2018–2023 points in the same series are not.
 */
const figsOf = elm => (elm.dataset.fig || '').split(/\s+/).filter(Boolean);

function tipHtml(marker){
  const src = sources[marker.dataset.s];
  const kind = kinds[marker.dataset.k] || '';
  const v = verificationLine(keysOf(marker), figsOf(marker));

  let html = `<b>${kind}</b><br>${src.name}<br><span style="opacity:.7">${src.date}</span>`;
  if(v) html += `<span class="tip-v ${v.level}">${v.text}</span>`;
  return html;
}

/**
 * Short, readable state for a badge. The tooltip carries the detail (which
 * source, which date); this only has to be legible at a glance.
 */
function badgeText(level, confirmed, total){
  if(level === 'ok') return 'Confirmed';
  if(level === 'no') return 'Unconfirmed';
  return `${confirmed} of ${total} confirmed`;
}

/**
 * Put the verification state next to every figure that has one.
 *
 * A coloured 15px circle is not a visible distinction — the state has to be
 * readable without hovering, so the marker becomes a verification icon and
 * gains a text badge beside it.
 *
 * Idempotent: the icon is set by innerHTML and any existing badge is removed
 * first, so re-running replaces rather than stacks.
 */
export function applyVerificationMarks(){
  document.querySelectorAll('.src[data-s]').forEach(m => {
    const next = m.nextElementSibling;
    if(next && next.classList.contains('vflag')) next.remove();

    const keys = keysOf(m), figs = figsOf(m);
    const v = verificationLine(keys, figs);
    m.classList.remove('v-ok', 'v-part', 'v-no');
    if(!v) return;

    m.classList.add('v-' + v.level, 'has-icon');
    m.innerHTML = verificationIcon(v.level);
    m.setAttribute('aria-label', 'Source information. ' + v.text);

    const { confirmed, total } = figs.length ? statusForIds(figs) : statusFor(keys);
    const badge = document.createElement('span');
    badge.className = 'vflag v-' + v.level;
    badge.textContent = badgeText(v.level, confirmed, total);
    badge.title = v.text;
    m.after(badge);
  });
}

export function initProvenance(){
  document.addEventListener('mouseover', e => {
    const s = e.target.closest('.src[data-s]');
    if(s){ showTip(tipHtml(s), e.clientX, e.clientY); return; }
    const g = e.target.closest('.gl[data-g]');
    if(g) showTip(glossary[g.dataset.g], e.clientX, e.clientY);
  });
  document.addEventListener('mouseout', e => { if(e.target.closest('.src,.gl')) hideTip(); });

  /* A tap fires the same mouse events but never a matching mouseout, so on a
     touch screen a tip would otherwise stay up. Scrolling or tapping anything
     that isn't a tip source dismisses it. */
  window.addEventListener('scroll', hideTip, { passive: true });
  document.addEventListener('touchstart', e => {
    if(!e.target.closest('.src,.gl,svg')) hideTip();
  }, { passive: true });

  /* Keyboard equivalent: markers are focusable, so anchor the tip to the element. */
  document.addEventListener('focusin', e => {
    const s = e.target.closest('.src[data-s]');
    if(s){
      const r = s.getBoundingClientRect();
      showTip(tipHtml(s), r.left, r.top);
    }
  });
  document.addEventListener('focusout', e => { if(e.target.closest('.src')) hideTip(); });

  document.querySelectorAll('.src').forEach(s => s.setAttribute('aria-label', 'Source information'));
  applyVerificationMarks();
}
