/**
 * The analyst agent's loop, kept apart from the Netlify handler so tests can
 * drive it with a scripted model instead of a live one.
 *
 * The one rule everything here serves: an answer may only quote figures a tool
 * returned during this request. The model cites each figure as [[figure.id]];
 * any id it cites that no tool returned is stripped before the reply leaves,
 * and counted, so a made-up number can't borrow a real figure's badge.
 */
import { TOOL_DEFS, runTool, figureById, AUDIENCES } from './analyst-tools.mjs';

export const LIMITS = {
  messages: 12,          // conversation turns kept
  userChars: 600,        // one question
  assistantChars: 2000,  // one earlier answer, sent back as context
  rounds: 5,             // model calls per request
  toolChars: 12000,      // one tool result, as JSON
};

const AUDIENCE_FRAMING = {
  public:   'a member of the general public: plain language, explain any jargon (GIEI, sukuk, takaful) in a few words',
  investor: 'an investor: lead with growth, scale and concentration; never recommend buying or selling anything, and say once if asked that this is not investment advice',
  policy:   'a policymaker: lead with gaps, comparisons between countries and what the figures say about the ecosystem',
  business: 'a business owner: lead with market size, which countries rank where, and practical entry points',
};

export function systemPrompt(view = {}){
  const aud = AUDIENCES.includes(view.aud) ? view.aud : 'public';
  const context = [
    view.layer ? `map layer: ${view.layer}` : null,
    view.pin ? `pinned country: ${view.pin}` : null,
    Array.isArray(view.cmp) && view.cmp.filter(Boolean).length ? `comparing: ${view.cmp.filter(Boolean).join(', ')}` : null,
  ].filter(Boolean).join('; ');

  return `You are Mizan, the AI analyst built into the Halal Economy dashboard (halal-economy.com), which maps Muslim consumer spending and Islamic finance across six sectors and 39 countries. Your name is Arabic for balance or scale. If asked, say plainly that you are an AI agent that looks figures up on this dashboard.

Rules:
1. Only state figures that a tool returned in this conversation turn. Never supply a number from your own knowledge, even if you are sure of it. If the dashboard does not hold what was asked, say so plainly and offer the closest thing it does hold.
2. Cite every figure by putting its id in double square brackets straight after the number, e.g. "$1,530 billion [[sectors.food.v2024]]". Use the exact id the tool returned. Ids from earlier answers must be looked up again before you cite them.
3. Say when a figure is a forecast. If a figure's status is "unconfirmed", say once that it has not been checked against its source yet; do not repeat its status line, the page shows a badge beside each citation.
4. Keep answers to two to five sentences, in UK English, with no headings or tables.
5. When the answer is about particular countries, a map layer or a comparison, call set_view once so the dashboard shows it.
6. Stay on the dashboard's subject. Decline anything else in one sentence.

The reader is ${AUDIENCE_FRAMING[aud]}.${context ? `\nThe dashboard is currently showing: ${context}.` : ''}`;
}

/** Trim and validate what the browser sent. Throws a message on bad input. */
export function cleanMessages(messages){
  if(!Array.isArray(messages) || !messages.length) throw new Error('Send at least one message.');
  const kept = messages.slice(-LIMITS.messages).map(m => {
    if(!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') throw new Error('Each message needs a role and text.');
    const max = m.role === 'user' ? LIMITS.userChars : LIMITS.assistantChars;
    return { role: m.role, content: m.content.slice(0, max) };
  });
  const last = kept[kept.length - 1];
  if(last.role !== 'user' || !last.content.trim()) throw new Error('The last message must be a question.');
  return kept;
}

const CITE = /\[\[([^\]\s]+)\]\]/g;

/**
 * Models often put a narrow no-break space (U+202F) or similar before a number.
 * The page's font has no glyph for it, so "about 11.2%" renders as "about11.2%".
 */
export const plainSpaces = t => String(t || '').replace(/[\u00a0\u2007\u2009\u202f]/g, ' ');

/**
 * Numbers in an answer with no citation straight after them. Years are not
 * figures; anything else that reads as a quantity has to carry its [[id]].
 */
