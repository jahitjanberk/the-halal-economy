/**
 * Drive the restructured dashboard through the interactions that the
 * refactor actually changed: delegated data-act buttons, the lazily
 * registered story initialiser, the tour, and the cross-module toggles.
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { stubAtlas } from './atlas-stub.mjs';

const ROOT = new URL('..', import.meta.url);
const dom = new JSDOM(readFileSync(new URL('index.html', ROOT), 'utf8'), { url: 'https://example.org/', pretendToBeVisual: true });
const { window } = dom;

window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
window.IntersectionObserver = class { observe(){} disconnect(){} unobserve(){} };
window.URL.createObjectURL = () => 'blob:stub';
window.URL.revokeObjectURL = () => {};
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};

for(const k of ['window','document','location','history','matchMedia','IntersectionObserver','Image','Blob',
                'XMLSerializer','getComputedStyle','Element','Node','SVGElement','HTMLElement','URL','URLSearchParams']){
  if(window[k] === undefined) continue;
  try { Object.defineProperty(globalThis, k, { value: window[k], configurable: true, writable: true }); } catch {}
}
globalThis.innerWidth = window.innerWidth;
globalThis.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
globalThis.d3 = d3;
globalThis.topojson = topojson;

const errors = [];
process.on('unhandledRejection', r => errors.push('unhandled rejection: ' + r));
window.addEventListener('error', e => errors.push('window error: ' + e.message));

stubAtlas();   /* map outlines from a fixture, before main.js fetches them */
await import(new URL('src/main.js', ROOT).href);
await new Promise(r => setTimeout(r, 1200));

const d = window.document;
const click = sel => { const e = d.querySelector(sel); if(!e) throw new Error('no element for ' + sel); e.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); return e; };
const results = [];
const check = (name, fn) => {
  try { const ok = fn(); results.push([name, !!ok]); }
  catch (e) { results.push([name, false, e.message]); }
};

// 1. Layer switch
check('layer switch to GIEI', () => {
  click('#layerSeg button[data-layer="giei"]');
  return d.getElementById('layerHint').textContent.includes('Global Islamic Economy Indicator')
      && window.location.search.includes('l=giei');
});

// 2. Year switch redraws the bars
check('year switch to 2029', () => {
  click('#yearSeg button[data-year="2029"]');
  const labels = [...d.querySelectorAll('#sectorBars .bar-val')].map(t => t.textContent);
  return labels.includes('$2,058B') && window.location.search.includes('y=2029');
});

// 3. Delegated data-act="pin" from the rank table
check('rank-table name pins the country', () => {
  const btn = d.querySelector('#rankTable [data-act="pin"]');
  const label = btn.getAttribute('data-c');
  btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return d.getElementById('side').textContent.includes(label)
      && window.location.search.includes('pin=');
});

/*
 * Pinning used to flatten every other country to one pale grey, discarding the
 * choropleth — and a pinned country low on the ramp came out the same near-white
 * as the dimmed ones, so nothing looked selected.
 */
check('pinning keeps the choropleth and rings the selection', () => {
  const paths = [...d.querySelectorAll('#map path.country')];
  if(paths.length < 100) return 'map outlines did not load';
  const byName = new Map(paths.map(p => [p.getAttribute('aria-label'), p]));
  const pinned = byName.get('Australia'), other = byName.get('Indonesia');
  if(!pinned || !other) return 'expected countries not focusable';

  pinned.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

  const distinctFills = pinned.getAttribute('fill') !== other.getAttribute('fill');
  const dimmed = parseFloat(other.getAttribute('fill-opacity')) < 1;
  const ringed = parseFloat(pinned.getAttribute('stroke-width')) >= 2
              && pinned.getAttribute('stroke') !== '#fff'
              && parseFloat(pinned.getAttribute('fill-opacity')) === 1;
  return (distinctFills && dimmed && ringed)
    || `fills distinct=${distinctFills} dimmed=${dimmed} ringed=${ringed}`;
});

// 4. Delegated data-act="compare" from the map side panel
check('side-panel button adds to compare', () => {
  const btn = d.querySelector('#side [data-act="compare"]');
  const label = btn.getAttribute('data-c');
  btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return [...d.querySelectorAll('#cmpGrid .h')].some(h => h.textContent === label);
});

// 5. Compare preset
check('compare preset applies', () => {
  const btn = d.querySelector('[data-preset]');
  const wanted = btn.getAttribute('data-preset').split(',').filter(Boolean);
  btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const shown = [...d.querySelectorAll('#cmpGrid .h')].map(h => h.textContent);
  return wanted.every(w => shown.includes(w));
});

