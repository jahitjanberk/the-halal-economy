/**
 * Bulk data downloads: a long-format CSV of every series, a country CSV, and
 * the whole dataset as JSON.
 *
 * Long format (dataset,item,year,value,unit,note) keeps series of different
 * shapes in one file that a spreadsheet can pivot.
 */
import { download } from '../core/dom.js';
import { sectors, sectorRanks } from '../data/sectors.js';
import { consumerSpend, islamicFinance, finComposition, finGrowth, finShareCountries, oicImports, hajj } from '../data/series.js';
import { countries, rankHistory } from '../data/countries.js';
import { deals, certBodies } from '../data/markets.js';
import { sources } from '../data/sources.js';

function seriesCsv(){
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

function countriesCsv(){
  let csv = 'country,muslim_population_millions,giei_score_2024_25,giei_rank,share_of_islamic_finance_assets_pct,islamic_banking_share_of_domestic_banking_pct,halal_imports_2024_usd_bn,oic_member,note\n';
  countries.forEach(c => {
    csv += `"${c.label}",${c.pop},${c.giei ?? ''},${c.rank ?? ''},${c.fin ?? ''},${c.bank ?? ''},${c.imports ?? ''},${c.oic ? 'yes' : 'no'},"${(c.note || '').replace(/"/g, '""')}"\n`;
  });
  return csv;
}

export function initDownloads(){
  document.getElementById('dlCsv').addEventListener('click', () => download('halal-economy-data.csv', seriesCsv()));
  document.getElementById('dlCountries').addEventListener('click', () => download('halal-economy-countries.csv', countriesCsv()));
  document.getElementById('dlAll').addEventListener('click', () => download(
    'halal-economy-dataset.json',
    JSON.stringify({
      compiled: '2026-09-02',
      sources, sectors, consumerSpend, islamicFinance, finComposition, finGrowth,
      finShareCountries, oicImports, hajj, rankHistory, sectorRanks, countries, deals, certBodies,
    }, null, 2),
    'application/json'
  ));
}
