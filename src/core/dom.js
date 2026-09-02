/**
 * Small DOM and formatting helpers shared by every feature module.
 * Nothing here knows about the dashboard's data.
 */

/** Honour the OS "reduce motion" setting; every animation checks this. */
export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Charts are drawn into a fixed viewBox, so their design width is what makes
 * their labels legible: below it every glyph shrinks with the container. On a
 * phone the available width is roughly 340px, so charts drawn wider than that
 * switch to a narrow layout instead of being scaled down into illegibility.
 * main.js redraws them when the query flips.
 */
export const NARROW = '(max-width:699px)';
export const isNarrow = () => matchMedia(NARROW).matches;

const tip = document.getElementById('tip');

export function showTip(html, x, y){
  tip.innerHTML = html;
  const w = 280;
  tip.style.left = Math.min(x + 14, innerWidth - w - 10) + 'px';
  tip.style.top = (y + 14) + 'px';
  tip.classList.add('show');
}

export function hideTip(){ tip.classList.remove('show'); }

export function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

/** Trigger a client-side file download from an in-memory string. */
export function download(name, text, type = 'text/csv'){
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function el(tag, attrs = {}, html = ''){
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  e.innerHTML = html;
  return e;
}

/** Escape a value for safe interpolation into an HTML attribute. */
export const attr = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export const fmtB = v => '$' + d3.format(',')(v) + 'B';
export const popFmt = p => p >= 1 ? Math.round(p) + 'M' : Math.round(p * 1000) + 'k';