export function uncitedNumbers(text){
  const t = plainSpaces(text);
  const out = [];
  const re = /(?<![\w.\[\]/-])(\$?\d[\d,]*(?:\.\d+)?)(\s?(?:%|per ?cent|trillion|billion|million|[TBMK]\b))?/g;
  let m;
  while((m = re.exec(t))){
    const [whole, num, unit] = m;
    if(!unit && /^(19|20)\d\d$/.test(num)) continue;              // a year
    if(t.slice(m.index + whole.length, m.index + whole.length + 45).includes('[[')) continue;
    if(/\[\[[^\]]*$/.test(t.slice(0, m.index))) continue;          // inside a citation id
    out.push(whole.trim());
  }
  return [...new Set(out)];
}

/**
 * Keep citations to figures this request actually fetched; drop the rest.
 * Returns the cleaned text and the figures, in the order first cited.
 */
export function checkCitations(text, fetched){
  const figures = [];
  const seen = new Set();
  let dropped = 0;
  const reply = String(text || '').replace(CITE, (whole, id) => {
    if(!fetched.has(id)){ dropped++; return ''; }
    if(!seen.has(id)){ seen.add(id); figures.push(id); }
    return whole;
  }).replace(/[ \t]+([.,;:)])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();
  return { reply, ids: figures, dropped };
}

/**
 * Run one question.
 *
 *   body       { messages, view }
 *   callModel  async ({ messages, tools }) => { content, tool_calls }
 */
export async function answer(body, { callModel }){
  const messages = cleanMessages(body && body.messages);
  const view = (body && body.view) || {};

  const convo = [{ role: 'system', content: systemPrompt(view) }, ...messages];
  const fetched = new Set();
  let nextView = null;
  let toolCalls = 0;
  let nudged = false;

  for(let round = 0; round < LIMITS.rounds; round++){
    const lastRound = round === LIMITS.rounds - 1;
    const msg = await callModel({ messages: convo, tools: lastRound ? undefined : TOOL_DEFS });

    const calls = (msg && msg.tool_calls) || [];
    if(!calls.length || lastRound){
      const { reply, ids, dropped } = checkCitations(plainSpaces(msg && msg.content), fetched);
      const uncited = uncitedNumbers(reply);

      /* One chance to cite or drop any number it left bare. */
      if(uncited.length && !nudged && round < LIMITS.rounds - 2){
        nudged = true;
        convo.push({ role: 'assistant', content: msg.content || '' });
        convo.push({ role: 'user', content: `Your answer has numbers with no citation: ${uncited.join(', ')}. Every figure must come from a tool in this turn and carry its [[id]] straight after it. Look up any you need, then give the whole answer again, leaving out any figure you cannot cite.` });
        continue;
      }

      return {
        reply: reply || 'Sorry, I could not put an answer together. Try asking another way.',
        figures: ids.map(figureById).filter(Boolean).map(({ check, ...f }) => f),
        view: nextView,
        dropped,
        uncited,
        toolCalls,
      };
    }

    convo.push({ role: 'assistant', content: msg.content || '', tool_calls: calls });
    for(const call of calls){
      toolCalls++;
      let args = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* the tool reports the missing fields */ }
      const { result, ids } = runTool(call.function.name, args);
      ids.forEach(id => fetched.add(id));
      if(call.function.name === 'set_view' && result.ok) nextView = { ...(nextView || {}), ...result.view };
      let json = JSON.stringify(result);
      if(json.length > LIMITS.toolChars) json = json.slice(0, LIMITS.toolChars) + '…(truncated: narrow the filter)';
      convo.push({ role: 'tool', tool_call_id: call.id, content: json });
    }
  }
  /* Unreachable: the last round always returns. */
  throw new Error('No answer.');
}

/** The live model: Groq's OpenAI-compatible chat completions endpoint. */
export function groqModel({ apiKey, model, fetchImpl = fetch }){
  return async ({ messages, tools }) => {
    const res = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        ...(tools ? { tools, tool_choice: 'auto' } : {}),
        temperature: 0.2,
        max_tokens: 900,
      }),
    });
    if(!res.ok){
      const detail = await res.text().catch(() => '');
      const err = new Error(`Groq returned ${res.status}`);
      err.status = res.status;
      err.detail = detail.slice(0, 300);
      throw err;
    }
    const data = await res.json();
    return data.choices && data.choices[0] && data.choices[0].message;
  };
}
