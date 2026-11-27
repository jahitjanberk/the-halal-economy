/**
 * The analyst agent's tools: plain functions over the same src/data modules the
 * page draws from, so an answer can never quote a figure the page doesn't hold.
 *
 * Every figure a tool returns carries its verification status, worded exactly
 * as the page's own provenance tooltip words it. The model is told to cite
 * figures by id; the function then checks each cited id was actually returned
 * by a tool during that request (see ask.mjs).
 *
 * Nothing here calls a network or knows about Groq — it is testable on its own.
 */
import { enumerateFigures, checks, datasets, checkedOn } from '../../src/data/verification.js';
import { sources } from '../../src/data/sources.js';
import { countries, byLabel, byAtlas } from '../../src/data/countries.js';
import { consumerSpend, islamicFinance, oicImports } from '../../src/data/series.js';
import { sectors, sectorCols } from '../../src/data/sectors.js';

/* ---------------------------------------------------------------- units --- */

/** What each figure field measures. `*` covers every field of that dataset. */
const UNITS = {
  sectors:           { v2024: 'USD billions, 2024', v2029: 'USD billions, 2029 forecast', cagr: '% a year, 2024–2029 (derived)' },
  consumerSpend:     { v: 'USD trillions, six sectors combined' },
  islamicFinance:    { v: 'USD trillions of Islamic finance assets' },
  finComposition:    { v: '% of Islamic finance assets' },
  finGrowth:         { v: '% growth year-on-year, 2024' },
  finShareCountries: { v: '% of global Islamic finance assets (rounded)' },
  oicImports:        { v: 'USD billions of OIC halal-related imports' },
  hajj:              { v: 'million Hajj pilgrims' },
  countryGiei:       { giei: 'GIEI score, 2024/25 edition', giei2526: 'GIEI score, 2025/26 edition', rank: 'GIEI rank, 2025/26 edition' },
  countryPop:        { pop: 'million Muslims (rounded)' },
  countryFinance:    { fin: '% of global Islamic finance assets (rounded)', bank: '% of domestic banking that is Islamic' },
  countryTrade:      { imports: 'USD billions of halal imports, 2024' },
  sukukIssuance:     { intl: 'USD billions, international sukuk issuance', short: 'USD billions, short-term sukuk issuance' },
  assetsPerMuslim:   { perMuslim: 'USD of Islamic finance assets per Muslim (derived)' },
  deals:             { n: 'number of disclosed deals', v: 'USD billions, disclosed deal value' },
  rankHistory:       { '*': 'position in the GIEI top five for that edition' },
  sectorRanks:       { '*': 'country rank in that sector, GIEI 2025/26' },
};

/**
 * Which publishers each dataset is cited to on the page — the `data-s` keys on
 * the `.src` markers whose `data-d` names that dataset. tests/ask.test.mjs
 * checks this against index.html so the two cannot drift.
 */
export const DATASET_SOURCES = {
  assetsPerMuslim:   ['gf'],
  consumerSpend:     ['sgie-multi', 'sgie2526'],
  countryFinance:    ['gf', 'sgie-multi'],
  countryGiei:       ['sgie2425', 'sgie-multi'],
  countryPop:        ['gf', 'pew', 'sgie-multi'],
  countryTrade:      ['sgie-multi'],
  deals:             ['sgie-multi', 'sgie2526'],
  finComposition:    ['ifsb'],
  finGrowth:         ['ifsb'],
  finShareCountries: ['gf'],
  islamicFinance:    ['sgie-multi', 'sgie2526'],
  oicImports:        ['sgie-multi'],
  rankHistory:       ['sgie-multi'],
  sectorRanks:       ['sgie-multi', 'sgie2526'],
  sectors:           ['sgie2526'],
  sukukIssuance:     ['iifm'],
};

const FORECAST = new Set([
  ...consumerSpend.filter(d => d.proj).map(d => `consumerSpend.${d.y}.v`),
  ...islamicFinance.filter(d => d.proj).map(d => `islamicFinance.${d.y}.v`),
  ...oicImports.filter(d => d.proj).map(d => `oicImports.${d.y}.v`),
]);

const SPEND_NAME = Object.fromEntries(sectors.map(s => [s.key, s.name]));
const RANK_NAME = Object.fromEntries(sectorCols);

/* ------------------------------------------------------------- countries --- */

const slug = s => String(s).replace(/\s+/g, '-');
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const ALIASES = {
  uae: 'United Arab Emirates', emirates: 'United Arab Emirates',
  turkey: 'Türkiye', ksa: 'Saudi Arabia', saudi: 'Saudi Arabia',
  uk: 'United Kingdom', britain: 'United Kingdom', 'great britain': 'United Kingdom',
  us: 'United States', usa: 'United States', america: 'United States',
};

/** A country record from whatever a reader typed, or null. */
export function resolveCountry(name){
  if(!name) return null;
  if(byLabel[name]) return byLabel[name];
  if(byAtlas[name]) return byAtlas[name];
  const f = fold(name);
  if(ALIASES[f]) return byLabel[ALIASES[f]];
  return countries.find(c => fold(c.label) === f || fold(c.atlas) === f) || null;
}

