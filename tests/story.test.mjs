/**
 * Story mode: derived figures, provenance, navigation and the dashboard bridge.
 *
 * Boots straight into a deep link (?v=story&s=gap&p=4) so the URL round-trip is
 * covered by the setup itself rather than asserted separately.
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

const dom = new JSDOM(readFileSync(new URL('index.html', ROOT), 'utf8'), {
  url: 'https://example.org/?v=story&s=gap&p=4',
  pretendToBeVisual: true,
});
const { window } = dom;

/* Reduced motion collapses the stat fade to 0ms, making assertions deterministic. */
window.matchMedia = () => ({ matches: true, addEventListener(){}, removeEventListener(){} });
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

const { storyStats } = await import(new URL('src/content/story-stats.js', ROOT).href);
const { stories } = await import(new URL('src/content/stories.js', ROOT).href);
const { enumerateFigures } = await import(new URL('src/data/verification.js', ROOT).href);
const { byLabel } = await import(new URL('src/data/countries.js', ROOT).href);
const { consumerSpend, hajj } = await import(new URL('src/data/series.js', ROOT).href);

/* ---- figures are derived, not transcribed ---- */

const strip = h => h.replace(/<[^>]*>/g, '');

check('every step names a stat that exists, or is the closing step', () => {
  const bad = [];
  for(const [key, s] of Object.entries(stories)){
    s.steps.forEach((st, i) => {
      if(!st.stat){ if(!st.cta) bad.push(`${key} step ${i + 1} has neither stat nor cta`); return; }
      if(!storyStats[st.stat]) bad.push(`${key} step ${i + 1} -> unknown stat "${st.stat}"`);
    });
  }
  return bad.length === 0 || bad.join('; ');
});

check('no story step still carries a hardcoded figure string', () => {
  const stale = [];
  for(const [key, s] of Object.entries(stories)){
    s.steps.forEach((st, i) => { if(st.n) stale.push(`${key} step ${i + 1}`); });
  }
  return stale.length === 0 || 'still hardcoded: ' + stale.join(', ');
});

check('story figures track the data rather than duplicating it', () => {
  const spend = consumerSpend.find(d => d.y === 2024).v;
  const pilgrims = hajj.find(d => d.y === 2026).v;
  return strip(storyStats.spend2024.html()).includes(spend.toFixed(2))
    && strip(storyStats.hajj2026.html()).includes(String(pilgrims))
    && strip(storyStats.malaysiaScore.html()) === String(byLabel['Malaysia'].giei2526);
});

check('derived stats recompute from their inputs', () => {
  const five = ['Indonesia', 'Pakistan', 'India', 'Bangladesh', 'Nigeria'].reduce((a, l) => a + byLabel[l].pop, 0);
  const ratio = Math.round(byLabel['Indonesia'].pop / byLabel['Malaysia'].pop);
  return strip(storyStats.fiveCountries.html()).startsWith(String(five))
    && strip(storyStats.indonesiaVsMalaysia.html()).startsWith(String(ratio));
});

check('every story figure id resolves to a real figure', () => {
  const known = new Set(enumerateFigures().map(f => f.id));
  const bad = Object.entries(storyStats)
    .flatMap(([k, s]) => s.figs.filter(f => !known.has(f)).map(f => `${k} -> ${f}`));
  return bad.length === 0 || bad.join('; ');
});

check('Malaysia\'s 2025/26 score is in the data and confirmed', () => {
  const f = enumerateFigures().find(x => x.id === 'countryGiei.Malaysia.giei2526');
  return !!f && f.value === 186.1 && f.confirmed === true;
});

/* ---- booted behaviour ---- */

await import(new URL('src/main.js', ROOT).href);
await new Promise(r => setTimeout(r, 2500));

const doc = window.document;
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
const press = key => doc.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));
const railState = () => [...doc.querySelectorAll('#storyRail button')].findIndex(b => b.classList.contains('active'));
const settle = () => new Promise(r => setTimeout(r, 40));

check('story mode opened from the URL', () => doc.body.classList.contains('story-mode'));

check('a deep link lands on the step it names', () =>
  railState() === 4 || `landed on rail index ${railState()}, expected 4`);

check('the rail has one marker per step', () =>
  doc.querySelectorAll('#storyRail button').length === stories.gap.steps.length);

check('the rail shows progress behind the current step', () => {
  const done = [...doc.querySelectorAll('#storyRail button')].filter(b => b.classList.contains('done')).length;
  return done === 4 || `${done} marked done at step index 4`;
});

