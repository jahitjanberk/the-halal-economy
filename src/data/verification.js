/**
 * Verification status for every figure on the page.
 *
 * A figure is "confirmed" only when it was checked against a named source that
 * was actually retrieved, on a recorded date. It is NOT a claim that a figure
 * is true — it is a claim that someone looked, and says what they looked at.
 * Anything unchecked stays unconfirmed, which is the useful default: the whole
 * point of this layer is to make unchecked figures visible at the point of use.
 *
 * Two pieces:
 *   - a `verified` key on the records themselves (in src/data/*.js), naming
 *     which of that record's fields were confirmed;
 *   - the `datasets` registry below, saying what each dataset was checked
 *     against and which of its fields count as figures.
 *
 * Markers in index.html carry `data-d="<dataset key>"` (space-separated where a
 * chart draws on more than one), which is how the tooltip finds this.
 */
import { sectors, sectorCols, sectorRanks } from './sectors.js';
import { consumerSpend, islamicFinance, finComposition, finGrowth, finShareCountries, oicImports, hajj } from './series.js';
import { countries, rankHistory } from './countries.js';
import { deals, certBodies } from './markets.js';

/** When this verification pass was run. Shown in every confirmed tooltip. */
export const VERIFIED_ON = 'September 2026';

/**
 * The sources actually retrieved during the pass, with the URL used.
 * Adding an entry here means having genuinely opened it.
 */
export const checks = {
  sgie2526: {
    label: 'DinarStandard SGIE 2025/26',
    url: 'https://www.dinarstandard.com/insights/state-of-the-global-islamic-economy-report-2025-26',
    on: '2026-09-02',
  },
  ifsb2025: {
    label: 'the IFSB Stability Report 2025 press release',
    url: 'https://www.ifsb.org/press-releases/islamic-financial-services-industry-stability-report-2025-need-for-coordinated-action-to-deepen-markets-and-sustain-growth-momentum/',
    on: '2026-09-02',
  },
  sgiePress: {
    label: 'SGIE 2025/26 launch coverage',
    url: 'https://www.businesstoday.com.my/2026/06/03/malaysia-ranks-top-in-global-islamic-economy-25-26-report/',
    on: '2026-09-02',
  },
  gfmag: {
    label: 'Global Finance Magazine',
    url: 'https://gfmag.com/banking/islamic-finance-just-muslim-majority-nations/',
    on: '2026-09-02',
  },
  derived: {
    label: 'arithmetic from those figures',
    url: null,
    on: '2026-09-02',
  },
};

/**
 * Dataset registry.
 *
 *   figures  field names that hold a figure; null means each record counts as
 *            one non-numeric item (a name, a reference entry)
 *   check    which entry in `checks` this dataset's confirmations came from
 *   byField  override `check` for a single field
 *   count    escape hatch for datasets whose figures aren't flat record fields
 */
