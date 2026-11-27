/**
 * Apply the findings you approved in `npm run verify:review`.
 *
 *   npm run verify:apply
 *
 * For each approved figure it sets `verified` and `checkedAgainst` on that
 * record in src/data/, adds the source to `checks` in verification.js with the
 * date it was retrieved, then re-pins the confirmed figures and rebuilds the
 * files in assets/data/. It never edits a figure's value.
 *
 * Afterwards it re-reads the data in a fresh process and stops with an error
 * if any approved figure did not come out confirmed against the right source.
 */
import { readFileSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { listRuns, RUNS } from './review.mjs';
import { markVerified, addCheck, LOCATIONS } from './edit.mjs';
import { SOURCES } from './sources.mjs';
import { figuresToCheck } from './lib.mjs';

const ROOT = new URL('../../', import.meta.url);
const read = f => readFileSync(new URL(f, ROOT), 'utf8');

export function planApply(runs){
  const todo = [];
  for(const run of runs.filter(r => !r.appliedAt)){
    for(const item of run.items.filter(i => i.decision === 'approved')){
      if(item.status !== 'match') throw new Error(`${item.id} is approved but is not a match.`);
      todo.push({ run, item, on: run.startedAt.slice(0, 10) });
    }
  }
  return todo;
}

function main(){
  const runs = listRuns();
  const todo = planApply(runs);
  if(!todo.length){
    console.log('Nothing approved to apply. Review findings with `npm run verify:review`.');
    return;
  }

  const files = new Map();
  const get = f => { if(!files.has(f)) files.set(f, read(f)); return files.get(f); };
  const manual = [];
  const done = [];

  for(const { run, item, on } of todo){
    const [dataset, , field] = item.id.split('.');
    const loc = LOCATIONS[dataset];
    const figure = figuresToCheck(dataset).find(f => f.id === item.id);
    if(!loc || !figure){ manual.push(item.id); continue; }

    files.set(loc.file, markVerified(get(loc.file), { array: loc.array, ident: loc.ident(figure.rec), field, check: item.sourceKey }));

    const src = (SOURCES[run.dataset] || SOURCES[dataset]).sources.find(s => s.key === item.sourceKey);
    files.set('src/data/verification.js', addCheck(get('src/data/verification.js'), item.sourceKey, { label: src.label, url: src.url, on }));
    done.push(item);
  }

  for(const [f, text] of files) writeFileSync(new URL(f, ROOT), text);

  /* Check the result in a fresh process: the modules above are cached. */
  const expect = JSON.stringify(done.map(i => [i.id, i.sourceKey]));
  const probe = `
    import { enumerateFigures } from './src/data/verification.js';
    const all = new Map(enumerateFigures().map(f => [f.id, f]));
    const bad = ${expect}.filter(([id, key]) => { const f = all.get(id); return !f || !f.confirmed || f.check !== key; });
    if(bad.length){ console.error('Not confirmed as expected: ' + bad.map(b => b[0]).join(', ')); process.exit(1); }`;
  execFileSync(process.execPath, ['--input-type=module', '-e', probe], { cwd: ROOT, stdio: 'inherit' });

  execFileSync(process.execPath, ['scripts/pin-figures.mjs'], { cwd: ROOT, stdio: 'inherit' });
  execFileSync(process.execPath, ['scripts/build-data.mjs'], { cwd: ROOT, stdio: 'inherit' });
  /* Everything that states the confirmed count: the page's structured data, the
     footer, the share-card alt text and the README. */
  execFileSync(process.execPath, ['scripts/build-metadata.mjs'], { cwd: ROOT, stdio: 'inherit' });
  execFileSync(process.execPath, ['scripts/update-counts.mjs'], { cwd: ROOT, stdio: 'inherit' });

  const stamp = new Date().toISOString();
  for(const run of runs.filter(r => !r.appliedAt && r.items.some(i => i.decision))){
    const { file, ...data } = run;
    data.appliedAt = stamp;
    writeFileSync(new URL(file, RUNS), JSON.stringify(data, null, 2) + '\n');
  }

  console.log(`\nConfirmed ${done.length} figure(s):`);
  done.forEach(i => console.log(`  ${i.id}  against ${i.sourceLabel}`));
  if(manual.length) console.log(`\nThese need applying by hand (their dataset isn't wired up for automatic edits): ${manual.join(', ')}`);
  console.log('\nNext: look over `git diff src/data`, then run `npm test`.');
  console.log('The share image (assets/og-image.png) also shows the count: refresh it with `npm run images`.');
}

if(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
