/**
 * The fact-check agent (scripts/verify/). Runs offline: source pages are
 * fixtures and the model is scripted, so these tests say what the code does
 * with an answer, good or bad — not whether a live model answers well.
 *
 * The fixtures are written for the test and are not real data.
 *
 * What matters most here:
 *   - the model never sees the dashboard's value;
 *   - a quote must be in the page, word for word, and every number in the quote;
 *   - the value is computed in code, so a model can't "agree" its way to a match;
 *   - garbled PDF numbers are refused, not misread;
 *   - only an approved match is applied, and applying never changes a figure.
 */
import { readFileSync, mkdtempSync, cpSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFileSync } from 'child_process';

const ROOT = new URL('..', import.meta.url);
const L = await import(new URL('scripts/verify/lib.mjs', ROOT).href);
const E = await import(new URL('scripts/verify/edit.mjs', ROOT).href);
const { decide } = await import(new URL('scripts/verify/review.mjs', ROOT).href);
const { SOURCES } = await import(new URL('scripts/verify/sources.mjs', ROOT).href);

const results = [];
const check = (name, ok, detail = '') => results.push([name, !!ok, detail]);

/* ------------------------------------------------------------- reading --- */

check('HTML becomes readable text without tags or scripts',
  L.htmlToText('<p>Total:&nbsp;<b>1,673,230</b> pilgrims</p><script>x=1</script>') === 'Total: 1,673,230 pilgrims');

const pdf = readFileSync(new URL('tests/fixtures/verify/appendix-sample.pdf', ROOT));
const pdfPage = await L.fetchSource('https://example.org/a.pdf', async () => new Response(pdf, { headers: { 'Content-Type': 'application/pdf' } }));
check('a PDF source is read as text', pdfPage.ok && pdfPage.kind === 'pdf' && pdfPage.text.includes('Indonesia 2020 273,520,000'));

const blocked = await L.fetchSource('https://example.org/', async () => new Response('', { status: 403 }));
check('a site that blocks automated requests is reported, not retried around', !blocked.ok && /blocks automated/.test(blocked.reason));

const parts = L.excerpts('a '.repeat(400) + 'Indonesia 2020 273,520,000 ' + 'b '.repeat(400) + 'Indonesian food', ['Indonesia'], { radius: 40 });
check('excerpts are cut around whole-word mentions only', parts.length === 1 && parts[0].includes('273,520,000'));

/* ------------------------------------------------------------- numbers --- */

const n = s => (L.parseNumber(s) || {}).value;
check('numbers parse as written', n('1,673,230') === 1673230 && n('1.67 million') === 1670000 && n('1.67M') === 1670000 && n('86.7') === 86.7);
check('a percentage is recognised as one', L.parseNumber('86.7%').percent === true);
check('right-to-left PDF garbling ("230,673,1") is refused, not misread', L.parseNumber('230,673,1') === null);
check('a bound like "<0.1" is not a value', L.parseNumber('<0.1') === null);

/* ------------------------------------------------------------- the model --- */

const hajjCfg = SOURCES.hajj;
const fig2025 = { label: 'Hajj pilgrim counts: 2025', value: 1.67, rec: { y: 2025 } };
const msgs = L.extractionMessages({ figure: fig2025, cfg: hajjCfg, source: hajjCfg.sources[0], parts: ['…'] });
check('the model is never told the dashboard\'s value', !JSON.stringify(msgs).includes('1.67'));
check('the model is told it need not find the dashboard\'s unit in the source', /do NOT need the source to use that unit/.test(msgs[1].content));
check('the model is asked for JSON with a verbatim quote', /"quote"/.test(msgs[0].content) && /character for character/.test(msgs[0].content));

/* --------------------------------------------------------------- judging --- */

const page = 'The total number of internal and external pilgrims in 2025 reached 1,673,230 pilgrims. Total number of pilgrims in 2025-1446H is 230,673,1';
const j = answer => L.judge({ answer, pageText: page, figure: fig2025, cfg: hajjCfg });

check('a verbatim quote with the right number is a match',
  j({ found: true, quote: 'in 2025 reached 1,673,230 pilgrims', method: 'direct', inputs: ['1,673,230'] }).status === 'match');
check('a quote that is not in the page is unsupported',
  j({ found: true, quote: 'in 2025 reached 1,670,000 pilgrims', method: 'direct', inputs: ['1,670,000'] }).status === 'unsupported');
check('a number that is not in the quote is unsupported',
  j({ found: true, quote: 'in 2025 reached 1,673,230 pilgrims', method: 'direct', inputs: ['1,670,000'] }).status === 'unsupported');