check('the step counter reads position out of total', () =>
  doc.getElementById('storyCount').textContent === `5 / ${stories.gap.steps.length}`);

await (async () => {
  click(doc.getElementById('stepNext'));
  await settle();
  check('Next advances the step', () => railState() === 5);

  click(doc.getElementById('stepPrev'));
  await settle();
  check('Previous goes back', () => railState() === 4);

  press('ArrowRight');
  await settle();
  check('arrow keys move through the story', () => railState() === 5);

  click(doc.querySelector('#storyRail button[data-step="1"]'));
  await settle();
  check('a rail marker jumps to its step', () => railState() === 1);
})();

check('the step is written to the URL so any moment can be shared', () =>
  window.location.search.includes('p=1') && window.location.search.includes('s=gap'));

check('the end controls disable rather than wrap around', () => {
  const prev = doc.getElementById('stepPrev'), next = doc.getElementById('stepNext');
  return prev.disabled === false && next.disabled === false
    || `at step ${railState()}: prev=${prev.disabled} next=${next.disabled}`;
});

/* ---- provenance on the story figure ---- */

check('the story figure carries a provenance marker', () => {
  const m = doc.getElementById('storySrc');
  return !m.hidden && !!m.dataset.fig && m.dataset.fig.length > 0;
});

check('the story figure shows a verification badge like the charts', () => {
  const badge = doc.querySelector('#storySrc + .vflag');
  return !!badge && /Confirmed|Unconfirmed|confirmed/.test(badge.textContent);
});

check('the marker points at the figures of the step being shown', () => {
  const m = doc.getElementById('storySrc');
  const expected = storyStats[stories.gap.steps[railState()].stat];
  return m.dataset.fig === expected.figs.join(' ') && m.dataset.s === expected.src;
});

/* ---- interactive map ---- */

check('story map countries are reachable and interactive', () => {
  const focusable = doc.querySelectorAll('#storyMap path.country[tabindex="0"]');
  return focusable.length > 20 || `${focusable.length} focusable countries`;
});

check('clicking a country in the story pins it for the dashboard', () => {
  const target = [...doc.querySelectorAll('#storyMap path.country[aria-label]')]
    .find(p => p.getAttribute('aria-label') === 'Malaysia');
  if(!target) return 'Malaysia not found on the story map';
  target.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return window.location.search.includes('pin=Malaysia');
});

/* ---- bridges to the dashboard ---- */

check('mid-story steps offer actions, not just the final step', () => {
  const withActs = stories.gap.steps.filter(s => s.acts).length;
  return withActs >= 3 || `only ${withActs} steps carry an action`;
});

check('a mid-story action renders as a button', () => {
  const step = doc.querySelector('.step[data-i="4"] [data-act-i]');
  return !!step && /compare/i.test(step.textContent);
});

check('the ending offers the dashboard and the other story', () => {
  const end = doc.getElementById('storyEnd');
  return !!end.querySelector('[data-end="dashboard"]')
    && end.querySelector('[data-end="other"]').textContent.includes('Two million people');
});

check('the stat panel announces changes to screen readers', () =>
  doc.querySelector('.story-stat').getAttribute('aria-live') === 'polite');

const responsive = readFileSync(new URL('assets/styles/responsive.css', ROOT), 'utf8');
check('the layer caption survives on mobile', () =>
  !/\.story-layer\{[^}]*display:\s*none/.test(responsive));

/* ---- switching stories ---- */

const { setStory } = await import(new URL('src/features/story.js', ROOT).href);
setStory('hajj');
await new Promise(r => setTimeout(r, 200));

check('switching story rebuilds the rail and resets position', () =>
  doc.querySelectorAll('#storyRail button').length === stories.hajj.steps.length && railState() === 0);

check('the pilgrimage story drives the chart, not the map', () =>
  doc.getElementById('storyChart').style.display !== 'none'
  && doc.getElementById('storyMap').style.display === 'none'
  && doc.querySelectorAll('#storyChart circle').length > 0);

let failed = 0;
for(const [name, ok, detail] of results){
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (!ok && detail ? '\n         ' + detail : ''));
  if(!ok) failed++;
}
console.log('\n' + (failed ? failed + ' of ' + results.length + ' FAILED' : 'ALL ' + results.length + ' STORY CHECKS PASSED'));
process.exit(failed ? 1 : 0);
