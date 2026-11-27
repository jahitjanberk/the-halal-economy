/**
 * The "Ask the data" analyst: its tools, the citation guard, the HTTP handler
 * and the chat panel. No test here calls a real model — the loop is driven by
 * a scripted one, so the suite runs offline and costs nothing.
 *
 * The guard is the part worth the most attention. An answer may only cite
 * figures a tool returned during that request; a cited id the model invented,
 * or remembered from an earlier turn, must be stripped rather than shown with
 * a badge it didn't earn.
 */
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { stubAtlas } from './atlas-stub.mjs';

const ROOT = new URL('..', import.meta.url);
const html = readFileSync(new URL('index.html', ROOT), 'utf8');

const results = [];
const check = (name, ok, detail = '') => results.push([name, !!ok, detail]);

/* ------------------------------------------------------------------ tools --- */

const tools = await import(new URL('netlify/lib/analyst-tools.mjs', ROOT).href);
const { enumerateFigures } = await import(new URL('src/data/verification.js', ROOT).href);

{
  /* DATASET_SOURCES must say what the page's own markers say. */
  const fromPage = {};
  for(const tag of html.match(/<[^>]*class="src[^"]*"[^>]*>/g) || []){
    const s = /data-s="([^"]*)"/.exec(tag), d = /data-d="([^"]*)"/.exec(tag);
    if(!s || !d) continue;
    for(const k of d[1].split(/\s+/)) (fromPage[k] ||= new Set()).add(s[1]);
  }
  const drift = Object.entries(fromPage)
    .filter(([k]) => k !== 'certBodies')
    .filter(([k, set]) => [...set].sort().join() !== [...(tools.DATASET_SOURCES[k] || [])].sort().join())
    .map(([k]) => k);
  check('the analyst cites each dataset to the publishers its page markers name', !drift.length, drift.join(', '));

  const all = enumerateFigures();
  const described = all.map(f => tools.figureById(f.id));
  check('every figure on the page can be looked up by id', described.every(Boolean));
  check('every figure has a unit', described.every(f => f && f.unit), described.filter(f => f && !f.unit).map(f => f.id).slice(0, 5).join(', '));
  check('figure statuses match the verification layer',
    all.every(f => tools.figureById(f.id).status === (f.confirmed ? 'confirmed' : 'unconfirmed')));

  const uae = tools.findFigures({ country: 'UAE' });
  check('a country alias finds that country\'s figures, whatever spelling each dataset uses',
    uae.figures.some(f => f.id === 'finShareCountries.UAE.v') && uae.figures.some(f => f.id === 'countryPop.United-Arab-Emirates.pop'));

  check('an unknown country is refused, not guessed', !!tools.findFigures({ country: 'Narnia' }).error);
  check('no filter lists the datasets', Array.isArray(tools.findFigures({}).datasets));

  const food = tools.findFigures({ query: 'halal food 2029' });
  check('a text query finds the 2029 halal food forecast', food.figures.some(f => f.id === 'sectors.food.v2029' && f.forecast));

  const cmp = tools.compareCountries({ countries: ['Indonesia', 'turkey', 'Atlantis'] });
  check('compare resolves names and reports the ones it could not',
    cmp.countries.map(c => c.country).join() === 'Indonesia,Türkiye' && cmp.unknown[0] === 'Atlantis');

  const src = tools.getSource({ figure_id: 'sectors.food.v2024' });
  check('a confirmed figure names what it was checked against', src.status === 'confirmed' && src.checkedAgainst && src.checkedAgainst.url);
  const pop = tools.getSource({ figure_id: 'countryPop.Indonesia.pop' });
  check('an unconfirmed figure says so and claims no check', pop.status === 'unconfirmed' && pop.checkedAgainst === null && /check before citing/.test(pop.line));

  const v = tools.setView({ layer: 'fin', compare: ['KSA', 'Qatar'], section: 'nowhere' });
  check('set_view keeps the valid parts and reports the rest',
    v.ok && v.view.layer === 'fin' && v.view.compare.join() === 'Saudi Arabia,Qatar' && !v.view.section && v.problems.length === 1);
  check('set_view refuses a country that is not on the map', !tools.setView({ pin: 'Narnia' }).ok);

  const run = tools.runTool('compare_countries', { countries: ['Qatar'] });
  check('a tool run reports the figure ids it surfaced', run.ids.includes('countryPop.Qatar.pop'));
}

