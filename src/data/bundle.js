/**
 * The downloadable forms of the dataset.
 *
 * One source of truth for both the in-page download buttons and the static
 * files under assets/data/ — otherwise the file a crawler fetches and the file
 * a reader downloads could quietly diverge.
 *
 * Long format (dataset,item,year,value,unit,note) keeps series of different
 * shapes in one file a spreadsheet can pivot.
 */
import { sectors, sectorRanks } from './sectors.js';
import { consumerSpend, islamicFinance, finComposition, finGrowth, finShareCountries, oicImports, hajj } from './series.js';
import { countries, rankHistory } from './countries.js';
import { deals, certBodies } from './markets.js';
import { sources } from './sources.js';
import { enumerateFigures, VERIFIED_ON } from './verification.js';

export const COMPILED = '2026-09-02';

export function seriesCsv(){
  let csv = 'dataset,item,year,value,unit,note\n';
  sectors.forEach(s => {
    csv += `sector_spend,${s.name},2024,${s.v2024},USD billions,\n`;
    csv += `sector_spend,${s.name},2029,${s.v2029},USD billions,forecast\n`;
    csv += `sector_cagr,${s.name},2024-2029,${s.cagr},percent,\n`;
  });
  consumerSpend.forEach(d => { csv += `consumer_spend_total,Six sectors,${d.y},${d.v},USD trillions,${d.proj ? 'forecast' : ''}\n`; });
  islamicFinance.forEach(d => { csv += `islamic_finance_assets,Total,${d.y},${d.v},USD trillions,${d.proj ? 'forecast' : ''}\n`; });
  finComposition.forEach(d => { csv += `finance_composition,${d.name},2024,${d.v},percent of assets,\n`; });
  finGrowth.forEach(d => { csv += `finance_segment_growth,${d.name},2024,${d.v},percent yoy,\n`; });
  finShareCountries.forEach(d => { csv += `finance_share_by_country,${d.name},2024,${d.v},percent (approx),\n`; });
  oicImports.forEach(d => { csv += `oic_halal_imports,OIC,${d.y},${d.v},USD billions,${d.proj ? 'forecast' : ''}\n`; });
  hajj.forEach(d => { csv += `hajj_pilgrims,Total,${d.y},${d.v},millions,\n`; });
  return csv;
}

export function countriesCsv(){
  let csv = 'country,muslim_population_millions,giei_score_2024_25,giei_score_2025_26,giei_rank,share_of_islamic_finance_assets_pct,islamic_banking_share_of_domestic_banking_pct,halal_imports_2024_usd_bn,oic_member,note\n';
  countries.forEach(c => {
    csv += `"${c.label}",${c.pop},${c.giei ?? ''},${c.giei2526 ?? ''},${c.rank ?? ''},${c.fin ?? ''},${c.bank ?? ''},${c.imports ?? ''},${c.oic ? 'yes' : 'no'},"${(c.note || '').replace(/"/g, '""')}"\n`;
  });
  return csv;
}

/**
 * Machine-readable verification status, one row per figure. This is the part a
 * reuser most needs: which numbers have been checked, and against what.
 */
export function verificationCsv(){
  let csv = 'figure_id,value,confirmed,checked_against\n';
  enumerateFigures().forEach(f => {
    csv += `${f.id},${f.value},${f.confirmed ? 'yes' : 'no'},${f.confirmed ? f.check : ''}\n`;
  });
  return csv;
}

export function datasetJson(){
  const figures = enumerateFigures();
  return {
    compiled: COMPILED,
    verifiedOn: VERIFIED_ON,
    verification: {
      confirmed: figures.filter(f => f.confirmed).length,
      total: figures.length,
      note: 'A figure is "confirmed" when it was checked against a named source that was actually retrieved. It is not a claim that the figure is true.',
      figures,
    },
    sources,
    sectors, sectorRanks,
    consumerSpend, islamicFinance, finComposition, finGrowth, finShareCountries, oicImports, hajj,
    countries, rankHistory, deals, certBodies,
  };
}

/** Filenames are part of the public interface — the sitemap and JSON-LD cite them. */
export const FILES = {
  'halal-economy-data.csv': seriesCsv,
  'halal-economy-countries.csv': countriesCsv,
  'halal-economy-verification.csv': verificationCsv,
  'halal-economy-dataset.json': () => JSON.stringify(datasetJson(), null, 2),
};