check('a garbled number in a real quote is unsupported, with the reason',
  /garbled/.test(j({ found: true, quote: 'pilgrims in 2025-1446H is 230,673,1', method: 'direct', inputs: ['230,673,1'] }).reason));
check('a model\'s own value is ignored: the number is read from the quote',
  j({ found: true, quote: 'in 2025 reached 1,673,230 pilgrims', method: 'direct', inputs: ['1,673,230'], value: 999 }).sourceValue === 1.673);
check('a different figure is a mismatch, with both values',
  L.judge({ answer: { found: true, quote: 'in 2025 reached 1,673,230 pilgrims', method: 'direct', inputs: ['1,673,230'] }, pageText: page, figure: { value: 1.83 }, cfg: hajjCfg }).status === 'mismatch');
check('"not found" passes through with its note', j({ found: false, note: 'only 2024 is given' }).status === 'not_found');

const series = 'Number of Pilgrims Year Number (mln) 2011 2.93 2012 3.16 2013 1.98';
const sj = (answer, value) => L.judge({ answer, pageText: series, figure: { value }, cfg: hajjCfg });
check('a scale from a column header counts only when the header is in the source',
  sj({ found: true, quote: '2012 3.16', method: 'direct', inputs: ['3.16'], scale: 'million' }, 3.16).status === 'match'
  && sj({ found: true, quote: '2012 3.16', method: 'direct', inputs: ['3.16'], scale: 'billion' }, 3.16).status === 'unsupported');

const popCfg = SOURCES.countryPop;
const comp = L.judge({ answer: { found: true, quote: 'Indonesia 2020 273,520,000 10.5 86.7', method: 'percent_of', inputs: ['273,520,000', '86.7'] },
  pageText: pdfPage.text, figure: { value: 236 }, cfg: popCfg });
check('a computed figure is worked out in code and shows its working',
  comp.status === 'match' && comp.computed && comp.sourceValue === 237.142 && /273,520,000 × 86.7%/.test(comp.working));

/* ------------------------------------------------------------------ run --- */

const fixtures = {
  [hajjCfg.sources[0].url]: '<p>The total number of internal and external pilgrims in 2025 reached 1,673,230 pilgrims.</p>',
  [hajjCfg.sources[1].url]: '<p>GASTAT announced that 1,707,301 pilgrims were present at this year’s Hajj (2026).</p>',
  [hajjCfg.sources[2].url]: '<table><tr><th>Year</th><th>Number (mln)</th></tr><tr><td>2012</td><td>3.16</td></tr><tr><td>2019</td><td>2.49</td></tr></table>',
};
const fakeFetch = async url => fixtures[url] ? new Response(fixtures[url], { headers: { 'Content-Type': 'text/html' } }) : new Response('', { status: 404 });

/* A scripted model that points at the 2025 and 2026 sentences, and finds nothing else. */
const asked = [];
const ask = async messages => {
  asked.push(messages);
  const user = messages[1].content;
  if(/: 2025/.test(user) && /1,673,230/.test(user)) return { found: true, quote: 'in 2025 reached 1,673,230 pilgrims', method: 'direct', inputs: ['1,673,230'] };
  if(/: 2026/.test(user) && /1,707,301/.test(user)) return { found: true, quote: '1,707,301 pilgrims were present', method: 'direct', inputs: ['1,707,301'] };
  return { found: false, note: 'not in these excerpts' };
};
/* A fixed set of years, so this doesn't depend on which have been confirmed since. */
const { hajj: hajjRecords } = await import(new URL('src/data/series.js', ROOT).href);
const fixedFigures = [2025, 2026, 2012].map(y => {
  const rec = hajjRecords.find(r => r.y === y);
  return { id: `hajj.${y}.v`, item: String(y), field: 'v', value: rec.v, rec, label: `Hajj pilgrim counts: ${y}` };
});
const items = await L.checkDataset({ dataset: 'hajj', cfg: hajjCfg, ask, fetchImpl: fakeFetch, figures: fixedFigures });
const by = id => items.find(i => i.id === id);
check('only the requested figures are checked', items.length === 3);
const unconfirmedHajj = L.figuresToCheck('hajj');
check('figures already confirmed are never offered for checking',
  unconfirmedHajj.every(f => !hajjRecords.find(r => r.y === f.rec.y).verified) && L.figuresToCheck('hajj', { only: unconfirmedHajj.slice(0, 1).map(f => f.item) }).length === Math.min(1, unconfirmedHajj.length));
