/**
 * The single source of truth for what the dashboard is currently showing,
 * mirrored into the query string so any view can be linked to and restored.
 */
import { toast } from './dom.js';

export const state = {
  view: 'dashboard',
  layer: 'pop',
  pin: null,
  year: 2024,
  aud: 'public',
  lang: 'en',
  story: 'gap',
  step: 0,
  cb: false,
  cmp: ['Indonesia', 'Malaysia', ''],
};

/* Suppressed during boot so restoring from the URL doesn't rewrite it. */
let suppressURL = true;
export function enableURLWrites(){ suppressURL = false; }

export function writeURL(){
  if(suppressURL) return;
  const p = new URLSearchParams();
  p.set('v', state.view);
  p.set('l', state.layer);
  if(state.pin) p.set('pin', state.pin);
  p.set('y', state.year);
  p.set('a', state.aud);
  if(state.lang !== 'en') p.set('lang', state.lang);
  if(state.view === 'story'){ p.set('s', state.story); p.set('p', state.step); }
  if(state.cb) p.set('cb', '1');
  p.set('c', state.cmp.filter(Boolean).join('|'));
  history.replaceState(null, '', location.pathname + '?' + p.toString() + location.hash);
}

export function readURL(){
  const p = new URLSearchParams(location.search);
  if(p.get('v')) state.view = p.get('v');
  if(p.get('l')) state.layer = p.get('l');
  if(p.get('pin')) state.pin = p.get('pin');
  if(p.get('y')) state.year = +p.get('y');
  if(p.get('a')) state.aud = p.get('a');
  if(p.get('lang')) state.lang = p.get('lang');
  if(p.get('s')) state.story = p.get('s');
  if(p.get('p')) state.step = Math.max(0, +p.get('p') || 0);
  if(p.get('cb')) state.cb = true;
  if(p.get('c')){
    const c = p.get('c').split('|');
    state.cmp = [c[0] || 'Indonesia', c[1] || 'Malaysia', c[2] || ''];
  }
}

export function initCopyLink(){
  document.getElementById('copyLink').addEventListener('click', () => {
    writeURL();
    navigator.clipboard.writeText(location.href)
      .then(() => toast('Link copied — it opens on this exact view.'))
      .catch(() => toast(location.href));
  });
}
