/**
 * Boot the restructured dashboard in jsdom and assert it actually rendered.
 * Not a substitute for opening it in a browser, but it catches boot errors,
 * missing wiring and empty renders.
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { stubAtlas } from './atlas-stub.mjs';

const ROOT = new URL('..', import.meta.url);
const html = readFileSync(new URL('index.html', ROOT), 'utf8');

const dom = new JSDOM(html, { url: 'https://example.org/?v=dashboard', pretendToBeVisual: true });
const { window } = dom;

// Browser globals the app expects.
window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
window.IntersectionObserver = class { observe(){} disconnect(){} unobserve(){} };
window.URL.createObjectURL = () => 'blob:stub';
window.URL.revokeObjectURL = () => {};
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};

for(const k of ['window','document','navigator','location','history',
                'matchMedia','IntersectionObserver','Image','Blob','XMLSerializer','getComputedStyle',
                'Element','Node','SVGElement','HTMLElement','customElements','CSS','URL','URLSearchParams']){
  if(window[k] === undefined) continue;
  try { Object.defineProperty(globalThis, k, { value: window[k], configurable: true, writable: true }); }
  catch { /* read-only Node global (navigator); the app doesn't use it at boot */ }
}
globalThis.innerWidth = window.innerWidth;
globalThis.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
globalThis.d3 = d3;
globalThis.topojson = topojson;

// The map fetches world-atlas from a CDN. Serve it from a pinned fixture so the
// map actually renders under test and does not depend on someone else's deploy.
const atlas = stubAtlas();

const errors = [];
window.addEventListener('error', e => errors.push('window error: ' + e.message));
process.on('unhandledRejection', r => errors.push('unhandled rejection: ' + r));

try {
  await import(new URL('src/main.js', ROOT).href);
} catch (e) {
  console.log('BOOT FAILED:', e.stack.split('\n').slice(0, 6).join('\n'));
  process.exit(1);
}

await new Promise(r => setTimeout(r, 1500));

const d = window.document;
const checks = [
  ['sector bars drawn',        d.querySelectorAll('#sectorBars g g').length >= 6],
  ['growth scatter drawn',     d.querySelectorAll('#growthScatter circle').length >= 6],
  ['heatmap cells drawn',      d.querySelectorAll('#heat .hc').length >= 30],
  ['trajectory drawn',         d.querySelectorAll('#lineChart circle').length >= 8],
  ['finance donut drawn',      d.querySelectorAll('#donut path').length >= 3],
  ['segment growth drawn',     d.querySelectorAll('#segGrowth rect').length >= 6],
  ['finance share drawn',      d.querySelectorAll('#finShare rect').length >= 10],
  ['rank table filled',        d.querySelectorAll('#rankTable tbody tr').length >= 10],
  ['bump chart drawn',         d.querySelectorAll('#bump path').length >= 5],
  ['imports chart drawn',      d.querySelectorAll('#imports circle').length >= 4],
  ['deal table filled',        d.querySelectorAll('#dealTable tbody tr').length >= 10],
  ['listed table filled',      d.querySelectorAll('#listedTable tbody tr').length >= 10],
  ['certifier directory',      d.querySelectorAll('#certDir .d').length >= 15],
  ['compare grid rendered',    d.querySelectorAll('#cmpGrid .k').length >= 13],
  ['compare selects filled',   d.querySelectorAll('#c1 option').length >= 35],
  ['takeaway cards rendered',  d.querySelectorAll('#takeGrid .take').length === 3],
  ['so-what text set',         (d.getElementById('sowhat-map')?.textContent || '').length > 40],
  ['export buttons added',     d.querySelectorAll('.exports button').length >= 10],
  ['map panel reset',          (d.getElementById('side')?.textContent || '').includes('Pick a country')],
  ['layer hint set',           (d.getElementById('layerHint')?.textContent || '').length > 5],
  ['legend ramp painted',      (d.getElementById('ramp')?.getAttribute('style') || '').includes('linear-gradient')],
  ['KPI counters ran',         [...d.querySelectorAll('.kpi .num[data-count]')].every(e => /\d/.test(e.textContent))],
  ['URL state written',        window.location.search.includes('v=dashboard')],
];

let failed = 0;
for(const [name, ok] of checks){
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name);
  if(!ok) failed++;
}

console.log('\natlas fetch attempted: ' + atlas.requested());
if(errors.length){ console.log('\nRuntime errors:'); errors.slice(0, 10).forEach(e => console.log('  ' + e)); }
console.log('\n' + (failed ? failed + ' CHECK(S) FAILED' : 'ALL ' + checks.length + ' CHECKS PASSED'));
process.exit(failed || errors.length ? 1 : 0);