export const datasets = {
  sectors: {
    label: 'sector spend',
    records: () => sectors,
    figures: ['v2024', 'v2029', 'cagr'],
    check: 'sgie2526',
    byField: { cagr: 'derived' },
  },
  consumerSpend:     { label: 'consumer spend trajectory',      records: () => consumerSpend,     figures: ['v'], check: 'sgie2526' },
  islamicFinance:    { label: 'Islamic finance assets',         records: () => islamicFinance,    figures: ['v'], check: 'sgie2526' },
  finComposition:    { label: 'Islamic finance composition',    records: () => finComposition,    figures: ['v'], check: 'ifsb2025' },
  finGrowth:         { label: 'Islamic finance segment growth', records: () => finGrowth,         figures: ['v'], check: 'ifsb2025' },
  finShareCountries: { label: 'country share of assets',        records: () => finShareCountries, figures: ['v'], check: 'gfmag' },
  oicImports:        { label: 'OIC halal imports',              records: () => oicImports,        figures: ['v'], check: 'sgie2526' },
  hajj:              { label: 'Hajj pilgrim counts',            records: () => hajj,              figures: ['v'], check: 'sgie2526' },
  /*
   * The country table is split by what a chart actually shows, so a marker
   * never reports on figures its own chart doesn't draw. The map switches
   * between three of these as its layer changes.
   */
  countryGiei:       { label: 'GIEI scores and ranks',          records: () => countries,         figures: ['giei', 'giei2526', 'rank'], check: 'sgiePress' },
  countryPop:        { label: 'Muslim population by country',   records: () => countries,         figures: ['pop'],          check: 'sgiePress' },
  countryFinance:    { label: 'Islamic finance by country',     records: () => countries,         figures: ['fin', 'bank'],  check: 'gfmag' },
  countryTrade:      { label: 'halal imports by country',       records: () => countries,         figures: ['imports'],      check: 'sgiePress' },
  deals:             { label: 'investment deals',               records: () => deals,             figures: ['n', 'v'], check: 'sgie2526' },
  certBodies:        { label: 'certifier directory',            records: () => certBodies,        figures: null,  check: 'sgie2526' },

  /* One figure per country per edition, not one per row. */
  rankHistory: {
    label: 'GIEI position history',
    check: 'sgiePress',
    count(){
      let confirmed = 0, total = 0;
      for(const row of rankHistory.rows){
        rankHistory.editions.forEach((ed, i) => {
          if(row.r[i] == null) return;
          total++;
          if(Array.isArray(row.verified) && row.verified.includes(ed)) confirmed++;
        });
      }
      return { confirmed, total };
    },
  },

  /* One figure per country per sector. */
  sectorRanks: {
    label: 'sector ranks by country',
    check: 'sgiePress',
    count(){
      let confirmed = 0, total = 0;
      for(const [country, ranks] of Object.entries(sectorRanks)){
        for(const [sector] of sectorCols){
          if(!ranks[sector]) continue;
          total++;
          if(Array.isArray(ranks.verified) && ranks.verified.includes(sector)) confirmed++;
        }
      }
      return { confirmed, total };
    },
  },
};

/** Has this field on this record been confirmed? */
export function isVerified(record, field){
  const v = record && record.verified;
  if(v === true) return true;
  if(Array.isArray(v)) return v.includes(field);
  return false;
}

/**
 * Count confirmed vs total figures across one or more datasets.
 *
 * Null fields are not figures — a country with no published GIEI score has
 * nothing to verify, so it must not count against the total.
 */
export function statusFor(keys){
  let confirmed = 0, total = 0;
  const sources = new Set();

  for(const key of keys){
    const ds = datasets[key];
    if(!ds) continue;

    if(ds.count){
      const r = ds.count();
      confirmed += r.confirmed;
      total += r.total;
      if(r.confirmed) sources.add(ds.check);
      continue;
    }

    for(const rec of ds.records()){
      if(ds.figures === null){
        total++;
        if(rec.verified === true){ confirmed++; sources.add(ds.check); }
        continue;
      }
      for(const f of ds.figures){
        if(rec[f] == null) continue;
        total++;
        if(isVerified(rec, f)){
          confirmed++;
          sources.add((ds.byField && ds.byField[f]) || ds.check);
        }
      }
    }
  }

  return { confirmed, total, sources: [...sources] };
}

/**
 * Figure ids travel in a space-separated `data-fig` attribute, so a name with
 * a space in it ("All Islamic-economy sectors") would shatter into fragments
 * that match nothing. Slug them.
 */
const slug = s => String(s).replace(/\s+/g, '-');

/**
 * A stable identity for each record, so a confirmed figure can be pinned to
 * its value and re-checked later. Index would drift if rows were reordered.
 */
const identify = {
  sectors: r => r.key,
  consumerSpend: r => r.y,
  islamicFinance: r => r.y,
  oicImports: r => r.y,
  hajj: r => r.y,
  finComposition: r => r.name,
  finGrowth: r => r.name,
  finShareCountries: r => r.name,
  countryGiei: r => r.label,
  countryPop: r => r.label,
  countryFinance: r => r.label,
  countryTrade: r => r.label,
  certBodies: r => r.c,
  deals: r => `${r.ed}/${r.scope}/${r.item}`,
};

