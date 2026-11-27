/**
 * Keep the hand-written "N of T confirmed" statements in step with the data:
 * the footer method note and the share-card alt text in index.html, and the
 * summary line and per-dataset table in the README.
 *
 *   npm run counts
 *
 * The fact-check agent's apply step runs this, so confirming a figure can't
 * leave the page claiming an old count. tests/verification.test.mjs checks the
 * footer; the README table is matched row by row on the dataset's label.
 */
import { readFileSync, writeFileSync } from 'fs';
import { datasets, statusFor, checks, checkedOn } from '../src/data/verification.js';

let confirmed = 0, total = 0;
const rows = {};
for(const key of Object.keys(datasets)){
  const r = statusFor([key]);
  confirmed += r.confirmed;
  total += r.total;
  rows[datasets[key].label.toLowerCase()] = r;
}
const asOf = checkedOn(Object.keys(checks));
const pct = Math.round(confirmed / total * 100);

function replaceOrFail(text, re, by, what){
  if(!re.test(text)) throw new Error(`Could not find ${what} to update.`);
  return text.replace(re, by);
}

const htmlFile = new URL('../index.html', import.meta.url);
let html = readFileSync(htmlFile, 'utf8');
html = replaceOrFail(html,
  /As of [A-Z][a-z]+ \d{4}, \d+ of \d+ figures on this page have been confirmed/,
  `As of ${asOf}, ${confirmed} of ${total} figures on this page have been confirmed`,
  'the footer count');
html = replaceOrFail(html,
  /(<meta property="og:image:alt" content="[^"]*?with )\d+ of \d+( figures checked against a source)/,
  `$1${confirmed} of ${total}$2`,
  'the share-card alt text');
writeFileSync(htmlFile, html);

const readmeFile = new URL('../README.md', import.meta.url);
let readme = readFileSync(readmeFile, 'utf8');
readme = replaceOrFail(readme,
  /As of [A-Z][a-z]+ \d{4}, \*\*\d+ of \d+ figures are confirmed\*\* \(\d+%\)/,
  `As of ${asOf}, **${confirmed} of ${total} figures are confirmed** (${pct}%)`,
  'the README summary');
readme = readme.replace(/^\| ([^|]+?) \| \d+ \/ \d+ \|$/gm, (line, label) => {
  const r = rows[label.trim().toLowerCase()];
  return r ? `| ${label} | ${r.confirmed} / ${r.total} |` : line;
});
writeFileSync(readmeFile, readme);

console.log(`counts: ${confirmed} of ${total} confirmed, as of ${asOf}`);