/** The spellings a country's figures use in their ids. */
function idKeys(c){
  const keys = new Set([slug(c.label), slug(c.atlas)]);
  if(c.label === 'United Arab Emirates') keys.add('UAE');
  return keys;
}

/* --------------------------------------------------------------- figures --- */

let FIGURES = null;
function allFigures(){
  if(!FIGURES) FIGURES = enumerateFigures().map(describe);
  return FIGURES;
}

/** The provenance sentence the page itself would show for this one figure. */
function statusLine(f){
  if(f.check === 'derived'){
    return f.confirmed
      ? `Derived by arithmetic from confirmed figures, ${checkedOn([f.check])}.`
      : 'Derived from unconfirmed figures — check before citing.';
  }
  if(f.confirmed){
    const c = checks[f.check];
    return `Confirmed against ${c ? c.label : f.check}, ${checkedOn([f.check])}.`;
  }
  return 'Unconfirmed — check before citing.';
}

function describe(f){
  const [ds, item, field] = f.id.split('.');
  const units = UNITS[ds] || {};
  const label = [datasets[ds] ? datasets[ds].label : ds, item.replace(/-/g, ' ').replace(/\//g, ' / ')];
  if(ds === 'sectors') label[1] = SPEND_NAME[item] || item;
  else if(ds === 'sectorRanks') label.push(RANK_NAME[field] || field);
  else if(ds === 'rankHistory') label.push(field + ' edition');
  return {
    id: f.id,
    dataset: ds,
    label: (s => s[0].toUpperCase() + s.slice(1))(label.join(' — ')),
    value: typeof f.value === 'number' ? Math.round(f.value * 100) / 100 : f.value,
    unit: units[field] || units['*'] || '',
    forecast: FORECAST.has(f.id) || field === 'v2029',
    status: f.confirmed ? 'confirmed' : 'unconfirmed',
    derived: f.check === 'derived',
    line: statusLine(f),
    check: f.check,
  };
}

export function figureById(id){
  return allFigures().find(f => f.id === id) || null;
}

const MAX_RESULTS = 40;

/** What the model sees for a figure: everything but the internal check key. */
const forModel = ({ check, ...rest }) => rest;

/* ----------------------------------------------------------------- tools --- */

/**
 * find_figures: filter by dataset, country and/or free text. With nothing to
 * filter on it returns the dataset list instead, so the model can orient.
 */
export function findFigures({ dataset, country, query } = {}){
  if(!dataset && !country && !query) return { datasets: listDatasets() };

  let out = allFigures();
  if(dataset){
    if(!datasets[dataset]) return { error: `Unknown dataset "${dataset}".`, datasets: listDatasets() };
    out = out.filter(f => f.dataset === dataset);
  }
  if(country){
    const c = resolveCountry(country);
    if(!c) return { error: `"${country}" is not one of the ${countries.length} countries on the dashboard.`, countries: countries.map(c => c.label) };
    const keys = idKeys(c);
    out = out.filter(f => f.id.split('.')[1].split('/').some(part => keys.has(part)));
  }
  if(query){
    const words = fold(query).split(/\s+/).filter(Boolean);
    out = out.filter(f => { const hay = fold(f.id + ' ' + f.label + ' ' + f.unit); return words.every(w => hay.includes(w)); });
  }
  const truncated = out.length > MAX_RESULTS;
  return { count: out.length, truncated, figures: out.slice(0, MAX_RESULTS).map(forModel) };
}

export function listDatasets(){
  return Object.entries(datasets).map(([key, d]) => {
    const figs = allFigures().filter(f => f.dataset === key);
    return { key, label: d.label, figures: figs.length, confirmed: figs.filter(f => f.status === 'confirmed').length };
  }).filter(d => d.figures > 0);
}

/** compare_countries: the country-level figures for one to three countries. */
export function compareCountries({ countries: names = [] } = {}){
  const list = [...new Set(names)].slice(0, 3);
  if(!list.length) return { error: 'Name one to three countries.' };
  const out = [];
  const unknown = [];
  for(const n of list){
    const c = resolveCountry(n);
    if(!c){ unknown.push(n); continue; }
    const keys = idKeys(c);
    const figures = allFigures()
      .filter(f => f.dataset.startsWith('country') || f.dataset === 'finShareCountries' || f.dataset === 'sectorRanks' || f.dataset === 'assetsPerMuslim')
      .filter(f => keys.has(f.id.split('.')[1]))
      .map(forModel);
    out.push({ country: c.label, oicMember: !!c.oic, note: c.note || null, figures });
  }
  return { countries: out, ...(unknown.length ? { unknown, known: countries.map(c => c.label) } : {}) };
}

/** get_source: where one figure comes from and what, if anything, it was checked against. */
export function getSource({ figure_id } = {}){
  const f = figureById(figure_id);
  if(!f) return { error: `No figure with id "${figure_id}". Use find_figures to look ids up.` };
  const cited = (DATASET_SOURCES[f.dataset] || []).map(k => sources[k]).filter(Boolean)
    .map(s => ({ name: s.name, date: s.date, url: s.url }));
  const c = checks[f.check];
  return {
    id: f.id,
    status: f.status,
    line: f.line,
    /* Every publisher cited beside a chart that draws on this dataset. */
    citedOnPage: cited,
    checkedAgainst: f.status === 'confirmed' && c ? { name: c.label, url: c.url, on: c.on } : null,
  };
}

/* -------------------------------------------------------------- set_view --- */

export const LAYERS = ['pop', 'giei', 'fin'];
export const AUDIENCES = ['public', 'investor', 'policy', 'business'];
export const SECTIONS = ['map-section', 'sectors', 'growth', 'finance', 'gap', 'countries', 'compare', 'trade', 'invest', 'business', 'takeaways', 'references'];

/**
 * set_view: validate a view change. The function does not touch the page; it
 * returns the change, and the chat panel applies it through the same
 * functions the page's own controls call.
 */
export function setView({ layer, pin, compare, audience, section } = {}){
  const view = {};
  const problems = [];
  if(layer != null){ LAYERS.includes(layer) ? view.layer = layer : problems.push(`layer must be one of ${LAYERS.join(', ')}`); }
  if(audience != null){ AUDIENCES.includes(audience) ? view.audience = audience : problems.push(`audience must be one of ${AUDIENCES.join(', ')}`); }
  if(section != null){ SECTIONS.includes(section) ? view.section = section : problems.push(`section must be one of ${SECTIONS.join(', ')}`); }
  if(pin != null){
    const c = resolveCountry(pin);
    c ? view.pin = c.label : problems.push(`"${pin}" is not on the map`);
  }
  if(compare != null){
    const cs = (Array.isArray(compare) ? compare : [compare]).map(resolveCountry);
    if(cs.length < 1 || cs.length > 3 || cs.some(c => !c)) problems.push('compare takes one to three countries from the dashboard');
    else view.compare = [...new Set(cs.map(c => c.label))];
  }
  /* Apply what is valid and report the rest, so one bad field doesn't sink the move. */
  return { ok: Object.keys(view).length > 0, view, ...(problems.length ? { problems } : {}) };
}

/* ------------------------------------------------------------ definitions --- */

const datasetKeys = Object.keys(DATASET_SOURCES);

/** OpenAI-format tool definitions, which Groq's chat API accepts as-is. */
export const TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'find_figures',
      description: 'Look up figures from the dashboard. Filter by dataset, country and/or words in the label. Call with no arguments to list the datasets. Every figure has an id, value, unit and verification status.',
      parameters: {
        type: 'object',
        properties: {
          dataset: { type: 'string', enum: datasetKeys },
          country: { type: 'string', description: 'A country name, e.g. "Indonesia" or "UAE".' },
          query: { type: 'string', description: 'Words to match, e.g. "halal food 2029" or "sukuk".' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_countries',
      description: 'All country-level figures (population, GIEI score and rank, Islamic finance share, banking share, imports, sector ranks) for one to three countries.',
      parameters: {
        type: 'object',
        properties: { countries: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 } },
        required: ['countries'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_source',
      description: 'The publisher a figure is cited to, and whether and when it was checked against a retrieved source.',
      parameters: {
        type: 'object',
        properties: { figure_id: { type: 'string' } },
        required: ['figure_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_view',
      description: 'Move the dashboard to show what the answer is about: switch the map layer, pin a country, set the comparison, change the audience framing, or scroll to a section. Only call this when it helps the reader see the answer.',
      parameters: {
        type: 'object',
        properties: {
          layer: { type: 'string', enum: LAYERS, description: 'pop = Muslim population, giei = ecosystem score, fin = share of Islamic finance assets' },
          pin: { type: 'string', description: 'Country to pin on the map.' },
          compare: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
          audience: { type: 'string', enum: AUDIENCES },
          section: { type: 'string', enum: SECTIONS },
        },
      },
    },
  },
];

const RUNNERS = {
  find_figures: findFigures,
  compare_countries: compareCountries,
  get_source: getSource,
  set_view: setView,
};

/**
 * Run one tool call. Returns the result plus the figure ids it surfaced, so
 * the caller can tell which ids an answer is entitled to cite.
 */
export function runTool(name, args){
  const run = RUNNERS[name];
  if(!run) return { result: { error: `No tool called ${name}.` }, ids: [] };
  let result;
  try { result = run(args || {}); }
  catch(e){ result = { error: 'Tool failed: ' + e.message }; }
  const ids = [];
  const collect = v => {
    if(Array.isArray(v)) v.forEach(collect);
    else if(v && typeof v === 'object'){ if(typeof v.id === 'string' && figureById(v.id)) ids.push(v.id); Object.values(v).forEach(collect); }
  };
  collect(result);
  return { result, ids };
}