/* ------------------------------------------------------------------- loop --- */

const { answer, checkCitations, cleanMessages, LIMITS } = await import(new URL('netlify/lib/analyst.mjs', ROOT).href);

/** A model that plays back a fixed script, one message per call. */
function scripted(steps){
  const calls = [];
  const fn = async req => { calls.push(req); return steps[Math.min(calls.length - 1, steps.length - 1)]; };
  fn.calls = calls;
  return fn;
}
const toolCall = (id, name, args) => ({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } });
const ask = q => ({ messages: [{ role: 'user', content: q }], view: { aud: 'investor' } });

{
  const model = scripted([
    { content: '', tool_calls: [toolCall('a', 'find_figures', { dataset: 'sectors' }), toolCall('b', 'set_view', { section: 'sectors' })] },
    { content: 'Halal food was worth $1,530 billion [[sectors.food.v2024]] in 2024, and Narnia\'s was $9 billion [[sectors.narnia.v2024]].' },
  ]);
  const out = await answer(ask('How big is halal food?'), { callModel: model });
  check('a citation to a fetched figure survives', /\[\[sectors\.food\.v2024\]\]/.test(out.reply));
  check('a citation to a figure that does not exist is stripped and counted', !/narnia\.v2024/.test(out.reply) && out.dropped === 1);
  check('the answer lists only the figures it cited', out.figures.length === 1 && out.figures[0].id === 'sectors.food.v2024' && out.figures[0].status === 'confirmed');
  check('the figure sent to the browser carries no internal check key', !('check' in out.figures[0]));
  check('a set_view call comes back as the view to apply', out.view && out.view.section === 'sectors');
  check('the system prompt frames the answer for the chosen audience', /investor/.test(model.calls[0].messages[0].content));
  check('tool results go back to the model with their call id',
    model.calls[1].messages.some(m => m.role === 'tool' && m.tool_call_id === 'a'));
}

{
  /* A real id the model "remembers" but did not fetch this turn is still stripped. */
  const model = scripted([{ content: 'Malaysia ranks first [[countryGiei.Malaysia.rank]].' }]);
  const out = await answer(ask('Who ranks first?'), { callModel: model });
  check('a real figure id cited without fetching it this turn is stripped', !/\[\[/.test(out.reply) && out.dropped === 1 && !out.figures.length);
}

{
  const model = scripted([{ content: '', tool_calls: [toolCall('x', 'find_figures', { dataset: 'hajj' })] }]);
  const out = await answer(ask('Loop forever'), { callModel: model });
  check('the loop stops after its round limit', model.calls.length === LIMITS.rounds && typeof out.reply === 'string');
  check('the last round offers the model no tools, so it has to answer', model.calls[LIMITS.rounds - 1].tools === undefined);
}

{
  const t = checkCitations('Spend was $2.6T [[a]] , up [[b]].', new Set(['a']));
  check('stripping a citation leaves no stray space before punctuation', t.reply === 'Spend was $2.6T [[a]], up.', t.reply);

  let threw = 0;
  for(const bad of [[], [{ role: 'system', content: 'x' }], [{ role: 'user', content: 'q' }, { role: 'assistant', content: 'a' }]]){
    try { cleanMessages(bad); } catch { threw++; }
  }
  check('bad message lists are refused', threw === 3);
  const long = cleanMessages([{ role: 'user', content: 'x'.repeat(5000) }]);
  check('an over-long question is cut to the limit', long[0].content.length === LIMITS.userChars);
}

/* ---------------------------------------------------------------- handler --- */

{
  const { default: handler } = await import(new URL('netlify/functions/ask.mjs', ROOT).href);
  const saved = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  const req = (method, origin, body) => new Request('http://localhost:8888/api/ask', {
    method, headers: { 'Content-Type': 'application/json', ...(origin ? { origin } : {}) }, body,
  });
  check('the handler only takes POST', (await handler(req('GET'))).status === 405);
  check('the handler refuses other sites', (await handler(req('POST', 'https://evil.example', '{}'))).status === 403);
  const preview = new Request('https://deploy-preview-1--halaleconomy.netlify.app/api/ask', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'https://deploy-preview-1--halaleconomy.netlify.app' }, body: '{}' });
  check('the handler accepts its own site, so deploy previews work', (await handler(preview)).status !== 403);
  const noKey = await handler(req('POST', 'http://localhost:8888', '{}'));
  check('a missing API key gives a clear error, not a crash', noKey.status === 500 && /GROQ_API_KEY/.test((await noKey.json()).error));
  if(saved !== undefined) process.env.GROQ_API_KEY = saved;
}

