/**
 * Navigation, landmarks and dialog focus.
 *
 * These guard behaviour that is invisible when it works and easy to regress:
 * the mobile section list, the keyboard route past the nav, and dialogs that
 * claim to be modal actually behaving that way.
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const ROOT = new URL('..', import.meta.url);

const results = [];
const check = (name, fn) => {
  try { const r = fn(); results.push([name, r === true, typeof r === 'string' ? r : '']); }
  catch (e) { results.push([name, false, e.message]); }
};

/* ---- Stylesheet rules, read as text ---- */

const responsive = readFileSync(new URL('assets/styles/responsive.css', ROOT), 'utf8');
const layout = readFileSync(new URL('assets/styles/layout.css', ROOT), 'utf8');
const base = readFileSync(new URL('assets/styles/base.css', ROOT), 'utf8');

check('the section list is not hidden on mobile', () => {
  const mobile = responsive.slice(responsive.indexOf('@media (max-width:600px)'));
  const block = mobile.slice(0, mobile.indexOf('}\n@media') + 1 || mobile.length);
  return !/\.nav-links\s*\{[^}]*display:\s*none/.test(block)
    || '.nav-links is still display:none below 600px';
});

check('the active nav link has a visible style', () => /\.nav-links a\.active\s*\{/.test(layout));

/*
 * An author `display` rule silently beats the UA's [hidden] rule, which is what
 * left the nav overflow panel permanently open: .navmenu-panel sets display:flex.
 */
check('the hidden attribute cannot be overridden by a component display rule', () =>
  /\[hidden\]\{display:none!important;?\}/.test(base)
  || 'no global [hidden] reset, so any display: rule reopens hidden elements');
check('the skip link is styled offscreen until focused', () =>
  /\.skip-link\s*\{[^}]*top:-/.test(base) && /\.skip-link:focus\s*\{[^}]*top:0/.test(base));

/*
 * .exports is absolutely positioned in the card's top-right corner, so whatever
 * occupies the card's first row has to reserve room for it or they overlap —
 * which is exactly what happened to the map's colour-blind toggle.
 */
check('the controls row reserves space for the export buttons', () =>
  /\.controls\{[^}]*padding-right:var\(--exports-clear\)/.test(layout)
  || '.controls does not clear .exports, so they overlap');

check('headings and the controls row share one clearance value', () =>
  /--exports-clear:\s*\d+px/.test(base)
  && /\.card h3\{[^}]*padding-right:var\(--exports-clear\)/.test(layout));

check('clearance is dropped once exports return to normal flow', () => {
  const from = responsive.indexOf('@media (max-width:900px)');
  const block = responsive.slice(from, responsive.indexOf('@media (max-width:600px)'));
  return /\.exports\{position:static/.test(block)
    && /\.card h3,\.controls\{padding-right:0/.test(block);
});

/* ---- Markup ---- */

const html = readFileSync(new URL('index.html', ROOT), 'utf8');
const dom = new JSDOM(html, { url: 'https://example.org/', pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;

check('a skip link points at a real main landmark', () => {
  const skip = doc.querySelector('.skip-link');
  if(!skip) return 'no skip link';
  const target = doc.querySelector(skip.getAttribute('href'));
  return (target && target.tagName === 'MAIN') || 'skip link target is not <main>';
});

check('main wraps both views and excludes nav, footer and overlays', () => {
  const main = doc.querySelector('main');
  return main.contains(doc.getElementById('dashboardView'))
    && main.contains(doc.getElementById('storyView'))
    && !main.contains(doc.querySelector('nav'))
    && !main.contains(doc.querySelector('footer'))
    && !main.contains(doc.getElementById('modal'));
});

check('main is programmatically focusable for the skip link', () =>
  doc.querySelector('main').getAttribute('tabindex') === '-1');

check('every nav link points at a section that exists', () => {
  const bad = [...doc.querySelectorAll('.nav-links a[href^="#"]')]
    .filter(a => !doc.querySelector(a.getAttribute('href')))
    .map(a => a.getAttribute('href'));
  return bad.length === 0 || 'dangling: ' + bad.join(', ');
});

check('the tour and story labels distinguish themselves', () => {
  const tour = doc.getElementById('tourStart');
  const story = doc.querySelector('.viewseg button[data-view="story"]');
  return /tour/i.test(tour.textContent) && !!tour.title
    && /story/i.test(story.textContent) && !!story.title
    && tour.title !== story.title;
});

check('the map carries a provenance marker like every other chart', () => {
  const m = doc.querySelector('#map-section .src[data-d]');
  return !!m || 'the map is still the only chart with no source marker';
});

/* ---- Typography ---- */

check('the body face is Scoutie Sans, with Arabic still covered', () => {
  const sans = (base.match(/--sans:([^;]+);/) || [])[1] || '';
  return /^\s*'Scoutie Sans'/.test(sans) && /IBM Plex Sans Arabic/.test(sans)
    || 'stack is ' + sans.trim();
});

check('the stylesheet requests Scoutie Sans, Fraunces and the Arabic face', () => {
  /* The preconnect hint shares the host, so match the stylesheet specifically. */
  const link = doc.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com"]').getAttribute('href');
  return /Scoutie\+Sans/.test(link) && /Fraunces/.test(link) && /IBM\+Plex\+Sans\+Arabic/.test(link);
});

check('the fallback face carries measured metric overrides', () =>
  /@font-face\{font-family:'Scoutie Fallback'[^}]*size-adjust:[\d.]+%[^}]*\}/.test(base));

check('the wordmark is set in the sans, not the serif', () => {
  const serifRule = (base.match(/^([^\n]*)\{font-family:var\(--serif\)/m) || [])[1] || '';
  return !/\.brand/.test(serifRule) && /\.brand\{[^}]*font-family:var\(--sans\)/.test(layout);
});

/*
 * Scoutie Sans covers latin + latin-ext + vietnamese. Arrows (U+2190-21FF) and
 * geometric shapes (U+25A0-25FF) are outside it, so any that creep back into the
 * markup would silently render in a different face.
 */
check('no markup character falls outside the body face', () => {
  const outside = [...new Set([...doc.body.textContent].filter(ch => {
    const c = ch.codePointAt(0);
    return (c >= 0x2190 && c <= 0x21FF) || (c >= 0x25A0 && c <= 0x25FF) || c > 0x2E7F;
  }))];
  return outside.length === 0
    || 'outside Scoutie coverage: ' + outside.map(c => `${c} (U+${c.codePointAt(0).toString(16).toUpperCase()})`).join(', ');
});

/* ---- Method, citation and scriptless fallback ---- */

check('the page explains itself when scripts do not run', () => {
  const ns = doc.querySelector('noscript');
  return !!ns && /JavaScript/i.test(ns.textContent) && /Sources/i.test(ns.textContent);
});

check('a ready-made citation is offered with an access date', () => {
  const cite = doc.getElementById('citeText');
  return !!cite && !!doc.getElementById('citeDate') && !!doc.getElementById('copyCite')
    && /Halal Economy/.test(cite.textContent);
});

check('the method notes state what confirmed does and does not mean', () => {
  const method = doc.querySelector('.method');
  if(!method) return 'no method block';
  const text = method.textContent;
  return /means someone looked/i.test(text) && /not that the figure is true/i.test(text)
    && /range/i.test(text);
});

check('the compare table and entry helper carry provenance', () =>
  !!doc.querySelector('#compare .src[data-d]') && !!doc.querySelector('#business .src[data-d]'));

check('the helper option groups are radio groups', () => {
  const groups = [...doc.querySelectorAll('.opts[data-q]')];
  return groups.length === 3 && groups.every(g => g.getAttribute('role') === 'radiogroup' && g.getAttribute('aria-label'));
});

/* ---- Footer credit ---- */

check('the credit is the last thing in the footer', () => {
  const credit = doc.querySelector('footer .credit');
  if(!credit) return 'no credit line';
  return doc.querySelector('footer .wrap').lastElementChild === credit;
});

check('the credit names the author and links out to both destinations', () => {
  const credit = doc.querySelector('footer .credit');
  const links = [...credit.querySelectorAll('a')].map(a => a.getAttribute('href'));
  return /Made by/i.test(credit.textContent)
    && !!credit.querySelector('b')
    && links.some(h => /^https:\/\/jahit\.dev/.test(h))
    && links.some(h => /^https:\/\/github\.com\/jahitjanberk\/?$/.test(h))
    || 'links are ' + links.join(', ');
});

/* A new tab without noopener leaves the opener reachable from the target page. */
check('external credit links open safely', () => {
  const bad = [...doc.querySelectorAll('footer .credit a[target="_blank"]')]
    .filter(a => !/noopener/.test(a.getAttribute('rel') || ''))
    .map(a => a.getAttribute('href'));
  return bad.length === 0 || 'missing rel=noopener: ' + bad.join(', ');
});

/* ---- Booted behaviour ---- */

window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
window.IntersectionObserver = class { constructor(cb){ this.cb = cb; } observe(){} disconnect(){} unobserve(){} };
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

await import(new URL('src/main.js', ROOT).href);
await new Promise(r => setTimeout(r, 800));

const press = (el, key) => el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

/* --- overflow menu --- */

check('the map marker and its badge stay together as one flex item', () => {
  const prov = doc.querySelector('#map-section .prov');
  if(!prov) return 'marker is unwrapped, so space-between splits it from its badge';
  return prov.contains(doc.getElementById('mapSrc')) && !!prov.querySelector('.vflag');
});

check('the colour-blind toggle sits with the colour legend, not the controls', () =>
  !!doc.querySelector('.legend-bar #cb') && !doc.querySelector('.controls #cb'));

check('the nav utilities start collapsed behind one button', () => {
  const panel = doc.getElementById('morePanel');
  return panel.hidden
    && doc.getElementById('moreBtn').getAttribute('aria-expanded') === 'false'
    && panel.contains(doc.getElementById('lang'))
    && panel.contains(doc.getElementById('copyLink'));
});

check('the overflow menu opens and reports its state', () => {
  click(doc.getElementById('moreBtn'));
  return !doc.getElementById('morePanel').hidden
    && doc.getElementById('moreBtn').getAttribute('aria-expanded') === 'true';
});

check('Escape closes the overflow menu and returns focus to its button', () => {
  press(doc.getElementById('morePanel'), 'Escape');
  return doc.getElementById('morePanel').hidden
    && doc.activeElement === doc.getElementById('moreBtn');
});

/* --- the modal actually behaves as modal --- */

check('opening the changelog moves focus inside it', () => {
  click(doc.getElementById('changelog'));
  const modal = doc.getElementById('modal');
  return modal.classList.contains('show') && modal.contains(doc.activeElement);
});

check('Tab wraps inside the modal instead of escaping to the page', () => {
  const modal = doc.getElementById('modal');
  const items = [...modal.querySelectorAll('button')];
  items[items.length - 1].focus();
  press(modal, 'Tab');
  return modal.contains(doc.activeElement);
});

check('Escape closes the changelog and restores focus to its trigger', () => {
  press(doc.getElementById('modal'), 'Escape');
  return !doc.getElementById('modal').classList.contains('show')
    && doc.activeElement === doc.getElementById('changelog');
});

/* --- tour --- */

check('starting the tour puts focus on its Next control', () => {
  click(doc.getElementById('tourStart'));
  return doc.activeElement === doc.getElementById('tourNext');
});

check('typing in a field does not advance the tour', () => {
  const before = doc.getElementById('tourStep').textContent;
  const input = doc.getElementById('certFilter');
  input.focus();
  press(input, 'Enter');
  return doc.getElementById('tourStep').textContent === before
    || `tour moved from "${before}" while typing`;
});

check('exiting the tour restores focus to the button that started it', () => {
  click(doc.getElementById('tourExit'));
  return doc.activeElement === doc.getElementById('tourStart');
});

/* --- audience reachable from anywhere --- */

check('the nav perspective control mirrors the hero chips', () => {
  const sel = doc.getElementById('audSel');
  sel.value = 'policy';
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  const chip = doc.querySelector('.chip[data-aud="policy"]');
  return chip.classList.contains('active')
    && doc.getElementById('takeTitle').textContent.length > 5;
});

check('choosing a perspective in the hero updates the nav control', () => {
  click(doc.querySelector('.chip[data-aud="investor"]'));
  return doc.getElementById('audSel').value === 'investor';
});

/* --- map marker follows the layer --- */

check('the map marker changes source and dataset with the layer', () => {
  const m = doc.getElementById('mapSrc');
  click(doc.querySelector('#layerSeg button[data-layer="giei"]'));
  const giei = { s: m.dataset.s, d: m.dataset.d };
  click(doc.querySelector('#layerSeg button[data-layer="fin"]'));
  const fin = { s: m.dataset.s, d: m.dataset.d };
  return giei.d === 'countryGiei' && fin.d === 'countryFinance' && giei.s !== fin.s;
});

check('the map marker still renders a badge after switching layers', () => {
  const badge = doc.querySelector('#mapSrc + .vflag');
  return !!badge && badge.textContent.length > 0;
});

/* --- back to top --- */

check('back-to-top stays hidden until the page is scrolled', () =>
  doc.getElementById('toTop').hidden);

/* --- story mode --- */

check('a section link pressed in story mode returns to the dashboard', () => {
  click(doc.querySelector('.viewseg button[data-view="story"]'));
  if(!doc.body.classList.contains('story-mode')) return 'did not enter story mode';
  click(doc.querySelector('.nav-links a[href="#sectors"]'));
  return !doc.body.classList.contains('story-mode') || 'stayed in story mode';
});

let failed = 0;
for(const [name, ok, detail] of results){
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (!ok && detail ? '\n         ' + detail : ''));
  if(!ok) failed++;
}
console.log('\n' + (failed ? failed + ' of ' + results.length + ' FAILED' : 'ALL ' + results.length + ' NAVIGATION CHECKS PASSED'));
process.exit(failed ? 1 : 0);