/**
 * Every figure on the page, as `{ id, value, confirmed, check }`.
 *
 * The id is what a marker uses to point at one specific figure, so a KPI
 * showing a single number reports on that number rather than on its whole
 * series.
 */
export function enumerateFigures(){
  const out = [];

  for(const [key, ds] of Object.entries(datasets)){
    if(key === 'rankHistory'){
      for(const row of rankHistory.rows){
        rankHistory.editions.forEach((ed, i) => {
          if(row.r[i] == null) return;
          const ok = Array.isArray(row.verified) && row.verified.includes(ed);
          out.push({ id: `rankHistory.${slug(row.c)}.${ed}`, value: row.r[i], confirmed: ok, check: ds.check });
        });
      }
      continue;
    }
    if(key === 'sectorRanks'){
      for(const [country, ranks] of Object.entries(sectorRanks)){
        for(const [sector] of sectorCols){
          if(!ranks[sector]) continue;
          const ok = Array.isArray(ranks.verified) && ranks.verified.includes(sector);
          out.push({ id: `sectorRanks.${slug(country)}.${sector}`, value: ranks[sector][0], confirmed: ok, check: ds.check });
        }
      }
      continue;
    }
    if(ds.figures === null) continue;

    const id = identify[key] || ((r, i) => i);
    ds.records().forEach((rec, i) => {
      for(const f of ds.figures){
        if(rec[f] == null) continue;
        out.push({
          id: `${key}.${slug(id(rec, i))}.${f}`,
          value: rec[f],
          confirmed: isVerified(rec, f),
          check: (ds.byField && ds.byField[f]) || ds.check,
        });
      }
    });
  }

  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Every figure currently marked confirmed, as `{ id, value }`.
 *
 * tests/verification.test.mjs pins these against tests/confirmed-figures.json,
 * so editing a figure without re-checking it fails the build rather than
 * quietly carrying its old confirmation forward.
 */
export function enumerateConfirmed(){
  return enumerateFigures().filter(f => f.confirmed).map(({ id, value }) => ({ id, value }));
}

/** Confirmed/total across an explicit list of figure ids. */
export function statusForIds(ids){
  const all = new Map(enumerateFigures().map(f => [f.id, f]));
  let confirmed = 0, total = 0;
  const sources = new Set();

  for(const id of ids){
    const f = all.get(id);
    if(!f) continue;
    total++;
    if(f.confirmed){ confirmed++; sources.add(f.check); }
  }
  return { confirmed, total, sources: [...sources] };
}

/** "DinarStandard SGIE 2025/26" / "X and Y" / "X, Y and Z". */
export function describeSources(sourceKeys){
  const names = sourceKeys.map(k => (checks[k] ? checks[k].label : k));
  if(!names.length) return null;
  if(names.length === 1) return names[0];
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

/**
 * The sentence shown in the provenance tooltip.
 *
 * `ids` scopes the report to specific figures — a KPI showing one number must
 * report on that number, not on the whole series behind it. Falls back to
 * whole datasets. Returns null for markers covering neither (prose claims).
 */
export function verificationLine(keys, ids){
  if(ids && ids.length) return lineFrom(statusForIds(ids));
  if(!keys.length) return null;
  return lineFrom(statusFor(keys));
}

function lineFrom({ confirmed, total, sources }){
  if(!total) return null;

  const against = describeSources(sources);

  if(confirmed === total){
    return { level: 'ok', text: `Confirmed against ${against}, ${VERIFIED_ON}.` };
  }
  if(confirmed === 0){
    return { level: 'no', text: 'Unconfirmed — check before citing.' };
  }
  return {
    level: 'part',
    text: `${confirmed} of ${total} figures confirmed against ${against}, ${VERIFIED_ON}. ` +
          `The other ${total - confirmed} are unconfirmed — check before citing.`,
  };
}
