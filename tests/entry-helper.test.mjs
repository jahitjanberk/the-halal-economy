/**
 * The market entry helper.
 *
 * Two things are worth guarding. First, the arithmetic on screen must be the
 * arithmetic behind the score — a shortlist that shows its working and then
 * doesn't add up is worse than one that shows nothing. Second, the shortlist
 * has to respond to the answers: an earlier version returned Malaysia or
 * Indonesia at the top of 92% of all 54 combinations, which meant it was
 * ranking the biggest halal markets rather than answering the question.
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

const dom = new JSDOM(readFileSync(new URL('index.html', ROOT), 'utf8'), { url: 'https://example.org/', pretendToBeVisual: true });
const { window } = dom;
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
await new Promise(r => setTimeout(r, 600));

const doc = window.document;
const pick = (q, v) => doc.querySelector(`.opts[data-q="${q}"] button[data-v="${v}"]`)
  .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

const SECTORS = ['food', 'fashion', 'travel', 'pharma', 'media', 'fin'];
const MODELS = ['volume', 'premium', 'export'];
const HOMES = ['west', 'asia', 'mena'];

const readResults = () => [...doc.querySelectorAll('#helperOut .r')].map(r => ({
  name: r.querySelector('b').textContent.replace(/^\d+\.\s*/, ''),
  score: parseInt(r.querySelector('.f-score').textContent, 10),
  points: [...r.querySelectorAll('.f-lines .f-pts')].map(p => parseInt(p.textContent, 10)),
  bar: r.querySelector('.fitbar i'),
  missing: !!r.querySelector('.f-missing'),
}));

/* ---- gating ---- */

check('no shortlist appears until all three questions are answered', () => {
  pick('sector', 'food');
  return doc.querySelectorAll('#helperOut .r').length === 0;
});

/* ---- the shown arithmetic is the real arithmetic ---- */

const everyCombo = [];
for(const s of SECTORS) for(const m of MODELS) for(const h of HOMES){
  pick('sector', s); pick('model', m); pick('home', h);
  everyCombo.push({ key: `${s}/${m}/${h}`, rows: readResults() });
}

check('displayed points add up to the displayed score, everywhere', () => {
  const bad = [];
  for(const { key, rows } of everyCombo){
    for(const r of rows){
      const sum = r.points.reduce((a, p) => a + p, 0);
      if(sum !== r.score) bad.push(`${key} ${r.name}: lines total ${sum}, score reads ${r.score}`);
    }
  }
  return bad.length === 0 || bad.slice(0, 3).join('; ') + (bad.length > 3 ? ` (+${bad.length - 3} more)` : '');
});

check('no score exceeds the 100 the weights allow', () => {
  const over = everyCombo.flatMap(c => c.rows).filter(r => r.score > 100);
  return over.length === 0 || `${over.length} results scored above 100`;
});

check('every result explains at least one factor', () => {
  const silent = everyCombo.flatMap(c => c.rows).filter(r => r.points.length === 0 && !r.missing);
  return silent.length === 0 || `${silent.length} results showed no factors`;
});

check('the fit bar is proportional to the score', () => {
  pick('sector', 'media'); pick('model', 'premium'); pick('home', 'mena');
  const rows = readResults();
  const top = rows[0];
  const bad = rows.filter(r => {
    const want = Math.round(r.score / top.score * 100);
    return Math.abs(parseInt(r.bar.style.width, 10) - want) > 1;
  });
  return bad.length === 0 || `${bad.length} bars disagree with their score`;
});

/* ---- honesty about gaps and about precision ---- */

check('a market with no published sector rank says so', () => {
  pick('sector', 'food'); pick('model', 'volume'); pick('home', 'asia');
  const rows = readResults();
  const flagged = rows.filter(r => r.missing);
  return flagged.length > 0 && flagged.every(r => !r.points.some((p, i) => i === 0 && p > 30))
    || 'no result distinguished missing sector data from a poor fit';
});

check('near-ties are called out rather than implied away', () => {
  let sawNote = false, sawWrongNote = false;
  for(const s of SECTORS) for(const m of MODELS) for(const h of HOMES){
    pick('sector', s); pick('model', m); pick('home', h);
    const rows = readResults();
    const spread = rows[0].score - rows[rows.length - 1].score;
    const note = doc.querySelector('#helperOut .fit-note');
    if(spread <= 8){ if(note) sawNote = true; else return `spread ${spread} went unflagged for ${s}/${m}/${h}`; }
    else if(note) sawWrongNote = true;
  }
  return (sawNote && !sawWrongNote) || (sawWrongNote ? 'a tie note appeared on a wide spread' : 'no near-tie ever flagged');
});

/* ---- the shortlist responds to the answers ---- */

const lists = everyCombo.map(c => c.rows.map(r => r.name).join('|'));
const distinct = new Set(lists).size;

check('answers produce meaningfully different shortlists', () =>
  distinct >= 30 || `only ${distinct} distinct shortlists from ${lists.length} combinations`);

check('no single market dominates the top spot', () => {
  const tally = new Map();
  for(const c of everyCombo){
    const first = c.rows[0] && c.rows[0].name;
    if(first) tally.set(first, (tally.get(first) || 0) + 1);
  }
  const [name, n] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  const share = n / everyCombo.length;
  return share <= 0.5 || `${name} is first in ${Math.round(share * 100)}% of combinations`;
});

check('changing where you are based always changes something', () => {
  let unchanged = 0, pairs = 0;
  for(const s of SECTORS) for(const m of MODELS){
    const seen = HOMES.map(h => everyCombo.find(c => c.key === `${s}/${m}/${h}`).rows.map(r => r.name).join('|'));
    pairs += 2;
    if(seen[0] === seen[1]) unchanged++;
    if(seen[1] === seen[2]) unchanged++;
  }
  return unchanged === 0 || `${unchanged} of ${pairs} adjacent pairs were identical`;
});

check('the shortlist still offers the compare and map bridges', () => {
  pick('sector', 'travel'); pick('model', 'export'); pick('home', 'mena');
  return doc.querySelectorAll('#helperOut [data-act="compare"]').length > 0
    && doc.querySelectorAll('#helperOut [data-act="pin"]').length > 0;
});

let failed = 0;
for(const [name, ok, detail] of results){
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (!ok && detail ? '\n         ' + detail : ''));
  if(!ok) failed++;
}
console.log('\n' + (failed ? failed + ' of ' + results.length + ' FAILED' : 'ALL ' + results.length + ' ENTRY-HELPER CHECKS PASSED'));
process.exit(failed ? 1 : 0);
