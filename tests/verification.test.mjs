/**
 * Guards the honesty of the verification layer.
 *
 * The failure this exists to prevent: a figure is edited, its `verified` flag
 * is left in place, and the page goes on claiming the new number was confirmed
 * against a source that never stated it.
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const ROOT = new URL('..', import.meta.url);

const {
  datasets, checks, statusFor, verificationLine, enumerateConfirmed, enumerateFigures, VERIFIED_ON,
} = await import(new URL('src/data/verification.js', ROOT).href);

const results = [];
const check = (name, fn) => {
  try { const r = fn(); results.push([name, r === true, typeof r === 'string' ? r : '']); }
  catch (e) { results.push([name, false, e.message]); }
};

/* ---- 1. Confirmed figures still hold the value that was confirmed ---- */

const pinned = JSON.parse(readFileSync(new URL('tests/confirmed-figures.json', ROOT), 'utf8'));
const current = enumerateConfirmed();
const pinnedById = new Map(pinned.map(p => [p.id, p.value]));
const currentById = new Map(current.map(p => [p.id, p.value]));

check('every confirmed figure still equals the value that was confirmed', () => {
  const drifted = current
    .filter(c => pinnedById.has(c.id) && pinnedById.get(c.id) !== c.value)
    .map(c => `${c.id}: confirmed as ${pinnedById.get(c.id)}, now reads ${c.value}`);
  return drifted.length === 0 || 're-verify or drop the flag — ' + drifted.join('; ');
});

check('no figure gained a confirmation without being pinned', () => {
  const added = current.filter(c => !pinnedById.has(c.id)).map(c => c.id);
  return added.length === 0 || 'not in confirmed-figures.json: ' + added.join(', ');
});

check('no pinned confirmation silently disappeared', () => {
  const gone = pinned.filter(p => !currentById.has(p.id)).map(p => p.id);
  return gone.length === 0 || 'pinned but no longer confirmed: ' + gone.join(', ');
});

/* ---- 2. `verified` flags name real, non-null fields ---- */

/*
 * A `verified` array belongs to the record, not to a dataset — two datasets can
 * partition the same records (countryGiei / countryProfile), so a field named
 * there may legitimately fall outside the dataset being iterated. The invariant
 * is that the field is real and non-null on the record, and that some dataset
 * over those records treats it as a figure (which catches typos).
 */
check('every verified field name exists and is non-null on its record', () => {
  const bad = [];
  for(const [key, ds] of Object.entries(datasets)){
    if(ds.count || ds.figures === null) continue;
    const recs = ds.records();
    const claimed = new Set(
      Object.values(datasets)
        .filter(o => !o.count && o.figures && o.records() === recs)
        .flatMap(o => o.figures)
    );
    for(const rec of recs){
      if(!Array.isArray(rec.verified)) continue;
      for(const f of rec.verified){
        if(!(f in rec) || rec[f] == null) bad.push(`${key}: "${f}" is verified but missing or null`);
        else if(!claimed.has(f)) bad.push(`${key}: "${f}" is not a figure field in any dataset`);
      }
    }
  }
  return bad.length === 0 || [...new Set(bad)].join('; ');
});

check('verified:true records have at least one non-null figure', () => {
  const bad = [];
  for(const [key, ds] of Object.entries(datasets)){
    if(ds.count || ds.figures === null) continue;
    for(const rec of ds.records()){
      if(rec.verified !== true) continue;
      if(!ds.figures.some(f => rec[f] != null)) bad.push(key + ': record marked verified has no figures');
    }
  }
  return bad.length === 0 || bad.join('; ');
});

/* ---- 3. Every dataset names a check that exists ---- */

check('every dataset points at a real entry in `checks`', () => {
  const bad = Object.entries(datasets)
    .filter(([, ds]) => !checks[ds.check])
    .map(([k, ds]) => `${k} -> ${ds.check}`);
  const badFields = Object.entries(datasets).flatMap(([k, ds]) =>
    Object.values(ds.byField || {}).filter(c => !checks[c]).map(c => `${k}.byField -> ${c}`));
  return [...bad, ...badFields].length === 0 || [...bad, ...badFields].join('; ');
});

check('every retrieved source records a URL and a date', () => {
  const bad = Object.entries(checks)
    .filter(([k, c]) => k !== 'derived' && (!c.url || !c.on))
    .map(([k]) => k);
  return bad.length === 0 || 'missing url/date: ' + bad.join(', ');
});