// 6. Colour-blind ramp toggle (map-panel + story map, wired in main.js)
check('colour-blind toggle repaints legend', () => {
  const cb = d.getElementById('cb');
  cb.checked = true;
  cb.dispatchEvent(new window.Event('change', { bubbles: true }));
  return d.getElementById('ramp').getAttribute('style').includes('linear-gradient')
      && window.location.search.includes('cb=1');
});

// 7. Audience switch rewrites narrative + takeaways
check('audience switch to investor', () => {
  click('.chip[data-aud="investor"]');
  return d.getElementById('takeTitle').textContent === 'Where the opportunity sits'
      && d.querySelectorAll('#takeGrid .take').length === 3;
});

// 8. Table export toggle uses renderTable
check('table export renders a table', () => {
  const btn = [...d.querySelectorAll('.exports button')].find(b => b.textContent === 'Table');
  btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return d.querySelectorAll('.tablewrap.show table tbody tr').length > 0;
});

// 9. Entry helper shortlist
check('entry helper produces a shortlist', () => {
  d.querySelectorAll('.opts[data-q]').forEach(o => {
    const b = o.querySelector('button');
    b.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
  return d.querySelectorAll('#helperOut .r').length > 0
      && d.querySelectorAll('#helperOut [data-act]').length > 0;
});

// 10. Deal filter
check('deal filter narrows the table', () => {
  const before = d.querySelectorAll('#dealTable tbody tr').length;
  const sc = d.getElementById('dealScope');
  sc.value = 'Country';
  sc.dispatchEvent(new window.Event('input', { bubbles: true }));
  const after = d.querySelectorAll('#dealTable tbody tr').length;
  return after > 0 && after < before;
});

// 11. Certifier filter
check('certifier filter narrows the directory', () => {
  const f = d.getElementById('certFilter');
  f.value = 'JAKIM';
  f.dispatchEvent(new window.Event('input', { bubbles: true }));
  return d.querySelectorAll('#certDir .d').length === 1;
});

// 12. Changelog modal
check('changelog modal opens', () => {
  click('#changelog');
  return d.getElementById('modal').classList.contains('show')
      && d.querySelectorAll('#modalBody li').length >= 5;
});
click('#modalClose');

// 13. Language switch (RTL)
check('language switch to Arabic sets dir=rtl', () => {
  const sel = d.getElementById('lang');
  sel.value = 'ar';
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  return d.documentElement.dir === 'rtl' && d.querySelector('.brand').textContent.trim() === 'الاقتصاد الحلال';
});
(() => { const s = d.getElementById('lang'); s.value = 'en'; s.dispatchEvent(new window.Event('change', { bubbles: true })); })();

// 14. Guided tour
check('tour starts and advances', () => {
  click('#tourStart');
  const first = d.getElementById('tourStep').textContent;
  click('#tourNext');
  return first === 'Step 1 of 10' && d.getElementById('tourStep').textContent === 'Step 2 of 10'
      && d.getElementById('tour').classList.contains('show');
});
check('tour exits and resets', () => {
  click('#tourExit');
  return !d.getElementById('tour').classList.contains('show')
      && d.getElementById('side').textContent.includes('Pick a country');
});

// 15. Story mode — the lazily registered initialiser
click('.viewseg button[data-view="story"]');
await new Promise(r => setTimeout(r, 1200));
check('story mode builds the gap story', () =>
  d.body.classList.contains('story-mode')
  && d.querySelectorAll('#steps .step').length === 9
  && d.getElementById('siTitle').textContent.length > 10
  && d.getElementById('storyN').innerHTML.includes('B'));

check('story map rendered', () => d.querySelectorAll('#storyMap path.country').length > 100);

// 16. Second story drives the chart instead of the map
check('hajj story builds its chart', () => {
  click('.story-pick button[data-story="hajj"]');
  return d.querySelectorAll('#storyChart circle').length > 0
      && d.getElementById('storyChart').style.display !== 'none'
      && d.getElementById('storyMap').style.display === 'none';
});

check('back to dashboard', () => {
  click('.viewseg button[data-view="dashboard"]');
  return !d.body.classList.contains('story-mode');
});

let failed = 0;
for(const [name, ok, err] of results){
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (err ? '  [' + err + ']' : ''));
  if(!ok) failed++;
}
if(errors.length){ console.log('\nRuntime errors:'); [...new Set(errors)].slice(0, 8).forEach(e => console.log('  ' + e)); }
console.log('\n' + (failed ? failed + ' of ' + results.length + ' FAILED' : 'ALL ' + results.length + ' INTERACTIONS PASSED'));
process.exit(failed || errors.length ? 1 : 0);
