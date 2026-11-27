/**
 * Mizan, the AI analyst: a chat panel backed by the function at /api/ask.
 *
 * The function answers only from figures its tools returned and cites each as
 * [[figure.id]]. This module turns every citation into the same verification
 * badge the charts use, so a reader can see at the point of use whether a
 * number was checked. A view change the analyst asks for is handed to
 * `applyView`, which main.js supplies — this module never reaches into the map
 * or the compare grid itself.
 */
import { attr } from '../core/dom.js';
import { lendFocus } from '../core/dialog.js';

export const ENDPOINT = '/api/ask';

const SUGGESTIONS = {
  public:   ['How does Indonesia compare with Malaysia?', 'Which sector is growing fastest?', 'How big is Islamic finance?'],
  investor: ['Where are Islamic finance assets concentrated?', 'Which sector grows fastest to 2029?', 'What do the deal figures show?'],
  policy:   ['Which countries have a big Muslim population but a small share of assets?', 'How does the UK rank?', 'What is the GIEI?'],
  business: ['Which countries lead in halal food?', 'How big are OIC halal imports?', 'Compare Saudi Arabia, the UAE and Qatar'],
};

const BADGE = {
  confirmed:   { cls: 'v-ok', text: 'Confirmed' },
  unconfirmed: { cls: 'v-no', text: 'Unconfirmed' },
};

/** "12%" not "12 %"; "236 million Muslims" keeps its space. */
const withUnit = f => String(f.value) + (/^%/.test(f.unit) ? '' : ' ') + f.unit;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One answer as HTML: escaped text, citations turned into badges. */
export function renderAnswer(text, figures = []){
  const byId = new Map(figures.map(f => [f.id, f]));
  return esc(String(text).replace(/[\u00a0\u2007\u2009\u202f]/g, ' '))
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\[\[([^\]\s]+)\]\]/g, (whole, id) => {
      const f = byId.get(id);
      if(!f) return '';
      const b = BADGE[f.status] || BADGE.unconfirmed;
      const tip = `${f.label}: ${withUnit(f)}. ${f.line}`;
      return `<span class="vflag ${b.cls} ask-cite" tabindex="0" title="${attr(tip)}" aria-label="${attr(b.text + '. ' + tip)}" data-fig="${attr(id)}">${b.text}${f.forecast ? ' · forecast' : ''}</span>`;
    })
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

/** The "figures used" list under an answer. */
function figureList(figures){
  if(!figures.length) return '';
  const rows = figures.map(f => {
    const b = BADGE[f.status] || BADGE.unconfirmed;
    return `<li><span class="vflag ${b.cls}">${b.text}</span> <span class="ask-fl">${esc(f.label)}</span>` +
      `<span class="ask-fv">${esc(withUnit(f))}</span><span class="ask-fline">${esc(f.line)}</span></li>`;
  }).join('');
  return `<details class="ask-figs"><summary>${figures.length} figure${figures.length > 1 ? 's' : ''} used</summary><ul>${rows}</ul></details>`;
}

/**
 * Wire the panel.
 *
 *   getView()      the dashboard's current state, sent as context
 *   applyView(v)   move the dashboard to what the answer is about
 *   fetchImpl      injectable for tests
 */
export function initAsk({ getView, applyView, fetchImpl } = {}){
  /* Every control that opens the panel: the floating button and the nav button. */
  const openers = [...document.querySelectorAll('[data-ask-open]')];
  const panel = document.getElementById('askPanel');
  if(!openers.length || !panel) return;
  let openedBy = openers[0];

  const close = document.getElementById('askClose');
  const form = document.getElementById('askForm');
  const input = document.getElementById('askInput');
  const log = document.getElementById('askLog');
  const suggest = document.getElementById('askSuggest');
  const send = form.querySelector('button[type=submit]');
  const status = document.getElementById('askStatus');
  const READY = 'Ready · answers only from this page';
  const setStatus = (text, isBusy) => {
    if(!status) return;
    status.querySelector('span').textContent = text;
    status.classList.toggle('busy', !!isBusy);
  };
  const doFetch = fetchImpl || ((...a) => fetch(...a));

  const history = [];
  let busy = false;
  let release = null;

  function showSuggestions(){
    const aud = (getView && getView().aud) || 'public';
    suggest.innerHTML = (SUGGESTIONS[aud] || SUGGESTIONS.public)
      .map(q => `<button type="button" class="chip" data-q="${attr(q)}">${esc(q)}</button>`).join('');
    suggest.hidden = history.length > 0;
  }

  function setOpen(on){
    panel.hidden = !on;
    openers.forEach(o => o.setAttribute('aria-expanded', String(on)));
    if(on){
      showSuggestions();
      /* Not a modal: the answer moves the dashboard behind the panel, so the
         reader has to stay free to look at it. Focus is lent, not trapped. */
      release = lendFocus(panel, input, openedBy);
    } else if(release){
      release(); release = null;
    }
  }

  function add(role, html){
    const m = document.createElement('div');
    m.className = 'ask-msg ' + role;
    m.innerHTML = html;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  async function ask(question){
    question = question.trim();
    if(!question || busy) return;
    busy = true;
    send.disabled = true;
    suggest.hidden = true;
    history.push({ role: 'user', content: question });
    add('user', `<p>${esc(question)}</p>`);
    const pending = add('bot pending', '<span class="ask-who">Mizan</span><p>Looking up the figures…</p>');
    setStatus('Looking up the figures…', true);

    try {
      const res = await doFetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, view: getView ? getView() : {} }),
      });
      let data = {};
      try { data = await res.json(); } catch { /* handled below */ }

      if(!res.ok){
        history.pop();
        pending.className = 'ask-msg bot error';
        pending.innerHTML = `<p>${esc(res.status === 404
          ? 'Mizan runs as a Netlify Function, so it needs `netlify dev` locally rather than a plain static server.'
          : data.error || 'Something went wrong. Try again.')}</p>`;
        return;
      }

      history.push({ role: 'assistant', content: data.reply });
      pending.className = 'ask-msg bot';
      const bare = Array.isArray(data.uncited) && data.uncited.length
        ? `<p class="ask-bare">No source badge on ${esc(data.uncited.join(', '))}. Check ${data.uncited.length > 1 ? 'these' : 'this'} on the dashboard before relying on ${data.uncited.length > 1 ? 'them' : 'it'}.</p>`
        : '';
      pending.innerHTML = `<span class="ask-who">Mizan</span><p>${renderAnswer(data.reply, data.figures)}</p>` + bare + figureList(data.figures || []);
      if(data.view && applyView) applyView(data.view);
    } catch {
      history.pop();
      pending.className = 'ask-msg bot error';
      pending.innerHTML = '<p>Could not reach Mizan. Check your connection and try again.</p>';
    } finally {
      setStatus(READY, false);
      busy = false;
      send.disabled = false;
      log.scrollTop = log.scrollHeight;
    }
  }

  openers.forEach(o => o.addEventListener('click', () => {
    if(panel.hidden){ openedBy = o; setOpen(true); }
    else setOpen(false);
  }));
  panel.addEventListener('keydown', e => { if(e.key === 'Escape'){ e.preventDefault(); setOpen(false); } });
  close.addEventListener('click', () => setOpen(false));
  form.addEventListener('submit', e => { e.preventDefault(); const q = input.value; input.value = ''; ask(q); });
  input.addEventListener('keydown', e => {
    if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); }
  });
  suggest.addEventListener('click', e => { const b = e.target.closest('[data-q]'); if(b) ask(b.dataset.q); });

  return { ask, history };
}