/* ---- 4. Markup wiring ---- */

const html = readFileSync(new URL('index.html', ROOT), 'utf8');
const dom = new JSDOM(html, { url: 'https://example.org/', pretendToBeVisual: true });
const { window } = dom;
const doc = window.document;

check('every data-d on a marker names a known dataset', () => {
  const unknown = [...doc.querySelectorAll('.src[data-d]')]
    .flatMap(m => m.dataset.d.split(/\s+/).filter(Boolean))
    .filter(k => !datasets[k]);
  return unknown.length === 0 || 'unknown dataset keys: ' + [...new Set(unknown)].join(', ');
});

check('every marker with a dataset produces a verification line', () => {
  const silent = [...doc.querySelectorAll('.src[data-d]')]
    .filter(m => !verificationLine(m.dataset.d.split(/\s+/).filter(Boolean)))
    .map(m => m.dataset.d);
  return silent.length === 0 || 'no line for: ' + silent.join(', ');
});

/*
 * data-fig carries ids in a space-separated attribute, so an id containing a
 * space shatters into fragments that silently match nothing — the marker then
 * renders no badge at all rather than failing loudly.
 */
check('no figure id contains whitespace', () => {
  const bad = enumerateFigures().filter(f => /\s/.test(f.id)).map(f => f.id);
  return bad.length === 0 || 'ids would shatter in data-fig: ' + bad.join(' | ');
});

check('every data-fig id resolves to a real figure', () => {
  const known = new Set(enumerateFigures().map(f => f.id));
  const bad = [...doc.querySelectorAll('.src[data-fig]')]
    .flatMap(m => m.dataset.fig.split(/\s+/).filter(Boolean))
    .filter(id => !known.has(id));
  return bad.length === 0 || 'unknown figure ids: ' + bad.join(', ');
});

check('a figure-scoped marker reports on that figure, not its series', () => {
  /* The $2.60T KPI is confirmed even though its series is only 2 of 5. */
  const single = verificationLine([], ['consumerSpend.2024.v']);
  const series = verificationLine(['consumerSpend']);
  return single.level === 'ok' && series.level === 'part';
});

check('the footer states the true confirmed/total count', () => {
  let c = 0, t = 0;
  for(const k of Object.keys(datasets)){ const r = statusFor([k]); c += r.confirmed; t += r.total; }
  const footer = doc.querySelector('footer').textContent;
  const m = footer.match(/(\d+)\s+of\s+(\d+)\s+figures on this page have been confirmed/);
  if(!m) return 'footer does not state a count';
  return (+m[1] === c && +m[2] === t) || `footer says ${m[1]} of ${m[2]}, actual is ${c} of ${t}`;
});

/* ---- 5. Rendered state ---- */

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

await import(new URL('src/main.js', ROOT).href);
const { applyVerificationMarks } = await import(new URL('src/features/provenance.js', ROOT).href);
await new Promise(r => setTimeout(r, 800));

/* Scoped to [data-d]: the footer legend reuses .src for its swatches. */
check('markers carry a verification class', () => {
  const marked = doc.querySelectorAll('.src[data-d].v-ok, .src[data-d].v-part, .src[data-d].v-no');
  const total = doc.querySelectorAll('.src[data-d]').length;
  return marked.length === total || `${marked.length} classed, ${total} have datasets`;
});

check('confirmed markers render a rosette with a tick', () => {
  const ok = [...doc.querySelectorAll('.src[data-d].v-ok')];
  if(!ok.length) return 'no confirmed markers';
  const bad = ok.filter(m => {
    const poly = m.querySelector('svg > polygon');
    const tick = m.querySelector('svg > path');
    return !poly || !tick;
  });
  return bad.length === 0 || `${bad.length} of ${ok.length} missing rosette or tick`;
});

check('the rosette is a many-sided polygon', () => {
  const poly = doc.querySelector('.src[data-d].v-ok svg > polygon');
  const sides = poly.getAttribute('points').trim().split(/\s+/).length;
  return sides >= 20 || `only ${sides} vertices`;
});

/*
 * A tick on a partly-confirmed chart would overclaim, so partial gets a dash.
 * The tick is reserved for "every figure behind this was checked".
 */