check('the first source that matches is used', by('hajj.2025.v').status === 'match' && by('hajj.2025.v').sourceKey === 'gastat2025');
check('a later source is tried when the first has nothing', by('hajj.2026.v').status === 'match' && by('hajj.2026.v').sourceKey === 'gastat2026press');
check('every source tried is recorded', by('hajj.2012.v').attempts.length === 3);
check('when nothing matches, the card shows a source the model actually read', by('hajj.2012.v').read === true && by('hajj.2012.v').sourceKey !== 'gastat2025');
check('no prompt in the whole run contained a dashboard value',
  asked.every(m => !/\b(1\.67|1\.71|3\.16)\b/.test(m[1].content.split('Excerpts from the source:')[0])));

let threw = false;
try { L.figuresToCheck('rankHistory'); } catch { threw = true; }
check('a dataset without plain records is refused clearly', threw);

/* --------------------------------------------------------------- review --- */

const run = () => ({ items: [{ id: 'a', status: 'match', decision: null }, { id: 'b', status: 'mismatch', decision: null }] });
check('a match can be approved', decide(run(), 'a', 'approved').items[0].decision === 'approved');
let refused = '';
try { decide(run(), 'b', 'approved'); } catch(e){ refused = e.message; }
check('a mismatch cannot be approved', /Only a match/.test(refused));
check('any finding can be rejected or undone', decide(run(), 'b', 'rejected').items[1].decision === 'rejected' && decide(run(), 'a', null).items[0].decision === null);
refused = '';
try { decide({ ...run(), appliedAt: 'x' }, 'a', 'approved'); } catch(e){ refused = e.message; }
check('an applied run is closed to changes', /already been applied/.test(refused));

/* ----------------------------------------------------------------- edits --- */

const countriesSrc = readFileSync(new URL('src/data/countries.js', ROOT), 'utf8');
const after = E.markVerified(countriesSrc, { array: 'countries', ident: "label:'Indonesia'", field: 'pop', check: 'pew2025appB' });
const line = s => s.split('\n').find(l => l.includes("label:'Indonesia'"));
check('marking a field keeps existing confirmations and records the source',
  /verified:\['fin','pop'\],checkedAgainst:\{pop:'pew2025appB'\}/.test(line(after)));
check('only that record\'s line changes', after.split('\n').filter((l, i) => l !== countriesSrc.split('\n')[i]).length === 1);
check('no figure value changes', line(after).replace(/verified:\[[^\]]*\],checkedAgainst:\{[^}]*\},?/, '') === line(countriesSrc).replace(/verified:\[[^\]]*\],?/, ''));
refused = '';
try { E.markVerified(countriesSrc, { array: 'countries', ident: "label:'Indonesia'", field: 'fin', check: 'x' }); } catch(e){ refused = e.message; }
check('an already-confirmed figure is never relabelled', /already confirmed/.test(refused));

/* ------------------------------------------------- apply, end to end --- */

