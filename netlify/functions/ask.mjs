/**
 * POST /api/ask — the "Ask the dashboard" analyst.
 *
 * Body:    { messages: [{ role: 'user' | 'assistant', content }], view: { layer, pin, aud, cmp } }
 * Returns: { reply, figures: [{ id, value, unit, label, status, line, ... }], view, dropped }
 *
 * Environment:
 *   GROQ_API_KEY     required
 *   GROQ_MODEL       optional, defaults below
 *   ALLOWED_ORIGINS  optional, comma-separated; the function's own site and
 *                    localhost are always allowed
 */
import { answer, groqModel } from '../lib/analyst.mjs';

const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_ORIGINS = ['https://halal-economy.com', 'https://www.halal-economy.com'];

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const env = k => (globalThis.Netlify && Netlify.env ? Netlify.env.get(k) : undefined) ?? process.env[k];

function originAllowed(origin, own){
  if(!origin) return true; // same-origin requests from some browsers omit it
  /* The site the function is served from, whatever its address: the live
     domain, a deploy preview or a branch deploy. */
  if(origin === own) return true;
  if(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  const list = (env('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);
  return [...DEFAULT_ORIGINS, ...list].includes(origin);
}

export default async function handler(req){
  if(req.method !== 'POST') return json(405, { error: 'Use POST.' });
  if(!originAllowed(req.headers.get('origin'), new URL(req.url).origin)) return json(403, { error: 'Not allowed from this site.' });

  const apiKey = env('GROQ_API_KEY');
  if(!apiKey) return json(500, { error: 'Mizan is not configured yet (GROQ_API_KEY is missing).' });

  let body;
  try { body = await req.json(); }
  catch { return json(400, { error: 'Send JSON.' }); }

  try {
    const result = await answer(body, { callModel: groqModel({ apiKey, model: env('GROQ_MODEL') || DEFAULT_MODEL }) });
    return json(200, result);
  } catch(e){
    if(e.status){
      console.error('groq error', e.status, e.detail);
      const busy = e.status === 429;
      return json(busy ? 429 : 502, { error: busy ? 'Mizan is busy. Try again in a minute.' : 'Mizan could not reach its model. Try again shortly.' });
    }
    return json(400, { error: e.message });
  }
}

export const config = {
  path: '/api/ask',
  /* Each question can cost several model calls, so cap them per visitor. */
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
