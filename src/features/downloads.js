/**
 * Bulk data downloads.
 *
 * The payloads come from src/data/bundle.js, which also writes the static files
 * under assets/data/ — so what a reader downloads and what a crawler fetches
 * are built by the same code.
 */
import { download } from '../core/dom.js';
import { seriesCsv, countriesCsv, datasetJson } from '../data/bundle.js';

export function initDownloads(){
  document.getElementById('dlCsv').addEventListener('click', () => download('halal-economy-data.csv', seriesCsv()));
  document.getElementById('dlCountries').addEventListener('click', () => download('halal-economy-countries.csv', countriesCsv()));
  document.getElementById('dlAll').addEventListener('click', () => download(
    'halal-economy-dataset.json',
    JSON.stringify(datasetJson(), null, 2),
    'application/json',
  ));
}
