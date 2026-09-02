/**
 * Regenerate the schema.org/Dataset block in index.html.
 *
 * This is what makes the page legible to Google Dataset Search and similar
 * indexes — the route by which researchers and policy analysts actually find
 * data resources. It has to be static in the HTML because those crawlers do not
 * reliably run JavaScript.
 *
 * Generated rather than hand-written so the described coverage, sources and
 * distributions cannot drift from the data. `npm test` fails if the block in
 * index.html is not what this script would produce.
 *
 *   npm run metadata
 */
import { readFileSync, writeFileSync } from 'fs';
import { sources } from '../src/data/sources.js';
import { datasets, statusFor, VERIFIED_ON } from '../src/data/verification.js';
import { countries } from '../src/data/countries.js';
import { sectors } from '../src/data/sectors.js';

const BASE = 'https://jahitjanberk.github.io/the-halal-economy/';
const START = '<!-- BEGIN generated dataset metadata -->';
const END = '<!-- END generated dataset metadata -->';

let confirmed = 0, total = 0;
for(const key of Object.keys(datasets)){
  const r = statusFor([key]);
  confirmed += r.confirmed;
  total += r.total;
}

/** Every distinct measure the page publishes, for `variableMeasured`. */
const variables = [
  'Muslim consumer spend by sector, USD billions',
  'Islamic finance assets, USD trillions',
  'Global Islamic Economy Indicator score and rank',
  'Muslim population by country, millions',
  'Islamic banking share of domestic banking, percent',
  'Share of global Islamic finance assets by country, percent',
  'OIC halal-related imports, USD billions',
  'Islamic finance segment growth, percent year on year',
  'Hajj pilgrims per year, millions',
  'Islamic-economy investment deals, count and disclosed value',
];

const dataset = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'The Halal Economy',
  alternateName: 'Halal Economy Dashboard',
  description:
    `The halal economy mapped sector by sector and country by country: ${sectors.length} consumer sectors, ` +
    `Islamic finance, trade, investment deals and certification across ${countries.length} countries. ` +
    `Compiled from published industry reporting. Every figure records its source and whether it has been ` +
    `checked against that source — ${confirmed} of ${total} were verified as of ${VERIFIED_ON}.`,
  url: BASE,
  sameAs: 'https://github.com/jahitjanberk/the-halal-economy',
  isAccessibleForFree: true,
  /*
   * CC BY covers the compilation and the verification metadata. The underlying
   * figures belong to the publishers listed in `citation` — see DATA-LICENSE.md.
   */
  license: 'https://creativecommons.org/licenses/by/4.0/',
  usageInfo: BASE + 'DATA-LICENSE.md',
  creator: { '@type': 'Person', name: 'jahit', url: 'https://jahit.dev' },
  dateModified: '2026-09-02',
  temporalCoverage: '2012/2029',
  spatialCoverage: countries.map(c => ({ '@type': 'Place', name: c.label })),
  keywords: [
    'halal economy', 'Islamic finance', 'halal food', 'modest fashion',
    'Muslim-friendly travel', 'sukuk', 'takaful', 'halal certification',
    'OIC trade', 'Global Islamic Economy Indicator',
  ],
  variableMeasured: variables,
  /* Real files, not anchors — an index needs something it can actually fetch. */
  distribution: Object.entries({
    'halal-economy-data.csv': ['All series, long format', 'text/csv'],
    'halal-economy-countries.csv': ['Country reference table', 'text/csv'],
    'halal-economy-verification.csv': ['Verification status, one row per figure', 'text/csv'],
    'halal-economy-dataset.json': ['Complete dataset with provenance', 'application/json'],
  }).map(([file, [name, format]]) => ({
    '@type': 'DataDownload', name, encodingFormat: format, contentUrl: BASE + 'assets/data/' + file,
  })),
  citation: Object.values(sources).map(s => ({
    '@type': 'CreativeWork',
    name: s.name,
    url: s.url,
    datePublished: s.date,
  })),
};

const block = [
  START,
  '<script type="application/ld+json">',
  JSON.stringify(dataset, null, 2),
  '</script>',
  END,
].join('\n');

const file = new URL('../index.html', import.meta.url);
let html = readFileSync(file, 'utf8');

if(html.includes(START)){
  const from = html.indexOf(START);
  const to = html.indexOf(END) + END.length;
  html = html.slice(0, from) + block + html.slice(to);
} else {
  /* First run: sit it just before </head>. */
  html = html.replace('</head>', block + '\n</head>');
}

writeFileSync(file, html);
console.log(`wrote schema.org/Dataset — ${countries.length} places, ${variables.length} variables, ${dataset.citation.length} citations, ${confirmed}/${total} verified`);
