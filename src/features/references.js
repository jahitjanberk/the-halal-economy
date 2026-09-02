/**
 * The references list: every source on the page, with a link a reader can
 * actually follow.
 *
 * Until now the nine citations existed only as tooltip text — a reader could
 * see what a figure was attributed to but had no way to go and check it, which
 * is most of what a reference is for.
 *
 * The "used for" line is derived from the markers in the markup rather than
 * written by hand, so a source can never claim to back a chart it does not, and
 * a source that stops being cited shows up as unused instead of lingering.
 */
import { sources, kinds } from '../data/sources.js';
import { datasets, statusFor, VERIFIED_ON } from '../data/verification.js';
import { storyStats } from '../content/story-stats.js';

/**
 * Which datasets each source is cited against.
 *
 * Read off the page's markers, plus the story's own stats — story mode is built
 * lazily, so its citations are not in the DOM when this first runs and GASTAT
 * would otherwise appear in the list backing nothing.
 */
function usageBySource(){
  const use = new Map();
  const entry = key => {
    if(!use.has(key)) use.set(key, { datasets: new Set(), kinds: new Set() });
    return use.get(key);
  };

  document.querySelectorAll('.src[data-s]').forEach(m => {
    const e = entry(m.dataset.s);
    if(m.dataset.k) e.kinds.add(m.dataset.k);
    (m.dataset.d || '').split(/\s+/).filter(Boolean).forEach(d => e.datasets.add(d));
  });

  for(const stat of Object.values(storyStats)){
    const e = entry(stat.src);
    e.kinds.add(stat.kind);
    /* A figure id is `<dataset>.<record>.<field>`. */
    stat.figs.forEach(f => e.datasets.add(f.split('.')[0]));
  }

  return use;
}

const label = key => (datasets[key] && datasets[key].label) || key;

function listSentence(items){
  if(items.length <= 1) return items[0] || '';
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

function verificationFor(keys){
  if(!keys.length) return null;
  const { confirmed, total } = statusFor(keys);
  if(!total) return null;
  if(confirmed === total) return { level: 'ok', text: `All ${total} figures checked against this source, ${VERIFIED_ON}.` };
  if(confirmed === 0) return { level: 'no', text: `None of the ${total} figures drawn from this source have been checked yet.` };
  return { level: 'part', text: `${confirmed} of ${total} figures checked against this source, ${VERIFIED_ON}.` };
}

export function renderReferences(){
  const list = document.getElementById('refList');
  if(!list) return;

  const use = usageBySource();

  list.innerHTML = Object.entries(sources).map(([key, s]) => {
    const u = use.get(key);
    const keys = u ? [...u.datasets] : [];
    const used = keys.length ? listSentence(keys.map(label)) : null;
    const kindList = u && u.kinds.size ? listSentence([...u.kinds].map(k => (kinds[k] || k).toLowerCase())) : null;
    const v = verificationFor(keys);

    return `<li class="ref" id="ref-${key}">` +
      `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name}</a>` +
      `<span class="ref-date">${s.date}</span>` +
      (used ? `<p class="ref-use">Cited for ${used}.${kindList ? ` Presented as ${kindList}.` : ''}</p>` : '') +
      (v ? `<p class="ref-v v-${v.level}">${v.text}</p>` : '') +
      (s.reached === 'blocked'
        ? `<p class="ref-note">This publisher refuses automated requests, so the link could not be machine-checked — it points at their stable topic index rather than a deep link.</p>`
        : '') +
      `</li>`;
  }).join('');
}

/**
 * A provenance marker is the natural place to ask "says who?", so clicking one
 * jumps to its full citation. Hover still gives the summary; the click gives
 * the link.
 */
export function initReferences(){
  renderReferences();

  document.addEventListener('click', e => {
    const marker = e.target.closest('.src[data-s]');
    if(!marker) return;
    const target = document.getElementById('ref-' + marker.dataset.s);
    if(!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    target.classList.remove('flash');
    void target.offsetWidth;          /* restart the animation on repeat clicks */
    target.classList.add('flash');
    const link = target.querySelector('a');
    if(link) link.focus({ preventScroll: true });
  });
}