/* On a scratch copy of the repo, so the real data files are never touched. */
const scratch = mkdtempSync(join(tmpdir(), 'verify-'));
try {
  for(const d of ['src', 'scripts', 'assets/data']) cpSync(new URL(d, ROOT), join(scratch, d), { recursive: true });
  mkdirSync(join(scratch, 'tests'), { recursive: true });
  cpSync(new URL('tests/confirmed-figures.json', ROOT), join(scratch, 'tests/confirmed-figures.json'));
  writeFileSync(join(scratch, 'package.json'), readFileSync(new URL('package.json', ROOT)));
  for(const f of ['index.html', 'README.md']) cpSync(new URL(f, ROOT), join(scratch, f));
  mkdirSync(join(scratch, 'verify/runs'), { recursive: true });

  /*
   * Whatever is still unconfirmed when the test runs: the real data changes as
   * figures get confirmed, and the scratch copy is taken from it.
   */
  const target = Object.keys(E.LOCATIONS).flatMap(ds => L.figuresToCheck(ds))[0];
  const [tds, , tfield] = target.id.split('.');
  const tsrc = (SOURCES[tds] || hajjCfg).sources[0];
  const loc = E.LOCATIONS[tds];
  const tident = loc.ident(target.rec);
  const approved = { id: target.id, label: target.label, unit: 'test', dashboardValue: target.value, status: 'match', sourceKey: tsrc.key, sourceLabel: tsrc.label, url: tsrc.url, attempts: [], decision: 'approved' };
  const other = Object.keys(E.LOCATIONS).flatMap(ds => L.figuresToCheck(ds)).find(f => f.id !== target.id);
  const rejected = { id: other.id, label: other.label, status: 'match', sourceKey: tsrc.key, attempts: [], decision: 'rejected' };
  writeFileSync(join(scratch, 'verify/runs/test.json'), JSON.stringify({ dataset: tds, model: 'scripted', startedAt: '2026-11-27T12:00:00Z', items: [approved, rejected] }));

  const { datasets, statusFor } = await import(new URL('src/data/verification.js', ROOT).href);
  const rowBefore = statusFor([tds]);
  const fileBefore = readFileSync(join(scratch, loc.file), 'utf8');
  const pinsBefore = JSON.parse(readFileSync(join(scratch, 'tests/confirmed-figures.json'), 'utf8')).length;

  execFileSync(process.execPath, ['scripts/verify/apply.mjs'], { cwd: scratch, stdio: 'pipe' });
  const fileAfter = readFileSync(join(scratch, loc.file), 'utf8');
  const recAfter = E.records(fileAfter, loc.array).find(r => r.text.includes(tident)).text;

  check('apply confirms the approved figure against its source',
    new RegExp(`verified:\\[[^\\]]*'${tfield}'`).test(recAfter) && recAfter.includes(`${tfield}:'${tsrc.key}'`), recAfter);
  const otherRec = E.records(fileAfter, E.LOCATIONS[other.id.split('.')[0]].array).find(r => r.text.includes(E.LOCATIONS[other.id.split('.')[0]].ident(other.rec))).text;
  check('apply leaves the rejected figure alone', !otherRec.includes(`'${tsrc.key}'`) || other.id.split('.')[0] !== tds);
  const strip = t => t.replace(/verified:\[[^\]]*\],?/g, '').replace(/checkedAgainst:\{[^}]*\},?/g, '');
  check('apply changes no value in the data file', strip(fileAfter) === strip(fileBefore));
  check('apply changes only the one record', fileAfter.split('\n').filter((l, i) => l !== fileBefore.split('\n')[i]).length === 1);
  const ver = readFileSync(join(scratch, 'src/data/verification.js'), 'utf8');
  check('apply records the source with its retrieval date', new RegExp(`${tsrc.key}: \\{[\\s\\S]*?on: '2026-11-27'`).test(ver));
  const pins = JSON.parse(readFileSync(join(scratch, 'tests/confirmed-figures.json'), 'utf8'));
  check('apply re-pins the newly confirmed figure', pins.length === pinsBefore + 1 && pins.some(p => p.id === target.id && p.value === target.value));
  const dataset = JSON.parse(readFileSync(join(scratch, 'assets/data/halal-economy-dataset.json'), 'utf8'));
  check('apply rebuilds the downloadable dataset', dataset.verification.figures.some(f => f.id === target.id && f.confirmed));
  const runAfter = JSON.parse(readFileSync(join(scratch, 'verify/runs/test.json'), 'utf8'));
  check('the run is marked applied, so it cannot be applied twice', !!runAfter.appliedAt);

  const html = readFileSync(join(scratch, 'index.html'), 'utf8');
  const readme = readFileSync(join(scratch, 'README.md'), 'utf8');
  check('apply updates the footer count and its date', new RegExp(`As of November 2026, ${pins.length} of \\d+ figures on this page have been confirmed`).test(html));
  check('apply updates the share-card alt text', new RegExp(`with ${pins.length} of \\d+ figures checked`).test(html));
  check('apply regenerates the structured data', new RegExp(`${pins.length} of \\d+ were verified as of November 2026`).test(html));
  const label = datasets[tds].label.toLowerCase();
  const row = readme.split('\n').find(l => l.toLowerCase().startsWith('| ' + label + ' |')) || '';
  check('apply updates the README summary and that dataset\'s row',
    readme.includes(`**${pins.length} of `) && row.endsWith(`| ${rowBefore.confirmed + 1} / ${rowBefore.total} |`), row);

  const tip = execFileSync(process.execPath, ['--input-type=module', '-e',
    `import { verificationLine } from './src/data/verification.js'; console.log(verificationLine([], ['${target.id}']).text)`], { cwd: scratch }).toString().trim();
  check('the tooltip names the new source and its own date', tip === `Confirmed against ${tsrc.label}, November 2026.`, tip);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

/* ----------------------------------------------------------------- report --- */

let failed = 0;
for(const [name, ok, detail] of results){
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? '\n        ' + detail : ''}`);
  if(!ok) failed++;
}
console.log(failed ? `\n${failed} OF ${results.length} VERIFY CHECKS FAILED` : `\nALL ${results.length} VERIFY CHECKS PASSED`);
process.exit(failed ? 1 : 0);
