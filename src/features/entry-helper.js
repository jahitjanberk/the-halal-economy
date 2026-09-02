/**
 * Three-question market shortlist. Scores candidate countries on this page's
 * own data and explains every point it awards.
 *
 * Scoring is deliberately transparent: one function per question, each returning
 * a 0..1 fit plus the reasons behind it, combined with the weights below.
 *
 * The normalisation matters. An earlier version added raw points — population
 * over 40, or `11 - rank` — which let a single answer-independent term reach ten
 * points while the sector and region answers were worth six between them. The
 * result was that Malaysia or Indonesia came top in 92% of all 54 answer
 * combinations: it was ranking the biggest halal markets, not answering the
 * question it had just asked. Each dimension is now capped at 1 and weighted
 * explicitly, so what the reader tells us actually moves the order.
 */
import { popFmt, attr } from '../core/dom.js';
import { countries } from '../data/countries.js';
import { sectorRanks, sectorCols } from '../data/sectors.js';
import { certBodies } from '../data/markets.js';

/** Out of 100. The three answered dimensions carry 85 between them. */
const WEIGHTS = { sector: 35, model: 30, home: 20, market: 15 };

const LABELS = {
  sector: 'What you sell',
  model: 'How you sell',
  home: 'Where you are based',
  market: 'Market fundamentals',
};

const helper = { sector: null, model: null, home: null };

const clamp = v => Math.max(0, Math.min(1, v));
const has = (list, c) => list.includes(c.label);

/** Which certifier a company would most likely work with in this market. */
function certifierFor(c){
  const b = certBodies.find(x => x.c === c.label);
  return b ? b.b : (c.oic ? 'GAC / SMIIC-aligned bodies' : 'local private certifiers');
}

/* ---------- one function per question, each returning 0..1 ---------- */

/**
 * Published sector rank first, then whether the country is a named market in
 * that sector. Only six countries have sector ranks, so the market signal is
 * what discriminates everywhere else.
 */
function sectorFit(c){
  const why = [];
  let v = 0;

  const sr = (sectorRanks[c.label] || {})[helper.sector];
  if(sr){
    v += [0, 0.70, 0.56, 0.42, 0.32][sr[0]] ?? 0.24;
    const name = (sectorCols.find(s => s[0] === helper.sector) || [, helper.sector])[1];
    why.push(`#${sr[0]} in ${name.toLowerCase()}`);
  }

  if(helper.sector === 'food' && has(['Indonesia', 'Bangladesh', 'Egypt'], c)){ v += 0.45; why.push('top-three food market by spend'); }
  if(helper.sector === 'fashion' && has(['Iran', 'Türkiye', 'Saudi Arabia', 'Indonesia'], c)){ v += 0.40; why.push('leading modest-fashion market'); }
  if(helper.sector === 'travel' && has(['Saudi Arabia', 'United Arab Emirates', 'Türkiye', 'Malaysia', 'Indonesia'], c)){ v += 0.40; why.push('major Muslim-friendly travel destination'); }
  if(helper.sector === 'fin' && c.bank >= 20){ v += 0.40; why.push(`Islamic banks ${c.bank}% of the domestic market`); }
  if(helper.sector === 'pharma' && c.rank && c.rank <= 10){ v += 0.20; why.push('established regulator for pharma and cosmetics'); }
  if(helper.sector === 'media' && c.rank && c.rank <= 10){ v += 0.20; why.push('developed media and recreation sector'); }

  /*
   * Only six countries have a published sector rank, so most candidates score
   * nothing here — on the dimension carrying the most weight. That is missing
   * evidence, not a poor fit, and the two must not look the same to a reader.
   */
  return { v: clamp(v), why, nodata: v === 0 };
}

/**
 * Volume follows people, premium follows ecosystem strength, export follows
 * import demand. Population is square-rooted so the largest market does not
 * flatten everything below it.
 */
function modelFit(c){
  const why = [];
  let v = 0;

  if(helper.model === 'volume'){
    v = Math.sqrt(Math.min(c.pop, 240) / 240);
    why.push(`${popFmt(c.pop)} Muslim consumers`);
  }

  if(helper.model === 'premium'){
    if(c.rank && c.rank <= 15){ v += (16 - c.rank) / 15 * 0.75; why.push(`GIEI #${c.rank}`); }
    if(c.fin >= 5){ v += 0.25; why.push('deep Islamic finance market'); }
    if(!why.length) why.push('outside the published top fifteen');
  }

  if(helper.model === 'export'){
    if(c.imports){ v += 0.45; why.push(`${c.imports}B of halal imports`); }
    if(has(['Saudi Arabia', 'Türkiye', 'Indonesia', 'Malaysia', 'United Arab Emirates'], c)){ v += 0.40; why.push('top-five OIC importer'); }
    if(c.oic && c.rank && c.rank <= 10){ v += 0.25; why.push('OIC member with a mature ecosystem'); }
    if(!why.length) why.push('no reported halal import volume');
  }

  return { v: clamp(v), why };
}

/** Proximity, with a floor so a distant market is a penalty rather than a veto. */
function homeFit(c){
  if(helper.home === 'west' && has(['United Kingdom', 'Singapore', 'United Arab Emirates', 'Malaysia'], c))
    return { v: 1, why: ['a common first step from the West'] };
  if(helper.home === 'asia' && c.region === 'asia') return { v: 1, why: ['in your region'] };
  if(helper.home === 'mena' && c.region === 'mena') return { v: 1, why: ['in your region'] };
  return { v: 0.25, why: ['outside your region'] };
}

