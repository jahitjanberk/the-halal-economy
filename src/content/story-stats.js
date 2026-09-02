/**
 * The headline figure shown beside each story step.
 *
 * These used to be hardcoded HTML strings duplicating numbers that already live
 * in src/data — so the story could silently drift out of agreement with the
 * charts. Each stat now computes from the data and declares which figures it
 * rests on, which is also what lets the story carry the same provenance marker
 * as every chart.
 *
 *   html  renders the display string
 *   figs  figure ids backing it (see verification.js); empty when the claim
 *         is narrative and has nothing in the data to check against
 *   src   key into data/sources.js
 *   kind  reported | derived | approx
 */
import { byLabel } from '../data/countries.js';
import { consumerSpend, oicImports, hajj } from '../data/series.js';
import { sectors } from '../data/sectors.js';

/** Gold accent on the unit, matching the story's display type. */
const u = s => `<span class="u">${s}</span>`;

const pop = l => byLabel[l].pop;
const year = (series, y) => series.find(d => d.y === y).v;

/** Millions, dropping to thousands below 1M so "0.01M" reads as "10k". */
const millions = v => v >= 1 ? `${v.toFixed(2).replace(/\.00$/, '')}${u('M')}` : `${Math.round(v * 1000)}${u('k')}`;

const FIVE = ['Indonesia', 'Pakistan', 'India', 'Bangladesh', 'Nigeria'];
const HOLDERS = ['Saudi Arabia', 'Iran', 'Malaysia'];

/* Figure ids replace spaces with dashes — see slug() in verification.js. */
const id = (dataset, label, field) => `${dataset}.${label.replace(/\s+/g, '-')}.${field}`;

export const storyStats = {
  worldMuslims: {
    html: () => `~2${u('B')}`,
    figs: [], src: 'pew', kind: 'approx',
  },
  fiveCountries: {
    html: () => `${FIVE.reduce((a, l) => a + pop(l), 0)}${u('M')}`,
    figs: FIVE.map(l => id('countryPop', l, 'pop')), src: 'pew', kind: 'derived',
  },
  spend2024: {
    html: () => `${u('$')}${year(consumerSpend, 2024).toFixed(2)}${u('T')}`,
    figs: ['consumerSpend.2024.v'], src: 'sgie2526', kind: 'reported',
  },
  malaysiaScore: {
    html: () => `${byLabel['Malaysia'].giei2526}`,
    figs: ['countryGiei.Malaysia.giei2526'], src: 'sgie2526', kind: 'reported',
  },
  indonesiaVsMalaysia: {
    html: () => `${Math.round(pop('Indonesia') / pop('Malaysia'))}${u('×')}`,
    figs: [id('countryPop', 'Indonesia', 'pop'), id('countryPop', 'Malaysia', 'pop')],
    src: 'pew', kind: 'derived',
  },
  oicImports2024: {
    html: () => `${u('$')}${year(oicImports, 2024)}${u('B')}`,
    figs: ['oicImports.2024.v'], src: 'sgie2526', kind: 'reported',
  },
  financeConcentration: {
    html: () => `~${HOLDERS.reduce((a, l) => a + byLabel[l].fin, 0)}${u('%')}`,
    figs: HOLDERS.map(l => id('countryFinance', l, 'fin')), src: 'gf', kind: 'derived',
  },
  senegalRise: {
    html: () => `+18`,
    figs: [], src: 'sgie2425', kind: 'reported',
  },

  hajj2012: { html: () => millions(year(hajj, 2012)), figs: ['hajj.2012.v'], src: 'gastat', kind: 'reported' },
  hajj2019: { html: () => millions(year(hajj, 2019)), figs: ['hajj.2019.v'], src: 'gastat', kind: 'reported' },
  hajj2020: { html: () => millions(year(hajj, 2020)), figs: ['hajj.2020.v'], src: 'gastat', kind: 'reported' },
  hajj2023: { html: () => millions(year(hajj, 2023)), figs: ['hajj.2023.v'], src: 'gastat', kind: 'reported' },
  hajj2026: { html: () => millions(year(hajj, 2026)), figs: ['hajj.2026.v'], src: 'gastat', kind: 'reported' },

  travelGrowth: {
    html: () => `${sectors.find(s => s.key === 'travel').cagr}${u('%')}`,
    figs: ['sectors.travel.cagr'], src: 'sgie2526', kind: 'derived',
  },
  umrahTarget: {
    html: () => `30${u('M')}`,
    figs: [], src: 'sgie2526', kind: 'reported',
  },
};
