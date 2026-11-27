/**
 * Run the fact-check agent over one dataset.
 *
 *   npm run verify -- hajj
 *   npm run verify -- countryPop --only Indonesia,Malaysia
 *   npm run verify -- countryPop --limit 5
 *
 * Writes verify/runs/<dataset>-<time>.json and prints a summary. Changes
 * nothing on the site: review with `npm run verify:review`, then apply what
 * you approved with `npm run verify:apply`.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { SOURCES } from './sources.mjs';
import { checkDataset, groqJson } from './lib.mjs';

const args = process.argv.slice(2);
const dataset = args.find(a => !a.startsWith('--'));
const flag = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; };

if(!dataset || !SOURCES[dataset]){
  console.log(`Usage: npm run verify -- <dataset> [--only A,B] [--limit N]\nDatasets with sources set up: ${Object.keys(SOURCES).join(', ')}`);
  process.exit(dataset ? 1 : 0);
}
const apiKey = process.env.GROQ_API_KEY;
if(!apiKey){
  console.log('GROQ_API_KEY is not set. Put it in .env (see .env.example).');
  process.exit(1);
}

const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const started = new Date();
console.log(`Checking ${dataset} against ${SOURCES[dataset].sources.length} source(s) with ${model}…\n`);

const items = await checkDataset({
  dataset,
  cfg: SOURCES[dataset],
  ask: groqJson({ apiKey, model }),
  only: flag('only') ? flag('only').split(',').map(s => s.trim()) : null,
  limit: flag('limit') ? +flag('limit') : null,
  log: line => console.log(line),
});

const count = s => items.filter(i => i.status === s).length;
const stamp = started.toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})/, '$1-');
const dir = new URL('../../verify/runs/', import.meta.url);
mkdirSync(dir, { recursive: true });
const file = new URL(`${dataset}-${stamp}.json`, dir);
writeFileSync(file, JSON.stringify({ dataset, model, startedAt: started.toISOString(), items }, null, 2) + '\n');

console.log(`
${items.length} figures: ${count('match')} match, ${count('mismatch')} mismatch, ${count('unsupported')} unsupported, ${count('not_found')} not found, ${count('unreachable')} unreachable.
Saved to verify/runs/${dataset}-${stamp}.json

Next: npm run verify:review   (approve or reject each finding)`);
