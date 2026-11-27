/**
 * The review page for the fact-check agent's findings.
 *
 *   npm run verify:review     then open http://localhost:5180
 *
 * Lists every run in verify/runs/ that has not been applied, with the agent's
 * evidence for each figure, and records your Approve / Reject decisions back
 * into the run file. Only a "match" can be approved: a mismatch means the
 * dashboard's value needs editing first, and that is a decision for a person,
 * not for this page.
 *
 * Listens on 127.0.0.1 only, so nothing outside this computer can reach it.
 */
import { createServer } from 'http';
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

export const RUNS = new URL('../../verify/runs/', import.meta.url);

export function listRuns(dir = RUNS){
  let files = [];
  try { files = readdirSync(dir).filter(f => f.endsWith('.json')).sort().reverse(); } catch { /* no runs yet */ }
  return files.map(file => ({ file, ...JSON.parse(readFileSync(new URL(file, dir), 'utf8')) }));
}

/** Record one decision on a run. Returns the updated run or throws a reason. */
export function decide(run, id, decision){
  if(run.appliedAt) throw new Error('This run has already been applied.');
  const item = run.items.find(i => i.id === id);
  if(!item) throw new Error(`No finding for ${id}.`);
  if(decision !== 'approved' && decision !== 'rejected' && decision !== null) throw new Error('Decision must be approved, rejected or null.');
  if(decision === 'approved' && item.status !== 'match') throw new Error('Only a match can be approved. For a mismatch, correct the figure in src/data first, then run the check again.');
  item.decision = decision;
  item.decidedAt = decision ? new Date().toISOString() : null;
  return run;
}