/* ------------------------------------------------------------------ panel --- */

const dom = new JSDOM(html, { url: 'https://example.org/?v=dashboard', pretendToBeVisual: true });
const { window } = dom;
window.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
window.IntersectionObserver = class { observe(){} disconnect(){} unobserve(){} };
window.URL.createObjectURL = () => 'blob:stub';
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = () => {};
for(const k of ['window','document','location','history','matchMedia','IntersectionObserver','Image','Blob',
                'XMLSerializer','getComputedStyle','Element','Node','SVGElement','HTMLElement','Event','CSS','URL','URLSearchParams']){
  if(window[k] === undefined) continue;
  try { Object.defineProperty(globalThis, k, { value: window[k], configurable: true, writable: true }); } catch {}
}
globalThis.innerWidth = window.innerWidth;
globalThis.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 16);
globalThis.d3 = d3;
globalThis.topojson = topojson;
stubAtlas();

/* Answer /api/ask from here: the panel can't tell this from the live function. */
const posted = [];
let nextReply = null;
const atlasFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if(String(url) !== '/api/ask') return atlasFetch(url, init);
  posted.push(JSON.parse(init.body));
  const r = nextReply;
  return new Response(JSON.stringify(r.body), { status: r.status || 200, headers: { 'Content-Type': 'application/json' } });
};

const errors = [];
window.addEventListener('error', e => errors.push(e.message));
await import(new URL('src/main.js', ROOT).href);
await new Promise(r => setTimeout(r, 800));

const d = window.document;
const $ = id => d.getElementById(id);
const settle = () => new Promise(r => setTimeout(r, 60));

check('the page still boots with the analyst wired in', !errors.length, errors.join('; '));
check('the buttons say plainly that this is an AI agent',
  /AI analyst/.test($('askOpen').textContent) && /AI analyst/.test($('askOpen').getAttribute('aria-label')) && /AI analyst/.test($('askNav').getAttribute('aria-label')));
check('the panel starts closed', $('askPanel').hidden && $('askOpen').getAttribute('aria-expanded') === 'false');

$('askOpen').click();
check('the launcher opens the panel and says so', !$('askPanel').hidden && $('askOpen').getAttribute('aria-expanded') === 'true');
check('opening it focuses the question box', d.activeElement === $('askInput'));
check('suggested questions are offered before the first question', $('askSuggest').querySelectorAll('[data-q]').length === 3 && !$('askSuggest').hidden);

const fig = id => tools.figureById(id);
const strip = ({ check, ...f }) => f;
nextReply = { body: {
  reply: 'Indonesia has about 236 million Muslims [[countryPop.Indonesia.pop]] against Malaysia\'s 12% share of assets [[finShareCountries.Malaysia.v]].',
  figures: [strip(fig('countryPop.Indonesia.pop')), strip(fig('finShareCountries.Malaysia.v'))],
  view: { compare: ['Indonesia', 'Qatar'], layer: 'fin' },
} };
$('askInput').value = 'Indonesia vs Malaysia?';
$('askForm').dispatchEvent(new window.Event('submit', { cancelable: true }));
check('the status line shows Mizan is working while it looks figures up', $('askStatus').classList.contains('busy'));
await settle();
check('the status line returns to ready after the answer', !$('askStatus').classList.contains('busy') && /Ready/.test($('askStatus').textContent));

