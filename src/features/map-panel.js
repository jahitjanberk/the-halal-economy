/**
 * The dashboard's interactive map: the country detail panel beside it,
 * the layer switcher, and the pin/highlight behaviour.
 *
 * Story mode builds its own map from the same engine; this module owns
 * only the dashboard instance.
 */
import { state, writeURL } from '../core/state.js';
import { showTip, hideTip, reduceMotion, attr } from '../core/dom.js';
import { byAtlas, byLabel } from '../data/countries.js';
import { createMap, layers, ramp } from './map.js';
import { applyVerificationMarks } from './provenance.js';

/**
 * Each layer draws on a different dataset from a different source, so the
 * map's provenance marker has to change with it.
 */
const LAYER_SOURCE = {
  pop:  { s: 'pew',      k: 'approx',   d: 'countryPop' },
  giei: { s: 'sgie2425', k: 'reported', d: 'countryGiei' },
  fin:  { s: 'gf',       k: 'approx',   d: 'countryFinance' },
};

/** The dashboard map handle. Assigned by initMapPanel. */
export let mainMap = null;

/** The pinned country, or null. Hovering only previews; clicking pins. */
let pinned = null;

function tipFor(c, layerKey){
  const L = layers[layerKey];
  const v = L.get(c);
  return `<b>${c.label}</b><br>${L.hint.split(',')[0]}: ${v != null ? L.fmt(v) : 'no data'}`;
}

function sideFor(c){
  const rows = [
    ['Muslim population', c.pop >= 1 ? `~${Math.round(c.pop)} million` : `~${Math.round(c.pop * 1000)},000`],
    ['Ecosystem rank (GIEI)', c.rank ? `#${c.rank}${c.giei ? ' · score ' + c.giei : ''}` : 'Not in published top 25'],
    ['Share of Islamic finance assets', c.fin != null ? `~${c.fin}%` : 'Not among the top ten'],
    ['Islamic banking share of domestic banking', c.bank != null ? `${c.bank}%` : '—'],
  ];
  document.getElementById('side').innerHTML =
    `<p class="flag">${c.label}</p>` +
    `<p class="hint">${pinned === c ? 'Pinned. Click again to unpin.' : 'Click or press Enter to pin.'}</p>` +
    rows.map(r => `<div class="fact"><span class="k">${r[0]}</span><span class="v">${r[1]}</span></div>`).join('') +
    (c.note ? `<p class="note">${c.note}</p>` : '') +
    `<div class="cta"><button class="mini" data-act="compare" data-c="${attr(c.label)}">Add to compare</button></div>`;
}

export function resetSide(){
  document.getElementById('side').innerHTML =
    `<p class="flag">Pick a country</p><p class="hint">Hover to preview, click to pin, or Tab through countries with the keyboard. Try Indonesia against Malaysia: one has ten times the people, the other has the top-ranked ecosystem.</p>`;
}

/** Pin a country by label (or atlas name). Pass null to clear. */
export function pinCountry(label, scroll){
  const c = label ? byLabel[label] || byAtlas[label] : null;
  pinned = c || null;
  state.pin = c ? c.label : null;
  if(c) sideFor(c); else resetSide();
  mainMap.setHighlight(c ? [c.atlas] : null);
  if(scroll && c) document.getElementById('map-section').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  writeURL();
}

export function setMainLayer(l){
  state.layer = l;
  mainMap.setLayer(l);
  document.querySelectorAll('#layerSeg button').forEach(x => x.classList.toggle('active', x.dataset.layer === l));
  const L = layers[l];
  document.getElementById('layerHint').textContent = L.hint;
  document.getElementById('legMin').textContent = L.min;
  document.getElementById('legMax').textContent = L.legMax;
  document.getElementById('ramp').style.background = `linear-gradient(90deg, ${ramp(l)(0)}, ${ramp(l)(1)})`;
  const marker = document.getElementById('mapSrc');
  const src = LAYER_SOURCE[l];
  if(marker && src){
    marker.dataset.s = src.s;
    marker.dataset.k = src.k;
    marker.dataset.d = src.d;
    applyVerificationMarks();
  }

  if(pinned) sideFor(pinned);
  writeURL();
}

export function initMapPanel(){
  mainMap = createMap('#map', {
    interactive: true,
    onHover: (c, e) => { if(e) showTip(tipFor(c, mainMap.layer), e.clientX, e.clientY); if(!pinned) sideFor(c); },
    onLeave: () => { hideTip(); if(!pinned) resetSide(); },
    onClick: c => { pinCountry(pinned === c ? null : c.label); },
    onReady: () => { if(pinned) mainMap.setHighlight([pinned.atlas]); },
    onFail: () => {
      document.getElementById('map').style.display = 'none';
      document.getElementById('mapFallback').style.display = 'block';
    },
  });
  document.querySelectorAll('#layerSeg button').forEach(b => b.addEventListener('click', () => setMainLayer(b.dataset.layer)));
  resetSide();
}