/** Is this a serious market at all — the part that does not depend on answers. */
function marketFit(c){
  const why = [];
  const size = Math.sqrt(Math.min(c.pop, 240) / 240);
  const eco = c.rank && c.rank <= 15 ? (16 - c.rank) / 15 : 0.15;
  if(c.rank && c.rank <= 5) why.push('top-five halal ecosystem');
  else if(c.rank) why.push(`GIEI #${c.rank} ecosystem`);
  else why.push('sizeable market, no published ecosystem rank');
  return { v: clamp(size * 0.45 + eco * 0.55), why };
}

/* ---------- scoring ---------- */

function score(c){
  const parts = { sector: sectorFit(c), model: modelFit(c), home: homeFit(c), market: marketFit(c) };
  const lines = Object.entries(parts).map(([k, p]) => ({
    key: k,
    label: LABELS[k],
    points: Math.round(p.v * WEIGHTS[k]),
    why: p.why,
    nodata: !!p.nodata,
  }));
  return { c, total: lines.reduce((a, l) => a + l.points, 0), lines };
}

/* ---------- rendering ---------- */

/** Says nothing was scored where nothing was published, so a gap reads as a gap. */
function missingNote(x){
  const sector = x.lines.find(l => l.key === 'sector');
  if(!sector || !sector.nodata) return '';
  return `<li class="f-missing"><span class="f-why">No published sector ranking for this market — scored 0 of ${WEIGHTS.sector} for want of data, not for poor fit</span></li>`;
}

function reasonsFor(x){
  /* Lead with whichever dimensions actually earned points. */
  return x.lines
    .filter(l => l.why.length)
    .sort((a, b) => b.points - a.points)
    .map(l => `<li><span class="f-why">${l.why.join(' · ')}</span><span class="f-pts">+${l.points}</span></li>`)
    .join('')
    + missingNote(x);
}

/**
 * The scores are close often enough that a bare 1-2-3-4 would overstate them.
 * Say so rather than letting the numbering imply precision it does not have.
 */
function tieNote(scored){
  const spread = scored[0].total - scored[scored.length - 1].total;
  if(spread > 8) return '';
  const names = scored.map(x => x.c.label);
  return `<p class="fit-note">${names.slice(0, -1).join(', ')} and ${names.at(-1)} score within ${spread} point${spread === 1 ? '' : 's'} of each other — treat the order as indicative, not a ranking.</p>`;
}

export function runHelper(){
  const out = document.getElementById('helperOut');
  if(!helper.sector || !helper.model || !helper.home){
    out.innerHTML = '<p style="color:var(--muted);margin:0">Answer all three questions to see a shortlist.</p>';
    return;
  }

  const scored = countries
    .filter(c => c.rank || c.pop >= 15)
    .map(score)
    .filter(x => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  if(!scored.length){
    out.innerHTML = '<p style="color:var(--muted);margin:0">No market in this dataset scores against that combination.</p>';
    return;
  }

  const best = scored[0].total;

  out.innerHTML =
    `<p class="fit-intro">Scored out of 100 on this page's data — ${WEIGHTS.sector} for what you sell, ${WEIGHTS.model} for how you sell, ${WEIGHTS.home} for where you are, ${WEIGHTS.market} for market fundamentals. Research each before committing.</p>` +
    tieNote(scored) +
    scored.map((x, i) =>
      `<div class="r">` +
      `<div class="f-head"><b>${i + 1}. ${x.c.label}</b><span class="f-score">${x.total}<span class="f-of">/100</span></span></div>` +
      `<div class="fitbar"><i style="width:${Math.round(x.total / best * 100)}%"></i></div>` +
      `<ul class="f-lines">${reasonsFor(x)}</ul>` +
      `<p>Certifier: ${certifierFor(x.c)}${x.c.bank != null ? ` · Islamic financing ${x.c.bank >= 20 ? 'mainstream' : 'available but small'}` : ''}</p>` +
      `<div class="cta" style="margin-top:6px">` +
      `<button class="mini" data-act="compare" data-c="${attr(x.c.label)}">Compare</button>` +
      `<button class="mini" data-act="pin" data-scroll="1" data-c="${attr(x.c.label)}">Show on map</button>` +
      `</div></div>`
    ).join('');
}

/**
 * The option groups are radio groups: a screen reader has to hear that these are
 * a choice, and which one is taken. Plain buttons announce neither.
 */
function choose(button){
  const group = button.closest('.opts');
  helper[group.dataset.q] = button.dataset.v;
  group.querySelectorAll('button').forEach(x => {
    const on = x === button;
    x.classList.toggle('active', on);
    x.setAttribute('aria-checked', String(on));
    x.tabIndex = on ? 0 : -1;          /* the group is one tab stop, arrows move within it */
  });
  runHelper();
}

export function initEntryHelper(){
  document.querySelectorAll('.opts[data-q]').forEach(group => {
    const buttons = [...group.querySelectorAll('button')];
    buttons.forEach((b, i) => {
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', 'false');
      b.tabIndex = i === 0 ? 0 : -1;
      b.addEventListener('click', () => choose(b));
    });

    group.addEventListener('keydown', ev => {
      const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
      if(!dir) return;
      ev.preventDefault();
      const at = buttons.indexOf(document.activeElement);
      const next = buttons[(at + dir + buttons.length) % buttons.length];
      next.focus();
      choose(next);
    });
  });
}