const last = [...$('askLog').querySelectorAll('.ask-msg.bot')].pop();
check('the question is posted with the current view as context',
  posted[0] && posted[0].messages[0].content === 'Indonesia vs Malaysia?' && posted[0].view && posted[0].view.layer);
check('each citation becomes a verification badge', last.querySelectorAll('.ask-cite').length === 2);
check('a confirmed figure gets the confirmed badge', !!last.querySelector('.ask-cite.v-ok[data-fig="finShareCountries.Malaysia.v"]'));
check('an unconfirmed figure gets the unconfirmed badge', !!last.querySelector('.ask-cite.v-no[data-fig="countryPop.Indonesia.pop"]'));
check('no raw [[id]] reaches the reader', !/\[\[/.test(last.textContent));
check('the figures used are listed under the answer', last.querySelectorAll('.ask-figs li').length === 2);

/* The view the analyst asked for is applied through the page's own controls. */
const { state } = await import(new URL('src/core/state.js', ROOT).href);
check('the analyst can switch the map layer', state.layer === 'fin' && d.querySelector('#layerSeg button.active').dataset.layer === 'fin');
check('the analyst can set the comparison', state.cmp[0] === 'Indonesia' && state.cmp[1] === 'Qatar');
check('the view change reaches the URL', /l=fin/.test(window.location.search) && /c=Indonesia%7CQatar/.test(window.location.search));

nextReply = { body: { reply: '<img src=x onerror=alert(1)> plain [[made.up.id]]', figures: [] } };
$('askInput').value = 'second question';
$('askForm').dispatchEvent(new window.Event('submit', { cancelable: true }));
await settle();
const evil = [...$('askLog').querySelectorAll('.ask-msg.bot')].pop();
check('model text is escaped, never parsed as markup', !evil.querySelector('img') && evil.textContent.includes('<img src=x onerror=alert(1)>'));
check('a citation with no figure behind it renders nothing', !/made\.up\.id/.test(evil.textContent));
check('earlier turns are sent back as context', posted[1].messages.length === 3 && posted[1].messages[1].role === 'assistant');

nextReply = { status: 404, body: {} };
$('askInput').value = 'third';
$('askForm').dispatchEvent(new window.Event('submit', { cancelable: true }));
await settle();
const err = [...$('askLog').querySelectorAll('.ask-msg')].pop();
check('a missing function explains how to run it locally', err.classList.contains('error') && /netlify dev/.test(err.textContent));
check('a failed question is not kept in the history', posted.length === 3 && !$('askForm').querySelector('button').disabled);

$('askPanel').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
check('Escape closes the panel and returns focus to the launcher', $('askPanel').hidden && d.activeElement === $('askOpen'));

$('askNav').click();
check('the nav button opens the same panel, and both buttons say so',
  !$('askPanel').hidden && $('askNav').getAttribute('aria-expanded') === 'true' && $('askOpen').getAttribute('aria-expanded') === 'true');
check('the conversation is still there when reopened', $('askLog').querySelectorAll('.ask-msg.user').length === 3);
$('askNav').click();
check('the nav button closes it again and keeps focus on itself', $('askPanel').hidden && d.activeElement === $('askNav'));

/* ----------------------------------------------------------------- report --- */

let failed = 0;
for(const [name, ok, detail] of results){
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? '\n        ' + detail : ''}`);
  if(!ok) failed++;
}
console.log(failed ? `\n${failed} OF ${results.length} ASK CHECKS FAILED` : `\nALL ${results.length} ASK CHECKS PASSED`);
process.exit(failed ? 1 : 0);