check('partial markers use a dash, never a tick', () => {
  const part = [...doc.querySelectorAll('.src[data-d].v-part')];
  if(!part.length) return 'no partial markers';
  const bad = part.filter(m => {
    const d = (m.querySelector('svg > path') || {}).getAttribute
      ? m.querySelector('svg > path').getAttribute('d') : '';
    return !/^M[\d.]+ [\d.]+ H[\d.]+$/.test(d.trim());
  });
  return bad.length === 0 || `${bad.length} partial markers do not carry a plain dash`;
});

check('unconfirmed markers render a circle with a query, not a rosette', () => {
  const no = [...doc.querySelectorAll('.src[data-d].v-no')];
  if(!no.length) return 'no unconfirmed markers';
  const bad = no.filter(m =>
    !m.querySelector('svg > circle') || m.querySelector('svg > polygon') ||
    (m.querySelector('svg > text') || {}).textContent !== '?');
  return bad.length === 0 || `${bad.length} of ${no.length} wrong`;
});

check('icons take their colour from CSS, not baked-in fills', () => {
  const bodies = [...doc.querySelectorAll('.src[data-d] svg > polygon, .src[data-d] svg > circle')];
  return bodies.length > 0 && bodies.every(b => b.getAttribute('fill') === 'currentColor');
});

check('markers with no dataset keep the plain "i"', () => {
  const plain = [...doc.querySelectorAll('.src[data-s]:not([data-d])')];
  return plain.length > 0 && plain.every(m => m.textContent === 'i' && !m.querySelector('svg'));
});

check('the footer legend shows all three badge states', () => {
  const f = doc.querySelector('footer');
  return !!f.querySelector('.vflag.v-ok') && !!f.querySelector('.vflag.v-part') && !!f.querySelector('.vflag.v-no');
});

/* ---- The point of the whole feature: readable without hovering ---- */

check('every marker with a dataset renders a text badge beside it', () => {
  const markers = [...doc.querySelectorAll('.src[data-d]')];
  const missing = markers.filter(m => {
    const n = m.nextElementSibling;
    return !n || !n.classList.contains('vflag');
  }).map(m => m.dataset.d);
  return missing.length === 0 || 'no badge for: ' + missing.join(', ');
});

check('badge text states the status in words, not a colour', () => {
  const texts = [...doc.querySelectorAll('.src[data-d] + .vflag')].map(b => b.textContent);
  const ok = texts.every(t => t === 'Confirmed' || t === 'Unconfirmed' || /^\d+ of \d+ confirmed$/.test(t));
  return ok || 'unexpected badge text: ' + [...new Set(texts)].join(' | ');
});

check('the four hero KPIs read Confirmed, matching their own figures', () => {
  const kpi = [...doc.querySelectorAll('.lbl .src[data-fig] + .vflag')].map(b => b.textContent);
  return (kpi.length === 4 && kpi.every(t => t === 'Confirmed'))
    || `${kpi.length} KPI badges: ${kpi.join(' | ')}`;
});

check('re-applying marks does not stack duplicate badges', () => {
  const before = doc.querySelectorAll('.vflag').length;
  applyVerificationMarks();
  applyVerificationMarks();
  return doc.querySelectorAll('.vflag').length === before
    || `${before} badges became ${doc.querySelectorAll('.vflag').length}`;
});

check('a confirmed tooltip names the source and the date', () => {
  const line = verificationLine(['sectors']);
  return line.level === 'ok'
    && line.text.startsWith('Confirmed against ')
    && line.text.includes(VERIFIED_ON);
});

check('an unconfirmed tooltip says to check before citing', () => {
  const line = verificationLine(['hajj']);
  return line.level === 'no' && line.text === 'Unconfirmed — check before citing.';
});

check('a partial tooltip gives both counts', () => {
  const line = verificationLine(['oicImports']);
  return line.level === 'part'
    && /^2 of 4 figures confirmed against /.test(line.text)
    && line.text.includes('The other 2 are unconfirmed');
});

check('markers carry their status in the accessible name', () => {
  const m = doc.querySelector('.src[data-d].v-no');
  return (m.getAttribute('aria-label') || '').includes('Unconfirmed');
});

let failed = 0;
for(const [name, ok, detail] of results){
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (!ok && detail ? '\n         ' + detail : ''));
  if(!ok) failed++;
}
console.log('\n' + (failed ? failed + ' of ' + results.length + ' FAILED' : 'ALL ' + results.length + ' VERIFICATION CHECKS PASSED'));
process.exit(failed ? 1 : 0);
