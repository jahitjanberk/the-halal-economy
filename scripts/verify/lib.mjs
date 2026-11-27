/**
 * The fact-check agent's working parts. Pure where it can be, so the tests can
 * drive it with fixture pages and a scripted model.
 *
 * The model is only trusted to *point*: it says which passage of the source
 * holds the figure and which numbers in that passage to use. Everything else is
 * done here, in code, and checked:
 *
 *   - the passage must appear word for word in the page that was fetched;
 *   - each number it names must appear word for word in that passage;
 *   - the value is computed here from those numbers, never taken from the model;
 *   - the model is never shown the dashboard's value, so it cannot simply agree
 *     with it. The comparison happens afterwards.
 *
 * Nothing it finds changes the site. It writes a run file for a person to
 * review; only approved findings are applied (apply.mjs).
 */
import { datasets, enumerateFigures } from '../../src/data/verification.js';

/* ------------------------------------------------------------- fetching --- */

const UA = 'Mozilla/5.0 (compatible; halal-economy-factcheck/1.0; +https://halal-economy.com)';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”' };

export function htmlToText(html){
  return String(html)
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|table|thead|tbody)>/gi, '\n')
    .replace(/<(td|th)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e) => {
      if(e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1));
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n[ \n]*/g, '\n')
    .trim();
}