const PAGE = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fact-check review · Halal Economy</title>
<style>
:root{--paper:#FBFAF6;--panel:#F1F5F2;--ink:#132D28;--ink-2:#3C5450;--muted:#5E706B;--hair:#D9E2DD;--emerald:#1F7A63;--gold-ink:#886A20;--gold-soft:#E7D7A9;
--verified:#1B74E4;--verified-pale:#E6F0FD;--verified-ink:#0F4C9E;--warn:#B4552F;--warn-pale:#F7E4DA;}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 -apple-system,Segoe UI,Arial,sans-serif}
header{padding:28px 32px 10px;max-width:1000px;margin:auto}h1{font:500 30px Georgia,serif;margin:0 0 4px}header p{margin:0;color:var(--muted);max-width:720px}
main{max-width:1000px;margin:auto;padding:10px 32px 60px}
.run{margin-top:26px}.run h2{font:500 22px Georgia,serif;margin:0}.run .meta{color:var(--muted);font-size:13px;margin:2px 0 12px}
.tabs{display:flex;gap:6px;margin:8px 0 14px}.tabs button{border:1px solid var(--hair);background:#fff;border-radius:100px;padding:5px 12px;font-weight:600;font-size:13px;cursor:pointer}.tabs button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.card{background:#fff;border:1px solid var(--hair);border-radius:14px;padding:16px 18px;margin-bottom:12px}
.card.approved{border-color:var(--verified);box-shadow:0 0 0 2px var(--verified-pale)}.card.rejected{opacity:.6}
.top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.label{font-weight:700}.id{font-family:ui-monospace,Consolas,monospace;font-size:12px;color:var(--muted)}
.pill{border-radius:100px;padding:2px 9px;font-size:11.5px;font-weight:700;border:1px solid transparent}
.s-match{background:var(--verified-pale);color:var(--verified-ink);border-color:#8FC2F7}.s-mismatch{background:var(--warn-pale);color:var(--warn);border-color:#F0A88A}
.s-unsupported{background:#FBF3DE;color:var(--gold-ink);border-color:var(--gold-soft)}.s-not_found,.s-unreachable{background:var(--panel);color:var(--muted);border-color:var(--hair)}
.vals{display:grid;grid-template-columns:auto 1fr;gap:2px 14px;margin:10px 0;font-size:14px}.vals b{font-weight:600;color:var(--muted)}
.computed{display:inline-block;margin-left:6px;font-size:12px;color:var(--gold-ink);font-weight:600}
blockquote{margin:8px 0;padding:10px 14px;background:var(--panel);border-left:3px solid var(--emerald);border-radius:6px;font-family:ui-monospace,Consolas,monospace;font-size:13px;white-space:pre-wrap;word-break:break-word}
mark{background:var(--gold-soft);color:var(--ink);padding:0 2px;border-radius:3px}
.reason{color:var(--ink-2);font-size:14px}.src{font-size:13px}.src a{color:var(--emerald)}
details{font-size:13px;color:var(--muted);margin-top:6px}
.actions{display:flex;gap:8px;margin-top:12px;align-items:center}.actions button{border-radius:100px;padding:7px 16px;font-weight:600;font-size:13.5px;cursor:pointer;border:1px solid var(--ink)}
.ok{background:var(--ink);color:#fff}.ok:disabled{opacity:.35;cursor:not-allowed}.no{background:#fff;color:var(--ink)}.undo{border:none!important;background:none;color:var(--muted);text-decoration:underline}
.decided{font-size:13px;font-weight:600}.empty{color:var(--muted);padding:30px 0}
.foot{position:sticky;bottom:0;background:var(--ink);color:#fff;padding:12px 32px;display:flex;justify-content:center;gap:10px;font-size:14px}.foot code{background:rgba(255,255,255,.15);padding:2px 6px;border-radius:4px}
.err{color:var(--warn);font-size:13px}
</style></head><body>
<header><h1>Fact-check review</h1>
<p>Each card is one unconfirmed figure. The agent read the source without being told the dashboard's value, quoted where the figure is stated, and the numbers were then checked in code. Approve only what the quote genuinely supports. Approving marks the figure <b>Confirmed</b> on the site when you apply.</p></header>
<main id="runs"><p class="empty">Loading…</p></main>
<div class="foot" id="foot"></div>
<script>
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const STATUS = { match:'Match', mismatch:'Mismatch', unsupported:'Unsupported', not_found:'Not found', unreachable:"Couldn't reach" };
let runs = [], filter = 'todo';

function highlight(quote, inputs){
  let h = esc(quote);
  for(const n of inputs || []) h = h.split(esc(n)).join('<mark>' + esc(n) + '</mark>');
  return h;
}

function card(run, it){
  const can = it.status === 'match';
  return '<div class="card ' + (it.decision || '') + '" data-file="' + esc(run.file) + '" data-id="' + esc(it.id) + '">' +
    '<div class="top"><span class="pill s-' + it.status + '">' + STATUS[it.status] + '</span><span class="label">' + esc(it.label) + '</span><span class="id">' + esc(it.id) + '</span></div>' +
    '<div class="vals"><b>Dashboard</b><span>' + esc(it.dashboardValue) + ' ' + esc(it.unit) + '</span>' +
    (it.sourceValue != null ? '<b>Source</b><span>' + esc(it.working) + (it.computed ? '<span class="computed">worked out from the quote: check the arithmetic</span>' : '') + '</span>' : '') + '</div>' +
    (it.quote ? '<blockquote>' + highlight(it.quote, it.inputs) + '</blockquote>' : '') +
    '<div class="reason">' + esc(it.reason) + (it.note ? ' · <i>' + esc(it.note) + '</i>' : '') + '</div>' +
    (it.url ? '<div class="src">Source: <a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + esc(it.sourceLabel) + '</a></div>' : '') +
    (it.attempts && it.attempts.length > 1 ? '<details' + (it.status === 'match' ? '' : ' open') + '><summary>' + it.attempts.length + ' sources tried</summary>' + it.attempts.map(a => esc(a.sourceKey) + ': ' + esc(STATUS[a.status]) + ' — ' + esc(a.reason)).join('<br>') + '</details>' : '') +
    '<div class="actions">' + (it.decision
      ? '<span class="decided">' + (it.decision === 'approved' ? 'Approved' : 'Rejected') + '</span><button class="undo" data-d="">Undo</button>'
      : '<button class="ok" data-d="approved"' + (can ? '' : ' disabled title="Only a match can be approved"') + '>Approve</button><button class="no" data-d="rejected">Reject</button>') +
    '<span class="err"></span></div></div>';
}

function render(){
  const root = document.getElementById('runs');
  const open = runs.filter(r => !r.appliedAt);
  if(!open.length){ root.innerHTML = '<p class="empty">No runs waiting for review. Start one with <code>npm run verify -- hajj</code>.</p>'; document.getElementById('foot').innerHTML = ''; return; }
  root.innerHTML = '<div class="tabs"><button data-f="todo" class="' + (filter === 'todo' ? 'on' : '') + '">Needs a decision</button><button data-f="all" class="' + (filter === 'all' ? 'on' : '') + '">All</button></div>' +
    open.map(run => {
      const items = run.items.filter(i => filter === 'all' || !i.decision);
      const n = s => run.items.filter(i => i.status === s).length;
      return '<section class="run"><h2>' + esc(run.dataset) + '</h2><div class="meta">' + esc(new Date(run.startedAt).toLocaleString()) + ' · ' + esc(run.model) + ' · ' +
        n('match') + ' match, ' + n('mismatch') + ' mismatch, ' + (run.items.length - n('match') - n('mismatch')) + ' not checkable</div>' +
        (items.length ? items.map(i => card(run, i)).join('') : '<p class="empty">Everything in this run has a decision.</p>') + '</section>';
    }).join('');
  const approved = open.reduce((a, r) => a + r.items.filter(i => i.decision === 'approved').length, 0);
  document.getElementById('foot').innerHTML = approved
    ? approved + ' approved. When you are done, stop this page and run <code>npm run verify:apply</code>'
    : 'Approve the matches you have checked, then run <code>npm run verify:apply</code>';
}

async function load(){ runs = await (await fetch('/api/runs')).json(); render(); }

document.addEventListener('click', async e => {
  const f = e.target.closest('[data-f]'); if(f){ filter = f.dataset.f; render(); return; }
  const b = e.target.closest('[data-d]'); if(!b) return;
  const c = b.closest('.card');
  const res = await fetch('/api/decide', { method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ file: c.dataset.file, id: c.dataset.id, decision: b.dataset.d || null }) });
  if(!res.ok){ c.querySelector('.err').textContent = (await res.json()).error; return; }
  await load();
});
load();
</script></body></html>`;

export function startReview({ port = 5180, dir = RUNS } = {}){
  const server = createServer(async (req, res) => {
    const send = (code, body, type = 'application/json') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(type === 'application/json' ? JSON.stringify(body) : body); };
    if(req.method === 'GET' && req.url === '/') return send(200, PAGE, 'text/html; charset=utf-8');
    if(req.method === 'GET' && req.url === '/api/runs') return send(200, listRuns(dir));
    if(req.method === 'POST' && req.url === '/api/decide'){
      let body = '';
      for await (const chunk of req) body += chunk;
      try {
        const { file, id, decision } = JSON.parse(body);
        if(!/^[\w.-]+\.json$/.test(file)) throw new Error('Bad run file name.');
        const url = new URL(file, dir);
        const run = decide(JSON.parse(readFileSync(url, 'utf8')), id, decision);
        writeFileSync(url, JSON.stringify(run, null, 2) + '\n');
        return send(200, { ok: true });
      } catch(e){ return send(400, { error: e.message }); }
    }
    send(404, { error: 'Not found' });
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]){
  await startReview();
  console.log('Review the findings at http://localhost:5180  (Ctrl+C to stop)');
}
