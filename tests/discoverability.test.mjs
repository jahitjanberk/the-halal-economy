/**
 * References, social metadata and structured data.
 *
 * These are what turn a dashboard into something citable and findable: a reader
 * can follow every source, a shared link renders as a card, and a data index can
 * read the page. All three are silent when broken — a wrong og:image just looks
 * like no image — so they need asserting rather than eyeballing.
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const ROOT = new URL('..', import.meta.url);

const results = [];
const check = (name, fn) => {
  try { const r = fn(); results.push([name, r === true, typeof r === 'string' ? r : '']); }
  catch (e) { results.push([name, false, e.message]); }
};

const { sources } = await import(new URL('src/data/sources.js', ROOT).href);
const { FILES } = await import(new URL('src/data/bundle.js', ROOT).href);
const html = readFileSync(new URL('index.html', ROOT), 'utf8');
const dom = new JSDOM(html, { url: 'https://example.org/', pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;

/* ---- sources carry links ---- */

check('every source has a URL', () => {
  const bare = Object.entries(sources).filter(([, s]) => !s.url).map(([k]) => k);
  return bare.length === 0 || 'no URL for: ' + bare.join(', ');
});

check('every source URL is absolute and https', () => {
  const bad = Object.entries(sources).filter(([, s]) => !/^https:\/\//.test(s.url)).map(([k]) => k);
  return bad.length === 0 || 'not https: ' + bad.join(', ');
});

check('each source records whether its link was machine-checked', () => {
  const missing = Object.entries(sources).filter(([, s]) => !['ok', 'blocked'].includes(s.reached)).map(([k]) => k);
  return missing.length === 0 || 'no `reached` on: ' + missing.join(', ');
});

/* ---- social and icons ---- */

const meta = (sel, attr = 'content') => {
  const el = doc.querySelector(sel);
  return el ? el.getAttribute(attr) : null;
};

check('the page declares a canonical URL', () => /^https:\/\/\S+\/$/.test(meta('link[rel="canonical"]', 'href') || ''));

check('Open Graph covers title, description, image and url', () =>
  ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']
    .every(p => (meta(`meta[property="${p}"]`) || '').length > 3));

check('the share image is an absolute URL with declared dimensions', () => {
  const img = meta('meta[property="og:image"]');
  return /^https:\/\/.+\.png$/.test(img || '')
    && meta('meta[property="og:image:width"]') === '1200'
    && meta('meta[property="og:image:height"]') === '630';
});

check('the share image has alt text', () => (meta('meta[property="og:image:alt"]') || '').length > 20);

check('Twitter gets a large summary card', () =>
  meta('meta[name="twitter:card"]') === 'summary_large_image'
  && !!meta('meta[name="twitter:image"]'));

check('every absolute metadata URL shares one origin', () => {
  const urls = [
    meta('link[rel="canonical"]', 'href'),
    meta('meta[property="og:url"]'),
    meta('meta[property="og:image"]'),
    meta('meta[name="twitter:image"]'),
  ].filter(Boolean);
  const origins = new Set(urls.map(u => new URL(u).origin));
  return origins.size === 1 || 'mixed origins: ' + [...origins].join(', ');
});

check('the page has an icon and a touch icon', () =>
  !!meta('link[rel="icon"]', 'href') && !!meta('link[rel="apple-touch-icon"]', 'href'));

check('the referenced image files exist', () => {
  const missing = [];
  for(const f of ['assets/og-image.png', 'assets/favicon.svg', 'assets/apple-touch-icon.png']){
    try { readFileSync(new URL(f, ROOT)); } catch { missing.push(f); }
  }
  return missing.length === 0 || 'missing: ' + missing.join(', ');
});

/* ---- structured data ---- */

const ld = (() => {
  const el = doc.querySelector('script[type="application/ld+json"]');
  return el ? JSON.parse(el.textContent) : null;
})();

check('the page carries a schema.org Dataset', () => !!ld && ld['@type'] === 'Dataset');

check('the Dataset names its coverage and variables', () =>
  ld.spatialCoverage.length > 30 && ld.variableMeasured.length >= 8);

/* An index needs something it can fetch, not an anchor on the page. */
check('every declared distribution is a file that exists', () => {
  const missing = [];
  for(const d of ld.distribution){
    const path = d.contentUrl.replace(/^https:\/\/[^/]+\/[^/]+\//, '');
    if(!/^assets\/data\//.test(path)){ missing.push(d.contentUrl + ' (not a file)'); continue; }
    try { readFileSync(new URL(path, ROOT)); } catch { missing.push(path); }
  }
  return (ld.distribution.length >= 3 && missing.length === 0) || 'unfetchable: ' + missing.join(', ');
});

/*
 * The static files and the in-page downloads are built by the same code, so the
 * only way they diverge is someone editing the data and not re-running the
 * build. That would leave a crawler fetching different numbers from a reader.
 */
check('the static data files are current', () => {
  const stale = [];
  for(const [name, build] of Object.entries(FILES)){
    let onDisk;
    try { onDisk = readFileSync(new URL('assets/data/' + name, ROOT), 'utf8'); }
    catch { stale.push(name + ' (missing)'); continue; }
    if(onDisk !== build()) stale.push(name);
  }
  return stale.length === 0 || 'run `npm run data` — stale: ' + stale.join(', ');
});

check('every citation in the structured data has a resolvable URL', () => {
  const bad = ld.citation.filter(c => !/^https:\/\//.test(c.url || ''));
  return bad.length === 0 || `${bad.length} citations without a URL`;
});

check('structured data cites the same sources the page does', () => {
  const declared = new Set(Object.values(sources).map(s => s.url));
  const cited = new Set(ld.citation.map(c => c.url));
  return declared.size === cited.size && [...declared].every(u => cited.has(u));
});

/*
 * The block is generated. If someone edits the data and forgets to regenerate,
 * the page would advertise coverage it no longer has.
 */
check('the generated metadata is up to date with the data', () => {
  const before = readFileSync(new URL('index.html', ROOT), 'utf8');
  execSync('node scripts/build-metadata.mjs', { cwd: fileURLToPath(ROOT), stdio: 'pipe' });
  const after = readFileSync(new URL('index.html', ROOT), 'utf8');
  return before === after || 'index.html changed when regenerated — run `npm run metadata`';
});

/* ---- licensing ---- */

check('both licence files exist', () => {
  const missing=[];
  for(const f of ['LICENSE','DATA-LICENSE.md']){
    try { readFileSync(new URL(f, ROOT)); } catch { missing.push(f); }
  }
  return missing.length===0 || 'missing: '+missing.join(', ');
});

check('the code licence is a recognisable MIT text', () => {
  const t = readFileSync(new URL('LICENSE', ROOT), 'utf8');
  return /MIT License/.test(t) && /WITHOUT WARRANTY OF ANY KIND/.test(t) && /Copyright \(c\) \d{4}/.test(t);
});

/*
 * The data licence is the one that is easy to overstate. It has to keep saying
 * that the underlying figures are not covered.
 */
check('the data licence carves out the publishers figures', () => {
  const t = readFileSync(new URL('DATA-LICENSE.md', ROOT), 'utf8');
  return t.includes('creativecommons.org/licenses/by/4.0')
    && /[Nn]ot licensed here/.test(t)
    && /remain the property of those publishers/.test(t);
});

check('the structured data declares the compilation licence', () =>
  ld.license === 'https://creativecommons.org/licenses/by/4.0/' && !!ld.usageInfo);

check('the licence is stated on the page, not only in a file', () => {
  const text = doc.querySelector('#references').textContent;
  return /CC.BY.4.0/.test(text) && /not ours to license/i.test(text);
});

check('the offered citation names the licence', () =>
  /CC BY 4.0/.test(doc.getElementById('citeText').textContent));

/* ---- rendered references ---- */

check('crawler files exist and agree with the canonical origin', () => {
  const robots = readFileSync(new URL('robots.txt', ROOT), 'utf8');
  const sitemap = readFileSync(new URL('sitemap.xml', ROOT), 'utf8');
  const origin = new URL(meta('link[rel=canonical]', 'href')).origin;
  return /Allow:\s*\//.test(robots)
    && robots.includes(origin)
    && sitemap.includes(origin)
    && /<urlset/.test(sitemap)
    || 'robots/sitemap missing or on a different origin';
});


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

await import(new URL('src/main.js', ROOT).href);
await new Promise(r => setTimeout(r, 800));

check('the references list renders one entry per source', () =>
  doc.querySelectorAll('#refList .ref').length === Object.keys(sources).length);

check('every reference links out safely', () => {
  const links = [...doc.querySelectorAll('#refList .ref a')];
  return links.length === Object.keys(sources).length
    && links.every(a => /^https:\/\//.test(a.getAttribute('href')) && /noopener/.test(a.getAttribute('rel') || ''));
});

check('references say what they are cited for', () => {
  const used = doc.querySelectorAll('#refList .ref-use').length;
  return used >= 7 || `only ${used} of ${Object.keys(sources).length} references state their usage`;
});

check('references report how much has been checked', () =>
  doc.querySelectorAll('#refList .ref-v').length >= 7);

check('a source that blocks automated checks says so', () => {
  const blocked = Object.entries(sources).filter(([, s]) => s.reached === 'blocked').length;
  return doc.querySelectorAll('#refList .ref-note').length === blocked;
});

check('clicking a provenance marker jumps to its citation', () => {
  const marker = doc.querySelector('.src[data-s]');
  marker.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  const target = doc.getElementById('ref-' + marker.dataset.s);
  return !!target && target.classList.contains('flash');
});

let failed = 0;
for(const [name, ok, detail] of results){
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (!ok && detail ? '\n         ' + detail : ''));
  if(!ok) failed++;
}
console.log('\n' + (failed ? failed + ' of ' + results.length + ' FAILED' : 'ALL ' + results.length + ' DISCOVERABILITY CHECKS PASSED'));
process.exit(failed ? 1 : 0);