async function pdfToText(bytes){
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

/** Fetch a source as plain text. Never throws: reports what went wrong. */
export async function fetchSource(url, fetchImpl = fetch){
  try {
    const res = await fetchImpl(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/pdf;q=0.9,*/*;q=0.8' }, redirect: 'follow' });
    if(!res.ok) return { ok: false, reason: `the page returned ${res.status}${res.status === 403 ? ' (the publisher blocks automated requests)' : ''}` };
    const bytes = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get('content-type') || '';
    const isPdf = /pdf/i.test(type) || bytes.subarray(0, 5).toString() === '%PDF-';
    const text = isPdf ? await pdfToText(bytes) : htmlToText(bytes.toString('utf8'));
    if(!text.trim()) return { ok: false, reason: 'the page had no readable text (a scanned PDF, or built by JavaScript)' };
    return { ok: true, text, kind: isPdf ? 'pdf' : 'html' };
  } catch(e){
    return { ok: false, reason: 'could not be reached: ' + e.message };
  }
}

/* ------------------------------------------------------------- excerpts --- */

const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The parts of a page around each mention of a term: enough for the model to
 * read a table row or a sentence, small enough to keep a call cheap.
 */
export function excerpts(text, terms, { radius = 300, max = 6 } = {}){
  const spans = [];
  for(const term of [...new Set(terms.filter(Boolean))]){
    const re = new RegExp(`(^|[^\\p{L}\\d])${escapeRe(term)}(?=$|[^\\p{L}\\d])`, 'giu');
    let m;
    while((m = re.exec(text))){
      const at = m.index + m[1].length;
      spans.push([Math.max(0, at - radius), Math.min(text.length, at + term.length + radius)]);
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for(const s of spans){
    const last = merged[merged.length - 1];
    if(last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else merged.push([...s]);
  }
  return merged.slice(0, max).map(([a, b]) => text.slice(a, b));
}

/* -------------------------------------------------------------- numbers --- */

const SCALE_WORDS = { thousand: 1e3, k: 1e3, million: 1e6, mln: 1e6, m: 1e6, billion: 1e9, bn: 1e9, b: 1e9, trillion: 1e12, tn: 1e12, t: 1e12 };

/**
 * Parse one number as written, e.g. "1,673,230", "1.67 million", "86.7%".
 * Returns null for anything that doesn't read as a well-formed number,
 * including thousands separators in the wrong places — which is how a PDF
 * with right-to-left text garbles "1,673,230" into "230,673,1".
 */
export function parseNumber(str){
  const m = /^\s*([<>~≈]?\s*)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*(%|thousand|million|mln|billion|bn|trillion|tn|[kmbt])?\.?\s*$/i.exec(String(str));
  if(!m) return null;
  if(m[1].trim()) return null; // "<0.1" is a bound, not a value
  const n = parseFloat(m[2].replace(/,/g, '') + (m[3] || ''));
  const word = (m[4] || '').toLowerCase();
  if(word === '%') return { value: n, percent: true };
  return { value: n * (SCALE_WORDS[word] || 1), percent: false };
}

/** Whitespace and typographic quotes don't count as differences. */
const norm = s => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();

export const containsVerbatim = (hay, needle) => !!needle && norm(hay).includes(norm(needle));

/* ------------------------------------------------------------ the model --- */

/**
 * What the model is asked. Deliberately leaves out the dashboard's value.
 */
export function extractionMessages({ figure, cfg, source, parts }){
  return [
    {
      role: 'system',
      content: `You are a careful fact-checker. You find one figure in a source document and point at the exact words that state it. You never estimate, round, convert or use outside knowledge: if the excerpts do not state it, say so. A figure written in a different unit from the dashboard's (a full count instead of millions, say) still counts as stated: quote it as written.

Reply with JSON only:
{
  "found": true | false,
  "quote": "the shortest passage, copied character for character from the excerpts, that contains every number you use (at most 300 characters)",
  "method": "direct" | "percent_of" | "sum",
  "inputs": ["each number exactly as written in the quote, e.g. \\"4,218,906\\" or \\"4.2 million\\""],
  "scale": "only if the numbers are in a unit stated elsewhere, such as a column headed (mln): thousand | million | billion; otherwise omit",
  "note": "one short sentence on what the quote says, or why the figure is not there"
}

method "direct": the quote states the figure itself; give one input.
method "percent_of": the figure is a percentage of a total; give the total first, then the percentage.
method "sum": the figure is the sum of parts; give each part.`,
    },
    {
      role: 'user',
      content: `Figure wanted: ${figure.label}
The dashboard measures this in ${cfg.unit}. You do NOT need the source to use that unit: give the numbers exactly as the source writes them (for example a full count such as 4,218,906), and the conversion is done afterwards in code.
How the source lays it out: ${cfg.hint}
Source: ${source.label}

Excerpts from the source:
${parts.map((p, i) => `--- excerpt ${i + 1} ---\n${p}`).join('\n')}`,
    },
  ];
}

/** Groq's chat endpoint in JSON mode. */
export function groqJson({ apiKey, model = 'openai/gpt-oss-120b', fetchImpl = fetch }){
  return async messages => {
    const res = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0, max_tokens: 700, response_format: { type: 'json_object' } }),
    });
    if(!res.ok) throw new Error(`Groq returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
  };
}

/* --------------------------------------------------------------- judging --- */

const UNIT_SIZE = { 'million pilgrims': 1e6, 'million Muslims': 1e6 };

/**
 * Turn the model's pointer into a finding, checking each claim it makes.
 * Returns { status, reason, ... } where status is one of
 *   match | mismatch | not_found | unsupported
 */
export function judge({ answer, pageText, figure, cfg }){
  if(!answer || answer.found !== true) {
    return { status: 'not_found', reason: (answer && answer.note) || 'the figure is not stated in this source' };
  }
  const quote = String(answer.quote || '');
  if(!containsVerbatim(pageText, quote)){
    return { status: 'unsupported', reason: 'the quoted passage does not appear in the source word for word', quote };
  }
  const inputs = Array.isArray(answer.inputs) ? answer.inputs.map(String) : [];
  if(!inputs.length) return { status: 'unsupported', reason: 'no numbers were named', quote };

  const parsed = [];
  for(const raw of inputs){
    if(!containsVerbatim(quote, raw)){
      return { status: 'unsupported', reason: `"${raw}" is not in the quoted passage`, quote };
    }
    const p = parseNumber(raw);
    if(!p) return { status: 'unsupported', reason: `"${raw}" does not read as a well-formed number; the source text may be garbled`, quote };
    parsed.push(p);
  }

  let raw;
  let working;
  const method = answer.method || 'direct';
  if(method === 'direct'){
    if(parsed.length !== 1 || parsed[0].percent) return { status: 'unsupported', reason: 'a direct figure needs exactly one number that is not a percentage', quote };
    raw = parsed[0].value;
    working = inputs[0];
  } else if(method === 'percent_of'){
    if(parsed.length !== 2 || parsed[0].percent || !parsed[1].percent && parsed[1].value > 100){
      return { status: 'unsupported', reason: 'percent_of needs a total and then a percentage', quote };
    }
    raw = parsed[0].value * parsed[1].value / 100;
    working = `${inputs[0]} × ${inputs[1].replace(/%$/, '')}%`;
  } else if(method === 'sum'){
    if(parsed.some(p => p.percent)) return { status: 'unsupported', reason: 'cannot sum percentages', quote };
    raw = parsed.reduce((a, p) => a + p.value, 0);
    working = inputs.join(' + ');
  } else {
    return { status: 'unsupported', reason: `unknown method "${method}"`, quote };
  }

  /*
   * A unit stated away from the number — a table headed "Number (mln)" — has to
   * be written in the source near the quote, or the model could rescale a
   * figure into agreement.
   */
  let scale = 1;
  if(answer.scale){
    const word = String(answer.scale).toLowerCase();
    const factor = SCALE_WORDS[word];
    const at = norm(pageText).indexOf(norm(quote));
    const near = norm(pageText).slice(Math.max(0, at - 600), at + norm(quote).length);
    const spelled = { thousand: /thousand|\(000s?\)|'000/i, million: /million|\bmln\b|\bmn\b/i, billion: /billion|\bbn\b/i }[word];
    if(!factor || !spelled || !spelled.test(near)){
      return { status: 'unsupported', reason: `the source does not say these numbers are in ${answer.scale}s near the quote`, quote };
    }
    scale = factor;
  }
  raw *= scale;

  const size = UNIT_SIZE[cfg.unit] || 1;
  const sourceValue = raw / size;
  const diff = figure.value === 0 ? Math.abs(sourceValue) : Math.abs(sourceValue - figure.value) / Math.abs(figure.value);
  const round = v => Math.round(v * 1000) / 1000;

  return {
    status: diff <= cfg.tolerance ? 'match' : 'mismatch',
    reason: diff <= cfg.tolerance
      ? `the source gives ${round(sourceValue)} ${cfg.unit}; the dashboard has ${figure.value}`
      : `the source gives ${round(sourceValue)} ${cfg.unit}, but the dashboard has ${figure.value} (${(diff * 100).toFixed(1)}% apart)`,
    quote,
    inputs,
    method,
    computed: method !== 'direct',
    working: method === 'direct' ? working : `${working} = ${round(sourceValue)} ${cfg.unit}`,
    sourceValue: round(sourceValue),
    diff: Math.round(diff * 10000) / 10000,
    note: answer.note || '',
  };
}

/* ------------------------------------------------------------------ run --- */

const slug = s => String(s).replace(/\s+/g, '-');

/** The unconfirmed figures of a dataset, each with its record. */
export function figuresToCheck(dataset, { only } = {}){
  const ds = datasets[dataset];
  if(!ds || !ds.records) throw new Error(`"${dataset}" is not a dataset this agent can check yet.`);
  const records = ds.records();
  const wanted = only && only.length ? new Set(only.map(s => s.toLowerCase())) : null;
  return enumerateFigures()
    .filter(f => f.id.startsWith(dataset + '.') && !f.confirmed && f.check !== 'derived')
    .map(f => {
      const [, item, field] = f.id.split('.');
      const rec = records.find(r => [r.label, r.name, r.key, r.y].filter(v => v != null).some(v => slug(v) === item));
      return { id: f.id, item, field, value: f.value, rec, label: `${ds.label}: ${item.replace(/-/g, ' ')}` };
    })
    .filter(f => f.rec && (!wanted || wanted.has(f.item.toLowerCase()) || wanted.has(String(f.rec.label || f.rec.y).toLowerCase())));
}

const RANK = { match: 0, mismatch: 1, unsupported: 2, not_found: 3, unreachable: 4 };

/**
 * Check every unconfirmed figure in one dataset against its configured
 * sources. Tries each source in turn and stops at the first match.
 */
export async function checkDataset({ dataset, cfg, ask, fetchImpl, only, limit, figures: given, log = () => {} }){
  const pages = new Map();
  const getPage = async src => {
    if(!pages.has(src.url)) pages.set(src.url, await fetchSource(src.url, fetchImpl));
    return pages.get(src.url);
  };

  /* `given` lets a test fix the figures, whatever has been confirmed since. */
  let figures = given || figuresToCheck(dataset, { only });
  if(limit) figures = figures.slice(0, limit);
  const items = [];

  for(const figure of figures){
    const attempts = [];
    let best = null;

    for(const src of cfg.sources){
      const page = await getPage(src);
      let finding;
      if(!page.ok){
        finding = { status: 'unreachable', reason: page.reason };
      } else {
        const parts = excerpts(page.text, cfg.terms(figure.rec));
        if(!parts.length){
          finding = { status: 'not_found', reason: 'the source never mentions it' };
        } else {
          try {
            const answer = await ask(extractionMessages({ figure, cfg, source: src, parts }));
            finding = { ...judge({ answer, pageText: page.text, figure, cfg }), read: true };
          } catch(e){
            finding = { status: 'unreachable', reason: 'the model call failed: ' + e.message };
          }
        }
      }
      finding = { ...finding, sourceKey: src.key, sourceLabel: src.label, url: src.url };
      attempts.push({ sourceKey: src.key, status: finding.status, reason: finding.reason });
      /* On a tie, a source the model actually read says more than one that never mentions the figure. */
      if(!best || RANK[finding.status] < RANK[best.status] || (RANK[finding.status] === RANK[best.status] && finding.read && !best.read)) best = finding;
      if(finding.status === 'match') break;
    }

    log(`  ${best.status.padEnd(11)} ${figure.id}  ${best.reason}`);
    items.push({
      id: figure.id,
      label: figure.label,
      unit: cfg.unit,
      dashboardValue: figure.value,
      ...best,
      attempts,
      decision: null,
    });
  }
  return items;
}
